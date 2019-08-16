# ACE Quill Service

Accessible Communications for Everyone (ACE) Direct is a Direct Video Calling
(DVC) platform that enables direct calling from deaf and hard-of-hearing
individuals to an American Sign Language (ASL)-trained agent in an
organization's call center. The agent answers the call using a web browser
which provides a real-time video connection to a consumer.

One of the features of the ACE Direct is the ability to display captions on
both the agent and consumer portals. ACE Direct uses the IBM Watson automated
speech recognition (ASR) engine. Audio from the video call is captured and sent
to the IBM Watson ASR and captioned text is returned for display on both the
agent and consumer portals.

### Getting Started
Probably the *best* way to install the entire ACE Direct system is to start with
the acedirect-public repo. Follow the documentation there for a clean install.
The CHECKLISTS.md file provides an overview of the complete installation and
configuration process.

The ACE Quill service provides caption support in ACE Direct. Because the ACE
Quill service resides on a different server, it isn't part of the automated
installation script.

Note, captions are optional in ACE Direct and will require an IBM Account and
credit card for billing. Pricing information for the Watson captioning service
can be found [here](https://www.ibm.com/cloud/watson-speech-to-text/pricing).

### Install the ACE Quill Captioning Service
1. Clone this repository onto the same server that is running Asterisk
1. Clone the dat repo in the same folder and follow the configuration
instructions.
1. Download and install [Node.js](https://nodejs.org/en/)
1. In an elevated command prompt, run `npm install -g pm2`

### IBM Watson Configuration
1. The ACE Quill service uses the IBM Watson speech to text engine to support
captions and requires an [IBM Cloud](https://www.ibm.com/cloud) account and
credit card to support billing
1. Create an IBM Watson account and create a speech to text resource
1. Download the credentials file which should have the following format:
```
SPEECH_TO_TEXT_IAM_APIKEY=<API KEY HERE>
SPEECH_TO_TEXT_URL=<WATSON URL HERE>
```
1. Copy the API key and URL into stt_configs/watson.json

### Starting the Service
1. To start the ACE Quill node server with pm2, run `pm2 start process.json`
1. To verify the service is running, type `pm2 status` and you should see output similar to this:

```
┌──────────────────┬────┬──────┬───────┬────────┬─────────┬────────┬─────┬───────────┬────────┬──────────┐
│ App name         │ id │ mode │ pid   │ status │ restart │ uptime │ cpu │ mem       │ user   │ watching │
├──────────────────┼────┼──────┼───────┼────────┼─────────┼────────┼─────┼───────────┼────────┼──────────┤
│ ACEQuill-Service │ 0  │ fork │ 30780 │ online │ 0       │ 0s     │ 36% │ 12.5 MB   │ centos │ disabled │
└──────────────────┴────┴──────┴───────┴────────┴─────────┴────────┴─────┴───────────┴────────┴──────────┘
```
