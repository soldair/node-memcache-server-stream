
[![Build Status](https://secure.travis-ci.org/soldair/node-memcache-server-stream.png)](http://travis-ci.org/soldair/node-memcache-server-stream)

#memcache-server-stream

memcache server protocol implemented on top of a duplex stream. add memcache protocol support to any node net.Server

##examples

as a stream just pipe!

```js

var mc = require('memcache-server-stream');

con.pipe(mc()).pipe(con);

```

for a simple server you can just use


```js


var mc = require('memcache-server-stream');

var server = mc.server()

server.listen(11200,function(){
  console.log('ready for connections from memcache clients');
})


```

##api

mc = exports function(cache object [optional])
  - duplex stream ready for reading an writing memcache protocol

mc.server(cache object [optional])
  - handy dandy pre-made net server setup to handle all connections

mc.mc(cache object [optional])
  - factory for underlying protocol implementation

mc.mc.Mc
  - contructor for underlying protocol implementation

"cache object"
  - defaults to issacs lru-cache module
  - must support sync get/set as functions at this time.
