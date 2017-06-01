var gulp = require('gulp');
var gulpif = require('gulp-if');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var config = require('../config.js');
var merge = require('merge-stream');
var env = require('../../env');

gulp.task('copy-assets', function() {
  return merge(
    gulp.src(config.assets, {base: "."})
      .pipe(gulp.dest(config.dest)),
    gulp.src(config.fonts)
      .pipe(gulp.dest(config.dest + '/public/fonts'))
  );
});

gulp.task('copy-symphony', function() {
  return gulp.src(config.symphonySources)
    .pipe(gulp.dest(config.publicDest));
});

gulp.task('copy-vector', function() {
  return gulp.src(config.vector, {base: "."})
    .pipe(gulp.dest(config.dest));
});

gulp.task('copy-html-index-files', function() {
  var tasks = config.htmlIndexFiles.map(function(item) {
    return gulp.src(item.src)
      .pipe(gulp.dest(item.dest))
  });

  return merge(tasks);
});

// TODO find out if this still needed
gulp.task('copy-dictate', function() {
  return merge(
    gulp.src([
      'public/libs/dictatejs/dictate.js',
      'public/libs/dictatejs/recorder.js',
      'public/libs/dictatejs/recorderWorker.js',
      'public/libs/dictatejs/mob.js'
    ])
      .pipe(sourcemaps.init())
      .pipe(gulpif(env.uglify, uglify()))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(config.publicDest)),
    gulp.src([
      'public/libs/dictatejs/speex.min.js'
    ])
      .pipe(gulp.dest(config.publicDest))
  );
});

gulp.task('copy-third-party-configs', function () {
  return gulp.src(config.integrationConfigSources)
    .pipe(gulp.dest(config.publicDest));
});

gulp.task('copy-static-resources', [
  'copy-assets',
  'copy-vector',
  'copy-html-index-files',
  'copy-dictate',
  'copy-symphony',
  'copy-third-party-configs'
]);