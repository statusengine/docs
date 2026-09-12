---
title: "Install Nagios Core on Ubuntu"
description: "Build and install Nagios Core from source on Ubuntu 26.04 LTS, ready for the Statusengine broker module."
date: 2026-09-12
weight: 15
aliases:
  - /tutorials/install-nagios4-focal/
  - /tutorials/install-nagios4-bionic/
  - /tutorials/install-nagios4-centos7/
  - /tutorials/install-nagios4-centos8/
---

This guide installs Nagios Core {{< param nagiosVersion >}} from source on
Ubuntu {{< param ubuntuVersion >}} LTS ({{< param ubuntuCodename >}}).

Everything goes to `/opt/nagios`. To remove Nagios later, delete that directory
and the systemd unit. All commands run as `root`, or via `sudo`.

{{< callout type="info" >}}
Running Naemon instead? There is a
[separate guide for Naemon Core](../install-naemon/). Statusengine's broker
module supports both, but it is built against one or the other.
{{< /callout >}}

## Prepare your system

```bash
addgroup --system nagios
adduser --system nagios
adduser nagios nagios
```

## Install dependencies

```bash
apt-get update
apt-get install build-essential libgd-dev libpng-dev libssl-dev unzip
```

`libssl-dev` is not optional: `configure` stops with `Cannot find ssl headers`
without it. Neither is `unzip` — the build unpacks the bundled web assets with
it and aborts on `Cannot continue without unzip!`.

## Download and install Nagios Core

