const redis = require("redis");
const config = require("./../configs/redis.js");

function RedisManager() {
  this.client = redis.createClient(config.port,config.host);
  this.client.auth(config.auth);
  this.client.on("error", (err) => {console.log("Redis Connection Error"); process.exit(0);})
  this.client.on("connect", (err) => {console.log("Redis Connection Successful");})
}

RedisManager.prototype.getLanguageByExtension = function (ext, callback) {
        this.client.hget(config.hashname, ext, function (err, lang) {
          callback(lang || "en")
        });
}

module.exports = RedisManager;