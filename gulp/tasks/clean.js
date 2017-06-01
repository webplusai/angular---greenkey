var gulp = require('gulp');
var rm = require('gulp-rimraf');

gulp.task('clean', function() {
  return gulp.src('build/*', { read: false, force: true }).pipe(rm());
});
