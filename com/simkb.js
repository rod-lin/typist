/* simulated keyboard */

"user strict";

define([ "com/kbconf", "com/siminp", "com/speak" ], function (kbconf, siminp, speak) {
	loadCSS("com/simkb.css");

	function parseKey(e) {
		// ctrl	  alt	shift	keycode
		// 0	  0		0		00000000
		
		return (e.ctrlKey && 0x400) | (e.altKey && 0x200) | (e.shiftKey && 0x100) | e.keyCode;
	}

	function genKey(code, ev, kb, config) {
		config = config || {};

		var orig = config.display || code;
		var output = code;

		var key = $("<div class='key'>" + orig + "</div>");

		if (config.width) {
			key.css("width", config.width);
		}

		function down() {
			has_down = true;
			key.removeClass("release").addClass("active");
			if (config.down) config.down(kb);
			ev.addc(output);
		}

		function up() {
			if (!has_down) return;
			has_down = false;

			clearTimeout(timeout);
			clearInterval(long_press);

			key.addClass("release").removeClass("active");
			if (config.up) config.up(kb);
		}

		var timeout = null;
		var long_press = null;
		var has_down = false;

		key.mousedown(function () {
			down();

			if (!config.no_long_press) {
				timeout = setTimeout(function () {
					long_press = setInterval(function () {
						down();
					}, 30);
				}, 400);
			}
		});

		key.mouseleave(up).mouseup(up);

		var is_letter = code.toUpperCase() != code;
		// console.log(config.key);

		// register events
		ev.down(config.key, down);
		ev.up(config.key, up);

		if (config.shift_code && !is_letter) {
			ev.onshift(function () {
				key.html(config.shift_code);
				output = config.shift_code;
			});

			ev.offshift(function () {
				key.html(orig);
				output = code;
			});
		}

		if (is_letter) {
			ev.capital(function (capital) {
				if (capital) {
					orig = orig.toUpperCase();
				} else {
					orig = orig.toLowerCase();
				}

				key.html(orig);
			});
		}

		return key;
	}

	// def
	// [ { code, config }, { code, config }, null /* null stands for a break */, { code, config } ]
	function genKeyboard(cont, def, config) {
		cont = $(cont);
		config = $.extend({}, config);

		var kb = $("<div class='com-simkb'><div class='input'></div></div>");
		var keyset = $("<span class='keyset'></span>");

		var input = siminp.init(kb.find(".input"), { align: keyset, onChange: function (val, c) { speakInput(val, c); } });

		kb.append(keyset);
		cont.append(kb);

		var ret = {
			toggleCapital: function () {
				input.ev.capslk = !input.ev.capslk;
				input.ev.route(input.ev.reg.capital, input.ev.capslk);
			}
		};

		// parsing key definition
		for (var i = 0; i < def.length; i++) {
			if (def[i]) {
				keyset.append(genKey(def[i].code, input.ev.bind, ret, def[i].config));
			} else {
				keyset.append("<br>");
			}
		}

		kb.ready(function () {
			$(window).resize(function () {
				kb.find(".input").css("height", (kb.height() - keyset.outerHeight(true)) + "px");
			}).resize();
		});

		input.ev.bind.hotkey(input.ev.encodeKey({
			which: 49, // 1
			ctrlKey: true
		}), function () {
			console.log("record");
			input.ev.record();
		});

		input.ev.bind.hotkey(input.ev.encodeKey({
			which: 50, // 2
			ctrlKey: true
		}), function () {
			console.log(input.ev.cut());
		});

		input.ev.bind.hotkey(input.ev.encodeKey({
			which: 51, // 3
			ctrlKey: true
		}), function () {
			console.log("replay");
			input.ev.replay(input.ev.cut());
		});

		input.ev.bind.hotkey(input.ev.encodeKey({
			which: 52, // 4
			ctrlKey: true
		}), function () {
			console.log("stop replay");
			input.ev.stopReplay();
		});

		input.ev.bind.hotkey(input.ev.encodeKey({
			which: 53, // 5
			ctrlKey: true
		}), function () {
			console.log("replay acc");
			input.ev.replayAcc(1.5);
		});

		var word_start = true;

		function speakInput(val, c) {
			switch (c) {
				case " ":
				case "\t":
				case "\n":
				case ".":
				case ",":
				case "-":
					if (word_start) {
						var words = val.split(/[,\s.\-]+/g);
						speak.speak(words[words.length - 2]);
						word_start = false;
					}

					break;

				case "\b": break;

				default:
					word_start = true;
			}
		}

		return ret;
	}

	return {
		genKeyboard: genKeyboard,
		cursor: siminp.cursor
	};
});
