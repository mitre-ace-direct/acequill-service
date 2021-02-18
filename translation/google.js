const projectID = 'ace-quill';
const {Translate} = require('@google-cloud/translate').v2;
const translate = new Translate({projectID});

function Google() {}

Google.prototype.translate = function(text, source, target, callback) {
	translate.translate(text, {"from":source, "to":target}, function(err,data){
		callback(err, data)
	});
}


module.exports = Google;
