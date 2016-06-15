'use strict';

// When not cloning the `node-wit` repo, replace the `require` like so:
// const Wit = require('node-wit').Wit;
const Wit = require('../').Wit;

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

const token = (() => {
  if (process.argv.length !== 3) {
    console.log('usage: node examples/template.js <wit-token>');
    process.exit(1);
  }
  return process.argv[2];
})();

var state = {};

const actions = {
  say(sessionId, context, message, cb) {
    console.log(message);
    cb();
  },
  merge(sessionId, context, entities, message, cb) {
    console.log("entities:", entities);
    console.log("context", context);
    const dobby_help = firstEntityValue(entities, 'dobby_help');
    if (dobby_help) {
      context.dobby_help = dobby_help;
    }
    const dobby_case = firstEntityValue(entities, 'dobby_case');
    if (dobby_case) {
      context.dobby_case = dobby_case;
    }
    const dobby_problem = firstEntityValue(entities, 'dobby_problem');
    if (dobby_problem) {
      context.dobby_problem = dobby_problem;
    }
    cb(context);
  },
  error(sessionId, context, err) {
    console.log(err.message);
  },
  getWiki(sessionId, context, cb) {
    if (context.dobby_problem == 'pager') {
        console.log(sessionId, state, "2AM wiki is @ http://cbabu-wiki.cisco.com:8080/display/HTAA/2AM+Document+CES+Auto+Attendant+Service", cb);
    } else {
        actions.say(sessionId, state, "I have no clue, wake up Philip", cb);
    }
  },
  getAck(sessionId, context, cb) {
    if (context.dobby_problem == 'pager') {
        actions.say(sessionId, state, "acknowledge @ https://cisco-huron.pagerduty.com/incidents", cb);
    } else {
        actions.say(sessionId, state, "I have no clue, wake up Philip", cb);
    }
  },
  createRoom(sessionId, context, cb) {
    actions.say(sessionId, state, "created spark room [" + context.dobby_problem + " for " + context.dobby_case + "]", cb);
  },
  dobbyAction(sessionId, context, cb) {
    console.log(context);
    if (context.dobby_problem) {
      if (context.dobby_help == 'wiki') {
        actions.getWiki(sessionId, context, cb);
      } else if (context.dobby_help == 'ack') {
        actions.getAck(sessionId, context, cb);
      } else if (context.dobby_help == 'room') {
        if (context.dobby_case) {
          actions.createRoom(sessionId, context, cb);
        } else {
          console.log('what is the case number (format "case XXXXX")?');
          cb(context);
        }
      } else {
        console.log("what are you looking for?");
        cb(context);
      }
    } else if (context.dobby_help) {
        console.log("what problem you want help with?");
        cb(context);
  } else {
      console.log("I did not understand you");
      cb(context);
  }
  },
};

const client = new Wit(token, actions);
client.interactive();
