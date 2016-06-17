"""
filename: dobby_pull.py
Description: Dobby pulls messages from custom channel
"""
import json
import logging
import requests
import dobby_cass

logger = logging.getLogger('dobby')

my_db = dobby_cass.Db('ucm211.cisco.com')

def trim(string):
    return string.strip().replace('.','').replace('?','')

def find_result(atype, tokens):
    result = None
    for atoken in tokens:
        result = my_db.get_vocab(atype, atoken)
        if result:
            return result
    return None

def parseMessage(message):
    intent, topic, ainput = None, None, None
    if message:
        tokens = message.split()
        new_tokens = []
        for atoken in tokens:
            new_tokens.append(trim(atoken))
        intent = find_result('intent', new_tokens)
        topic = find_result('topic', new_tokens)
        ainput = find_result('input', new_tokens)
    return {'intent': intent, 'topic': topic, 'input': ainput}
