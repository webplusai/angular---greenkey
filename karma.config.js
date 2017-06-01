module.exports = function(config) {
  config.set({
    basePath: '',
    files: [
      'public/bower_components/jquery/dist/jquery.js',
      'public/bower_components/angular/angular.js',
      'public/bower_components/angular-mocks/angular-mocks.js',
      'public/bower_components/angular-bootstrap/ui-bootstrap.js',
      'public/bower_components/angular-cookies/angular-cookies.js',
      'public/bower_components/angular-local-storage/dist/angular-local-storage.js',
      'public/bower_components/angular-resource/angular-resource.js',
      'public/bower_components/angular-route/angular-route.js',
      'public/bower_components/angular-socket-io/socket.js',
      'public/bower_components/sipml5/SIPml-api.js',
      'node_modules/jasmine-ajax/lib/mock-ajax.js',
      'app/modules/**/*.module.js','app/modules/**/*.constants.js','app/modules/**/*.provider.js', 'app/modules/**/*.service.js',
      'app/modules/**/*.factory.js', 'app/modules/**/*.directive.js',
      'app/modules/**/*.controller.js', 'build/templates.module.js','app/*.js', 'app/modules/**/*.spec.js',
    ],
    singleRun: true,
    frameworks: ['jasmine'],
    browsers: ['Chrome'],
    reporters: ['progress', 'junit', 'coverage'],//'html'
    junitReporter: {
      outputDir: 'build/tests', // results will be saved as $outputDir/$browserName.xml
      outputFile: 'unitTestReport.xml', // if included, results will be saved as $outputDir/$browserName/$outputFile
    },
    preprocessors: {
      // source files, that you wanna generate coverage for
      // do not include tests or libraries
      // (these files will be instrumented by Istanbul)
      'app/modules/**/*.module.js': ['coverage'],
      'app/modules/**/*.constants.js': ['coverage'],
      'app/modules/**/*.service.js': ['coverage'],
      'app/modules/**/*.provider.js': ['coverage'],
      'app/modules/**/*.factory.js': ['coverage'],
      'app/*.js': ['coverage']


    },
    coverageReporter: {
      type : 'html',
      dir : './build/coverage/'
    }
  });
};
