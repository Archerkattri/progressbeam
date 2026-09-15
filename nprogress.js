/* NProgress, (c) 2013, 2014 Rico Sta. Cruz - https://ricostacruz.com/nprogress
 * @license MIT */

;(function(root, factory) {

  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.NProgress = factory();
  }

})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  var NProgress = {};
  var currentParent = null;
  var delayedStartPending = false;
  var eventHandlers = {};

  NProgress.version = '0.3.0-rc.0';

  var Settings = NProgress.settings = {
    minimum: 0.08,
    easing: 'linear',
    positionUsing: '',
    speed: 200,
    trickle: true,
    trickleSpeed: 200,
    maximum: 0.994,
    showBar: true,
    showSpinner: true,
    delay: 0,
    barSelector: '[data-nprogress="bar"], [role="bar"]',
    spinnerSelector: '[data-nprogress="spinner"], [role="spinner"]',
    barColor: null,
    spinnerColor: null,
    failureColor: null,
    indeterminate: false,
    rtl: false,
    ariaLabel: 'Loading',
    height: '2px',
    zIndex: 1031,
    parent: 'body',
    template: '<div class="bar" data-nprogress="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div class="peg"></div></div><div class="spinner" data-nprogress="spinner" aria-hidden="true"><div class="spinner-icon"></div></div>'
  };

  /**
   * Updates configuration.
   *
   *     NProgress.configure({
   *       minimum: 0.1
   *     });
   */
  NProgress.configure = function(options) {
    var key, value,
        wasRendered = typeof document !== 'undefined' && NProgress.isRendered(),
        previous = {
          showBar: Settings.showBar,
          showSpinner: Settings.showSpinner,
          parent: Settings.parent,
          template: Settings.template
        };

    options = options || {};
    for (key in options) {
      value = options[key];
      if (value !== undefined && Object.prototype.hasOwnProperty.call(options, key)) Settings[key] = value;
    }

    if (wasRendered) {
      var needsRerender = previous.showBar !== Settings.showBar ||
        previous.showSpinner !== Settings.showSpinner ||
        previous.parent !== Settings.parent ||
        previous.template !== Settings.template;

      if (needsRerender) {
        var status = NProgress.status;
        NProgress.remove();
        if (status !== null) NProgress.render();
      } else {
        updatePresentation(document.getElementById('nprogress'));
      }
    }

    return this;
  };

  /** Current progress value, or null when idle. */

  NProgress.status = null;
  NProgress.failed = false;

  /**
   * Subscribes to a lifecycle event.
   */

  NProgress.on = function(event, handler) {
    if (typeof handler !== 'function') return this;
    (eventHandlers[event] || (eventHandlers[event] = [])).push(handler);
    return this;
  };

  /**
   * Removes one handler, all handlers for an event, or all handlers.
   */

  NProgress.off = function(event, handler) {
    if (!event) {
      eventHandlers = {};
      return this;
    }
    if (!handler) {
      delete eventHandlers[event];
      return this;
    }
    var handlers = eventHandlers[event];
    if (handlers) {
      eventHandlers[event] = handlers.filter(function(item) { return item !== handler; });
    }
    return this;
  };

  /**
   * Sets the progress bar status, where `n` is a number from `0.0` to `1.0`.
   *
   *     NProgress.set(0.4);
   *     NProgress.set(1.0);
   */

  NProgress.set = function(n) {
    var started = NProgress.isStarted();

    if (delayedStartPending) {
      cancelTimers();
      delayedStartPending = false;
    }

    n = clamp(n, Settings.minimum, 1);
    NProgress.status = (n === 1 ? null : n);
    emit('progress', { progress: n, status: NProgress.status });

    var progress = NProgress.render(!started),
        bar      = progress.querySelector(Settings.barSelector),
        speed    = Settings.speed,
        ease     = Settings.easing;

    progress.offsetWidth; /* Force the transition to start from the new value. */

    if (Settings.indeterminate && bar) {
      progress.classList.add('nprogress-indeterminate');
      bar.removeAttribute('aria-valuenow');
    } else if (bar) {
      progress.classList.remove('nprogress-indeterminate');
      bar.setAttribute('aria-valuenow', Math.round(n * 100));
    }

    queue(function(next) {
      // Detect the best positioning strategy once the document is available.
      if (Settings.positionUsing === '') Settings.positionUsing = NProgress.getPositioningCSS();

      // Apply the transition to the active bar.
      if (bar) css(bar, barPositionCSS(n, speed, ease));

      if (n === 1) {
        // Fade out before removing the completed indicator.
        css(progress, {
          transition: 'none',
          opacity: 1
        });
        progress.offsetWidth; /* Force the initial opacity to be committed. */

        schedule(function() {
          css(progress, {
            transition: 'all ' + speed + 'ms linear',
            opacity: 0
          });
          schedule(function() {
            NProgress.remove();
            next();
          }, speed);
        }, speed);
      } else {
        schedule(next, speed);
      }
    });

    return this;
  };

  NProgress.isStarted = function() {
    return typeof NProgress.status === 'number';
  };

  /**
   * Shows the progress bar without reducing an existing value.
   *
   *     NProgress.start();
   *
   */
  NProgress.start = function() {
    if (!NProgress.status) {
      emit('start', { progress: NProgress.status, status: NProgress.status });
      if (Settings.delay > 0) {
        // Keep the operation active while delaying its first render.
        NProgress.status = Settings.minimum;
        delayedStartPending = true;
        schedule(function() {
          delayedStartPending = false;
          if (!NProgress.status || NProgress.isRendered()) return;
          NProgress.status = null;
          NProgress.set(0);
        }, Settings.delay);
      } else {
        NProgress.set(0);
      }
    }

    if (Settings.trickle && !NProgress.paused) {
      scheduleTrickleWork(Settings.delay > 0 ? Settings.delay : 0);
    }

    return this;
  };

  /**
   * Completes the current operation with a short finishing animation.
   *
   *     NProgress.done();
   *
   * If `true` is passed, it will render the progress bar when idle.
   *
   *     NProgress.done(true);
   */

  NProgress.done = function(force) {
    if (delayedStartPending && !force) {
      cancelTimers();
      cancelTrickleTimers();
      NProgress.status = null;
      return this;
    }
    if (delayedStartPending) {
      cancelTimers();
      delayedStartPending = false;
    }
    if (!force && !NProgress.status) return this;

    NProgress.failed = false;
    var result = NProgress.inc(0.3 + 0.5 * Math.random()).set(1);
    emit('done', { progress: 1, status: NProgress.status });
    return result;
  };

  /**
   * Increments by a realistic amount.
   */

  NProgress.inc = function(amount) {
    var n = NProgress.status;

    if (!n) {
      return NProgress.start();
    } else if(n > 1) {
      return;
    } else {
      if (typeof amount !== 'number') {
        if (n >= 0 && n < 0.2) { amount = 0.1; }
        else if (n >= 0.2 && n < 0.5) { amount = 0.04; }
        else if (n >= 0.5 && n < 0.8) { amount = 0.02; }
        else if (n >= 0.8 && n < 0.99) { amount = 0.005; }
        else { amount = 0; }
      }

      n = clamp(n + amount, 0, Settings.maximum);
      return NProgress.set(n);
    }
  };

  NProgress.trickle = function() {
    return NProgress.inc();
  };

  NProgress.paused = false;

  NProgress.pause = function() {
    var wasPaused = NProgress.paused;
    NProgress.paused = true;
    cancelTrickleTimers();
    if (!wasPaused) emit('pause', { progress: NProgress.status, status: NProgress.status });
    return this;
  };

  NProgress.resume = function() {
    var wasPaused = NProgress.paused;
    NProgress.paused = false;
    if (NProgress.isStarted() && Settings.trickle) {
      scheduleTrickleWork(0);
    }
    if (wasPaused) emit('resume', { progress: NProgress.status, status: NProgress.status });
    return this;
  };

  /**
   * Tracks a promise, thenable, or jQuery Deferred while it settles.
   *
   * @param promise Promise, thenable, or Deferred-like value
   */
  (function() {
    var initial = 0, current = 0;

    NProgress.promise = function(promise) {
      if (!promise) {
        return this;
      }

      var settle = typeof promise.always === 'function'
        ? function(callback) { promise.always(callback); }
        : typeof promise.then === 'function'
          ? function(callback) { promise.then(callback, callback); }
          : null;

      if (!settle) return this;

      if (current === 0) {
        NProgress.start();
      }

      initial++;
      current++;

      settle(function() {
        current--;
        if (current === 0) {
            initial = 0;
            NProgress.done();
        } else {
            NProgress.set((initial - current) / initial);
        }
      });

      return this;
    };

  })();

  /**
   * Renders the configured progress markup.
   */

  NProgress.render = function(fromStart) {
    if (NProgress.isRendered()) return document.getElementById('nprogress');

    addClass(document.documentElement, 'nprogress-busy');

    var progress = document.createElement('div');
    progress.id = 'nprogress';
    progress.innerHTML = Settings.template;



    var bar = progress.querySelector(Settings.barSelector),
        perc = fromStart ? (Settings.rtl ? '100' : '-100') : toBarPerc(NProgress.status || 0),
        parent = isDOM(Settings.parent)
          ? Settings.parent
          : document.querySelector(Settings.parent) || document.body,
        spinner

    if (bar) {
      css(bar, {
        transition: 'all 0 linear',
        transform: 'translate3d(' + perc + '%,0,0)'
      });
    }

    if (!Settings.showSpinner) {
      spinner = progress.querySelector(Settings.spinnerSelector);
      spinner && removeElement(spinner);
    }
    if (!Settings.showBar) {
      var visibleBar = progress.querySelector(Settings.barSelector);
      visibleBar && removeElement(visibleBar);
    }

    updatePresentation(progress);

    if (parent != document.body) {
      addClass(parent, 'nprogress-custom-parent');
    }

    parent.appendChild(progress);
    currentParent = parent;
    return progress;
  };

  /**
   * Removes the rendered indicator and cancels pending work.
   */

  NProgress.remove = function() {
    if (typeof document === 'undefined') return this;
    var wasRendered = NProgress.isRendered();
    var wasDelayedStartPending = delayedStartPending;
    cancelTimers();
    cancelTrickleTimers();
    queue.clear();
    delayedStartPending = false;
    if (wasDelayedStartPending) NProgress.status = null;
    removeClass(document.documentElement, 'nprogress-busy');
    var parent = currentParent || (isDOM(Settings.parent)
      ? Settings.parent
      : document.querySelector(Settings.parent) || document.body)
    removeClass(parent, 'nprogress-custom-parent')
    var progress = document.getElementById('nprogress');
    progress && removeElement(progress);
    currentParent = null;
    NProgress.failed = false;
    if (wasRendered) emit('remove', { progress: NProgress.status, status: NProgress.status });
    return this;
  };

  /**
   * Cancels the current progress operation without completing it.
   */

  NProgress.cancel = function() {
    NProgress.remove();
    NProgress.status = null;
    emit('cancel', { progress: null, status: null });
    return this;
  };

  /**
   * Marks the current operation as failed and keeps the indicator visible.
   */

  NProgress.fail = function(force) {
    if (!NProgress.status && !force) return this;
    if (!NProgress.status && force) NProgress.start();
    NProgress.failed = true;
    var progress = NProgress.render();
    updatePresentation(progress);
    emit('fail', { progress: NProgress.status, status: NProgress.status });
    return this;
  };

  /**
   * Returns whether the indicator is currently rendered.
   */

  NProgress.isRendered = function() {
    return typeof document !== 'undefined' && !!document.getElementById('nprogress');
  };

  /**
   * Determines which positioning CSS rule the document supports.
   */

  NProgress.getPositioningCSS = function() {
    // Inspect the document's supported style properties.
    var bodyStyle = document.body.style;

    // Check the vendor-prefixed variants used by older browsers.
    var vendorPrefix = ('WebkitTransform' in bodyStyle) ? 'Webkit' :
                       ('MozTransform' in bodyStyle) ? 'Moz' :
                       ('msTransform' in bodyStyle) ? 'ms' :
                       ('OTransform' in bodyStyle) ? 'O' : '';

    if (vendorPrefix + 'Perspective' in bodyStyle) {
      // Browsers with 3D transform support.
      return 'translate3d';
    } else if (vendorPrefix + 'Transform' in bodyStyle) {
      // Browsers with 2D transform support.
      return 'translate';
    } else {
      // Fallback for browsers without transform support.
      return 'margin';
    }
  };

  function isDOM (obj) {
    if (typeof HTMLElement === 'object') {
      return obj instanceof HTMLElement
    }
    return (
      obj &&
      typeof obj === 'object' &&
      obj.nodeType === 1 &&
      typeof obj.nodeName === 'string'
    )
  }

  function clamp(n, min, max) {
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  /** Converts progress (`0..1`) to a bar translation percentage. */

  function toBarPerc(n) {
    return (Settings.rtl ? 1 - n : -1 + n) * 100;
  }

  function emit(event, payload) {
    var handlers = eventHandlers[event];
    if (!handlers) return;
    handlers.slice().forEach(function(handler) {
      handler.call(NProgress, payload);
    });
  }

  function updatePresentation(progress) {
    var bar = progress && progress.querySelector(Settings.barSelector);
    if (!progress) return;

    if (Settings.indeterminate && bar) {
      progress.classList.add('nprogress-indeterminate');
      bar.removeAttribute('aria-valuenow');
    } else if (bar) {
      progress.classList.remove('nprogress-indeterminate');
      if (NProgress.isStarted()) {
        bar.setAttribute('aria-valuenow', Math.round(NProgress.status * 100));
      }
    }

    if (Settings.barColor) {
      progress.style.setProperty('--nprogress-bar-color', Settings.barColor);
    } else {
      progress.style.removeProperty('--nprogress-bar-color');
    }
    if (Settings.spinnerColor) {
      progress.style.setProperty('--nprogress-spinner-color', Settings.spinnerColor);
    } else {
      progress.style.removeProperty('--nprogress-spinner-color');
    }
    if (Settings.failureColor) {
      progress.style.setProperty('--nprogress-failure-color', Settings.failureColor);
    } else {
      progress.style.removeProperty('--nprogress-failure-color');
    }
    if (Settings.height) {
      progress.style.setProperty('--nprogress-height', Settings.height);
    } else {
      progress.style.removeProperty('--nprogress-height');
    }
    if (Settings.zIndex !== undefined && Settings.zIndex !== null) {
      progress.style.setProperty('--nprogress-z-index', Settings.zIndex);
    } else {
      progress.style.removeProperty('--nprogress-z-index');
    }
    if (bar && Settings.ariaLabel) {
      bar.setAttribute('aria-label', Settings.ariaLabel);
    } else if (bar) {
      bar.removeAttribute('aria-label');
    }
    if (Settings.rtl) {
      addClass(progress, 'nprogress-rtl');
    } else {
      removeClass(progress, 'nprogress-rtl');
    }
    if (NProgress.failed) {
      addClass(progress, 'nprogress-failed');
    } else {
      removeClass(progress, 'nprogress-failed');
    }

    if (!Settings.showSpinner) {
      var spinner = progress.querySelector(Settings.spinnerSelector);
      spinner && removeElement(spinner);
    }
    if (!Settings.showBar) {
      var visibleBar = progress.querySelector(Settings.barSelector);
      visibleBar && removeElement(visibleBar);
    }
  }


  /** Builds the CSS transition for a progress value. */

  function barPositionCSS(n, speed, ease) {
    var barCSS;

    if (Settings.positionUsing === 'translate3d') {
      barCSS = { transform: 'translate3d('+toBarPerc(n)+'%,0,0)' };
    } else if (Settings.positionUsing === 'translate') {
      barCSS = { transform: 'translate('+toBarPerc(n)+'%,0)' };
    } else {
      barCSS = { 'margin-left': toBarPerc(n)+'%' };
    }

    barCSS.transition = 'all '+speed+'ms '+ease;

    return barCSS;
  }

  /** Serializes progress transitions. */

  var queue = (function() {
    var pending = [];

    function next() {
      var fn = pending.shift();
      if (fn) {
        fn(next);
      }
    }

    function enqueue(fn) {
      pending.push(fn);
      if (pending.length == 1) next();
    }

    enqueue.clear = function() {
      pending.length = 0;
    };

    return enqueue;
  })();

  /* Timers are grouped so removing the indicator cancels all pending work. */

  var timers = [];
  var trickleTimers = [];
  var trickleLoopActive = false;

  function schedule(fn, delay, timerGroup) {
    timerGroup = timerGroup || timers;
    var timer = setTimeout(function() {
      var index = timerGroup.indexOf(timer);
      if (index !== -1) timerGroup.splice(index, 1);
      fn();
    }, delay);
    timerGroup.push(timer);
    return timer;
  }

  function cancelTimers() {
    while (timers.length) clearTimeout(timers.pop());
  }

  function scheduleTrickle(fn, delay) {
    return schedule(fn, delay, trickleTimers);
  }

  function cancelTrickleTimers() {
    while (trickleTimers.length) clearTimeout(trickleTimers.pop());
    trickleLoopActive = false;
  }

  function scheduleTrickleWork(delay) {
    if (trickleLoopActive) return;
    trickleLoopActive = true;
    scheduleTrickle(function() {
      if (!NProgress.status || NProgress.paused) {
        trickleLoopActive = false;
        return;
      }
      NProgress.trickle();
      trickleLoopActive = false;
      scheduleTrickleWork(Settings.trickleSpeed);
    }, delay);
  }

  /* Applies inline styles and resolves vendor-prefixed property names. */

  var css = (function() {
    var cssPrefixes = [ 'Webkit', 'O', 'Moz', 'ms' ],
        cssProps    = {};

    function camelCase(string) {
      return string.replace(/^-ms-/, 'ms-').replace(/-([\da-z])/gi, function(match, letter) {
        return letter.toUpperCase();
      });
    }

    function getVendorProp(name) {
      var style = document.body.style;
      if (name in style) return name;

      var i = cssPrefixes.length,
          capName = name.charAt(0).toUpperCase() + name.slice(1),
          vendorName;
      while (i--) {
        vendorName = cssPrefixes[i] + capName;
        if (vendorName in style) return vendorName;
      }

      return name;
    }

    function getStyleProp(name) {
      name = camelCase(name);
      return cssProps[name] || (cssProps[name] = getVendorProp(name));
    }

    function applyCss(element, prop, value) {
      prop = getStyleProp(prop);
      element.style[prop] = value;
    }

    return function(element, properties) {
      var args = arguments,
          prop,
          value;

      if (args.length == 2) {
        for (prop in properties) {
          value = properties[prop];
          if (value !== undefined && Object.prototype.hasOwnProperty.call(properties, prop)) applyCss(element, prop, value);
        }
      } else {
        applyCss(element, args[1], args[2]);
      }
    }
  })();

  /** Tests whether an element contains a class name. */

  function hasClass(element, name) {
    var list = typeof element == 'string' ? element : classList(element);
    return list.indexOf(' ' + name + ' ') >= 0;
  }

  /** Adds a class without duplicating it. */

  function addClass(element, name) {
    var oldList = classList(element),
        newList = oldList + name;

    if (hasClass(oldList, name)) return;

    // Remove the leading separator added by classList().
    element.className = newList.substring(1);
  }

  /** Removes a class when present. */

  function removeClass(element, name) {
    var oldList = classList(element),
        newList;

    if (!hasClass(element, name)) return;

    // Replace the matching class name.
    newList = oldList.replace(' ' + name + ' ', ' ');

    // Remove the separators added by classList().
    element.className = newList.substring(1, newList.length - 1);
  }

  /** Returns a padded class list for exact class-name matching. */

  function classList(element) {
    return (' ' + (element && element.className || '') + ' ').replace(/\s+/gi, ' ');
  }

  /** Removes an element when it has a parent. */

  function removeElement(element) {
    element && element.parentNode && element.parentNode.removeChild(element);
  }

  return NProgress;
});
