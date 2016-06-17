/* dobby_spark.js */
'use strict';

const parser = require('./dobby_parse_cass');

module.exports = {
  runActions: runActions,
};

function runActions(actions, sessionId, message, context, cb) {
	parser.parseMessage(message, (res) => {
		actions.merge(sessionId, context, res, message, (arg) => {
			actions.nextState(sessionId, {}, (arg, ctx) => {
			// no op
			});
		})
	});  
};
