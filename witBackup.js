'use strict';

const request = require('request');
const fs = require('fs');

const witApiBase = 'https://api.wit.ai/';
const witApiVer = 'v=20160526';

const token = (() => {
  if (process.argv.length !== 3) {
    console.log('usage: node witBackup.js <wit-token>');
    process.exit(1);
  }
  return process.argv[2];
})();

// make directory for saving entities
const dirName = new Date().toISOString();
console.log("saving entities to:", dirName);
fs.mkdirSync(dirName);

// get all entities for the app
const getEntities = (cb) => {
	var opts = {
		url: witApiBase + 'entities' + '?' + witApiVer,
		headers: {
			'Authorization': 'Bearer ' + token,
		},
	};

	request(opts, (err, resp, data) => {
      if (cb) {
        cb(err || data.error && data.error.message, data);
      }
    });
};

// get an entity
const getEntity = (entityId, cb) => {
	var opts = {
		url: witApiBase + 'entities/' + entityId + '?' + witApiVer,
		headers: {
			'Authorization': 'Bearer ' + token,
		},
	};

	request(opts, (err, resp, data) => {
      if (cb) {
        cb(err || data.error && data.error.message, data);
      }
    });
};

const saveEntity = (err, data) => {
	if (err) {
		console.log('Oops! An error occurred in fetching entity:', err);
		return;
	}
	// save entity details
	var entity = JSON.parse(data);
	// console.log("saving entity:", entity);
	// var fd = fs.openSync(dirName + '/' + entity.name, 'w');
	console.log("saving entity:", entity.name);
	fs.writeFileSync(dirName + '/' + entity.name, data);

};


const processEntities = (err, data) => {
	if (err) {
		console.log('Oops! An error occurred in fetching entities:', err);
		return;
	}
	// featch and process each entity
	var entities = JSON.parse(data);
	console.log("got " + entities.length + " entities:", entities);
	entities.forEach(function(entityId) {
		getEntity(entityId, saveEntity);
	});
};


getEntities(processEntities);