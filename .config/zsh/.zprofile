sudo /usr/bin/prime-switch > /dev/null 2>&1

initfile="$XDG_CONFIG_HOME/X11/xinitrc"
logfile="$XDG_DATA_HOME/X11/xinit.log"
[[ -z $DISPLAY && $XDG_VTNR -eq 1 ]] && \
    exec startx "$initfile" -- -keeptty > "$logfile" 2>&1
