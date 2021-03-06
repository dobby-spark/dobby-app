/* dobby_parse.js */
'use strict';
const dobby_cass = require('./dobby_cass');

module.exports = {
  parseMessage: parseMessage,
};

// TYPES of vocab
const vocabTypes = ['intent', 'topic', 'input'];

const findVocab = (result, tokens, curr, cb) => {
  if (curr < vocabTypes.length) {
    // find current vocab type
    dobby_cass.getVocab(vocabTypes[curr], (err, rows) => {
      // process rows and add to result for current vocab type
      var value = null;
      // console.log("read rows:", rows);
      rows && rows.rows.forEach((row) => {
        tokens.forEach((token) => {
          if (!value && row.key.toUpperCase() === token.toUpperCase()) {
            value = row.result;
          }
        });
      });
      result[vocabTypes[curr]] = value;
      // get next vocab type
      findVocab(result, tokens, curr+1, cb);
    });
  } else {
    // we are done processing all vocab types
    cb(result);
  }
}

const trim = (str) => {
  ['.', '?', '-', "'"].forEach((t) => {
    str = str.replace(t, '');
  });
  return str;
};

function parseMessage(message, cb) {
  // create a blank parsing result
  var result = {};
  vocabTypes.forEach((type) => {
    result[type] = null;
  })

  if (!message) {
    cb(result);
  } else {
    // tokenize the message
    var tokens = [];
    message.split(' ').forEach((t) => {
      tokens.push(trim(t));
    });

    // find vocab result
    findVocab(result, tokens, 0, cb);
  }
};
