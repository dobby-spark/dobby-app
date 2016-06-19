'use strict';

const cassandra = require('cassandra-driver');

module.exports = {
  getState: getState,
  getVocab: getVocab,
  getVocabTypes: getVocabTypes,
  addVocabType: addVocabType,
  delVocabType: delVocabType,
  addToVocab: addToVocab,
  deleteFromVocab: deleteFromVocab,
};

//const cassClient = new cassandra.Client({ contactPoints: ['ucm211.cisco.com'], keyspace: 'amit' });
const cassClient = new cassandra.Client({ contactPoints: ['localhost'], keyspace: 'dobby', username: 'cassandra', password: 'cassandra' });

function getVocabTypes(botId, cb) {
  var query = 'SELECT inputs, intents, topics FROM botvocabtypes WHERE botid=?';
  var params = [botId];
  cassClient.execute(query, params, cb);  
}

function addVocabType(botId, vocab, newType, cb) {
  var query = 'UPDATE botvocabtypes SET ? = ? + [?] where botid=?';
  var params = [vocab, vocab, newType, botId];
  cassClient.execute(query, params, cb);  
}

function delVocabType(botId, vocab, type, cb) {
  var query = 'UPDATE botvocabtypes SET ? = ? - [?] where botid=?';
  var params = [vocab, vocab, type, botId];
  cassClient.execute(query, params, cb);  
}

function addToVocab(botId, type, name, value, cb) {
  var query = 'INSERT INTO botvocab (botid , type , name , value ) VALUES (?,?,?,?)';
  var params = [botId, type, name, value];
  cassClient.execute(query, params, cb);  
}

function deleteFromVocab(botId, type, name, value, cb) {
  var query = 'delete FROM botvocab WHERE botid = ? AND type = ? AND name =? AND value = ?';
  var params = [botId, type, name, value];
  cassClient.execute(query, params, cb);  
}

function getState(botId, topic, intent, state, input, cb) {
  var query = 'SELECT o_msg, n_state, n_intent FROM state_mc WHERE botid = ? AND topic=? AND intent=? AND state=? AND input=?';
  var params = [botId, topic, intent, state, input];
  cassClient.execute(query, params, cb);
}

function getVocab(botId, type, cb) {
  var query = 'SELECT name, value FROM botvocab WHERE botid=? AND type=?';
  var params = [botId, type];
  cassClient.execute(query, params, cb);
}
