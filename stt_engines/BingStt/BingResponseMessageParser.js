"use strict";

var events = require('events');
var util = require('util');

function BingResponseMessage(){

}

var dict = {};
util.inherits(BingResponseMessage, events.EventEmitter);

BingResponseMessage.prototype.parse = function(message){
    
    var lines = message.split("\r\n");
    lines.forEach(function(element) {
        //console.log(element);
        var s = new String(element);
        if(s.startsWith("{")){
            dict['body'] = s;
            //dict.push({key:'body', value:s});
        }else{
            var header = s.split(":");
            if(header.length === 2){
                //var kv = {key : header[0].trim().toLowerCase(), value: header[1].trim() };
                //dict.push(kv);
                dict[header[0].trim().toLowerCase().replace('-','')] = header[1].trim();
            }
        }
    }, this);

   //console.log(dict);
};
BingResponseMessage.prototype.item = function(key){
    return dict[key.trim().toLowerCase().replace('-','')];
};
module.exports = BingResponseMessage;