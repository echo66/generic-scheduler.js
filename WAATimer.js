function WAATimer(audioContext) {
	
	var _callbacks = {};
	var _audioContext = audioContext;
	var _clockNode = _audioContext.createScriptProcessor(256, 1, 1);
	var _currentTime = 0;
	var _offset;

	_clockNode._clockNode.onaudioprocess = function () {
		_currentTime += self.context.currentTime - _offset - _currentTime;
		for (var ci in _callbacks) 
			_callbacks[ci](_currentTime);
	}

	this.on_tick = function(id, callback) {
		_callbacks[id] = callback;
	}

	this.start = function() {
		_offset = _audioContext.currentTime;
		_clockNode.connect(_audioContext.destination);
	}

	this.stop = function() {
		_clockNode.disconnect();
	}

	this.time = function() {
		return _currentTime;
	}

	this.reset = function() {
		_currentTime = 0;
	}
}