'use strict';

const cassandra = require('cassandra-driver');

module.exports = {
  getState: getState
};

const cassClient = new cassandra.Client({ contactPoints: ['ucm211.cisco.com'], keyspace: 'demo' });

function getState(intent, topic, state, input, cb) {
  var query = 'SELECT msg, nextState, nextIntent FROM state_mc WHERE intent=? AND topic=? AND state=? AND input=?';
  var params = [intent, topic, state, input];
  console.log("Cass read params:", params);
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
