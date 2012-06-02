var EventEmitter = require('events').EventEmitter,
crypto = require('crypto')
;

module.exports = function(cache){
  return new Mc(cache);  
}

module.exports.Mc = Mc;

function Mc(cache){
  EventEmitter.call(this);
  this.cache = cache;
  //else this.cache = cache(1000000,function (item) { return item.length });
}

require('util').inherits(Mc,EventEmitter);

// memcache server treats a ttl value less than or equal to this value as offset seconds from now.
// else its considered a unix timestamp.
var SECONDS_MONTH = 60*60*24*30; 

mix(Mc.prototype,{
  // the instance of a cache object
  cache:null,
  //the remaining bytes in the command buffer after each data event while in command state
  cmdbuffer:'',
  // current set key state for getting data from the client
  dataobj:null,
  // the data currently being set.
  databuffer:'',
  // when setting data is the data is supposed to set append or prepend a cache value
  datamode:null,
  // how many bytes to expect
  databytes:0,
  // the current state =)
  state:'command',
  //stream writey method
  writeable:true,
  write:function(buf) {
    if(this.ended) return false;
    
    if(this.state == 'command') {
      this.cmdbuffer += buf.toString('utf8');
      var z = this
      ,parts = z.cmdbuffer.split("\r\n")
      ,cmd = false;
      
      if(parts.length > 1) {
        cmd = parts.shift();
      }

      remaining = parts.join("\r\n");
      try{
        var args = cmd.split(' ');
        console.log('processing command args');
        console.log(args);

        if(this.cmd(args)) {
          this.cmdbuffer = remaining;
        } else {
          buf = new Buffer(remaining);
        }
      } catch (e){
        this.sendline('SERVER_ERROR '+e.message);
        console.log('SERVER_ERROR',e.message,e.stack);
        process.nextTick(function(){
          z.end();
        });
        this.cmdbuffer = remaining;
      }
    } 
   
    if (this.state == 'data'){
      this.data(buf);
    }
  },
  //
  //protocol implementation
  //
  cmd:function(args) {
    var z = this;
    // <command name> <key> <flags> <exptime> <bytes> [noreply]\r\n
    switch(args[0]) {
      case "set":
        //the key to set
        if(args[1] === undefined) return this.cmd(['error']);
        //the int flags
        args[2] = parseInt(args[2]);
        if(isNaN(args[2])) return this.cmd(['error']);
        //the int exp time
        args[3] = parseInt(args[3]);
        if(isNaN(args[3])) return this.cmd(['error']);
        //the int bytes
        args[4] = parseInt(args[4]);
        if(isNaN(args[4])) return this.cmd(['error']);
        
        this.dataobj = this.obj(args[1],args[2],args[3]);
        this.databytes = args[4];
        this.state = 'data';
        return false;
      case "get":
      case "gets":
        //VALUE <key> <flags> <bytes> [<cas unique>]\r\n
        //<data block>\r\n
        var cmd = args.shift();
        args.forEach(function(key,k){
          var obj = z.get(key);
          if(obj) {
            z.sendline("VALUE "+obj.key+" "+obj.flags+" "+obj.length+(cmd === 'gets'?' '+obj.cas:''));
            z.sendline(obj.value);
          }
        });
        z.sendline("END");
        return true;
      case "quit":
        this.end();
        return true;
      default:
        z.sendline('ERROR');
        return true;
    }
  },
  data:function(buf){
    var length = this.databuffer.length+buf.length;
    if(buf instanceof Buffer) {
      buf = buf.toString('utf8');
    }

    console.log('recv data ',buf.length);
    this.databuffer += buf;

    if(length >= this.databytes) {
      var value = this.databuffer.substr(0,this.databytes);
      console.log('storing ',value);

      this.dataobj.value = value;//new Buffer(this.databuffer.slice(0,this,databytes));

      this.set(this.dataobj.key,this.dataobj);
      this.sendline('STORED');

      this.cmdbuffer = this.databuffer.substr(this.databytes);
      this.state = 'command';

      if(this.cmdbuffer.substr(0,2) == "\r\n") {
        this.cmdbuffer = this.cmdbuffer.substr(2);
      } 
      console.log('setting command buffer to ',this.cmdbuffer);

      this.databuffer = '';
    }
  },
  //
  // cache instance manipulation 
  //  applies seconds to miliseconds conversion.
  //
  ttl:function(ttl){
      var result = (ttl<=SECONDS_MONTH?Date.now()+(ttl*1000):ttl*1000);
      console.log('input ttl ',ttl);
      console.log('resulting ttl ',result);
      console.log(result-Date.now(),' ms remaining');
      return result;
  },
  get:function(key){
      console.log('looking for key ',key,' in cache');
      //get item from internal cache if not expired
      var obj = this.cache.get(key);
      console.log('found: ',obj);
      if(obj && obj.ttl < Date.now()){
        console.log(key,' is expired ',obj.ttl,' < ',Date.now());
        return undefined;
      }
      return obj;
  },
  set:function(key,obj){
      console.log('STORING ',key,obj);
      //set item in cache
      this.cache.set(key,obj);
  },
  obj:function(key,flags,ttl){
    //create cache object template.
    var buf
    ,z = this
    ;

    return {
      key:key,
      cas:null,
      length:0,
      ttl:this.ttl(ttl),
      flags:flags,
      get value(){
        return buf;
      },
      set value(val,mode){
        buf = mode=='append'?buf+val:(mode=='prepend'?val+buf:val);
        this.cas = z.hash(buf);
        this.length = buf.length;
      }
    };
  },
  hash:function(val){
    var hash = crypto.createHash('sha256');
    hash.update(val);
    return hash.digest('hex');   
  },
  //
  //more writey stream methods.
  //
  sendline:function(line){
    var args = Array.prototype.slice.call(arguments)
    ,z = this
    ;

    args.forEach(function(buf){
      if(buf instanceof Buffer){
        z.send(buf);
        z.send('\r\n');
      } else {
        z.send(buf+"\r\n");
      }
    });

  },
  send:function(data){
    //send data to client. only \r\n to un buffers
    if(!data instanceof Buffer){
      data = new Buffer(data);
    }

    this.emit('data',data);
  },
  end:function(){
    this.ended = false;
    this.emit('end');    
  }
});


function mix(o1,o2){
  for(var i in o2) {
    if(o2.hasOwnPropery){
      if(o2.hasOwnPropery(i)){
        o1[i] = o2[i];
      }
    } else {
      //getter setter
      o1[i] = o2[i];
    }
  }
};
