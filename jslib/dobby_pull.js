/* dobby_pull.js */
'use strict';

const request = require('request');
const sleep = require('sleep');
const dobby_spark = require('./dobby_spark');

module.exports = {
  getMessages: getMessages
};

var myChannel;

var myEmail;

function getMessages(token, channel, email, cb) {
  // console.log('polling for messages...');
  const opts = {};
  if (!myChannel) {
    myChannel = channel;
  }
  if (!myEmail) {
    myEmail = email;
  }
  request.get('https://dobby-spark.appspot.com/v1/poll/' + channel, function (err, resp, data) {
    // console.log('finished polling');
    if (cb) {
      poll(token, myEmail, err || data.error && data.error.message, data, cb);
    }
  });
};

function poll(token, myEmail, err, d, processSparkMessageCB) {
  if (err) {
    console.log(
      'Oops! An error occurred while fetching messages:',
      err
    );
  } else {
    // console.log("got messages:", d);
    // walk through each message notification
    if (d) {
      var data = JSON.parse(d);
      // console.log('data:', data);
      data.forEach(function (value) {
        if (value.data.personEmail && value.data.personEmail.includes(myEmail)) {
          // this is my own message, so discard
          // console.log("discarding my own message");
        } else {
          // fetch the message from spark
          dobby_spark.fetchMessage(token, value.data.id, processSparkMessageCB);
        }
      });
    }
  }
  // sleep
  sleep.sleep(1);
  getMessages(token, myChannel, myEmail, processSparkMessageCB);
};
