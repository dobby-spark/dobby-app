'use strict';

const parser = require('./jslib/dobby_parse_cass');

parser.parseMessage(process.argv[2], (res) => {
	console.log("parser says:", res);
})

// console.log("parser says:", parser.parseMessage(process.argv[2]));