const Applet = imports.ui.applet;
const St = imports.gi.St;
const Gdk = imports.gi.Gdk;
const Gtk = imports.gi.Gtk;
const Keymap = Gdk.Keymap.get_default();
const Caribou = imports.gi.Caribou;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const Gio = imports.gi.Gio;

const Meta = imports.ui.appletManager.appletMeta["lock@petrucci4prez"];

function MyApplet(orientation){
    this._init(orientation);
}

MyApplet.prototype = {
    __proto__: Applet.Applet.prototype,

    _init: function(orientation){
        Applet.Applet.prototype._init.call(this, orientation);

        this.binNum = new St.Bin();
        this.binCaps = new St.Bin();
		this.binEmpty= new St.Bin();
		this.binEmpty.set_size(3,1);

        Gtk.IconTheme.get_default().append_search_path(Meta.path);

        this.caps_on = new St.Icon({icon_name: "caps-on",
                                    icon_type: St.IconType.SYMBOLIC,
                                    icon_size: 18,
                                    style_class: "applet-icon"});
        this.caps_off = new St.Icon({icon_name: "caps-off",
                                    icon_type: St.IconType.SYMBOLIC,
                                    icon_size: 18,
                                    style_class: "applet-icon"});
        this.num_on = new St.Icon({icon_name: "num-on",
                                    icon_type: St.IconType.SYMBOLIC,
                                    icon_size: 18,
                                    style_class: "applet-icon"});
        this.num_off = new St.Icon({icon_name: "num-off",
                                    icon_type: St.IconType.SYMBOLIC,
                                    icon_size: 18,
                                    style_class: "applet-icon"});

		this.binNum.child = this.num_on;
		this.binCaps.child = this.caps_on;
        this.actor.add(this.binCaps, {y_align: St.Align.MIDDLE, y_fill: false});
		this.actor.add(this.binEmpty);
        this.actor.add(this.binNum, {y_align: St.Align.MIDDLE, y_fill: false});

        //~ this.menuManager = new PopupMenu.PopupMenuManager(this);
        //~ this.menu = new Applet.AppletPopupMenu(this, orientation);
        //~ this.menuManager.addMenu(this.menu);
//~ 
        //~ this.numMenuItem = new PopupMenu.PopupSwitchMenuItem(_('Num Lock'), false, { reactive: true });
        //~ this.numMenuItem.connect('activate', Lang.bind(this, this._onNumChanged));
        //~ this.menu.addMenuItem(this.numMenuItem);
//~ 
        //~ this.capsMenuItem = new PopupMenu.PopupSwitchMenuItem(_('Caps Lock'), false, { reactive: true });
        //~ this.capsMenuItem.connect('activate', Lang.bind(this, this._onCapsChanged));
        //~ this.menu.addMenuItem(this.capsMenuItem);

        this._keyboardStateChanedId = Keymap.connect('state-changed', Lang.bind(this, this._updateState));
        this._updateState();
    },

    _updateState: function() {
        this.numlock_state = this._getNumlockState();
        this.capslock_state = this._getCapslockState();
		
		let str_caps
		let str_num
		
        if (this.numlock_state) {
			this.binNum.child = this.num_on;
			str_num = 'On'
		} else {
			this.binNum.child = this.num_off;
			str_num = 'Off'
		}

        if (this.capslock_state) {
            this.binCaps.child = this.caps_on;
            str_caps = 'On'
		} else {
            this.binCaps.child = this.caps_off;
            str_caps = 'Off'
		}
		
		this.set_applet_tooltip('Num: ' + str_num + '\n' + 'Caps: ' + str_caps)

        //~ this.numMenuItem.setToggleState( this.numlock_state );
        //~ this.capsMenuItem.setToggleState( this.capslock_state );
    },

    _getNumlockState: function() {
        return Keymap.get_num_lock_state();
    },

    _getCapslockState: function() {
        return Keymap.get_caps_lock_state();
    },

    //~ on_applet_clicked: function(event){
        //~ this.menu.toggle();
    //~ },

    _onNumChanged: function(actor, event) {
        keyval = Gdk.keyval_from_name("Num_Lock");
        Caribou.XAdapter.get_default().keyval_press(keyval);
        Caribou.XAdapter.get_default().keyval_release(keyval);
    },

    _onCapsChanged: function(actor, event) {
        keyval = Gdk.keyval_from_name("Caps_Lock");
        Caribou.XAdapter.get_default().keyval_press(keyval);
        Caribou.XAdapter.get_default().keyval_release(keyval);
    } 
};

function main(metadata, orientation){
    let myApplet = new MyApplet(orientation);
    return myApplet;
}
