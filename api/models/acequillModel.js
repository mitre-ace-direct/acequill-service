const Watson = require('./../../translation/watson'),
    configs = require('./../../config/watson');

const Google = require('./../../translation/google');

exports.translate = function(text, from, to, cb) {
  //let s = text.split("");
  //let r = s.reverse();
  //let translation = r.join("")
  //let engine = new Watson(configs);
  let engine = new Google();
  engine.translate(text, from, to, function(translation){
      console.log(">>>>>>>>>",translation)
      cb(null, {translation: translation})
  });
}