{{< callout type="info" >}}
This guide pins Nagios Core {{< param nagiosVersion >}}. Check whether
[a newer version is available ↗](https://github.com/NagiosEnterprises/nagioscore/releases)
before you start.
{{< /callout >}}

```bash
cd /tmp/
wget https://github.com/NagiosEnterprises/nagioscore/archive/nagios-{{< param nagiosVersion >}}.tar.gz
tar xfv nagios-{{< param nagiosVersion >}}.tar.gz
cd nagioscore-nagios-{{< param nagiosVersion >}}/

./configure --prefix=/opt/nagios --with-nagios-user=nagios --with-nagios-group=nagios
make all
make install
make install-commandmode
make install-config
make install-devel
```

`configure` prints a summary before it finishes. The line that matters for
Statusengine is the event broker:

```console
        Nagios executable:  nagios
        Nagios user/group:  nagios,nagios
       Command user/group:  nagios,nagios
             Event Broker:  yes
        Install ${prefix}:  /opt/nagios
    Install ${includedir}:  /opt/nagios/include/nagios
                Lock file:  /run/nagios.lock
   Check result directory:  /opt/nagios/var/spool/checkresults
```

`make install-devel` is the step that puts the Nagios headers in
`/opt/nagios/include/nagios/`. The broker module includes them as
`<nagios/nagios.h>`, so without this target there is nothing to build it
against later.

## Start Nagios Core through systemd

{{< callout type="error" >}}
**Pitfall!** If you are going to use Nagios with the
[Statusengine broker module](../../docs/broker/), the Gearman Job Server has to
be running **before** Nagios starts, so systemd needs to know about the
dependency. Replace the `After=` line below with:

```ini
After=network.target local-fs.target gearman-job-server.service
```

If you have not installed it yet:

```bash
apt-get install gearman-job-server
```
{{< /callout >}}

Put the following in `/etc/systemd/system/nagios.service`:

```ini
[Unit]
Description=Nagios Core
Documentation=https://www.nagios.org/documentation
After=network.target local-fs.target

[Service]
Type=forking
PIDFile=/run/nagios.lock
ExecStartPre=/opt/nagios/bin/nagios -v /opt/nagios/etc/nagios.cfg
ExecStart=/opt/nagios/bin/nagios -d /opt/nagios/etc/nagios.cfg
ExecStop=/bin/kill -s TERM ${MAINPID}
ExecStopPost=/bin/rm -f /opt/nagios/var/rw/nagios.cmd
ExecReload=/bin/kill -s HUP ${MAINPID}

[Install]
WantedBy=multi-user.target
```

{{< callout type="info" >}}
There is deliberately no `User=nagios` here, unlike the Naemon unit. Nagios
writes its lock file to `/run/nagios.lock`, which only `root` may create; the
daemon then drops to the `nagios_user` from `nagios.cfg` on its own, so the
process you end up with runs as `nagios` either way.

`PIDFile=` points at that same lock file. Without it systemd has to guess which
of the forked processes is the main one.
{{< /callout >}}

```bash
systemctl daemon-reload
systemctl start nagios
```

Check that it came up with `systemctl status nagios`:

```console
● nagios.service - Nagios Core
     Loaded: loaded (/etc/systemd/system/nagios.service; disabled; preset: enabled)
     Active: active (running)
       Docs: https://www.nagios.org/documentation
    Process: 127 ExecStartPre=/opt/nagios/bin/nagios -v /opt/nagios/etc/nagios.cfg (code=exited, status=0/SUCCESS)
    Process: 129 ExecStart=/opt/nagios/bin/nagios -d /opt/nagios/etc/nagios.cfg (code=exited, status=0/SUCCESS)
   Main PID: 130 (nagios)
      Tasks: 26
     Memory: 25.3M
     CGroup: /system.slice/nagios.service
             ├─130 /opt/nagios/bin/nagios -d /opt/nagios/etc/nagios.cfg
             ├─133 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
             ├─134 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
             └─...
```

The line to look for in the pre-flight check is
`Things look okay - No serious problems were detected`.

To start Nagios on boot:

```bash
systemctl enable nagios.service
```

## Install monitoring plugins

Nagios installs a sample configuration with some basic checks, so you need the
plugins for those checks to work. Unlike Naemon, Nagios does not look in
`/usr/lib/nagios/plugins` by default, so `resource.cfg` has to point at it:

```bash
apt-get install monitoring-plugins
echo '$USER1$=/usr/lib/nagios/plugins' > /opt/nagios/etc/resource.cfg
systemctl restart nagios
```

The sample `localhost` host should go green within a minute. To confirm without
a web interface, look at the status file:

```console
# grep -A30 "hoststatus {" /opt/nagios/var/status.dat | grep -E "host_name|current_state|plugin_output"
	host_name=localhost
	current_state=0
	plugin_output=PING OK - Packet loss = 0%, RTA = 0.04 ms
```

**Congratulations, you have installed Nagios Core.**

{{< callout type="info" >}}
You are now ready to install and load the
[Statusengine broker module](../../docs/broker/). Build it with
`-Dnagios=true -Dnagios_include_dir=/opt/nagios/include` — the headers
`make install-devel` put there above.
{{< /callout >}}

## Running Nagios in the foreground

For debugging it can be useful to run Nagios in the foreground instead. Exit
with <kbd>Ctrl</kbd>+<kbd>C</kbd>.

```console
root@ubuntu:/opt/nagios# sudo -u nagios /bin/bash
nagios@ubuntu:/opt/nagios$ /opt/nagios/bin/nagios /opt/nagios/etc/nagios.cfg

Nagios Core {{< param nagiosVersion >}}
Copyright (c) 2009-present Nagios Core Development Team and Community Contributors
Copyright (c) 1999-2009 Ethan Galstad
Last Modified: 2026-08-05
License: GPL

Website: https://www.nagios.org
Nagios {{< param nagiosVersion >}} starting... (PID=11863)
Local time is Sat Sep 12 14:17:54 UTC 2026
wproc: Successfully registered manager as @wproc with query handler
wproc: Registry request: name=Core Worker 11864;pid=11864
wproc: Registry request: name=Core Worker 11865;pid=11865
wproc: Registry request: name=Core Worker 11866;pid=11866
Successfully launched command file worker with pid 11877
^C
```

---

Nagios is a registered trademark of Nagios Enterprises, LLC. This guide is not
affiliated with or endorsed by Nagios Enterprises.
