var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var multer = require('multer');
var NodeCache = require('node-cache');
var myRouter = require('./router');
var mailer = require('./mailer');
var express = require('express');

var socketCache = new NodeCache({stdTTL: 20, checkperiod: 25});
var socketMap = require('collections/fast-map')();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

//listeners stuff
var factory = require('./factory');
//end listeners stuff


socketMap.addMapChangeListener(factory.getMessageQueueChangeListener());
socketCache.on('expired', factory.getCacheExpireListener(mailer.scheduleEmail));

io.on('connection', factory.getSocketConnectListener(socketMap, socketCache));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer());
app.use(express.static('public'));

app.use(function(req,res,next){
    req.socketMap = socketMap;
    req.socketCache = socketCache;
    next();
});

app.use(myRouter);

http.listen(8090, function(){
});
