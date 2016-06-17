'use strict';

const Wit = require('node-wit').Wit;
const dobby_pull = require('./jslib/dobby_pull');
const dobby_spark = require('./jslib/dobby_spark');
const cassandra = require('cassandra-driver');
const dobby_cass = require('./jslib/dobby_cass');
const async = require('async');
const _ = require('lodash');
// When cloning the `node-wit` repo, replace the `require` like so:
// const Wit = require('../').Wit;

const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};

const bestEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value;
  if (!val) {
    return null;
  }
  var result = null;
  entities[entity].forEach(function (value) {
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
    sessions[sessionId] = { roomId: roomId, context: {} };
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

function processSparkMessage(err, d) {
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
}

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

function createStateMachine() {
  var client = new cassandra.Client({ contactPoints: ['ucm211.cisco.com'], keyspace: 'demo' });
  _.forEach(msgs, function (intents, intentI) {
    _.forEach(intents, function (topics, topicI) {
      _.forEach(topics, function (states, stateI) {
        _.forEach(states, function (input, inputI) {
          if (input.msg && input.next && input.intent) {
            var valStr = "'" + intentI + "',";
            valStr = valStr + "'" + topicI + "',";
            valStr = valStr + "'" + stateI + "',";
            valStr = valStr + "'" + inputI + "',";
            valStr = valStr + "'" + input.msg + "',";
            valStr = valStr + "'" + input.next + "',";
            valStr = valStr + "'" + input.intent + "'";
            client.execute("INSERT INTO state_mc (intent , topic, state, input, msg, nextState, nextIntent ) VALUES (" + valStr + ")", function (err, result) {
              // Run next function in series
              console.log("err", err);
            });
          } else if (input.msg && input.next) {
            var valStr = "'" + intentI + "',";
            valStr = valStr + "'" + topicI + "',";
            valStr = valStr + "'" + stateI + "',";
            valStr = valStr + "'" + inputI + "',";
            valStr = valStr + "'" + input.msg + "',";
            valStr = valStr + "'" + input.next + "'";
            client.execute("INSERT INTO state_mc (intent , topic, state, input, msg, nextState) VALUES (" + valStr + ")", function (err, result) {
              // Run next function in series
              console.log("err", err);
            });
          } else if (input.msg) {
            var valStr = "'" + intentI + "',";
            valStr = valStr + "'" + topicI + "',";
            valStr = valStr + "'" + stateI + "',";
            valStr = valStr + "'" + inputI + "',";
            valStr = valStr + "'" + input.msg + "'";
            client.execute("INSERT INTO state_mc (intent , topic, state, input, msg) VALUES (" + valStr + ")", function (err, result) {
              console.log("err", err);
              // Run next function in series
              // callback(err, null);
            });
          }
        });
      });
    });
  });
  console.log("done creating stateMachine");
}

function getResult(err, result) {
  if (err) {
    console.log("err:", err);
  } else if (result.rows.length > 0) {
    console.log("result:", result.rows[0]);
  }
  // cassClient.shutdown();
}

function readStateMachine() {
  // var cassClient = new cassandra.Client({ contactPoints: ['127.0.0.1'], keyspace: 'demo' });
  dobby_cass.getState('1', '1', '1', '1', function (err, result) {
    getResult(err, result);
    dobby_cass.getState('coaching', '1', '1', '1', function (err, result) {
      getResult(err, result);
    });
    // cassClient.shutdown();
  });
  // _.forEach(msgs, function (intents, intentI) {
  //   _.forEach(intents, function (topics, topicI) {
  //     _.forEach(topics, function (states, stateI) {
  //       _.forEach(states, function (input, inputI) {
  //         // dobby_cass.getState(intentI,topicI,stateI,inputI);
  //       });
  //     });
  //   });
  // });
  console.log("done reading stateMachine");
}

function testCass() {
  var client = new cassandra.Client({ contactPoints: ['127.0.0.1'], keyspace: 'demo' });
  // Use async series to run functions in serial (one after another)
  async.series([
    // Insert Bob
    function (callback) {
      client.execute("INSERT INTO users (lastname, age, city, email, firstname) VALUES ('Jones', 35, 'Austin', 'bob@example.com', 'Bob')", function (err, result) {
        // Run next function in series
        callback(err, null);
      });
    },
    // Read users and print to console
    function (callback) {
      client.execute("SELECT lastname, age, city, email, firstname FROM users WHERE lastname='Jones'", function (err, result) {
        if (!err) {
          if (result.rows.length > 0) {
            var user = result.rows[0];
            console.log("name = %s, age = %d", user.firstname, user.age);
          } else {
            console.log("No results");
          }
        }

        // Run next function in series
        callback(err, null);
      });
    },
    // Update Bob's age
    function (callback) {
      client.execute("UPDATE users SET age = 36 WHERE lastname = 'Jones'", function (err, result) {
        // Run next function in series
        callback(err, null);
      });
    },
    // Read users and print to the console
    function (callback) {
      client.execute("SELECT firstname, age FROM users where lastname = 'Jones'", function (err, result) {
        var user = result.rows[0];
        console.log("name = %s, age = %d", user.firstname, user.age);

        // Run next function in series
        callback(err, null);
      });
    },
    // Delete Bob
    function (callback) {
      client.execute("DELETE FROM users WHERE lastname = 'Jones'", function (err, result) {
        if (!err) {
          console.log("Deleted");
        }

        // Run next function in series
        callback(err, null);
      });
    },
    // Read users and print to the console
    function (callback) {
      client.execute("SELECT * FROM users WHERE lastname='Jones'", function (err, result) {
        if (result.rows.length > 0) {
          var user = result.rows[0];
          console.log("name = %s, age = %d", user.firstname, user.age);
        } else {
          console.log("No records");
        }

        // Run next function in series
        callback(err, null);
      });
    }
  ], function (err, results) {
    // All finished, quit
    process.exit();
  });
}

//
// create keyspace demo with replication={'class':'SimpleStrategy','replication_factor':1};
// CREATE TABLE state_mc (  intent text, topic text, state text, input text, nextState text, nextIntent text, msg text, PRIMARY KEY ((intent), topic, state, input));
// DESC TABLE state_mc
// INSERT INTO state_mc (intent , topic, state, input, msg ) ('1', '1', '1', '1', 'Sorry, I do not understand, please try again');
// select msg, nextState, nextIntent from state_mc WHERE intent='1' AND topic='1' AND state='1' AND input='1';
// select * from state_mc;    
// truncate state_mc
// copy state_mc to './state_mc.log'
//

// createStateMachine();


// testCass();
readStateMachine();

// dobby_pull.getMessages(processSparkMessage);
