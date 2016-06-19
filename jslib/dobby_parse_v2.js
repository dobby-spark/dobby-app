/* dobby_parse.js */
'use strict';
const dobby_cass = require('./dobby_cass_v2');

module.exports = {
  parseMessage: parseMessage,
  vocabCommand: vocabCommand,
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

function addToVocab(botId, name, alias, curr, didUpdate, cb) {
  if (curr < vocabTypes.length) {
    // get registered names for current type
    dobby_cass.getVocabNames(botId, vocabTypes[curr], (err, res) => {
      res && res.rows.forEach((row) => {
        if (row[vocabTypes[curr]].indexOf(name) > -1) {
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

const trim = (str) => {
  ['.', '?', '-', "'"].forEach((t) => {
    str = str.replace(t, '');
  });
  return str;
};

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

function vocabCommand(botId, context, cb) {
  if (context.input == 'list') {
    // list all vocab type names
    dobby_cass.getVocabTypes(botId, (err, res) => {
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
    var args = context.message.toLowerCase().replace('#dobby ', '').split(' that ')[1];
    if (args) {
      args = args.split(' is ');
      // add new alias to each vocab type that has specified input
      args.length != 2 ? args = null : addToVocab(botId, args[1].trim(), args[0].trim(), 0, false, cb);
    }
    if (!args) {
      cb('dobby do not understand, please use "#dobby vocab help" for syntax');
    }
  } else if (context.input == 'forget') {
    // un-learn a vocab word
    // syntax: #dobby vocab forget that alias is input
    var args = context.message.toLowerCase().replace('#dobby ', '').split(' that ')[1];
    if (args) {
      args = args.split(' is ');
      // add new alias to each vocab type that has specified input
      args.length != 2 ? args = null : deleteFromVocab(botId, args[1].trim(), args[0].trim(), 0, false, cb);
    }
    if (!args) {
      cb('dobby do not understand, please use "#dobby vocab help" for syntax');
    }
  } else {
    cb('dobby do not understand command "' + context.message.replace('#dobby ', '') + '"');
  }
}