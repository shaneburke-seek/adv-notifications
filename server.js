var moment = require('moment');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var Redis = require('ioredis');
var redisAddress = process.env.REDIS_ADDRESS || 'redis://127.0.0.1:6379';

var redis = new Redis(redisAddress);
var subscribers = {};
var notificationHistoryMax = 10;

app.get('/health', function(request, response) {
    response.send('ok');
});

function addSubscriber(subscriberKey) {
    var client = new Redis(redisAddress);

    client.subscribe(subscriberKey);

    client.on('notification', function(channel, notification) {
        io.emit(subscriberKey, JSON.parse(notification));
    });

    subscribers[subscriberKey] = client;
}

addSubscriber('notifications');

io.on('connection', function(socket) {
    console.log('New connection', socket.id);
    // get the highest ranking notifications (most recent) up to notificationHistoryMax size
    var getNotifications = redis
        .zrange('notifications', -1 * notificationHistoryMax, -1)
        .then(function(result) {
            console.log('result', result);
            if (!result || result.length === 0) {
                return [
                    {
                        id: 1,
                        title: 'Biztalk-SAP has 1 new candidate(s)',
                        timestamp: moment.now(),
                        read: false
                    },
                    {
                        id: 2,
                        title: 'Senior devops-SS will expire in 2 day(s)',
                        timestamp: moment.now(),
                        read: false
                    },
                    {
                        id: 3,
                        title: 'Joe Bloggs replied to your message',
                        timestamp: moment.now(),
                        read: true
                    },
                    {
                        id: 4,
                        title: 'Senior QA Specialist has 1 new candidate(s)',
                        timestamp: moment.now(),
                        read: false
                    },
                    {
                        id: 5,
                        title: 'Biztalk-SAP has 1 new candidate(s)',
                        timestamp: moment.now(),
                        read: true
                    }
                ];
            }

            return result.map(function(x) {
                return JSON.parse(x);
            });
        });

    Promise.all([getNotifications])
        .then(function(values) {
            var notifications = values[0];
            io.emit('init', 'Notifications connected!');
            io.emit('notifications', notifications);

            socket.on('disconnect', function() {
                // On disconnect
            });
        })
        .catch(function(reason) {
            console.log('ERROR: ' + reason);
        });
});

http.listen(port, function() {
    console.log('Started server on port ' + port);
});
