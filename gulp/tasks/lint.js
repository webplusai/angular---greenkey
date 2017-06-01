var gulp = require('gulp');
var config = require('../config.js');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');

gulp.task('lint', function() {
  return gulp.src(config.sources)
    .pipe(jshint())
    .pipe(jshint.reporter(stylish));
});
