var gulp = require('gulp');
var config = require('../config.js');
var templateCache = require('gulp-angular-templatecache');
var TEMPLATE_HEADER = 'angular.module("<%= module %>"<%= standalone %>).run([' +
    '"$templateCache", function($templateCache) {\'use strict\';';
var env = require('../../env');

gulp.task('build-main-app-template-cache', function () {
  return gulp.src(config.mainAppHtmlTemplates)
    .pipe(templateCache('templates.module.js', { module: 'gkt.voiceBox.templates',
      standalone: true,
      root: '/partials',
      templateHeader: TEMPLATE_HEADER
    }))
    .pipe(gulp.dest(config.dest));
});

gulp.task('build-openfin-popouts-template-cache', function () {
  return gulp.src(config.openFinPopoutHtmlTemplates)
    .pipe(templateCache('openFinTemplates.module.js', {
      module: 'gkt.voiceBox.openFinTemplates',
      standalone: true,
      root: '/openfin/modules',
      templateHeader: TEMPLATE_HEADER
    }))
    .pipe(gulp.dest(config.dest));
});
