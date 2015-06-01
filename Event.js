/*
 * params: {
 * 	id: String
 * 	start: Number, 
 * 	stop: Number, 
 *  units: "seconds" / "beats"
 * 	tolerance: { 
 * 		early: Number,
 * 		late : Number
 * 	}
 * 	callbacks: {
 * 		startFn: Function(time), 
 * 		tickFn : Function(time), 
 * 		resetFn: Function(time), 
 * 		endFn  : Function(time)
 * 	} 
 * }
 */
var Event = function(params) {
	var _id = params.id;

	var _tolerance = {
		early: params.tolerance.early, 
		late : params.tolerance.late
	};

	var _start = params.start;
	var _stop   = params.stop;

	var _state = 0;
	var _STATE_ENUM = {
		0 : 'NOT_STARTED', 
		1 : 'RUNNING', 
		2 : 'STOPPED'
	};

	var _startFn = params.callbacks.startFn || function(time) {};
	var _stopFn  = params.callbacks.stopFn;
	var _resetFn = params.callbacks.resetFn;
	var _tickFn  = params.callbacks.tickFn;

	if (_startFn)
		_startFn.bind(this);
	if (_stopFn)
		_startFn.bind(this);
	if (_resetFn)
		_resetFn.bind(this);
	if (_tickFn)
		_tickFn.bind(this);

	var _units = params.units;

	Object.defineProperties(this, {
		'id': {
			value: _id, 
			writable: false
		},

		'isOneShot' : {
			get: function() { return !_stopFn; }
		}, 

		'isResetable' : {
			get: function() { return _resetFn!=undefined; }
		},

		'isTickable' : {
			get: function() { return _tickFn!=undefined; }
		},

		'startTime'		 : {
			value: _start, 
			writable: false
		},

		'earlyStartTime' : {
			get: function() { return Math.max(0, _start - _tolerance.early); }
		},

		'lateStartTime'  : {
			get: function() { return Math.max(0, _start + _tolerance.late); }
		}, 

		'stopTime'       : {
			value: _stop, 
			writable: false
		}, 

		'state'          : {
			get: function() {
				return _STATE_ENUM[_state];
			}
		},

		'units'          : {
			value: _units,
			writable: false
		}
	});

	this.start = function(time) { _state = 1; _startFn = _startFn.bind(this); _startFn(time); }

	this.tick  = function(time) { _tickFn = _tickFn.bind(this); _tickFn(time); }

	this.stop  = function(time) { _state = 2; _stopFn = _stopFn.bind(this); _stopFn(time); }

	this.reset = function(time) { _state = 0; _resetFn = _resetFn.bind(this); _resetFn(); }

}