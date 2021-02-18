/*
                                 NOTICE

This (software/technical data) was produced for the U. S. Government under
Contract Number HHSM-500-2012-00008I, and is subject to Federal Acquisition
Regulation Clause 52.227-14, Rights in Data-General. No other use other than
that granted to the U. S. Government, or to those acting on behalf of the U. S.
Government under that Clause is authorized without the express written
permission of The MITRE Corporation. For further information, please contact
The MITRE Corporation, Contracts Management Office, 7515 Colshire Drive,
McLean, VA 22102-7539, (703) 983-6000.

                        ©2018 The MITRE Corporation.
*/
var SpeechToTextV1 = require('ibm-watson/speech-to-text/v1');
var fs = require('fs');
var GrowingFile = require('growing-file');
const { IamAuthenticator } = require('ibm-watson/auth');
<<<<<<< HEAD
=======
const configs = require('./../config/watson');

>>>>>>> d7b374cb34b8abed5524a1f5b8fc8c4109168aa7

function Watson(file, langCd) {
    this.file = file;
    this.iam_apikey = configs.iam_apikey;
    this.url = configs.url;
    this.proxy = configs.proxy;
    this.proxy_port = configs.proxy_port;
    this.contentType = "audio/wav; rate=16000";
    this.smart_formatting = true;
    this.interminResults = true;
    this.objectMode = true;
<<<<<<< HEAD
    this.language = getCodes(configs.langCd);
=======
    this.language = getCodes(langCd);
>>>>>>> d7b374cb34b8abed5524a1f5b8fc8c4109168aa7
}

Watson.prototype.start = function (callback) {
    var speechToTextParams = {
        url: this.url
    };

    var iamParams = {
       apikey: this.iam_apikey
    };

    if (this.proxy) {
        var tunnel = require('tunnel');
        var agent  = tunnel.httpsOverHttp({
            proxy: {
                host: this.proxy,
                port: this.proxy_port,
            },
        });
        iamParams.httpsAgent = agent;
        iamParams.proxy = false;
        speechToTextParams.httpsAgent = agent;
        speechToTextParams.proxy = false; 
   }

    let gf = GrowingFile.open(this.file, {
        timeout: 25000,
        interval: 100
    });

    speechToTextParams.authenticator = new IamAuthenticator(iamParams);

    var speech_to_text = new SpeechToTextV1(speechToTextParams);
 
    var recognizeStream = speech_to_text.recognizeUsingWebSocket({
        content_type: this.contentType,
        smartFormatting: this.smart_formatting,
        interimResults: true,
        objectMode: true,
        model: (this.language.model) ? this.language.model : 'en-US_Broadband',
        dialect: (this.language.dialect) ? this.language.dialect : 'en-US',

    }).on('data', function (data) {
        console.log('In data handler');

        if (data.results[0]) {
            var results = {
                'transcript': data.results[0].alternatives[0].transcript,
                'final': data.results[0].final,
                'timestamp': new Date()
            };

            console.log('results:' + results);
            callback(results);
        }

    }).on('open', function () {
        console.log("Websocket to watson is open. Resume GrowingFile.");
        gf.resume();
    }).on('error', function (err) {
        console.log(err.toString());
    }).on('close', function(){
        console.log("Websocket has closed");
        gf.destroy();
    });


    //  _write is usually reserved for piping a filestream
    // due to an issue with back pressure callback not unpausing
    // the data stream pipe() was switched to this event handler
    var first = true;
    gf.on('data', (data) => {
        // callback is required by _write, omitting it will crash the service.
        recognizeStream._write(data, null, function () {
            return true;
        });
        if (first) {
            gf.pause();
            first = false;
        }
    }).on('end', () => {
        console.log('FILE HAS ENDED');
        recognizeStream.finish();
    });

};

function getCodes(langCd) {
    let codes = {
        dialect: "en-US",
        model: "en-US_BroadbandModel"
    };
    switch (langCd) {
<<<<<<< HEAD
        case 'en':
            codes.dialect = "en-US";
            codes.model = "en-US_BroadbandModel";
            break;
        case 'es':
            codes.dialect = "es-US";
            codes.model = "es-MX_BroadbandModel";
            break;
=======
        case 'en': // English US
            codes.dialect = "en-US";
            codes.model = "en-US_BroadbandModel";
            break;
        case 'es': // Spanish (Mexican)
            codes.dialect = "es-US";
            codes.model = "es-MX_BroadbandModel";
            break;
        case 'ar': // Arabic (Modern Standard)
            codes.dialect = "";
            codes.model = "ar-AR_BroadbandModel";
            break;
        case 'br': // Brazilian Portuguese
            codes.dialect = "";
            codes.model = "pt-BR_BroadbandModel";
            break;
        case 'cn': // Chinese (Mandarin)
            codes.dialect = "";
            codes.model = "zh-CN_BroadbandModel";
            break;
        case 'nl': // Dutch
            codes.dialect = "";
            codes.model = "nl-NL_BroadbandModel";
            break;
        case 'fr': // French
            codes.dialect = "";
            codes.model = "fr-FR_BroadbandModel";
            break;
        case 'de': // German
            codes.dialect = "";
            codes.model = "de-DE_BroadbandModel";
            break;
        case 'it': // Italian
            codes.dialect = "";
            codes.model = "it-IT_BroadbandModel";
            break;
        case 'jp': // Japanese
            codes.dialect = "";
            codes.model = "ja-JP_BroadbandModel";
            break;
        case 'kr': // Korean
            codes.dialect = "";
            codes.model = "ko-KR_BroadbandModel";
            break;
>>>>>>> d7b374cb34b8abed5524a1f5b8fc8c4109168aa7
    }
    console.log(langCd)
    console.log(JSON.stringify(codes))
    return codes;
}


module.exports = Watson;
