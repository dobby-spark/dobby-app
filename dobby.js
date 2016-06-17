'use strict';

const dobby_bot = require('./jslib/dobby_bot');
const dobby_pull = require('./jslib/dobby_pull');
const dobby_spark = require('./jslib/dobby_spark');
const dobby_cass = require('./jslib/dobby_cass');
const async = require('async');

if (process.argv.length != 4) {
  console.log('usage: node dobby.js <channel-name> <bot-email>');
  process.exit(1);
}

const channelName = process.argv[2];
const botEmail = process.argv[3];
console.log("Chatbot: " + botEmail + " listening on channel: " + channelName);

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
    sessions[sessionId] = { roomId: roomId, context: {} };
    console.log("created new session:", sessions[sessionId]);
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

// const nextEntry = (intent, topic, state, input) => {
const nextEntry = (context, nextEntryCB) => {
  var next = null;
  if (!context.intent) {
    context.intent = '1';
  }
  if (!context.topic) {
    context.topic = '1';
  }
  if (!context.state) {
    context.state = '1';
  }
  if (!context.input) {
    context.input = '1';
  }

  function convertResult(row) {
    var res = {};
    res.next = row.nextstate ? row.nextstate : null;
    res.intent = row.nextintent ? row.nextintent : null;
    res.msg = row.msg ? row.msg : null;
    return res;
  }

  // next = msgs[context.intent][context.topic][context.state][context.input];
  async.series([
    function (callback) {
      if (!next) {
        dobby_cass.getState(context.intent, context.topic, context.state, context.input, function (err, result) {
          if (err) {
            next = null;
          } else if (result.rows.length > 0) {
            next = convertResult(result.rows[0]);
          }
          callback(err, null);
        });
      } else {
        callback(null, null);
      }
    },
    function (callback) {
      if (!next) {
        dobby_cass.getState(context.intent, context.topic, context.state, '1', function (err, result) {
          if (err) {
            next = null;
          } else if (result.rows.length > 0) {
            next = convertResult(result.rows[0]);
          }
          callback(err, null);
        });
      } else {
        callback(null, null);
      }
    },
    function (callback) {
      if (!next) {
        dobby_cass.getState(context.intent, context.topic, '1', '1', function (err, result) {
          if (err) {
            next = null;
          } else if (result.rows.length > 0) {
            next = convertResult(result.rows[0]);
          }
          callback(err, null);
        });
      } else {
        callback(null, null);
      }
    },
    function (callback) {
      if (!next) {
        dobby_cass.getState(context.intent, '1', '1', '1', function (err, result) {
          if (err) {
            next = null;
          } else if (result.rows.length > 0) {
            next = convertResult(result.rows[0]);
          }
          callback(err, null);
        });
      } else {
        callback(null, null);
      }
    },
    function (callback) {
      if (!next) {
        dobby_cass.getState('1', '1', '1', '1', function (err, result) {
          if (err) {
            next = null;
          } else if (result.rows.length > 0) {
            next = convertResult(result.rows[0]);
          }
          callback(err, null);
        });
      } else {
        callback(null, null);
      }
    }
  ], function (err, results) {
    nextEntryCB(next);
  });
};

const actions = {
  say(sessionId, context, message, cb) {
    // console.log(message);
    // send message to spark room
    const roomId = sessions[sessionId].roomId;
    if (roomId) {
      // we have a room for this sesssion, send message there
      dobby_spark.sendMessage(roomId, message, (err, data) => {
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
    // console.log("entities:", entities);
    // console.log("context", context);
    // console.log("session context:", sessions[sessionId].context);
    // const intent = bestEntityValue(entities, 'intent');
    const intent = entities['intent'];
    if (intent && (intent == 'command' || !sessions[sessionId].context.intent)) {
      sessions[sessionId].context.intent = intent;
      context.intent = intent;
    }
    // const topic = bestEntityValue(entities, 'topic');
    const topic = entities['topic'];
    if (!sessions[sessionId].context.topic && topic) {
      sessions[sessionId].context.topic = topic;
      context.topic = topic;
    }
    // const input = bestEntityValue(entities, 'input');
    const input = entities['input'];
    if (input) {
      sessions[sessionId].context.input = input;
      context.input = input;
    }
    cb(context);
  },
  error(sessionId, context, err) {
    console.log(err.message);
    actions.clean(sessionId, context);
  },
  clean(sessionId, context, cb) {
    console.log("cleaning up state/context");
    context = {};
    delete sessions[sessionId];
    cb(context);
  },
  nextState(sessionId, context, cb) {
    mergeContext(sessionId, context);
    sessions[sessionId].context.input = null;
    // console.log("context", context);
    nextEntry(context, function (result) {
      var next = result;
      // console.log("got next entry:", next);
      if (next.intent) {
        sessions[sessionId].context.intent = next.intent;
        sessions[sessionId].context.state = next.next;
        actions.nextState(sessionId, context, cb);
        return;
      }

      // say whatever dobby says
      actions.say(sessionId, context, next.msg, cb);

      // run state transition
      if (next.next == null) {
        actions.clean(sessionId, context, cb);
      } else {
        sessions[sessionId].context.state = next.next;
      }
    });
  },
};

function processSparkMessage(err, d) {
  if (d) {
    // console.log("got message:", d);
    var data = JSON.parse(d);
    const sessionId = findOrCreateSession(data.roomId);
    try {
      dobby_bot.runActions(
        actions,
        sessionId, // the user's current session
        data['text'], // the user's message 
        sessions[sessionId].context, // the user's current session state
        (error, context) => {
          if (error) {
            console.log('Oops! Got an error from Wit:', error);
          } else {
            // Our bot did everything it has to do.
            // Now it's waiting for further messages to proceed.
            // console.log('Waiting for further messages.');
          }
        }
      );
    } catch (e) {
      console.log("parser error:", e);
      dobby_spark.sendMessage(data.roomId, "could not parse response, please wake up Philip!", (err, data) => {
        if (err) {
          console.log(
            'Oops! An error occurred while forwarding the response to',
            data.roomId,
            ':',
            err
          );
        }
      });
    }
  }
}

dobby_pull.getMessages(channelName, botEmail, processSparkMessage);