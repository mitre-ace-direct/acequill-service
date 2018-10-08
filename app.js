"use strict";

var asteriskManager = require('asterisk-manager');
var asteriskConfigs = require('./config/asterisk');
//var Watson = require('./stt_engines/watson');

var bridgeIdMap = new Map();

var ami = null;

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
            //TODO: figure out who each channel belongs to and make two calls to startTranscription one for each leg of the call

            var bridgeId = evt.bridgeuniqueid; // Looks like 'd1084052-f50a-4c5d-b459-354e832a9ff5'
            var channel = evt.channel;         // Looks like 'PJSIP/30001-0000001f'

            /*
            * We will receive two BridgeEnter events, one for each leg of the
            * call. Once we receive the 2nd bridge event, verify that it has
            * the same bridge ID (showing that it is the same call). Then,
            * we can use the channel IDs to record each leg of the call.
            */
            if (bridgeIdMap.getValue(bridgeId) == null) {
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
