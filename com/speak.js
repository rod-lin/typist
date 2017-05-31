/* tts */

"use strict";

define([], function () {
	var queue = [];

	var started = false;
	function next() {
		console.log("called " + queue.length);

		if (queue.length) {
			var audio = queue.splice(0, 1)[0];
			audio.oncanplay = function () {
				audio.play();
				audio.onended = function () {
					next();
				};
			};

			started = true;
		} else {
			started = false;
		}
	}

	var last = null;

	function speak(text) {
		$.get("/speak", { text: text }, function (res) {
			var audio = document.createElement("audio");
			audio.src = res;
			// queue.push(audio);
			// console.log("speak " + started + " " + queue.length);
			if (last) {
				last.onended = function () {
					audio.play();
				};
			} else {
				audio.autoplay = true;
			}

			last = audio;

			audio.onended = function () {
				last = null;
			};
		});
	}

	return {
		speak: speak
	};
});
