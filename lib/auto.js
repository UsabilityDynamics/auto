/**
 * Auto Module
 *
 * -
 *
 * @module Auto
 * @constructor
 * @author potanin@UD
 * @date 8/5/13
 * @type {Object}
 */
function Auto( tasks, callback, settings ) {

  // Ensure always using new instance of Auto
  if( !( this instanceof Auto ) ) {

    if( arguments.length === 0 ) {
      return {};
    }

    if( arguments.length === 1 ) {
      return new Auto( tasks );
    }

    if( arguments.length === 2 ) {
      return new Auto( tasks, callback );
    }

    if( arguments.length === 3 ) {
      return new Auto( tasks, callback, settings );
    }

  }

  // Set private properties
  var self      = this;
  var keys      = Object.keys( tasks );

  // Set instance properties
  this.id          = Math.random().toString( 36 ).substring( 7 );
  this.error       = null;
  this.tasks       = tasks;
  this.callback    = arguments[1] instanceof Function ? arguments[1] : function defaultCallback() {};
  this.settings    = Auto.extend( {}, Auto.defaults, arguments.length === 3 ? settings : 'function' !== typeof callback ? callback : {} );
  this.response    = {};
  this.listeners   = [];

  // Extend this with Event Emitter
  Auto.emitter.mixin( this );

  // Ensure there are tasks
  if( !keys.length ) {
    return callback( null );
  }

  self.addListener( function() { if( Object.keys( self.response ).length === keys.length ) {

    // Will fire multiple times if not checked
    if( self.callback.name === 'Placeholder' ) {
      return;
    }

    // All steps in task are complete
    self.emit( 'complete', null, self.response );
    self.emit( 'success', self.response );

    // Call the primary callback
    self.callback( null, self.response );

    // Clear out objects
    // self._events = null;

    // Unset Callback
    self.callback = function Placeholder() {};

  }});

  Auto.each( keys, function ( key ) {

    // Get Task Object
    var task = ( tasks[key] instanceof Function ) ? [tasks[key]]: tasks[key];

    // Step is Complete
    var taskCallback = function taskCallback( error ) {
      // Get response arguments
      var args = Array.prototype.slice.call( arguments, 1) ;

      if (args.length <= 1) {
        args = args[0];
      }

      if( error && error instanceof Error ) {
        var safeResults = {};

        Auto.each( Object.keys( self.response ), function( rkey ) {
          safeResults[rkey] = self.response[rkey];
        });

        safeResults[key] = args;

        // Emit task evnet and complete event
        self.emit( 'error', error, safeResults );
        self.emit( 'complete', error, safeResults );

        // Trigger callback
        self.callback( error, safeResults );

        // stop subsequent errors hitting callback multiple times
        callback = function __fake_callback__() {
          self.emit( '__fake_callback__' );
        };

      } else {

        // Save task response to general response
        self.response[key] = args;

        // process.nextTick( )
        Auto.setImmediate( self.stepComplete.bind( self ), key, args );

      }

    };

    var requires = task.slice( 0, Math.abs( task.length - 1 )) || [];

    // Ready to Process a Step
    var ready = function ready() {

      // Identify Dependacncies with some form of magic
      var magic = Auto.reduce( requires, function (a, x) {
        return ( a && self.response.hasOwnProperty(x));
      }, true ) && !self.response.hasOwnProperty(key);

      //
      self.emit( 'ready', key, magic );

      return magic;

    };

    if (ready()) {
      // Trigger Method

      task[ task.length - 1 ].bind({
        todo: true
      })( taskCallback, self.response, self );

    } else {

      // Create a listener to be checked later
      var listener = function listener() {

        if (ready()) {
          self.removeListener( listener, key );

          task[task.length - 1].bind({
            todo: true
          })( taskCallback, self.response );

        }
      }

      self.addListener( listener, key );

    }

  });

}

Object.defineProperties( Auto.prototype, {
  removeListener: {
    /**
     * Remove Listener from Queue
     *
     * @method removeListener
     * @param fn
     * @param k
     */
    value: function removeListener( fn, k ) {
      // self.emit( 'removeListener', k );

      for( var i = 0; i < this.listeners.length; i += 1 ) {
        if( this.listeners[i] === fn ) { this.listeners.splice(i, 1); return; }
      }

    },
    enumerable: false
  },
  addListener: {
    /**
     * Add Listener to Queue
     *
     * @method addListener
     * @param fn
     * @param k
     */
    value: function addListener(fn, k) {
      // self.emit( 'addListener', k );
      this.listeners.unshift( fn );
    },
    enumerable: false
  },
  stepComplete: {
    /**
     * Single Step Complete
     *
     * @method stepComplete
     * @param k
     * @param args
     */
    value: function stepComplete( k, args ) {
      // self.emit( 'step_complete', k, args );

      // Get just the methods from each step
      Auto.each( this.listeners.slice(0), function( fn ) {
        fn();
      });

    }
  }
});

Object.defineProperties( module.exports = Auto, {
  defaults: {
    value: {
      timeout: 5000
    },
    enumerable: true,
    writable: true,
    configurable: false
  },
  emitter: {
    value: require( 'object-emitter' ),
    enumerable: false
  },
  setImmediate: {
    value: function setImmediate( fn ) {

      if( process && process.nextTick ) {
        return process.nextTick( fn );
      }

      setTimeout( function() { fn() }, 0 )

    },
    enumerable: false
  },
  each: {
    value: function each(arr, iterator) {
      if (arr.forEach) { return arr.forEach(iterator); }
      for (var i = 0; i < arr.length; i += 1) { iterator(arr[i], i, arr); }
    },
    writable: true
  },
  reduce: {
    value: function reduce(arr, iterator, memo) {
      if (arr.reduce) { return arr.reduce(iterator, memo); }
      Auto.each(arr, function (x, i, a) { memo = iterator(memo, x, i, a); });
      return memo;
    },
    writable: true
  },
  extend: {
    value: require( 'extend' ),
    enumerable: false
  },
  active: {
    value: {},
    enumerable: true,
    writable: true,
    configurable: false
  },
});
