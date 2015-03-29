var isEmptyObject = require('./utils').isEmptyObject;
var R = require('ramda');

module.exports = {
    getSocketConnectListener: function(socketMap, socketCache){
        return function(socket){
            var userId = null;
            socket.on('disconnect', function(){
                var val = socketMap.get(userId);
                if(val){
                    socketCache.set(userId, {
                        'token': val.token,
                        'messages': val.messages,
                        'requests': val.requests,
                        'email': val.email
                    });
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
        };
    },
    getMessageQueueChangeListener: function(){
        return function(value){
            if(value){
                var socket = value.socket;
                if(value.messages.length > 0){
                    var message;
                    while(message = value.messages.pop()){
                        socket.emit('message', message);
                    }
                }
                if(value.requests.length > 0){
                    socket.emit('componentRequest', value.requests.length);
                    value.requests = [];
                }
            }
        };
    },
    getCacheExpireListener: function(expireCallback){
        return function(key, value){
            R.compose(
                R.forEach(function(message){
                    expireCallback(message.recipientEmail, 'correspondence', {
                        id: message.correspondenceId,
                        name: message.componentRequestName
                    });
                }),
                R.filter(R.where({unread: true})),
                R.pluck('message')
            )(value.messages);
            if(value.requests.length > 0){
                expireCallback(value.email, 'request', value.requests);
            }
        };
    }
};