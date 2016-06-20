/* dobby_spark.js */
'use strict';

const parser = require('./dobby_parse_v2');

module.exports = {
  runActions: runActions,
  runCommand: runCommand,
};

function runCommand(botId, actions, sessionId, context, cb) {
    console.log("running cmd:", context);
    if (context.topic == 'vocab') {
		// delegate vocab command to parser
        parser.vocabCommand(botId, context, (res) => {
        	actions.say(sessionId, context, res, () => {
        		// actions.clean(sessionId, context, (ctx) => {});
        	})
        });
    } else if (['topic','intent','input'].indexOf(context.topic) > -1) {
      	// delegate type modification commands to parser
        parser.typeCommand(botId, context, (res) => {
        	actions.say(sessionId, context, res, () => {
        		// actions.clean(sessionId, context, (ctx) => {});
        	})
        });
    } else if (context.topic == 'reset') {
      	// reset current conversation
      actions.say(sessionId, context, "*poof*", () => {
	      actions.clean(sessionId, context, cb);
      });
    } else {
      actions.say(sessionId, context, "dobby do not understand command type " + context.topic, () => {
	      // actions.clean(sessionId, context, cb);
      });
    }
}

function runActions(actions, sessionId, message, context, cb) {
	parser.parseMessage(context, message, (res) => {
		actions.merge(sessionId, context, res, message, (ctx) => {
			actions.nextState(sessionId, ctx, (ctx) => {
			// no op
			});
		})
	});  
};
