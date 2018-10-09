

var asteriskManager = require('asterisk-manager');
var asteriskConfigs = require('./config/asterisk');
var log4js = require('log4js');
var nconf = require('nconf');
var fs = require('fs');
var cfile = null;
//var Watson = require('./stt_engines/watson');



// Initialize log4js
// log4js.loadAppender('file');
var logname = 'aqservice';
log4js.configure({
    appenders: { aqservice: { type: 'file', filename: 'aqservice.log' } },
    categories: { default: { appenders: ['aqservice'], level: 'error' } }
});

var logger = log4js.getLogger(logname);

/*
log4js.configure({
    appenders: [{
        type: 'dateFile',
        filename: 'logs/' + logname + '.log',
        alwaysIncludePattern: false,
        maxLogSize: 20480,
        backups: 10
    }]
});
*/

// Get the name of the config file from the command line (optional)
nconf.argv().env();

cfile = '../dat/config.json';

//Validate the incoming JSON config file
try {
    var content = fs.readFileSync(cfile, 'utf8');
    var myjson = JSON.parse(content);
    console.log("Valid JSON config file");
} catch (ex) {
    console.log("");
    console.log("*******************************************************");
    console.log("Error! Malformed configuration file: " + cfile);
    console.log('Exiting...');
    console.log("*******************************************************");
    console.log("");
    process.exit(1);
}



nconf.file({
    file: cfile
});
var configobj = JSON.parse(fs.readFileSync(cfile, 'utf8'));

//the presence of a populated cleartext field in config.json means that the file is in clear text
//remove the field or set it to "" if the file is encoded
var clearText = false;
if (typeof (nconf.get('common:cleartext')) !== "undefined"   && nconf.get('common:cleartext') !== "" ) {
    console.log('clearText field is in config.json. assuming file is in clear text');
    clearText = true;
}

// Set log4js level from the config file
/*
logger.setLevel(getConfigVal('common:debug_level'));
logger.trace('TRACE messages enabled.');
logger.debug('DEBUG messages enabled.');
logger.info('INFO messages enabled.');
logger.warn('WARN messages enabled.');
logger.error('ERROR messages enabled.');
logger.fatal('FATAL messages enabled.');
logger.info('Using config file: ' + cfile);
*/

var bridgeIdMap = new Map();

var ami = null;

console.log ("port: " + getConfigVal('asterisk:ami:port') );
console.log("ip: " + getConfigVal('asterisk:sip:private_ip') );
console.log("id: " + getConfigVal('asterisk:ami:id') );
console.log("pass: " + getConfigVal('asterisk:ami:passwd') );

function init_ami() {
    if (ami === null) {
        try {
            ami = new asteriskManager(
                getConfigVal('asterisk:ami:port'),
                getConfigVal('asterisk:sip:private_ip'),
                getConfigVal('asterisk:ami:id'),
                getConfigVal('asterisk:ami:passwd'),
                true);

            ami.keepConnected();
            // Define event handlers here
            ami.on('managerevent', handle_manager_event);
            console.log('Connected to Asterisk');

        } catch (exp) {
            console.log('Init AMI error' + JSON.stringify(exp));
        }
    }
}

init_ami();


function handle_manager_event(evt) {

    switch (evt.event) {
        case ('DialEnd'):
            //Listen for DialEnd to indicate a connected call.
            console.log('****** Processing AMI DialEnd ******');
        if (evt.dialstatus === 'ANSWER') {

            }
            break;

        case ('BridgeEnter'):
            console.log('****** BridgeEnter ******');
            console.log(JSON.stringify(evt));
            //TODO: figure out who each channel belongs to and make two calls to startTranscription one for each leg of the call

            var bridgeId = evt.bridgeuniqueid; // Looks like 'd1084052-f50a-4c5d-b459-354e832a9ff5'
            var channel = evt.channel;         // Looks like 'PJSIP/30001-0000001f'

            console.log("bridgeId: " + bridgeId);
            console.log("channel: " + channel);

            /*
            * We will receive two BridgeEnter events, one for each leg of the
            * call. Once we receive the 2nd bridge event, verify that it has
            * the same bridge ID (showing that it is the same call). Then,
            * we can use the channel IDs to record each leg of the call.
            */

            console.log("bridgeIdMap.size: " + bridgeIdMap.size);

            if (bridgeIdMap.get(bridgeId) === null) {
              console.log("Received first leg of the call, creating map");
              console.log(bridgeId + " => " + channel);

              // First leg of the call
              bridgeIdMap.set(bridgeId, channel);
            }
            else {
              /*
              * This is the second leg of the call, we should have all of the
              * info we need to record.
              */
              console.log("Received second leg of the call");
              console.log(bridgeId + " => " + channel);
              console.log();

              var channel1 = bridgeIdMap.get(bridgeId);
              var channel2 = channel;

              console.log('Retrieved ' + channel1 + " from map");

            }


            /*



                psuedo code:
                var bridgeId = evt.bridgeuniqueid
                var channel = evt.channel
                if(map.getValue(bridgeId) == null){
                    map.set(bridgeId, channel)
                }else{
                    a map exists so this is event 2

                    sendAmiAction({  // will create two files ...-asterisk-in.wav16 & ...-asterisk-out.wav16
                        "Action": "Monitor",
                        "Channel": channel,
                        "File": wavFilePath + pstnFilename + "-asterisk",
                        "Format": "wav16"
                    });



                    var channelA = map.getValue(bridgeId)
                    var channelB = channel;



                    startTranscription(wavFilePath + pstnFilename + "-asterisk-in.wav16",  channelA)
                    startTranscription(wavFilePath + pstnFilename + "-asterisk-out.wav16", channelB)

                }
            */
            break;

        case ('Hangup'):

            var extString = evt.channel;
            var extension = extString.split(/[\/,-]/);

            // TODO - Clear map entry for this channel

            break;
    }
}

/*
function startTranscription(wavFile, channel) {
    var stt;
    try {
        var watsonConfigs = require('./config/watson');
        stt = new Watson(wavFile, watsonConfigs);
    } catch (err) {
        console.log('Error error configuring watson');
        console.log(err);
    }
    var msgTime = 0;
    stt.start(function (data) {
        if (msgTime === 0) {
            var d = new Date();
            msgTime = d.getTime();
        }

        data.event = "message-stream"
        data.msgid = msgTime;

        if (channel) {
            sendAmiAction({
                "Action": "SendText",
                "ActionID": data.msgid,
                "Channel": channel,
                "Message": JSON.stringify(data)
            });
        }
    });
}*/


/**
 * Function to verify the config parameter name and
 * decode it from Base64 (if necessary).
 * @param {type} param_name of the config parameter
 * @returns {unresolved} Decoded readable string.
 */
function getConfigVal(param_name) {
  var val = nconf.get(param_name);
  var decodedString = null;

  if (typeof val !== 'undefined' && val !== null) {
    //found value for param_name


    if (clearText) {

      decodedString = val;
    } else {
      decodedString = new Buffer(val, 'base64');
    }
  } else {
    //did not find value for param_name
    logger.error('');
    logger.error('*******************************************************');
    logger.error('ERROR!!! Config parameter is missing: ' + param_name);
    logger.error('*******************************************************');
    logger.error('');
    decodedString = "";
  }
  return (decodedString.toString());
}
