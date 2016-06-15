"""
filename: dobby_log.py
Description: dobby generic logger
"""

import logging
import logging.handlers

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