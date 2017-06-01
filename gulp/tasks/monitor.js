var gulp = require("gulp");
const gutil = require('gulp-util');
const spawn = require('child_process').spawn;
const through = require('through2');
var phantomjs = require('phantomjs');


gulp.task('monitor', function(){
    
    var phantomJS = function(options) {
        var cmnd = phantomjs.path;
        var args = [options.script];

        var log = function(text) {
            if (options.debug) {
                console.log(text);
            }
        };

        return through.obj(function(file, encoding, callback) {
            var program;
            var stdin, str;
      
            args[1] = file.path;
            log('phantomJS args', args);
            program = spawn(cmnd, args);
            var logSaved = '';
            
            program.stdout.on('data', (data) => {
                log('[INFO] ' + data);
                logSaved += data;
            });

            program.stderr.on('data', (data) => {
                log('[ERROR] ' + data);
                logSaved += data;
            });
            program.on('close', (code) => {
                if (code) {
                    this.emit('error', new gutil.PluginError('monitor', logSaved));
                }
            });

            return callback();
        });
    };
    
    var logIt = function(error) {
        gutil.log(gutil.colors.red('ERROR'));
        console.log(error.message);
    };
    
    gulp.src("./monitor/sites/*.json") // 
    //.pipe(through.obj(noBreakLines))
    .pipe(phantomJS({script: '/home/sperruolo/workspaces/voicebox-webrtc/monitor/evaluate.js', debug: false}))
    .on('error', logIt);

});

