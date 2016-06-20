/* dobby_parse.js */
'use strict';
const dobby_cass = require('./dobby_cass_v2');

module.exports = {
  parseMessage: parseMessage,
  vocabCommand: vocabCommand,
  typeCommand: typeCommand,
  logicCommand: logicCommand,
};

// TYPES of vocab
const vocabTypes = ['intent', 'topic', 'input'];

const findVocab = (botId, result, tokens, curr, cb) => {
  if (curr < vocabTypes.length) {
    // find current vocab type
    dobby_cass.getVocab(botId, vocabTypes[curr], (err, rows) => {
      // process rows and add to result for current vocab type
      var value = null;
      // console.log("read rows:", rows);
      rows && rows.rows.forEach((row) => {
        tokens.forEach((token) => {
          if (!value && row.value.toUpperCase() === token.toUpperCase()) {
            value = row.name;
          }
        });
      });
      result[vocabTypes[curr]] = value;
      // get next vocab type
      findVocab(botId, result, tokens, curr+1, cb);
    });
  } else {
    // we are done processing all vocab types
    cb(result);
  }
}

function addToType(botId, type, name, cb) {
  // add new type name to bot's vocab type
  dobby_cass.addVocabType(botId, type, name, (err, res) => {
    if (!err) {
      // add new type name to bot's vocab input
      dobby_cass.addToVocab(botId, type, name, name, (err, res) => {
        if (!err) {
          cb('dobby added new ' + name + ' into ' + type);
        } else {
          cb('dobby failed to add new ' + name);
        }
      })
    } else {
      cb('dobby failed to add new ' + name);
    }
  });
}

function addToVocab(botId, name, alias, curr, didUpdate, cb) {
  if (curr < vocabTypes.length) {
    // get registered names for current type
    dobby_cass.getVocabNames(botId, vocabTypes[curr], (err, res) => {
      res && res.rows.forEach((row) => {
        if (row[vocabTypes[curr]] && row[vocabTypes[curr]].indexOf(name) > -1) {
          didUpdate = true;
          dobby_cass.addToVocab(botId, vocabTypes[curr], name, alias, (err, res) => {
            err && console.log("failed to add vocab");
          });
        }
      });
      addToVocab(botId, name, alias, curr+1, didUpdate, cb);
    });
  } else {
    if (didUpdate) {
      cb("thanks, now dobby knows " + alias + " is " + name);
    } else {
      cb("dobby does not use " + name + " for anything!");
    }
  }
}

function deleteFromVocab(botId, name, alias, curr, didUpdate, cb) {
  if (curr < vocabTypes.length) {
    // get registered names for current type
    dobby_cass.getVocabNames(botId, vocabTypes[curr], (err, res) => {
      res && res.rows.forEach((row) => {
        if (row[vocabTypes[curr]].indexOf(name) > -1) {
          didUpdate = true;
          dobby_cass.deleteFromVocab(botId, vocabTypes[curr], name, alias, (err, res) => {
            err && console.log("failed to remove vocab");
          });
        }
      });
      deleteFromVocab(botId, name, alias, curr+1, didUpdate, cb);
    });
  } else {
    if (didUpdate) {
      cb("ok, now dobby will ignore " + alias + " is " + name);
    } else {
      cb("dobby does not use " + name + " for anything!");
    }
  }
}

const trivials = [
  new RegExp("\\.", "g"),
  new RegExp("\\?", "g"),
  new RegExp("-", "g"),
  new RegExp("'", "g")];

const trim = (str) => {
  trivials.forEach((t) => {
    str = str.replace(t, '');
  });
  return str;
};

// const trim = (str) => {
//   ['.', '?', '-', "'"].forEach((t) => {
//     str = str.replace(t, '');
//   });
//   return str;
// };

function parseMessage(context, message, cb) {
  // create a blank parsing result
  var result = {};
  vocabTypes.forEach((type) => {
    result[type] = null;
  })

  if (!message) {
    cb(result);
  } else {
    // special handling of #dobby messages
    if (message.indexOf('#dobby') > -1) {
      context.botId = 'dobby';
      context.topic = null;
      context.intent = null;
      context.state = null;
    }
    // tokenize the message
    var tokens = [];
    message.split(' ').forEach((t) => {
      tokens.push(trim(t));
    });

    // find vocab result
    findVocab(context.botId, result, tokens, 0, cb);
  }
};

