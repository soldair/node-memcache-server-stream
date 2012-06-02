var mc = require('./mc.js')
,lru = require('lru-cache')
;

var server = mc(lru(1000));

console.log(server.emit);




