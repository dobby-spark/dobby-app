'use strict';

const cassandra = require('cassandra-driver');

module.exports = {
  getState: getState,
  getVocab: getVocab,
  getVocabResult: getVocabResult,
};

const cassClient = new cassandra.Client({ contactPoints: ['ucm211.cisco.com'], keyspace: 'demo' });

function getState(intent, topic, state, input, cb) {
  var query = 'SELECT msg, nextState, nextIntent FROM state_mc WHERE intent=? AND topic=? AND state=? AND input=?';
  var params = [intent, topic, state, input];
  // console.log("Cass read params:", params);
  cassClient.execute(query, params, cb);
  //  cassClient.execute(query, params, function (err, result) {
  //   if (err) {
  //     console.log("error:", err);
  //   } else {
  //     console.log("Cass read result:", result);
  //   }
  // });

  // var valStr = "intent=" + intent + " AND ";
  // valStr = valStr + "topic=" + topic + " AND ";
  // valStr = valStr + "state=" + state + " AND ";
  // valStr = valStr + "input=" + input;
  // cassClient.execute("select msg, nextState, nextIntent from state_mc WHERE " + valStr, cb);
}

function getVocab(type, cb) {
  var query = 'SELECT key, result FROM vocab WHERE type=?';
  // var query = "SELECT key, result FROM vocab WHERE type='input'";
  var params = [type];
  // console.log("Cass read params:", params);
  cassClient.execute(query, params, cb);
}

function getVocabResult(type, key, cb) {
  var query = 'SELECT result FROM vocab WHERE type=? AND key=?';
  var params = [type, key];
  // console.log("Cass read params:", params);
  cassClient.execute(query, params, cb);
}