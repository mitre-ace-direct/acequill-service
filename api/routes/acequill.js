'use strict';
module.exports = function(app) {
  var acequill = require('../controllers/acequillController');

  app.route('/translate')
    .get(acequill.translate);
}
