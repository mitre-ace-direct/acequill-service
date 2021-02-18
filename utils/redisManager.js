const redis = require("redis");
const config = require("./../config/redis.js");

function RedisManager() {
  this.client = redis.createClient(config.port,config.host);
  this.client.auth(config.auth);
  this.client.on("error", (err) => {console.log("Redis Connection Error"); process.exit(0);})
  this.client.on("connect", (err) => {console.log("Redis Connection Successful");})
}

RedisManager.prototype.getLanguageByExtension = function (ext, callback) {
<<<<<<< HEAD
        this.client.hget(config.hashname, ext, function (err, lang) {
=======
        this.client.hget(config.keyname, ext, function (err, lang) {
>>>>>>> d7b374cb34b8abed5524a1f5b8fc8c4109168aa7
          callback(lang || "en")
        });
}

module.exports = RedisManager;
