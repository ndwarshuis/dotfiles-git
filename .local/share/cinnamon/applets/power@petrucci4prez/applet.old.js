const Applet = imports.ui.applet;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const St = imports.gi.St;
const PopupMenu = imports.ui.popupMenu;
const GLib = imports.gi.GLib;
const Mainloop = imports.mainloop;
const Util = imports.misc.util;

//gsettings power cmd thingys
const SET_POWER = 'gsettings set org.cinnamon.settings-daemon.plugins.power '
const GET_POWER = 'gsettings get org.cinnamon.settings-daemon.plugins.power '

//gsettings power keys
const SCREEN_AC = 'sleep-display-ac '
const SCREEN_BAT = 'sleep-display-battery '
const SLEEP_AC = 'sleep-inactive-ac-timeout '
const SLEEP_BAT = 'sleep-inactive-battery-timeout '
const LID_ACTION_AC = 'lid-close-ac-action '
const LID_ACTION_BAT = 'lid-close-battery-action '

//system presets
const SCREEN_TIMEOUTS = ['60', '120', '180', '300', '600', '1800', '3600']
const SLEEP_TIMEOUTS = ['0', '300', '600', '1800', '3600']
const LID_ACTIONS = ['suspend', 'hibernate', 'nothing']

//rapl interface in sysfs (thank you linux 3.13 :) )
const RAPL_SYSFS = 'cat /sys/devices/virtual/powercap/intel-rapl/intel-rapl:0/'

//update time in ms
const UPDATE_INTERVAL = 5000 

const BAT = "battery-";

//menu superclass
function InfoLabel() {
    this._init.apply(this, arguments);
}

InfoLabel.prototype = {
	__proto__: PopupMenu.PopupMenuItem.prototype,
	
	_init: function(label, text, reactive, can_focus) {
		PopupMenu.PopupMenuItem.prototype._init.call(this, label);

		this.actor.reactive = reactive;
		this.actor.can_focus = can_focus;
		this._text = new St.Label();
		this.addActor(this._text);
	},

	SetText: function (text) {
		this._text.set_text(text);
	}
}

//processor subclass
function ProcessorLabel() {
    this._init.apply(this, arguments);
}

ProcessorLabel.prototype = {
	__proto__: PopupMenu.PopupMenuItem.prototype,
	
	_init: function(label, text, reactive, can_focus) {
		InfoLabel.prototype._init.call(this, label, text, reactive, can_focus);
		this._previous = 0;
	},

	SetWattage: function(joules) {
		this._text.set_text(((joules - this._previous).toFixed(2)).toString());
		this._previous = joules;
	}
}

function SelectionMenu() {
	this._init.apply(this, arguments);
}

SelectionMenu.prototype = {
	__proto__: PopupMenu.PopupSubMenuMenuItem.prototype,
	
	_init: function(label, options, get_key, set_key) {
		PopupMenu.PopupSubMenuMenuItem.prototype._init.call(this, label);
		this._get_key = get_key;
		this._set_key = set_key;
		this._menu_items = [];
		this._options = options
		for (let i = 0; i < options.length; i++) {
			this._menu_items[i] = new PopupMenu.PopupMenuItem("");
			let t_function = new OptionFunction(this, this._set_key, this._options[i]);
			this._menu_items[i].connect('activate', Lang.bind(this, function() { t_function.set_option() }) );
			this.menu.addMenuItem(this._menu_items[i]);
		}
	},

	update_menu: function() {
		let current_key = this._get_key();
		for (let i = 0; i < this._menu_items.length; i++) {
			if (current_key == this._options[i]) {
				this._menu_items[i].label.set_text('-- ' + this._labels[i]);
			} else {
				this._menu_items[i].label.set_text(this._labels[i]);
			}
		}
	}
}

//wrapper for timeout setting functions (needed for persistent memory)
function OptionFunction() {
	this._init.apply(this, arguments);
}

OptionFunction.prototype = {
	_init: function(parent, funct, option) {
		this._funct = funct
		this._option = option
		this._parent = parent
	},

	set_option: function() {
		this._funct(this._option, this._parent);
	}
}

function PowerMenu() {
    this._init.apply(this, arguments);
}

PowerMenu.prototype = {
	__proto__: SelectionMenu.prototype,
	
	_init: function(label, timeouts, get_key, set_key) {
		SelectionMenu.prototype._init.call(this, label, timeouts, get_key, set_key)
		this._labels = [];
		for (let i = 0; i < timeouts.length; i++) {
			this._labels[i] = timeouts[i] + ' seconds';
		}
		this.update_menu();
	},
}

