function WebWorkerTimer(audioContext) {
	
	var _callbacks = {};
	var _timerJS = URL.createObjectURL(
		new Blob([
			"var t=0;" +
			"onmessage = function(e) {" +
			"	clearInterval(t);" +
			"	if(e.data)" +
			"		t = setInterval(function() {" +
			"			postMessage(0);" +
			"		}, e.data)}";
		], { 
			type: "text/javascript" 
		})
	);
    var _currentTime = 0;
    var _worker;
    var _startTimeStamp;


	this.on_tick = function(id, callback) {
		_callbacks[id] = callback;
	}

	this.start = function() {
		_worker = new Worker(_timerJS);
		_startTimeStamp = (new Date()).getTime();
		_worker.onmessage = function(data) {
			var t0 = _currentTime;
			var t1 = (new Date()).getTime() - _startTimeStamp;
    		_currentTime += t1 - t0;
			for (var ci in _callbacks) 
				_callbacks[ci](_currentTime);
		};
	}

	this.stop = function() {
		_worker.postMessage(0);
		_worker.terminate();
	}

	this.time = function() {
		return _currentTime;
	}

	this.reset = function() {
		_currentTime = 0;
	}
}