/* dobby_parse.js */
'use strict';

module.exports = {
  parseMessage: parseMessage,
};

// INTENTS
const intents = ['greeting', 'coaching', 'info'];
const intentMap = {
  'greeting' : ['are you there', 'hello', 'hi'],
  'coaching' : ['how', 'what', 'help'],
  'info' : ['info', 'information'],
};

// TOPICS
const topics = ['pager', 'dobby', 'docker', 'tests', 'AA'];
const topicMap = {
  'pager' : ['pager', 'page'],
  'dobby' : ['dobby', 'you'],
  'docker' : ['docker', 'dockers'],
  'tests' : ['test', 'tests' , 'DS', 'sanity'],
  'AA' : ['aa', 'AA', 'auto attendant'],
};

// INPUTS
const inputs = ['how-to', 'complete', 'next', 'incomplete', 'wiki'];
const inputMap = {
  'how-to' : ['how to', 'how-to'],
  'complete': ['yes', 'complete', 'did', 'done', 'got it', 'ok'],
  'next' : ['next', 'thanks'],
  'incomplete' : ['no', "didn't",  "don't", 'dont', 'not', 'nope', 'nah'],
  'wiki' : ['wiki', 'link', 'links'],
};

const trim = (str) => {
  ['.', '?'].forEach((t) => {
    str = str.replace(t, '');
  });
  return str;
};

const find = (values, valueMap, tokens) => {
  var result;
  values.forEach((value) => {
    if (!result) {
      valueMap[value].forEach((key) => {
        if (!result && tokens.indexOf(key) != -1) {
          result = value;
        }
      });      
    }
  });
  return result;
};

function parseMessage(message) {

  if (!message) {
    return {};
  }
  var intent, topic, input;

  var tokens = [];
  message.split(' ').forEach((t) => {
    tokens.push(trim(t));
  });

  intent = find(intents, intentMap, tokens);
  topic = find(topics, topicMap, tokens);
  input = find(inputs, inputMap, tokens);
  return {
    'intent': intent,
    'topic': topic,
    'input': input,
  }
};
