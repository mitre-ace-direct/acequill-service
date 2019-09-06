var asteriskManager = require('asterisk-manager');
var asteriskConfigs = require('./config/asterisk');
var watsonConfigs = require('./config/watson');
var Watson = require('./transcription/watson');

var wavFilePath = '/tmp/wav';

var bridgeIdMap = new Map();
var channelIdSet = new Set();
var ami = null;
var nconf = require('nconf');
var fs = require('fs');

// var MongoClient = require('mongodb').MongoClient;

// Set the name of the config file
var cfile = '../dat/config.json';

// Validate the incoming JSON config file
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

/*
** The presence of a populated cleartext field in config.json means that the file is in clear text
** remove the field or set it to "" if the file is encoded
*/
var clearText = false;
if (typeof (nconf.get('common:cleartext')) !== "undefined"   && nconf.get('common:cleartext') !== "" ) {
    console.log('clearText field is in config.json. assuming file is in clear text');
    clearText = true;
}

/*
// Get all of the parameters for the MongoDB connection
var dbName = getConfigVal('database_servers:mongodb:database_name');
var collectionName = getConfigVal('database_servers:mongodb:caption_collection_name');
var mongoUri = getConfigVal('database_servers:mongodb:connection_uri');
var dbConnection;

console.log("dbName:" + dbName);
console.log("mongoUri:" + mongoUri);

// Use connect method to connect to the server and create the collection
MongoClient.connect(mongoUri, function(err, client) {
    if(err){
        console.log("ERROR CONNECTING TO MONGO SERVER. Exiting...");
        process.exit(1);
    }else{
        console.log("Connected successfully to MongoDB server");

        dbConnection = client.db(dbName);

        dbConnection.createCollection(collectionName, function(err, res) {
            if (err) {
                console.log("Error Creating Mongo Collection: " + err);
            }else{
                console.log("Collection created!");
            }
        });
    }
});
*/


/**
 * Creates an AMI connection to Asterisk.
 */
