var env = require('../env');

var dest = 'build';
var publicDest = dest + '/public';
var templateCacheFile = dest + '/templates.module.js';
var popoutsTemplateCacheFile = dest + '/openFinTemplates.module.js';
  
module.exports =  {
  dest: dest,
  publicDest: publicDest,
  sdkDir: 'voicebox-javascript-sdk',
  
  appName: env.uglify ? 'app.min.js' : 'app.js',
  vendorsName: env.uglify ? 'vendors.min.js' : 'vendors.js',
  sdkJsFileName: env.uglify ? 'sdk-bundle.min.js' : 'sdk-bundle.js',
  openFinPopoutJsFileName: env.uglify ? 'openfin.min.js' : 'openfin.js',
  
  buildId: require('crypto').randomBytes(10).toString('hex'),
  
  placeholders: {
    jsUrls: {
      '$GREEN_KEY_APP_JS_URL': 'appName',
      '$SDK_BUNDLE_JS_URL': 'sdkJsFileName',
      '$VENDORS_JS_URL': 'vendorsName',
      '$OPENFIN_POPOUT_JS_URL': 'openFinPopoutJsFileName'
    }
  },
  
  vector: [
    'public/vector/*',
    'public/vector/**/*',
    'public/vector/**/**/*'
  ],

  sources: [
    'app/modules/**/*.module.js',
    'app/modules/**/*.js',
    'app/services/**/*.module.js',
    'app/services/**/*.js',
    'app/*.js',
    templateCacheFile
  ],

  openFinPopoutSources: [
    'app/openfin/tvbOpenFinBus.js',
    'app/openfin/app.openfin.js',
    'app/modules/common/_commonConstants.module.js',
    'app/services/openfin/intercom/_openFinIntercom.module.js',
    'app/modules/common/paging/_paging.module.js',

    'app/openfin/modules/**/*.js',
    'voicebox-javascript-sdk/sdk/gkt.constants.js',
    'app/modules/common/common.constants.js',
    'app/services/openfin/intercom/messageFactory.factory.js',
    'app/modules/common/paging/pagingController.factory.js',

    popoutsTemplateCacheFile
  ],

  integrationConfigSources: [
    '*.json'
  ],

  symphonySources: [
    'app/symphony/symphony-index.html',
    'app/symphony/symphony-app.html',
    'app/symphony/symphony-app-iframe.html'
  ],

  mainAppHtmlTemplates: [
    'public/partials/*.html',
    'public/partials/**/*.html'
  ],

  openFinPopoutHtmlTemplates: ['app/openfin/modules/**/*.html'],

  htmlIndexFiles: [
    {
      src: 'app/*.html',
      dest: publicDest
    },
    {
      src: 'app/openfin/*.html',
      dest: publicDest + '/openfin'
    }
  ],

  htmlForRevision: [
    {
      src: publicDest + '/*.html',
      dest: publicDest
    },
    {
      src: publicDest + '/openfin/*.html',
      dest: publicDest + '/openfin'
    }
  ],
  
  jsDependencies: [
    'bower_components/jquery/dist/jquery.min.js',
    'bower_components/jquery.hotkeys/jquery.hotkeys.js',
    'bower_components/jquery-ui/jquery-ui.min.js',
    'bower_components/angular/angular.min.js',
    'bower_components/angular-bootstrap/ui-bootstrap.min.js',
    'bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js',
    'bower_components/angular-cookies/angular-cookies.js',
    'bower_components/bootstrap/dist/js/bootstrap.js',
    'bower_components/angular-resource/angular-resource.js',
    'bower_components/angular-route/angular-route.js',
    'bower_components/angular-socket-io/socket.js',
    'bower_components/ngDialog/js/ngDialog.min.js',
    'bower_components/lodash/lodash.min.js',
    'bower_components/bootstrap-switch/dist/js/bootstrap-switch.min.js',
    'bower_components/angular-bootstrap-switch/dist/angular-bootstrap-switch.min.js',
    'bower_components/spin.js/spin.min.js',
    'bower_components/angular-spinner/angular-spinner.min.js',
    'bower_components/ui-select/dist/select.min.js',
    'bower_components/angular-sanitize/angular-sanitize.min.js',
    'bower_components/socket.io-client/socket.io.js',
    'node_modules/ngstorage/ngStorage.min.js',
    'bower_components/ajax/dist/ajax.min.js',
    'bower_components/recordrtc/RecordRTC.min.js',
    'bower_components/ng-idle/angular-idle.min.js',
    'bower_components/angular-dragdrop/src/angular-dragdrop.js',
    'bower_components/promise-polyfill/Promise.js',
    'bower_components/machina/lib/machina.min.js',
    'bower_components/angular-translate/angular-translate.js',
    'bower_components/angular-translate-loader-url/angular-translate-loader-url.js',
    'bower_components/angular-translate-storage-cookie/angular-translate-storage-cookie.min.js',
    'bower_components/angular-translate-loader-static-files/angular-translate-loader-static-files.min.js',
    'bower_components/moment/min/moment.min.js',
    'bower_components/mediator/mediator.min.js',
    'bower_components/md5/build/md5.min.js',
    'bower_components/linkifyjs/linkify.min.js',
    'bower_components/linkifyjs/linkify-string.min.js',
    'bower_components/cropperjs/dist/cropper.min.js',
    'bower_components/simple-uuid/uuid.js',
    'bower_components/angular-notify/dist/angular-notify.min.js',
    'bower_components/objtree/ObjTree.js',
    'bower_components/papaparse/papaparse.min.js',
    'bower_components/angular-ui-switch/angular-ui-switch.min.js'
  ],

  assets: [
    'public/assets/**/*',
    'public/assets/**/**/*',
    'public/dependencies/**/**/*',
    'public/images/*',
    'public/img/**/*',
    'public/sounds/*',
    'public/sounds/**/*'
  ],

  // TODO: Build SDK with a proper module & dependency management.
  sdkLoadOrder: [
    'sdk/contacts/main.js',
    'sdk/contacts/connection.js',
    'sdk/contacts/connection.audioDevice.js',
    'sdk/contacts/connection.ringdown.js',
    'sdk/contacts/connection.external.js',
    'sdk/contacts/connection.hoot.js',
    'sdk/contacts/*',
    'sdk/fsm/*',
    'sdk/*',
    'sdk/cme.clearport/clearport.js',
    'sdk/cme.clearport/tradeCaptureReport.js'
  ],

  fonts: [
    'bower_components/font-awesome/fonts/*'
  ],

  css: {
    app: {
      destFilename: 'app.css',
      sources: [
      'public/css/app.css',
      'public/css/**/*.css'
      ]
    },

    openFin: {
      destFilename: 'openFin.css',
      sources: ['app/openfin/**/*.css']
    },

    vendor: {
      destFilename: 'vendor.css',
      sources: [
        'bower_components/animate.css/animate.min.css',
        'bower_components/font-awesome/css/font-awesome.min.css',
        'bower_components/bootstrap/dist/css/bootstrap.css',
        'bower_components/ngDialog/css/ngDialog.css',
        'bower_components/ngDialog/css/ngDialog-theme-default.css',
        'bower_components/bootstrap-switch/dist/css/bootstrap3/bootstrap-switch.min.css',
        'bower_components/ui-select/dist/select.css',
        'bower_components/select2/select2.css',
        'bower_components/cropperjs/dist/cropper.min.css',
        'bower_components/angular-notify/dist/angular-notify.min.css',
        'bower_components/angular-ui-switch/angular-ui-switch.min.css'
      ]
    }
  },

  configSources: [
    'public/configs/**/*'
  ]
};
