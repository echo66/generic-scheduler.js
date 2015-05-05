function WAATimer(audioContext) {
	
	var _callbacks = {};
	var _audioContext = audioContext;
	var _clockNode = _audioContext.createScriptProcessor(256, 1, 1);

	_clockNode._clockNode.onaudioprocess = function () {
		var time = _audioContext.currentTime;
		for (var ci in _callbacks) 
			_callbacks[ci](time);
	}

	this.on_tick = function(id, callback) {
		_callbacks[id] = callback;
	}

	this.start = function() {
		_clockNode.connect(_audioContext.destination);
	}

	this.stop = function() {
		_clockNode.disconnect();
	}

	this.time = function() {
		return _audioContext.currentTime;
	}
}