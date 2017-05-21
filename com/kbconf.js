/* keyboard config */

"use strict";

define([], function () {
	var ret = {};

	var keymap = {
		"a": 65, "b": 66, "c": 67, "d": 68,
		"e": 69, "f": 70, "g": 71, "h": 72,
		"i": 73, "j": 74, "k": 75, "l": 76,
		"m": 77, "n": 78, "o": 79, "p": 80,
		"q": 81, "r": 82, "s": 83, "t": 84,
		"u": 85, "v": 86, "w": 87, "x": 88,
		"y": 89, "z": 90,

		"0": 48, "1": 49, "2": 50, "3": 51, "4": 52,
		"5": 53, "6": 54, "7": 55, "8": 56, "9": 57,
	};

	function stdKey(code, scode, key) {
		return {
			code: code,
			config: {
				key: key || keymap[code],
				shift_code: scode || code.toUpperCase()
			}
		};
	}

	var toggleCapital = function (kb) { kb.toggleCapital(); };

	ret.qwerty = [
		// 48 + 13 * 0.2 = 50.6em
		stdKey("`", "~", 192),
		stdKey("1", "!"),
		stdKey("2", "@"),
		stdKey("3", "#"),
		stdKey("4", "$"),
		stdKey("5", "%"),
		stdKey("6", "^"),
		stdKey("7", "&"),
		stdKey("8", "*"),
		stdKey("9", "("),
		stdKey("0", ")"),
		stdKey("-", "_", 173),
		stdKey("=", "+", 61),
		{ code: "\b", config: { key: 8, display: "Backspace", width: "9em" } },
		null,

		{ code: "\t", config: { key: 9, display: "Tab", width: "6em" } },
		stdKey("q"),
		stdKey("w"),
		stdKey("e"),
		stdKey("r"),
		stdKey("t"),
		stdKey("y"),
		stdKey("u"),
		stdKey("i"),
		stdKey("o"),
		stdKey("p"),
		stdKey("[", "{", 219),
		stdKey("]", "}", 221),
		{ code: "\\", config: { key: 220, shift_code: "|", width: "6em" } },
		null,

		{ code: "", config: { key: 20, display: "CapsLk", width: "6.6em", down: toggleCapital, no_long_press: true } },
		stdKey("a"),
		stdKey("s"),
		stdKey("d"),
		stdKey("f"),
		stdKey("g"),
		stdKey("h"),
		stdKey("j"),
		stdKey("k"),
		stdKey("l"),
		stdKey(";", ":", 59),
		stdKey("'", "\"", 222),
		{ code: "\n", config: { key: 13, display: "Enter", width: "8.8em" } },
		null,

		{ code: "", config: {
			key: 16, display: "Shift",
			width: "9.2em", down: toggleCapital, up: toggleCapital,
			no_long_press: true
		} },
		stdKey("z"),
		stdKey("x"),
		stdKey("c"),
		stdKey("v"),
		stdKey("b"),
		stdKey("n"),
		stdKey("m"),
		stdKey(",", "<", 188),
		stdKey(".", ">", 190),
		stdKey("/", "?", 191),
		{ code: "", config: { key: 16, display: "Shift", width: "9.6em", no_long_press: true } },
		null,

		{ code: " ", config: { key: 32, display: "&nbsp;", width: "20em" } }
	];

	return ret;
});
