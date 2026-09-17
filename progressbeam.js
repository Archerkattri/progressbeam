/* ProgressBeam, derived from NProgress by Rico Sta. Cruz - https://ricostacruz.com/nprogress
 * @license MIT */

;(function(root, factory) {

  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.ProgressBeam = factory();
  }

})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  var ProgressBeam = {};
  var currentParent = null;
  var delayedStartPending = false;
  var eventHandlers = {};

  ProgressBeam.version = '1.0.2';

  var Settings = ProgressBeam.settings = {
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
    barSelector: '[data-progressbeam="bar"], [role="bar"]',
    spinnerSelector: '[data-progressbeam="spinner"], [role="spinner"]',
    barColor: null,
    spinnerColor: null,
    failureColor: null,
    indeterminate: false,
    rtl: false,
    position: 'top',
    spinnerPosition: 'top-right',
    ariaLabel: 'Loading',
    height: '2px',
    zIndex: 1031,
    parent: 'body',
    template: '<div class="bar" data-progressbeam="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div class="peg"></div></div><div class="spinner" data-progressbeam="spinner" aria-hidden="true"><div class="spinner-icon"></div></div>'
  };

  var Defaults = {};
  for (var defaultKey in Settings) {
    if (Object.prototype.hasOwnProperty.call(Settings, defaultKey)) Defaults[defaultKey] = Settings[defaultKey];
  }

  /**
   * Updates configuration.
   *
   *     ProgressBeam.configure({
   *       minimum: 0.1
   *     });
   */
  ProgressBeam.configure = function(options) {
    var key, value,
        wasRendered = typeof document !== 'undefined' && ProgressBeam.isRendered(),
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

    // #170: the increment ceiling stays below 1.0 by default but is
    // configurable. Only inc()/trickle() are capped; explicit set() values
    // bypass it so callers can always drive the bar to any value.
    if (typeof Settings.maximum !== 'number' || isNaN(Settings.maximum)) {
      Settings.maximum = 0.994;
    } else {
      Settings.maximum = clamp(Settings.maximum, 0, 1);
      if (typeof Settings.minimum === 'number' && !isNaN(Settings.minimum) &&
          Settings.maximum < Settings.minimum) Settings.maximum = Settings.minimum;
    }

    // Only 'top' and 'bottom' are supported bar positions; anything else
    // falls back to the legacy top placement.
    if (Settings.position !== 'top' && Settings.position !== 'bottom') {
      Settings.position = 'top';
    }

    // The spinner pins to one viewport corner; anything else falls back to
    // the legacy top-right placement.
    if (Settings.spinnerPosition !== 'top-right' &&
        Settings.spinnerPosition !== 'top-left' &&
        Settings.spinnerPosition !== 'bottom-right' &&
        Settings.spinnerPosition !== 'bottom-left') {
      Settings.spinnerPosition = 'top-right';
    }

    if (wasRendered) {
      var needsRerender = previous.showBar !== Settings.showBar ||
        previous.showSpinner !== Settings.showSpinner ||
        previous.parent !== Settings.parent ||
        previous.template !== Settings.template;

      if (needsRerender) {
        var status = ProgressBeam.status;
        ProgressBeam.remove();
        if (status !== null) ProgressBeam.render();
      } else {
        updatePresentation(document.getElementById('progressbeam'));
      }
    }

    return this;
  };

  /** Current progress value, or null when idle. */

  ProgressBeam.status = null;
  ProgressBeam.failed = false;

  /**
   * Subscribes to a lifecycle event.
   */

  ProgressBeam.on = function(event, handler) {
    if (typeof handler !== 'function') return this;
    (eventHandlers[event] || (eventHandlers[event] = [])).push(handler);
    return this;
  };

  /**
   * Removes one handler, all handlers for an event, or all handlers.
   */

  ProgressBeam.off = function(event, handler) {
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
   *     ProgressBeam.set(0.4);
   *     ProgressBeam.set(1.0);
   */

  ProgressBeam.set = function(n) {
    if (typeof n !== 'number' || isNaN(n)) return this;
    var started = ProgressBeam.isStarted();

    if (delayedStartPending) {
      cancelTimers();
      delayedStartPending = false;
    }

    n = clamp(n, Settings.minimum, 1);
    ProgressBeam.status = (n === 1 ? null : n);
    emit('progress', { progress: n, status: ProgressBeam.status });
    // SSR-safe: without a document only the status model advances.
    if (typeof document === 'undefined') return this;

    var progress = ProgressBeam.render(!started),
        bar      = progress.querySelector(Settings.barSelector),
        speed    = Settings.speed,
        ease     = Settings.easing;

    progress.offsetWidth; /* Force the transition to start from the new value. */

    if (Settings.indeterminate && bar) {
      progress.classList.add('progressbeam-indeterminate');
      bar.removeAttribute('aria-valuenow');
    } else if (bar) {
      progress.classList.remove('progressbeam-indeterminate');
      bar.setAttribute('aria-valuenow', Math.round(n * 100));
    }

    queue(function(next) {
      // Detect the best positioning strategy once the document is available.
      if (Settings.positionUsing === '') Settings.positionUsing = ProgressBeam.getPositioningCSS();

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
            transition: 'opacity ' + speed + 'ms linear',
            opacity: 0
          });
          schedule(function() {
            ProgressBeam.remove();
            next();
          }, speed);
        }, speed);
      } else {
        schedule(next, speed);
      }
    });

    return this;
  };

  ProgressBeam.isStarted = function() {
    return typeof ProgressBeam.status === 'number';
  };

  /**
   * Shows the progress bar without reducing an existing value.
   *
   *     ProgressBeam.start();
   *
   */
  ProgressBeam.start = function() {
    if (!ProgressBeam.status) {
      emit('start', { progress: ProgressBeam.status, status: ProgressBeam.status });
      if (Settings.delay > 0) {
        // Keep the operation active while delaying its first render.
        ProgressBeam.status = Settings.minimum;
        delayedStartPending = true;
        schedule(function() {
          delayedStartPending = false;
          if (!ProgressBeam.status || ProgressBeam.isRendered()) return;
          ProgressBeam.status = null;
          ProgressBeam.set(0);
        }, Settings.delay);
      } else {
        ProgressBeam.set(0);
      }
    }

    if (Settings.trickle && !ProgressBeam.paused) {
      scheduleTrickleWork(Settings.delay > 0 ? Settings.delay : 0);
    }

    return this;
  };

  /**
   * Completes the current operation with a short finishing animation.
   *
   *     ProgressBeam.done();
   *
   * If `true` is passed, it will render the progress bar when idle.
   *
   *     ProgressBeam.done(true);
   */

  ProgressBeam.done = function(force) {
    if (delayedStartPending && !force) {
      cancelTimers();
      cancelTrickleTimers();
      ProgressBeam.status = null;
      return this;
    }
    if (delayedStartPending) {
      cancelTimers();
      delayedStartPending = false;
    }
    if (!force && !ProgressBeam.status) return this;

    ProgressBeam.failed = false;
    var result = ProgressBeam.inc(0.3 + 0.5 * Math.random()).set(1);
    emit('done', { progress: 1, status: ProgressBeam.status });
    return result;
  };

  /**
   * Increments the active value without reaching the configured maximum.
   */

  ProgressBeam.inc = function(amount) {
    var n = ProgressBeam.status;

    if (!n) {
      return ProgressBeam.start();
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

      if (n >= Settings.maximum) return ProgressBeam.set(n);
      n = clamp(n + amount, 0, Settings.maximum);
      return ProgressBeam.set(n);
    }
  };

  ProgressBeam.trickle = function() {
    return ProgressBeam.inc();
  };

  /**
   * Decrements the active value without dropping below the minimum.
   * A no-op while idle: there is nothing to decrement. The default step
   * mirrors the increment schedule, shrinking as the value drops.
   *
   *     ProgressBeam.dec();
   *     ProgressBeam.dec(0.2);
   */

  ProgressBeam.dec = function(amount) {
    var n = ProgressBeam.status;

    if (!n) {
      return this;
    }
    if (typeof amount !== 'number') {
      if (n > 0.8) { amount = 0.1; }
      else if (n > 0.5) { amount = 0.05; }
      else if (n > 0.2) { amount = 0.02; }
      else { amount = 0.01; }
    }
    return ProgressBeam.set(n - amount);
  };

  ProgressBeam.paused = false;

  ProgressBeam.pause = function() {
    var wasPaused = ProgressBeam.paused;
    ProgressBeam.paused = true;
    cancelTrickleTimers();
    if (!wasPaused) emit('pause', { progress: ProgressBeam.status, status: ProgressBeam.status });
    return this;
  };

  ProgressBeam.resume = function() {
    var wasPaused = ProgressBeam.paused;
    ProgressBeam.paused = false;
    if (ProgressBeam.isStarted() && Settings.trickle) {
      scheduleTrickleWork(0);
    }
    if (wasPaused) emit('resume', { progress: ProgressBeam.status, status: ProgressBeam.status });
    return this;
  };

  /**
   * Tracks a promise, thenable, or jQuery Deferred while it settles.
   *
   * @param promise Promise, thenable, or Deferred-like value
   */
  (function() {
    var initial = 0, current = 0;

    ProgressBeam.promise = function(promise) {
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
        ProgressBeam.start();
      }

      initial++;
      current++;

      settle(function() {
        current--;
        if (current === 0) {
            initial = 0;
            ProgressBeam.done();
        } else {
            ProgressBeam.set((initial - current) / initial);
        }
      });

      return this;
    };

  })();

  /**
   * Renders the configured progress markup.
   */

  ProgressBeam.render = function(fromStart) {
    if (typeof document === 'undefined') return null;
    if (ProgressBeam.isRendered()) return document.getElementById('progressbeam');

    addClass(document.documentElement, 'progressbeam-busy');

    var progress = document.createElement('div');
    progress.id = 'progressbeam';
    progress.innerHTML = Settings.template;

    var bar = progress.querySelector(Settings.barSelector),
        perc = fromStart ? (Settings.rtl ? '100' : '-100') : toBarPerc(ProgressBeam.status || 0),
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
      addClass(parent, 'progressbeam-custom-parent');
    }

    parent.appendChild(progress);
    currentParent = parent;
    return progress;
  };

  /**
   * Removes the rendered indicator and cancels pending work.
   */

  ProgressBeam.remove = function() {
    var wasRendered = ProgressBeam.isRendered();
    var wasDelayedStartPending = delayedStartPending;
    cancelTimers();
    cancelTrickleTimers();
    queue.clear();
    delayedStartPending = false;
    if (wasDelayedStartPending) ProgressBeam.status = null;
    ProgressBeam.failed = false;
    if (typeof document === 'undefined') return this;
    removeClass(document.documentElement, 'progressbeam-busy');
    var parent = currentParent || (isDOM(Settings.parent)
      ? Settings.parent
      : document.querySelector(Settings.parent) || document.body)
    removeClass(parent, 'progressbeam-custom-parent')
    var progress = document.getElementById('progressbeam');
    progress && removeElement(progress);
    currentParent = null;
    if (wasRendered) emit('remove', { progress: ProgressBeam.status, status: ProgressBeam.status });
    return this;
  };

  /**
   * Cancels the current progress operation without completing it.
   */

  ProgressBeam.cancel = function() {
    var wasActive = ProgressBeam.isStarted() || ProgressBeam.isRendered() || delayedStartPending;
    ProgressBeam.remove();
    ProgressBeam.status = null;
    if (wasActive) emit('cancel', { progress: null, status: null });
    return this;
  };

  /**
   * Restores the idle model and the default settings. Removes the rendered
   * indicator, clears timers and queued transitions, unpauses, clears the
   * failure flag, and drops any setting keys added through configure().
   * Event handlers are kept; use off() to remove them.
   */

  ProgressBeam.reset = function() {
    var key;
    ProgressBeam.remove();
    ProgressBeam.status = null;
    ProgressBeam.paused = false;
    for (key in Settings) {
      if (Object.prototype.hasOwnProperty.call(Settings, key) &&
          !Object.prototype.hasOwnProperty.call(Defaults, key)) {
        delete Settings[key];
      }
    }
    for (key in Defaults) {
      if (Object.prototype.hasOwnProperty.call(Defaults, key)) Settings[key] = Defaults[key];
    }
    return this;
  };

  /**
   * Marks the current operation as failed and keeps the indicator visible.
   */

  ProgressBeam.fail = function(force) {
    if (!ProgressBeam.status && !force) return this;
    if (!ProgressBeam.status && force) ProgressBeam.start();
    ProgressBeam.failed = true;
    if (typeof document === 'undefined') {
      emit('fail', { progress: ProgressBeam.status, status: ProgressBeam.status });
      return this;
    }
    var progress = ProgressBeam.render();
    updatePresentation(progress);
    emit('fail', { progress: ProgressBeam.status, status: ProgressBeam.status });
    return this;
  };

  /**
   * Returns whether the indicator is currently rendered.
   */

  ProgressBeam.isRendered = function() {
    return typeof document !== 'undefined' && !!document.getElementById('progressbeam');
  };

  /**
   * Determines which positioning CSS rule the document supports.
   */

  ProgressBeam.getPositioningCSS = function() {
    // Inspect the document's supported style properties.
    if (typeof document === 'undefined' || !document.body) return 'translate3d';
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

  function spinnerClass(position) {
    if (position === 'top-left') return 'progressbeam-spinner-tl';
    if (position === 'bottom-right') return 'progressbeam-spinner-br';
    if (position === 'bottom-left') return 'progressbeam-spinner-bl';
    return 'progressbeam-spinner-tr';
  }

  function emit(event, payload) {
    var handlers = eventHandlers[event];
    if (!handlers) return;
    handlers.slice().forEach(function(handler) {
      handler.call(ProgressBeam, payload);
    });
  }

  function updatePresentation(progress) {
    var bar = progress && progress.querySelector(Settings.barSelector);
    if (!progress) return;

    if (Settings.indeterminate && bar) {
      progress.classList.add('progressbeam-indeterminate');
      bar.removeAttribute('aria-valuenow');
    } else if (bar) {
      progress.classList.remove('progressbeam-indeterminate');
      if (ProgressBeam.isStarted()) {
        bar.setAttribute('aria-valuenow', Math.round(ProgressBeam.status * 100));
      }
    }

    if (Settings.barColor) {
      progress.style.setProperty('--progressbeam-bar-color', Settings.barColor);
    } else {
      progress.style.removeProperty('--progressbeam-bar-color');
    }
    if (Settings.spinnerColor) {
      progress.style.setProperty('--progressbeam-spinner-color', Settings.spinnerColor);
    } else {
      progress.style.removeProperty('--progressbeam-spinner-color');
    }
    if (Settings.failureColor) {
      progress.style.setProperty('--progressbeam-failure-color', Settings.failureColor);
    } else {
      progress.style.removeProperty('--progressbeam-failure-color');
    }
    if (Settings.height) {
      progress.style.setProperty('--progressbeam-height', Settings.height);
    } else {
      progress.style.removeProperty('--progressbeam-height');
    }
    if (Settings.zIndex !== undefined && Settings.zIndex !== null) {
      progress.style.setProperty('--progressbeam-z-index', Settings.zIndex);
    } else {
      progress.style.removeProperty('--progressbeam-z-index');
    }
    if (bar && Settings.ariaLabel) {
      bar.setAttribute('aria-label', Settings.ariaLabel);
    } else if (bar) {
      bar.removeAttribute('aria-label');
    }
    if (Settings.rtl) {
      addClass(progress, 'progressbeam-rtl');
    } else {
      removeClass(progress, 'progressbeam-rtl');
    }
    if (Settings.position === 'bottom') {
      addClass(progress, 'progressbeam-bottom');
    } else {
      removeClass(progress, 'progressbeam-bottom');
    }
    removeClass(progress, 'progressbeam-spinner-tr');
    removeClass(progress, 'progressbeam-spinner-tl');
    removeClass(progress, 'progressbeam-spinner-br');
    removeClass(progress, 'progressbeam-spinner-bl');
    addClass(progress, spinnerClass(Settings.spinnerPosition));
    if (ProgressBeam.failed) {
      addClass(progress, 'progressbeam-failed');
    } else {
      removeClass(progress, 'progressbeam-failed');
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
    } else if (Settings.positionUsing === 'width') {
      // Width positioning grows the bar from 0 to full width. RTL anchoring
      // comes from the stylesheet; the stale render transform is cleared so
      // it cannot offset the bar.
      barCSS = { width: (n * 100)+'%', transform: 'none' };
    } else {
      // Margin positioning shifts a full-width bar; clear the stale render
      // transform for the same reason.
      barCSS = { 'margin-left': toBarPerc(n)+'%', transform: 'none' };
    }

    // #222: transition only the animated property so bar updates stay
    // compositor-friendly instead of invalidating layout on every tick.
    var animated = Settings.positionUsing === 'margin' ? 'margin-left'
      : Settings.positionUsing === 'width' ? 'width' : 'transform';
    barCSS.transition = animated+' '+speed+'ms '+ease;

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

  /* #161: the scheduler stays timer-based. Transitions are sequenced with
     setTimeout so sequencing works in every target environment (including
     SSR-adjacent runtimes and jsdom) with zero dependencies; the CSS
     transition on the bar provides the visual smoothness, and grouping the
     timers means removing the indicator cancels all pending work. */

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
      if (!ProgressBeam.status || ProgressBeam.paused) {
        trickleLoopActive = false;
        return;
      }
      ProgressBeam.trickle();
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

  return ProgressBeam;
});
