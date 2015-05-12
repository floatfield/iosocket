var path            = require('path'),
    templatesDir    = path.resolve(__dirname, 'templates'),
    emailTemplates  = require('email-templates'),
    nodemailer      = require('nodemailer'),
    schedule        = require('node-schedule'),
    R               = require('ramda'),
    os              = require('os'),
    ifaces          = os.networkInterfaces(),
    ownIp           = R.compose(
        R.head,
        R.pluck('address'),
        R.filter(isIPv4),
        R.flatten,
        R.values
    )(ifaces),
    imagesUrl = 'http://localhost/bundles/parts/res/',
    smtpPool = require('nodemailer-smtp-pool'),
    smtpConfig = {
        port: 2525,
        host: 'mail.used-part.ru'
    };

schedule.scheduleJob('*/1 * * * *', function(){
    R.forEach(function(item){
        item.correspondences = R.values(item.correspondences);
    }, emailMap);
    sendEmails(emailMap);
    emailMap = [];
});

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
                            from: fromString,
                            //@todo change to client's email in production
                            to: 'bromshveiger@gmail.com',
                            subject: 'У вас есть новые сообщения',
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
                    var locals = R.merge(users[user], {
                        images: imagesUrl
                    });
                    var render = new Render(locals);
                    render.batch(batch);
                }
            });
        }
    });
}

function isIPv4(entry){
    return entry.family === 'IPv4' && entry.address !== '127.0.0.1';
}

var emailMap = [],
    transporter = nodemailer.createTransport(smtpPool(smtpConfig)),
    fromString = 'Биржа запчастей <admin@used-part.ru>';

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
        },
        sendPasswordEmail: function(email, password){
            emailTemplates(templatesDir, function(err, template) {
                if (err) {
                    console.log(err);
                } else {
                    var locals = {
                        email: email,
                        password: password,
                        images: imagesUrl
                    };
                    template('password-letter', locals, function (err, html, text) {
                        if (err) {
                            console.log(err);
                        } else {
                            transporter.sendMail({
                                from: fromString,
                                //@todo change in production
                                to: 'bromshveiger@gmail.com',
                                subject: 'Пароль к вашей учетной записи',
                                html: html,
                                // generateTextFromHTML: true,
                                text: text
                            }, function (err, responseStatus) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log(responseStatus.message);
                                }
                            });
                        }
                    });
                }
            });
        },
        sendPasswordRestorationEmail: function(email, link){
            emailTemplates(templatesDir, function(err, template) {
                if (err) {
                    console.log(err);
                } else {
                    var locals = {
                        email: email,
                        link: link,
                        images: imagesUrl
                    };
                    template('password-restore-letter', locals, function (err, html, text) {
                        if (err) {
                            console.log(err);
                        } else {
                            transporter.sendMail({
                                from: fromString,
                                //@todo change in production
                                to: 'bromshveiger@gmail.com',
                                subject: 'Восстановление учетной записи',
                                html: html,
                                // generateTextFromHTML: true,
                                text: text
                            }, function (err, responseStatus) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log(responseStatus.message);
                                }
                            });
                        }
                    });
                }
            });
        },
        sendUserNotifications: function(email, text){
            emailTemplates(templatesDir, function(err, template) {
                if (err) {
                    console.log(err);
                } else {
                    var locals = {
                        email: email,
                        text: text,
                        images: imagesUrl
                    };
                    template('user-notifications', locals, function (err, html, text) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(html);
                            transporter.sendMail({
                                from: fromString,
                                //@todo change in production
                                to: 'bromshveiger@gmail.com',
                                subject: 'Системное уведомление',
                                html: html,
                                // generateTextFromHTML: true,
                                text: text
                            }, function (err, responseStatus) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log(responseStatus.message);
                                }
                            });
                        }
                    });
                }
            });
        }
    };
}());