function TriggerMenu() {
    this._init.apply(this, arguments);
}

TriggerMenu.prototype = {
	__proto__: SelectionMenu.prototype,
	
	_init: function(label, timeouts, get_key, set_key) {
		SelectionMenu.prototype._init.call(this, label, timeouts, get_key, set_key)
		this._labels = [];
		for (let i = 0; i < timeouts.length; i++) {
			this._labels[i] = timeouts[i];
		}
		this.update_menu();
	},
}

function MyApplet(orientation, panel_height) {
    this._init(orientation, panel_height);
}

MyApplet.prototype = {
    __proto__: Applet.TextIconApplet.prototype,

    _init: function(orientation, panel_height) {        
        Applet.TextIconApplet.prototype._init.call(this, orientation, panel_height);
        
        try {
			this.menuManager = new PopupMenu.PopupMenuManager(this);
			this.menu = new Applet.AppletPopupMenu(this, orientation);
			this.menuManager.addMenu(this.menu);

			this.status = new InfoLabel('Status: ');
			this.menu.addMenuItem(this.status);
			
			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

			this.discharge_time = new InfoLabel('Discharge Time: ');
			this.menu.addMenuItem(this.discharge_time);

			this.charge_time = new InfoLabel("Charge Time: ");
			this.menu.addMenuItem(this.charge_time);

			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

			//Processor package watts
			this.m_processor = new PopupMenu.PopupSubMenuMenuItem("Processor");

			this.menu.addMenuItem(this.m_processor);

				this.m_pkg = new ProcessorLabel("Package Total (W): ");
				this.m_processor.menu.addMenuItem(this.m_pkg);

				this.m_pp0 = new ProcessorLabel("Cores/Cache (W): ");
				this.m_processor.menu.addMenuItem(this.m_pp0);

				this.m_pp1 = new ProcessorLabel("Integrated GPU (W): ");
				this.m_processor.menu.addMenuItem(this.m_pp1);

			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

			//pm controlz
			this.screensaver_menu = new PowerMenu('Screensaver', SCREEN_TIMEOUTS,
				this._getScreenTimeout, this._setScreenTimeout);
			this.menu.addMenuItem(this.screensaver_menu);
			
			this.sleep_ac_menu = new PowerMenu('Sleep (AC)', SLEEP_TIMEOUTS,
				this._getSleepTimeoutAC, this._setSleepTimeoutAC);
			this.menu.addMenuItem(this.sleep_ac_menu);
			
			this.sleep_bat_menu = new PowerMenu('Sleep (Battery)', SLEEP_TIMEOUTS,
				this._getSleepTimeoutBat, this._setSleepTimeoutBat);
			this.menu.addMenuItem(this.sleep_bat_menu);

			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

			//lid controlz
			this.lid_ac_menu = new TriggerMenu('Lid (AC)', LID_ACTIONS,
				this._getLidCloseActionAC, this._setLidCloseActionAC);
			this.menu.addMenuItem(this.lid_ac_menu);
			
			this.lid_bat_menu = new TriggerMenu('Lid (Battery)', LID_ACTIONS,
				this._getLidCloseActionBat, this._setLidCloseActionBat);
			this.menu.addMenuItem(this.lid_bat_menu);

			let box = new St.BoxLayout({ name: 'batteryBox' });
            this.actor.add_actor(box);
            
			this._update_power();
			this._update_processor();
        }
        catch (e) {
            global.logError(e);
        }
    },
    
    on_applet_clicked: function(event) {
        this.menu.toggle();
        this.screensaver_menu.update_menu();   
        this.sleep_ac_menu.update_menu();   
        this.sleep_bat_menu.update_menu();   
        this.lid_ac_menu.update_menu();   
        this.lid_bat_menu.update_menu();   
    },
    
    _update_power: function() {
        
        //get info from ibam
        this._status         = this._GetIbam('cat /sys/class/power_supply/BAT0/status', /(\S+)/);
        this._discharge_time = this._GetIbam('ibam --battery',                          /Battery time left:\s+(\d+:\d+:\d+)/);
        this._charge_time    = this._GetIbam('ibam --charge',                           /Charge time left:\s+(\d+:\d+:\d+)/);
        this._percent        = this._GetIbam('ibam --percentbattery',                   /Battery percentage:\s+(\d+)/);

		// only update if ibam doesn't puke
		if (this._percent != 'null') {
			//update label
			this.set_applet_label(this._percent + '%');
		
			//update tooltip
			this.set_applet_tooltip(_(this._discharge_time + " remaining"));
			
			//update menu		
			this.status.SetText(this._status)
			this.discharge_time.SetText(this._discharge_time)
			this.charge_time.SetText(this._charge_time)
			
			//update icon
			if (this._status == 'Charging') {
				this._icon_status = '-charging'
			} else {
				this._icon_status = ''
			}
			if (this._percent == 100) {
				this._icon = BAT + 'full-charged';
			} else {
				let p = Number(this._percent)
				let rel_perc = 	(p >= 80) ? 'full' :
								(p < 80 && p >= 50) ? 'good' :
								(p < 50 && p >= 20) ? 'low' :
								(p < 20 && p >= 5) ? 'caution' :
								'empty'
				this._icon = BAT + rel_perc + this._icon_status
			}
			this.set_applet_icon_symbolic_name(this._icon);
		}
		
		//set loop
		Mainloop.timeout_add(UPDATE_INTERVAL, Lang.bind(this, this._update_power));
	},

	_update_processor: function() {

		//~ read directly from sysfs as of linux 3.13
		this.m_pkg.SetWattage(0.000001*Number(GLib.spawn_command_line_sync(RAPL_SYSFS + '/energy_uj')[1]));					//PKG
		this.m_pp0.SetWattage(0.000001*Number(GLib.spawn_command_line_sync(RAPL_SYSFS + '/intel-rapl:0:0/energy_uj')[1]));	//PP0
		this.m_pp1.SetWattage(0.000001*Number(GLib.spawn_command_line_sync(RAPL_SYSFS + '/intel-rapl:0:1/energy_uj')[1]));	//PP1
		
		//set loop
		Mainloop.timeout_add(1000, Lang.bind(this, this._update_processor));
	},
	
	_GetIbam: function(cmd, regex) {
		let output = GLib.spawn_command_line_sync(cmd)[1].toString();
		output = regex.exec(output);
		if (output == null)
			output = 'null';
		else
			output = output[1];
		return output;
	},

	_buildTimeoutMenu: function(parent_menu, timeouts, get_power_key, set_power_key) {
		parent_menu.menu.removeAll();
		let current_key = get_power_key();
		for (let i = 0; i < timeouts.length; i++) {
			let timeout = timeouts[i];
			let label = timeout + ' seconds';
			if (current_key == timeout) {
				label = '-' + label
			}
			let l = new PopupMenu.PopupMenuItem(label);
			l.connect('activate', Lang.bind(this, function() { set_power_key(timeout, arguments) }) );
			parent_menu.menu.addMenuItem(l);
		}
	},

	_TrimSchema: function(key) {
		let k = /\d+/.exec(key);
		return k[0];
	},	

	_setScreenTimeout: function (time) {
		Util.spawnCommandLine(SET_POWER + SCREEN_AC + time);
		Util.spawnCommandLine(SET_POWER + SCREEN_BAT + time);
	},
	
	_setSleepTimeoutAC: function (time) {
		Util.spawnCommandLine(SET_POWER + SLEEP_AC + time);
	},
	
	_setSleepTimeoutBat: function (time) {
		Util.spawnCommandLine(SET_POWER + SLEEP_BAT + time);
	},
	
	_setLidCloseActionAC: function (action) {
		Util.spawnCommandLine(SET_POWER + LID_ACTION_AC + action);
	},
	
	_setLidCloseActionBat: function (action) {
		Util.spawnCommandLine(SET_POWER + LID_ACTION_BAT + action);
	},
	
    _getScreenTimeout: function () {
		return /\d+/.exec(GLib.spawn_command_line_sync(GET_POWER + SCREEN_AC)[1].toString())[0]; //assume ac and battery times are the same
	},
	
    _getSleepTimeoutAC: function () {
		return /\d+/.exec(GLib.spawn_command_line_sync(GET_POWER + SLEEP_AC)[1].toString())[0];
	},
	
    _getSleepTimeoutBat: function () {
		return /\d+/.exec(GLib.spawn_command_line_sync(GET_POWER + SLEEP_BAT)[1].toString())[0];
	},

	_getLidCloseActionAC: function () {
		return /\w+/.exec(GLib.spawn_command_line_sync(GET_POWER + LID_ACTION_AC)[1].toString())[0];
	},
	
	_getLidCloseActionBat: function () {
		return /\w+/.exec(GLib.spawn_command_line_sync(GET_POWER + LID_ACTION_BAT)[1].toString())[0];
	},
};

function main(metadata, orientation, panel_height) {  
    let myApplet = new MyApplet(orientation, panel_height);
    return myApplet;      
}
