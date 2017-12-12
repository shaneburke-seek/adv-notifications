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
    console.log('New connection yo!', socket.id);
    const advertiserId = socket.handshake.query.advertiserId;

    socket.on('disconnect', function() {
        console.log(`socket disconnected for advertiser ${advertiserId}`)
    });

    // get the highest ranking notifications (most recent) up to notificationHistoryMax size
    redis.subscribe('broadcast', advertiserId, function (err, count) {
        if (err) {
            console.log(`advertiser ${advertiserId} failed to subscribe to redis channels ${err}`);
        }
      });

    redis.on('message', function (channel, message) {
        const parsed = JSON.parse(message)
        console.log('Receive message %s from channel %s', parsed, channel);
        io.emit('notifications', parsed);
      });
});

http.listen(port, function() {
    console.log('Started server on port ' + port);
});
