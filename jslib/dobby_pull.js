/* dobby_pull.js */
'use strict';

const request = require('request');
const sleep = require('sleep');
const dobby_spark = require('./dobby_spark');

module.exports = {
  getMessages: getMessages
};

function getMessages(cb) {
  // console.log('polling for messages...');
  const opts = {};
  request.get('https://dobby-spark.appspot.com/v1/poll/philip1on1', function (err, resp, data) {
    // console.log('finished polling');
    if (cb) {
      poll(err || data.error && data.error.message, data, cb);
    }
  });
};

function poll(err, d, processSparkMessageCB) {
  if (err) {
    console.log(
      'Oops! An error occurred while fetching messages:',
      err
    );
  } else {
    console.log("got messages:", d);
    // walk through each message notification
    if (d) {
      var data = JSON.parse(d);
      // console.log('data:', data);
      data.forEach(function (value) {
        if (value.data.personEmail && value.data.personEmail.includes('dobby.spark@gmail.com')) {
          // this is my own message, so discard
          // console.log("discarding my own message");
        } else {
          // fetch the message from spark
          dobby_spark.fetchMessage(value.data.id, processSparkMessageCB);
        }
      });
    }
  }
  // sleep
  sleep.sleep(1);
  getMessages(processSparkMessageCB);
};
