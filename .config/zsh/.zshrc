autoload -Uz promptinit
setopt appendhistory
setopt extendedglob
setopt correctall
bindkey -v
bindkey -v '^?' backward-delete-char

## --------------------------------------------------
# autocompletion
## --------------------------------------------------
# Highlight the current autocomplete option
zstyle ':completion:*' list-colors "${(s.:.)LS_COLORS}"

# ignore full hostnames in ssh config file
# the default ssh function does not seem to differentiate b/t
# HOST and HOSTNAME directives
zstyle ':completion:*:(ssh|scp|rsync|sshfs):*:hosts' ignored-patterns '*.yavin4.ch'

autoload -Uz compinit && compinit -i

## --------------------------------------------------
# syntax highlighting a la fish
## --------------------------------------------------
for hlpath in zsh/plugins/zsh-syntax-highlighting zsh-syntax-highlighting; do
	if [[ -e "/usr/share/$hlpath/zsh-syntax-highlighting.zsh" ]]; then
		. "/usr/share/$hlpath/zsh-syntax-highlighting.zsh"
		break
	fi
done

## --------------------------------------------------
# history
## --------------------------------------------------

setopt histignoredups

autoload -Uz up-line-or-beginning-search
autoload -Uz down-line-or-beginning-search
zle -N up-line-or-beginning-search
zle -N down-line-or-beginning-search
bindkey '\eOA' up-line-or-beginning-search
bindkey '\e[A' up-line-or-beginning-search
bindkey '\eOB' down-line-or-beginning-search
bindkey '\e[B' down-line-or-beginning-search

## --------------------------------------------------
# enable x11 clipboard sync
## --------------------------------------------------
# https://unix.stackexchange.com/questions/25765/pasting-from-clipboard-to-vi-enabled-zsh-or-bash-shell
function x11-clip-wrap-widgets() {
    # NB: Assume we are the first wrapper and that we only wrap native widgets
    # See zsh-autosuggestions.zsh for a more generic and more robust wrapper
    local copy_or_paste=$1
    shift

    for widget in $@; do
        # Ugh, zsh doesn't have closures
        if [[ $copy_or_paste == "copy" ]]; then
            eval "
            function _x11-clip-wrapped-$widget() {
                zle .$widget
                xclip -in -selection clipboard <<<\$CUTBUFFER
            }
            "
        else
            eval "
            function _x11-clip-wrapped-$widget() {
                CUTBUFFER=\$(xclip -out -selection clipboard)
                zle .$widget
            }
            "
        fi

        zle -N $widget _x11-clip-wrapped-$widget
    done
}

local copy_widgets=(
    vi-yank vi-yank-eol vi-delete vi-backward-kill-word vi-change-whole-line
)
local paste_widgets=(
    vi-put-{before,after}
)
x11-clip-wrap-widgets copy $copy_widgets
x11-clip-wrap-widgets paste  $paste_widgets

## --------------------------------------------------
## Global Functions
## --------------------------------------------------
exists() {
	test -x "$(command -v "$1")"
}

## --------------------------------------------------
## PROMPT 
## --------------------------------------------------

setopt prompt_subst

if [[ ${EUID} -eq 0 ]]; then
   	user_color="%F{red}"
else
   	user_color="%F{cyan}"
fi

SSH_FLAG=0

hostname=""
if [[ $SSH_FLAG -eq 1 ]]; then
	hostname="@%M"
fi	

PROMPT=""
RPROMPT=""

