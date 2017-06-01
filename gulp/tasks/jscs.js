var gulp = require('gulp');
var jscs = require('gulp-jscs-with-reporter');
var jscsReporter = require('gulp-jscs-html-reporter');
var plumber = require('gulp-plumber');
var config = require('../config.js');

gulp.task('jscs', function() {
  return gulp.src(config.sources)
      .pipe(plumber())
      .pipe(jscs())
      .pipe(jscs.reporter('inline'))
      .pipe(jscs.reporter(jscsReporter, {
        filename: config.dest + '/jscs-output.html'
      }));
});


//var jscsConfig = JSON.parse(fs.readFileSync('.jscsrc','utf-8'))

