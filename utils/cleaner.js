const fs = require('fs');
const path = require('path');

module.exports = function (filepath) {
   const now = new Date().getTime();

   fs.readdir(filepath, (err, files) => {
      if (err) {
         console.log(err);
         return;
      }
      files.forEach(file => {
         if (path.extname(file) === '.wav16') {
            fs.stat(filepath + file, (err, stats) => {
               if (err) {
                  console.log(err);
                  return;
               }
               let diff = now - stats.mtimeMs;
               if (diff > 3600000) { // delete .wav16 files that haven't been modified in 1 hour.
                  fs.unlink(filepath + file, (err) => {
                     if (err) {
                        console.error(err);
                        return;
                     }
                     console.log(file + ' deleted');
                  });
               }
            });
         }
      });
   });

};

