var express = require('express');
var app = express();

var serveIndex  = require('serve-index');
var serveStatic = require('serve-static');

app.use('/', serveStatic('dist'));
app.use('/assets', serveStatic('assets'));
// app.use('/bower_components',  express.static(__dirname + '/bower_components'));

app.listen(3010, function () {

    console.log('Server is running');

});
