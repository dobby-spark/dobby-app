"""
filename: dobby_pull.py
Description: Dobby pulls messages from custom channel
"""
import json
import logging
import requests

logger = logging.getLogger('dobby')

class Dobby_pull:
    def __init__(self, channel='spark'):
        self.pull_url = "https://dobby-spark.appspot.com/v1/poll/" + channel
        
    def pull_get_msg(self):
        """GET an http request from pull service
        """
        msg = []
        try:
            msg = requests.get(self.pull_url).json()
        except:
            pass
            #logger.warning("  pull_get_msg: fail to get messages")
        return msg
    
    def pull_data(self):
        """Retrieve and store each room data for Dobby
        """
        data = []
        pull_msg = self.pull_get_msg()
        for msg in pull_msg:
            if msg['resource'] == 'messages':
                data.append(msg['data'])
                logger.info("  pull_data: new msg=%s",msg['data'])
        return data

