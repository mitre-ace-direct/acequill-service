module.exports = {
<<<<<<< HEAD
    host: process.env.REDIS_HOST || "<REDIS HOST IP>", // Set string if not using ENV
    port: process.env.REDIS_PORT ||  "<REDIS PORT>", // Set string if not using ENV
    auth: process.env.REDIS_AUTH ||  "<REDIS_AUTH>", // Set string if not using ENV
    hashname: process.env.REDIS_HASHNAME ||  "<REDIS HASH NAME>", // Set string if not using ENV
}
=======
    host: process.env.REDIS_HOST || "<redis hostname or ip>", // Set string if not using ENV
    port: process.env.REDIS_PORT ||  "<redis port>", // Set string if not using ENV
    auth: process.env.REDIS_AUTH ||  "<auth if required>", // Set string if not using ENV
    keyname: process.env.REDIS_KEYNAME ||  "extensionToLanguage", // Set string if not using ENV
}
>>>>>>> d7b374cb34b8abed5524a1f5b8fc8c4109168aa7
