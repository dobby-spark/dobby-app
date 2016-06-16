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

// token for dobby V3
const token = "VV4QBUD2ZYMXRJBX4TWFQCSEJIWRXGXG";

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

// map INTENT --> TOPIC --> STATE --> INPUT --> MSG, NEXT_STATE
const msgs = {
  'info': {
    'pager': {
      '1': {
        '1': {
          'msg': 'what kind of information you need?',
          'next': '1',
        },
        'wiki': {
          'msg': 'wiki for pager handling is @ http://cbabu-wiki.cisco.com:8080/display/HTAA/2AM+Document+CES+Auto+Attendant+Service',
          'next': null,
          'intent': null,
        },
        'how-to': {
          'msg': null,
          'next': null,
          'intent': 'coaching',
        },
      },
    },
    'tests': {
      '1': {
        '1': {
          'msg': 'what kind of information you need?',
          'next': '1',
        },
        'wiki': {
          'msg': 'wiki for automation tests is @ http://cbabu-wiki.cisco.com:8080/display/HTAA/Troubleshooting+CES+Sanity+Test+Failures',
          'next': null,
          'intent': null,
        },
        'how-to': {
          'msg': null,
          'next': null,
          'intent': 'coaching',
        },
      },
    },
  },
  'coaching': {
    'pager': {
      '1': {
        '1': {
          'msg': 'have you acknowledged the page?',
          'next': 'askAck',
        },
      },
      'askAck': {
        'yes': {
          'msg': 'great, how can i help?',
          'next': 'help',
        },
        'no': {
          'msg': 'please acknowledge page at pager duty website or app',
          'next': 'askAck',
        },
        'incomplete': {
          'msg': 'have you acknowledge page at pager duty website or app?',
          'next': 'askAck',
        },
        'complete': {
          'msg': 'great, how can i help?',
          'next': 'help',
        },
      },
    },
    'tests': {
        '1': {
          '1': {
            'msg': 'what help you need with tests?',
            'next': 'askType',
          },
        },
        'askType': {
          'failure': {
            'msg': 'hmm, do you have session ID of the failed test?',
            'next': 'testsFailureAskSessionID',
          },
        },
        'testsFailureAskSessionID': {
          'yes': {
            'msg': 'can you find call trace and check where it failed?',
            'next': 'debugTestFailureAskPoF',
          },
          'yes': {
            'msg': 'can you find call trace and check where it failed?',
            'next': 'debugTestFailureAskPoF',
          },
        },
    },
  },
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
    // No session found for roomId, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {roomId: roomId, context: {}};
  }
  return sessionId;
};

const mergeContext = (sessionId, context) => {
  // console.log("merging context:", sessions[sessionId].context);
  context.intent = sessions[sessionId].context.intent;
  context.topic = sessions[sessionId].context.topic;
  context.input = sessions[sessionId].context.input;
  context.state = sessions[sessionId].context.state;
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
    if (cb) {
     cb();
    }
  },
  merge(sessionId, context, entities, message, cb) {
    console.log("entities:", entities);
    console.log("context", context);
    console.log("session context:", sessions[sessionId].context);
    const intent = bestEntityValue(entities, 'intent');
    if (intent) {
      sessions[sessionId].context.intent = intent;
      context.intent = intent;
    }
    const topic = bestEntityValue(entities, 'topic');
    if (topic) {
      sessions[sessionId].context.topic = topic;
      context.topic = topic;
    }
    const input = bestEntityValue(entities, 'input');
    if (input) {
      sessions[sessionId].context.input = input;
      context.input = input;
    }
    cb(context);
  },
  error(sessionId, context, err) {
    console.log(err.message);
  },
  clean(sessionId, context, cb) {
    console.log("cleaning up state/context");
    context = {};
    sessions[sessionId].context = {};
    cb(context);
  },
  nextState(sessionId, context, cb) {
    mergeContext(sessionId, context);
    console.log("context", context);
    const intent = context.intent;
    const topic = context.topic;
    var input = context.input;
    if (input == null) {
      input = '1';
    }
    var state = context.state;
    if (state == null) {
      state = '1';
    }
    var nextState = msgs[intent][topic][state][input].next;
    var nextIntent = msgs[intent][topic][state][input].intent;

    if (nextIntent) {
      sessions[sessionId].context.intent = nextIntent;
      sessions[sessionId].context.state = nextState;
      sessions[sessionId].context.input = null;
      actions.nextState(sessionId, context, cb);
      return;
    }

    var msg = msgs[intent][topic][state][input].msg;
    if (msg == null) {
      msg = "sorry, can't help with " + intent + " for " + topic + "!";
      nextState = null;
      nextIntent = null;
    }
    if (nextState == null) {
      actions.clean(sessionId, context, cb);
    } else {
      sessions[sessionId].context.state = nextState;
    }
    actions.say(sessionId, context, msg, cb);
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
                // console.log("got message:", d);
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
                      // sessions[sessionId].context = context;
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
