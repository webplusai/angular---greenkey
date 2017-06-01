var argv = require('yargs').argv;
var gulp = require('gulp');
var assign = require('object-assign');
var rename = require("gulp-rename");
var replace = require('gulp-replace');

function getEnvironment() {

  var COMMON_ENV_DATA = {
    ttClientId: '4e3909e7af3c4c20874ee77d80ab8393',
    openfinConfigShortcutDescription: "Green Key",
    openfinConfigAppName: "Green Key",
    openfinConfigAppDescription: "Green Key",
    openfinConfigShortcutName: "Green Key",
    openfinConfigDefaultWidth: "1920",
    openfinConfigDefaultHeight: "1080",
    port: 443,
    https: true,
    uglify: true,
    symphonyConfigDomain: ".tradervoicebox.com"
  };

  var BASIC_ENVIRONMENTS = {
    'prod': assign({}, COMMON_ENV_DATA, {
      base_url: "https://prod.tradervoicebox.com",
      instance: "PROD",
      openfinConfigUUID: "GreenKey-yeotwn3hvf6wh142",
      openfinConfigRuntimeArguments: "--v=1 --noerrdialogs --enable-aggressive-domstorage-flushing",
      tvbWebUrl: "web.tradervoicebox.com",
      tvbWebIcon: "favicon-gk.ico",
      priv_key_path: "/etc/tradervoicebox/webrtc/keys/web.tradervoicebox.com.key",
      pub_key_path: "/etc/tradervoicebox/webrtc/keys/web.tradervoicebox.com.cert",
      pub_ca_path: "/etc/tradervoicebox/webrtc/keys/web.tradervoicebox.com.ca",
      linkedInClientId: '77w71kz91q19yo'
    }),
    'test': assign({}, COMMON_ENV_DATA, {
      base_url: "https://test.tradervoicebox.com",
      instance: "TEST",
      openfinConfigUUID: "GreenKeyTest-yeotwn3hvf6wh199",
      openfinConfigRuntimeArguments: "--v=1 --noerrdialogs --enable-aggressive-domstorage-flushing --enable-blink-features=EnumerateDevices,AudioOutputDevices",
      tvbWebUrl: "test.web.tradervoicebox.com",
      tvbWebIcon: "favicon-gk.ico",
      priv_key_path: "/etc/tradervoicebox/webrtc/keys/test.web.tradervoicebox.com.key",
      pub_key_path: "/etc/tradervoicebox/webrtc/keys/test.web.tradervoicebox.com.cert",
      pub_ca_path: "/etc/tradervoicebox/webrtc/keys/test.web.tradervoicebox.com.ca",
      linkedInClientId: '77ev4esqzv11c9'
    })
  };

  // Modifiers are applied in presented order
  // So same options will be overwritten by former ones
  var TEST_ENV_MODIFIERS = {
    'local': {
      port: 3000,
      instance: "LOCAL",
      symphonyConfigDomain: "localhost",
      openfinConfigRuntimeArguments: "--v=1 --enable-aggressive-domstorage-flushing",
      tvbWebUrl: "localhost:3000",
      priv_key_path: "dev-https-keys/server-key.pem",
      pub_key_path: "dev-https-keys/server-cert.pem",
      pub_ca_path: "",
      https: false,
      uglify: false
    },
    'staging': {
      tvbWebUrl: "staging.web.tradervoicebox.com"
    },
    'debug': {
      tvbWebUrl: "webdebug.tradervoicebox.com",
      uglify: false
    },
    'https': {
      https: true
    },
    'uglify': {
      uglify: true
    }
  };

  var postfixes = ['debug', 'staging'];

  function applyPostfix(value, option) {
    environment[option] = environment[option] + ' ' + value;
  }

  var envName = argv.env;
  if(!BASIC_ENVIRONMENTS.hasOwnProperty(envName))
    throw new Error("'env' argument should be set to 'test' or 'prod'");

  var environment = BASIC_ENVIRONMENTS[envName];
  environment.env = envName;
  // check for test env modifiers
  var postfix = '';
  if(envName === 'test') {
    for (var modifier in TEST_ENV_MODIFIERS) {
      if(argv[modifier] !== undefined) {
        assign(environment, TEST_ENV_MODIFIERS[modifier]);
        if(postfixes.indexOf(modifier) >= 0)
          postfix = modifier;
      }
    }
    if(postfix.length === 0)
      postfix = 'test';

    if(argv['local'])
      postfix += ' local';

    applyPostfix(postfix, 'openfinConfigShortcutDescription');
    applyPostfix(postfix, 'openfinConfigAppName');
    applyPostfix(postfix, 'openfinConfigAppDescription');
    applyPostfix(postfix, 'openfinConfigShortcutName');
  }


  // set url scheme according to https property
  environment.tvbWebUrl = (environment.https ? 'https://' : 'http://')
    + environment.tvbWebUrl;

  return environment;
}

gulp.task('prepare-env', function() {
  var environment = getEnvironment();

  return gulp.src('env.js.example')
    .pipe(replace('$ENV_NAME', environment.env))
    .pipe(replace('$HTTPS', environment.https))
    .pipe(replace('$PORT', environment.port))
    .pipe(replace('$BASE_URL', environment.base_url))
    .pipe(replace('$TVB_WEB_URL', environment.tvbWebUrl))
    .pipe(replace('$TVB_WEB_ICON', environment.tvbWebIcon))
    .pipe(replace('$SYMPHONY_CONFIG_DOMAIN', environment.symphonyConfigDomain))
    .pipe(replace('$OPENFIN_CONFIG_APP_NAME', environment.openfinConfigAppName))
    .pipe(replace('$OPENFIN_CONFIG_APP_DESCRIPTION', environment.openfinConfigAppDescription))
    .pipe(replace('$OPENFIN_CONFIG_SHORTCUT_NAME', environment.openfinConfigShortcutName))
    .pipe(replace('$OPENFIN_CONFIG_SHORTCUT_DESCRIPTION', environment.openfinConfigShortcutDescription))
    .pipe(replace('$OPENFIN_CONFIG_DEFAULT_WIDTH', environment.openfinConfigDefaultWidth))
    .pipe(replace('$OPENFIN_CONFIG_DEFAULT_HEIGHT', environment.openfinConfigDefaultHeight))
    .pipe(replace('$OPENFIN_CONFIG_UUID', environment.openfinConfigUUID))
    .pipe(replace('$OPENFIN_CONFIG_RUNTIME_ARGUMENTS', environment.openfinConfigRuntimeArguments))
    .pipe(replace('$INSTANCE', environment.instance))
    .pipe(replace('$LINKED_IN_CLIENT_ID', environment.linkedInClientId))
    .pipe(replace('$TT_CLIENT_ID', environment.ttClientId))
    .pipe(replace('$PRIV_KEY_PATH', environment.priv_key_path))
    .pipe(replace('$PUB_KEY_PATH', environment.pub_key_path))
    .pipe(replace('$PUB_CA_PATH', environment.pub_ca_path))
    .pipe(replace('$UGLIFY', environment.uglify))
    .pipe(rename('env.js'))
    .pipe(gulp.dest('.'));
});