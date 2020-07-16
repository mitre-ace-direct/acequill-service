const Watson = require('./../../translation/watson'),
    configs = require('./../../config/watson');

exports.translate = function(text, from, to, cb) {
  //let s = text.split("");
  //let r = s.reverse();
  //let translation = r.join("")
  let engine = new Watson(configs);
  engine.translate(text, from, to, function(translation){
      cb(null, {translation: translation})
  });
}
