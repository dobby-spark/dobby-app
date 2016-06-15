'use strict';

const request = require('request');
const sleep = require('sleep');
const Wit = require('node-wit').Wit;
// When cloning the `node-wit` repo, replace the `require` like so:
// const Wit = require('../').Wit;

const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value
  ;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};

const bestEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value
  ;
  if (!val) {
    return null;
  }
  var result = null;
  entities[entity].forEach(function(value) {
    if (result == null || result.confidence < value.confidence) {
      result = value;
    }
  });
  return typeof result === 'object' ? result.value : result;
};

// const token = (() => {
//   if (process.argv.length !== 3) {
//     console.log('usage: node examples/template.js <wit-token>');
//     process.exit(1);
//   }
//   return process.argv[2];
// })();

const token = "RO7ASNPUVWRS6JVSSWAQ534IMGHETEBN";

const pollReq = request.defaults({
  uri: 'https://dobby-spark.appspot.com/v1/poll/amit1on1',
  method: 'GET',
  headers: {'Content-Type': 'application/json'},
});

const getMessages = (cb) => {
  // console.log('polling for messages...');
  const opts = {};
  request.get('https://dobby-spark.appspot.com/v1/poll/amit1on1', (err, resp, data) => {
  // console.log('finished polling');
    if (cb) {
      cb(err || data.error && data.error.message, data);
    }
  });
};

const postReq = request.defaults({
  uri: 'https://api.ciscospark.com/v1/messages',
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer MTFkN2UwZDQtN2RjYi00NmQ0LWJkZjQtZDcwNjk1MjBkM2VmOThkZDdmODgtZTgx'},
});

const sendMessage = (roomId, text, cb) => {
  const opts = {
    json: {
      roomId: roomId,
      text: text,
    },
  };
  postReq(opts, (err, resp, data) => {
    if (cb) {
      cb(err || data.error && data.error.message, data);
    }
  });
};

const getReq = request.defaults({
  // uri: 'https://api.ciscospark.com/v1/messages/',
  method: 'GET',
  headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer MTFkN2UwZDQtN2RjYi00NmQ0LWJkZjQtZDcwNjk1MjBkM2VmOThkZDdmODgtZTgx'},
});

const fetchMessage = (msgId, cb) => {
  // console.log("fetching message:", msgId);
  getReq('https://api.ciscospark.com/v1/messages/' + msgId, (err, resp, data) => {
    // console.log("fetched message:", data);
    if (cb) {
      cb(err || data.error && data.error.message, data);
    }
  });
};

const sessions = {};

const findOrCreateSession = (roomId) => {
  let sessionId;
  // Let's see if we already have a session for the roomId
  Object.keys(sessions).forEach(k => {
    if (sessions[k].roomId === roomId) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {roomId: roomId, context: {}};
  }
  return sessionId;
};


const actions = {
  say(sessionId, context, message, cb) {
    console.log(message);
    // send message to spark room
    const roomId = sessions[sessionId].roomId;
    if (roomId) {
      // we have a room for this sesssion, send message there
      sendMessage(roomId, message, (err, data) => {
        if (err) {
          console.log(
            'Oops! An error occurred while forwarding the response to',
            roomId,
            ':',
            err
          );
        }
      });
    } else {
      console.log("did not find any room Id");
    }
    cb();
  },
  merge(sessionId, context, entities, message, cb) {
    console.log("entities:", entities);
    console.log("context", context);
    const intent = bestEntityValue(entities, 'intent');
    if (intent) {
      context.intent = intent;
    }
    const topic = bestEntityValue(entities, 'topic');
    if (topic) {
      context.topic = topic;
    }
    cb(context);
  },
  error(sessionId, context, err) {
    console.log(err.message);
  },
  clean(sessionId, context, cb) {
    console.log("cleaning up state/context");
    context = {};
    cb(context);
  },
  findInfo(sessionId, context, cb) {
    if (context.topic == 'pager') {
      context.url = 'http://cbabu-wiki.cisco.com:8080/display/HTAA/2AM+Document+CES+Auto+Attendant+Service';
    } else if (context.topic == 'tests') {
      context.url = 'http://cbabu-wiki.cisco.com:8080/display/HTAA/Troubleshooting+CES+Sanity+Test+Failures';
    }
    actions.say(sessionId, context, "you can find " + context.intent + " for " + context.topic + " @ " + context.url, cb);
  },
  dobby(sessionId, context, cb) {
    if (context.intent == 'info') {
      actions.findInfo(sessionId, context, cb);
    } else if (context.intent == 'greeting') {
      actions.say(sessionId, context, "Greetings from " + context.topic, cb);
    } else {
      actions.say(sessionId, context, "sorry, cannot help with " + context.intent + " for " + context.topic + " yet!", cb); 
    }
  },
};

const wit = new Wit(token, actions);
const poll = (err, d) => {
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
        data.forEach(function(value) {
            if (value.data.personEmail && value.data.personEmail.includes('dobby.spark@gmail.com')) {
              // this is my own message, so discard
              console.log("discarding my own message");
            } else {
            // fetch the message from spark
            fetchMessage(value.data.id, (err, d) => {
              if (d) {
                console.log("got message:", d);
                var data = JSON.parse(d);
                const sessionId = findOrCreateSession(data.roomId);
                wit.runActions(
                  sessionId, // the user's current session
                  data['text'], // the user's message 
                  sessions[sessionId].context, // the user's current session state
                  (error, context) => {
                    if (error) {
                      console.log('Oops! Got an error from Wit:', error);
                    } else {
                      // Our bot did everything it has to do.
                      // Now it's waiting for further messages to proceed.
                      console.log('Waiting for further messages.');

                      // Based on the session state, you might want to reset the session.
                      // This depends heavily on the business logic of your bot.
                      // Example:
                      // if (context['done']) {
                      //   delete sessions[sessionId];
                      // }

                      // Updating the user's current session state
                      sessions[sessionId].context = context;
                    }
                  }
                );
              }
            });              
            }
        });
      }
    }
    // sleep
    sleep.sleep(1);
    getMessages(poll);
};
  
getMessages(poll);
