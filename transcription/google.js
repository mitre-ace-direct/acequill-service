var Speech = require('@google-cloud/speech');
var GrowingFile = require('growing-file');
var unpipe = require('unpipe');
const speech = new Speech.SpeechClient();
const maxTimeoutForReconnect = 45000;
const growingFileOffset = -5000;

function Google(file, languageCode, liveFile = true) {
    this.file = file;
    this.gfWavPolling = null;
    this.growingWav = null;
    this.lastResults = {};
    this.liveFile = liveFile
    this.request = {
        config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: getCodes(languageCode),
            profanityFilter: true,
        },
        interimResults: true,
        verbose: true
    };
};

Google.prototype.start = function (callback) {
    this.done = false;
    this.growingWav = GrowingFile.open(this.file,
        {
            timeout: maxTimeoutForReconnect + growingFileOffset,
            interval: 100
        });
    this.growingWav.pipe(this.speechStream(callback));
    this.gfWavPolling = setTimeout(this.reconnectStreams, maxTimeoutForReconnect, this,
                  "timeout", callback);

    this.growingWav.on('end', () => {
        console.debug("clearing reconnection timer");
        clearTimeout(this.gfWavPolling);
        this.done = true;
        callback({end: true});
    });
};

Google.prototype.reconnectStreams = function (that, reason, callback) {
    clearTimeout(that.gfWavPolling);
    unpipe(that.growingWav);
    if (!that.done) {
        console.debug("google started new stream because of " + reason);
        var gstream = that.speechStream.call(that, callback);
        that.growingWav.pipe(gstream);
        that.gfWavPolling = setTimeout(that.reconnectStreams, maxTimeoutForReconnect,
                      that, "timeout", callback);
    }
};

Google.prototype.speechStream = function (callback) {
    return speech.streamingRecognize(this.request)
        .on('error', (error) => {
            console.error("Google Error: " + error);
            console.debug('What should I do?');
        })
        .on('data', (data) => {
            if (!data.error) {
                if (data.results[0]) {
                    var results = {
                        'transcript': data.results[0].alternatives[0].transcript,
                        'final': data.results[0].isFinal,
                        'timestamp': new Date(),
                        'raw': JSON.stringify(data),
                    };
                    if (results.final) {
                        if(this.liveFile)
                            this.reconnectStreams(this, "final", callback);
                    }
                    this.lastResults = results;
                    callback(results);
                }
            } else {
                console.error("Error: " + JSON.stringify(data));
                console.debug('Stopping Google STT due to error');
                if (data.error.code === 11) {
                    if (this.lastResults.final === false) {
                        console.debug('a FORCED final');
                        this.lastResults.final = true;
                        callback(this.lastResults);
                    }
                    if(this.liveFile)
                        this.reconnectStreams(this, "Restartable Error", callback);
                } else {
                    this.done = true;
                }
            }
        });
};

function getCodes(langCd) {
    let code = "en-US"

    
    switch (langCd) {
        case 'en': // English US
            code = "en-US"
            break;
        case 'es': // Spanish (Mexican)
            code = "es-US"
            break;
        case 'ar': // Arabic (Modern Standard)
            codes.dialect = "";
            codes.model = "ar-AR_BroadbandModel";
            break;
        case 'br': // Brazilian Portuguese
            code = "pt-BR"
            break;
        case 'cn': // Chinese (Mandarin)
            code = "zh"
            break;
        case 'nl': // Dutch
            code = "nl-NL"
            break;
        case 'fr': // French
            codes.dialect = "";
            codes.model = "fr-FR_BroadbandModel";
            break;
        case 'de': // German
            code = "de-DE"
            break;
        case 'it': // Italian
            code = "it-IT"
            break;
        case 'jp': // Japanese
            code = "ja-JP"
            break;
        case 'kr': // Korean
            code = "ko-KR"
            break;
    }
    return code;
}

module.exports = Google;

//var test1 = new Google('../public/sounds/rain_in_spain.wav');
//test1.start(function(data){console.log(data)});


