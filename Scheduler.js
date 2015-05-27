/*
 params: {
    id: String, 
    timer: ITimer, 
    tolerance (opt): {
      early: Number > 0 (seconds),
      late : Number > 0 (seconds)
    },
    initialBPM: Number > 0, 
    removeCompleted (opt): Boolean, 
    units: "seconds" / "beats"
 }
 Note: params.timer must provide time in "seconds".
 */
function Scheduler (params) {

  var SCHEDULER_DEFAULTS = {
    toleranceLate: 0.10,
    toleranceEarly: 0.001
  }

  var _self = this; 

  var _toleranceEarly = (params.tolerance && params.tolerance.early!=undefined)? params.tolerance.early : SCHEDULER_DEFAULTS.toleranceEarly; 
  var _toleranceLate  = (params.tolerance && params.tolerance.late !=undefined)? params.tolerance.late  : SCHEDULER_DEFAULTS.toleranceLate; 

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

  var _events = {
    scheduled : [], 
    executing : []
  };

  var _callbacks = {};

  var _eventsCursor = 0;

  var _started = false; 

  var _removeCompleted = (params.removeCompleted!=undefined)? params.removeCompleted : true;

  var _currentTime = 0;
  var _offset = 0;
  var _units = params.units || "seconds";

  var _timer = params.timer;
  var _id = params.id;
  var _bpmTimeline = new BPMTimeline(params.initialBPM || 120);

  /*
   *  This function is ran periodically, and at each tick it executes
   * events for which `currentTime` is included in their tolerance interval.
   */
  this.tick = function(time) {

    // Check which executing event should be stopped or 'ticked'.
    var arr = [];
    
    var event = _events.executing.shift();
    while (event) {
      if (event.earlyStartTime > time) { 
        // This happens when set_current_time is used. Reset the event.
        if (event.isResetable) 
          event.reset();
      } else {
        if (event.stopTime <= time)
          event.stop(time);
        else {
          arr.push(event);
          if (event.isTickable)
            event.tick(time);
        }
      }
      event = _events.executing.shift();
    }
    _events.executing = arr;


    // Check which scheduled events must be started.
    var event = (_removeCompleted)? _events.scheduled.shift() : _events.scheduled[_eventsCursor++];

    while (event && event.earlyStartTime <= time) {
      if (event.lateStartTime < time) {
        // expired event
        console.warn("event expired");
        if (_removeCompleted)
          _events.scheduled.shift();
        else
          _eventsCursor++;
      } else {
        event.start(time);
        if (!event.isOneShot)
          _events.executing.push(event);
      }
      event = (_removeCompleted)? _events.scheduled.shift() : _events.scheduled[_eventsCursor++];
    }


    // Put back the last event
    if (event) 
      if (_removeCompleted)
        _events.scheduled.unshift(event);
      else 
        _eventsCursor = (_eventsCursor>0)? _eventsCursor-1 : 0;
  }
  
  // Starts the clock.
  this.start = function() {
    if (_started == false) {
      _offset = _self._t(_timer.units, _timer.time);

      _timer.on(_id, 'tick', function(data) {
        if (_started) {
          _currentTime += _self._t(data.units, data.time) - _offset - _currentTime;
          _emit('tick', {id:_id, time:_currentTime});
          _self.tick(_currentTime);
        } else
          _offset = _self._t(_timer.units, data.time);
      });

      _timer.on(_id, 'reset', function(data) { _offset = 0; });

      _started = true;

      _timer.start();

      _emit('start', {id: _id, time: _currentTime});
    }
  }

  // Stops the clock but maintains the current time.
  this.stop = function() {
    if (this._started === true) {
      this._started = false;
      _timer.off(_id, 'tick');
      _timer.off(_id, 'reset');
      // this._timer.stop();
      _emit('stop', {id: _id, time: _currentTime});
    }  
  }

  // Stops the clock and sets the current time as 0.
  this.reset = function() {
    this.stop();
    _currentTime = 0;
    _emit('reset', {id: _id});
  }

  // Schedule an event.
  this.add = function(params) {

    var e;
    if (params instanceof Event) {
      if (!event.units || event.units!=_self.units) 
        throw "Not the same unit of measurement"; // TODO: remove in the future.
      e = event;
    } else 
      e = this.create_event(params);

    if (_events.scheduled.length==0) 
      _events.scheduled.push(e);
    else {
      var idx = find(_events.scheduled, e, function(target, other){ 
        return target.startTime - other.startTime; 
      });

      if (idx.length==1) 
        _events.scheduled.splice(idx[0]+1, 0, e);
      else 
        if (idx[0]!=undefined && idx[1]!=undefined)
          _events.scheduled.splice(idx[1], 0, e);
        else 
          _events.scheduled.splice((idx[0] || idx[1] || 0)+1, 0, e);
    }

    return e;
  }

  // Remove a scheduled event. 
  this.remove = function(event) {

    var func = function(target, other){ return target.startTime - other.startTime; };

    var idx = find(_events.scheduled, event, func);

    if (idx.length == 1) {
      _events.scheduled.splice(idx[0], 1);
      idx = find(_events.executing, event, func);
      if (idx.length == 1)
        _events.executing.splice(idx[0], 1);
      return true;
    }

    return false;
  }

  // Modify the current time of the clock
  this.set_current_time = function(time) {
    _currentTime = time;
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

  this.events = function() { return _events; }


  this.clear_events = function() {
    _events = {
      scheduled : [], 
      executing : []
    };
  }

  this.create_event = function(params) {
    var e = new Event({
      id: params.id, 
      startTime: params.startTime, 
      stopTime : params.stopTime,
      tolerance: {
        early: _self.toleranceEarly, late : _self.toleranceLate
      }, 
      units: _self.units, 
      callbacks: { start: params.start, tick : params.tick, stop : params.stop, reset: params.reset }
    });
    return e;
  }
  
  this.get_bpm_timeline = function() { return _bpmTimeline; }

  this.get_timer = function() { return _timer; }




  // ---------- Helpers ---------- //

  function find(values, target, compare) {
    if (target < values[0]) 
      return [undefined, 0]; 
    
    if (values.length==0)
      return [undefined, undefined];

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
  };


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