/**
 * Mocha Test for "Auto" API Methods
 *
 * mocha test/api.js --reporter list --ui exports --watch
 *
 * @author potanin@UD
 * @date 8/5/13
 * @type {Object}
 */
module.exports = {

  'Auto API': {

    /**
     * Basic Tests with settings argumetns
     *
     */
    'has expected properties': function() {

      var auto = require( '../' );

      // No arguments returns a plain object
      var instance = auto();

      instance.should.be.an.instanceOf( Object );

      Object.keys( instance ).length.should.equal( 0 );

      // Tasks and settings will use default callback
      var instance = auto( { one: function( next, report ) {
        next( null, 'one done' );
      } }, { test: true } );
      instance.should.have.property( 'settings' );
      instance.should.have.property( 'finalCallback' );
      instance.finalCallback.should.have.property( 'name', 'defaultCallback' );
      instance.settings.should.have.property( 'timeout', auto.defaults.timeout );
      instance.settings.should.have.property( 'test', true );

      // Tasks, callback and settings will use our callback and merge out settings with default
      var instance = auto( { one: function( next, report ) {
        next( null, 'one done' );
      } }, function ourCallback() {
      }, { test: true } );
      instance.should.have.property( 'settings' );
      instance.should.have.property( 'finalCallback' );
      instance.finalCallback.should.have.property( 'name', 'ourCallback' );
      instance.settings.should.have.property( 'timeout', auto.defaults.timeout );
      instance.settings.should.have.property( 'test', true );

    },

    /**
     * Test events
     *
     * @param done
     */
    'events work': function( done ) {
      var auto = require( '../' );

      var instance = auto( {
        one: function( next, report ) {
          // console.log( 'one' );

          setTimeout( function() {
            next( null, 'one done' );
          }, 10 )

        },

        two: function( next, report ) {
          // console.log( 'two' );

          setTimeout( function() {
            next( null, 'two done' );
          }, 20 )
        },

        three: [ 'one', 'two', function( next, report ) {
          // console.log( 'starting three' );
          next( null, 'three done' );
        }],
      } );

      instance.on( 'complete', done );

      instance.on( '**', function( data ) {
        // console.log( 'event:', this.event, data );
      } )

    },

    /**
     * Test Request Batching
     *
     * 100 records - 872ms
     *
     * @param done
     */
    'can batch.': function( test_done ) {

      // skip test
      return test_done();

      this.timeout( 100000 );

      var request = require( 'request' );
      var auto = require( '../' );
      var colors = require( 'colors' );
      var querystring = require( 'querystring' );
      var faker = require( 'faker' ).Helpers;

      var batch = auto.createBatch({
        payload: 20,
        saturated: function saturated() {
          console.log( 'saturated' );
        },
        empty: function empty() {
          //console.log( 'empty' );
        },
        drain: function drain() {
          //console.log( 'drain' );
        },
        process: function process( items, batch_done ) {
          //console.log( 'Processing cars.' );

          var body = [];
          var _header;

          // Build the crazy format ElasticSearch wants
          for( var i in items ) {

            body.push( JSON.stringify({
              "index" : {
                "_index": items[i]._index || 'autobatch-test',
                "_type": items[i]._type ||  'user-card',
                "_id": items[i]._id || null
              }
            }) );

            body.push( JSON.stringify( items[i], false, 0 ) );

          }

          request({
            url: 'http://localhost:9200/_bulk',
            method: 'post',
            json: true,
            headers: {},
            body: body.join( "\n" ) + "\n"
          }, function( error, res, body ) {

            body.should.have.property( 'took' );
            body.should.have.property( 'items' );

            batch_done( null, res, body );
            //test_done()

          });

        }

      });

      require( 'async' ).timesSeries( 100, function( n, next ) {

        batch.push( faker.createCard(), function done( error, response, body ) {
          //console.log( 'Processed [%d] items in [%d].', body.items.length, body.took );
          //console.log( error ? error.message : 'Added item [%s].', body ? body.items[0].index._id : null );
        });

        setTimeout( function() {
          next( null, true );
        }, 10 )

        //console.log( batch.payload );

      }, function( error, items ) {
        //console.log( 'done', items.length  );
        test_done()
      });

    }

  }

};