"""
filename: dobby_log.py
Description: Dobby sample app
Arguments: 
  - channel - webhook subscribe pulling service channel name
  - db - cassandra hostname
  - keyspace - cassandra keyspace
"""
import logging
import time
import uuid
# dobby modules
import dobby_log
import dobby_pull
import dobby_spark
import dobby_bot
import dobby_cass

logger = dobby_log.setup_logger()

CHAN = 'tsouksam'
my_db = dobby_cass.Db('ucm211.cisco.com')
my_pull = dobby_pull.Dobby_pull(CHAN)
my_spark = dobby_spark.Dobby_spark()

g_sessions = {}

def merge(sessionId, context, entities, message):
    intent = entities['intent']
    if intent and (intent == 'command' or not g_sessions[sessionId]['context']['intent']):
        g_sessions[sessionId]['context']['intent'] = intent
        context['intent'] = intent
    topic = entities['topic']
    if topic and not g_sessions[sessionId]['context']['intent']:
        g_sessions[sessionId]['context']['topic'] = topic
        context['topic'] = topic
    ainput = entities['input']
    if ainput:
        g_sessions[sessionId]['context']['input'] = ainput
        context['input'] = ainput
    return context

def say(session_id, context, msg):
    print(msg)
    # spark message
    roomData = '{"roomId": "%s", "text": "%s"}' \
                  % (g_roomId, msg)
    my_spark.spark_msg_request(roomData)
    return context

def findOrCreateSession(roomId):
    for sessionId in g_sessions.keys():
        if g_sessions[sessionId] and g_sessions[sessionId]['roomId'] == roomId:
            return sessionId
    temp_uuid = uuid.uuid1()
    g_sessions[temp_uuid] = {'roomId': roomId, 'context': {'intent': None, 'topic': None, 'state': None, 'input': None}}
    return temp_uuid

def mergeContext(sessionId, context):
    if 'intent' in g_sessions[sessionId]['context']:
        context['intent'] = g_sessions[sessionId]['context']['intent']
    if 'topic' in g_sessions[sessionId]['context']:
        context['topic'] = g_sessions[sessionId]['context']['topic']
    if 'input' in g_sessions[sessionId]['context']:
        context['input'] = g_sessions[sessionId]['context']['input']
    if 'state' in g_sessions[sessionId]['context']:
        context['state'] = g_sessions[sessionId]['context']['state']
    return context

def nextEntry(context):
    result = my_db.get_next(context['intent'], context['topic'], context['state'], context['input'])
    if result['msg']:
        return result
    result = my_db.get_next(context['intent'], context['topic'], context['state'], '1')
    if result['msg']:
        return result
    result = my_db.get_next(context['intent'], context['topic'], '1', '1')
    if result['msg']:
        return result
    result = my_db.get_next(context['intent'], '1', '1', '1')
    if result['msg']:
        return result
    return my_db.get_next('1', '1', '1', '1')

def cleanUp(sessionId):
    # todo
    g_sessions[sessionId] = {}

def nextState(sessionId, context):
    context = mergeContext(sessionId, context)
    g_sessions[sessionId]['context']['input'] = None
    nextEntryRec = nextEntry(context)
    if nextEntryRec['nextintent']:
        g_sessions[sessionId]['context']['intent'] = nextEntryRec['nextintent']
        g_sessions[sessionId]['context']['state'] = nextEntryRec['nextstate']
        context = nextState(sessionId, context)
        return context
    if not nextEntryRec['nextstate']:
        cleanUp(sessionId)
    else:
        g_sessions[sessionId]['context']['state'] = nextEntryRec['nextstate']
    say(sessionId, context, nextEntryRec['msg'])
    return context
    
actions = {
    'merge': merge,
    'nextState': nextState
}

while True:
    # Continuously check for Dobby questions
    dobby_data = my_pull.pull_data()
    for msg in dobby_data:
        _, room_msg = my_spark.spark_room_msg(msg['id'])
        if '/dobby' in room_msg:
            name = my_spark.spark_get_person(msg['personId'])
            user_ask = room_msg.replace('/dobby', '').strip()
            if not 'dobby' in name:
                g_roomId = msg['roomId']
                sessionId = findOrCreateSession(g_roomId)
                dobby_bot.run_actions(actions, sessionId, user_ask, {})
    time.sleep(1)