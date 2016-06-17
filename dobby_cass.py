"""
filename: dobby_cass.py
Description: Dobby Cassandra API
"""
from cassandra.cluster import Cluster
import logging
import time
# dobby modules
import dobby_log
import dobby_pull
import dobby_spark

logger = dobby_log.setup_logger()

CHAN = 'tsouksam'
CHAN = 'spark'

class Db(object):
    def __init__(self, hostname='localhost', keyname='demo'):
        logger.info('Db init: hostname=%s dbnum=%s' % (hostname, keyname))
        try:
            cluster = Cluster([hostname])
            self.cursor = cluster.connect(keyname)
        except:
            msg = 'Db.connection failure: %s' % sys.exc_info()
            logger.error(msg)

    def get_next(self, intent, topic, state, ainput):
        logger.debug('  db.get_intent: intent=%s', intent)
        nextEntry = {'nextintent': None, 'nextstate': None, 'msg': None}
        try:
            result = self.cursor.execute("select * from state_mc")
            #result = self.cursor.execute("select msg, nextstate, nextintent from state_mc where \
            #intent=%s and topic=%s and state=%s and input=%s" % (intent, topic, state, ainput))
        except:
            pass
        if result:
            for rec in result:
                if rec.intent == intent and rec.topic == topic and rec.state == state and rec.input == ainput:
                    nextEntry['nextintent'] = rec.nextintent
                    nextEntry['nextstate'] = rec.nextstate
                    nextEntry['msg'] = rec.msg
                    return nextEntry
        return nextEntry
    
    def set(self, key, value):
        logger.debug('  db.set: key=%s value=%s' % (key, value))
        try:
            status = self.cursor.set(key, value)
        except:
            msg = 'Db.set failure: %s' % sys.exc_info()
            logger.error(msg)
            raise ChangelogsDbError(msg)
        # set expiration
        try:
            status = self.cursor.expire(key, EXPIRATION)
        except:
            msg = 'Db.expire failure: %s' % sys.exc_info()
            logger.error(msg)
            raise ChangelogsDbError(msg)
        return status

    def get(self, key):
        #logger.debug('  db.get: key=%s', key)
        return self.cursor.get(key)
