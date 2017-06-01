var gulp = require('gulp');
var config = require('../config.js');
var concat = require('gulp-concat');
var merge = require('merge-stream');
var replace = require('gulp-replace');
var env = require('../../env');

gulp.task('fill-js-urls', function() {
  var tasks = config.htmlForRevision.map(function(item) {
    var task = gulp.src(item.src);
    for(var index in config.placeholders.jsUrls) {
      task.pipe(replace(index, config[config.placeholders.jsUrls[index]]))
    }
    return task
      .pipe(replace("@@hash", config.buildId))
      .pipe(gulp.dest(item.dest))
  });

  return merge(tasks);
});

gulp.task('fill-json-placeholders', function () {
  return gulp.src(config.publicDest + '/' + config.integrationConfigSources)
    .pipe(replace('$TVB_WEB_URL', env.tvbWebURL))
    .pipe(replace('$TVB_WEB_ICON', env.tvbWebIcon))
    .pipe(replace('$SYMPHONY_CONFIG_DOMAIN', env.symphonyConfigDomain))
    .pipe(replace('$OPENFIN_CONFIG_APP_NAME', env.openfinConfigAppName))
    .pipe(replace('$OPENFIN_CONFIG_APP_DESCRIPTION', env.openfinConfigAppDescription))
    .pipe(replace('$OPENFIN_CONFIG_SHORTCUT_NAME', env.openfinConfigShortcutName))
    .pipe(replace('$OPENFIN_CONFIG_SHORTCUT_DESCRIPTION', env.openfinConfigShortcutDescription))
    .pipe(replace('$OPENFIN_CONFIG_DEFAULT_WIDTH', env.openfinConfigDefaultWidth))
    .pipe(replace('$OPENFIN_CONFIG_DEFAULT_HEIGHT', env.openfinConfigDefaultHeight))
    .pipe(replace('$OPENFIN_CONFIG_UUID', env.openfinConfigUUID))
    .pipe(replace('$OPENFIN_CONFIG_RUNTIME_ARGUMENTS', env.openfinConfigRuntimeArguments))
    .pipe(replace('$BUILD_ID', config.buildId))
    .pipe(gulp.dest(config.publicDest));
});

gulp.task('fill-js-placeholders', function () {
  return gulp.src(config.publicDest + '/*.js')
    .pipe(replace('$ENV_NAME', env.env))
    .pipe(replace('$TVC_URL', env.baseUrl))
    .pipe(replace('$TVB_WEB_URL', env.tvbWebURL))
    .pipe(replace('$LINKED_IN_CLIENT_ID', env.linkedInClientId))
    .pipe(replace('$TT_CLIENT_ID', env.ttClientId))
    .pipe(replace('$BUILD_ID', config.buildId))
    .pipe(gulp.dest(config.publicDest));
});

gulp.task('fill-html-placeholders', ['fill-js-urls'], function () {
  return gulp.src(config.publicDest + '/*.html')
    .pipe(replace('$TVB_WEB_URL', env.tvbWebURL))
    .pipe(gulp.dest(config.publicDest));
});

// Creates a json file with contains the buildId.
gulp.task('create-build-version', function () {
  return gulp.src(config.configSources)
    .pipe(replace('$BUILD_ID', '"' + config.buildId + '"'))
    .pipe(gulp.dest(config.dest + '/public/configs'));
});

gulp.task('fill-placeholders', [
  'create-build-version',
  'fill-json-placeholders',
  'fill-js-placeholders',
  'fill-html-placeholders'
]);