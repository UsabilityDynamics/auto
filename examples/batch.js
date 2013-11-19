// Create Request Queue
var request   = require( 'request' );
var auto      = require( 'auto' );
var colors    = require( 'colors' );

// Create Request Queue
var batch = auto.createBatch({
  payload: 10,
  //saturated: function saturated() { console.log( 'saturated' ); },
  //empty: function saturated() { console.log( 'empty' ); },
  process: function process( items, done ) {
    // console.log( 'Processing items.' );

    var body = [];

    // Build the crazy format ElasticSearch wants
    for( var i in items ) {

      body.push( JSON.stringify({
        "index" : {
          "_index": items[i].index || 'autobatch-test',
          "_type": items[i].type ||  'user-card',
          "_id": items[i].id || null
        }
      }) );

      body.push( JSON.stringify( items[i], false, 0 ) );

    }

    request({
      url: 'http://localhost:9200/_bulk',
      method: 'post',
      json: true,
      body: body.join( "\n" ) + "\n"
    }, done );

  }
});

console.log( batch );

// Add Chevy
batch.push({ index: 'cars', type: 'chevy', id: 'tahoe', color: 'black', year: 2010 }, function done( error, response, body ) {
  console.log( error ? error.message : 'Added Chevy [%s].', body ? body.items[0].index._id : null );
});

// Add BMW before Chevy
batch.push({ index: 'cars', type: 'bmw', id: '323i', color: 'black', year: 2000 }, function done( error, response, body ) {
  console.log( error ? error.message : 'Added BMW [%s].', body ? body.items[1].index._id : null  );
});
