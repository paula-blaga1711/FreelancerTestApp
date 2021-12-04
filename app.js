const express = require('express');
global.app = express();
app.disable('etag').disable('x-powered-by');

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});


const path = require('path');
const createError = require('http-errors');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

app.use(express.urlencoded({extended: true, limit: '50mb'})); 
app.use(express.json({ limit: '50mb' }));

app.use(logger('dev'));
app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/resources', express.static(path.join(__dirname, '/resources')));

require('./config/db');
require('./config/auth0');
require('./routes/index');

const { port } = require('./config/config').environmentVariables

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.json({
        status: "error",
        message: err.message
    })
});


app.listen(port, '0.0.0.0')

module.exports = app;