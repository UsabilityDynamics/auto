/**
 * Auto Batch
 *
 * @param options
 * @returns {autoBatch}
 */
function autoBatch( options ) {

  options = 'object' === typeof options ? options : {};

  var self = this;

  Object.defineProperties( this, {
    __cargo: {
      value: this.utility.cargo( function( tasks, callback ) {
        self.debug( 'Processing batch, callback [%s].', typeof callback );
        self.process( tasks, callback.bind( self ) );
      }),
      enumerable: false,
      configurable: true,
      writable: true
    },
    process: {
      value: options.process || function() {},
      enumerable: true,
      writable: false
    },
    payload: {
      get: function payload() {
        return this.__cargo.payload ? this.__cargo.payload : options.payload;
      },
      enumerable: true
    },
    empty: {
      value: options.empty || function() {},
      enumerable: true,
      writable: true
    },
    saturated: {
      value: options.saturated || function() {},
      enumerable: true,
      writable: true
    },
    drain: {
      value: options.drain || function() {},
      enumerable: true,
      writable: true
    },
    debug: {
      value: this.utility.debug( 'auto.autoBatch' ),
      enumerable: false,
      configurable: true,
      writable: true
    }
  });

  self.__cargo.payload = this.payload || 10;
  this.__cargo.saturated = this.saturated;
  this.__cargo.empty = this.empty;
  this.__cargo.drain = self.drain;

  //this.debug( 'New instance created.' );

  return this;

}

Object.defineProperties( autoBatch.prototype, {
  push: {
    value: function push( data, callback ) {
      this.debug( 'Data pushed.', typeof data );
      this.__cargo.push( data, callback );
    },
    enumerable: true,
    configurable: true,
    writable: true
  },
  unshift: {
    value: function unshift( data, callback ) {
      this.debug( 'Data unshifted.', typeof data );
      this.__cargo.tasks.push( data, callback );
    },
    enumerable: true,
    configurable: true,
    writable: true
  },
  utility: {
    value: {
      "debug": require( 'debug' ),
      "cargo": require( 'async' ).cargo,
      "fk": require( 'foreign-key' )
    },
    enumerable: false,
    writable: true
  }
});

Object.defineProperties( module.exports = autoBatch, {
  create: {
    /**
     * Create New Instance
     *
     * @param options
     * @returns {autoBatch}
     */
    value: function create( options ) {
      return new autoBatch( options );
    },
    enumerable: true,
    configurable: true,
    writable: true
  }
});