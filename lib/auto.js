/**
 * auto Module
 *
 * -
 *
 * @module auto
 * @constructor
 * @author potanin@UD
 * @date 8/5/13
 * @type {Object}
 */
function auto( tasks, finalCallback, settings ) {

  // Ensure always using new instance of auto
  if( !( this instanceof auto ) ) {

    if( arguments.length === 0 ) {
      return {};
    }

    if( arguments.length === 1 ) {
      return new auto( tasks );
    }

    if( arguments.length === 2 ) {
      return new auto( tasks, finalCallback );
    }

    if( arguments.length === 3 ) {
      return new auto( tasks, finalCallback, settings );
    }

  }

  // Extend this with Event Emitter
  auto.emitter.mixin( this );

  // Set Instance Properties.
  Object.defineProperties( this, {
    id: {
      /**
       *
       * @property id
       */
      value: Math.random().toString( 36 ).substring( 7 ),
      enumerable: true,
      configurable: true,
      writable: true
    },
    tasks: {
      /**
       *
       * @property tasks
       */
      value: tasks,
      enumerable: true,
      configurable: true,
      writable: true
    },
    finalCallback: {
      /**
       *
       * @property finalCallback
       */
      value: arguments[1] instanceof Function ? arguments[1] : function defaultCallback() {},
      enumerable: true,
      configurable: true,
      writable: true
    },
    settings: {
      /**
       *
       * @property settings
       */
      value: auto.extend( {}, auto.defaults, arguments.length === 3 ? settings : 'function' !== typeof finalCallback ? finalCallback : {}),
      enumerable: true,
      configurable: true,
      writable: true
    },
    request: {
      /**
       *
       * @property request
       */
      value: {},
      enumerable: false,
      configurable: true,
      writable: true
    },
    response: {
      /**
       *
       * @property response
       */
      value: {},
      enumerable: false,
      configurable: true,
      writable: true
    },
    customResponse: {
      /**
       *
       * @property customResponse
       */
      value: {},
      enumerable: false,
      configurable: true,
      writable: true
    },
    listeners: {
      /**
       *
       * @property listeners
       */
      value: [],
      enumerable: false,
      configurable: true,
      writable: true
    },
    error: {
      /**
       *
       * @property error
       */
      value: null,
      enumerable: true,
      configurable: true,
      writable: true
    },
    keys: {
      /**
       *
       * @property error
       */
      get: function() {
        return Object.keys( this.tasks );
      },
      enumerable: false,
      configurable: true
    },
    _events: {
      /**
       * EventEmitter (object-emitter) Event Pool
       *
       * @property events
       */
      value: this._events,
      configurable: true,
      enumerable: false,
      writable: true
    },
    _meta: {
      /**
       *
       * @property _meta
       */
      get: function() {

        return {
          started: new Date().getTime(),
          timeout: new Date().getTime() + this.settings.timeout
        }

      },
      enumerable: false,
      configurable: true
    }
  });

  // Ensure there are tasks
  if( !this.keys.length ) {

    process.nextTick( function() {
      this.emit( 'complete', null, {});
    }.bind( this ));

    return this.finalCallback( null, {} );

  }

  // Add Final Listener.
  this.addListener( this.onComplete );

  // Iterate through keys
  this.each( this.keys, this.taskIterator );

  // Add to running queue and return instance.
  return auto.active[ this.id ] = this;

}

/**
 * Instance Properties.
 *
 */
