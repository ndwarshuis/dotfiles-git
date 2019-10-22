#! /bin/python

import atexit
import os
import readline

datadir = os.environ["XDG_DATA_HOME"]
histfile = os.path.join(datadir, "python", "history.log")
try:
    readline.read_history_file(histfile)
    # default history len is -1 (infinite), which may grow unruly
    readline.set_history_length(1000)
except FileNotFoundError:
    pass

atexit.register(readline.write_history_file, histfile)
