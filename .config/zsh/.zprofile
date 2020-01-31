# switch gpus as needed
sudo /usr/bin/prime-switch

# start X server
[[ -z $DISPLAY && $XDG_VTNR -eq 1 ]] && \
	exec startx "$XDG_CONFIG_HOME/X11/xinitrc" -- \
		 -keeptty > "$XDG_DATA_HOME/X11/xinit.log" 2>&1