Object.defineProperties( auto.prototype, {
  debug: {
    /**
     *
     * @property debug
     */
    value: require( 'debug' )( 'auto' ),
    enumerable: false,
    writable: true
  },
  set: {
    /**
     * Set Custom Response Property.
     *
     * @method set
     */
    value: function set( key, value ) {
      this.debug( 'set: Setting task #[%s] response value manually.', this.id, typeof key );

      // Initialize Custom Response.
      if( 'object' === typeof key ) {
        return auto.extend( this.customResponse, key );
      }

      return this.customResponse[ key ] = value;


    },
    configurable: false,
    enumerable: false,
    writable: true
  },
  get: {
    /**
     * Get Custom Response Property.
     *
     * @method set
     */
    value: function get( key, _default ) {

      // If custom responses are used, return response from custom response object.
      if( this.customResponse ) {
        return this.customResponse[ key ] || _default;
      }

      // Return value from response object.
      return this.response[ key ] || _default;

    },
    configurable: false,
    enumerable: false,
    writable: true
  },
  taskIterator: {
    /**
     * Single Step (Task) Handler.
     *
     * @param key
     */
    value: function taskIterator( key ) {
      this.debug( 'taskIterator: Iterator for step [%s] on task #[%s].', key, this.id );

      var self = this;
      var task = this.tasks[key] instanceof Function ? [ this.tasks[key] ] : this.tasks[key];
      var requires = task.slice( 0, Math.abs( task.length - 1 ) ) || [];

      /**
       * Task Callback
       *
       * @todo Migrate into prototype.
       * @param error
       */
      function taskCallback( error ) {
        self.debug( 'taskCallback: Callback for step [%s] on task #[%s].', key, self.id );

        // Get response arguments
        var args = Array.prototype.slice.call( arguments, 1 );

        if( args.length <= 1 ) {
          args = args[0];
        }

        // Task Failure.
        if( error && error instanceof Error ) {

          var safeResults = {};

          // Get Enumerable Properties.
          self.each( Object.keys( self.response ), function( rkey ) {
            safeResults[rkey] = self.response[rkey];
          });

          safeResults[key] = args;

          // Emit task evnet and complete event
          self.emit( 'error', error, safeResults );
          self.emit( 'complete', error, safeResults );

          // Remove from active queue
          delete auto.active[ self.id ];

          // Trigger finalCallback
          self.finalCallback( error, safeResults );

          // stop subsequent errors hitting finalCallback multiple times
          self.finalCallback = function __fake_callback__() {
          };

        }

        // Task Success.
        if( !error ) {

          // Save task response to general response
          self.response[key] = args;

          self.setImmediate( self.stepComplete.bind( self, key, args ) );

        }

      }

      /**
       * Ready to Process a Step
       *
       * @todo Migrate into prototype.
       * @returns {*|boolean}
       */
      function ready() {

        // Identify Dependacncies with some form of magic
        var magic = self.reduce( requires, function( a, x ) {
          return ( a && self.response.hasOwnProperty( x ));
        }, true ) && !self.response.hasOwnProperty( key );

        // Step Ready
        self.emit( 'ready', key, magic );

        return magic;

      }

      /**
       * Process Actual Task.
       *
       */
      function process_task() {
        // console.log( 'running', key,  _method.name, _method.length );

        var _method = task[ task.length - 1 ];

        // Task Step Context
        var context = Object.create( null, {
          id: {
            /**
             *
             * @property id
             */
            get: function() {
              return self.id
            },
            enumerable: true,
            configurable: true
          },
          customResponse: {
            /**
             *
             * @property customResponse
             */
            get: function() { return self.customResponse },
            configurable: true,
            enumerable: true
          },
          request: {
            /**
             *
             * @property customResponse
             */
            get: function() { return self.request },
            configurable: true,
            enumerable: true
          },
          response: {
            /**
             *
             * @property customResponse
             */
            get: function() { return self.response },
            configurable: true,
            enumerable: true
          },
          debug: {
            /**
             *
             * @property debug
             */
            get: function() { return self.debug },
            configurable: true,
            enumerable: true
          },
          get: {
            /**
             *
             * @property debug
             */
            get: function() { return self.get },
            configurable: true,
            enumerable: true
          },
          set: {
            /**
             *
             * @property debug
             */
            get: function() { return self.set },
            configurable: true,
            enumerable: true
          },
          tasks: {
            /**
             *
             * @property tasks
             */
            get: function() { return self.tasks },
            configurable: true,
            enumerable: true
          },
          requires: {
            value: requires,
            configurable: true,
            enumerable: true,
            writable: true
          },
          task: {
            value: key,
            configurable: true,
            enumerable: true,
            writable: true
          },
          next: {
            value: taskCallback,
            configurable: true,
            enumerable: true,
            writable: true
          }
        });

        // assume: synchronous task
        if( _method.length === 0 ) {
          return taskCallback( null, _method.call( context ) );
        }

        // assume: [fn: callback]
        if( _method.length === 1 ) {
          return _method.call( context, taskCallback );
        }

        // assume: [ fn:callback, obj:report ]
        if( _method.length === 2 ) {
          return _method.call( context, taskCallback, self.response );
        }

        // assume: [ stream:req, stream: res, fn: next ]
        if( _method.length === 3 ) {
          return _method.call( context, self.request, self.response, taskCallback );
        }

      }

      // Trigger Method
      if( ready() ) {
        process_task();
      } else {

        // Create a listener to be checked later
        self.addListener( function listener() {

          if( ready() ) {
            self.removeListener( listener, key );
            process_task();
          }

        }, key );

      }

    },
    writable: false,
    enumerable: false,
    configurable: true
  },
  onComplete: {
    /**
     *
     *
     * @method onComplete
     */
    value: function onComplete() {
      this.debug( 'onComplete: Completed task #[%s]. Remaining listeners [%s].', this.id, this.listeners.length );

      if( Object.keys( this.response ).length !== this.keys.length ) {
        return;
      }

      // Will fire multiple times if not checked
      if( this.finalCallback.name === 'Placeholder' ) {
        return;
      }

      // All steps in task are complete
      this.emit( 'complete', null, Object.keys( this.customResponse ).length ? this.customResponse : this.response );
      this.emit( 'success', Object.keys( this.customResponse ).length ? this.customResponse : this.response );

      // Call finalCallback.
      this.finalCallback( null, Object.keys( this.customResponse ).length ? this.customResponse : this.response );

      // Remove from active queue
      delete auto.active[ this.id ];

      // Unset Callback
      this.finalCallback = function Placeholder() {};

    },
    writable: false,
    enumerable: false,
    configurable: true
  },
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
        if( this.listeners[i] === fn ) {
          this.listeners.splice( i, 1 );
          return;
        }
      }

    },
    writable: false,
    enumerable: false,
    configurable: true
  },
  setImmediate: {
    /**
     * Run Method on next tick
     *
     * @method setImmediate
     * @param fn
     * @returns {*}
     */
    value: function setImmediate( fn ) {

      if( process && process.nextTick ) {
        return process.nextTick( fn );
      }

      setTimeout( function() {
        fn();
      }, 0 )

    },
    writable: false,
    enumerable: false,
    configurable: true
  },
  each: {
    /**
     * Array Iterator
     *
     * @method each
     * @param arr
     * @param iterator
     * @returns {*}
     */
    value: function each( arr, iterator ) {

      if( arr.forEach ) {
        return arr.forEach( iterator.bind( this ) );
      }

      for( var i = 0; i < arr.length; i += 1 ) {
        iterator.bind( this )( arr[i], i, arr );
      }

    },
    writable: false,
    enumerable: false,
    configurable: true
  },
  reduce: {
    /**
     * Array Reduce
     *
     * @method reduce
     * @param arr
     * @param iterator
     * @param memo
     * @returns {*}
     */
    value: function reduce( arr, iterator, memo ) {

      if( arr.reduce ) {
        return arr.reduce( iterator, memo );
      }

      this.each( arr, function( x, i, a ) {
        memo = iterator( memo, x, i, a );
      });

      return memo;
    },
    writable: false,
    enumerable: false,
    configurable: true
  },
  addListener: {
    /**
     * Add Listener to Queue in context
     *
     * @method addListener
     * @param fn
     * @param k
     */
    value: function addListener( fn, k ) {
      // self.emit( 'addListener', k );
      this.listeners.unshift( fn.bind( this ) );
    },
    writable: false,
    enumerable: false,
    configurable: true
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
      this.debug( 'stepComplete: Completed step [%s] for task #[%s].', k, this.id );

      // Get just the methods from each step
      this.each( this.listeners.slice( 0 ), function( fn ) {
        fn();
      });

    },
    writable: false,
    enumerable: false,
    configurable: true
  }
});

