var express = require('express');
var isEmptyObject = require('./utils').isEmptyObject;
var R = require('ramda');

var mailer = require('./mailer');

module.exports = (function(){
    var router = express.Router();

    router.post('/token', function(req, res){
        var socketCache = req.socketCache;
        var userId = req.body.userId;
        var token = req.body.token;
        var keyValue = socketCache.get(userId);
        if(isEmptyObject(keyValue)){
            socketCache.set(userId, {
                'token': token,
                'messages': [],
                'requests': [],
                email: ''}
            );
        }else{
            keyValue[userId]['token'] = token;
        }
    });

    router.post('/message', function(req, res){
        var socketCache = req.socketCache;
        var socketMap = req.socketMap;
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
        mailer.scheduleEmail(message.recipientEmail, 'correspondence', {
            id: message.correspondenceId,
            name: message.componentRequestName
        });
    });

    router.post('/request_notification', function(req, res){
        var socketMap = req.socketMap;
        var socketCache = req.socketCache;
        var userId = req.body.id;
        var userEmail = req.body.email;
        var requests = R.values(JSON.parse(req.body.requests));
        var socketMapValue = socketMap.get(userId);
        if(socketMapValue){
            socketMapValue.email = userEmail;
            socketMapValue.requests = requests;
            socketMap.set(userId, socketMapValue);
            res.send({'success': true});
            return;
        }
        var cachedUser = socketCache.get(userId);
        if(!isEmptyObject(cachedUser)){
            cachedUser[userId]['email'] = userEmail;
            cachedUser[userId]['requests']= requests;
            res.send({'success': true});
            return;
        }
        mailer.scheduleEmail(userEmail, 'request', requests);
    });

    return router;
}());