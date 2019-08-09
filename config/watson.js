 module.exports = {
    iam_apikey: process.env.WATSON_IAM_APIKEY || "uM4obmJ2m0-wU7NsHQz-9BLbggHtKo0QrsE6lXrt9ptR", // Set string if not using ENV
    url: process.env.WATSON_URL ||  "https://gateway-wdc.watsonplatform.net/speech-to-text/api", // Set string if not using ENV
    proxy: '10.202.1.215',
    proxy_port: '3128'
}
