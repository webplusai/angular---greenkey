var gulp = require('gulp');
var uglify = require('gulp-uglify');
var config = require('../config.js');
var fileInsert = require("gulp-file-insert");
var concat = require('gulp-concat');

gulp.task('create-main-chat-injected-file', function() {
  return gulp.src('app/chats/main.js')
    .pipe(fileInsert({
      "/** NotificationHelper **/": "app/chats/helpers/notificationHelper.js",
      "/** BinaryDataHelpers **/": "app/chats/helpers/binaryDataHelpers.js",
      "/** FailsafeHelper **/": "app/chats/helpers/failsafeHelper.js",
      "/** TornChatsAutoOpener **/": "app/chats/helpers/tornChatsAutoOpener.js",
      "/** FocusDetectHelper **/": "app/chats/helpers/focusDetectHelper.js",
      "/** ChatController **/": "app/chats/base/chatController.js",
      "/** ChatUiController **/": "app/chats/base/chatUiController.js",
      "/** ChatDataProvider **/": "app/chats/base/chatDataProvider.js",
      "/** ChatBlastDialog **/": "app/chats/base/chatBlastDialog.js",
      "/** WhatsAppChatController **/": "app/chats/whatsapp/whatsAppChatController.js",
      "/** WhatsAppChatUiController **/": "app/chats/whatsapp/whatsAppChatUiController.js",
      "/** WhatsAppChatDataProvider **/": "app/chats/whatsapp/whatsAppChatDataProvider.js",
      "/** WeChatController **/": "app/chats/wechat/weChatController.js",
      "/** WeChatUiController **/": "app/chats/wechat/weChatUiController.js",
      "/** WeChatDataProvider **/": "app/chats/wechat/weChatDataProvider.js",
      "/** YahooContactsImportDialog **/": "app/chats/yahoo/yahooContactsImportDialog.js",
      "/** YahooChatController **/": "app/chats/yahoo/yahooChatController.js",
      "/** YahooChatUiController **/": "app/chats/yahoo/yahooChatUiController.js",
      "/** YahooChatDataProvider **/": "app/chats/yahoo/yahooChatDataProvider.js",
      "/** AimChatController **/": "app/chats/aim/aimChatController.js",
      "/** AimChatUiController **/": "app/chats/aim/aimChatUiController.js",
      "/** AimChatDataProvider **/": "app/chats/aim/aimChatDataProvider.js"
    }))
    .pipe(uglify())
    .pipe(gulp.dest(config.publicDest + '/chats'));
});

gulp.task('combine-vendors-chat-injected-scripts', function() {
  var dependenies = [
    'bower_components/lodash-latest/dist/lodash.min.js',
    'app/chats/helpers/lodashConflictResolver.js',
    'bower_components/mediator/mediator.min.js',
    'bower_components/md5/build/md5.min.js',
    'bower_components/moment/min/moment.min.js',
    'bower_components/papaparse/papaparse.min.js',
    'bower_components/simple-uuid/uuid.js',
    'bower_components/spin.js/spin.min.js'
  ];

  return gulp.src(dependenies)
    .pipe(concat('vendors.js'))
    .pipe(uglify())
    .pipe(gulp.dest(config.publicDest + '/chats'));
});

gulp.task('combine-chat-injected-css', function() {
  return gulp.src('app/chats/css/*.css')
    .pipe(concat('common.css'))
    .pipe(gulp.dest(config.publicDest + '/chats'));
});


gulp.task('build-chats-injected-assets', [
  'create-main-chat-injected-file',
  'combine-vendors-chat-injected-scripts',
  'combine-chat-injected-css'
]);
