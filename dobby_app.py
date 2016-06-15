"""
filename: dobby_log.py
Description: Dobby sample app
"""
import ast
import json
import logging
import requests
import time
# dobby modules
import dobby_log
import dobby_pull
import dobby_spark

logger = dobby_log.setup_logger()

CHAN = 'tsouksam'

my_pull = dobby_pull.Dobby_pull(CHAN)
my_spark = dobby_spark.Dobby_spark()
while True:
    # Continuously check for Dobby questions
    dobby_data = my_pull.pull_data()
    for msg in dobby_data:
        personid, room_msg = my_spark.spark_room_msg(msg['id'])
        if '/dobby' in room_msg:
            name = my_spark.spark_get_person(msg['personId'])
            if not 'dobby' in name:
                message = "Dobby: Welcome back " + name + "\\n"
                message += "How can I help you?"
                roomData = '{"roomId": "%s", "text": "%s"}' \
                  % (msg['roomId'], message)
                my_spark.spark_msg_request(roomData)
    time.sleep(1)
