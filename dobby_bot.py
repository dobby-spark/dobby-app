"""
filename: dobby_pull.py
Description: Dobby pulls messages from custom channel
"""
import json
import logging
import requests
import dobby_parse

logger = logging.getLogger('dobby')

def run_actions(actions, sessionId, message, context):
    context = actions['merge'](sessionId, context, dobby_parse.parseMessage(message), message)
    return actions['nextState'](sessionId, context)