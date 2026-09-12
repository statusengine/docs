---
title: "Install Naemon Core on Ubuntu"
description: "Build and install Naemon Core from source on Ubuntu 26.04 LTS, ready for the Statusengine broker module."
date: 2026-09-06
weight: 10
aliases:
  - /tutorials/install-naemon-focal/
  - /tutorials/install-naemon-bionic/
  - /tutorials/install-naemon-centos7/
  - /tutorials/install-naemon-centos8/
---

This guide installs Naemon Core {{< param naemonVersion >}} from source on
Ubuntu {{< param ubuntuVersion >}} LTS ({{< param ubuntuCodename >}}).

Everything goes to `/opt/naemon`. To remove Naemon later, delete that directory
and the systemd unit. All commands run as `root`, or via `sudo`.

## Prepare your system

```bash
addgroup --system naemon
adduser --system naemon
adduser naemon naemon
```

## Install dependencies

```bash
apt-get update
apt-get install build-essential automake gperf help2man libtool libglib2.0-dev
```

## Download and install Naemon Core

{{< callout type="info" >}}
This guide pins Naemon {{< param naemonVersion >}}. Check whether
[a newer version is available ↗](https://github.com/naemon/naemon-core/releases)
before you start.
{{< /callout >}}

```bash
cd /tmp/
wget https://github.com/naemon/naemon-core/archive/v{{< param naemonVersion >}}.tar.gz
tar xfv v{{< param naemonVersion >}}.tar.gz
cd naemon-core-{{< param naemonVersion >}}/

./autogen.sh --prefix=/opt/naemon --with-naemon-user=naemon --with-naemon-group=naemon --with-pluginsdir=/usr/lib/nagios/plugins
make all
make install

mkdir -p /opt/naemon/var/
mkdir -p /opt/naemon/var/cache/naemon
mkdir -p /opt/naemon/var/spool/checkresults
chown naemon:naemon /opt/naemon/var -R

mkdir /opt/naemon/etc/naemon/module-conf.d
chown naemon:naemon /opt/naemon/etc -R
```

## Start Naemon Core through systemd

{{< callout type="error" >}}
**Pitfall!** If you are going to use Naemon with the
[Statusengine broker module](../../docs/broker/), the Gearman Job Server has to
be running **before** Naemon starts, so systemd needs to know about the
dependency. Replace the `After=` line below with:

```ini
After=network.target gearman-job-server.service
```

If you have not installed it yet:

```bash
apt-get install gearman-job-server
```
{{< /callout >}}

Put the following in `/etc/systemd/system/naemon.service`. It is the
[unit shipped with Naemon ↗](https://github.com/naemon/naemon-core/blob/master/daemon-systemd.in)
with a few adjustments.

```ini
[Unit]
Description=Naemon Monitoring Daemon
Documentation=http://naemon.org/documentation
After=network.target

[Service]
Type=forking
PIDFile=/opt/naemon/var/cache/naemon/naemon.pid
ExecStartPre=/opt/naemon/bin/naemon --verify-config /opt/naemon/etc/naemon/naemon.cfg
ExecStart=/opt/naemon/bin/naemon --daemon /opt/naemon/etc/naemon/naemon.cfg
ExecReload=/bin/kill -HUP $MAINPID
User=naemon
Group=naemon
StandardOutput=journal
StandardError=inherit

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl start naemon
```

Check that it came up with `systemctl status naemon`:

```console
● naemon.service - Naemon Monitoring Daemon
     Loaded: loaded (/etc/systemd/system/naemon.service; disabled; preset: enabled)
     Active: active (running)
       Docs: http://naemon.org/documentation
    Process: 48031 ExecStartPre=/opt/naemon/bin/naemon --verify-config /opt/naemon/etc/naemon/naemon.cfg (code=exited, status=0/SUCCESS)
    Process: 48032 ExecStart=/opt/naemon/bin/naemon --daemon /opt/naemon/etc/naemon/naemon.cfg (code=exited, status=0/SUCCESS)
   Main PID: 48033 (naemon)
      Tasks: 6
     CGroup: /system.slice/naemon.service
             ├─48033 /opt/naemon/bin/naemon --daemon /opt/naemon/etc/naemon/naemon.cfg
             └─48034 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
```

The line to look for in the pre-flight check is
`Things look okay - No serious problems were detected`.

To start Naemon on boot:

```bash
systemctl enable naemon.service
```

## Install monitoring plugins

Naemon installs a sample configuration with some basic checks, so you need the
plugins for those checks to work:

```bash
apt-get install monitoring-plugins
```

## Set up logrotate

To stop `naemon.log` growing without bound, adjust
`/opt/naemon/etc/logrotate.d/naemon` to your needs and copy it to
`/etc/logrotate.d/` to activate it.

**Congratulations, you have installed Naemon Core.**

{{< callout type="info" >}}
You are now ready to install and load the
[Statusengine broker module](../../docs/broker/).
{{< /callout >}}

## Running Naemon in the foreground

For debugging it can be useful to run Naemon in the foreground instead. Exit
with <kbd>Ctrl</kbd>+<kbd>C</kbd>.

```console
root@ubuntu:/opt/naemon# sudo -u naemon /bin/bash
naemon@ubuntu:/opt/naemon$ /opt/naemon/bin/naemon /opt/naemon/etc/naemon/naemon.cfg

Naemon Core {{< param naemonVersion >}}
Copyright (c) 2013-present Naemon Core Development Team and Community Contributors
Copyright (c) 2009-2013 Nagios Core Development Team and Community Contributors
Copyright (c) 1999-2009 Ethan Galstad
License: GPL

Website: http://www.naemon.org
Naemon {{< param naemonVersion >}} starting... (PID=52156)
qh: Socket '/opt/naemon/var/naemon.qh' successfully initialized
nerd: Channel hostchecks registered successfully
nerd: Channel servicechecks registered successfully
nerd: Fully initialized and ready to rock!
Successfully launched command file worker with pid 52161
^CCaught 'Interrupt', shutting down...
Retention data successfully saved.
Successfully shutdown... (PID=52156)
```
