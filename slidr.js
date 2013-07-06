//
// Copyright 2013. All Rights Reserved.
// Author: Brian Chan
// Contact: bchanx@gmail.com
//

/**
 * slidr - A simple Javascript library for adding slide effects. Currently under development.
 */

var SlidrException = SlidrException || function(message) {
  this.message = message;
};

var Slidr = Slidr || function() {
  /**
   * A {mapping} of slides to their neighbors.
   */
  var _slidr = {};

  /**
   * A {mapping} of slides and their transition effects.
   */
  var _transitions = {};

  /**
   * The slide to start at.
   */
  var _start = null;

  /**
   * The current slide.
   */
  var _current = null;

  /**
   * Defines our available css transitions.
   */
  var _css = {
    'cube': {
      'init': _extend([
        _cssPrefixer('backface-visibility', 'hidden', ['webkit', 'moz']),
        _cssPrefixer('transform-style', 'preserve-3d', ['webkit', 'moz'])
      ]),
      'reset': {
        'transitions': _cssPrefixer('transition', 'transform 1s cubic-bezier(0.15, 0.9, 0.25, 1) 0s,' +
            ' opacity 1s cubic-bezier(0.15, 0.9, 0.25, 1) 0s', ['webkit', 'moz', 'o']
        ),
        'left': function(width) { return _cssTransform("rotateY(-90deg) translateZ(" + width/2 + "px)"); },
        'right': function(width) { return _cssTransform("rotateY(90deg) translateZ(" + width/2 + "px)"); },
        'up': function(height) { return _cssTransform("rotateX(90deg) translateZ(" + height/2 + "px)"); },
        'down': function(height) { return _cssTransform("rotateX(-90deg) translateZ(" + height/2 + "px)"); },
      },
      'transition': {
        'in': {
          'left': function(width) { return _cssTransform("rotateY(0deg) translateZ(" + width/2 + "px)"); },
          'right': function(width) { return _cssTransform("rotateY(0deg) translateZ(" + width/2 + "px)"); },
          'up': function(height) { return _cssTransform("rotateX(0deg) translateZ(" + height/2 + "px)"); },
          'down': function(height) { return _cssTransform("rotateX(0deg) translateZ(" + height/2 + "px)"); },
        },
        'out': {
          'left': function(width) { return _cssTransform("rotateY(90deg) translateZ(" + width/2 + "px)"); },
          'right': function(width) { return _cssTransform("rotateY(-90deg) translateZ(" + width/2 + "px)"); },
          'up': function(height) { return _cssTransform("rotateX(-90deg) translateZ(" + height/2 + "px)"); },
          'down': function(height) { return _cssTransform("rotateX(90deg) translateZ(" + height/2 + "px)"); },
        }
      }
    },
    'linear': {
      'init': null,
      'reset': {
        'transitions': _cssPrefixer('transition', 'transform 0.6s ease-out 0s,' +
          ' opacity 0.6s ease-out 0s', ['webkit', 'moz', 'o']
        ),
        'left': function(width) { return _cssTransform("translateX(-" + width + "px)"); },
        'right': function(width) { return _cssTransform("translateX(" + width + "px)"); },
        'up': function(height) { return _cssTransform("translateY(-" + height + "px)"); },
        'down': function(height) { return _cssTransform("translateY(" + height + "px)"); },
      },
      'transition': {
        'in': {
          'left': function(width) { return _cssTransform("translateX(0px)"); },
          'right': function(width) { return _cssTransform("translateX(0px)"); },
          'up': function(height) { return _cssTransform("translateY(0px)"); },
          'down': function(height) { return _cssTransform("translateY(0px)"); },
        },
        'out': {
          'left': function(width) { return _cssTransform("translateX(" + width + "px)"); },
          'right': function(width) { return _cssTransform("translateX(-" + width + "px)"); },
          'up': function(height) { return _cssTransform("translateY(" + height + "px)"); },
          'down': function(height) { return _cssTransform("translateY(-" + height + "px)"); },
        }
      }
    }
  };

  /**
   * Append css browser prefixes to properties.
   * @param {string} property CSS property name.
   * @param {string || Array} values CSS property value(s) to apply.
   * @param {Array} prefixes [list] of browser prefixes to append.
   * @return {Object} map of css {property:value}.
   */
  function _cssPrefixer(property, values, prefixes) {
    var css = {};
    if (!!property && !!values) {
      values = (_isString(values)) ? values.split(', ') : values;
      if (_isArray(values)) {
        css[property] = values.join(', ');
        if (_isArray(prefixes) && prefixes.length) {
          var hasTransform = -1;
          for (var i = 0; i < values.length; i++) {
            if (values[i].indexOf('transform') == 0) {
              hasTransform = i;
              break;
            }
          }
          for (var i = 0; i < prefixes.length; i++) {
            var prefix = '-' + prefixes[i] + '-';
            var original = null;
            if (hasTransform >= 0) {
              original = values[hasTransform];
              values[hasTransform] = prefix + original;
            }
            css[prefix + property] = values.join(', ');
            if (hasTransform >= 0 && original) {
              values[hasTransform] = original;
            }
          }
        }
      }
    }
    return css;
  }

  /**
   * Helper for applying CSS transform rules.
   */
  function _cssTransform(rules) {
    return {
      '-webkit-transform': rules,
      '-moz-transform': rules,
      '-o-transform': rules,
      'transform': rules,
    }
  }

  /**
   * CSS rules to apply to all slides in our Slidr when we initialize.
   */
  function _cssInit(element, transition) {
    var css = _lookup(_css, [transition, 'init']) || {};
    if (element && $(element).length && css) {
      var display = $(element).css('display');
      var extra = {
        'display': (display === 'none') ? 'block' : display,
        'opacity': '0',
        'position': 'absolute',
        'left': '50%',
        'margin-left': '-' + $(element).width()/2 + 'px',
        'pointer-events': 'none'
      };
      $(element).css(_extend(extra, css));
      return true;
    }
    return false;
  }

  /**
   * CSS rules pre-apply to an `element`, coming [in|out] as `type` from `dir`, with `transition` effects. 
   */
  function _cssReset(element, transition, type, dir) {
    if (element && $(element).length) {
      // Reset transitions
      var css = _lookup(_css, [transition, 'reset', 'transitions']) || {};
      if (type === 'in') {
        // Slide coming in, reset location as well.
        var movement = _lookup(_css, [transition, 'reset', dir]);
        movement = (dir === 'up' || dir === 'down') ? movement($(element).height()) : movement($(element).width());
        _extend(movement, css);
        $(element).css(css).hide();
      } else {
        $(element).css(css);
      }
      return true;
    }
    return false;
  }

  /**
   * CSS rules to apply to an `element`, coming [in|out] as `type`, from the `dir` direction with `transition` effects.
   */
  function _cssTransition(element, transition, type, dir) {
    var css = _lookup(_css, [transition, 'transition', type, dir]);
    if (element && $(element).length && css) {
      css = (dir === 'up' || dir === 'down') ? css($(element).height()) : css($(element).width());
      var extra = {
        'opacity': (type === 'in') ? '1': '0',
        'pointer-events': (type === 'in') ? 'auto': 'none'
      };
      // Show the slide again after hiding.
      $(element).css(_extend(extra, css)).show();
      return true;
    }
    return false;
  }

  /**
   * Traverse [keys] in {object} to lookup a value, or null if nothing found.
   */
  function _lookup(obj, keys) {
    var result = null;
    if (!!obj && obj.constructor === Object && !!keys && keys.constructor === Array) {
      result = obj;
      for (var k in keys) {
        if (!result.hasOwnProperty(keys[k])) {
          return null;
        }
        result = result[keys[k]];
      }
    }
    return result;
  }

  /**
   * Check if object is a string.
   */
  function _isString(obj) {
    return (!!obj) && (typeof obj === 'string');
  }

  /**
   * Check if object is an [Array].
   */
  function _isArray(obj) {
    return (!!obj) && (obj.constructor === Array);
  }

  /**
   * Check if object is an {Object}.
   */
  function _isObject(obj) {
    return (!!obj) && (obj.constructor === Object);
  }

  /**
   * Add all key:values found in [{from}, ..] to {to}, in place. Overwrites existing keys by default.
   */
  function _extend(from, to, opt_noOverwrite) {
    to = (_isObject(to)) ? to : {};
    if (_isObject(from)) {
      from = [from];
    }
    if (_isArray(from)) {
      var values;
      for (var i = 0; values = from[i]; i++) {
        for (var v in values) {
          if (to.hasOwnProperty(v) && !!opt_noOverwrite) {
            continue;
          }
          to[v] = values[v];
        }
      }
    }
    return to;
  }

  /**
   * Get the next transition for `element` entering/leaving the viewport from `dir` direction.
   */
  function _getTransition(element, dir) {
    var direction = (dir === 'up' || dir === 'down') ? 'vertical' : 'horizontal';
    return _lookup(_transitions, [element, direction]);
  }

  /**
   * Set the `transition` for an `element` going in the `dir` movement.
   */
  function _setTransition(element, transition, dir) {
    transition = (!transition || self.transitions.indexOf(transition) < 0) ? 'cube' : transition;
    if (!_transitions[element]) {
      _transitions[element] = {};
    }
    _transitions[element][dir] = transition;
    return transition;
  }

  /**
   * Applies the out transition to an `element` being displaced by a slide coming from the `dir` direction.
   */
  function _transitionOut(element, dir) {
    if (element && $(element).length && dir) {
      var transition = _getTransition(element, dir);
      if (transition) {
        // Apply css reset to the current element.
        if (_cssReset(element, transition, 'out', dir)) {
          // Now apply the css transition triggers.
          return _cssTransition(element, transition, 'out', dir);
        }
      }
    }
    return false;
  }

  /**
   * Applies the in transition to an `element` entering the Slidr viewport, from the `dir` direction.
   */
  function _transitionIn(element, dir) {
    if (element && $(element).length && dir) {
      var transition = _getTransition(element, dir);
      if (transition) {
        // Apply css reset to the current element.
        if (_cssReset(element, transition, 'in', dir)) {
          // Now apply the css transition triggers.
          return _cssTransition(element, transition, 'in', dir);
        }
      }
    }
    return false;
  }

  /**
   * Transition to the next slide in the `dir` direction.
   */
  function _slide(dir) {
    var next = _lookup(_slidr, [_current, dir]);
    if (_current && next) {
      $(_current).stop();
      var overflow = (dir === 'left' || dir === 'right') ? 'hidden' : 'auto';
      $('#slidr').css('overflow', overflow);
      _transitionOut(_current, dir);
      _current = next;
      _transitionIn(_current, dir);
      return true;
    }
    return false;
  }

  /**
   * Watch for height changes in the slides, propagate the change to the slidr container.
   */
  function _watchHeightChange() {
    var height = null;
    var timerId = setInterval((function watchHeight() {
      if (!$('#slidr').length) {
        clearInterval(timerId);
        return;
      } else if ($('#slidr').css('visibility') === 'hidden') {
        height = _setHeight(0);
      } else if (_current && $(_current).length && height != $(_current).height()) {
        height = _setHeight($(_current).height());
      }
      return watchHeight;
    })(), 250);
  }

  /**
   * Sets the height of our Slidr container in order to fully contain the slides.
   */
  function _setHeight(height) {
    if ($('#slidr').length) {
      var padding = parseInt($('#slidr').css('padding-top').slice(0, -2)) +
        parseInt($('#slidr').css('padding-bottom').slice(0, -2));
      $('#slidr').css('height', height + padding + 'px');
      return height;
    }
    return null;
  }

  /**
   * Keyboard bindings for navigating Slidr.
   */
  function _dynamicBindings() {
    $(document).keydown(function(e) {
      if (e.which === 40) {
        // Down arrow
        self.down();
      } else if (e.which === 39) {
        // Right arrow
        self.right();
      } else if (e.which === 38) {
        // Up arrow
        self.up();
      } else if (e.which === 37) {
        // Left arrow
        self.left();
      }
    });
  }

  /**
   * Who am I?
   */
  var self = this;

  /**
    * Adds a set of slides to our Slidr.
    * `slides` - expects an object with a `horizontal` and/or a `vertical` field, which contains [lists] of DOM elements
    * we wish to transform into slides.
    *
    * `opt_transition` - defines what transition to use for navigating the given set of slides. Slidr will use a
    * default transition if nothing is given.
    *
    * `opt_warn` - by default, Slidr does a best-effort to compile the slides according to the given specifications.
    * We silently abort adding the rest of a row if we end up redefining the same transition to two different slides.
    * Use this flag if you want it to throw an exception instead (useful during development).
    *
    * e.g. `slides`:
    * { 
    *   'horizontal': [
    *     ['#one', '#two', '#three', '#four'],
    *   ],
    *   'vertical': [
    *     ['#five', '#two', '#six'],
    *     ['#seven', '#four', '#eight'],
    *   ]
    * }
    */
  self.add = function(slides, opt_transition, opt_warn) {
    if (slides.horizontal) {
      for (var i = 0; i < slides.horizontal.length; i++) {
        self.addHorizontal(slides.horizontal[i], opt_transition, opt_warn);
      }
    }
    if (slides.vertical) {
      for (var i = 0; i < slides.vertical.length; i++) {
        self.addVertical(slides.vertical[i], opt_transition, opt_warn);
      }
    }
  };
  
  /**
   * Adds a [list] of slides we want to navigate in the left/right direction.
   */
  self.addHorizontal = function(slides, opt_transition, opt_warn) {
    var current;
    // For each slide, add it to our mapping.
    for (var i = 0; current = slides[i]; i++) {
      var newLeft = slides[i-1] || null;
      var newRight = slides[i+1] || null;
      if (_slidr[current]) {
        var existingLeft = _slidr[current].left;
        var existingRight = _slidr[current].right;
        var previousLeft = _lookup(_slidr, [newRight, 'left']);
        // Are we about to override an existing mapping?
        if ((existingRight && newRight && existingRight != newRight)
          || (existingLeft && newLeft && existingLeft != newLeft)
          || (previousLeft && previousLeft != current)
        ) {
          if (opt_warn) {
            throw new SlidrException("[Slidr] Horizontal add error.");
          }
          return false;
        }
      } else {
        _slidr[current] = {};
      }
      if (_cssInit(current, _setTransition(current, opt_transition, 'horizontal'))) {
        if (!_start) {
          _start = current;
        }
        if (newLeft) {
          _slidr[current].left = newLeft;
        }
        if (newRight) {
          _slidr[current].right = newRight;
        }
      }
    }
    return true;
  };

  /**
   * Adds a [list] of slides that we want to navigate in the up/down direction.
   */
  self.addVertical = function(slides, opt_transition, opt_warn) {
    var current;
    // For each slide, add it to our slidr mapping.
    for (var i = 0; current = slides[i]; i++) {
      var newUp = slides[i-1] || null;
      var newDown = slides[i+1] || null;
      if (_slidr[current]) {
        var existingUp = _slidr[current].up;
        var existingDown = _slidr[current].down;
        var previousUp = _lookup(_slidr, [newDown, 'up']);
        // Are we about to override an existing mapping?
        if ((existingUp && newUp && existingUp != newUp)
          || (existingDown && newDown && existingDeft != newDown)
          || (previousUp && previousUp != current)
        ) {
          if (opt_warn) {
            throw new SlidrException("[Slidr] Vertical add error.");
          }
          return false;
        }
      } else {
        _slidr[current] = {};
      }
      if (_cssInit(current, _setTransition(current, opt_transition, 'vertical'))) {
        if (!_start) {
          _start = current;
        }
        if (newUp) {       
          _slidr[current].up = newUp;
        }
        if (newDown) {
          _slidr[current].down = newDown;
        }
      }
    }
    return true;
  };

  /**
   * [List] of available slide transitions.
   */
  self.transitions = ['cube', 'linear'];

  /**
   * Slide up.
   */
  self.up = function() {
    return _slide('up');
  };

  /**
   * Slide down.
   */
  self.down = function() {
    return _slide('down');
  };

  /**
   * Slide left.
   */
  self.left = function() {
    return _slide('left');
  };

  /**
   * Slide right.
   */
  self.right = function() {
    return _slide('right');
  };

  /**
   * Start the Slidr!
   * Defaults to showing the first slide added. Specify a slide to begin with using `opt_start`.
   */
  self.init = function(opt_start) {
    if (!!opt_start && !!_slidr[opt_start]) {
      _start = opt_start;
    }
    if ($('#slidr').length && _start && $(_start).length) {
      $('#slidr').css({
        'position': 'relative',
        'width': '100%',
        'display': 'table',
        '-webkit-box-sizing': 'border-box',
        '-moz-box-sizing': 'border-box',
        'box-sizing': 'border-box',
      });
      _current = _start;
      // Hide/show to force a redraw.
      $(_current).hide().css({'pointer-events': 'auto', 'opacity': '1'}).fadeIn(500);
      _watchHeightChange();
      _dynamicBindings();
    }
  };
};

$(function() {
  if ($('#slidr').length) {
    $('#slidr').css('display', 'none');
  }
});

