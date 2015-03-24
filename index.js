function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}

function messageQueueChangeListener(value, key, map){
    if(value && value.messages.length > 0){
        // console.log('----------------messageQueueListener--------------------');
        var socket = value.socket;
        while(message = value.messages.pop()){
            socket.emit('message', message);
        }
        // socket.emit('message', message);
        // console.log('--------------------------------------------------------');
    }
}

function sendEmails(recipientId, correspondenceIds){
    var postData = querystring.stringify({
        'recipientId': recipientId,
        'correspondenceIds': correspondenceIds
    });

    var options = {
        hostname: '127.0.0.1',
        port: 80,
        path: '/iosocket_message',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        }
    };

    var req = someHttp.request(options, function(res) {
        // console.log('STATUS: ' + res.statusCode);
        // console.log('HEADERS: ' + JSON.stringify(res.headers));
        // res.setEncoding('utf8');
        // res.on('data', function (chunk) {
        //     console.log('BODY: ' + chunk);
        // });
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });

    // write data to request body
    req.write(postData);
    req.end();
}

function sendRequestNotification(notification){
    var mailOptions = {
        from: 'some address <testingpurposeduck@gmail.com>',
        to: 'bromshveiger@gmail.com',
        subject: 'Новые запросы по вашему фильтру',
        text: JSON.stringify(notification),
        html: '<b>' + JSON.stringify(notification) + '</b>'
    };
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.log(error);
        }else{
            console.log('Message sent: ' + info.response);
        }
    });
}

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var multer = require('multer');
var EventedArray = require('array-events');
var querystring = require('querystring');
var someHttp = require('http');
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'testingpurposeduck@gmail.com',
        pass: 'someweirdpassword'
    }
});

var socketMap = require('collections/fast-map')();
socketMap.addMapChangeListener(messageQueueChangeListener);
var NodeCache = require('node-cache');
var socketCache = new NodeCache({stdTTL: 120, checkperiod: 140});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer());

app.get('/', function(req, res){
    res.send('<h1>Hello there!</h1>');
});

app.post('/token', function(req, res){
    var userId = req.body.userId;
    var token = req.body.token;
    var keyValue = socketCache.get(userId);
    if(isEmptyObject(keyValue)){
        socketCache.set(userId, {'token': token, 'messages': new Array()});
    }else{
        keyValue[userId]['token'] = token;
    }
});

app.post('/message', function(req, res){
    var userId = req.body.userId;
    var message = JSON.parse(req.body.message);
    var correspondencePath = req.body.correspondencePath;
    var correspondenceId = req.body.correspondenceId;
    var socketMapValue = socketMap.get(userId);
    if(socketMapValue){
        var messages = socketMapValue.messages;
        messages.push({
            'message': message,
            'link': correspondencePath,
            'correspondenceId': correspondenceId
        });
        socketMap.set(userId, socketMapValue);
        res.send({'success': true});
        return;
    }
    var cachedUser = socketCache.get(userId);
    if(!isEmptyObject(cachedUser)){
        cachedUser[userId]['messages'].push({
            'message': message,
            'link': correspondencePath,
            'correspondenceId': correspondenceId
        });
        res.send({'success': true});
        return;
    }
    // console.log('user not found');
    //@todo send mails via symfony
    sendEmails(userId, [correspondenceId]);
});

app.post('/request_notification', function(req, res){
    console.log(req.body);
    sendRequestNotification(req.body);
});

app.get('/flush', function(req, res){
    socketCache.flushAll();
    res.send({'success': true});
});

io.on('connection', function(socket){
    // console.log('a user connected');
    var userId = null;
    socket.on('disconnect', function(){
        var val = socketMap.get(userId);
        if(val){
            socketCache.set(userId, {'token': val.token, 'messages': val.messages});
            socketMap.delete(userId);
        }
    });
    socket.on('token', function(data){
        // console.log('client verification: ' + data.id);
        userId = data.id;
        var cachedUser = socketCache.get(userId);
        if(!isEmptyObject(cachedUser) && data.token == cachedUser[userId]['token']){
            // console.log('user was cached. moving to socketMap...');
            cachedUser[userId]['socket'] = socket;
            socketMap.set(userId, cachedUser[userId]);
        }
        socketCache.del(userId);
    });
});


//@todo write all the stuff bout sending expired messages via symfony
socketCache.on('expired', function(key, value){
    var messages = value['messages'];
    var correspondenceIds = messages.map(function(item){
        return item.correspondenceId;
    });
    var notOnlyNotifications = messages.some(function(item){
        return item.message.unread;
    });
    uniqueCorrespondenceIds = correspondenceIds.filter(function(id, index){
        return correspondenceIds.indexOf(id) == index;
    });
    if(uniqueCorrespondenceIds.length > 0 && notOnlyNotifications){
        sendEmails(key, uniqueCorrespondenceIds);
    }
});

socketCache.on('set', function(key, value){
    // console.log('cache:    user ' + key + ' was set');
    // console.log('cache:    value:');
    // console.log(value);
});

socketCache.on('del', function(key){
    // console.log('cache:    user ' + key + ' removed');
});

http.listen(8090, function(){
    // console.log('listen on *:8090');
});