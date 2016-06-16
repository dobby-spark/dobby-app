/* dobby_spark.js */
'use strict';

const parser = require('./dobby_parse');

module.exports = {
  runActions: runActions,
};

function runActions(actions, sessionId, message, context, cb) {
  actions.merge(sessionId, context, parser.parseMessage(message), message, (arg) => {
    // no op
  });
  actions.nextState(sessionId, {}, (arg, ctx) => {
    // no op
  });
};
