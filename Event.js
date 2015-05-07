/*
 * params: {
 * 	id: String
 * 	startTime: Number, 
 * 	stopTime: Number, 
 *  units: "seconds" / "beats"
 * 	tolerance: { 
 * 		early: Number,
 * 		late : Number
 * 	}
 * 	callbacks: {
 * 		start: Function(time), 
 * 		tick : Function(time), 
 * 		reset: Function(time), 
 * 		end  : Function(time)
 * 	} 
 * }
 */
var Event = function(params) {
	var _id = params.id;

	var _tolerance = {
		early: params.tolerance.early, 
		late : params.tolerance.late
	};

	var _startTime = params.startTime;
	var _stopTime   = params.stopTime;

	var _state = 0;
	var _STATE_ENUM = {
		0 : 'NOT_STARTED', 
		1 : 'RUNNING', 
		2 : 'STOPPED'
	};

	var _start = params.callbacks.start || function(time) {};
	var _stop  = params.callbacks.stop;
	var _reset = params.callbacks.reset;
	var _tick  = params.callbacks.tick;

	var _units = params.units;

	Object.defineProperties(this, {
		'id': {
			value: _id, 
			writable: false
		},

		'isOneShot' : {
			get: function() { return !_stop; }
		}, 

		'isResetable' : {
			get: function() { return _reset!=undefined; }
		},

		'isTickable' : {
			get: function() { return _tick!=undefined; }
		},

		'startTime'		 : {
			value: _startTime, 
			writable: false
		},

		'earlyStartTime' : {
			get: function() { return _startTime - _tolerance.early; }
		},

		'lateStartTime'  : {
			get: function() { return _startTime + _tolerance.late; }
		}, 

		'stopTime'       : {
			value: _stopTime, 
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

	this.start = function(time) { _start(time); _state = 1; }

	this.tick  = function(time) { _tick(time); }

	this.stop  = function(time) { _stop(time); _state = 2; }

	this.reset = function() { _reset(); _state = 0; }

}