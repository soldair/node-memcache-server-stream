var net = require('net')
,lruCache = require('lru-cache')
,getmc = require('./mc.js')
;

var cache = lruCache(1000000,function (item) { return item.length });

var server = net.createServer(function(con){
  console.log('new connection!');

  var mc = getmc(cache);
  con.on('data',function(buf){
     mc.write(buf);
  }); 

  mc.on('data',function(buf){
    console.log('sending data! ',buf);
    con.write(buf);
  });

  mc.on('end',function(){
    con.end();
  });

});

server.listen(11200,function(){
    console.log('node mock memcache server running on 11200');
});







