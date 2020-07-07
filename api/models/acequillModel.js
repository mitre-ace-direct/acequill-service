exports.translate = function(text, from, to, cb) {
  let s = text.split("");
  let r = s.reverse();
  let translation = r.join("")
  cb(null, {translation: translation})
}
