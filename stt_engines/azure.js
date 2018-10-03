"use strict";

var stt = require('./BingStt/BingSpeechWebSocketAPIWrapper.js');
var fs = require('fs');

const maxTimeoutForReconnect = 60000;
var GrowingFile = require('growing-file');


class Azure {
    constructor(config) {
        this.file = config.file;
        this.token = config.token;
        this.growingWav = null;
        this.rs = null;
        this.stt = null;
    }

    start(callback) {
        console.log('start');
        this.stt = new stt(this.token, {
            format: 'simple',
            language: 'en-US'
        });

        this.registerHandlers(callback);
        this.stt.open();
    }



    registerHandlers(callback) {
        this.stt.on('connect', () => {
            console.log("New connect");
            if (this.growingWav === null) {
                this.growingWav = GrowingFile.open(this.file, {
                    timeout: maxTimeoutForReconnect,
                    interval: 100
                });
                this.stt.startDetection(this.growingWav);
            }
        });

        this.stt.on('recognized', (data) => {
            if (data.RecognitionStatus === 'Success') {
                var results = {
                    'transcript': data.DisplayText,
                    'guid': data.Guid,
                    'final': true,
                    'timestamp': new Date()
                };
                callback(results);
            }
        });

    }
}

module.exports = Azure;