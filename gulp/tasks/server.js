var gulp = require('gulp');
var exec = require('child_process').exec;

/***** Task: Server - To Start the Server App - *****/
gulp.task('server', function (cb) {
  'use strict';

  console.log('Starting server at: http://localhost:3000...');

  exec('node server.js', function(err, stdout, stderr) {
    if (err) {
      console.log(stdout);
      console.log(stderr);
    }
    cb(err);
  });

  cb();

});
