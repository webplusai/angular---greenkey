"use strict";

var fs = require('fs');
var page = require('webpage').create();
var system = require('system');

/**
 * Using a fake user-agent to make this work 
 */
page.settings.userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/49.0.2623.108 Chrome/49.0.2623.108 Safari/537.36';

var evaluateDifferences = function(scriptURLs, options) {
    var ops = options || {};
    var exclude = options.exclude || [];
    var filesArray = scriptURLs;

    /**
     * This function returns the items in second that are not in first
     */
    var arrayDiff = function(first, second) {
        return second.filter(function(i) {return !(first.indexOf(i) > -1);});
    };
    /**
     * This function print the array information if array is not empty
     */
    var printDiff = function(text, array) {
        if (!array.length) {
            return 0;
        }
        console.log(text);
        for (var i in array) {
            console.log('\t' + array[i]);
        }
        return 2;
    };
        
    for (var regExpText in exclude) {
        var regExp = new RegExp(exclude[regExpText]);
        filesArray = filesArray.filter(function(i) {return !regExp.test(i);});
    }
   
    var savedFiles = [];
    try {
        savedFiles = JSON.parse(fs.read(ops.file));
    } catch(e) {
        console.log(e);
    }
    var removed = arrayDiff(filesArray, savedFiles);
    var added = arrayDiff(savedFiles, filesArray);

    fs.write(ops.file, JSON.stringify(filesArray), 'w');

    var exitCode = printDiff('FILES REMOVED', removed);
    exitCode += printDiff('FILES ADDED', added);

    phantom.exit(exitCode);

};

var evalPage = function(options) {
    // resources to be excluded
    var regExpAbortList = [new RegExp('css$'), new RegExp('png$')];
    
    var log = function(text) {
        if (options.debug) {
            console.log(text);
        }
    };
    
    page.onResourceRequested = function(requestData, request) {
        log('requestData\n\t Content-Type:' + requestData.headers['Content-Type']);
        log('\t url:' + requestData.url);
        var regExpAbort = function(re) {
            if (re.test(requestData.url)) {
                log('\t aborted');
                request.abort();
            }
        };
        
        for (var i in regExpAbortList) {
            regExpAbort(regExpAbortList[i]);
        }

    };

    page.open(options.url, function(status) {
        log(options.url + ' loaded: ' + status);
        if (status === "success") {
            log(page.content);
            var scriptURLs = page.evaluate(function() {
                var scriptArray = [];
                var nodelist = document.querySelectorAll('script');
                for (i = 0; i < nodelist.length; ++i) {
                    var srcAttr = nodelist[i].attributes.getNamedItem('src');
                    if (srcAttr) {
                        scriptArray.push(srcAttr.value);
                    }
                }
                return scriptArray;
            });
            evaluateDifferences(scriptURLs, options);
            
        } else {
            phantom.exit(1);
        }
    });
};

/**
 * This is an example of a config json
 * var yahooMessenger = {
 *     url: 'https://messenger.yahoo.com/',
 *     file: 'yahoo.json',
 *     exclude: ['^https://a.analytics.yahoo.com/fpc.pl'],
 *     debug: true
 * };
 */


if (system.args.length < 2) {
    console.log("Usage: evaluate.js SITE_FILE");
    phantom.exit(1);
}

var siteOps = JSON.parse(fs.read(system.args[1]));

evalPage(siteOps);
