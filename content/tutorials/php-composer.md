---
title: "Install PHP Composer"
description: "How to install PHP Composer on Ubuntu Linux."
date: 2026-09-06
weight: 40
---

Composer is PHP's dependency manager. The
[Statusengine 3 worker](../../v3/worker/) and
[Statusengine UI](../../v3/ui/) are both installed with it.

{{< callout type="info" >}}
Only Statusengine 3 needs this. The current [Go worker](../../docs/worker/) is a
single binary with no PHP and no Composer anywhere in the picture.
{{< /callout >}}

## Installation

```bash
apt-get install php-cli
curl -o composer-setup.php https://getcomposer.org/installer

php composer-setup.php
cp composer.phar /usr/local/bin/composer
```

## Usage

You should now be able to run `composer` and get its help output:

```console
root@ubuntu:~# composer
Do not run Composer as root/super user! See https://getcomposer.org/root for details
Continue as root/super user [yes]? yes
   ______
  / ____/___  ____ ___  ____  ____  ________  _____
 / /   / __ \/ __ `__ \/ __ \/ __ \/ ___/ _ \/ ___/
/ /___/ /_/ / / / / / / /_/ / /_/ (__  )  __/ /
\____/\____/_/ /_/ /_/ .___/\____/____/\___/_/
                    /_/
Composer version 2.0.11 2021-02-24 14:57:23

Usage:
  command [options] [arguments]
```

The warning about running as root is expected here: Statusengine 3 is installed
system-wide under `/opt/statusengine` or `/usr/share`, so the install step does
run as root.
