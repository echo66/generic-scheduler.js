/*
 * params: {
 *   id: String,
 *   audioContext: AudioContext,
 *   bufferSize (opt): Number
 * }
 */
function WAATimer(params) {
	
	var _self = this;
	var _id = params.id;
	var _idCounter = 0;
	var _callbacks = { tick : {}, start: {}, stop : {}, reset: {} };
	var _audioContext = params.audioContext;
	var _clockNode = _audioContext.createScriptProcessor(params.bufferSize || 256, 1, 1);
	var _currentTime = 0;
	var _offset;
	var _running = false;

	_clockNode.onaudioprocess = function () {
		_currentTime += _audioContext.currentTime - _offset - _currentTime;
		_emit('tick', {id: _id, time: _currentTime, units: _self.units});
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

	this.start = function() {
		if (!_running) {
			_offset = _audioContext.currentTime;
			_running = true;
			_clockNode.connect(_audioContext.destination);
			_emit('start', {id: _id});
		}
	}

	this.stop = function() {
		if (_running) {
			_clockNode.disconnect();
			_running = false;
			_emit('stop', {id: _id});
		}
	}

	this.reset = function() {
		_currentTime = 0;
		_emit('reset', {id: _id});
	}

	Object.defineProperties(this, {
		'id' : { value: _id }, 
		'time' : { value: _currentTime }, 
		'units': { value: "seconds" }
	});
}