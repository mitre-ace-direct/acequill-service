//const TranslationEngine = require('./../../translation/watson');
const TranslationEngine = require('./../../translation/google');

exports.translate = function (text, from, to, cb) {
  let engine = new TranslationEngine();
  engine.translate(text, from, to, function (err, translation) {
    cb(null, { translation: translation })
  });
}