function logicCommand(botId, context, cb) {
  // syntax: #dobby #when
  //  [ topic is <topic>] and
  //  [intent is <intent>] and
  //  [state is <state>] and
  //  [input is <input>] then
  //  [transition to [intent]/[<state>]] and 
  //  [say <phrase>]

  var args = context.message.replace(/#/g, '').replace('dobby', '').replace('when ', '').split(' then ');
  if (args.length != 2) {
    cb('command syntax not correct, please refer to #dobby #help #when');
  } else {
    var conditions = args[0].split(' and ');
    var actions = args[1].split(' and ');

    // parse input conditions
    var input = {};
    var isValid = true;
    conditions.forEach((condition) => {
      if (condition.indexOf('topic ') > -1) {
        // this is a topic condition
        console.log('adding topic condition:', condition);
        input.topic = condition.split(' is ')[1];
      } else if (condition.indexOf('intent ') > -1) {
        // this is an intent condition
        console.log('adding intent condition:', condition);
        input.intent = condition.split(' is ')[1];
      } else if (condition.indexOf('state ') > -1) {
        // this is current state condition
        console.log('adding state condition:', condition);
        input.state = condition.split(' is ')[1];
      } else if (condition.indexOf('input ') > -1) {
        // this is an specified input condition
        console.log('adding input condition:', condition);
        input.input = condition.split(' is ')[1];
      } else {
        isValid = false;
        console.log('unsupported condition:', condition);
        cb('incorrect condition: ' + condition);
      }
    });

    // parse output actions
    var output = {};
    actions.forEach((action) => {
      if (action.indexOf('transition ') > -1) {
        // this is a topic condition
        console.log('adding transition action:', action);
        // var transition = action.replace('transition ', '').split('/');
        var transition = action.split(' to ')[1].split('/');
        transition[0].length && (output.intent =  transition[0].trim());
        transition[1].length && (output.state = transition[1].trim());
      } else if (action.indexOf('say ') > -1) {
        // this is an intent condition
        console.log('adding say action:', action);
        output.say = action.replace('say ', '');
      } else {
        isValid = false;
        console.log('unsupported action:', action);
        cb('incorrect action: ' + action);
      }
    });

    if (!isValid) {
      cb('failed to process command');
    } else {
      cb(JSON.stringify(input) + ' ==> ' + JSON.stringify(output));
    }
  }
}


function typeCommand(botId, context, cb) {
  if (context.input == 'list') {
    // list all vocab type names
    dobby_cass.getVocabTypes(botId, context.topic, (err, res) => {
      if (err) {
        console.log('vocab types read error', err);
        cb('sorry, dobby cannot find vocab!');
      } else {
        cb(JSON.stringify(res.rows));
      }
    });
  } else if (context.input == 'add') {
    // add a new vocab type
    // syntax: #dobby add new <type> to <context.topic>
    var args = context.message.toLowerCase().replace(/#/g,'').replace('dobby ', '').replace('add ','').replace('new ','').split(' to ');
    // add new alias to each vocab type that has specified input
    args.length != 2 ? args = null : addToType(botId, context.topic, args[0].trim(), cb);
    if (!args) {
      cb('dobby do not understand, please use "#dobby #' + context.topic + ' #help" for syntax');
    }
  } else {
    cb('dobby do not understand command "' + context.message.replace('#dobby ', '') + '"');
  }
}

function vocabCommand(botId, context, cb) {
  if (context.input == 'list') {
    // list all vocab input names
    dobby_cass.getVocabInputs(botId, (err, res) => {
      if (err) {
        console.log('vocab types read error', err);
        cb('sorry, dobby cannot find vocab!');
      } else {
        cb(JSON.stringify(res.rows));
      }
    });
  } else if (context.input == 'learn') {
    // learn a new vocab word
    // syntax: #dobby vocab learn that alias is input
    var args = context.message.toLowerCase().replace(/#/g,'').replace('dobby ', '').split(' that ')[1];
    if (args) {
      args = args.split(' is ');
      // add new alias to each vocab type that has specified input
      args.length != 2 ? args = null : addToVocab(botId, args[1].trim(), args[0].trim(), 0, false, cb);
    }
    if (!args) {
      cb('dobby do not understand, please use "#dobby #vocab #help" for syntax');
    }
  } else if (context.input == 'forget') {
    // un-learn a vocab word
    // syntax: #dobby vocab forget that alias is input
    var args = context.message.toLowerCase().replace(/#/g,'').replace('dobby ', '').split(' that ')[1];
    if (args) {
      args = args.split(' is ');
      // add new alias to each vocab type that has specified input
      args.length != 2 ? args = null : deleteFromVocab(botId, args[1].trim(), args[0].trim(), 0, false, cb);
    }
    if (!args) {
      cb('dobby do not understand, please use "#dobby #vocab #help" for syntax');
    }
  } else {
    cb('dobby do not understand command "' + context.message.replace('#dobby ', '') + '"');
  }
}
