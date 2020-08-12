module.exports = {
    host: process.env.REDIS_HOST || "<REDIS HOST IP>", // Set string if not using ENV
    port: process.env.REDIS_PORT ||  "<REDIS PORT>", // Set string if not using ENV
    auth: process.env.REDIS_AUTH ||  "<REDIS_AUTH>", // Set string if not using ENV
    hashname: process.env.REDIS_HASHNAME ||  "<REDIS HASH NAME>", // Set string if not using ENV
}