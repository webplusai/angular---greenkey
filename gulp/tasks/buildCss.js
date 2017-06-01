var gulp = require('gulp');
var config = require('../config.js');
var concat = require('gulp-concat');
var rev = require('gulp-rev');
var revReplace = require("gulp-rev-replace");
var merge = require('merge-stream');
var streamqueue = require('streamqueue');

gulp.task('copy-css', function() {
  var queue = new streamqueue({objectMode: true});
  for(var index in config.css) {
    var item = config.css[index];
    queue.queue(
      gulp.src(item.sources).pipe(concat(item.destFilename)))
  }

  return queue.done()
    .pipe(rev())
    .pipe(gulp.dest(config.publicDest))
    .pipe(rev.manifest({base: config.dest}))
    .pipe(gulp.dest(config.publicDest));
});

gulp.task('build-css', ['copy-css'], function() {
  var tasks = config.htmlForRevision.map(function(item) {
    var manifest = gulp.src(config.dest + "/rev-manifest.json");
    return gulp.src(item.src)
      .pipe(revReplace({manifest: manifest}))
      .pipe(gulp.dest(item.dest))
  });

  return merge(tasks);
});