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
    } else {
      actions.say(sessionId, context, "sorry, cannot help with " + context.intent + " for " + context.topic + " yet!", cb); 
    }
  },
};

const client = new Wit(token, actions);
client.interactive();
