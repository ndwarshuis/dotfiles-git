# dotfiles

My personal dotfiles used for Arch Linux. Use at your own risk ;)

## Key apps and tools
* emacs
* zsh
* conky
* rofi
* mopidy
* xmonad

## Design choices
* Dotfiles managed with pure git (simple and not many other machines that
  require different configs)
* All user environmental variables set in `.pam_environment` (as opposed to the
  shell's rc file) to make them available for systemd user units.
* XDG specification followed as closely as possible for all supported apps to
  keep `$HOME` clean while putting most of the key config files in
  `$XDG_CONFIG_HOME`. For apps that are only [partially
  supported](https://wiki.archlinux.org/index.php/XDG_Base_Directory#Partial), I
  use a combination of these:
  * environement variables in `.pam_environment`
  * aliases in `zshrc`
  * override commands in `$PATH` (for systemd user units)
* I have two user executable directories: `$HOME/.bin` and `$HOME/.local/bin`.
  The former is for all my custom scripts and the latter is for user level
  programs installed by other tools such as Python's `pip install` and Haskell's
  `stack --install`.
  