/**
 * Constructor Properties
 *
 */
Object.defineProperties( module.exports = auto, {
  version: {
    value: require( '../package' ).version,
    enumerable: false,
    writable: false,
    configurable: false
  },
  createBatch: {
    /**
     * Create Batch Instance.
     *
     * Shortcut to auto.batch
     *
     * @param options
     * @returns {options|*}
     */
    value: function createBatch( options ) {
      return require( './auto.batch' ).create( options || {} );
    },
    writable: true,
    enumerable: false
  },
  middleware: {
    /**
     *
     * @param tasks
     * @param finalCallback
     * @param settings
     * @returns {Function}
     */
    value: function middleware( tasks, finalCallback, settings ) {

      return function middleware( req, res, next ) {

        var instance = auto( tasks, finalCallback, settings );

        instance.once( 'success', function complete( report ) {
          res.send( report );
        });

        instance.once( 'error', function error( error, report ) {
          next( error );
        });

      }

    },
    enumerable: true,
    writable: true,
    configurable: false
  },
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
    writable: true,
    enumerable: false
  },
  extend: {
    value: require( 'extend' ),
    enumerable: false,
    writable: true
  },
  active: {
    /**
     * Reference to Active Auto Queues.
     *
     * @property active
     */
    value: {},
    enumerable: true,
    configurable: false,
    writable: true
  }
});
