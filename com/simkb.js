/* simulated keyboard */

"user strict";

define([], function () {
	var $ = jQuery;
	loadCSS("com/simkb.css");

	function parseKey(e) {
		// ctrl	  alt	shift	keycode
		// 0	  0		0		00000000
		
		return (e.ctrlKey && 0x400) | (e.altKey && 0x200) | (e.shiftKey && 0x100) | e.keyCode;
	}

	function genKey(code, ev, config) {
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
			if (config.down) config.down();
			ev.addc(output);
		}

		function up() {
			if (!has_down) return;
			has_down = false;

			clearTimeout(timeout);
			clearInterval(long_press);

			key.addClass("release").removeClass("active");
			if (config.up) config.up();
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

		// cont.keydown(function (e) {
		// 	// alert(e.which);
		// 	if (config.shift_code && e.shiftKey) {
		// 		key.html(config.shift_code);
		// 	}

		// 	e.preventDefault();
		// });

		// cont.keyup(function (e) {
		// 	if (config.key == e.which) {
		// 		inactive();
		// 		if (config.up) config.up();
		// 	}

		// 	if (config.shift_code && e.which == 16) {
		// 		key.html(orig);
		// 	}

		// 	e.preventDefault();
		// });

		return key;
	}

	// def
	// [ { code, config }, { code, config }, null /* null stands for a break */, { code, config } ]
	function genKeyboard(cont, def, config) {
		cont = $(cont);
		config = $.extend({}, config);

		var kb = $("<div class='com-simkb'></div>");
		var input = $("<div class='input'></div>");
		var value = $("<div class='value'></div>");
		var cursor = $("<div class='cursor'></div>");
		var keyset = $("<span></span>");

		input.append(value);
		kb.append(input);
		kb.append(keyset);

		var text = "";
		var capslk = false; // TODO: detect?
		var curpos = 0;

		function outenc(text) {
			function filt(text) {
				return text
					.replace(/\t/g, "    ")
					.replace(/ /g, "&nbsp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;");
			}

			var lines = text.split(/\n/g);

			var ret = $("<div></div>");
			var line, tmp, cont;
			var len = 0;
			var empty_line = false;

			var orig = cursor.position();

			cursor.css({ "top": "", "left": "" });

			var abspos = text.length + curpos;

			for (var i = 0; i < lines.length; i++) {
				if (ret) ret.append("<br>");

				tmp = len + lines[i].length + 1 /* \n */;

				// alert(tmp);

				if (tmp > abspos && abspos >= len) {
					// alert("wwww");
					var first = lines[i].substring(0, abspos - len);
					var second = lines[i].substring(abspos - len);
					
					line = $("<div class='line'>" + filt(first) + "</div>");
					line.append(cursor);
					line.append(filt(second));

					if (tmp - len == 1) {
						empty_line = true;
					}
				} else {
					line = $("<div class='line'>" + filt(lines[i]) + "</div>");
				}

				len = tmp;
				ret.append(line);
			}

			if (empty_line) {
				cursor.css("margin-top", "-0.9em");
			} else {
				cursor.css("margin-top", "");
			}

			// setTimeout(function () {
			// 	var pos = cursor.position();

			// 	cursor.css({
			// 		"top": orig.top + "px",
			// 		"left": orig.left + "px",
			// 		"opacity": "1"
			// 	});

			// 	setTimeout(function () {
			// 		cursor.css({
			// 			"top": pos.top + "px",
			// 			"left": pos.left + "px"
			// 		});
			// 	}, 10);
			// }, 10);

			return ret;
		}

		function refresh() {
			value.html(outenc(text));

			value.find(".line")
				.css("max-width", keyset.width() + "px");
		}

		refresh();

		function addc(c) {
			cursor.removeClass("hide");

			switch (c) {
				case "\b":
					text =
						text.substring(0, text.length + curpos - 1) +
						text.substring(text.length + curpos);
					break;

				default:
					var c =  capslk ? c.toUpperCase() : c;
					text =
						text.substring(0, text.length + curpos) + c +
						text.substring(text.length + curpos);
			}

			if (config.onChange)
				config.onChange(text);

			refresh();
		}

		$(window).resize(refresh);

		var reg = {
			down: {},
			up: {},
			onshift: [],
			offshift: [],
			capital: []
		};

		var ev = {
			down: function (k, cb) {
				if (!reg.down[k]) reg.down[k] = [];
				reg.down[k].push(cb);
			},

			up: function (k, cb) {
				if (!reg.up[k]) reg.up[k] = [];
				reg.up[k].push(cb);
			},

			onshift: function (cb) {
				reg.onshift.push(cb);
			},

			offshift: function (cb) {
				reg.offshift.push(cb);
			},

			capital: function (cb) {
				reg.capital.push(cb);
			},

			addc: addc
		};

		for (var i = 0; i < def.length; i++) {
			if (def[i]) {
				keyset.append(genKey(def[i].code, ev, def[i].config));
			} else {
				keyset.append("<br>");
			}
		}

		cont.append(kb);

		setInterval(function () {
			cursor.toggleClass("hide");
		}, 700);

		$(window).focus();
		$(window).keydown(function (e) {
			var k = e.which;

			if (e.shiftKey) {
				for (var i = 0; i < reg.onshift.length; i++) {
					reg.onshift[i]();
				}
			}

			if (reg.down[k]) {
				for (var i = 0; i < reg.down[k].length; i++) {
					reg.down[k][i]();
				}
			}

			if (k == 37 || k == 39) {
				cursor.removeClass("hide");
				ret.incPos(k - 38);
			}

			if (k == 38 || k == 40) {
				cursor.removeClass("hide");
				ret.jumpLine(k - 39);
			}

			e.preventDefault();
		}).keyup(function (e) {
			var k = e.which;
				
			if (k == 16) {
				for (var i = 0; i < reg.offshift.length; i++) {
					reg.offshift[i]();
				}
			}

			if (reg.up[k]) {
				for (var i = 0; i < reg.up[k].length; i++) {
					reg.up[k][i]();
				}
			}

			e.preventDefault();
		});

		var ret = {
			toggleCapital: function () {
				capslk = !capslk;
				for (var i = 0; i < reg.capital.length; i++) {
					reg.capital[i](capslk);
				}
			},

			incPos: function (by) {
				curpos += by;

				if (curpos > 0) {
					curpos = 0;
				}

				if (text.length + curpos < 0) {
					curpos = -text.length;
				}

				refresh();
			},

			// dir: 1 to jump down, -1 to jump up
			jumpLine: function (dir) {
				var lines = text.split("\n");
				var tmp, len = 0;
				var abspos = text.length + curpos;
				var linepos = null;
				var newpos;
				var start, end;

				function newpos(linepos, start, end) {
					// alert(linepos);

					var len = end - start;
					var shorter = len > linepos ? linepos : len;

					// alert(shorter);

					return start + shorter - text.length;
				}

				for (var i = 0; i < lines.length; i++) {
					tmp = len + lines[i].length + 1;

					if (tmp > abspos && abspos >= len) {
						linepos = abspos - len;

						var targ_line = i + dir;

						// no target line
						if (targ_line >= lines.length || targ_line < 0) break;

						if (dir == 1) {
							start = tmp;
							end = tmp + lines[targ_line].length;
						} else { // -1
							start = len - lines[targ_line].length - 1;
							end = len - 1;
						}

						curpos = newpos(linepos, start, end);
					}

					len = tmp;
				}

				refresh();
			}
		};

		// setTimeout(function () {
		// 	ret.incPos(-1);
		// }, 3000);

		return ret;
	}

	return {
		genKeyboard: genKeyboard
	};
});
