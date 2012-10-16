var mc = require('../index.js')
, Memcached = require('memcached')
, test = require('tap').test
;


test("test can use with memcache driver!",function(t){
  var server = mc.server();
  server.listen(0,function(){

    var memcached = new Memcached("localhost:"+server.address().port);
    
    var v = Date.now();
    memcached.set('a',v,1,function(err,data){

      t.ok(!err,'set should not have error');

      memcached.get('a',function(err,value){

        t.ok(!err,'get should not have error');
        t.equals(value,v,'should return the correct value');

        memcached.end();
        server.close();

        t.end();
      });
    });

  });


});



