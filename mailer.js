var path             = require('path')
    , templatesDir   = path.resolve(__dirname, 'templates')
    , emailTemplates = require('email-templates');
var nodemailer = require('nodemailer');
//var smtpPool = require('nodemailer-smtp-pool');
var schedule = require('node-schedule');
var R = require('ramda');

function sendEmails(users){
    emailTemplates(templatesDir, function(err, template) {
        if (err) {
            console.log('template: ', err);
        } else {
            var Render = function(locals) {
                this.locals = locals;
                this.send = function(err, html, text) {
                    if (err) {
                        console.log('the first one: ', err);
                    } else {
                        transporter.sendMail({
                            from: 'Биржа запчастей <testingpurposeduck@gmail.com>',
                            //@todo change to client's email in production
                            to: 'bromshveiger@gmail.com',
                            subject: 'У вас новые сообщения',
                            html: html,
                            // generateTextFromHTML: true,
                            text: text
                        }, function(err, responseStatus) {
                            if (err) {
                                console.log('transporter_err: ', err);
                            } else {
                                console.log(responseStatus.message);
                            }
                        });
                    }
                };
                this.batch = function(batch) {
                    batch(this.locals, templatesDir, this.send);
                };
            };

            // Load the template and send the emails
            template('new-messages', true, function(err, batch) {
                for(var user in users) {
                    var render = new Render(users[user]);
                    render.batch(batch);
                }
            });
        }
    });
}

schedule.scheduleJob('*/1 * * * *', function(){
    //R.head(emailMap);
    R.forEach(function(item){
        item.correspondences = R.values(item.correspondences);
    }, emailMap);
    sendEmails(emailMap);
    //console.log(emailMap);
    emailMap = [];
});

var isUndefined = require('./utils').isUndefined;
var emailMap = [];

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'testingpurposeduck',
        pass: 'someweirdpassword'
    }
});


module.exports = (function(){
    return {
        scheduleEmail: function(email, type, value){
            var entry = R.find(R.propEq('email', email))(emailMap);
            if(R.isNil(entry)){
                var obj = {
                    email: email,
                    correspondences: {},
                    requests: {}
                };
                if(type === 'correspondence'){
                    obj['correspondences'][value.id] = {
                        name: value.name,
                        count: 1
                    };
                }else{
                    obj['requests'] = value;
                }
                emailMap.push(obj);
            }else{
                if(type === 'correspondence'){
                    if(R.isNil(entry['correspondences'][value.id])){
                        entry['correspondences'][value.id] = {
                            name: value.name,
                            count: 1
                        };
                    }else{
                        entry['correspondences'][value.id]['count'] += 1;
                    }
                }else{
                    entry['requests'] = value;
                }
            }
        }
    };
}());