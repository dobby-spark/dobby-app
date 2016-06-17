"""
filename: dobby_pull.py
Description: Dobby pulls messages from custom channel
"""
import json
import logging
import requests

logger = logging.getLogger('dobby')

intents = ['greeting', 'coaching', 'info']
intentMap = {
    'greeting' : ['are you there', 'hello', 'hi'],
    'coaching' : ['how', 'what', 'help'],
    'info' : ['info', 'information'],
}

topics = ['pager', 'dobby', 'docker', 'tests', 'AA'];
topicMap = {
    'pager' : ['pager', 'page'],
    'dobby' : ['dobby', 'you'],
    'docker' : ['docker', 'dockers'],
    'tests' : ['test', 'tests' , 'DS', 'sanity'],
    'AA' : ['aa', 'AA', 'auto attendant'],
}

inputs = ['how-to', 'complete', 'next', 'incomplete', 'wiki'];
inputMap = {
    'how-to' : ['how to', 'how-to'],
    'complete': ['yes', 'complete', 'did', 'done', 'got it', 'ok'],
    'next' : ['next', 'thanks'],
    'incomplete' : ['no', "didn't",  "don't", 'dont', 'not', 'nope', 'nah'],
    'wiki' : ['wiki', 'link', 'links'],
}

def trim(string):
    return string.strip().replace('.','').replace('?','')

def find(values, valueMap, tokens):
    for value in values:
        for key in valueMap[value]:
            for atoken in tokens:
                if atoken == key:
                    return value
    return None

def parseMessage(message):
    intent, topic, ainput = None, None, None
    if message:
        tokens = message.split()
        new_tokens = []
        for atoken in tokens:
            new_tokens.append(trim(atoken))
        intent = find(intents, intentMap, new_tokens)
        topic = find(topics, topicMap, new_tokens)
        ainput = find(inputs, inputMap, new_tokens)
    return {'intent': intent, 'topic': topic, 'input': ainput}
