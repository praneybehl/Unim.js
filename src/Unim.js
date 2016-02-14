/**
 * Unim.js v1 (Before it was named Animo.js)
 * https://github.com/dalisoft/unim.js
 * Copyright (c) 2015, @dalisoft. All right reserved
 * Licensed under MIT-License
 */

if (Array.prototype.match === undefined) {
	Array.prototype.match = function (m) {
		for (var i = 0; i < this.length; i++) {
			if (m.test(this[i]))
				return i;
		}
		return -1;
	}
}

var global = (typeof module === "object" && module.exports !== undefined && typeof global !== "undefined") ? global : (typeof window !== "undefined") ? window : (typeof this === "object" && (this.tempVars = {}) !== undefined) ? this : {};


(function (root, undefined) {

	// modular function
	root.modular = function () {
		var _slice = [].slice.call(arguments), names = _slice[0], i = 0, len = names.length;
		_slice.shift();
		for ( ; i < len; i++ ) {
			root[names[i]] = _slice[i];
		}
		return root;
		
	};
	root.calc = function calc(a, b, c, d) {
		var c = Math.pow(parseFloat(c) - parseFloat(a), 2),
		d = Math.pow(parseFloat(d) - parseFloat(b), 2),
		calc = c + d;
		return Math.sqrt(calc);
	}
	root.getLength = function (path) {
		var tag = path.tagName,
		box = path.getBBox(),
		length;
		if (window.SVGElement && path instanceof SVGElement) {
			if (tag === 'path') {
				length = path.getTotalLength();
			} else if (tag === 'rect') {
				length = 2 * (box.width + box.height);
			} else if (tag === 'circle') {
				var r = path.radius();
				length = 2 * r * Math.PI;
			} else if (tag === 'line') {
				length = calc(path.getAttribute("x1"), path.getAttribute("y1"), path.getAttribute("x2"), path.getAttribute("y2"));
			}
			return length;
		}
	}
	root.prefix = function (prop) {
		var div = document.createElement('div');
		if (/svgDraw/g.test(prop) || prop in div.style || prop in div)
			return prop;
		var prefixes = ['Webkit', 'Moz', 'Ms', 'O'];

		for (var i = 0; i < prefixes.length; ++i) {
			var vendorProp = prefixes[i] + prop.charAt(0).toUpperCase() + prop.substr(1).toLowerCase();
			if (div.style[vendorProp] !== undefined || vendorProp in div) {
				return vendorProp;
			}
		}
		div = null;
		return prop;
	};
	root.prefixize = function (obj) {
		if (typeof obj === "string" || typeof obj === "number") return obj;
		var clone = {},
		o1 = obj;
		for (var property in obj) {
			clone[prefix(property)] = clone[property] = obj[property];
			//delete obj[property];
		}
		return clone;
	}
	root.cloneArr = function (a, b) {
		for (var i = 0, len = b.length; i < len; i++) {
			a.push(b[i]);
		}
		for (var i = 0, len = b.length; i < len; i++) {
			b.splice(i);
		}
		return a;
	};
	var ua = navigator.userAgent;
	var _isIETransform = /MSIE (6|7|8)/g.test(ua);
	var _tweens = [];
	var _elements = [];
	var _tick = null;
	var _stoppedTick = true;
	var _rAF = window.requestAnimationFrame || window.webkitRequestAnimationFrame || function (callback) {
		return setTimeout(callback, 16)
	};
	var _cAF = window.cancelAnimationFrame || function (callback) {
		return clearTimeout(callback);
	};
	function now () {
		return (root.performance !== undefined && root.performance.now !== undefined) ? root.performance.now() : Date.now();
	}
	var _changedTime = null;
	var _cacheEl = [];
	var _cacheWhenChanged = [];
	var _getLastTime = now();

	var _curPrefix = prefix('Transform').toLowerCase().replace(/transform/g, '');
	var visibilitychange = _curPrefix + "visibilitychange";
	function isHidden() {
		var hidden = document[(_curPrefix ? _curPrefix + "H" : "h") + "idden"];
		return hidden !== undefined && hidden === true;
	}
	function addEventListener(element, action, fn) {
		if (document.addEventListener !== undefined) {
			element.addEventListener(action, fn)
		} else if (document.attachEvent) {
			element.attachEvent('on' + action, fn)
		}
	}
	var visibility = true;
	/*! Optimizes arrays, HIGHLY SAVES BATTERY LIFE and corrects time when changing tab state */
	if (visibility && isHidden() !== undefined) {
		addEventListener(document, visibilitychange, function () {
			if (isHidden()) {
				_changedTime = now();
				root.cloneArr(_cacheWhenChanged, _tweens);
				
			} else {
				_getLastTime += now() - _changedTime;
				root.cloneArr(_tweens, _cacheWhenChanged);
			}
		})
	}

	var _svgEx = "cx|cy|r|rx|ry|x1|x2|y1|y2|d|points".split("|");
	var _isSVGNTA = !(function () {
		var ua = window.navigator.userAgent;
		return /Trident.*rv\:11\./.test(ua) || /Android|MSIE/g.test(ua);
	})();
	if (!_isSVGNTA) {
		_svgEx.push("|transform");
	}
	var uncamelcase = function () {
		return this.replace(/([A-Z])/g, function (UPPERCASE) {
			return "-" + UPPERCASE.toLowerCase();
		});
	}
	var transformEx = "x|y|z|rotate|rotateX|rotateY|rotateZ|scale|scaleX|scaleY|scaleZ|skew|skewX|skewY|matrix|matrix3d".split("|");
	var filterEx = "grayscale|brightness|sepia|invert|saturate|contrast|blur|hueRotate|dropShadow".split("|");
	var number = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
	var cre = /#|rgba|rgb|ahsv|hsv|hsla|hsl|hsba|hsb/i;

	var bodyList = [].slice.call(Object.keys(document.body.style));
	var is3D = 'perspective' in document.body.style || (prefix('perspective') !== 'perspective');
	var fil = prefix('Filter');
	var trans = prefix("Transform");

	root.parseIEOrigin = function parseOrigin(offsets, origins) {
		var originArr = origins.split(" "),
		originParsed = [toPixel(originArr[0], offsets.width), toPixel(originArr[1], offsets.height)],
		offset = [offsets.width, offsets.height],
		reMakeTheirPos = [],
		origArr = [];
		for (var i = 0; i < 2; i++) {
			var parse = originParsed[i],
			half = offset[i] / 2;
			origArr[i] = half;
			parsed = parse;
			reMakeTheirPos[i] = parsed;
		}
		return {
			origin : reMakeTheirPos,
			center : origArr
		};
	};

	root.getCStyle = function getCStyle(elem, prop) {
		return elem.currentStyle !== undefined ? elem.currentStyle[prop] : processValue(elem.style[prop]) ? elem.style[prop] : (typeof getComputedStyle === "function") ? getComputedStyle(elem, null).getPropertyValue(prop) : 0;
	};
	function isAuto(i) {
		return i.indexOf("auto") !== -1 ? "0px" : i;
	}
	function forceXY(elem) {
		if (elem === null || !elem)
			return;
		var pos = getCStyle(elem, "position");
		if (pos === "absolute") {}
		else if (pos === "relative") {}
		else if (pos === "fixed") {}
		else if (pos === "static") {
			elem.style.position = "relative";
		}
	}
	var _posFixCache;
	function posFix(elem) {
		return _posFixCache || (_posFixCache = {
				left : parseFloat(toPixel(getCStyle(elem, "left"), elem.parentNode.offsetWidth)),
				top : parseFloat(toPixel(getCStyle(elem, "top"), elem.parentNode.offsetHeight)),
				width : elem.offsetWidth,
				height : elem.offsetHeight
			});
	}
	root.IETransform = function origin(elem, update, orig) {
		orig = orig || "";
		forceXY(elem);
		var posRel = posFix(elem),
		origStr = parseIEOrigin({
				width : posRel.width,
				height : posRel.height
			}, update["transform-origin"] || update.transformOrigin || "50% 50%"),
		center = origStr.center,
		originArr = origStr.origin,
		d2r = Math.PI / 180,
		rotate = parseFloat(update.rotate || 0),
		scaleX = parseFloat(update.scaleX || update.scale || 1),
		scaleY = parseFloat(update.scaleY || update.scale || 1),
		rad = (rotate || 0) * d2r,
		a = parseFloat(parseFloat(Math.cos(rad) * scaleX).toFixed(6)),
		b = -parseFloat(parseFloat(Math.sin(rad)).toFixed(6)),
		c = -b,
		d = parseFloat(parseFloat(Math.cos(rad) * scaleY).toFixed(6)),
		offsets = [elem.offsetWidth, elem.offsetHeight],
		currPos = [elem.offsetLeft, elem.offsetTop],
		translateX = parseFloat(toPixel(update.x || '0px')),
		translateY = parseFloat(toPixel(update.y || '0px')),
		originTranslated = [center[0] - originArr[0], center[1] - originArr[1]],
		originMatrix = [a * originTranslated[0] + b * originTranslated[1], c * originTranslated[0] + d * originTranslated[1]],
		originXY = [originMatrix[0] + originArr[0], originMatrix[1] + originArr[1]],
		originCentered = [originXY[0] - (offsets[0] / 2), originXY[1] - (offsets[1] / 2)],
		parsedXY = [(update.left || 0) + originCentered[0], (update.top || 0) + originCentered[1]];
		translate = [parsedXY[0] + translateX, parsedXY[1] + translateY],
		x = update.left || posRel.left,
		y = update.top || posRel.top,
		e = parseFloat(translate[0].toFixed(6)),
		/* we make this as highly accurate */
		f = parseFloat(translate[1].toFixed(6));
		/* we make this as highly accurate */
		var blur = update.blur ? parseFloat(parseFloat(update.blur).toFixed(0)) : undefined;
		var brightness = update.brightness ? parseFloat(update.brightness) : undefined;
		var rgbbrig = 80 * brightness;
		if (typeof e === "number" && typeof f === "number" && typeof blur === "number") {
			e -= blur;
			f -= blur;
			orig += ", progid:DXImageTransform.Microsoft.Blur(pixelRadius='" + blur + "')";
		}
		if (typeof update.brightness === "number") {
			orig += ", progid:DXImageTransform.Microsoft.Light()";
		}
		var xParse = parseFloat(e) + x,
		yParse = parseFloat(f) + y;

		var matrix = [a, b, c, d, e, f];
		elem.style.left = e + "px";
		elem.style.top = f + "px";
		elem.style.filter = "progid:DXImageTransform.Microsoft.Matrix(M11=" + matrix[0] + ",M12=" + matrix[1] + ",M21=" + matrix[2] + ",M22=" + matrix[3] + ", sizingMethod='auto expand'), alpha(opacity=" + Math.floor(parseFloat(update.opacity || 1) * 100) + ")" + orig;
		if (update.brightness) {
			elem.filters.item("DXImageTransform.Microsoft.Light").addAmbient(rgbbrig, rgbbrig, rgbbrig, brightness * 100);
		}
	};
	modular(['objToStr', 'toObj'], function (s) {
		var S = '{';
		for (var p in s) {
			S += p + ':' + s[p] + ',';
		}
		S = S.substr(0, S.length - 1) + '}';
		return S;
	}, function (s) {
		var O = {},
		S = s.replace(/{|}/g, '').split(",");
		for (var i = 0, len = S.length; i < len; i++) {
			var v = S[i].split(":");
			if (v[0]) {
				O[v[0]] = !/\s+/g.test(v[1]) ? parseFloat(v[1]) : v[1];
			}
		}
		return O;
	});

	modular(['cache'], function cache(el, v) {
		if (v !== undefined) {
			el.currentTween = objToStr(v);
		}
		return toObj(el.currentTween || "{}") || {};
	});

	function processValue(value) {
		return (value !== undefined && value !== null && value !== "" && !isNaN(value) && isFinite(value) && value !== " ");
	}

	root.Easing = {
		Linear : function (k) {

			return k;

		}
	}

	var EasingsList = [null, null, "Quad", "Cubic", "Quart", "Quint", "Strong", "Expo", "Circ"],
	a = ["In", "Out", "InOut"], // Generate 3 types, easeIn, easeOut, easeInOout
	i = 2, // defined for performance
	len = EasingsList.length; // defined for performance
	/* Ease name generator */
	function setName(i, type) {
		return EasingsList[i] + a[type];
	}

	/* Ease function definer */
	function setEase(name, fn) {
		Easing[name] = fn;
	}

	/* EaseIn generator */
	function EaseIn(i) {
		return function (k) {
			return Math.pow(k, i);
		};
	}

	/* EaseOut generator */
	function EaseOut(i) {
		return function (k) {
			return 1 - Math.pow(1 - k, i);
		};
	}

	/* EaseInOut generator */
	function EaseInOut(i) {
		return function (k) {
			if (k < 0.5) {
				return Math.pow(k * 2, i) * 0.5;
			}
			return EaseOut(i)(k * 2 - 1) * 0.5 + 0.5;
		};
	}

	/* Other easing function define */
	while (i < len) {
		setEase(setName(i, 0), EaseIn(i));
		setEase(setName(i, 1), EaseOut(i));
		setEase(setName(i, 2), EaseInOut(i));
		i++
	}
	if (trans > -1) {
		trans = bodyList[trans];
	}
	function offset(svg, props, isDiv) {
		props = props || {};
		if (svg !== null && window.SVGElement && svg instanceof SVGElement) {
			var box = svg.getBBox();
			var r = {};
			for (var p in box) {
				r[p] = box[p];
			}
			return r;
		} else if (svg !== null && svg.nodeType) {
			return {
				left : svg.offsetLeft,
				top : svg.offsetTop,
				width : svg.offsetWidth,
				height : svg.offsetHeight,
				x : props.x || 0,
				y : props.y || 0
			};
		}
		return {
			left : 0,
			top : 0,
			width : 0,
			heigth : 0,
			x : 0,
			y : 0
		};
	}
	var _customProperty = {};
	modular(['parseFromStyle'], function parseFromStyle(elem, type) {
		if (_isIETransform)
			return false;
		var object = {},
		computed = (typeof getComputedStyle === "function") ? getComputedStyle(elem, null) : elem.currentStyle,
		direct = elem.style;
		if (type.length > 0 && type.indexOf('Filter') > -1) {
			var filters = (window.SVGElement && elem instanceof SVGElement) ? getComputedStyle(elem.parentNode)[prefix('Filter')] : computed[prefix('Filter')];
			if (filters !== 'none' && processValue(filters)) {
				filters = filters.split(" ");
				for (var i = 0, len = filters.length; i < len; i++) {
					var full = filters[i],
					splitted = full.split("("),
					name = splitted[0].replace(/\(/g, '').replace(/-([A-Za-z])/g, function (f) {
							return f.substr(1).toUpperCase();
						}),
					content = splitted[1].replace(/\)/g, '');
					object[name] = content;
				}
			}
		}
		if (type.length > 0 && type.indexOf('Transform') > -1) {
			var transform = direct[prefix('Transform')];
			if (processValue(transform)) {
				transform = transform.split(" ");
				for (var i = 0, len = transform.length; i < len; i++) {
					var full = transform[i],
					splitted = full.split("("),
					name = splitted[0].replace(/\(/g, ''),
					content = splitted[1].replace(/\)/g, '');
					object[name] = content;
				}
			}
		}
		return object;
	});
	modular(['offset', 'isArray', 'generateTransform', 'tick', 'color', 'pF', 'join', 'tween', 'TweenIsObject', 'TweenIsArray', 'Tweenable', 'toPixel', 'svgDraw', 'svgDrawGet', 'EvryWord', 'Sequence', 'getStyle', 'Unim', 'applyDefaults', 'extend'], offset, Array.isArray || function (arr) {
		return arr instanceof Array;
	}, function generateTransform(svg, props, propsS, origin, statusTween) {
		var isCSSAndSVG = (svg !== null && ((window.SVGElement && svg instanceof SVGElement) || svg.nodeType) && svg.tagName.toLowerCase() !== 'canvas');
		if (!isCSSAndSVG)
			return props;
		var _isTransformExist = [false, false];
		for (var key in props) {
			if (transformEx.indexOf(key) !== -1)
				_isTransformExist[0] = true;
		}
		for (var key in propsS) {
			if (transformEx.indexOf(key) !== -1)
				_isTransformExist[1] = true;
		}
		_isTransformExist = _isTransformExist[0] && _isTransformExist[1];
		if (!_isTransformExist) {
			return props;
		}
		var correctProperty = {
			rotateZ : 'rotate',
			translateX : 'x',
			translateY : 'y',
			translateZ : 'z'
		};
		for (var property in correctProperty) {
			var corrected = correctProperty[property];
			if (props[property]) {
				props[corrected] = props[property];
				delete props[property];
			}
			if (propsS[property]) {
				propsS[corrected] = propsS[property];
				delete props[property];
			}

		}
		var DEFAULT_TRANSFORM = ['rotate', 'scale', 'scaleX', 'scaleY', 'skew', 'skewX', 'skewY', 'x', 'y'];
		for (var i = 0, len = DEFAULT_TRANSFORM.length; i < len; i++) {
			var p = DEFAULT_TRANSFORM[i];
			if (propsS[p] !== undefined && props[p] === undefined) {
				props[p] = /scale/i.test(p) ? 1 : /rotate|skew/i.test(p) ? (typeof propsS[p] === "string") ? "0deg" : 0 : 0;
			}
			if (props[p] !== undefined && propsS[p] === undefined) {
				propsS[p] = /scale/i.test(p) ? 1 : /rotate|skew/i.test(p) ? (typeof props[p] === "string") ? "0deg" : 0 : 0;
			}
			if (typeof props[p] === "number") {
				if (/rotate|skew|skewX|skewY/i.test(p)) {
					props[p] += "deg";
				}
				if (/x|y/i.test(p)) {
					props[p] += "px";
				}
			}
			if (typeof propsS[p] === "number") {
				if (/rotate|skew|skewX|skewY/i.test(p)) {
					propsS[p] += "deg";
				}
				if (/x|y/i.test(p)) {
					propsS[p] += "px";
				}
			}
		}
		if (statusTween === 0 || statusTween === 1 || statusTween === 2) {
			/*! check, if supports css transform 2d, we use 2d transform for better compatiblity */
			origin = (statusTween === 2 ? props["transformOrigin"] : origin[statusTween]) || "50% 50%";

			if ((statusTween === 2 && props["transformOrigin"] !== undefined) || statusTween !== 2) {
				origin = origin.replace(/center/g, '50%').replace(/top|left/g, '0%').replace(/bottom|right/g, '100%');
				props[prefix("transformOrigin")] = props["transformOrigin"] = propsS[prefix("transformOrigin")] = propsS["transformOrigin"] = origin;
			}
			/*! We converting strings to percents, later percents to pixels (Unim.js in-build plug-in) */
			var transformOrigin = origin.split(" ");
			/*! We're split origins into array */
			var box = offset(svg, props);
			/*! Offset svg/DOM-Node dimensions */
			var transform = "";
			/*! Make string variable for better using and performance */
			var translateArr = [props.x || 0, props.y || 0];
			if (processValue(props.translate)) {
				translateArr = props.translate.replace(/ /g, ",").split(",");
			}
			/*! Default translateX/Y array */
			var scale = [props.scaleX || props.scale || 1, props.scaleY || props.scale || 1];

			/*! Convert origins from percent to pixels */
			for (var i = 0; i < 2; i++) {
				transformOrigin[i] = toPixel(transformOrigin[i], parseFloat(i === 0 ? box.width : box.height)) + parseFloat(box[i === 0 ? "x" : "y"]);
			}
			var centerX = toPixel(parseFloat(translateArr[0], 10), box.width) + transformOrigin[0];
			var centerY = toPixel(parseFloat(translateArr[1], 10), box.height) + transformOrigin[1];
			if (window.SVGElement && svg instanceof SVGElement) {
				/*! Translate, ex, translate(25px, 50px) */
				if (processValue(props.x) || processValue(props.y)) {
					if (_isSVGNTA) {
						if (processValue(props.x)) {
							props.x += typeof props.x === "number" ? "px" : "";
						}
						if (processValue(props.y)) {
							props.y += typeof props.y === "number" ? "px" : "";
						}
					} else {
						if (processValue(props.x) && (typeof props.x === "string" || typeof props.x === "number")) {
							if (typeof props.x === "string") {
								props.x = parseFloat(props.x.replace(/(A-Za-z)+/g, ''));
							}
						}
						if (processValue(props.y) && (typeof props.y === "string" || typeof props.y === "number")) {
							if (typeof props.y === "string") {
								props.y = parseFloat(props.y.replace(/(A-Za-z)+/g, ''));
							}
						}
					}
				}
				if (!_isSVGNTA) {

					var scaleXAxis = centerX - scale[0] * centerX;
					var scaleYAxis = centerY - scale[1] * centerY;
					props.x = parseFloat(props.x || "0", 10) + scaleXAxis;
					props.y = parseFloat(props.y || "0", 10) + scaleYAxis;
				}
				/*! Parse Properties */
				for (var prop in props) {

					/*! Rotate, ex, rotate(35deg) */
					if (prop === 'rotate' && !_isSVGNTA) {
						var rotateCenter = [centerX, centerY];
						props.rotate = [parseFloat(typeof props.rotate === "string" ? props.rotate.replace(/(A-Za-z)+/g, '') : props.rotate)].concat(rotateCenter).join(" ");
					}
					if (/skew|skewX|skewY/i.test(prop) && !_isSVGNTA) {
						props[prop] = typeof props[prop] === "string" ? parseFloat(props[prop].replace(/(A-Za-z)+/g, '')) : props[prop];
					}
				}
				if (_isSVGNTA) {
					//props.transformOrigin = origin;
				}
			} else {
				/* With Internet Explorer has some bugs with SVG + DIV selectors */
				/* Rotate fix */
				if (!_isIETransform) {
					if (typeof props.rotate === "string" && !/deg|rad/g.test(props.rotate)) {
						var len = props.rotate.split(" ");
						if (len.length === 3) {
							props.rotate = len[0] + "deg";
						}
					}
					if (typeof props.rotate === "number") {
						props.rotate += "deg";
					}
					if (typeof props.x === "number") {
						props.x += "px";
					}
					if (typeof props.y === "number") {
						props.y += "px";
					}

					if (!is3D) {
						// some code here
					}
				}
			}
			if (svg !== null) {
				if (is3D) {
					if (typeof props.z === "number") {
						props.z += "px";
					}
					if (typeof props.rotateX === "number") {
						props.rotateX += "deg";
					}
					if (typeof props.rotateY === "number") {
						props.rotateY += "deg";
					}
				}
			}
		}
		return props;
	}, {

		getAll : function () {

			return _tweens;

		},

		getBackup : function () {

			return _elements;

		},

		stop : function () {

			if (!_stoppedTick) {

				_cAF(_tick);

				_stoppedTick = true;

			}

		},

		start : function () {

			if (_stoppedTick) {

				tick.update();

				_stoppedTick = false;

			}

		},

		removeAll : function () {

			_tweens = [];

		},

		add : function (tween) {

			_tweens.push(tween);
			if (tween.element !== null) {
				_elements.push(tween);
			}

		},

		remove : function (tween) {

			var i = _tweens.indexOf(tween);

			if (i !== -1) {

				_tweens.splice(i, 1);

			}

		},

		update : function (time) {

			_tick = _rAF(tick.update);

			if (_tweens.length === 0)
				tick.stop();

			var i = 0,
			time = !visibility && time !== undefined ? time : now() - _getLastTime;
			while (i < _tweens.length) {
				if (_tweens[i].update(time)) {
					i++
				} else {
					_tweens.splice(i, 1);
				}
			}
			return true;
		}
	}, {
		parse : function (c) {
			if (typeof c === "string" && c.indexOf("#") !== -1) {
				var shr = c.substr(1).split(""),
				len = Math.floor(shr.length / 3),
				result = shr.length === 6 ? [parseInt(shr[0] + shr[1], 16), parseInt(shr[2] + shr[3], 16), parseInt(shr[4] + shr[5], 16)] : [parseInt(shr[0] + shr[0], 16), parseInt(shr[1] + shr[1], 16), parseInt(shr[2] + shr[2], 16)];
				return result === null ? 'rgba(0,0,0,0)' : 'rgb(' + result.join(",") + ')';
			}
		},
		process : function (string, isOnlyHex) {
			var splitString = string.replace(/, | ,| , /g, ",").split(" "),
			isHexMatch = splitString.match(/#/g),
			colorMatch = /rgba|rgb|ahsv|hsv|hsla|hsl|hsba|hsb/g,
			colorMatched = "rgb",
			temp = {},
			isColor,
			colorArr;
			splitString[isHexMatch] = color.parse(splitString[isHexMatch]);
			if (isOnlyHex) {
				return splitString.join(" ");
			}
			isColor = splitString.match(colorMatch);
			if (isColor !== -1 && !isOnlyHex) {
				colorArr = splitString[isColor];
				colorMatched = colorArr.match(colorMatch)[0];
				temp.color = colorArr.replace(colorMatch, "");
				temp.color = temp.color.replace(/\(|\)/g, "");
				temp.array = temp.color.split(",");
				temp.index = colorMatched === "ahsv" ? 0 : 3;
				temp.tmparr = [];
				if (colorMatched.length === 4) {
					temp.tmparr = temp.array[temp.index];
					temp.array.splice(temp.index, 1);
				}
				temp.array[0] = Math.floor(temp.array[0]);
				temp.array[1] = Math.floor(temp.array[1]);
				temp.array[2] = Math.floor(temp.array[2]);
				if (colorMatched.length === 4) {
					if (temp.index === 3)
						temp.array.push(temp.tmparr);
					if (temp.index === 0)
						temp.array = [temp.tmparr, temp.array[0], temp.array[1], temp.array[2]];
				}
				colorArr = colorMatched + "(" + temp.array.join(",") + ")";
				splitString[isColor] = colorArr;
			}
			return splitString.join(" ");
		}
	}, function pF(n) {
		n *= 1;
		return n;
	}, function join(arr) {
		var r = '',
		i = arr.length;
		while (i--) r = arr[i] + r;
		return r;
	}, function (a, b) {
		if (cre.test(a))
			a = color.process(a);
		if (cre.test(b))
			b = color.process(b);
		var string = [];
		var keys = [];
		var from = [];
		var to = [];
		var cursor = 0;
		var m;
		while (m = number.exec(b)) {
			if (m.index > cursor)
				string.push(b.slice(cursor, m.index))
				to.push(Number(m[0]))
				keys.push(string.length)
				string.push(null)
				cursor = number.lastIndex
		}
		if (cursor < b.length)
			string.push(b.slice(cursor));
		while (m = number.exec(a))
			from.push(Number(m[0]))

			return function frame(n) {
				var i = keys.length;
				while (i--)
					string[keys[i]] = from[i] + (to[i] - from[i]) * n;
				var r = join(string);
				return cre.test(r) ? color.process(r) : r;
			}
	}, function (start, end) {
		return function (value) {
			var all = {};
			for (var prop in end) {
				if (typeof end[prop] === "number") {
					all[prop] = start[prop] + (end[prop] - start[prop]) * value;
				} else if (typeof start[prop] === "string") {
					all[prop] = tween(start[prop], end[prop])(value);
				} else if (isArray(end[prop]) && isArray(start[prop])) {
					all[prop] = TweenIsArray(start[prop], end[prop])(value);
				} else if (typeof end[prop] === "object") {
					all[prop] = TweenIsObject(start[prop], end[prop])(value); // againly re-support for infinite object tween support
				} else {
					all[prop] = start[prop];
				}
				if (!processValue(all[prop]))
					delete all[prop];
			}
			return all;
		}
	}, function (start, end) {
		return function (value) {
			var all = [];
			for (var prop = 0, len = end.length; prop < len; prop++) {
				if (typeof end[prop] === "number") {
					all[prop] = start[prop] + (end[prop] - start[prop]) * value;
				} else if (typeof start[prop] === "string") {
					all[prop] = tween(start[prop], end[prop])(value);
				} else if (typeof end[prop] === "object" && !isArray(end[prop])) {
					all[prop] = TweenIsObject(start[prop], end[prop])(value);
				} else if (isArray(end[prop]) && isArray(start[prop])) {
					all[prop] = TweenIsArray(start[prop], end[prop])(value); // againly re-support for infinite array tween support
				} else {
					all[prop] = start[prop];
				}
				if (!processValue(all[prop]))
					all.splice(prop, 1);
			}
			return all;
		}
	}, function (from, to) {
		var origFrom = from;
		var origTo = to;
		var ret = {
			from : {},
			to : {}
		};
		for (var prop in from) {
			if (isArray(origFrom[prop]) && isArray(origTo[prop])) {
				ret.from[prop] = TweenIsArray(origFrom[prop], origTo[prop]);
			} else if (typeof origFrom[prop] === "object" && typeof origTo[prop] === "object" && !(isArray(origFrom[prop]) && isArray(origTo[prop]))) {
				ret.from[prop] = TweenIsObject(origFrom[prop], origTo[prop]);
			} else if (typeof origFrom[prop] === "string" && typeof origTo[prop] === "string") {
				ret.from[prop] = tween(origFrom[prop], origTo[prop]);
			} else {
				ret.from[prop] = origFrom[prop];
			}
		}

		for (var prop in to) {
			if (isArray(origFrom[prop]) && isArray(origTo[prop])) {
				ret.to[prop] = TweenIsArray(origFrom[prop], origTo[prop]);
			} else if (typeof origFrom[prop] === "object" && typeof origTo[prop] === "object" && !(isArray(origFrom[prop]) && isArray(origTo[prop]))) {
				ret.to[prop] = TweenIsObject(origFrom[prop], origTo[prop]);
			} else if (typeof origFrom[prop] === "string" && typeof origTo[prop] === "string") {
				ret.to[prop] = tween(origFrom[prop], origTo[prop]);
			} else {
				ret.to[prop] = origTo[prop];
			}
		}
		from = ret.from;
		to = ret.to;
		return ret;
	}, function (curr, full) {
		if ((processValue(curr) && typeof curr === "string" && curr.indexOf("px") !== -1) || (curr && full == undefined)) {
			return parseFloat(curr); // we return pixel value, if has pixel value, return just number of pixel without unit OR parent info not available
		}
		if (processValue(curr) && typeof curr === "number") {
			curr += "px";
		}
		if (processValue(full) && typeof full === "number") {
			full += "px";
		}
		var p = null, // we make this as null, because we use this as node later
		parent = document.body;
		p = document.createElement("div");
		/* make new temp div */
		p.id = 'convert-to-pixel-tmp';
		/* we give id to them for better compatiblity */
		p.style.visibility = "hidden";
		/* we change visibility to hidden to optimize timeline performance */
		p.style.position = "absolute";
		/* we change position to absolute to prevent DOM re-flow */
		p.style.overflow = "hidden";
		/* we hide scrolls/overflow */
		p.style.width = typeof full === "string" ? full : "0px";
		/* we change parent div width to get percent to pixel */
		p.appendChild(document.createElement("div"))/* then we append child element */
		p = p.firstChild;
		/* we re-use variable for child for better performance */
		p.style.visibility = "hidden";
		/* we change visibility to hidden to optimize timeline performance */
		p.style.position = "absolute";
		/* we change position to absolute to prevent DOM re-flow */
		p.style.overflow = "hidden";
		/* we hide scrolls/overflow */
		p.id = 'child';
		/* we give id to them for better compatiblity */
		p.style.width = curr;
		/* we change child width for get pixel size */
		parent.appendChild(p.parentNode);
		/* it's not uses highly power/cpu/gpu, because it's takes max 30fps, no lower */
		var widthCached = p.offsetWidth;
		if (widthCached === null || widthCached === undefined) widthCached = 0;
		parent.removeChild(p.parentNode);
		return widthCached;
		/* we use offsetWidth to highly accurate pixel size */
	}, function (path, v) {
		if (typeof v === "string") {
			v = v.split(" ");
		} else if (typeof v === 0 || v === true) {
			v = ['100%'];
		} else if (v === false) {
			v = ['0%'];
		} else if (typeof v === "number") {
			v = [number];
		} else {
			v = [];
		}
		var from = v[0],
		to = v[1],
		sp = v[2];
		if (sp === undefined) {
			sp = false;
		}
		if (to === undefined) {
			to = from;
			from = '0%';
		}
		var length = getLength(path),
		offsetA;

		from = toPixel(from, length);
		to = toPixel(to, length);
		if (sp) {
			sp = toPixel(sp, length);
		}
		offsetA = -from;
		to += offsetA;
		return {
			strokeDashoffset : offsetA,
			strokeDasharray : to + ', ' + (sp || length)
		}
	}, function (path) {
		if (window.SVGElement && path instanceof SVGElement) {
			var gcs = path.style;
			var offsetA = gcs.strokeDashoffset,
			to = gcs.strokeDasharray.replace(/none/g, '0%, 100%').split(", ");
			var sp = to[1];
			to = to[0].replace(/([A-Za-z]+)/g, '');
			offsetA = typeof offsetA === "string" ? offsetA.replace(/([A-Za-z]+)/g, '') : offsetA;
			var len = getLength(path);
			offsetA = parseFloat(toPixel(offsetA, len), 10);
			to = parseFloat(toPixel(to, len), 10);
			offsetA = -offsetA;
			to += offsetA;
			var fromPercent = Math.round(100 / (len / offsetA));
			var toPercent = Math.round(100 / (len / to));
			return fromPercent + "% " + toPercent + "% " + (processValue(sp) ? sp : "");
		}
	}, function (elem, type, limit) {
		elem = typeof elem === "string" ? document.querySelector(elem) : elem.length ? elem[0] : elem;
		var split = type === 'chars' ? "" : type === 'words' ? " " : type === 'p' ? "." : type === 'ts' ? ',' : type;
		this[type] = [];

		this.getText = function () {
			return elem.textContent.split(split);
		};
		this.toElem = function () {
			var t = this.getText(),
			arr = [];
			elem.innerHTML = '';
			for (var i = 0, len = t.length; i < len; i++) {
				var el = document.createElement('div');
				el.style.display = 'inline-block';
				el.innerHTML = t[i] === ' ' ? "&nbsp;" : t[i];
				el.setAttribute("class", "evryword " + type + " " + type + i);
				arr.push(el);
			}
			return arr;
		};
		this.addToElem = function () {
			var html = document.createDocumentFragment(),
			elemArr = this.toElem();
			for (var i = 0, len = elemArr.length; i < len; i++) {
				html.appendChild(elemArr[i]);
				this[type].push(elemArr[i]);
				html.appendChild(document.createTextNode(split));
			}
			elem.appendChild(html);
			return this;
		};
		this.init = function () {
			this.addToElem();
			return this[type];
		}
		return this.init();
	}, function (options) {
		if (window === this) {
			return new Sequence(options);
		}
		this.options = options || {};
		this.queue = [];
		this.queued = 0;
		this.tweens = [];
		this.labels = {};
		return this;
	}, function (element, props) {

		if (!element.nodeType || element === null)
			return false;
		var RETURN_OBJECT = {
			attr : {},
			data : {}

		},
		CURRENT_STYLE = (typeof getComputedStyle === "function") ? getComputedStyle(element, null) : element.currentStyle,
		CACHED_STYLE = cache(element),
		GET_DRAW = svgDrawGet(element),
		PARSE_STYLE = parseFromStyle(element, ['Transform', 'Filter']),
		ELEM_STYLE = element.style,
		PROPERTY;
		var _keys = isArray(props) ? props : Object.keys(props);

		for (var i = 0, len = _keys.length; i < len; i++) {

			PROPERTY = _keys[i];

			if (CURRENT_STYLE[PROPERTY] !== undefined) {

				RETURN_OBJECT[PROPERTY] = CURRENT_STYLE[PROPERTY];

			} else if (ELEM_STYLE[PROPERTY] !== undefined) {

				RETURN_OBJECT[PROPERTY] = ELEM_STYLE[PROPERTY];

			} else if (processValue(CACHED_STYLE[PROPERTY])) {

				RETURN_OBJECT[PROPERTY] = CACHED_STYLE[PROPERTY];

			} else if (PROPERTY === 'svgDraw' && typeof GET_DRAW === "string") {

				RETURN_OBJECT.svgDraw = GET_DRAW;

			}
			if (processValue(PARSE_STYLE[PROPERTY])) {

				RETURN_OBJECT[PROPERTY] = PARSE_STYLE[PROPERTY];

			}

			if (typeof props.attr === "object") {

				var subProp = props.attr;
				for (var prop in subProp) {
					RETURN_OBJECT.attr[prop] = element.getAttribute(prop);
				}

			}
			if (typeof props.data === "object") {

				var datas = props.data;
				for (var data in datas) {
					RETURN_OBJECT.data[data] = element.getAttribute("data-" + data);
				}

			}

		}

		return RETURN_OBJECT;

	}, function (element, object) {

		if (window === this) {
			return new Unim(element, object);
		}
		if (typeof element === "object" && element !== null && !element.nodeType && Object.keys(element).length > 1 && !element.nodeType) {
			object = element;
			element = null;
		}
		element = element === null ? null : (typeof(element) === "string") ? document.querySelector(element) : isArray(element) ? element[0] : element;

		var _object = object || {};
		var _valuesStart = {};
		var _valuesEnd = {};
		var _duration = 1000;
		var _repeat = 0;
		var _yoyo = false;
		var _isPlaying = false;
		var _reversed = false;
		var _delayTime = 0;
		var _startTime = null;
		var _easingFunction;
		var _defaultEasing = Easing.Linear;
		var _interpolationFunction = Interpolation.Linear;
		var _chainedTweens = [];
		var _onStartCallback;
		var _onBegin;
		var _onUpdateCallback = [];
		var _onCompleteCallback;
		var _onRepeatCallback;
		var _onYoyoCallback;
		var _onFinish;
		var _onStopCallback;
		var _paused = false;
		var _pauseStart = null;
		var _reverse = false;
		var _cachedDuration = _duration;
		var _repeatDelay = 0;
		var _valuesUnit = {};
		var _valuesRelative = {};
		var _willChange = "";
		var _this = this;
		var _enableCSS = false;
		var _isSVG = window.SVGElement && element instanceof SVGElement;
		var _isPaper = typeof paper !== "undefined";
		var _isAnimate = element !== null && element.tagName !== 'canvas';
		var _isSVGApply = (_isSVG && 'strokeDashoffset' in element.style) || !_isSVG;
		var _attr = _dataAttr = [];
		var _raphael = {};
		var _replaceCSS = false;
		var _requireGetStyle = false;
		var initialValue = {};
		var _isFilter = fil !== 'Filter';
		var _reverse = false;
		var _staticValues = {};
		var _transformOrigin = [_object.transformOrigin];
		var _statusTween = -1;
		var is3DTransform = is3D;
		var toCalled = false;
		if (_isSVG && !_isSVGNTA) {
			is3DTransform = false;
		}

		// Set all starting values present on the target object
		for (var field in object) {

			var v = object[field];

			if (isArray(v) || typeof v === "object") {

				_valuesStart[field] = v;

			}
			if (typeof v === "string" && (!/\d+/g.test(v) && !/#/g.test(v))) {

				_staticValues[field] = object[field];

				delete object[field];

			} else {
				_valuesStart[field] = object[field];
			}

			_willChange += /forceChange/g.test(field) ? "" : /scroll/g.test(field) ? "scroll-position" : field + ",";

		}

		_willChange = _willChange.substr(0, _willChange.length - 1);

		_this.element = element;

		_this.forceChange = function () {

			element.style.willChange = _willChange;
			return _this;

		};

		_this.attr = function () {
			if (_valuesStart.attr || _valuesEnd.attr) {
				_attr = Object.keys(_valuesStart.attr || _valuesEnd.attr);
			}
			return _this;
		};

		_this.RaphaelJS = function (obj) {
			_raphael = obj;
			return _this;
		};

		_this.data = function () {
			if (_valuesStart.data || _valuesEnd.data) {
				_dataAttr = Object.keys(_valuesStart.data || _valuesEnd.data);
			}
			return _this;
		};

		_this.parseFromTo = function () {

			var _k = Object.keys;
			_statusTween += _k(_object).length > 0 ? 1 : 0;
			_statusTween += _k(_valuesEnd).length > 0 ? 2 : 0;
			_requireGetStyle = !(_k(_valuesStart).length > 0 && _k(_valuesEnd).length > 0);

			if (_requireGetStyle && element !== null) {
				if (_k(_valuesStart).length === 0) {
					_valuesStart = getStyle(element, _valuesEnd);
				}
				if (_k(_valuesEnd).length === 0) {
					_valuesEnd = getStyle(element, object);
				}
			}

			_this.attr();
			_this.data();
			if (element !== null) {
				cache(element, _valuesEnd || {});
			}
			_valuesStart = generateTransform(element, _valuesStart, _valuesEnd, _transformOrigin, _statusTween);
			_valuesEnd = generateTransform(element, _valuesEnd, _valuesStart, _transformOrigin, _statusTween);
			return _this;

		};

		_this.to = function (properties, duration) {
			if (typeof properties === "number" && !duration) {
				duration = properties;
				properties = {}
			}
			if (processValue(duration)) {

				_duration = duration;

			}

			_valuesEnd = (processValue(properties) || properties) ? properties : {};
			_transformOrigin.push(_valuesEnd.transformOrigin);

			if (_valuesEnd && Object.keys(_valuesEnd).length > 0) {

				for (var field in _valuesEnd) {
					var v = _valuesEnd[field];
					if (field !== "morph" && typeof v === "string" && (!/\d+/g.test(v) && !/#/g.test(v))) {

						_staticValues[field] = _valuesEnd[field];

						delete _valuesEnd[field];

					}
				}

			}

			return _this;

		};

		_this.canvas = function (fn) {
			if (element === null)
				return _this;
			return _this.onUpdate(function (value) {
				fn.call(this, element.getContext('2d'), value);
			});
		};

		_this.forceHA = function () {

			/* under dev */
			return _this;

		};

		_this.setUnit = function (unit) {

			_valuesUnit = unit;

			return _this;

		};

		_this.timeScale = _this.makeFaster = function (scale) {

			_duration = _cachedDuration / parseFloat(scale);

			return _this;

		};

		_this.makeSlower = function (scale) {

			return _this.timeScale(1 / parseFloat(scale));

		};

		_this.repeatDelay = function (amount) {

			_repeatDelay = parseFloat(amount);

			return _this;

		};

		_this.seek = function (time) {

			_startTime = -parseFloat(time);

			return _this;
		};

		_this.pause = function () {

			if (_paused) {
				return _this;
			}

			// _isPlaying = false;
			_paused = true;
			_pauseStart = now();

			tick.remove(_this);

			return _this;
		};

		_this.play = _this.resume = function () {

			if (!_paused) {
				return _this;
			}

			// _isPlaying = true;
			_paused = false;
			_startTime += now() - _pauseStart;

			tick.add(_this);
			tick.start();

			return _this;
		};

		_this.restart = function () {

			if (tick.getAll().indexOf(_this) === -1) {

				_startTime += _duration;

				tick.add(_this);

			}
			tick.start();

			return _this;
		};

			var opt = {
				start : _valuesStart,
				element : element,
				end : _valuesEnd,
				dynamic : _object,
				units : _valuesUnit,
				relative : _valuesRelative,
				duration : _duration,
				easing : typeof _easingFunction === "object" ? _easingFunction : _defaultEasing
			};

		_this.start = function (time) {

			_this.parseFromTo();
			tick.add(_this);

			tick.start();

			_isPlaying = true;

			_startTime = !visibility && time !== undefined ? time : now() - _getLastTime;
			_startTime += _delayTime;

			_object = prefixize(_object);
			_valuesStart = prefixize(_valuesStart);
			_valuesEnd = prefixize(_valuesEnd);
			_valuesRelative = prefixize(_valuesRelative);

			for (var property in _object) {
				if (_customProperty[property]) {
					_object[property] = _customProperty[property](element, _object, _valuesEnd, opt);
				}
			}
			for (var property in _valuesStart) {
				if (_customProperty[property]) {
					_valuesStart[property] = _customProperty[property](element, _object, _valuesEnd, opt);
				}
			}
			for (var property in _valuesEnd) {
			if (_customProperty[property]) {
					_valuesEnd[property] = _customProperty[property](element, _object, _valuesEnd, opt);
				} else if (isArray(_valuesEnd[property]) && !isArray(_object[property])) {

					if (_valuesEnd[property].length === 0) {

						continue;

					}

					// create a local copy of the Array with the start value at the front
					_valuesEnd[property] = [_object[property]].concat(_valuesEnd[property]);

				}

				if (typeof _valuesEnd[property] === "string" && typeof _valuesStart[property] === "number") {
					var rv = _valuesEnd[property];
					rv = rv.replace(/\--|\++/g, '');
					_valuesRelative[property] = rv;
				}

				if (property === 'svgDraw' && typeof svgDraw === "function") {
					var svgDrawA = svgDraw(element, _object[property]);
					var svgDrawB = svgDraw(element, _valuesEnd[property]);
					for (var prop in svgDrawB) {
						_valuesStart[prop] = svgDrawA[prop];
						_valuesEnd[prop] = svgDrawB[prop];
						if (_easingFunction && _easingFunction[prop] === undefined && _easingFunction.svgDraw)
							_easingFunction[prop] = _easingFunction.svgDraw;
					}

					/* Improve performance by delete unneed properties for svgDraw method */
					delete _valuesStart.svgDraw;
					delete _valuesEnd.svgDraw;
					delete _object.svgDraw;
				}

			}
			if (typeof(Tweenable) === "function") {

				var T = Tweenable(_valuesStart, _valuesEnd);

				_valuesStart = T.from;

				_valuesEnd = T.to;

			}

			if (_onStartCallback) {

				_onStartCallback.call(_object);

			}

			if (_onBegin) {

				_onBegin.call(_object);

			}
			return _this;

		};

		_this.stop = function () {

			if (!_isPlaying) {
				return _this;
			}

			_this.seek(_duration).end();
			tick.remove(_this);
			_isPlaying = false;

			if (_onStopCallback) {

				_onStopCallback.call(_object);

			}

			_this.stopChainedTweens();
			return _this;

		};

		_this.stopChainedTweens = function () {

			for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {

				_chainedTweens[i].stop();

			}

		};

		_this.delay = function (amount) {

			_delayTime = parseFloat(amount);
			return _this;

		};

		_this.repeat = function (times) {

			_repeat = parseFloat(times);
			return _this;

		};

		_this.yoyo = function (yoyo) {

			_yoyo = yoyo === 'true' ? true : yoyo === 'false' ? false : yoyo;
			return _this;

		};

		_this.reverse = function (_reverse) {

			_reverse = _reverse === 'true' ? true : _reverse === 'false' ? false : _reverse;
			if (_reverse && _reversed) {
				_reversed = false;
			} else if (_reverse && !_reversed) {
				_reversed = true;
			}

			return _this;

		};

		_this.easing = function (easing) {

			if (typeof easing === "string" && easing.indexOf("{") !== -1) {
				easing = toObj(easing);
			}

			if (typeof easing === "string" && easing.indexOf("{") === -1 && easing in Easing) {

				_defaultEasing = Easing[easing];

			} else if (typeof easing === "object") {

				if (typeof _easingFunction !== "object")
					_easingFunction = {};
				for (var name in easing) {
					var fn = easing[name];
					if (typeof fn === "string" && fn in Easing) {
						_easingFunction[name] = Easing[fn];
					} else {
						_easingFunction[name] = fn;
					}
				}

			} else if (typeof easing === "function") {

				_defaultEasing = easing;

			}

			return _this;

		};

		_this.interpolation = function (fnc) {

			if (typeof fnc === "string" && fnc in Interpolation)
				fnc = Interpolation[fnc];
			_interpolationFunction = fnc;
			return _this;

		};

		_this.chain = function () {

			_chainedTweens = arguments;
			return _this;

		};

		_this.onStart = function (callback) {

			_onStartCallback = callback;
			return _this;

		};

		_this.onBegin = function (callback) {

			_onBegin = callback;
			return _this;

		};

		_this.onUpdate = function (callback) {

			_onUpdateCallback.push(callback);
			return _this;

		};

		_this.onComplete = function (callback) {

			_onCompleteCallback = callback;
			return _this;

		};

		_this.onRepeat = function (callback) {

			_onRepeatCallback = callback;
			return _this;

		};

		_this.onYoyo = function (callback) {

			_onYoyoCallback = callback;
			return _this;

		};

		_this.onFinish = function (callback) {

			_onFinish = callback;
			return _this;

		};

		_this.onStop = function (callback) {

			_onStopCallback = callback;
			return _this;

		};

		_this.fx = function (opt) {
			if (opt.update) {
				_this.onUpdate(function (value) {
					opt.update.call(_this, element, value);
				});
			}
			if (opt.start) {
				_this.onBegin(function () {
					opt.start.call(_this, element);
				});
			}
			if (opt.complete) {
				_this.onFinish(function () {
					opt.complete.call(_this, element);
				});
			}
			return _this;
		};

		_this.plugin = function (name, fn, opts, _replaceStyle) {

			if (processValue(_replaceStyle)) {
				_replaceCSS = _replaceStyle;
			}
			for (var p in opts) {
				opt[p] = opts[p];
			}
			_this[name] = fn.call(_this, opt);
			return _this;

		};

		// Performance optimization
		var defaultValue = ["scale", "opacity", "brightness", "saturate"];
		_this.update = function (time) {

			if (time < _startTime) {

				return true;

			}

			var timeCalc = time - _startTime;

			for (var property in _valuesEnd) {

				var elapsed = timeCalc / ((typeof _duration === "number") ? _duration : _duration[property]);
					elapsed = elapsed > 1 ? 1 : elapsed;
				var start = _valuesStart[property] || (defaultValue.indexOf(property) !== -1 ? 1 : 0);
				var end = _valuesEnd[property];
				var value = ((_easingFunction && _easingFunction[property]) || _defaultEasing)(_reversed ? 1 - elapsed : elapsed);
				var unit = _valuesUnit[property];
				if (isArray(end)) {

					_object[property] = _interpolationFunction(end, value);

				} else if (typeof end === "function") {

					_object[property] = end(value);

				} else {

					// Parses relative end values with start as base (e.g.: +10, -3)
					if (typeof(end) === "string") {
						var relativeType = end.charAt(0);
						if (relativeType === '+' || relativeType === '-') {
							end *= 1;
							end = start + end;
						} else if (relativeType === '*') {
							end = end.substr(1);
							end = start * end;
						} else if (relativeType === '/') {
							end = end.substr(1);
							end = start / end;
						}
					}

					// protect against non numeric properties.
					if (typeof(end) === "number") {
						_object[property] = start + (end - start) * value;
					}
				}

				if (unit)
					_object[property] += unit;

				if (_isAnimate) {
					if (property === 'scrollLeft' || property === 'scrollTop') {
						element[property] = _object[property];
					} else if (property === 'attr') {
						var attrs = _object.attr;
						for (var attr in attrs) {
							element.setAttribute(attr, attrs[attr]);
						}
					} else if (property === 'data') {
						var datas = _object.data;
						for (var data in datas) {
							element.setAttribute("data-" + data, datas[data]);
						}
					} else if (!_replaceCSS && filterEx.indexOf(property) === -1 && transformEx.indexOf(property) === -1) {
						element.style[property] = _object[property];
					} else if (_isFilter && filterEx.indexOf(property) !== -1) {
						var _filterString = '';
						if (_object.grayscale) {
							_filterString += 'grayscale(' + _object.grayscale + ')';
						}
						if (_object.brightness) {
							_filterString += 'brightness(' + _object.brightness + ')';
						}
						if (_object.sepia) {
							_filterString += 'sepia(' + _object.sepia + ')';
						}
						if (_object.invert) {
							_filterString += 'invert(' + _object.invert + ')';
						}
						if (_object.saturate) {
							_filterString += 'saturate(' + _object.saturate + ')';
						}
						if (_object.contrast) {
							_filterString += 'contrast(' + _object.contrast + ')';
						}
						if (_object.blur) {
							_filterString += 'blur(' + _object.blur + ')';
						}
						if (_object.hueRotate) {
							_filterString += 'hue-rotate(' + _object.hueRotate + ')';
						}
						if (_object.dropShadow) {
							_filterString += 'drop-shadow(' + _object.dropShadow + ')';
						}
						element.style[fil] = _filterString;
					} else if (transformEx.indexOf(property) !== -1) {
						var transform = '';
						if (is3DTransform) {
							if (_object.transformPerspective) {
								transform += ' perspective(' + _object.transformPerspective + ')';
							}
							if (_object.x || _object.y || _object.z) {
								transform += ' translate3d(' + (_object.x || "0px") + ', ' + (_object.y || "0px") + ', ' + (_object.z || "0px") + ')';
							}
							if (_object.scale || _object.scaleX || _object.scaleY || _object.scaleZ) {
								transform += ' scale3d(' + (_object.scaleX || _object.scale) + ', ' + (_object.scaleY || _object.scale) + ', ' + (_object.scaleZ || "1") + ')';
							}
							if (_object.rotate || _object.rotateZ) {
								transform += ' rotateZ(' + (_object.rotate || _object.rotateZ) + ')';
							}
							if (_object.rotateX) {
								transform += ' rotateX(' + _object.rotateX + ')';
							}
							if (_object.rotateY) {
								transform += ' rotateY(' + _object.rotateY + ')';
							}
							if (_object.translate3d) {
								transform += ' translate3d(' + (_object.translate3d) + ')';
							}
						} else {
							if (_object.x || _object.y) {
								transform += ' translate(' + (_object.x || "0px") + ', ' + (_object.y || "0px") + ')';
							}
							if (_object.scale || _object.scaleX || _object.scaleY) {
								transform += ' scale(' + (_object.scaleX || _object.scale) + ', ' + (_object.scaleY || _object.scale) + ')';
							}
							if (_object.rotate || _object.rotateZ) {
								transform += ' rotate(' + (_object.rotate || _object.rotateZ) + ')';
							}
							if (_object.translate) {
								transform += ' translate(' + (_object.translate) + ')';
							}
						}
						if (_object.matrix) {
							transform += ' matrix(' + _object.matrix + ')';
						}
						if (_object.matrix3d && is3D) {
							transform += ' matrix3d(' + _object.matrix3d + ')';
						}
						if (_object.skewX || _object.skewY || _object.skew) {
							transform += _object.skew ? ' skew(' + _object.skew + ')' : ' skew(' + (_object.skewX || "0deg") + ', ' + (_object.skewY || "0deg") + ')';
						}
						if (!_object[trans] && !_isIETransform) {
							element.style[trans] = transform;
						}
						if (_isSVG && !_isSVGNTA && transform !== "") {
							element.setAttribute("transform", transform.replace(/([0-9]+)([A-Za-z]+)/g, '$1').replace(/, /, ' '));
						}
					}
					if (_isIETransform)
						IETransform(element, _object);
				}

			}

			if (_onUpdateCallback.length > 0) {
				for (var i = 0, len = _onUpdateCallback.length; i < len; i++) {
					_onUpdateCallback[i].call(_object, element, value);
				}
			}

			if (elapsed === 1) {

				if (_repeat > 0) {

					if (_repeat !== Infinity) {
						_repeat--;
					}
					if (_onRepeatCallback) {
						_onRepeatCallback();
					}

					/* Don't parse _valuesRelative object, if yoyo not reversation for performance improvement */
					if (!_reversed) {
						for (var property in _valuesRelative) {
							var relativeType = _valuesRelative[property].charAt(0);
							if (relativeType === '+' || relativeType === '-') {
								_valuesStart[property] = _valuesStart[property] + parseFloat(_valuesRelative[property], 10);
							} else if (relativeType === '*') {
								_valuesStart[property] = _valuesStart[property] * parseFloat(_valuesRelative[property].substr(1), 10);
							} else if (relativeType === '/') {
								_valuesStart[property] = _valuesStart[property] / parseFloat(_valuesRelative[property].substr(1), 10);
							}
						}
					}

					if (_yoyo) {
						if (_onYoyoCallback) {
							_onYoyoCallback();
						}
						_reversed = !_reversed;
					}

					_startTime = _reversed ? time : time + _repeatDelay;

					return true;

				} else {

					if (_onCompleteCallback) {

						_onCompleteCallback.call(_object);

					}

					if (_onFinish) {

						_onFinish.call(_object);

					}

					for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {

						_chainedTweens[i].start(time);

					}

					return false;

				}

			}

			return true;

		};
		return _this;

	}, function (options, defaults) {
		var results = [];
		for (var k in defaults) {
			results.push(options[k] || (options[k] = defaults[k]));
		}
		return results;
	}, function (options, defaults) {
		for (var k in defaults) {
			if (options[k] === undefined) {
				options[k] = defaults[k];
			}
		}
		return options;
	});
	var p = Sequence.prototype;
	var lastSeqTime = 0;
	p.tween = function (el, f, t, d, s, options, queue) {
		last = now() - _getLastTime;
		options = options || {};
		d = d !== undefined ? d : 1000;
		lastSeqTime += d;
		options.delay = options.delay !== undefined ? options.delay : 0;
		queue = queue || true;
		var els = typeof el === "string" ? document.querySelectorAll(el) : el.length ? el : [el]; // re-make selector to improve performance
		var tweens = [];
		var totalDuration = 0;
		var _evDelay = 0;
		for (var o in this.options) {
			if (!options[o]) {
				options[o] = this.options[o];
			}
		}
		options.repeat = options.repeat || 0;
		for (var i = 0, len = els.length; i < len; i++) {
			var tween = Unim(els[i], f).to(t, d);
			for (var p in options) {
				tween[p](options[p]);
			}
			tweens.push({
				tween : tween,
				evDelay : i * s
			});
			_evDelay = i * s;
		}
		totalDuration = (d * options.repeat) + _evDelay + options.delay;
		this.queue.push({
			tweens : tweens,
			totalDuration : (queue && totalDuration !== Infinity) ? totalDuration : 0
		});
		this.queued++;
		return this;
	};
	p.from = function (el, f, d, s, options) {
		return this.tween(el, f, undefined, d, s, options);
	};
	p.to = function (el, t, d, s, options) {
		return this.tween(el, undefined, t, d, s, options);
	};
	p.fromTo = function (el, f, t, d, s, options) {
		return this.tween(el, f, t, d, s, options);
	};
	p.start = function (time) {
		var queue = this.queue;
		time = !visibility && time !== undefined ? time : now() - _getLastTime;
		for (var i = 0; i < this.queued; i++) {
			time += lastSeqTime * (i / 2);
			var q = queue[i].tweens;
			var startTime = (queue[i].totalDuration * i) + time;
			for (var tweenIndex = 0, length = q.length; tweenIndex < length; tweenIndex++) {
				var tween = q[tweenIndex],
				curr = tween.tween,
				evDelay = tween.evDelay;
				curr.start(evDelay + startTime);
				this.tweens.push(curr);
			}
		}
	};
	p.control = function (type, value) {
		var tweens = this.tweens;
		for (var i = 0, len = tweens.length; i < len; i++) {
			tweens[i][type](value);
		}
		return this;
	};
	var control = ['play', 'pause', 'timeScale', 'makeFaster', 'makeSlower', 'repeat', 'yoyo', 'delay', 'repeatDelay', 'easing', 'interpolation', 'restart', 'seek', 'stop'];
	control.forEach(function (name) {
		p[name] = function (value) {
			return this.control(name, value);
		}
	});

	Unim.defineProperty = function (property, run) {
		_customProperty[property] = run;
		return run;
	};
	Easing = extend(Easing, {
			ElasticOut : function (k) {
				return Easing.spring()(k);
			},
			ElasticIn : function (k) {
				return 1 - Easing.ElasticOut(1 - k);
			},
			ElasticInOut : function (k) {
				if (k < 0.5)
					return Easing.ElasticIn(k * 2) * 0.5;
				return Easing.ElasticOut(k * 2 - 1) * 0.5 + 0.5;
			},

			BackIn : function (k) {
				var s = 1.70158;
				return k * k * ((s + 1) * k - s);
			},

			BackOut : function (k) {
				var s = 1.70158;
				return --k * k * ((s + 1) * k + s) + 1;
			},

			BackInOut : function (k) {
				var s = 1.70158 * 1.525;
				if ((k *= 2) < 1)
					return 0.5 * (k * k * ((s + 1) * k - s));
				return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
			},
			SteppedEase : function (steps) {
				return function (k) {
					return Math.floor(k * steps) / steps;
				}
			},
			bezier : (function () {
				var Bezier,
				yForX;
				Bezier = function (t, p0, p1, p2, p3) {
					var a = Math.pow(1 - t, 3),
					b = 3 * Math.pow(1 - t, 2) * t,
					c = 3 * (1 - t) * Math.pow(t, 2),
					d = Math.pow(t, 3);
					var x = (a * p0.x) + (b * p1.x) + (c * p2.x) + d * p3.x;
					var y = (a * p0.y) + (b * p1.y) + (c * p2.y) + d * p3.y;
					return {
						x : x,
						y : y
					};
				};
				yForX = function (xTarget, Bs) {
					var B,
					aB,
					i = 0,
					l = 0,
					len = Bs.length,
					lower = 0,
					upper = 1,
					xTolerance = 0.0001,
					percent = (upper + lower) / 2,
					x;
					B = null;
					while (l < len) {
						aB = Bs[l];
						if (xTarget >= aB(0).x && xTarget <= aB(1).x) {
							B = aB;
						}
						if (B !== null) {
							break;
						}
						l++
					}
					if (!B) {
						return 1;
					}
					x = B(percent).x;
					while (Math.abs(xTarget - x) > xTolerance && i < 100) {
						if (xTarget > x) {
							lower = percent;
						} else {
							upper = percent;
						}
						percent = (upper + lower) / 2;
						x = B(percent).x;
						i++;
					}
					return B(percent).y;
				};
				return function (options) {
					if (options == null) {
						options = {};
					}
					var points = options.points,
					Bs = (function () {
						var fn1,
						i,
						k = 0,
						len = points.length;
						Bs = [];
						fn1 = function (pointA, pointB) {
							return Bs.push(function (t) {
								return Bezier(t, pointA, pointA.cp[pointA.cp.length - 1], pointB.cp[0], pointB);
							});
						};
						while (k < len) {
							if (k >= points.length - 1) {
								break;
							}
							fn1(points[k], points[k + 1]);
							k++;
						}
						return Bs;
					})();
					return function (t) {
						return yForX(t, Bs)
					};
				};
			})(),

			easeInOut : function (options) {
				var friction,
				ref;
				if (options == null) {
					options = {};
				}
				friction = (ref = options.friction) != null ? ref : arguments.callee.defaults.friction;
				return Easing.bezier({
					points : [{
							x : 0,
							y : 0,
							cp : [{
									x : 0.92 - (friction / 1000),
									y : 0
								}
							]
						}, {
							x : 1,
							y : 1,
							cp : [{
									x : 0.08 + (friction / 1000),
									y : 1
								}
							]
						}
					]
				});
			},

			easeIn : function (options) {
				var friction,
				ref;
				if (options == null) {
					options = {};
				}
				friction = (ref = options.friction) != null ? ref : arguments.callee.defaults.friction;
				return Easing.bezier({
					points : [{
							x : 0,
							y : 0,
							cp : [{
									x : 0.92 - (friction / 1000),
									y : 0
								}
							]
						}, {
							x : 1,
							y : 1,
							cp : [{
									x : 1,
									y : 1
								}
							]
						}
					]
				});
			},

			easeOut : function (options) {
				var friction,
				ref;
				if (options == null) {
					options = {};
				}
				friction = (ref = options.friction) != null ? ref : arguments.callee.defaults.friction;
				return Easing.bezier({
					points : [{
							x : 0,
							y : 0,
							cp : [{
									x : 0,
									y : 0
								}
							]
						}, {
							x : 1,
							y : 1,
							cp : [{
									x : 0.08 + (friction / 1000),
									y : 1
								}
							]
						}
					]
				});
			},

			spring : function (options) {
				var A1,
				A2,
				decal,
				frequency,
				friction,
				s;
				if (options == null) {
					options = {};
				}
				applyDefaults(options, arguments.callee.defaults);
				frequency = Math.max(1, options.frequency / 20);
				friction = Math.pow(20, options.friction / 100);
				s = options.anticipationSize / 1000;
				decal = Math.max(0, s);
				A1 = function (t) {
					var M,
					a,
					b,
					x0,
					x1;
					M = 0.8;
					x0 = s / (1 - s);
					x1 = 0;
					b = (x0 - (M * x1)) / (x0 - x1);
					a = (M - b) / x0;
					return (a * t * options.anticipationStrength / 100) + b;
				};
				A2 = function (t) {
					return Math.pow(friction / 10, -t) * (1 - t);
				};
				return function (t) {
					var A,
					At,
					a,
					angle,
					b,
					frictionT,
					y0,
					yS;
					frictionT = (t / (1 - s)) - (s / (1 - s));
					if (t < s) {
						yS = (s / (1 - s)) - (s / (1 - s));
						y0 = (0 / (1 - s)) - (s / (1 - s));
						b = Math.acos(1 / A1(yS));
						a = (Math.acos(1 / A1(y0)) - b) / (frequency * (-s));
						A = A1;
					} else {
						A = A2;
						b = 0;
						a = 1;
					}
					At = A(frictionT);
					angle = frequency * (t - s) * a + b;
					return 1 - (At * Math.cos(angle));
				};
			},

			bounce : function (options) {
				var A,
				fn,
				frequency,
				friction;
				if (options == null) {
					options = {};
				}
				applyDefaults(options, arguments.callee.defaults);
				frequency = Math.max(1, options.frequency / 20);
				friction = Math.pow(20, options.friction / 100);
				A = function (t) {
					return Math.pow(friction / 10, -t) * (1 - t);
				};
				fn = function (t) {
					var At,
					a,
					angle,
					b;
					b = -3.14 / 2;
					a = 1;
					At = A(t);
					angle = frequency * t * a + b;
					return At * Math.cos(angle);
				};
				fn.initialForce = true;
				return fn;
			},

			gravity : function (options) {
				var L,
				bounciness,
				curves,
				elasticity,
				fn,
				getPointInCurve,
				gravity;
				if (options == null) {
					options = {};
				}
				applyDefaults(options, arguments.callee.defaults);
				bounciness = Math.min(options.bounciness / 1250, 0.8);
				elasticity = options.elasticity / 1000;
				gravity = 100;
				curves = [];
				L = (function () {
					var b,
					curve;
					b = Math.sqrt(2 / gravity);
					curve = {
						a : -b,
						b : b,
						H : 1
					};
					if (options.initialForce) {
						curve.a = 0;
						curve.b = curve.b * 2;
					}
					while (curve.H > 0.001) {
						L = curve.b - curve.a;
						curve = {
							a : curve.b,
							b : curve.b + L * bounciness,
							H : curve.H * bounciness * bounciness
						};
					}
					return curve.b;
				})();
				getPointInCurve = function (a, b, H, t) {
					var c,
					t2;
					L = b - a;
					t2 = (2 / L) * t - 1 - (a * 2 / L);
					c = t2 * t2 * H - H + 1;
					if (options.initialForce) {
						c = 1 - c;
					}
					return c;
				};
				(function () {
					var L2,
					b,
					curve,
					results;
					b = Math.sqrt(2 / (gravity * L * L));
					curve = {
						a : -b,
						b : b,
						H : 1
					};
					if (options.initialForce) {
						curve.a = 0;
						curve.b = curve.b * 2;
					}
					curves.push(curve);
					L2 = L;
					results = [];
					while (curve.b < 1 && curve.H > 0.001) {
						L2 = curve.b - curve.a;
						curve = {
							a : curve.b,
							b : curve.b + L2 * bounciness,
							H : curve.H * elasticity
						};
						results.push(curves.push(curve));
					}
					return results;
				})();
				fn = function (t) {
					var curve,
					i,
					v;
					i = 0;
					curve = curves[i];
					while (!(t >= curve.a && t <= curve.b)) {
						i += 1;
						curve = curves[i];
						if (!curve) {
							break;
						}
					}
					if (!curve) {
						v = options.initialForce ? 0 : 1;
					} else {
						v = getPointInCurve(curve.a, curve.b, curve.H, t);
					}
					return v;
				};
				fn.initialForce = options.initialForce;
				return fn;
			},

			forceWithGravity : function (options) {
				if (options == null) {
					options = {};
				}
				applyDefaults(options, arguments.callee.defaults);
				options.initialForce = true;
				return Easing.gravity(options);
			},

			StrongIn : function () {
				return Easing.easeIn({
					friction : 250
				});
			},
			StrongOut : function () {
				return Easing.easeOut({
					friction : 250
				});
			},
			StrongInOut : function () {
				return Easing.easeInOut({
					friction : 250
				});
			},
			swing : function () {
				return Easing.QuadInOut();
			},
			BounceOut : function (k) {
				return Easing.gravity()(k);
			},
			BounceIn : function (k) {
				return 1 - Easing.BounceOut(1 - k);
			},
			BounceInOut : function (k) {
				if (k < 0.5)
					return Easing.BounceIn(k * 2) * 0.5;
				return Easing.BounceOut(k * 2 - 1) * 0.5 + 0.5;
			}

		});

	Easing.spring.defaults = {
		frequency : 300,
		friction : 200,
		anticipationSize : 0,
		anticipationStrength : 0
	};

	Easing.bounce.defaults = {
		frequency : 300,
		friction : 200
	};

	Easing.forceWithGravity.defaults = Easing.gravity.defaults = {
		bounciness : 400,
		elasticity : 200
	};

	Easing.easeInOut.defaults = Easing.easeIn.defaults = Easing.easeOut.defaults = {
		friction : 500
	};

	Unim.registerEasing = function _registerStandartEasing(name, treshold) {
		var friction = {
			friction : treshold
		};
		Easing[name + "In"] = function () {
			return Easing.easeIn(friction);
		};
		Easing[name + "Out"] = function () {
			return Easing.easeOut(friction);
		};
		Easing[name + "InOut"] = function () {
			return Easing.easeInOut(friction);
		};
		return Easing;
	}
	Unim.avoidEasingCurve = function _avoidEasingCurve(name) {
		Easing[name + "In"] = function () {
			return function (k) {
				return 1 - Easing[name + "Out"]()(1 - k);
			}
		}
		Easing[name + "InOut"] = function () {
			return function (k) {
				if (k < 0.5)
					return Easing[name + "In"]()(k * 2) * 0.5;
				return Easing[name + "Out"]()(k * 2 - 1) * 0.5 + 0.5;
			}
		}
	}

	Interpolation = {

		Linear : function (v, k) {

			var m = v.length - 1,
			f = m * k,
			i = Math.floor(f),
			fn = Interpolation.Utils.Linear;

			if (k < 0)
				return fn(v[0], v[1], f);
			if (k > 1)
				return fn(v[m], v[m - 1], m - f);

			return fn(v[i], v[i + 1 > m ? m : i + 1], f - i);

		},

		Bezier : function (v, k) {

			var b = 0,
			n = v.length - 1,
			pw = Math.pow,
			bn = Interpolation.Utils.Bernstein,
			i;

			for (i = 0; i <= n; i++) {
				b += pw(1 - k, n - i) * pw(k, i) * v[i] * bn(n, i);
			}

			return b;

		},

		CatmullRom : function (v, k) {

			var m = v.length - 1,
			f = m * k,
			i = Math.floor(f),
			fn = Interpolation.Utils.CatmullRom;

			if (v[0] === v[m]) {

				if (k < 0)
					i = Math.floor(f = m * (1 + k));

				return fn(v[(i - 1 + m) % m], v[i], v[(i + 1) % m], v[(i + 2) % m], f - i);

			} else {

				if (k < 0)
					return v[0] - (fn(v[0], v[0], v[1], v[1], -f) - v[0]);
				if (k > 1)
					return v[m] - (fn(v[m], v[m], v[m - 1], v[m - 1], f - m) - v[m]);

				return fn(v[i ? i - 1 : 0], v[i], v[m < i + 1 ? m : i + 1], v[m < i + 2 ? m : i + 2], f - i);

			}

		},

		Utils : {

			Linear : function (p0, p1, t) {

				return (p1 - p0) * t + p0;

			},

			Bernstein : function (n, i) {

				var fc = Interpolation.Utils.Factorial;
				return fc(n) / fc(i) / fc(n - i);

			},

			Factorial : (function () {

				var a = [1];

				return function (n) {

					var s = 1,
					i;
					if (a[n])
						return a[n];
					for (i = n; i > 1; i--)
						s *= i;
					return a[n] = s;

				};

			})(),

			CatmullRom : function (p0, p1, p2, p3, t) {

				var v0 = (p2 - p0) * 0.5,
				v1 = (p3 - p1) * 0.5,
				t2 = t * t,
				t3 = t * t2;
				return (2 * p1 - 2 * p2 + v0 + v1) * t3 + ( - 3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;

			}

		}

	};
	modular(['Easing', 'Interpolation'], Easing, Interpolation);
	return global;
}
	(global));
