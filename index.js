var duplex = require('duplex');
var mc = require('./mc.js');

// exports a function that returns a new memcache server stream
module.exports = function(cache){

  var c = mc(cache)
  ,d = duplex();

  d.on('_data',function(buf){
    c.write(buf)
  }).on('_end',function(){
    c.end();
  });
  
  c.on('data',d._data).on('log',function(message){
    d.emit('log',message);
  });

  d.mc = c;

  return d;
}

module.exports.mc = require("./mc.js");
// exports a function that returns a node net server pre-piped to a memcache server stream parser but not listening
module.exports.server = require("./server.js");
