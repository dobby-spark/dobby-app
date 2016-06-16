'use strict';

const Wit = require('node-wit').Wit;
const dobby_pull = require('./jslib/dobby_pull');
const dobby_spark = require('./jslib/dobby_spark');

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

// token for dobby V3 wit app
const token = "VV4QBUD2ZYMXRJBX4TWFQCSEJIWRXGXG";

// map INTENT --> TOPIC --> STATE --> INPUT --> MSG, NEXT_STATE, NEXT_INTENT
const msgs = {
  '1': {
    '1': {
      '1': {
        '1': {
          'msg': 'Sorry, I do not understand, please try again.',
          'next': null,
        },
      }
    },
  },
  'greeting': {
    'dobby': {
      '1': {
        '1': {
          'msg': 'Greetings from Dobby!',
          'next': null,
        },
      }
    },
    '1': {
      '1': {
        '1': {
          'msg': 'Hi there!',
          'next': null,
        },
      }
    },
  },
  'info': {
    '1': {
      '1': {
        '1': {
          'msg': 'what kind of information you need?',
          'next': '1',
        },
      }
    },
    'dobby': {
      '1': {
        '1': {
          'msg': 'Dobby can help with handling pagers, tests, auto attendant etc.!',
          'next': null,
        },
      }
    },
    'pager': {
      '1': {
        '1': {
          'msg': 'what you looking for pager?',
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
          'msg': 'what you looking for tests?',
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
    '1': {
      '1': {
        '1': {
          'msg': 'what you want me to help on?',
          'next': '1',
        },
      }
    },
    'dobby': {
      '1': {
        '1': {
          'intent': 'info',
        },
      }
    },
    'pager': {
      '1': {
        '1': {
          'msg': 'have you acknowledged the page?',
          'next': 'askAck',
        },
      },
      'askAck': {
        'yes': {
          'msg': 'do you know what is source of the page?',
          'next': 'askPageSource',
        },
        '1': {
          'msg': 'have you acknowledge page at pager duty website or app?',
          'next': 'askAck',
        },
        'complete': {
          'msg': 'do you know what is source of the page?',
          'next': 'askPageSource',
        },
        'next': {
          'msg': 'do you know what is source of the page?',
          'next': 'askPageSource',
        },
      },
      'askPageSource': {
        'yes': {
          'msg': 'great please refer to 2AM doc to resolve page',
          'next': null,
        },
        'complete': {
          'msg': 'great please refer to 2AM doc to resolve page',
          'next': null,
        },
        '1': {
          'msg': 'Ok, please refer to pager duty incidence for source of page',
          'next': 'askPageSource',
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
          '1': {
            'msg': 'sorry, I do not know how to handle this!!!',
            'next': null,
          },
        },
        'testsFailureAskSessionID': {
          'yes': {
            'msg': 'can you find call trace and check where it failed?',
            'next': 'debugTestFailureAskPoF',
          },
          '1': {
            'msg': 'please refer to test report and find session ID from failed test log',
            'next': 'testsFailureAskSessionID',
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
const nextEntry = (context) => {
  var next;
  try {
    next = msgs[context.intent][context.topic][context.state][context.input];
    if (next) {
      return next;
    }
  } catch (e) {
    // failed
  };
  try {
    next = msgs[context.intent][context.topic][context.state]['1'];
    if (next) {
      return next;
    }
  } catch (e) {
    // failed
  };
  try {
    next = msgs[context.intent][context.topic]['1']['1'];
    if (next) {
      return next;
    }
  } catch (e) {
    // failed
  };
  try {
    next = msgs[context.intent]['1']['1']['1'];
    if (next) {
      return next;
    }
  } catch (e) {
    // failed
  };
  return msgs['1']['1']['1']['1'];

};

const actions = {
  say(sessionId, context, message, cb) {
    console.log(message);
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
    actions.clean(sessionId, context);
  },
  clean(sessionId, context, cb) {
    console.log("cleaning up state/context");
    context = {};
    sessions[sessionId].context = {};
    cb(context);
  },
  nextState(sessionId, context, cb) {
    mergeContext(sessionId, context);
    sessions[sessionId].context.input = null;
    console.log("context", context);
    var next = nextEntry(context);
    console.log("got next entry:", next);
    if (next.intent) {
      sessions[sessionId].context.intent = next.intent;
      sessions[sessionId].context.state = next.next;
      actions.nextState(sessionId, context, cb);
      return;
    }

    var msg = next.msg;
    if (msg == null) {
      msg = "sorry, can't help with " + intent + " for " + topic + "!";
      next.next = null;
      next.intent = null;
    }
    if (next.next == null) {
      actions.clean(sessionId, context, cb);
    } else {
      sessions[sessionId].context.state = next.next;
    }
    actions.say(sessionId, context, msg, cb);
  },
};

const wit = new Wit(token, actions);

function processSparkMessage(err, d) {
  if (d) {
    console.log("got message:", d);
    var data = JSON.parse(d);
    const sessionId = findOrCreateSession(data.roomId);
    try {
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
          }
        }
      );      
    } catch (e) {
      dobby_spark.sendMessage(data.roomId, "looks like wit is down, please try later", (err, data) => {
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
  
dobby_pull.getMessages('amit1on1', 'dobby.spark@gmail.com', processSparkMessage);