git_info() {

    # Exit if not inside a Git repository
    ! git rev-parse --is-inside-work-tree > /dev/null 2>&1 && return

    # Git branch/tag, or name-rev if on detached head
    local GIT_LOCATION=$(git symbolic-ref -q HEAD || \
                             git name-rev --name-only \
                                 --no-undefined --always HEAD)
    GIT_LOCATION=${GIT_LOCATION#(refs/heads/|tags/)}

    local AHEAD="%F{red}⇡NUM%f"
    local BEHIND="%F{cyan}⇣NUM%f"
    local MERGING="%F{magenta⚡︎%f"
    local UNTRACKED="%F{red}●%f"
    local MODIFIED="%F{yellow}●%f"
    local STAGED="%F{green}●%f"

    local -a DIVERGENCES
    local -a FLAGS

    local NUM_AHEAD="$(git log --oneline @{u}.. 2> /dev/null | wc -l | tr -d ' ')"
    if [ "$NUM_AHEAD" -gt 0 ]; then
        DIVERGENCES+=( "${AHEAD//NUM/$NUM_AHEAD}" )
    fi

    local NUM_BEHIND="$(git log --oneline ..@{u} 2> /dev/null | wc -l | tr -d ' ')"
    if [ "$NUM_BEHIND" -gt 0 ]; then
        DIVERGENCES+=( "${BEHIND//NUM/$NUM_BEHIND}" )
    fi

    local GIT_DIR="$(git rev-parse --git-dir 2> /dev/null)"
    if [ -n $GIT_DIR ] && test -r $GIT_DIR/MERGE_HEAD; then
        FLAGS+=( "$MERGING" )
    fi

    if [[ -n $(git ls-files --other --exclude-standard 2> /dev/null) ]]; then
        FLAGS+=( "$UNTRACKED" )
    fi

    if ! git diff --quiet 2> /dev/null; then
        FLAGS+=( "$MODIFIED" )
    fi

    if ! git diff --cached --quiet 2> /dev/null; then
        FLAGS+=( "$STAGED" )
    fi

    local -a GIT_INFO
    [[ ${#DIVERGENCES[@]} -ne 0 ]] && GIT_INFO+=( "${(j::)DIVERGENCES}" )
    [[ ${#FLAGS[@]} -ne 0 ]] && GIT_INFO+=( "${(j::)FLAGS}" )
    GIT_INFO+=( "%F{green}$GIT_LOCATION%f" )
    echo "─(%B${(j: :)GIT_INFO}%b)"
}

function zle-line-init zle-keymap-select {
    GIT=$(git_info)
    NORMAL="%F{yellow}N%f"
    INSERT="%F{cyan}I%f"
    VIMODE="─%B(${${KEYMAP/vicmd/$NORMAL}/(main|viins)/$INSERT})%b"
    PROMPT=$'\n%B┌($user_color%n$hostname%f)─(%F{green}%*%f)$VIMODE$GIT\n└─(%F{green}%1~%f)─>%b '
    zle reset-prompt
}

zle -N zle-line-init
zle -N zle-keymap-select

export KEYTIMEOUT=1

## --------------------------------------------------
## Aliases 
## --------------------------------------------------

# various...
alias grep='grep --color=auto'
exists colordiff && alias diff=colordiff
alias sudo='sudo '
alias hs='history 1 | grep'
exists mfsconsole && alias msfconsole="msfconsole --quiet -x \"db_connect ${USER}@msf\""

# xdg conformity
exists arm && alias arm='arm -c "$XDG_CONFIG_HOME"/arm/armrc'
exists gpg2 && alias gpg2='gpg2 -c "$XDG_CONFIG_HOME"/gnupg'
exists nvidia-settings && alias nvidia-settings='nvidia-settings -c "$XDG_CONFIG_HOME"/nvidia/settings'
exists svn && alias svn='svn --config-dir "$XDG_CONFIG_HOME"/subversion'
exists sqlite3 && alias sqlite3='SQLITE_HISTORY=$XDG_DATA_HOME/sqlite_history \
sqlite3 -init "$XDG_CONFIG_HOME"/sqlite3/sqliterc'

# fix trailing slashes in rsync
rsync_slashes() {
	new_args=();
	for i in "$@"; do
		case $i in /) i=/;; */) i=${i%/};; esac
		new_args+=$i;
	done
	exec rsync "${(@)new_args}"
}
exists rsync && alias rsync=rsync_slashes

# list directories
alias ls='ls --color=auto'
alias ll='ls -Alh'

# nav
alias u='cd ..'
alias uu='cd ../..'
alias uuu='cd ../../..'
alias uuuu='cd ../../../..'
alias uuuuu='cd ../../../../..'

# power on/off
alias reboot='sudo /sbin/reboot'
alias poweroff='sudo /sbin/poweroff'
alias halt='sudo /sbin/halt'
alias shutdown='sudo /sbin/shutdown'

# git
# https://github.com/Bash-it/bash-it/blob/master/aliases/available/git.aliases.bash
alias g='git'
alias gcl='git clone'
alias ga='git add'
alias grm='git rm'
alias ga='git add'
alias gus='git reset HEAD'
alias gm="git merge"
alias gmv='git mv'
alias gs='git status -s -b'
alias gp='git push'
alias gpo='git push origin'
alias gpom='git push origin master'
alias gr='git remote'
alias gd='git diff'
alias gc='git commit -v'
alias gca='git commit -v -a'
alias gcm='git commit -v -m'
alias gcam="git commit -v -am"
alias gci='git commit --interactive'
alias gb='git branch'
alias gco='git checkout'
alias gg="git log --graph --pretty=format:'%C(yellow)%h\\ %ad%Cred%d\\ %Creset%s%C(cyan)\\ [%cn]' --abbrev-commit --date=relative"
alias ggs="gg --stat"
alias gw="git whatchanged"
alias gt="git tag"
alias gnew="git log HEAD@{1}..HEAD@{0}"
alias ggui="git gui"

# systemd
alias sc="sudo systemctl"
alias sce="sudo systemctl enable"
alias scd="sudo systemctl disable"
alias scs="sudo systemctl start"
alias sct="sudo systemctl stop"
alias scr="sudo systemctl restart"

alias scu="systemctl --user"
alias scue="systemctl --user enable"
alias scud="systemctl --user disable"
alias scus="systemctl --user start"
alias scut="systemctl --user stop"
alias scur="systemctl --user restart"

# suffix
alias -s {htm,html,pdf}='firefox'
alias -s {tiff,jpg,jpeg,png}='geeqie'
alias -s {wav,mp4,mov,ogg,m4a,flac,mp3}='vlc'
alias -s svg='inkscape'
alias -s log='less'
alias -s {csv,doc,docx,odp,ods,odt,ppt,pptx,xls,xlsx}='libreoffice'

## --------------------------------------------------
## Manly Colors
## --------------------------------------------------

man() {
    env LESS_TERMCAP_mb=$'\E[01;31m' \
    LESS_TERMCAP_md=$'\E[01;38;5;13m' \
    LESS_TERMCAP_me=$'\E[0m' \
    LESS_TERMCAP_se=$'\E[0m' \
    LESS_TERMCAP_so=$'\E[38;5;3m' \
    LESS_TERMCAP_ue=$'\E[0m' \
    LESS_TERMCAP_us=$'\E[04;38;5;10m' \
    man "$@"
}

## --------------------------------------------------
## Other Imports
## --------------------------------------------------
# virtualenvwrapper_file=/usr/bin/virtualenvwrapper.sh
# if [ -f "$virtualenvwrapper_file" ]; then
#     source "$virtualenvwrapper_file"
# fi

## --------------------------------------------------
## Python
## --------------------------------------------------
if command -v pyenv 1>/dev/null 2>&1; then
    # take out PATH since this should alredy be set in pam_environ
    eval "$(pyenv init - | sed '/PATH/d' -)"
    eval "$(pyenv virtualenv-init - | sed '/PATH/d' -)"
fi
