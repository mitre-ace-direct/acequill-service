 module.exports = {
    iam_apikey: process.env.WATSON_IAM_APIKEY || "<API KEY HERE>", // Set string if not using ENV
    url: process.env.WATSON_URL ||  "<WATSON URL HERE>", // Set string if not using ENV
    proxy: '<PROXY IP HERE>',
    proxy_port: '<PROXY PORT HERE>'
}
