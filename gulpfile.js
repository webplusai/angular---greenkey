'use strict';
var gulp = require('gulp');
var fs = require('fs');
var runSequence = require('run-sequence');
// import prepare-env task
require(__dirname + '/gulp/tasks/prepareEnv');

var importTasks = function() {
  fs.readdirSync(__dirname + '/gulp/tasks/').forEach(function (module) {
    if (module.lastIndexOf('js') > 0) {
      require(__dirname + '/gulp/tasks/' + module);
    }
  });
};

gulp.task('build', function(callback) {
  importTasks();
  runSequence(
    // 'lint',
    'clean',
    'copy-static-resources',
    'build-js',
    'build-css',
    'fill-placeholders',
    'build-chats-injected-assets',
    callback
  );
});

gulp.task('default', function() {
  importTasks();
  runSequence(
    'build',
    'server',
    'watch'
  );
});

gulp.task('watch', function() {
  importTasks();
  var config = require('./gulp/config.js');
  gulp.watch(config.sources, ['build']);
  gulp.watch(config.mainAppHtmlTemplates, ['build']);
  gulp.watch(config.openFinPopoutSources, ['build']);
  gulp.watch(config.css.openFin, ['build']);
  gulp.watch(['./public/**/*.css'], ['build']);
  gulp.watch(['./server.js'], ['server']);
  gulp.watch(['./voicebox-javascript-sdk/sdk/**/*.js'], ['build']);
  gulp.watch(['./voicebox-javascript-sdk/openfin/**/*.js'], ['build']);
});

gulp.task('monitor', function() {
  importTasks();
  runSequence(
    'monitor'
  );
});