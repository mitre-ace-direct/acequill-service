"use strict";

var fs = require('fs');
var ini = require('ini');

//const manager_conf = './config/manager.conf';
const manager_conf = '/etc/asterisk/manager.conf';
var config = ini.parse(fs.readFileSync(manager_conf, 'utf-8'));
var user, password;
var sections = Object.keys(config);

for (let el of sections) {
    if (config[el].secret) {
        user = el;
        password = config[el].secret;
        break;
    }
}

if(!user){
    console.log("---Cannot find Asterisk AMI configurations---");
    process.exit();
}

module.exports = {
    "port":config.general.port,
    "host":"localhost",
    "user": user,
    "password": password
};

