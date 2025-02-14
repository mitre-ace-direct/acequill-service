const LanguageTranslatorV3 = require('ibm-watson/language-translator/v3');
const { IamAuthenticator } = require('ibm-watson/auth');
const configs = require('./../config/watson');

function Watson() {
    this.iam_apikey = configs.translation_apikey;
    this.url = configs.translation_url;
    this.proxy = configs.proxy || false;
    this.proxy_port = configs.proxy_port || false;
    this.version = '2018-05-01';
};

Watson.prototype.translate = function (text, source, target, callback) {
    var iamParams = {
        apikey: this.iam_apikey,
    }
    var translationParams = {
        version: this.version,
        url: this.url,
    }

    if (this.proxy) {
        const tunnel = require('tunnel');
        const agent = tunnel.httpsOverHttp({
            proxy: {
                host: this.proxy,
                port: this.proxy_port
            }
        });


        iamParams.httpsAgent = agent;
        iamParams.proxy = false;
        translationParams.httpsAgent = agent;
        translationParams.proxy = false;
    } else {
        iamParams.disableSslVerification = true
    }

    translationParams.authenticator = new IamAuthenticator(iamParams);


    const languageTranslator = new LanguageTranslatorV3(translationParams);

    var inputs = {
        text: text
    }
    inputs.source = source || null;
    inputs.target = target || null;
    languageTranslator.translate(inputs)
        .then(resp => {
            callback(null, resp.result.translations[0].translation)
        })
        .catch(error => {
            console.log("Error", error)
            callback(error, text);
    });
};

module.exports = Watson;
