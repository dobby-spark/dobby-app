"""
filename: dobby_cass.py
Description: Dobby Cassandra API
"""
from cassandra.cluster import Cluster
import logging
import time
# dobby modules
import dobby_log

logger = dobby_log.setup_logger()

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
        """Return next state and message
        """
        logger.debug('  db.get_next: intent=%s', intent)
        nextEntry = {'nextintent': None, 'nextstate': None, 'msg': None}
        try:
            result = self.cursor.execute("select * from state_mc")
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
    
    def get_vocab(self, atype, atoken):
        """Return matching keyword for a vocab type
        """
        logger.debug('  db.get_vocab: type=%s token=%s' % (atype, atoken))
        result = None
        try:
            result = self.cursor.execute("select result from vocab where type='%s' and key='%s'" % (atype, atoken))
        except:
            pass
        if result:
            for rec in result:
                return rec.result
        return result
    
