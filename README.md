# generic-scheduler.js

## General Description
Yet another javascript scheduling/clock library. This one is based on the lessons learned from several javascript live coding suites and scheduling libraries, like timbre.js, flocking, neume.js and Chris Wilson blog post. There are several novelties in this solution:
* It uses BPMTimeline to relate different time units (seconds and beats, in this case). With this, dynamic & continuous tempo manipulations are possible.
* It establishes a separation of concerns between what a scheduler and a clock are. 
* It allows scheduling of "complex" events: they have a start, stop and "tick" callbacks. While the current time of the scheduler is bigger than the start time of the event and smaller than the end time of the event, the "tick" callback is invoked.
* Several schedulers can be coupled with one Timer. This is (very) useful, for example, for a Digital Audio Workstation (DAW) that rely of several "tracks" that depend on a master clock. In this example, each "track" would have a single scheduler and all schedulers would have the same timer.
* In order to allow the modification of the current time of a scheduler, the programmer can choose to retain the events in the scheduler memory. This way, the programmer can go back and forward in the timeline without the need to reinsert the executed events.


Timer API
---------

Methods: 
* start: void -> void
* stop: void -> void
* reset: void -> void

Fields:

Events:

TODO

## Available Timers

* WAATimer({id: String, audioContext: AudioContext, bufferSize (default 256): Number})
* WebWorkerTimer({id: String, tickInterval (default 25): Number (miliseconds)})
* BrowserIntervalTimer({id: String, tickInterval (default 25): Number (miliseconds)})

## Scheduler API


Methods:

Fields:

Events:

## Future work

Refactor the architecture to allow arbitrary scheduling strategies.

Implement the concept of processes: sets of events that compose a certain process. After the conclusion of all events, the process is said to be completed.

TODO