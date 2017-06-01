'use strict';

var gulp = require('gulp'),
  jshint = require('gulp-jshint'),
  path = require('path'),
  jsStylish = require('jshint-stylish'),
  gutil = require('gulp-util'),
  es = require('event-stream'),
  fs = require('fs'),
  beautify = require('js-beautify');

var protractor = require('gulp-protractor').protractor,
  webdriver_update = require('gulp-protractor').webdriver_update,
  webdriver_standalone = require('gulp-protractor').webdriver_standalone;

var jsFiles = [
  'helpers/**/*.js',
  'objects/**/*.js',
  'specs/**/*.js',
  'gulpfile.js',
  'config.js'
];

var localTestConfigFile = path.resolve(__dirname, './conf.js');
var localTestConfig = require(localTestConfigFile);

var jsBeautifyConfig = require('./jsBeautify.config.js'),
  jsHintConfig = require('./jsHint.config.js');

gulp.task('webdriver-update', webdriver_update);
gulp.task('webdriver-start', ['webdriver-update'], webdriver_standalone);

gulp.task('test', ['webdriver-update'], function() {
  return gulp.src(localTestConfig.config.specs)
    .pipe(protractor({
      configFile: localTestConfigFile
    }));
});

gulp.task('lint', function() {
  return gulp.src(jsFiles)
    .pipe(jshint(jsHintConfig))
    .pipe(jshint.reporter(jsStylish))
    .pipe(jshint.reporter('fail'));
});

gulp.task('fix-style', function() {
  return gulp.src(jsFiles)
    .pipe(es.map(function(file, cb) {
      try {
        file.contents = new Buffer(
          beautify(String(file.contents), jsBeautifyConfig)
        );
        fs.writeFile(file.path, file.contents, function() {
          cb(null, file);
        });
      } catch (err) {
        return cb(new gutil.PluginError(
          'fix-style',
          err,
          jsBeautifyConfig
        ));
      }
    }));
});