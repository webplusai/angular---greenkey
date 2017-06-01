var gulp = require('gulp');
var gulpif = require('gulp-if');
var concat = require('gulp-concat');
var config = require('../config.js');
var ngAnnotate = require('gulp-ng-annotate');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var plumber = require('gulp-plumber');
var util = require('util');
var env = require('../../env');

function buildJs(sources, destFilename, isAngular) {
  var task = gulp.src(sources)
    .pipe(sourcemaps.init())
    .pipe(plumber({errorHandler: onError}))
    .pipe(concat(destFilename));

  if(isAngular) {
    task = task.pipe(ngAnnotate());
  }
  
  return task.pipe(gulpif(env.uglify, uglify()))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(config.publicDest));
}

function onError(error) {
  console.log(util.inspect(error, {depth: null, showHidden: true}));
}

gulp.task('build-sdk-js', function() {
  // TODO: Implement a proper module & dependency manager in SDK.
  var src = config.sdkLoadOrder.map(function(sdkFilePattern) {
    return config.sdkDir + "/" + sdkFilePattern;
  });

  return buildJs(src, config.sdkJsFileName, false);
});

gulp.task('build-openfin-popouts-js', ['build-openfin-popouts-template-cache'], function() {
  return buildJs(
    config.openFinPopoutSources, config.openFinPopoutJsFileName, true);
});

gulp.task('build-vendor-js', function() {
  return buildJs(config.jsDependencies, config.vendorsName, false);
});

gulp.task('build-main-app-js', ['build-main-app-template-cache'], function() {
  return buildJs(config.sources, config.appName, true);
});

gulp.task('build-js', [
  'build-vendor-js', 
  'build-sdk-js', 
  'build-main-app-js',
  'build-openfin-popouts-js'
]);
