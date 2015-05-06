/*
 * params: {
 *   id: String, 
 *   tickInterval (opt): Number (miliseconds)
 * }
 */
function WebWorkerTimer(params) {
	
	var _self = this;
	var _id = params.id;
	var _tickInterval = params.tickInterval || 0.025*1000;
	var _idCounter = 0;
	var _callbacks = { tick : {}, start: {}, stop : {}, reset: {} };
	var _timerJS = URL.createObjectURL(
		new Blob([
			"var t=0;" +
			"onmessage = function(e) {" +
			"	clearInterval(t);" +
			"	if(e.data)" +
			"		t = setInterval(function() {" +
			"			postMessage(0);" +
			"		}, e.data)}"
		], { 
			type: "text/javascript" 
		})
	);
    var _currentTime = 0;
    var _worker;
    var _offset;
    var _running = false;


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
			_worker = new Worker(_timerJS);
			_offset = (new Date()).getTime();

			_worker.onmessage = function(data) {
				var t0 = _currentTime;
				var t1 = (new Date()).getTime() - _offset;
	    		_currentTime += t1 - t0;
	    		_emit('tick', {id: _id, time: _currentTime});
			};

			_running = true;
			_emit('start', {id: _id});
			_worker.postMessage(_tickInterval);
		}
	}

	this.stop = function() {
		if (_running) {
			_worker.postMessage(0);
			_worker.terminate();
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

	this.units = function() {
		return "seconds";
	}
}