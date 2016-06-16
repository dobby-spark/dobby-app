'use strict';

const parser = require('./jslib/dobby_parse');

console.log("parser says:", parser.parseMessage(process.argv[2]));