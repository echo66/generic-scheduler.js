function WAATimer(params) {
	
	var _id = params.id;
	var _idCounter = 0;
	var _callbacks = { tick : {}, start: {}, stop : {}, reset: {} };
	var _audioContext = params.audioContext;
	var _clockNode = _audioContext.createScriptProcessor(256, 1, 1);
	var _currentTime = 0;
	var _offset;
	var _running = false;

	_clockNode._clockNode.onaudioprocess = function () {
		_currentTime += self.context.currentTime - _offset - _currentTime;
		_emit('tick', {id: _id, time: _currentTime});
	}

	var _emit = function(evenType, data) {
		for (var ci in _callbacks[evenType]) 
			_callbacks[evenType][ci](data);
	}

	this.on = function(observerID, eventType, callback) {

		if (!eventType || _callbacks[eventType]==undefined) 
			throws "Unsupported event type";

		if (observerID!=undefined && _callbacks[eventType][observerID]!=undefined) 
			throws "Illegal modification of callback";

		var __id = (observerID==undefined)? _id + "-associate-" + (_idCounter++) : observerID;
		_callbacks[eventType][__id] = callback;
		return __id;
	}

	this.off = function(observerID, eventType) {
		if (!eventType || _callbacks[eventType]==undefined) 
			throws "Unsupported event type";

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

	this.time = function() {
		return _currentTime;
	}

	this.reset = function() {
		_currentTime = 0;
		_emit('reset', {id: _id});
	}

	this.id = function() {
		return _id;
	}
}