function init_ami() {
    if (ami === null) {
        try {
            ami = new asteriskManager(
                asteriskConfigs.port,
                asteriskConfigs.host,
                asteriskConfigs.user,
                asteriskConfigs.password,
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

// Initialize the Asterisk AMI connection
init_ami();


/**
 * Event handler for AMI events coming from Asterisk.
 * @param {object} evt - AMI event from Asterisk.
 */
function handle_manager_event(evt) {

    switch (evt.event) {

        case ('BridgeEnter'):
            /*
             * BridgeEnter handler logic:
             * 1. For each call, we will receive two BridgeEnter events, one for each leg of the call
             * 2. When we receive the 2nd bridge event, verify that it has the same bridge ID
             *   (showing that it is the other leg of the same call)
             * 3. Retrieve channel IDs for each side of the call (required to record the call)
             * 4. Call the startTranscription() function for each leg of the call
             */

            console.log();
            console.log('****** BridgeEnter ******');
            console.log(JSON.stringify(evt, null, 4));

            // Extract the Bridge ID and the channel from the event
            var bridgeId = evt.bridgeuniqueid; // Looks like 'd1084052-f50a-4c5d-b459-354e832a9ff5'
            var channel = evt.channel; // Looks like 'PJSIP/30001-0000001f'

            console.log("bridgeId: " + bridgeId);
            console.log("channel: " + channel);

            console.log("bridgeIdMap.size: " + bridgeIdMap.size);
            console.log("Get return: '" + bridgeIdMap.get(bridgeId) + "'");

            if (bridgeIdMap.get(bridgeId) === undefined) {

                // We haven't seen this bridgeId before, so, store the bridgeId and channel for the first leg of the call
                bridgeIdMap.set(bridgeId, channel);

                console.log("Received first leg of the call, creating map");
                console.log(bridgeId + " => " + channel);
            } else {

                // This bridgeId is in the map, so, this is the second leg of the call
                console.log("Received second leg of the call");
                console.log("bridgeId: " + bridgeId + " => channel: " + channel);
                console.log();

                // Get the agent channel from the map
                var agentChannel = "NOT FOUND";
                if (bridgeIdMap.has(bridgeId)) {
                    agentChannel = bridgeIdMap.get(bridgeId);
                }

                // The consumer channel just arrived in the second BridgeEnter event
                var consumerChannel = channel;

                console.log("agentChannel: " + bridgeIdMap.get(bridgeId));
                console.log("consumerChannel: " + consumerChannel);

                console.log("Clearing map");
                console.log("bridgeIdMap.size - before: " + bridgeIdMap.size);

                // We are finished with this bridgeId, so, remove it from the map
                bridgeIdMap.delete(bridgeId);

                console.log("bridgeIdMap.size - after: " + bridgeIdMap.size);

                var wavFilename = wavFilePath + bridgeId;

                console.log("Adding " + agentChannel + " to set");
                channelIdSet.add(agentChannel);

                // Start recording here
                console.log("Recording file: " + wavFilename);
                sendAmiAction({
                    "Action": "Monitor",
                    "Channel": agentChannel,
                    "File": wavFilename,
                    "Format": "wav16"
                });

                /*
                 * Build the filenames to pass out to startTransciption, Asterisk appends the
                 * -in.wav16 and -out.wav16 extensions to the files is creates
                 */
                var inFile = wavFilePath + bridgeId + "-in.wav16";
                var outFile = wavFilePath + bridgeId + "-out.wav16";

                console.log();
                console.log("inFile: " + inFile);
                console.log("outFile: " + outFile);
                console.log("uniqueid:" + evt.uniqueid);
                console.log("consumerChannel: " + consumerChannel);
                console.log("agentChannel: " + agentChannel);

                // Start the transcription for each channel
                // Test if extension is webrtc (30000 or 90000)
                const webrtcExt = new RegExp("PJSIP\/(3|9)");
                if(webrtcExt.test(consumerChannel))
                        startTranscription(inFile, consumerChannel, evt.uniqueid);
                if(webrtcExt.test(agentChannel))
                        startTranscription(outFile, agentChannel, evt.uniqueid);
            }
            break;

        case ('Hangup'):
            console.log();
            console.log('****** Hangup ******');
            console.log(JSON.stringify(evt, null, 4));

            /*
             * If this set has the channel we stored earlier, use this to send an AMI action
             * to Asterisk and stop recording. Note, we only need to call stop once on
             * this channel (corresponds to the Monitor action above).
             * */
            if (channelIdSet.has(evt.channel)) {

                console.log("Found a match in the set for " + evt.channel);

                sendAmiAction({
                    "Action": "StopMonitor",
                    "Channel": evt.channel
                });

                // Remove this channel from the set, we're all finished with it
                channelIdSet.delete(evt.channel);
            }
            break;
    }
}

/**
 * Contacts IBM Watson and starts captioning this channel.
 * @param {string} wavFile - Name of the WAV file being populated.
 * @param {string} channel - Asterisk channel corresponding to this leg of the call.
 */
function startTranscription(wavFile, channel, callid) {

    console.log("Entering startTranscription - wavFile: " + wavFile);

    try {
        var sttEngineMsgTime = 0;
        var sttEngine = new Watson(wavFile, watsonConfigs);

        sttEngine.start(function (data) {

            if (sttEngineMsgTime === 0) {
                let d = new Date();
                sttEngineMsgTime = d.getTime();
            }

            data.msgid = sttEngineMsgTime;

            console.log("data.msgid: " + data.msgid);
            console.log("data.transcript: " + data.transcript);

            if (channel) {
                sendAmiAction({
                    "Action": "SendText",
                    "ActionID": data.msgid,
                    "Channel": channel,
                    "Message": JSON.stringify(data)
                });

                data.channel = channel;
		        data.callid = callid;

                /*
                dbConnection.collection(collectionName).insertOne(data, function(err, res) {
                    if (err) console.log("Mongo Error on Insert");
                    //console.log("1 document inserted into the captions collection");
                });
                */

            }

            if (data.final) {
                // reset message time
                sttEngineMsgTime = 0;
            }
        });

    } catch (err) {
        console.log('Error Initializing Watson');
        console.log(err);
    }
}


/**
 * Sends an AMI action to Asterisk.
 * @param {JSON} obj - Contains AMI action (in JSON format) to be executed.
 */
function sendAmiAction(obj) {

    console.log();
    console.log("Entering sendAmiAction(): " + JSON.stringify(obj, null, 4));

    ami.action(obj, function(err, res) {
        if (err) {
            console.log('AMI Action error ' + JSON.stringify(err, null, 4));
        }
    });
}

/**
 * Function to verify the config parameter name and decode it from Base64 (if necessary).
 * @param {type} param_name - The config parameter we are trying to retrieve.
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
      /*
      logger.error('');
      logger.error('*******************************************************');
      logger.error('ERROR!!! Config parameter is missing: ' + param_name);
      logger.error('*******************************************************');
      logger.error('');
      */
      decodedString = "";
    }
    return (decodedString.toString());
  }
