/* dobby_spark.js */
'use strict';

const request = require('request');

module.exports = {
  fetchMessage: fetchMessage,
  sendMessage: sendMessage,
  whoAmI: whoAmI,
};

const getReq = request.defaults({
  // uri: 'https://api.ciscospark.com/v1/messages/',
  method: 'GET',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer MTFkN2UwZDQtN2RjYi00NmQ0LWJkZjQtZDcwNjk1MjBkM2VmOThkZDdmODgtZTgx' },
});

function fetchMessage(token, msgId, cb) {
   request.get({
    uri: 'https://api.ciscospark.com/v1/messages/' + msgId,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    }}, (err, resp, data) => {
      // console.log("fetched message:", data);
      if (cb) {
        cb(err || data.error && data.error.message, data);
      }
  });
};

const postReq = request.defaults({
  uri: 'https://api.ciscospark.com/v1/messages',
  method: 'POST',
});

function sendMessage(token, roomId, text, cb) {
  const opts = {
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
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

function whoAmI(token, cb) {
  request.get({
    uri: 'https://api.ciscospark.com/v1/people/me',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    }}, (err, resp, data) => {
      if (cb) {
        if (err || (data.error && data.error.message) || !data.length) {
          cb(null);
        } else {
          const me = JSON.parse(data);
          cb({
            name: me.displayName,
            id: me.id,
            email: me.emails[0],
          });
        }
      }
    });
}