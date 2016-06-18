/* dobby_spark.js */
'use strict';

const parser = require('./dobby_parse_v2');

module.exports = {
  runActions: runActions,
};

function runActions(actions, sessionId, message, context, cb) {
	parser.parseMessage(message, (res) => {
		actions.merge(sessionId, context, res, message, (ctx) => {
			actions.nextState(sessionId, {}, (ctx) => {
			// no op
			});
		})
	});  
};
