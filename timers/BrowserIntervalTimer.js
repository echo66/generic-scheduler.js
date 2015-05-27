/*
 * params: {
 *   id: String, 
 *   tickInterval (default 25 ms): Number (miliseconds)
 * }
 */
function BrowserIntervalTimer(params) {

	var _self = this;
	var _id = params.id;
	var _currentTime = 0;
	var _tickInterval = params.tickInterval || 25;
	var _intervalId;
	var _idCounter = 0;
	var _callbacks = { tick : {}, start: {}, stop : {}, reset: {} };
	var _offset;


	Object.defineProperties(this, {
		'id' : { value: _id }, 
		'time' : { value: _currentTime }, 
		'units': { value: "seconds" }
	});
	
	this.start = function() {
		_offset = (new Date()).getTime();
		_intervalId = setInterval(function(){
			var t0 = _currentTime;
			var t1 = (new Date()).getTime() - _offset;
			_currentTime += t1 - t0;
			_emit('tick', {id: _id, time: _currentTime/1000, units: _self.units});
		}, _tickInterval);
		_emit('start', {id: _id});
	}

	this.stop = function() {
		clearInterval(_intervalId);
		_emit('stop', {id: _id});
	}

	this.reset = function() {
		_currentTime = 0;
		_emit('reset', {id: _id});
	}

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