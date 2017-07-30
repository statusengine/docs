---
layout: "page"
title: "Install Oracle Java (JDK) on Ubuntu"
description: "How to install Oracle Java on Ubuntu using the WebUpd8 PPA"
---
# How to install Oracle Java (JDK) on Ubuntu using the WebUpd8 PPA
Fortunately the [WebUpd8 PPA](https://launchpad.net/~webupd8team/+archive/ubuntu/java)
provides us a super easy way to install Oracle Java on a Ubuntu box.

**Many thanks! :-)**

## Steps to go
All commands needs to run as user `root` or via `sudo`.
````nohighlight
apt-add-repository ppa:webupd8team/java
apt-get update
apt-get install oracle-java8-installer
````

That's it.
