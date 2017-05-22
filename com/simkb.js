/* simulated keyboard */

"user strict";

define([ "com/kbconf" ], function (kbconf) {
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

		function down(kb) {
			has_down = true;
			key.removeClass("release").addClass("active");
			if (config.down) config.down(kb);
			ev.addc(output);
		}

		function up(kb) {
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

		key.mousedown(function (kb) {
			down(kb);

			if (!config.no_long_press) {
				timeout = setTimeout(function () {
					long_press = setInterval(function () {
						down(kb);
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

	var cursor_style = {
		underline: {
			width: "auto",
			height: 2,
			vertical: "text-bottom",
			delay: 700 // blinking delay
		},

		ibeam: {
			width: 2,
			height: "1.1em",
			vertical: "bottom",
			offset: "0.13em",
			delay: 800 // blinking delay
		},

		block: {
			width: "auto",
			height: "1.1em",
			vertical: "bottom",
			offset: "0.13em",
			invert: true, // invert the color of the currrent character
			delay: 500 // blinking delay
		}
	};

	// def
	// [ { code, config }, { code, config }, null /* null stands for a break */, { code, config } ]
	function genKeyboard(cont, def, config) {
		cont = $(cont);
		config = $.extend({
			cursor: cursor_style.underline
		}, config);

		var kb = $("<div class='com-simkb'></div>");
		var input = $("<div class='input'></div>");
		var value = $("<div class='value'></div>");
		var cursor = $("<div class='cursor'></div>");
		var keyset = $("<span></span>");
		var char = $("<span class='char'></span>"); // char width measure
		var mlineno = $("<div class='lineno' style='position: absolute; visibility: hidden;'></div>"); // lineno measure

		input.append(value);
		input.append(char);
		input.append(mlineno);

		kb.append(input);
		kb.append(keyset);

		var text = "";
		var capslk = false; // TODO: detect?
		var curpos = 0;

		if (typeof config.cursor.height === "string")
			cursor.css("height", config.cursor.height);
		else
			cursor.height(config.cursor.height);

		if (!config.cursor.invert)
			cursor.addClass("trans");

		if (config.cursor.offset) {
			cursor.css("margin-bottom", config.cursor.offset);
		}

		function filt(text) {
			return text
				.replace(/\t/g, "    ")
				.replace(/ /g, "&nbsp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;");
		}

		function refreshLine(lineno, text) {
			if (!cache) return false;

			var line = cache.lines[lineno];
			line.dom.html(line.dom.find(".lineno"));

			line.text = text || line.text;

			if (cache.curline == lineno) {
				cache.lines[lineno] = renderLine(line.dom, line.text, cache.curpos);
			} else {
				cache.lines[lineno] = renderLine(line.dom, line.text, -1);
			}

			if (!line.text)
				cache.lines[lineno].dom.append("&nbsp;");

			return true;
		}

		function removeLine(lineno) {
			if (!cache) return false;

			var rmline = cache.lines[lineno];

			rmline.dom.remove();
			cache.lines.splice(lineno, 1);

			renderLineno();

			return true;
		}

		// insert after a lineno
		function insertLine(lineno, text) {
			if (!cache) return false;

			var newl = newLine();
			cache.lines.splice(lineno + 1, 0, renderLine(newl, text, -1));
			cache.lines[lineno].dom.after(newl);

			renderLineno();

			return true;
		}

		function renderLine(line, text, curpos) {
			if (curpos != -1) {
				var first = text.substring(0, curpos);
				var second = text.substring(curpos);

				cur_char = filt(second[0] || "");

				char.html(second[0] == "\t" ? "&nbsp;" : (cur_char || "a"));

				second = second.substring(1);
				
				line.append(filt(first));
				line.css("height", line.height() + "px"); // fix height before inserting cursor
				line.append(cursor);
				
				if (cur_char) {
					cur_char = $("<span>" + cur_char + "</span>");
					if (config.cursor.invert)
						cur_char.addClass("inverted");

					line.append(cur_char);

					cur_char.css("margin-left", -cursor.width() + "px");
				}

				line.append(filt(second));
			} else {
				line.append(filt(text));
			}

			return {
				dom: line,
				text: text
			};
		}

		var cache;
		var use_cache = true;

		function renderLineno() {
			refreshPos();

			var lines = value.children(".line");

			for (var i = 0; i < lines.length; i++) {
				mlineno.html((i + 1).toString());
				$(lines[i]).find(".lineno").html((i + 1).toString()).css({
					"left": -mlineno.width() - 15 + "px",
					"opacity": "1"
				});
			}

			value.children("br").remove();
			value.children(".line").before("<br>");
		}

		function newLine() {
			return $("<div class='line'><div class='lineno'></div></div>");
		}

		function renderAll(text) {
			var lines = text.split(/\n/g);

			var line, tmp, cont;
			var len = 0;

			var cur_char;

			var abspos = text.length + curpos;

			if (use_cache) {
				cache = {
					lines: [],
					curpos: null,
					curline: null
				};
			}

			value.html("");

			for (var i = 0; i < lines.length; i++) {
				tmp = len + lines[i].length + 1 /* \n */;

				line = newLine();

				var has_cur = tmp > abspos && abspos >= len;

				if (use_cache && has_cur) {
					cache.curline = i;
					cache.curpos = abspos - len;
				}

				var log = renderLine(line, lines[i], (has_cur ? abspos - len : -1));
				if (use_cache) {
					cache.lines.push(log);
				}

				len = tmp;

				if (!lines[i]) {
					line.append("&nbsp;");
				}

				value.append(line);
			}

			renderLineno();

			if (config.cursor.width === "auto")
				cursor.width(char.width());
			else
				cursor.width(config.cursor.width);

			if (config.cursor.vertical)
				cursor.css("vertical-align", config.cursor.vertical);
		}

		function refreshPos() {
			value.find(".line").css("max-width", keyset.width() + "px");
		}

		function refresh() {
			renderAll(text);
			refreshPos();
		}

		setTimeout(function () {
			refresh();
		}, 0);

		function addc(c) {
			line_lock = false;
			cursor.removeClass("hide");

			if (!c) return;

			switch (c) {
				case "\b":
					text =
						text.substring(0, text.length + curpos - 1) +
						text.substring(text.length + curpos);
					break;

				default:
					c =  capslk ? c.toUpperCase() : c;
					text =
						text.substring(0, text.length + curpos) + c +
						text.substring(text.length + curpos);
			}

			if (config.onChange)
				config.onChange(text);

			switch (c) {
				case "\b":
					if (cache) {
						if (cache.curpos != 0) {
							// not the first character
							var line = cache.lines[cache.curline];
							line.text =
								line.text.substring(0, cache.curpos - 1) +
								line.text.substring(cache.curpos);

							cache.curpos--;
							refreshLine(cache.curline);
						} else {
							if (cache.curline > 0) {

								var line1 = cache.lines[cache.curline - 1];
								var line2 = cache.lines[cache.curline];

								cache.curpos = line1.text.length;

								line1.dom.html(line1.dom.find(".lineno"));
								line1.text = line1.text + line2.text;

								removeLine(cache.curline);

								cache.curline--;

								refreshLine(cache.curline);
							} // no change
						}

						return;
					}

					break;

				case "\n":
					if (cache) {
						var line = cache.lines[cache.curline];

						var nextl = line.text.substring(cache.curpos);
						line.text = line.text.substring(0, cache.curpos);

						cache.curpos = 0;
						cache.curline++;

						refreshLine(cache.curline - 1);
						insertLine(cache.curline - 1, nextl);
						refreshLine(cache.curline);

						return;
					}

					break;

				default:
					if (cache) {
						// refresh line only
						var line = cache.lines[cache.curline];
						line.text =
							line.text.substring(0, cache.curpos) + c +
							line.text.substring(cache.curpos);

						cache.curpos++;
						refreshLine(cache.curline);
					
						return;
					}
			}

			refresh();
		}

		$(window).resize(refreshPos);

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
		}, config.cursor.delay || 700);

		$(window).focus();
		$(window).keydown(function (e) {
			var k = e.which;

			if (e.shiftKey) {
				for (var i = 0; i < reg.onshift.length; i++) {
					reg.onshift[i](ret);
				}
			}

			if (reg.down[k]) {
				for (var i = 0; i < reg.down[k].length; i++) {
					reg.down[k][i](ret);
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
					reg.offshift[i](ret);
				}
			}

			if (reg.up[k]) {
				for (var i = 0; i < reg.up[k].length; i++) {
					reg.up[k][i](ret);
				}
			}

			e.preventDefault();
		});

		var max_col = 0; // max column selected
		var line_lock = false; // true when only up and down key are every pressed

		var ret = {
			toggleCapital: function () {
				capslk = !capslk;
				for (var i = 0; i < reg.capital.length; i++) {
					reg.capital[i](capslk);
				}
			},

			// by can only be 1 or -1
			incPos: function (by) {
				line_lock = false;

				curpos += by;

				if (curpos > 0) {
					curpos = 0;
					return; // no change
				}

				if (text.length + curpos < 0) {
					curpos = -text.length;
					return; // no change
				}

				if (cache) {
					if (cache.curpos + by < 0) {
						cache.curline--;
						cache.curpos = cache.lines[cache.curline].text.length;
						refreshLine(cache.curline + 1);
						// alert([ cache.curline, cache.curpos ]);
					} else if (cache.curpos + by > cache.lines[cache.curline].text.length) {
						cache.curpos = 0;
						cache.curline++;
						refreshLine(cache.curline - 1);
					} else {
						cache.curpos += by;
					}

					// alert([ cache.curline, cache.curpos ]);

					refreshLine(cache.curline);
				} else {
					refresh();
				}
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

					if (!line_lock) {
						line_lock = true;
						max_col = linepos;
					}

					var len = end - start;

					linepos = Math.max(linepos, max_col);
					var shorter = Math.min(len, linepos);

					// alert(shorter);

					curpos = start + shorter - text.length;

					if (cache) {
						cache.curline += dir;
						cache.curpos = shorter;
						refreshLine(cache.curline - dir);
						refreshLine(cache.curline);
					} else {
						refresh();
					}
				}

				for (var i = 0; i < lines.length; i++) {
					tmp = len + lines[i].length + 1;

					if (tmp > abspos && abspos >= len) {
						linepos = abspos - len;

						var targ_line = i + dir;

						// no target line
						if (targ_line >= lines.length) {
							// last line
							curpos = 0;

							if (cache) {
								cache.curpos = cache.lines[cache.curline].text.length;
								refreshLine(cache.curline);
							} else refresh();
							
							break;
						}

						if (targ_line < 0) {
							// first line
							curpos = -text.length;

							if (cache) {
								cache.curpos = 0;
								refreshLine(cache.curline);
							} else refresh();

							break;
						}

						if (dir == 1) {
							start = tmp;
							end = tmp + lines[targ_line].length;
						} else { // -1
							start = len - lines[targ_line].length - 1;
							end = len - 1;
						}

						newpos(linepos, start, end);
					}

					len = tmp;
				}
			}
		};

		// setTimeout(function () {
		// 	ret.incPos(-1);
		// }, 3000);

		return ret;
	}

	return {
		genKeyboard: genKeyboard,
		cursor: cursor_style
	};
});
