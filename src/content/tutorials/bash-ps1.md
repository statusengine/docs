---
layout: "page"
title: "My $PS1 I used in the screenshots"
description: "If you want to use my $PS1 for your .bashrc"
---

Most of the time I use zsh with [oh-my-zsh](https://github.com/robbyrussell/oh-my-zsh),
but for documentation purpose I use bash, which is default on most linux systems.

To make bash a bit more colorful, I used an online .bashrc generator.

#### Add the following to the very end of the file `/root/.bashrc`
````nohighlight
export PS1="\[\033[38;5;7m\][\A]\[$(tput sgr0)\]\[\033[38;5;196m\]\u\[$(tput sgr0)\]\[\033[38;5;33m\]@\h:\[$(tput sgr0)\]\[\033[38;5;39m\]\w\\$\[$(tput sgr0)\]\[\033[38;5;15m\] \[$(tput sgr0)\]"
````
and restart your terminal / ssh session.

#### Result
<p>
    <center>
        <img src="{{ site.url }}/assets/img/ui/list-users.png" class="img-responsive" alt="List all available Statusengine Ui users"/>
    </center>
</p>
