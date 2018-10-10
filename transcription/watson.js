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

var SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
var fs = require('fs');
var GrowingFile = require('growing-file');


function Watson(file, configs) {
    this.file = file;
    this.username = configs.username;
    this.password = configs.password;
    this.contentType = configs.contentType;
    this.smart_formatting = configs.smartFormatting;
};

Watson.prototype.start = function (callback) {

    var speech_to_text = new SpeechToTextV1({
        username: this.username,
        password: this.password
    });

    var recognizeStream = speech_to_text.createRecognizeStream({
        content_type: this.contentType,
        smart_formatting: this.smart_formatting
    }).on('results', function (data) {
        var results = {
            'transcript': data.results[0].alternatives[0].transcript,
            'final': data.results[0].final,
            'timestamp': new Date()
        };
        callback(results);
    }).on('error', function (err) {
        console.log('Watson Session Timeout');
    });

    GrowingFile.open(this.file, {
        timeout: 50000,
        interval: 100
    }).pipe(recognizeStream);
};


module.exports = Watson;