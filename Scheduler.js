/*
 params: {
    id: String, 
    timer: ITimer, 
    tolerance (opt): {
      early: Number > 0 (seconds),
      late : Number > 0 (seconds)
    },
    initialBPM: Number > 0, 
    bpmTimeline: BPMTimeline, 
    removeCompleted (opt): Boolean, 
    units: "seconds" / "beats"
 }
 */
function Scheduler (params) {

  if (params.id==undefined) throw "Invalid parameters";

  var _id = params.id;

  var _idCounter = 0;

  var _self = this; 

  // [[id,start], ..., [id,start]]
  var _events = {
    scheduled : [], 
    executing : [], 
    executed  : []
  };
  // {id: Event, ..., id: Event}
  var _eventsIndex = {};

  var _callbacks = {};
  var _eventsCursor = 0;
  var _started = false; 
  var _paused = false;
  var _removeCompleted = (params.removeCompleted!=undefined)? params.removeCompleted : true;
  var _currentTime = 0;
  var _newCurrentTime = -1;
  var _oldCurrentTime = -1;
  var _changedCurrentTime = false;
  var _isTicking = false;
  var _offset = 0;
  var _offset2 = 0;
  var _offset3 = 0;
  var _units = params.units || "seconds";
  var _timer = params.timer;
  var _bpmTimeline = (params.bpmTimeline)? params.bpmTimeline : new BPMTimeline(params.initialBPM || 120);

    var SCHEDULER_DEFAULTS = {
    toleranceLate: 0.10,
    toleranceEarly: 0.001
  }

  var _toleranceEarly = (params.tolerance && params.tolerance.early!=undefined)? params.tolerance.early : SCHEDULER_DEFAULTS.toleranceEarly; 
  var _toleranceLate  = (params.tolerance && params.tolerance.late !=undefined)? params.tolerance.late  : SCHEDULER_DEFAULTS.toleranceLate; 

  _timer.on(_id, 'tick', function(data) {

    if (_paused) {
      // TODO
      _offset = data.time - _offset3;
    } else if (_started && !_isTicking) {

      if (_newCurrentTime >= 0) {
        _currentTime = _newCurrentTime;
        _offset = data.time;
        _offset2 = _bpmTimeline.time(_currentTime);
      } else {
        _currentTime += _self._t(data.units, data.time - _offset + _offset2) - _currentTime;
        _offset3 = data.time - _offset;
      }

      _emit('tick', {id:_id, time:_currentTime});

      _isTicking = true;

      _self.tick(_currentTime);

      _isTicking = false;
    } else if (!_started) {
      _offset = data.time;
    }
  });

  _timer.on(_id, 'reset', function(data) { 
    _offset = _offset2 = 0; 
  });



  Object.defineProperty(this, 'toleranceEarly', {
    get: function() {
      return _toleranceEarly;
    }
  });
  Object.defineProperty(this, 'toleranceLate', {
    get: function() {
      return _toleranceLate;
    }
  });



  /*
   *  This function is ran periodically, and at each tick it executes
   * events for which `currentTime` is included in their tolerance interval.
   */
  this.tick = function(time) {

    var F = function(target,other) { return target.startTime - other.startTime; };
    
    if (_changedCurrentTime) {

      // Check if the new current time is smaller than the old one.
      // If yes, search the "executing" and "executed" arrays for events which 
      // startTime is bigger than the new current time. Case positive, reset those 
      // events and add them to the "scheduled" array.

      var event = _events.executing.shift();
      while (event && event.startTime >= time) {
        
        if (event.isResetable) 
          event.reset(time);

        add_to_array(_events.scheduled, event, F);

        event = _events.executing.shift();

      }
      if (event)
        _events.executing.unshift();

      if (!_removeCompleted) {
        var event = _events.executed[_events.executed.length-1];
        _events.executed.length = (_events.executed.length)? _events.executed.length-1 : 0;
        while (event && event.startTime >= time) {

          if (event.isResetable) 
            event.reset(time);

          add_to_array(_events.scheduled, event, F);

          event = _events.executed[_events.executed.length-1];
          _events.executed.length = (_events.executed.length)? _events.executed.length-1 : 0;

        }
        if (event)
          _events.executed[_events.executed.length] = event;
      } 
      
    }

    var arr = [];
    var event = _events.executing.shift();
    while (event) {

      // For each event being executed, check if they have reached their stop time.
      // If yes, add them to the "executed" array. If not and they are tickable, 
      // invoke Event.tick with current time.

      if (event.stopTime <= time) {
        event.stop(time);
        if (!_removeCompleted) 
          add_to_array(_events.executed, event, F);
        else 
          delete _eventsIndex[event.id];
      } else {
        arr[arr.length] = event;
        if (event.isTickable)
          event.tick(time);
      }

      event = _events.executing.shift();

    }
    _events.executing = arr;

    if (_changedCurrentTime) 
      console.log("CHANGED CURRENT TIME");

    // Check which scheduled events must be started.
    var event = _events.scheduled.shift();

    while (event && event.startTime <= time) {
      if (event.lateStartTime < time) {
        // expired event
        console.warn("event expired");
        if (!_removeCompleted)
          add_to_array(_events.executed, event, F);
      } else {
        event.start(time);
        if (!event.isOneShot)
          _events.executing.push(event);
        else if (event.isOneShot && !_removeCompleted) 
          add_to_array(_events.executed, event, F);
      }
      event = _events.scheduled.shift();
    }


    // Put back the last event
    if (event) 
        _events.scheduled.unshift(event);


    _changedCurrentTime = false;
    _newCurrentTime = -1;
    _oldCurrentTime = -1;
  }
  
  // Starts the clock.
  this.start = function() {
    if (_started == false) {
      // _offset = _timer.time;

      _paused = false;

      _started = true;

      _timer.start();

      _emit('start', {id: _id, time: _currentTime});
    }
  }

  // Stops the clock but maintains the current time.
  this.pause = function() {
    if (_started == true) {
      _started = false;
      // _timer.off(_id, 'tick');
      // _timer.off(_id, 'reset');
      // this._timer.stop();
      _paused = true;
      _emit('pause', {id: _id, time: _currentTime});
    }  
  }

  // Stops the clock and sets the current time as 0.
  this.reset = function() {
    _started = false;
    _paused = false;
    _currentTime = 0;
    _offset2 = 0;
    _offset3 = 0;
    _emit('reset', {id: _id});
  }

  // Schedule an event.
  this.add = function(params) {

    var e;
    if (params instanceof Event) {
      if (!event.units || event.units!=_self.units) 
        throw "Not the same unit of measurement"; // TODO: remove in the future.
      e = event;
    } else if (params.id != undefined)
      e = this.create_event(params);
    else
      throw "Invalid parameters";

    add_to_array(_events.scheduled, e, function(target, other){ return target.startTime - other.startTime; }, false);
    _eventsIndex[e.id] = e;

    return e;
  }

  // Remove a scheduled event. 
  // params: {event|id}
  this.remove = function(params) {

    var e;

    if (params.event) 
      e = params.event;
    else if (params.id != undefined) 
      e = get_event({id: params.id});

    var compareFn = function(target, other) { return target.startTime - other.startTime; };
    var confirmRemovalFn = function(target, other) { return target.id == other.id; };

    var removedEvents = remove_from_array(_events.scheduled, event, compareFn, confirmRemovalFn);

    if (removedEvents.length == 0) {

      removedEvents = remove_from_array(_events.executing, event, compareFn, confirmRemovalFn);
      
      if (removedEvents.length == 0 && !_removeCompleted) {

        removedEvents = remove_from_array(_events.executed, event, compareFn, confirmRemovalFn);
        return removedEvents;

      }

      return removedEvents;

    }

    return removedEvents;
  }

  // Modify the current time of the clock
  this.set_current_time = function(time) {
    _changedCurrentTime = true;
    _oldCurrentTime = _currentTime;
    _newCurrentTime = (time)? time : 0;
  }

  this.get_current_time = function() {
    return _currentTime;
  }

  this.id = function() {
    return _id;
  }

  this._t = function(otherUnits, time) {
    if (_units == otherUnits)
      return time;
    else if (_units == "seconds")
      return _bpmTimeline.time(time);
    else 
      return _bpmTimeline.beat(time);
  }

  this.get_events = function() { 

    return _events; 

  }

  // params: {id|start}
  this.get_event = function(params) {
    if (params.id != undefined) {
      return _eventsIndex[params.id];
    } else if (params.start != undefined) {

      var idx;

      var F = function(a, b) { return params.startTime - b.startTime; };

      idx = find(_events.scheduled, undefined, F);
      if (idx.length==1)
        return _events.scheduled[idx[0]];

      idx = find(_events.executing, undefined, F);
      if (idx.length==1)
        return _events.executing[idx[0]];

      idx = find(_events.executed, undefined, F);
      if (idx.length==1)
        return _events.executed[idx[0]];

    } else 
      throw "Invalid parameters"
  }


  this.clear_events = function() {
    _events = {
      all : [], 
      scheduled : [], 
      executing : [], 
      executed  : []
    };
  }

  this.create_event = function(params) {
    var e = new Event({
      id: ++_idCounter, 
      start: params.start, 
      stop : params.stop,
      tolerance: {
        early: _self.toleranceEarly, late : _self.toleranceLate
      }, 
      units: _self.units, 
      callbacks: { 
        startFn: params.startFn, 
        tickFn : params.tickFn, 
        stopFn : params.stopFn, 
        reset: params.resetFn 
      }
    });
    return e;
  }
  
  this.get_bpm_timeline = function() { return _bpmTimeline; }

  this.get_timer = function() { return _timer; }




  // ---------- Helpers ---------- //

  function find(values, target, compare) {
    if (values.length==0)
      return [undefined, undefined];

    if (compare(target, values[0]) < 0) 
      return [undefined, 0]; 

    if (compare(target, values[values.length-1]) > 0)
      return [values.length - 1, undefined];

    return modified_binary_search(values, target, 0, values.length - 1, compare);

    function modified_binary_search(values, target, start, end, compare) {
      if (start > end) { return [end, undefined]; } 

      var middle = Math.floor((start + end) / 2);
      var middleValue = values[middle];

      if (compare(target, middleValue) > 0 && values[middle+1] && compare(target, values[middle+1]) < 0)
        return [middle, middle+1];
      else if (compare(target, middleValue) < 0)
        return modified_binary_search(values, target, start, middle-1, compare); 
      else if (compare(target, middleValue) > 0)
        return modified_binary_search(values, target, middle+1, end, compare); 
      else 
        return [middle];
    }
  }

  function add_to_array(array, el, compareFn, canReplicate) {
    if (array.length == 0) 
      array[0] = el;
    else if (compareFn(el, array[array.length-1])>=0) {
      array[array.length] = el;
    } else {
      var idx = find(array, el, compareFn);
      if (idx.length == 1) {
        if (canReplicate) {
          // If there are several 'copies' of "el", add "el" as the last 'copy'.
          var i;
          for (i=idx[0]+1; compareFn(el, array[i])==0; i++) {}
          array.splice(i, 0, el);
        }
      } else if (is_inbetween(idx)) {
        array.splice(idx[1], 0, el);
      } else if (is_first(idx)) { 
        array.splice(0, 0, el);
      } else 
        array[array.length] = el;
    }
  }

  function remove_from_array(array, el, compareFn, confirmRemoval) {
    var idx = find(array, el, compareFn);
    if (idx.length == 1) {
      
      var I = idx[0];

      for (var i=I-1; compareFn(el, array[i])==0; i--) {}
      I = i+1;

      if (confirmRemoval==undefined) {

        var eliminatedVals = [array[I]];
        var count = 1;
        for (var i=I+1; compareFn(el, array[i])==0; i++) {
          count++;
          eliminatedVals[eliminatedVals.length] = array[i];
        }
        array.splice(I, count);
        return eliminatedVals;

      } else if (typeof confirmRemoval == "number") {

        var eliminatedVals = [array[I]];
        var count = 1;
        for (var i=I+1; count<confirmRemoval; i++) {
          count++;
          eliminatedVals[eliminatedVals.length] = array[i];
        }
        array.splice(I, count);
        return eliminatedVals;

      } else if (typeof confirmRemoval == "function") {

        var eliminatedVals = [];
        var toMaintainVals = [];
        var count = 0;
        for (var i=I; compareFn(el, array[i])==0; i++) {
          count++;
          if (confirmRemoval(el, array[i])) 
            eliminatedVals[eliminatedVals.length] = array[i];
          else 
            toMaintainVals[toMaintainVals.length] = array[i];
        }
        array.splice(I, count, toMaintainVals);
        return eliminatedVals;

      } else 
        throw "Invalid parameters";

    }
    return [];
  }

  function is_last(idx) {
    return idx.length > 1 && idx[0]!=undefined && idx[1]==undefined;
  }

  function is_first(idx) {
    return idx.length > 1 && idx[0]==undefined && idx[1]!=undefined;
  }

  function is_inbetween(idx) {
    return idx.length > 1 && !is_first(idx) && !is_last(idx);
  }


  // ---- Event Handling Methods ------ //

  var _emit = function(evenType, data) {
    for (var ci in _callbacks[evenType]) 
      _callbacks[evenType][ci](data);
  }

  this.on = function(observerID, eventType, callback) {

    if (!eventType || _callbacks[eventType]==undefined) 
      throw "Unsupported event type";

    if (observerID!=undefined && _callbacks[eventType][observerID]!=undefined) 
      throw "Illegal modification of callback";

    var __id = (observerID==undefined)? _id + "-associate-" + (_idCounter++) : observerID;
    _callbacks[eventType][__id] = callback;
    return __id;
  }

  this.off = function(observerID, eventType) {
    if (!eventType || _callbacks[eventType]==undefined) 
      throw "Unsupported event type";

    delete _callbacks[eventType][observerID];
  }

}