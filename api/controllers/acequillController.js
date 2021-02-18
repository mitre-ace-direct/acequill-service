'use strict';

var AQModel = require('./../models/acequillModel');

exports.translate = function(req, res) {
  let text   = req.query.text,
    langTo   = req.query.languageTo || 'en',
    langFrom = req.query.languageFrom;
  console.log(text)
  console.log(langTo)
  console.log(langFrom)
  if(text && langFrom){
    AQModel.translate(text, langFrom, langTo, function(err, results) { 
    let returnJson = { 
	status: "success",
	message: `Translated from ${langFrom} to ${langTo}`,
 	translation: results.translation,
	original: text,
        alternatives: []
    };

    res.status(200).json(returnJson)
    });
  } else {

    let errorJson = {
	status: "failure",
  	error: "Missing required parameters",
	message: "Could not translate text"
    }
    res.status(400).json(errorJson)
  }
}
