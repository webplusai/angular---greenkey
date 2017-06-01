var express = require('express');
var app = express();

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var expressmethodoverride = require('express-method-override');
var expresssession = require('express-session');
var env = require("./env.js");
var fs = require('fs');
var https = require('https');

app.use(bodyParser());
app.use(cookieParser());
app.use(expressmethodoverride());

app.sessions = {};

app.use(expresssession({
    secret: '3240983eiojdlsdijoi',
    cookie: {
        expires: new Date(Date.now() + 6000 * 100000),
        maxAge: 6000 * 100000
    }
}));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", '*');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});

app.use(express.static('build/public'));
//app.use(express.static('public'));


//Begin Authentication

var router = express.Router();

//Ends Authentication

var port = env.port;

console.log("Port is: " + env.port);

app.get('*', function(req, res){
    res.sendfile('build/public/index.html');
});

if (env.https) {

    var serverConfig = {
        key: fs.readFileSync(env.priv_key_path),
        cert: fs.readFileSync(env.pub_key_path)
    };

    if (env.pub_ca_path) {
        serverConfig.ca = fs.readFileSync(env.pub_ca_path);
    }

    var server = https.createServer(serverConfig, app).listen(port);

    var nonSecureApp = express();

    nonSecureApp.get('*', function (req, res, next) {
        res.redirect('https://' + server.address().address + req.url);
        next();
    });

} else {
    var server = app.listen(port, function() {
        var host = server.address().address;
        var port = server.address().port;

        console.log('Example app listening at http://%s:%s', host, port);

    });
}
