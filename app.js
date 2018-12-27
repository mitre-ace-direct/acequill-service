var asteriskManager = require('asterisk-manager');
var asteriskConfigs = require('./config/asterisk');
var log4js = require('log4js');
var nconf = require('nconf');
var fs = require('fs');
var Watson = require('./transcription/watson');
var mysql = require('mysql');

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

// TODO - Update the config.json
var transcriptFilePath = '/tmp/transcript';
var wavFilePath = '/tmp/wav';

// MongoDB Params
var url = 'mongodb://localhost:27017';
var dbName = 'captions';

var logname = 'aqservice';

// Initialize log4js
log4js.configure({
    appenders: {
      aqservice: {
        type: 'dateFile',
        filename: 'logs/' + logname + '.log',
        alwaysIncludePattern: false,
        maxLogSize: 20480,
        backups: 10
      }
    },
    categories: {
      default: {
        appenders: ['aqservice'],
        level: 'debug'
      }
    }
  });

// Create a logger and set the log level
var logger = log4js.getLogger('aqservice');
logger.level = getConfigVal('common:debug_level');
logger.trace('TRACE messages enabled.');
logger.debug('DEBUG messages enabled.');
logger.info('INFO messages enabled.');
logger.warn('WARN messages enabled.');
logger.error('ERROR messages enabled.');
logger.fatal('FATAL messages enabled.');
logger.info('Using config file: ' + cfile);

// Get the name of the config file from the command line (optional)
nconf.argv().env();

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

// Get all of the parameters for the MySQL connection
var dbHost = getConfigVal('database_servers:mysql:host');
var dbUser = getConfigVal('database_servers:mysql:user');
var dbPassword = getConfigVal('database_servers:mysql:password');
var dbName = getConfigVal('database_servers:mysql:ad_database_name');
var dbPort = parseInt(getConfigVal('database_servers:mysql:port'));

console.log("dbHost:" + dbHost);
console.log("dbUser:" + dbUser);
console.log("dbPassword:" + dbPassword);
console.log("dbName:" + dbName);
console.log("dbPort:" + dbPort);

var mongoDb;

// Use connect method to connect to the server
MongoClient.connect(url, function(err, client) {
  assert.equal(null, err);
  console.log("Connected successfully to MongoDB server");

  mongoDb = client.db(dbName);

  // client.close();
});

var bridgeIdMap = new Map();
var channelIdSet = new Set();
var ami = null;

console.log ("port: " + getConfigVal('asterisk:ami:port') );
console.log("ip: " + getConfigVal('asterisk:sip:private_ip') );
console.log("id: " + getConfigVal('asterisk:ami:id') );
console.log("pass: " + getConfigVal('asterisk:ami:passwd') );

/**
 * Creates an AMI connection to Asterisk.
*/
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

// Initialize the Asterisk AMI connection
init_ami();


/**
 * Event handler for AMI events coming from Asterisk.
 * @param {object} evt - AMI event from Asterisk.
 */
