'use strict';

const cassandra = require('cassandra-driver');

module.exports = {
  getState: getState,
  getVocab: getVocab,
  getVocabTypes: getVocabTypes,
  addVocabType: addVocabType,
  delVocabType: delVocabType,
  addToVocab: addToVocab,
  delFromVocab: delFromVocab,
};

const botId = '111';
const cassClient = new cassandra.Client({ contactPoints: ['ucm211.cisco.com'], keyspace: 'amit' });

function getVocabTypes(cb) {
  var query = 'SELECT inputs, intents, topices FROM botvocabtypes WHERE botid=?';
  var params = [botId];
  cassClient.execute(query, params, cb);  
}

function addVocabType(vocab, newType, cb) {
  var query = 'UPDATE botvocabtypes SET ? = ? + [?] where botid=?';
  var params = [vocab, vocab, newType, botId];
  cassClient.execute(query, params, cb);  
}

function delVocabType(vocab, type, cb) {
  var query = 'UPDATE botvocabtypes SET ? = ? - [?] where botid=?';
  var params = [vocab, vocab, type, botId];
  cassClient.execute(query, params, cb);  
}

function addToVocab(type, name, value, cb) {
  var query = 'INSERT INTO botvocab (botid , vtype , vname , value ) VALUES (?,?,?,?)';
  var params = [botid, type, name, value];
  cassClient.execute(query, params, cb);  
}

function delFromVocab(type, name, value, cb) {
  var query = 'delete FROM botvocab WHERE botid = ? AND vtype = ? AND vname =? AND value = ?';
  var params = [botid, type, name, value];
  cassClient.execute(query, params, cb);  
}

function getState(topic, intent, state, input, cb) {
  var query = 'SELECT o_msg, n_state, n_intent FROM state_mc WHERE botid = ? AND topic=? AND intent=? AND state=? AND input=?';
  var params = [botId, topic, intent, state, input];
  cassClient.execute(query, params, cb);
}

function getVocab(type, cb) {
  var query = 'SELECT name, value FROM botvocab WHERE botid=? AND type=?';
  var params = [botId, type];
  cassClient.execute(query, params, cb);
}
