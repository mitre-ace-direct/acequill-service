module.exports = {
    host: process.env.REDIS_HOST || "172.21.1.83", // Set string if not using ENV
    port: process.env.REDIS_PORT ||  "6379", // Set string if not using ENV
    auth: process.env.REDIS_AUTH ||  "NotUsedInDevEnvironment", // Set string if not using ENV
    hashname: process.env.REDIS_HASHNAME ||  "ec2-user_extensionToLanguage", // Set string if not using ENV
}
