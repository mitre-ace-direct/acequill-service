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

Note, captions are optional in ACE Direct and will require an IBM Account and credit card for billing. Pricing information for the Watson captioning service can be found [here](https://www.ibm.com/cloud/watson-speech-to-text/pricing).

To manually install the ACE Quill captioning service:
1. Clone this repository
1. Clone the dat repo in the same folder and follow the configuration
instructions.
1. Download and install [Node.js](https://nodejs.org/en/)
1. In an elevated command prompt, run `npm install -g pm2`

### IBM Watson Configuration
1. The ACE Quill service uses the IBM Watson speech-to-text engine to support
captions and requires an [IBM Cloud](https://www.ibm.com/cloud) account and
credit card to support billing
1. The location of the SSL key and certificate is specified in the
dat/config.json file with the common:https:certificate and common:https:private_key parameters in the form of full-path/file (e.g., /home/centos/ssl/mycert.pem and /home/centos/ssl/mykey.pem)
1. Additional information can be found in the ACE Direct Platform Release document

### Starting the Service
1. To start the ACE Quill node server with pm2, run `pm2 start process.json`
1. To verify the service is running, type `pm2 status`
