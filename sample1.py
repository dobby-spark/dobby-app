"""
Interface for Dobby
"""
import ast
import json
import logging
import logging.handlers
import requests
import time



PULL_URL = "https://dobby-spark.appspot.com/v1/poll/spark"
BEARER = 'YWE5MDE4ZTItNjYyNi00M2YzLTlkMjEtN2NjZjA4MGIxY2EyYzY0ZDQ3YzQtZmM0'
SPARK_ID = u'Bearer' + ' ' + BEARER
SPARK_URL = "https://api.ciscospark.com/v1/"

def setup_logger(loglevel=logging.DEBUG, name='dobby', 
                 filename='/home/tsouksam/dobby.log'):
    """
    args: 
      int, loglevel - base on logging levels
      str, name - logging handler name use across modules
      str, filename - log path and filename
    """
    logger = logging.getLogger(name)
    logger.setLevel(loglevel)
    formatter = logging.Formatter('%(asctime)s %(name)-12s %(levelname)-8s %(message)s')
    file_handler = logging.handlers.RotatingFileHandler(filename, maxBytes=10024000, backupCount=10,)
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.DEBUG)
    logger.addHandler(file_handler)
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    stream_handler.setLevel(logging.ERROR)
    logger.addHandler(stream_handler)
    return logger

logger = setup_logger()

def pull_get_msg():
    """GET an http request from pull service
    """
    msg = []
    try:
        msg = requests.get(PULL_URL).json()
    except:
        pass
        #logger.warning("  pull_get_msg: fail to get messages")
    return msg

def pull_data():
    """Retrieve and store each room data for Dobby
    """
    data = []
    pull_msg = pull_get_msg()
    for msg in pull_msg:
        if msg['resource'] == 'messages':
            data.append(msg['data'])
            logger.info("  pull_data: new msg=%s",msg['data'])
    return data

def spark_room_msg(msgId):
    """GET an http request from Spark API for room text message
    """
    status = ''
    roomData = {'roomId': msgId}
    try:
        status = requests.get(SPARK_URL+'messages/'+msgId,
                  headers={'Content-type': 'application/json', 'Authorization': SPARK_ID},
                  data=roomData            )
    except:
        logger.warning("  spark_room_msg: fail to retrieve roomData=%s", roomData)
    if hasattr(status, 'status_code') and status.status_code == 200:
        room_json = ast.literal_eval(status.text)
        room_msg = room_json['text']
        person_id = room_json['personId']
        logger.info("  spark_room_msg: successfully get room message text=%s", room_msg)
    else:
        logger.warning("  spark_room_msg: invalid roomId failed get message")
    return person_id, room_msg

def spark_get_person(personId):
    """GET an http request from Spark API about person detail.
    """
    status = ''
    personData = {'personId': personId}
    try:
        status = requests.get(SPARK_URL+'people/'+personId, 
                  headers={'Content-type': 'application/json', 'Authorization': SPARK_ID},
                  data=personData)
    except:
        logger.warning("  spark_get_person: fail to post personData=%s", personData)
    if hasattr(status, 'status_code') and status.status_code == 200:
        person_json = ast.literal_eval(status.text)
        name = person_json['displayName']
        logger.info("  spark_get_person: successfully got person name=%s", name)
    else:
        logger.warning("  spark_get_person: invalid personId failed to post personData=%s", personData)
    return name

def spark_msg_request(roomData):
    """Post an http request to Spark API for messaging dobby response.
    args: str, roomData - custom text message for Spark room
    """
    status = ''
    try:
        status = requests.post(SPARK_URL+'messages', 
                  headers={'Content-type': 'application/json', 'Authorization': SPARK_ID},
                  data=roomData)
    except:
        logger.warning("  spark_msg_request: fail to post roomData=%s", roomData)
    if hasattr(status, 'status_code') and status.status_code == 200:
        logger.info("  spark_msg_request: successfully post roomData=%s", roomData)
    else:
        logger.warning("  spark_msg_request: invalid roomId failed to post roomData=%s", roomData)

while True:
    # Continuously check for Dobby questions
    dobby_data = pull_data()
    for msg in dobby_data:
        personid, room_msg = spark_room_msg(msg['id'])
        if '/dobby' in room_msg:
            name = spark_get_person(msg['personId'])
            if not 'dobby' in name:
                message = "Dobby: Welcome back " + name + "\\n"
                message += "How can I help you?"
                roomData = '{"roomId": "%s", "text": "%s"}' \
                  % (msg['roomId'], message)
                spark_msg_request(roomData)
        time.sleep(1)
