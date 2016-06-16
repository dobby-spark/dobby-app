/* dobby_spark.js */
'use strict';

const request = require('request');

module.exports = {
  fetchMessage: fetchMessage,
  sendMessage: sendMessage
};

const getReq = request.defaults({
  // uri: 'https://api.ciscospark.com/v1/messages/',
  method: 'GET',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer MTFkN2UwZDQtN2RjYi00NmQ0LWJkZjQtZDcwNjk1MjBkM2VmOThkZDdmODgtZTgx' },
});

function fetchMessage(msgId, cb) {
  // console.log("fetching message:", msgId);
  getReq('https://api.ciscospark.com/v1/messages/' + msgId, function (err, resp, data) {
    // console.log("fetched message:", data);
    if (cb) {
      cb(err || data.error && data.error.message, data);
    }
  });
};

const postReq = request.defaults({
  uri: 'https://api.ciscospark.com/v1/messages',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer MTFkN2UwZDQtN2RjYi00NmQ0LWJkZjQtZDcwNjk1MjBkM2VmOThkZDdmODgtZTgx' },
});

function sendMessage(roomId, text, cb) {
  const opts = {
    json: {
      roomId: roomId,
      text: text,
    },
  };
  postReq(opts, function (err, resp, data) {
    if (cb) {
      cb(err || data.error && data.error.message, data);
    }
  });
};
