(function() {
  var assert = require('node:assert/strict');
  var JSDOM = require('jsdom').JSDOM;

  describe('NProgress', function() {
    var dom, NProgress, settings;

    beforeEach(function() {
      dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
      global.window = dom.window;
      global.document = dom.window.document;
      global.HTMLElement = dom.window.HTMLElement;
      global.Node = dom.window.Node;
      NProgress = require('../nprogress');
      NProgress.off();
      settings = Object.assign({}, NProgress.settings);
      NProgress.configure({ speed: 0, trickle: false });
    });

    afterEach(function(done) {
      NProgress.remove();
      NProgress.status = null;
      NProgress.paused = false;
      Object.assign(NProgress.settings, settings);
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
        NProgress.set(0);
        assert.equal(document.querySelectorAll('#nprogress').length, 1);
        assert.equal(document.querySelectorAll('#nprogress .bar').length, 1);
        assert.equal(document.querySelectorAll('#nprogress .peg').length, 1);
        assert.equal(document.querySelectorAll('#nprogress .spinner').length, 1);
      });

      it('.set(1) should appear and disappear', function(done) {
        NProgress.configure({ speed: 10 });
        NProgress.set(0).set(1);
        assert.equal(document.querySelectorAll('#nprogress').length, 1);

        setTimeout(function() {
          assert.equal(document.querySelectorAll('#nprogress').length, 0);
          done();
        }, 150);
      });

      it('must respect minimum', function() {
        NProgress.set(0);
        assert.equal(NProgress.status, NProgress.settings.minimum);
      });

      it('must clamp to minimum', function() {
        NProgress.set(-100);
        assert.equal(NProgress.status, NProgress.settings.minimum);
      });

      it('must clamp to maximum', function() {
        NProgress.set(456);
        assert.equal(NProgress.status, null);
      });

      it('must expose valid progress semantics', function() {
        NProgress.set(0.42);
        var bar = document.querySelector('#nprogress .bar');
        assert.equal(bar.getAttribute('role'), 'progressbar');
        assert.equal(bar.getAttribute('aria-valuemin'), '0');
        assert.equal(bar.getAttribute('aria-valuemax'), '100');
        assert.equal(bar.getAttribute('aria-valuenow'), '42');
        assert.equal(document.querySelector('#nprogress .spinner').getAttribute('aria-hidden'), 'true');
      });

      it('must support legacy role selectors in custom templates', function() {
        NProgress.configure({
          template: '<div role="bar"></div><div role="spinner"><div class="spinner-icon"></div></div>'
        });
        NProgress.set(0.4);
        assert.equal(document.querySelector('#nprogress [role="bar"]').getAttribute('aria-valuenow'), '40');
        assert.equal(document.querySelector('#nprogress [role="spinner"]') !== null, true);
      });
    });

    describe('.on() and .off()', function() {
      it('should emit lifecycle events and remove handlers', function() {
        var events = [];
        function record(event) {
          return function() { events.push(event); };
        }
        var progressHandler = record('progress');

        NProgress.on('start', record('start'));
        NProgress.on('progress', progressHandler);
        NProgress.on('done', record('done'));
        NProgress.on('remove', record('remove'));
        NProgress.on('cancel', record('cancel'));
        NProgress.on('fail', record('fail'));
        NProgress.on('pause', record('pause'));
        NProgress.on('resume', record('resume'));

        NProgress.start();
        NProgress.pause();
        NProgress.resume();
        NProgress.done();
        NProgress.cancel();
        NProgress.fail(true);

        assert.deepEqual(events, ['start', 'progress', 'pause', 'resume', 'progress', 'progress', 'done', 'remove', 'cancel', 'start', 'progress', 'fail']);

        NProgress.off('progress', progressHandler);
        NProgress.set(0.5);
        assert.equal(events.filter(function(event) { return event === 'progress'; }).length, 4);
      });

      it('should expose a visible failure state', function() {
        NProgress.configure({ failureColor: '#dc2626' });
        NProgress.start().fail();
        var progress = document.querySelector('#nprogress');
        assert.equal(NProgress.failed, true);
        assert.equal(progress.classList.contains('nprogress-failed'), true);
        assert.equal(progress.style.getPropertyValue('--nprogress-failure-color'), '#dc2626');

        NProgress.done();
        assert.equal(NProgress.failed, false);
      });
    });

    describe('.start()', function() {
      it('must render', function() {
        NProgress.start();
        assert.equal(document.querySelectorAll('#nprogress').length, 1);
      });

      it('must respect minimum', function() {
        NProgress.start();
        assert.equal(NProgress.status, NProgress.settings.minimum);
      });

      it('must be attached to specified parent', function() {
        var test = document.createElement('div');
        test.id = 'test';
        document.body.appendChild(test);
        NProgress.configure({ parent: '#test' });
        NProgress.start();
        assert.equal(document.querySelector('#nprogress').parentNode, test);
        assert.equal(test.classList.contains('nprogress-custom-parent'), true);
      });

      it('must fall back to body when the configured parent is missing', function() {
        NProgress.configure({ parent: '#missing' });
        NProgress.start();
        assert.equal(document.querySelector('#nprogress').parentNode, document.body);
      });

      it('must honor a display delay', function(done) {
        NProgress.configure({ delay: 30 });
        NProgress.start();
        assert.equal(NProgress.isStarted(), true);
        assert.equal(NProgress.isRendered(), false);

        setTimeout(function() {
          assert.equal(NProgress.isRendered(), true);
          done();
        }, 60);
      });

      it('must stay hidden when it finishes during the display delay', function(done) {
        NProgress.configure({ delay: 30 });
        NProgress.start();
        NProgress.done();

        setTimeout(function() {
          assert.equal(document.querySelector('#nprogress'), null);
          assert.equal(NProgress.status, null);
          done();
        }, 60);
      });

      it('must cancel a delayed start without leaving a timer behind', function(done) {
        NProgress.configure({ delay: 30 });
        NProgress.start().cancel();

        setTimeout(function() {
          assert.equal(NProgress.status, null);
          assert.equal(NProgress.isRendered(), false);
          done();
        }, 60);
      });

      it('must accept a DOM parent element', function() {
        var parent = document.createElement('section');
        document.body.appendChild(parent);
        NProgress.configure({ parent: parent });
        NProgress.start();
        assert.equal(document.querySelector('#nprogress').parentNode, parent);
      });

      it('must move a rendered bar when the parent is reconfigured', function() {
        var first = document.createElement('section');
        var second = document.createElement('section');
        document.body.appendChild(first);
        document.body.appendChild(second);
        NProgress.configure({ parent: first });
        NProgress.start();
        NProgress.configure({ parent: second });
        assert.equal(first.querySelector('#nprogress'), null);
        assert.equal(second.querySelector('#nprogress') !== null, true);
        assert.equal(first.classList.contains('nprogress-custom-parent'), false);
        assert.equal(second.classList.contains('nprogress-custom-parent'), true);
      });
    });

    describe('.done()', function() {
      it('must not render without start', function() {
        NProgress.done();
        assert.equal(document.querySelectorAll('#nprogress').length, 0);
      });

      it('.done(true) must render', function() {
        NProgress.done(true);
        assert.equal(document.querySelectorAll('#nprogress').length, 1);
      });
    });

    describe('.remove()', function() {
      it('should be removed from the parent', function() {
        NProgress.set(1);
        NProgress.remove();

        var parent = document.body;
        assert.equal(parent.classList.contains('nprogress-custom-parent'), false);
        assert.equal(parent.querySelectorAll('#nprogress').length, 0);
      });

      it('must cancel pending timers and transitions', function(done) {
        NProgress.configure({ speed: 10 });
        NProgress.start();
        NProgress.set(0.5).set(1);
        NProgress.remove();

        setTimeout(function() {
          assert.equal(document.querySelectorAll('#nprogress').length, 0);
          NProgress.start();
          assert.equal(document.querySelectorAll('#nprogress').length, 1);
          done();
        }, 40);
      });

      it('must allow a new start after removing a delayed start', function(done) {
        NProgress.configure({ delay: 30 });
        NProgress.start();
        NProgress.remove();
        NProgress.start();

        setTimeout(function() {
          assert.equal(NProgress.isRendered(), true);
          done();
        }, 60);
      });

      it('must expose cancellation as an explicit alias', function() {
        NProgress.start();
        assert.equal(NProgress.cancel(), NProgress);
        assert.equal(NProgress.isRendered(), false);
        assert.equal(NProgress.status, null);
      });

      it('must show a failure immediately even when start was delayed', function() {
        NProgress.configure({ delay: 30 });
        NProgress.start().fail();
        assert.equal(NProgress.isRendered(), true);
        assert.equal(NProgress.failed, true);
      });
    });

    describe('.inc()', function() {
      it('should render', function() {
        NProgress.inc();
        assert.equal(document.querySelectorAll('#nprogress').length, 1);
      });

      it('should start with minimum', function() {
        NProgress.inc();
        assert.equal(NProgress.status, NProgress.settings.minimum);
      });

      it('should increment', function() {
        NProgress.start();
        var start = NProgress.status;

        NProgress.inc();
        assert.ok(NProgress.status > start);
      });

      it('should never reach 1.0', function() {
        for (var i = 0; i < 100; ++i) { NProgress.inc(); }
        assert.ok(NProgress.status < 1.0);
      });

      it('should respect a configured maximum', function() {
        NProgress.configure({ maximum: 0.75 });
        NProgress.start();
        NProgress.set(0.7);
        NProgress.inc(0.2);
        assert.equal(NProgress.status, 0.75);
      });
    });

    describe('.configure()', function() {
      it('should work', function() {
        NProgress.configure({ minimum: 0.5 });
        assert.equal(NProgress.settings.minimum, 0.5);
      });

      it('should support colors, RTL, and indeterminate mode', function() {
        NProgress.configure({
          barColor: '#123456',
          spinnerColor: '#abcdef',
          rtl: true,
          indeterminate: true
        });
        NProgress.start();
        var progress = document.querySelector('#nprogress');
        var bar = progress.querySelector('.bar');
        assert.equal(progress.style.getPropertyValue('--nprogress-bar-color'), '#123456');
        assert.equal(progress.style.getPropertyValue('--nprogress-spinner-color'), '#abcdef');
        assert.equal(progress.classList.contains('nprogress-rtl'), true);
        assert.equal(progress.classList.contains('nprogress-indeterminate'), true);
        assert.equal(bar.hasAttribute('aria-valuenow'), false);
      });

      it('should update presentation settings on a rendered bar', function() {
        NProgress.start();
        NProgress.configure({
          barColor: '#123456',
          spinnerColor: '#abcdef',
          showSpinner: false,
          rtl: true,
          indeterminate: true
        });

        var progress = document.querySelector('#nprogress');
        assert.equal(progress.style.getPropertyValue('--nprogress-bar-color'), '#123456');
        assert.equal(progress.style.getPropertyValue('--nprogress-spinner-color'), '#abcdef');
        assert.equal(progress.style.getPropertyValue('--nprogress-height'), '2px');
        assert.equal(progress.style.getPropertyValue('--nprogress-z-index'), '1031');
        assert.equal(progress.querySelector('.spinner'), null);
        assert.equal(progress.classList.contains('nprogress-rtl'), true);
        assert.equal(progress.classList.contains('nprogress-indeterminate'), true);
      });

      it('should support independent bar visibility', function() {
        NProgress.configure({ showBar: false });
        NProgress.start();
        assert.equal(document.querySelector('#nprogress .bar'), null);
        assert.equal(document.querySelector('#nprogress .spinner') !== null, true);

        NProgress.configure({ showBar: true });
        assert.equal(document.querySelector('#nprogress .bar') !== null, true);
      });

      it('should restore the spinner during live reconfiguration', function() {
        NProgress.configure({ showSpinner: false });
        NProgress.start();
        assert.equal(document.querySelector('#nprogress .spinner'), null);
        NProgress.configure({ showSpinner: true });
        assert.equal(document.querySelector('#nprogress .spinner') !== null, true);
      });

      it('should accept null-prototype option objects', function() {
        var options = Object.create(null);
        options.minimum = 0.2;
        assert.doesNotThrow(function() { NProgress.configure(options); });
        assert.equal(NProgress.settings.minimum, 0.2);
      });

      it('should tolerate custom templates without a progress bar', function() {
        NProgress.configure({ template: '<div class="custom-progress"></div>' });
        NProgress.start();
        assert.equal(document.querySelector('#nprogress .custom-progress') !== null, true);
      });
    });

    describe('.configure(showSpinner)', function() {
      it('should render spinner by default', function() {
        NProgress.start();
        assert.equal(document.querySelectorAll('#nprogress .spinner').length, 1);
      });

      it('should be true by default', function() {
        assert.equal(NProgress.settings.showSpinner, true);
      });

      it('should hide (on false)', function() {
        NProgress.configure({ showSpinner: false });
        NProgress.start();
        assert.equal(document.querySelectorAll('#nprogress .spinner').length, 0);
      });
    });

    describe('.promise()', function() {
      it('should support native promises', function(done) {
        NProgress.promise(new Promise(function(resolve) {
          setTimeout(resolve, 10);
        }));

        assert.equal(NProgress.isStarted(), true);
        setTimeout(function() {
          assert.equal(NProgress.isStarted(), false);
          done();
        }, 50);
      });

      it('should support rejected native promises', function(done) {
        NProgress.promise(Promise.reject(new Error('expected test rejection')));

        setTimeout(function() {
          assert.equal(NProgress.isStarted(), false);
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

        NProgress.promise(deferred);
        NProgress.promise(thenable);
        assert.equal(NProgress.isStarted(), true);
        alwaysCallbacks[0]();

        setTimeout(function() {
          assert.equal(NProgress.isStarted(), false);
          done();
        }, 40);
      });

      it('should ignore non-promise values', function() {
        assert.equal(NProgress.promise({}), NProgress);
        assert.equal(NProgress.isStarted(), false);
      });
    });

    describe('.pause() and .resume()', function() {
      it('should pause and resume trickling', function(done) {
        NProgress.configure({ trickle: true, trickleSpeed: 5 });
        NProgress.start();
        NProgress.pause();
        var pausedStatus = NProgress.status;

        setTimeout(function() {
          assert.equal(NProgress.status, pausedStatus);
          NProgress.resume();
          setTimeout(function() {
            assert.ok(NProgress.status > pausedStatus);
            done();
          }, 25);
        }, 20);
      });

      it('should keep repeated starts idempotent', function(done) {
        NProgress.configure({ trickle: true, trickleSpeed: 10 });
        var originalTrickle = NProgress.trickle;
        var calls = 0;
        NProgress.trickle = function() {
          calls += 1;
          return originalTrickle.apply(this, arguments);
        };

        NProgress.start();
        NProgress.start();

        setTimeout(function() {
          NProgress.trickle = originalTrickle;
          assert.ok(calls <= 4);
          done();
        }, 35);
      });
    });
  });
})();
