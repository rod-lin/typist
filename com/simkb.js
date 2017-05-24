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
			height: "1.3em",
			vertical: "text-bottom",
			delay: 800 // blinking delay
		},

		block: {
			width: "auto",
			height: "1.1em",
			vertical: "text-bottom",
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
		var keyset = $("<span class='keyset'></span>");
		var char = $("<span class='char'></span>"); // char width measure
		var mlineno = $("<div class='lineno' style='position: absolute; visibility: hidden;'></div>"); // lineno measure

		input.append(value);
		input.append(char);
		input.append(mlineno);

		kb.append(input);
		kb.append(keyset);

		cont.append(kb);

		var text = "";
		var capslk = false;
		var relpos = 0; // cursor position in the text

		var cache;
		var use_cache = true;

		var render = {};
		var ucache = { line: {} };
		var ev = {};
		var dir = {};

		// main render utils
		(function () {
			var cur_blink;

			// HTML encode a text
			function filt(text) {
				return text
					.replace(/\t/g, "    ")
					.replace(/ /g, "&nbsp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;");
			}

			render.cursor = function () {
				if (typeof config.cursor.height === "string")
					cursor.css("height", config.cursor.height);
				else
					cursor.height(config.cursor.height);

				if (!config.cursor.invert)
					cursor.addClass("trans");

				if (config.cursor.offset) {
					cursor.css("margin-bottom", config.cursor.offset);
				}

				clearInterval(cur_blink);

				cur_blink = setInterval(function () {
					cursor.toggleClass("hide");
				}, config.cursor.delay || 700);
			};

			render.line = function (line, text, curpos) {
				if (curpos != -1) {
					var first = text.substring(0, curpos);
					var second = text.substring(curpos);

					cur_char = filt(second[0] || "");

					char.html(second[0] == "\t" ? "&nbsp;" : (cur_char || "a"));

					second = second.substring(1);
					
					line.append(filt(first));
					line.css("height", char.height() + "px"); // fix height before inserting cursor
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
			};

			render.line.template = function () {
				return $("<div class='line'><div class='lineno'></div></div>");
			};

			render.lineno = function () {
				render.pos();

				var lines = value.children(".line");

				for (var i = 0; i < lines.length; i++) {
					mlineno.html((i + 1).toString());
					$(lines[i]).find(".lineno").html((i + 1).toString()).css({
						"left": -mlineno.width() - 15 + "px",
						"opacity": "1",
						"line-height": char.height() + "px"
					});
				}

				value.children("br").remove();
				value.children(".line").before("<br>");
				value.children("br").first().remove();
			};

			// set the cursor in the view
			render.view = function () {
				// alert(line.position());
				cursor.ready(function () {
					line = cursor.parent();
					var top = line.position().top;
					var height = line.outerHeight(true);

					var scroll = input.scrollTop();
					var vheight = input.height();

					// alert(top);

					if (top < scroll) {
						input.scrollTop(top);
					} else if (top + height > scroll + vheight) {
						input.scrollTop(top + height - vheight + 2);
					}
				});
			};

			render.pos = function () {
				value.find(".line").css("max-width", keyset.width() + "px");
				value.css({
					"position": "relative",
					"width": keyset.width() + "px",
					"left": keyset.position().left + "px"
				});

				input.css({
					"width": (keyset.outerWidth() + keyset.position().left) + "px",
					"height": (kb.height() - keyset.outerHeight(true)) + "px"
				});
			};

			// refresh everything
			render.all = function () {
				var lines = text.split(/\n/g);

				var line, tmp, cont;
				var len = 0;

				var cur_char;

				var abspos = text.length + relpos;

				if (use_cache) {
					ucache.init();
				}

				value.html("");

				for (var i = 0; i < lines.length; i++) {
					tmp = len + lines[i].length + 1 /* \n */;

					line = render.line.template();

					var has_cur = tmp > abspos && abspos >= len;

					if (use_cache && has_cur) {
						ucache.curline(i);
						ucache.curpos(abspos - len);
					}

					var log = render.line(line, lines[i], (has_cur ? abspos - len : -1));
					if (use_cache) {
						ucache.push(log);
					}

					len = tmp;

					if (!lines[i]) {
						line.append("&nbsp;");
					}

					value.append(line);
				}

				render.lineno();

				if (config.cursor.width === "auto")
					cursor.width(char.width());
				else
					cursor.width(config.cursor.width);

				if (config.cursor.vertical)
					cursor.css("vertical-align", config.cursor.vertical);

				render.pos();
				render.cursor();
				render.view();
			};
		})();

		// line cache util
		(function () {
			var cache = null;

			ucache.init = function () {
				cache = {
					lines: [],
					curpos: null,
					curline: null
				};
			};

			ucache.ready = function () {
				return cache != null;
			};

			ucache.push = function (line) {
				cache.lines.push(line);
			};

			// cursor position in the current line
			ucache.curpos = function (pos) {
				if (pos !== undefined)
					return cache.curpos = pos;
				else
					return cache.curpos;
			};

			ucache.curline = function (lineno) {
				if (lineno !== undefined)
					return cache.curline = lineno;
				else
					return cache.curline;
			};

			ucache.get = function (lineno) {
				return cache.lines[lineno];
			};

			ucache.getl = function (lineno) {
				return cache.lines[lineno].text.length;
			};

			ucache.line.refresh = function (lineno, text) {
				if (!cache) return false;

				var line = cache.lines[lineno];
				line.dom.html(line.dom.find(".lineno"));

				line.text = text || line.text;

				if (cache.curline == lineno) {
					cache.lines[lineno] = render.line(line.dom, line.text, cache.curpos);
				} else {
					cache.lines[lineno] = render.line(line.dom, line.text, -1);
				}

				if (!line.text)
					cache.lines[lineno].dom.append("&nbsp;");

				render.view();

				return true;
			};

			ucache.line.remove = function (lineno) {
				if (!cache) return false;

				var rmline = cache.lines[lineno];

				rmline.dom.remove();
				cache.lines.splice(lineno, 1);

				render.lineno();

				return true;
			};

			// insert after a lineno
			ucache.line.insert = function (lineno, text) {
				if (!cache) return false;

				var newl = render.line.template();
				cache.lines.splice(lineno + 1, 0, render.line(newl, text, -1));
				cache.lines[lineno].dom.after(newl);

				render.lineno();

				return true;
			};
		})();

		// key events
		(function () {
			function addc(c) {
				line_lock = false;
				cursor.removeClass("hide");

				if (!c) return;

				switch (c) {
					case "\b":
						var pos = text.length + relpos;
						text = text.substring(0, pos - 1) +
							   text.substring(pos);

						break;

					default:
						var pos = text.length + relpos;
						c =  capslk ? c.toUpperCase() : c;
						text = text.substring(0, pos) + c +
							   text.substring(pos);
				}

				if (config.onChange)
					config.onChange(text);

				switch (c) {
					case "\b":
						if (ucache.ready()) {
							var curline = ucache.curline();
							var curpos = ucache.curpos();

							if (curpos != 0) {
								// not the first character
								var line = ucache.get(curline);
								
								line.text = line.text.substring(0, curpos - 1) +
											line.text.substring(curpos);

								ucache.curpos(curpos - 1);
								ucache.line.refresh(curline);
							} else if (curline > 0) {
								var line1 = ucache.get(curline - 1);
								var line2 = ucache.get(curline);

								curpos = ucache.curpos(line1.text.length);

								line1.dom.html(line1.dom.find(".lineno"));
								line1.text = line1.text + line2.text;

								ucache.line.remove(curline);

								curline = ucache.curline(curline - 1);

								ucache.line.refresh(curline);
							} // else no change

							return;
						}

						break;

					case "\n":
						if (ucache.ready()) {
							var curline = ucache.curline();
							var curpos = ucache.curpos();

							var line = ucache.get(curline);

							var nextl = line.text.substring(curpos);
							line.text = line.text.substring(0, curpos);

							ucache.curpos(0);
							curline = ucache.curline(curline + 1);

							ucache.line.refresh(curline - 1);
							ucache.line.insert(curline - 1, nextl);
							ucache.line.refresh(curline);

							return;
						}

						break;

					default:
						if (ucache.ready()) {
							// ucache.line.refresh only
							var curline = ucache.curline();
							var curpos = ucache.curpos();
							var line = ucache.get(curline);
							line.text =
								line.text.substring(0, curpos) + c +
								line.text.substring(curpos);

							ucache.curpos(curpos + 1);
							ucache.line.refresh(curline);
						
							return;
						}
				}

				render.all();
			}

			var reg = ev.reg = {
				down: {},
				up: {},
				hotkey: {},
				onshift: [],
				offshift: [],
				capital: []
			};

			var bind = ev.bind = {
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

				hotkey: function (k, cb) {
					if (!reg.hotkey[k]) reg.hotkey[k] = [];
					reg.hotkey[k].push(cb);
				},

				capital: function (cb) {
					reg.capital.push(cb);
				},

				addc: addc
			};

			ev.route = function (handler, arg) {
				if (!handler) return;
				for (var i = 0; i < handler.length; i++) {
					handler[i](arg);
				}	
			};

			// parsing key definition
			for (var i = 0; i < def.length; i++) {
				if (def[i]) {
					keyset.append(genKey(def[i].code, bind, def[i].config));
				} else {
					keyset.append("<br>");
				}
			}

			/*
				0         7      8     9       10
				--------------------------------
				| keycode | ctrl | alt | shift |
				--------------------------------
			 */
			var encodeKey = ev.encodeKey = function (ev) {
				return ev.which |
					(ev.ctrlKey ? (1 << 8) : 0) |
					(ev.altKey ? (1 << 9) : 0) |
					(ev.shiftKey ? (1 << 10) : 0);
			};

			var decodeKey = ev.decodeKey = function (code) {
				return {
					which: code & 0xff,
					ctrlKey: !!(code & (1 << 8)),
					altKey: !!(code & (1 << 9)),
					shiftKey: !!(code & (1 << 10))
				};
			};

			function down(e) {
				var k = e.which;

				if (e.ctrlKey) {
					ev.route(reg.hotkey[encodeKey(e)], ret);
					return;
				}

				// shift events
				if (e.shiftKey) ev.route(reg.onshift, ret);

				// down events
				if (reg.down[k]) ev.route(reg.down[k], ret);

				// direction key events
				if (k == 37 || k == 39) {
					cursor.removeClass("hide");
					dir.lr(k - 38);
				} else if (k == 38 || k == 40) {
					cursor.removeClass("hide");
					dir.ud(k - 39);
				}
			}

			function up(e) {
				var k = e.which;
				
				if (k == 16) ev.route(reg.offshift, ret);
				if (reg.up[k]) ev.route(reg.up[k], ret);
			}

			function prevdef(e) {
				e.preventDefault();
			}

			$(window).focus();
			$(window)
				.keydown(down).keyup(up)
				.keydown(prevdef).keyup(prevdef);

			/*
				Cassette JSON

				// delay refers to the delay to the last code
				// in ms
				[ { delay, code, type }, { delay, code, type }, ... ]
			 */

			var cassette = [];
			var last_time = 0;

			function delay() {
				var now = new Date().getTime();
				var del = now - last_time;
				last_time = now;
				return del;
			}

			function drecord(e) {
				cassette.push({
					delay: delay(),
					code: encodeKey(e),
					type: "down"
				});
			}

			function urecord(e) {
				cassette.push({
					delay: delay(),
					code: encodeKey(e),
					type: "up"
				});
			}

			ev.record = function () {
				cassette = [];
				last_time = new Date().getTime();
				$(window)
					.off("keydown", drecord).off("keyup", urecord)
					.keydown(drecord).keyup(urecord);
			};

			ev.cut = function () {
				$(window).off("keydown", drecord).off("keyup", urecord)
				return cassette.slice();
			};

			ev.replay = function (cas) {
				function next(i) {
					if (i >= cas.length) return;
					var note = cas[i];

					setTimeout(function () {
						if (note.type == "down") {
							down(decodeKey(note.code));
						} else {
							up(decodeKey(note.code));
						}

						next(i + 1);
					}, note.delay);
				}

				next(0);
			};
		})();

		// direction key operations
		(function () {
			var max_col = 0; // max column selected
			var line_lock = false; // true when only up and down key are every pressed
	
			// left(-1) or right(1)
			dir.lr = function (dir) {
				line_lock = false;

				relpos += dir;

				if (relpos > 0) {
					relpos = 0;
					return; // no change
				}

				if (text.length + relpos < 0) {
					relpos = -text.length;
					return; // no change
				}

				if (ucache.ready()) {
					var curline = ucache.curline();
					var curpos = ucache.curpos();

					if (curpos + dir < 0) {
						// go to the previous line
						curline = ucache.curline(curline - 1);
						ucache.curpos(ucache.getl(curline)); // last pos in the line
						ucache.line.refresh(curline + 1);

					} else if (curpos + dir > ucache.getl(curline)) {
						// goto the next line
						ucache.curpos(0);
						curline = ucache.curline(curline + 1);
						ucache.line.refresh(curline - 1);

					} else {
						// move back or forward
						ucache.curpos(curpos + dir);
					}

					ucache.line.refresh(curline);
				} else {
					render.all();
				}
			};

			// up(-1) or down(1)
			dir.ud = function (dir) {
				var lines = text.split("\n");
				var tmp, len = 0;
				var abspos = text.length + relpos;
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

					relpos = start + shorter - text.length;

					if (ucache.ready()) {
						var curline = ucache.curline();
						var curpos = ucache.curpos();

						curline = ucache.curline(curline + dir);
						ucache.curpos(shorter);

						ucache.line.refresh(curline - dir);
						ucache.line.refresh(curline);
					} else {
						render.all();
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
							relpos = 0;

							if (ucache.ready()) {
								var curline = ucache.curline();
								var curpos = ucache.curpos();

								ucache.curpos(ucache.getl(curline));
								ucache.line.refresh(curline);
							} else render.all();
							
							break;
						}

						if (targ_line < 0) {
							// first line
							relpos = -text.length;

							if (ucache.ready()) {
								var curline = ucache.curline();
								var curpos = ucache.curpos();

								ucache.curpos(0);
								ucache.line.refresh(curline);
							} else render.all();

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
			};
		})();

		// trivial settings
		kb.ready(function () {
			$(window).resize(render.pos);
			render.all();
		});

		var ret = {
			toggleCapital: function () {
				capslk = !capslk;
				ev.route(ev.reg.capital, capslk);
			}
		};

		ev.bind.hotkey(ev.encodeKey({
			which: 82, // r
			ctrlKey: true,
			shiftKey: true
		}), function () {
			console.log("record");
			ev.record();
		});

		ev.bind.hotkey(ev.encodeKey({
			which: 69, // e
			ctrlKey: true,
			shiftKey: true
		}), function () {
			console.log(ev.cut());
		});

		ev.bind.hotkey(ev.encodeKey({
			which: 84, // t
			ctrlKey: true,
			shiftKey: true
		}), function () {
			console.log("replay");
			ev.replay(ev.cut());
		});

		return ret;
	}

	return {
		genKeyboard: genKeyboard,
		cursor: cursor_style
	};
});
