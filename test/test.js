(function() {
  var assert = require('node:assert/strict');
  var JSDOM = require('jsdom').JSDOM;

  describe('ProgressBeam', function() {
    var dom, ProgressBeam, settings;

    beforeEach(function() {
      dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
      global.window = dom.window;
      global.document = dom.window.document;
      global.HTMLElement = dom.window.HTMLElement;
      global.Node = dom.window.Node;
      ProgressBeam = require('../progressbeam');
      ProgressBeam.off();
      settings = Object.assign({}, ProgressBeam.settings);
      ProgressBeam.configure({ speed: 0, trickle: false });
    });

    afterEach(function(done) {
      ProgressBeam.remove();
      ProgressBeam.status = null;
      ProgressBeam.paused = false;
      Object.assign(ProgressBeam.settings, settings);
      setTimeout(function() {
        dom.window.close();
        delete global.window;
        delete global.document;
        delete global.HTMLElement;
        delete global.Node;
        done();
      }, 20);
    });

    describe('.set()', function() {
      it('.set(0) must render', function() {
        ProgressBeam.set(0);
        assert.equal(document.querySelectorAll('#progressbeam').length, 1);
        assert.equal(document.querySelectorAll('#progressbeam .bar').length, 1);
        assert.equal(document.querySelectorAll('#progressbeam .peg').length, 1);
        assert.equal(document.querySelectorAll('#progressbeam .spinner').length, 1);
      });

      it('.set(1) should appear and disappear', function(done) {
        ProgressBeam.configure({ speed: 10 });
        ProgressBeam.set(0).set(1);
        assert.equal(document.querySelectorAll('#progressbeam').length, 1);

        setTimeout(function() {
          assert.equal(document.querySelectorAll('#progressbeam').length, 0);
          done();
        }, 150);
      });

      it('must respect minimum', function() {
        ProgressBeam.set(0);
        assert.equal(ProgressBeam.status, ProgressBeam.settings.minimum);
      });

      it('must clamp to minimum', function() {
        ProgressBeam.set(-100);
        assert.equal(ProgressBeam.status, ProgressBeam.settings.minimum);
      });

      it('must clamp to maximum', function() {
        ProgressBeam.set(456);
        assert.equal(ProgressBeam.status, null);
      });

      it('must expose valid progress semantics', function() {
        ProgressBeam.set(0.42);
        var bar = document.querySelector('#progressbeam .bar');
        assert.equal(bar.getAttribute('role'), 'progressbar');
        assert.equal(bar.getAttribute('aria-valuemin'), '0');
        assert.equal(bar.getAttribute('aria-valuemax'), '100');
        assert.equal(bar.getAttribute('aria-valuenow'), '42');
        assert.equal(document.querySelector('#progressbeam .spinner').getAttribute('aria-hidden'), 'true');
      });

      it('must support legacy role selectors in custom templates', function() {
        ProgressBeam.configure({
          template: '<div role="bar"></div><div role="spinner"><div class="spinner-icon"></div></div>'
        });
        ProgressBeam.set(0.4);
        assert.equal(document.querySelector('#progressbeam [role="bar"]').getAttribute('aria-valuenow'), '40');
        assert.equal(document.querySelector('#progressbeam [role="spinner"]') !== null, true);
      });
    });

    describe('.on() and .off()', function() {
      it('should emit lifecycle events and remove handlers', function() {
        var events = [];
        function record(event) {
          return function() { events.push(event); };
        }
        var progressHandler = record('progress');

        ProgressBeam.on('start', record('start'));
        ProgressBeam.on('progress', progressHandler);
        ProgressBeam.on('done', record('done'));
        ProgressBeam.on('remove', record('remove'));
        ProgressBeam.on('cancel', record('cancel'));
        ProgressBeam.on('fail', record('fail'));
        ProgressBeam.on('pause', record('pause'));
        ProgressBeam.on('resume', record('resume'));

        ProgressBeam.start();
        ProgressBeam.pause();
        ProgressBeam.resume();
        ProgressBeam.done();
        ProgressBeam.cancel();
        ProgressBeam.fail(true);

        assert.deepEqual(events, ['start', 'progress', 'pause', 'resume', 'progress', 'progress', 'done', 'remove', 'cancel', 'start', 'progress', 'fail']);

        ProgressBeam.off('progress', progressHandler);
        ProgressBeam.set(0.5);
        assert.equal(events.filter(function(event) { return event === 'progress'; }).length, 4);
      });

      it('should expose a visible failure state', function() {
        ProgressBeam.configure({ failureColor: '#dc2626' });
        ProgressBeam.start().fail();
        var progress = document.querySelector('#progressbeam');
        assert.equal(ProgressBeam.failed, true);
        assert.equal(progress.classList.contains('progressbeam-failed'), true);
        assert.equal(progress.style.getPropertyValue('--progressbeam-failure-color'), '#dc2626');

        ProgressBeam.done();
        assert.equal(ProgressBeam.failed, false);
      });
    });

    describe('.start()', function() {
      it('must render', function() {
        ProgressBeam.start();
        assert.equal(document.querySelectorAll('#progressbeam').length, 1);
      });

      it('must respect minimum', function() {
        ProgressBeam.start();
        assert.equal(ProgressBeam.status, ProgressBeam.settings.minimum);
      });

      it('must be attached to specified parent', function() {
        var test = document.createElement('div');
        test.id = 'test';
        document.body.appendChild(test);
        ProgressBeam.configure({ parent: '#test' });
        ProgressBeam.start();
        assert.equal(document.querySelector('#progressbeam').parentNode, test);
        assert.equal(test.classList.contains('progressbeam-custom-parent'), true);
      });

      it('must fall back to body when the configured parent is missing', function() {
        ProgressBeam.configure({ parent: '#missing' });
        ProgressBeam.start();
        assert.equal(document.querySelector('#progressbeam').parentNode, document.body);
      });

      it('must honor a display delay', function(done) {
        ProgressBeam.configure({ delay: 30 });
        ProgressBeam.start();
        assert.equal(ProgressBeam.isStarted(), true);
        assert.equal(ProgressBeam.isRendered(), false);

        setTimeout(function() {
          assert.equal(ProgressBeam.isRendered(), true);
          done();
        }, 60);
      });

      it('must stay hidden when it finishes during the display delay', function(done) {
        ProgressBeam.configure({ delay: 30 });
        ProgressBeam.start();
        ProgressBeam.done();

        setTimeout(function() {
          assert.equal(document.querySelector('#progressbeam'), null);
          assert.equal(ProgressBeam.status, null);
          done();
        }, 60);
      });

      it('must cancel a delayed start without leaving a timer behind', function(done) {
        ProgressBeam.configure({ delay: 30 });
        ProgressBeam.start().cancel();

        setTimeout(function() {
          assert.equal(ProgressBeam.status, null);
          assert.equal(ProgressBeam.isRendered(), false);
          done();
        }, 60);
      });

      it('must accept a DOM parent element', function() {
        var parent = document.createElement('section');
        document.body.appendChild(parent);
        ProgressBeam.configure({ parent: parent });
        ProgressBeam.start();
        assert.equal(document.querySelector('#progressbeam').parentNode, parent);
      });

      it('must move a rendered bar when the parent is reconfigured', function() {
        var first = document.createElement('section');
        var second = document.createElement('section');
        document.body.appendChild(first);
        document.body.appendChild(second);
        ProgressBeam.configure({ parent: first });
        ProgressBeam.start();
        ProgressBeam.configure({ parent: second });
        assert.equal(first.querySelector('#progressbeam'), null);
        assert.equal(second.querySelector('#progressbeam') !== null, true);
        assert.equal(first.classList.contains('progressbeam-custom-parent'), false);
        assert.equal(second.classList.contains('progressbeam-custom-parent'), true);
      });
    });

    describe('.done()', function() {
      it('must not render without start', function() {
        ProgressBeam.done();
        assert.equal(document.querySelectorAll('#progressbeam').length, 0);
      });

      it('.done(true) must render', function() {
        ProgressBeam.done(true);
        assert.equal(document.querySelectorAll('#progressbeam').length, 1);
      });
    });

    describe('.remove()', function() {
      it('should be removed from the parent', function() {
        ProgressBeam.set(1);
        ProgressBeam.remove();

        var parent = document.body;
        assert.equal(parent.classList.contains('progressbeam-custom-parent'), false);
        assert.equal(parent.querySelectorAll('#progressbeam').length, 0);
      });

      it('must cancel pending timers and transitions', function(done) {
        ProgressBeam.configure({ speed: 10 });
        ProgressBeam.start();
        ProgressBeam.set(0.5).set(1);
        ProgressBeam.remove();

        setTimeout(function() {
          assert.equal(document.querySelectorAll('#progressbeam').length, 0);
          ProgressBeam.start();
          assert.equal(document.querySelectorAll('#progressbeam').length, 1);
          done();
        }, 40);
      });

      it('must allow a new start after removing a delayed start', function(done) {
        ProgressBeam.configure({ delay: 30 });
        ProgressBeam.start();
        ProgressBeam.remove();
        ProgressBeam.start();

        setTimeout(function() {
          assert.equal(ProgressBeam.isRendered(), true);
          done();
        }, 60);
      });

      it('must expose cancellation as an explicit alias', function() {
        ProgressBeam.start();
        assert.equal(ProgressBeam.cancel(), ProgressBeam);
        assert.equal(ProgressBeam.isRendered(), false);
        assert.equal(ProgressBeam.status, null);
      });

      it('must show a failure immediately even when start was delayed', function() {
        ProgressBeam.configure({ delay: 30 });
        ProgressBeam.start().fail();
        assert.equal(ProgressBeam.isRendered(), true);
        assert.equal(ProgressBeam.failed, true);
      });
    });

    describe('.inc()', function() {
      it('should render', function() {
        ProgressBeam.inc();
        assert.equal(document.querySelectorAll('#progressbeam').length, 1);
      });

      it('should start with minimum', function() {
        ProgressBeam.inc();
        assert.equal(ProgressBeam.status, ProgressBeam.settings.minimum);
      });

      it('should increment', function() {
        ProgressBeam.start();
        var start = ProgressBeam.status;

        ProgressBeam.inc();
        assert.ok(ProgressBeam.status > start);
      });

      it('should never reach 1.0', function() {
        for (var i = 0; i < 100; ++i) { ProgressBeam.inc(); }
        assert.ok(ProgressBeam.status < 1.0);
      });

      it('should respect a configured maximum', function() {
        ProgressBeam.configure({ maximum: 0.75 });
        ProgressBeam.start();
        ProgressBeam.set(0.7);
        ProgressBeam.inc(0.2);
        assert.equal(ProgressBeam.status, 0.75);
      });
    });

    describe('.configure()', function() {
      it('should work', function() {
        ProgressBeam.configure({ minimum: 0.5 });
        assert.equal(ProgressBeam.settings.minimum, 0.5);
      });

      it('should support colors, RTL, and indeterminate mode', function() {
        ProgressBeam.configure({
          barColor: '#123456',
          spinnerColor: '#abcdef',
          rtl: true,
          indeterminate: true
        });
        ProgressBeam.start();
        var progress = document.querySelector('#progressbeam');
        var bar = progress.querySelector('.bar');
        assert.equal(progress.style.getPropertyValue('--progressbeam-bar-color'), '#123456');
        assert.equal(progress.style.getPropertyValue('--progressbeam-spinner-color'), '#abcdef');
        assert.equal(progress.classList.contains('progressbeam-rtl'), true);
        assert.equal(progress.classList.contains('progressbeam-indeterminate'), true);
        assert.equal(bar.hasAttribute('aria-valuenow'), false);
      });

      it('should update presentation settings on a rendered bar', function() {
        ProgressBeam.start();
        ProgressBeam.configure({
          barColor: '#123456',
          spinnerColor: '#abcdef',
          showSpinner: false,
          rtl: true,
          indeterminate: true
        });

        var progress = document.querySelector('#progressbeam');
        assert.equal(progress.style.getPropertyValue('--progressbeam-bar-color'), '#123456');
        assert.equal(progress.style.getPropertyValue('--progressbeam-spinner-color'), '#abcdef');
        assert.equal(progress.style.getPropertyValue('--progressbeam-height'), '2px');
        assert.equal(progress.style.getPropertyValue('--progressbeam-z-index'), '1031');
        assert.equal(progress.querySelector('.spinner'), null);
        assert.equal(progress.classList.contains('progressbeam-rtl'), true);
        assert.equal(progress.classList.contains('progressbeam-indeterminate'), true);
      });

      it('should support independent bar visibility', function() {
        ProgressBeam.configure({ showBar: false });
        ProgressBeam.start();
        assert.equal(document.querySelector('#progressbeam .bar'), null);
        assert.equal(document.querySelector('#progressbeam .spinner') !== null, true);

        ProgressBeam.configure({ showBar: true });
        assert.equal(document.querySelector('#progressbeam .bar') !== null, true);
      });

      it('should restore the spinner during live reconfiguration', function() {
        ProgressBeam.configure({ showSpinner: false });
        ProgressBeam.start();
        assert.equal(document.querySelector('#progressbeam .spinner'), null);
        ProgressBeam.configure({ showSpinner: true });
        assert.equal(document.querySelector('#progressbeam .spinner') !== null, true);
      });

      it('should accept null-prototype option objects', function() {
        var options = Object.create(null);
        options.minimum = 0.2;
        assert.doesNotThrow(function() { ProgressBeam.configure(options); });
        assert.equal(ProgressBeam.settings.minimum, 0.2);
      });

      it('should tolerate custom templates without a progress bar', function() {
        ProgressBeam.configure({ template: '<div class="custom-progress"></div>' });
        ProgressBeam.start();
        assert.equal(document.querySelector('#progressbeam .custom-progress') !== null, true);
      });
    });

    describe('.configure(showSpinner)', function() {
      it('should render spinner by default', function() {
        ProgressBeam.start();
        assert.equal(document.querySelectorAll('#progressbeam .spinner').length, 1);
      });

      it('should be true by default', function() {
        assert.equal(ProgressBeam.settings.showSpinner, true);
      });

      it('should hide (on false)', function() {
        ProgressBeam.configure({ showSpinner: false });
        ProgressBeam.start();
        assert.equal(document.querySelectorAll('#progressbeam .spinner').length, 0);
      });
    });

    describe('.promise()', function() {
      it('should support native promises', function(done) {
        ProgressBeam.promise(new Promise(function(resolve) {
          setTimeout(resolve, 10);
        }));

        assert.equal(ProgressBeam.isStarted(), true);
        setTimeout(function() {
          assert.equal(ProgressBeam.isStarted(), false);
          done();
        }, 50);
      });

      it('should support rejected native promises', function(done) {
        ProgressBeam.promise(Promise.reject(new Error('expected test rejection')));

        setTimeout(function() {
          assert.equal(ProgressBeam.isStarted(), false);
          done();
        }, 20);
      });

      it('should support thenables and jQuery-style always promises', function(done) {
        var alwaysCallbacks = [];
        var deferred = {
          always: function(callback) {
            alwaysCallbacks.push(callback);
          }
        };
        var thenable = {
          then: function(resolve) {
            setTimeout(resolve, 5);
          }
        };

        ProgressBeam.promise(deferred);
        ProgressBeam.promise(thenable);
        assert.equal(ProgressBeam.isStarted(), true);
        alwaysCallbacks[0]();

        setTimeout(function() {
          assert.equal(ProgressBeam.isStarted(), false);
          done();
        }, 40);
      });

      it('should ignore non-promise values', function() {
        assert.equal(ProgressBeam.promise({}), ProgressBeam);
        assert.equal(ProgressBeam.isStarted(), false);
      });
    });

    describe('.pause() and .resume()', function() {
      it('should pause and resume trickling', function(done) {
        ProgressBeam.configure({ trickle: true, trickleSpeed: 5 });
        ProgressBeam.start();
        ProgressBeam.pause();
        var pausedStatus = ProgressBeam.status;

        setTimeout(function() {
          assert.equal(ProgressBeam.status, pausedStatus);
          ProgressBeam.resume();
          setTimeout(function() {
            assert.ok(ProgressBeam.status > pausedStatus);
            done();
          }, 25);
        }, 20);
      });

      it('should keep repeated starts idempotent', function(done) {
        ProgressBeam.configure({ trickle: true, trickleSpeed: 10 });
        var originalTrickle = ProgressBeam.trickle;
        var calls = 0;
        ProgressBeam.trickle = function() {
          calls += 1;
          return originalTrickle.apply(this, arguments);
        };

        ProgressBeam.start();
        ProgressBeam.start();

        setTimeout(function() {
          ProgressBeam.trickle = originalTrickle;
          assert.ok(calls <= 4);
          done();
        }, 35);
      });
    });
    describe('maximum ceiling (#170)', function() {
      it('should cap inc() at the configured maximum', function() {
        ProgressBeam.configure({ maximum: 0.75 });
        ProgressBeam.start();
        ProgressBeam.set(0.7);
        ProgressBeam.inc(0.2);
        assert.equal(ProgressBeam.status, 0.75);
      });

      it('should let explicit set() bypass the increment ceiling', function() {
        ProgressBeam.configure({ maximum: 0.75 });
        ProgressBeam.start();
        ProgressBeam.set(0.9);
        assert.equal(ProgressBeam.status, 0.9);
      });

      it('should never move backwards when incrementing above the ceiling', function() {
        ProgressBeam.configure({ maximum: 0.75 });
        ProgressBeam.start();
        ProgressBeam.set(0.9);
        ProgressBeam.inc();
        assert.equal(ProgressBeam.status, 0.9);
      });

      it('should clamp an out-of-range maximum into [minimum, 1]', function() {
        ProgressBeam.configure({ maximum: 5 });
        assert.equal(ProgressBeam.settings.maximum, 1);
        ProgressBeam.configure({ maximum: -1 });
        assert.equal(ProgressBeam.settings.maximum, ProgressBeam.settings.minimum);
        ProgressBeam.configure({ maximum: NaN });
        assert.equal(ProgressBeam.settings.maximum, 0.994);
      });

      it('should raise a maximum below the minimum up to the minimum', function() {
        ProgressBeam.configure({ minimum: 0.5, maximum: 0.1 });
        assert.equal(ProgressBeam.settings.maximum, 0.5);
      });

      it('should ignore non-numeric set() values', function() {
        ProgressBeam.set(NaN);
        assert.equal(ProgressBeam.status, null);
        assert.equal(document.querySelectorAll('#progressbeam').length, 0);
        ProgressBeam.start();
        var status = ProgressBeam.status;
        ProgressBeam.set(NaN);
        assert.equal(ProgressBeam.status, status);
      });
    });

    describe('scheduler and cancellation (#161, #38)', function() {
      it('should serialize rapid set() calls without stalling', function(done) {
        ProgressBeam.configure({ speed: 5 });
        ProgressBeam.set(0.1).set(0.5).set(0.9);
        assert.equal(ProgressBeam.status, 0.9);

        setTimeout(function() {
          assert.equal(ProgressBeam.status, 0.9);
          assert.equal(document.querySelectorAll('#progressbeam').length, 1);
          done();
        }, 60);
      });

      it('should leave no timers behind after cancel during completion', function(done) {
        ProgressBeam.configure({ speed: 10 });
        ProgressBeam.start();
        ProgressBeam.set(0.5).set(1);
        ProgressBeam.cancel();

        setTimeout(function() {
          assert.equal(ProgressBeam.status, null);
          assert.equal(document.querySelectorAll('#progressbeam').length, 0);
          ProgressBeam.start();
          assert.equal(document.querySelectorAll('#progressbeam').length, 1);
          done();
        }, 60);
      });

      it('cancel() when idle should be a silent no-op', function() {
        var events = [];
        ProgressBeam.on('cancel', function() { events.push('cancel'); });
        assert.equal(ProgressBeam.cancel(), ProgressBeam);
        assert.equal(ProgressBeam.status, null);
        assert.equal(ProgressBeam.isRendered(), false);
        assert.deepEqual(events, []);
      });

      it('cancel() after done() should clear the pending fade', function(done) {
        ProgressBeam.configure({ speed: 10 });
        ProgressBeam.start();
        ProgressBeam.done();
        ProgressBeam.cancel();

        setTimeout(function() {
          assert.equal(ProgressBeam.status, null);
          assert.equal(document.querySelectorAll('#progressbeam').length, 0);
          done();
        }, 60);
      });

      it('done() after cancel() should not render', function() {
        ProgressBeam.start();
        ProgressBeam.cancel();
        ProgressBeam.done();
        assert.equal(document.querySelectorAll('#progressbeam').length, 0);
        assert.equal(ProgressBeam.status, null);
      });
    });

    describe('failure and removal state machine', function() {
      it('fail() when idle without force should be a no-op', function() {
        var events = [];
        ProgressBeam.on('fail', function() { events.push('fail'); });
        ProgressBeam.fail();
        assert.equal(ProgressBeam.failed, false);
        assert.deepEqual(events, []);
        assert.equal(document.querySelectorAll('#progressbeam').length, 0);
      });

      it('fail() then done() should clear the failure state', function() {
        ProgressBeam.start().fail();
        assert.equal(ProgressBeam.failed, true);
        ProgressBeam.done();
        assert.equal(ProgressBeam.failed, false);
        assert.equal(ProgressBeam.status, null);
      });

      it('remove() should keep the status model so set() can re-render', function() {
        ProgressBeam.start();
        ProgressBeam.remove();
        assert.equal(ProgressBeam.isRendered(), false);
        assert.equal(ProgressBeam.isStarted(), true);
        ProgressBeam.set(0.5);
        assert.equal(document.querySelectorAll('#progressbeam').length, 1);
        assert.equal(ProgressBeam.status, 0.5);
      });

      it('should use compositor-friendly transitions (#222)', function() {
        ProgressBeam.set(0.5);
        var positioning = ProgressBeam.getPositioningCSS();
        var style = document.querySelector('#progressbeam .bar').getAttribute('style');
        if (positioning === 'margin') {
          assert.ok(style.indexOf('margin-left') !== -1);
        } else {
          assert.ok(style.indexOf('transform') !== -1);
        }
        assert.equal(style.indexOf('all ') !== -1, false);
      });
    });

    describe('SSR and DOM-absent guards', function() {
      it('should advance the status model without a document', function() {
        var saved = {
          window: global.window,
          document: global.document,
          HTMLElement: global.HTMLElement,
          Node: global.Node
        };
        delete global.window;
        delete global.document;
        delete global.HTMLElement;
        delete global.Node;
        try {
          assert.equal(ProgressBeam.isRendered(), false);
          assert.equal(ProgressBeam.render(), null);
          assert.equal(ProgressBeam.getPositioningCSS(), 'translate3d');
          ProgressBeam.start();
          assert.equal(ProgressBeam.status, ProgressBeam.settings.minimum);
          ProgressBeam.set(0.5);
          assert.equal(ProgressBeam.status, 0.5);
          ProgressBeam.inc();
          assert.ok(ProgressBeam.status > 0.5);
          ProgressBeam.fail();
          assert.equal(ProgressBeam.failed, true);
          ProgressBeam.cancel();
          assert.equal(ProgressBeam.status, null);
          ProgressBeam.remove();
        } finally {
          global.window = saved.window;
          global.document = saved.document;
          global.HTMLElement = saved.HTMLElement;
          global.Node = saved.Node;
        }
      });
    });

    describe('CSS layout robustness (#175, #194, #222, #223)', function() {
      var fs = require('node:fs');
      var cssPath = require('node:path').join(__dirname, '..', 'progressbeam.css');
      var css = fs.readFileSync(cssPath, 'utf8');

      it('should keep the custom-parent wrapper out of flex layout', function() {
        assert.ok(css.indexOf('.progressbeam-custom-parent #progressbeam {') !== -1);
      });

      it('should hint compositor-friendly bar animation', function() {
        assert.ok(css.indexOf('will-change: transform') !== -1);
      });

      it('should ship prefixed indeterminate keyframes for mobile browsers', function() {
        assert.ok(css.indexOf('@-webkit-keyframes progressbeam-indeterminate') !== -1);
        assert.ok(css.indexOf('-webkit-animation: progressbeam-indeterminate') !== -1);
      });

      it('should mirror the peg in RTL mode', function() {
        assert.ok(css.indexOf('#progressbeam.progressbeam-rtl .peg') !== -1);
      });

      it('should pin the bar and spinner to the base in bottom mode', function() {
        assert.ok(css.indexOf('#progressbeam.progressbeam-bottom .bar') !== -1);
        assert.ok(css.indexOf('#progressbeam.progressbeam-bottom .spinner') !== -1);
      });
    });

    describe('.dec()', function() {
      it('should be a no-op while idle', function() {
        var result = ProgressBeam.dec();
        assert.equal(result, ProgressBeam);
        assert.equal(ProgressBeam.status, null);
        assert.equal(document.querySelectorAll('#progressbeam').length, 0);
      });

      it('should subtract the default step from an active value', function() {
        ProgressBeam.set(0.5);
        ProgressBeam.dec();
        assert.ok(Math.abs(ProgressBeam.status - 0.4) < 1e-9);
      });

      it('should subtract an explicit amount', function() {
        ProgressBeam.set(0.5);
        ProgressBeam.dec(0.2);
        assert.ok(Math.abs(ProgressBeam.status - 0.3) < 1e-9);
      });

      it('should never drop below the minimum', function() {
        ProgressBeam.set(0.1);
        ProgressBeam.dec(0.9);
        assert.equal(ProgressBeam.status, ProgressBeam.settings.minimum);
      });
    });

    describe('.configure(position)', function() {
      it('should default to top placement', function() {
        assert.equal(ProgressBeam.settings.position, 'top');
      });

      it('should toggle the bottom class on the live indicator', function() {
        ProgressBeam.set(0.5);
        assert.equal(document.querySelectorAll('#progressbeam.progressbeam-bottom').length, 0);
        ProgressBeam.configure({ position: 'bottom' });
        assert.equal(document.querySelectorAll('#progressbeam.progressbeam-bottom').length, 1);
        ProgressBeam.configure({ position: 'top' });
        assert.equal(document.querySelectorAll('#progressbeam.progressbeam-bottom').length, 0);
      });

      it('should fall back to top for unsupported values', function() {
        ProgressBeam.configure({ position: 'left' });
        assert.equal(ProgressBeam.settings.position, 'top');
      });
    });

    describe('source hygiene (CSP)', function() {
      var fs = require('node:fs');
      var sourcePath = require('node:path').join(__dirname, '..', 'progressbeam.js');
      var source = fs.readFileSync(sourcePath, 'utf8');

      it('should not use eval or the Function constructor', function() {
        assert.equal(source.indexOf('eval('), -1);
        assert.equal(source.indexOf('new Function'), -1);
      });

      it('should only assign innerHTML for the configured template', function() {
        var matches = source.match(/innerHTML/g) || [];
        assert.equal(matches.length, 1);
        assert.ok(source.indexOf('progress.innerHTML = Settings.template') !== -1);
      });

      it('should keep adapters free of eval and innerHTML', function() {
        var adapters = ['history.mjs', 'react.mjs', 'next.mjs', 'vue.mjs'];
        adapters.forEach(function(file) {
          var code = fs.readFileSync(
            require('node:path').join(__dirname, '..', 'adapters', file), 'utf8'
          );
          assert.equal(code.indexOf('eval('), -1, file);
          assert.equal(code.indexOf('innerHTML'), -1, file);
        });
      });
    });
  });
})();
