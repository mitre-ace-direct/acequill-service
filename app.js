var asteriskManager = require('asterisk-manager');
var asteriskConfigs = require('./config/asterisk');
var log4js = require('log4js');
var nconf = require('nconf');
var fs = require('fs');
var cfile = null;
var Watson = require('./transcription/watson');
var mysql = require('mysql');

// TODO - Update the config.json
var transcriptFilePath = '/tmp/transcript';
var wavFilePath = '/tmp/wav/';

var logname = 'aqservice';

// Initialize log4js
// log4js.loadAppender('file');
/*
var logname = 'aqservice';
log4js.configure({
    appenders: { aqservice: { type: 'file', filename: 'logs/aqservice.log' } },
    categories: { default: { appenders: ['aqservice'], level: 'error' } }
});

var logger = log4js.getLogger(logname);
*/

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
  })

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
logger.level(getConfigVal('common:debug_level'));
logger.trace('TRACE messages enabled.');
logger.debug('DEBUG messages enabled.');
logger.info('INFO messages enabled.');
logger.warn('WARN messages enabled.');
logger.error('ERROR messages enabled.');
logger.fatal('FATAL messages enabled.');
logger.info('Using config file: ' + cfile);
*/

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

var bridgeIdMap = new Map();
var channelIdSet = new Set();

/*
// Create MySQL connection and connect to the database
var mysqlConnection = mysql.createConnection({
	host: dbHost,
	user: dbUser,
	password: dbPassword,
	database: dbName,
	port: dbPort
});

//better error checking for MySQL connection
mysqlConnection.connect(function(err) {
  if (err !== null) {
    //MySQL connection ERROR
    console.error('');
    console.error('*************************************');
    console.error('ERROR connecting to MySQL. Exiting...');
    console.error('*************************************');
    console.error('');
    console.error(err);
  } else {
    //SUCCESSFUL connection
    console.log("Successfully connected to MySQL");
  }
});

*/

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

// Initialize the Asterisk AMI connection
init_ami();



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
            console.log(JSON.stringify(evt));

            logger.debug('****** BridgeEnter ******');
            logger.debug(JSON.stringify(evt));

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

                var mysqlConnection = openMysqlConnection();

                // Insert into MySQL
                 var mySet = {
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

                console.log('Call data: ' + JSON.stringify(mySet));

                mysqlConnection.query('INSERT INTO caption_data SET ?', mySet,
                    function (err, result) {
                      if (err) {
                          logger.debug("Error in INSERT: " + JSON.stringify(err));
                      } else {
                          logger.debug('INSERT result: ' + JSON.stringify(result));
                       }
                    });

                mysqlConnection.end(function (err) {
                    // The connection is terminated now
                    if (err) {
                        logger.debug("Error closing MySQL connection: " + JSON.stringify(err));
                    } else {
                        logger.debug("MySQL connection closed");
                    }
                });


            }
            break;

        case ('Hangup'):
            console.log();
            console.log('****** Hangup ******');
            console.log(JSON.stringify(evt));

            logger.debug('****** Hangup ******');
            logger.debug(JSON.stringify(evt));

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

                /*

                // Example from AQ research portal
                var sql = "UPDATE caption_data SET call_end = CURRENT_TIMESTAMP(), ";
                    sql += "call_duration = UNIX_TIMESTAMP(call_end) - UNIX_TIMESTAMP(call_start)";
                    sql += " WHERE agent_channel = ?;";

                // Calculate call duration, update the call_duration field

                var mySet = {
                    agent_captions: "agent_captions",
                    consumer_captions: "consumer_captions"
                  };

                  var params = evt.uniqueid;

        logger.debug("Hangup SQL statement: " + sql);
        logger.debug("Hangup SQL statement: " + params);

        var mySqlConnection = openMySqlConnection();

        mySqlConnection.query(sql, params, function (err, result) {
          if (err) {
            throw err;
            logger.error("Error in UPDATE statement: " + JSON.stringify(err));
          } else {
            logger.debug("MySQL INSERT result: " + JSON.stringify(result));
          }
        });

        mySqlConnection.end(function (err) {
          // The connection is terminated now
          if (err) {
            logger.error("Error closing MySQL connection: " + JSON.stringify(err));
          } else {
            logger.debug("MySQL connection closed in asterisk.js");
          }
        });



                  */


            }
            break;
    }
}


function startTranscription(wavFile, channel) {

    var sttEngine;

    console.log("Entering startTranscription - wavFile: " + wavFile);

    logger.debug('Entering startTranscription() for extension: ' + wavFile);

    try {
        // console.log();
        // console.log("#### In try{}");

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

/*
      if (sttEngineMsgTime === 0) {
        var d = new Date();
        sttEngineMsgTime = d.getTime();
      }
      data.event = "message-stream";
      data.source = "PSTN";
      data.extension = extension;
      data.msgid = pstnMsgTime;
      data.sttengine = engineCd;
    */

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
 *
 * @param {JSON} obj contains AMI action  to be executed
 */
function sendAmiAction(obj) {

    console.log("sendAmiAction: " + JSON.stringify(obj));

    ami.action(obj, function (err, res) {
      if (err) {
        // logger.error('AMI Action error ' + JSON.stringify(err));
        console.log('AMI Action error ' + JSON.stringify(err));
      }

    });
  }

  function openMysqlConnection() {

    console.log("#### Entering openMysqlConnection()");

    var mysqlConnection = mysql.createConnection({
      host: getConfigVal('database_servers:mysql:user'),
      user: getConfigVal('mysql:user'),
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


