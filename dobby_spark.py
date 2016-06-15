"""
filename: dobby_spark.py
Description: Dobby spark api to retrieve and post room messages
"""
import ast
import json
import logging
import requests
import time

logger = logging.getLogger('dobby')

BEARER = 'YWE5MDE4ZTItNjYyNi00M2YzLTlkMjEtN2NjZjA4MGIxY2EyYzY0ZDQ3YzQtZmM0'
SPARK_ID = u'Bearer' + ' ' + BEARER
SPARK_URL = "https://api.ciscospark.com/v1/"
        
class Dobby_spark():

    def __init__(self):
        pass
        
    def spark_room_msg(self, msgId):
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
    
    def spark_get_person(self, personId):
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
    
    def spark_msg_request(self, roomData):
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
    
