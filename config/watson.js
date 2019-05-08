module.exports = {
    username: process.env.WATSON_USERNAME || "username-string", // Set string if not using ENV
    password: process.env.WATSON_PASSWORD || "password-string", // Set string if not using ENV
    contentType: "audio/wav; rate=16000",
    smartFormatting: true
}