function handle_manager_event(evt) {

    var mysqlConnection;

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

            logger.debug('****** BridgeEnter ******');
            logger.debug(JSON.stringify(evt, null, 4));

            // Extract the Bridge ID and the channel from the event
            var bridgeId = evt.bridgeuniqueid; // Looks like 'd1084052-f50a-4c5d-b459-354e832a9ff5'
            var channel = evt.channel;         // Looks like 'PJSIP/30001-0000001f'

            console.log("bridgeId: " + bridgeId);
            console.log("channel: " + channel);

            console.log("bridgeIdMap.size: " + bridgeIdMap.size);
            console.log("Get return: '" + bridgeIdMap.get(bridgeId) + "'");

            if (bridgeIdMap.get(bridgeId) === undefined) {

                // We haven't seen this bridgeId before, so, store the bridgeId and channel for the first leg of the call
                bridgeIdMap.set(bridgeId, channel);

                console.log("Received first leg of the call, creating map");
                console.log(bridgeId + " => " + channel);
            }
            else {

                // This bridgeId is in the map, so, this is the second leg of the call
                console.log("Received second leg of the call");
                console.log("bridgeId: " + bridgeId + " => channel: " + channel);
                console.log();

                // Get the agent channel from the map
                // var agentChannel = bridgeIdMap.get(bridgeId);

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

                // var consumerWav = wavFilePath + bridgeId + "-asterisk-in-consumer.wav16";
                // var agentWav = wavFilePath + bridgeId + "-asterisk-out-agent.wav16";

                // var consumerWav = wavFilePath + bridgeId;
                var wavFilename = wavFilePath + bridgeId;

                console.log("Adding " + agentChannel + " to set");
                channelIdSet.add(agentChannel);

                // Start recording here
                console.log("Recording file: " + wavFilename);
                sendAmiAction ({
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
                console.log("consumerChannel: " + consumerChannel);
                console.log("agentChannel: " + agentChannel);

                // Start the transcription for each channel
                startTranscription(inFile, consumerChannel);
                startTranscription(outFile, agentChannel);

                console.log("### Opening a MySQL connection");
                mysqlConnection = openMysqlConnection();

                // Insert into MySQL
                 var mySet = {
                      "unique_id": evt.uniqueid,
                      "stt_engine": "stt_engine",
                      "content_type": "content_type",
                      "smart_formatting": "smart_formatting",
                      "agent_channel": agentChannel,
                      "consumer_channel": consumerChannel,
                      "agent_wav_file_path": outFile,
                      "consumer_wav_file_path": inFile,
                      "device_type": "device_type",
                      "vrs_number": "vrs_number",
                      "language_in": "language_in",
                      "language_out": "language_out"
                    };

                console.log('Call data: ' + JSON.stringify(mySet, null, 4));

                console.log("### Inserting a record into MySQL");
                mysqlConnection.query('INSERT INTO caption_data SET ?', mySet,
                    function (err, result) {
                      if (err) {
                          logger.debug("Error in INSERT: " + JSON.stringify(err, null, 4));
                      } else {
                          logger.debug('INSERT result: ' + JSON.stringify(result, null, 4));
                       }
                    });

                console.log("### Closing the MySQL connection");
                mysqlConnection.end(function (err) {
                    // The connection is terminated now
                    if (err) {
                        logger.debug("Error closing MySQL connection: " + JSON.stringify(err));
                    } else {
                        logger.debug("MySQL connection closed");
                    }
                });

                // Use connect method to connect to the server
                MongoClient.connect(url, function(err, client) {
                  assert.equal(null, err);
                  console.log("Connected successfully to server");

                  const db = client.db(dbName);

                  insertDocument(mySet, db, function() {
                    client.close();
                  });
              });



            }
            break;

        case ('Hangup'):
            console.log();
            console.log('****** Hangup ******');
            console.log(JSON.stringify(evt, null, 4));

            logger.debug('****** Hangup ******');
            logger.debug(JSON.stringify(evt, null, 4));

            /*
            * If this set has the channel we stored earlier, use this to send an AMI action
            * to Asterisk and stop recording. Note, we only need to call stop once on
            * this channel (corresponds to the Monitor action above).
            * */
            if (channelIdSet.has(evt.channel)) {

                console.log("Found a match in the set for " + evt.channel);

                sendAmiAction ({
                    "Action": "StopMonitor",
                    "Channel": evt.channel
                });

                // Remove this channel from the set, we're all finished with it
                channelIdSet.delete(evt.channel);

                // TO DO
                // Insert to MySQL, calculate call duration


                console.log("uniqueid: " + evt.linkedid);


                // Example from AQ research portal
                var sql = "UPDATE caption_data SET call_end = CURRENT_TIMESTAMP(), ";
                    sql += "call_duration = UNIX_TIMESTAMP(call_end) - UNIX_TIMESTAMP(call_start)";
                    sql += " WHERE unique_id = ?;";

                /*
                ** Note that in the BridgeEnter, we log the uniqueid, however, for the HangUp we
                ** use the linkedid field.
                */
                var params = evt.linkedid;

                mysqlConnection = openMysqlConnection();

                mysqlConnection.query(sql, params, function (err, result) {
                  if (err) {
                    logger.error("Error in UPDATE statement: " + JSON.stringify(err, null, 4));
                    throw err;
                  } else {
                    logger.debug("MySQL INSERT result: " + JSON.stringify(result, null, 4));
                  }
                });

                mysqlConnection.end(function (err) {
                  // The connection is terminated now
                  if (err) {
                    logger.error("Error closing MySQL connection: " + JSON.stringify(err));
                  } else {
                    logger.debug("MySQL connection closed in app.js");
                  }
                });
            }
            break;
    }
}

/**
 * Contacts IBM Watson and starts captioning this channel.
 * @param {string} wavFile - Name of the WAV file being populated.
 * @param {string} channel - Asterisk channel corresponding to this leg of the call.
 */
function startTranscription(wavFile, channel) {

    var sttEngine;

    console.log("Entering startTranscription - wavFile: " + wavFile);

    logger.debug('Entering startTranscription() for extension: ' + wavFile);

    try {

        var config = JSON.parse(fs.readFileSync('./stt_configs/watson.json'));

        config.contentType = "audio/wav; rate=16000";
        config.smartFormatting = true;

        // console.log("config: " + JSON.stringify(config));

        sttEngine = new Watson(wavFile, config);
        // logger.debug("Connected to Watson");

        console.log("Connected to Watson");
    } catch (err) {
        // logger.debug('Error loading stt_configs/watson.json');
        // logger.debug(err);

        console.log('Error loading stt_configs/ibm-watson.json');
        console.log(err);
    }

    var sttEngineMsgTime = 0;
    sttEngine.start(function (data) {

   var d = new Date();

   if(sttEngineMsgTime === 0)
   	sttEngineMsgTime = d.getTime();

   data.msgid = sttEngineMsgTime;
   console.log("data.msgid: " + data.msgid);


        if (channel) {
          sendAmiAction({
            "Action": "SendText",
            "ActionID": data.msgid,
            "Channel": channel,
            "Message": JSON.stringify(data)
          });
        }


      if (data.final) {
        // logger.debug('PSTN: ' + data.transcript);
        // fs.appendFileSync(transcriptFilePath + pstnFilename + '.txt', +data.timestamp + ': ' + data.transcript + '\n');

        console.log("Transcript: " + data.timestamp + ': ' + data.transcript);
        //reset pstnMsgTime;

        console.log("Transcript: " + JSON.stringify(data));

        sttEngineMsgTime = 0;
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

/**
 * Sends an AMI action to Asterisk.
 * @param {JSON} obj - Contains AMI action (in JSON format) to be executed.
 */
function sendAmiAction(obj) {

    console.log();
    console.log("Entering sendAmiAction(): " + JSON.stringify(obj, null, 4));

    ami.action(obj, function (err, res) {
      if (err) {
        // logger.error('AMI Action error ' + JSON.stringify(err));
        console.log('AMI Action error ' + JSON.stringify(err, null, 4));
      }

    });
  }

  /**
  * Opens a connection to MySQL.
  * @returns {object} - Handle to MySQL.
  */
  function openMysqlConnection() {

    console.log("#### Entering openMysqlConnection()");

    var mysqlConnection = mysql.createConnection({
      host: getConfigVal('database_servers:mysql:host'),
      user: getConfigVal('database_servers:mysql:user'),
      password: getConfigVal('database_servers:mysql:password'),
      database: getConfigVal('database_servers:mysql:ad_database_name'),
      port: parseInt(getConfigVal('database_servers:mysql:port')),
      debug: false
    });

    mysqlConnection.connect(function (err) {
      if (err) {
        logger.error("MySQL connection error in app.js");
        logger.error(err);
      } else {
        logger.debug("Connected to MySQL in app.js");
      }
    });

    return (mysqlConnection);
  }



  const insertDocument = function(data, db, callback) {
    // Get the documents collection
    var collection = mongoDb.collection('captions');
    // Insert some documents
    collection.insertOne(
      data, function(err, result) {
      assert.equal(err, null);
      assert.equal(1, result.result.n);
      assert.equal(1, result.ops.length);
      console.log("Inserted 1 document into the MongoDB collection");
      callback(result);
    });
  };




