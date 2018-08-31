---
layout: "page"
title: "Install Naemon Core on CentOS 7.5"
description: "In this tutorial I show you, how to install Naemon Core by yourself on CentOS 7.5"
---

Related topics:


- <a href="{{ site.url }}/tutorials/install-naemon">Install Naemon Core on Ubuntu Xenial 16.04</a>
- <a href="{{ site.url }}/tutorials/install-naemon-bionic">Install Naemon Core on Ubuntu Bionic 18.04</a>

## Prepare your system
In this how to, we are going to install all files to `/opt/naemon`.

If you want to delete Naemon Core, just remove this folder and the systemd config.

All commands needs to run as user `root` or via `sudo`.

````bash
useradd -r naemon
````

## Install dependencies

````nohighlight
yum install epel-release
yum check-update

yum group install "Development Tools"
yum install glib2-devel help2man gperf wget
````

## Download and install Naemon Core
<div class="callout callout-info">
    <h4>Check for new versions</h4>
    <p>
        In this how to I use Naemon 1.0.8. Check if there is
        <a href="https://github.com/naemon/naemon-core/releases" target="_blank">a new version available</a>!
    </p>
</div>
````nohighlight
cd /tmp/
wget https://github.com/naemon/naemon-core/archive/v1.0.8.tar.gz
tar xfv v1.0.8.tar.gz
cd naemon-core-1.0.8/

./autogen.sh --prefix=/opt/naemon --with-naemon-user=naemon --with-naemon-group=naemon --with-pluginsdir=/usr/lib64/nagios/plugins
make all
make install

mkdir -p /opt/naemon/var/
mkdir -p /opt/naemon/var/cache/naemon
mkdir -p /opt/naemon/var/spool/checkresults
chown naemon:naemon /opt/naemon/var -R

mkdir /opt/naemon/etc/naemon/module-conf.d
chown naemon:naemon /opt/naemon/etc -R
````

## Start Naemon Core (through systemd - recommended)
Due to I had some issues using the default Naemon systemd service configuration
I modified the [original](https://github.com/naemon/naemon-core/blob/master/daemon-systemd.in) a bit.

Copy the following to the file `/lib/systemd/system/naemon.service` using your favorite editor.

<div class="callout callout-danger">
    <h4>Pitfall!</h4>
    <p>
        If you want to use Naemon with the Statusengine Broker Module, it is
        required that the Gearman Job Server is running, BEFORE your Naemon
        gets started!
        <br />
        So you need to make sure that systemd will start the Gearman Job Server first.
        <br />
        To configure this, replace the <i>AFTER=</i> line in the following systemd configuration
        with this:
        <pre>After=network.target gearmand.service</pre>
        If not already done, install the Gearman Job Server now!
        <pre>yum install gearmand
systemctl enable gearmand
systemctl start gearmand</pre>
    </p>
</div>

````ini
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

````


````nohighlight
systemctl daemon-reload
systemctl start naemon
````

Now you can check if your Naemon Core is running using `systemctl status naemon`:
````nohighlight
[root@centos7 naemon-core-1.0.8]# systemctl status naemon
● naemon.service - Naemon Monitoring Daemon
   Loaded: loaded (/usr/lib/systemd/system/naemon.service; disabled; vendor preset: disabled)
   Active: active (running) since Fr 2018-08-31 16:19:30 UTC; 1min 48s ago
     Docs: http://naemon.org/documentation
 Main PID: 23768 (naemon)
   CGroup: /system.slice/naemon.service
           ├─23768 /opt/naemon/bin/naemon --daemon /opt/naemon/etc/naemon/naemon.cfg
           ├─23769 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
           ├─23770 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
           ├─23771 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
           ├─23772 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
           └─23773 /opt/naemon/bin/naemon --daemon /opt/naemon/etc/naemon/naemon.cfg

Aug 31 16:19:30 centos7 systemd[1]: Starting Naemon Monitoring Daemon...
Aug 31 16:19:30 centos7 systemd[1]: Started Naemon Monitoring Daemon.
[root@centos7 naemon-core-1.0.8]#
````
To make sure that you Naemon will start automatically on boot, you need to
enable the systemd configuration:
````nohighlight
systemctl enable naemon.service
````

## Install Nagios Plugins
By default, Naemon will install a sample config with some basic checks.
So you need to install the `nagios plugins` to get them to work.
````nohighlight
yum install nagios-plugins-all
````

## Setup Logrotate
To avoid, that the size of your `naemon.log` grows up in the sky you should configure
the logrotate daemon.

Modify the file `/opt/naemon/etc/logrotate.d/naemon` until it fulfill your needs.

Than copy it to `/etc/logrotate.d/` to enable the configuration

<br />
**Congrats!** You installed Naemon Core!

<div class="callout callout-info">
    <h4>Load Statusengine Broker Module</h4>
    <p>
        Now you are ready to install and load the
        <a href="{{ site.url }}/broker">Statusengine Broker Module</a>.
    </p>
</div>

---

## Start Naemon in foreground (expert or debugging)
For some reasons it can be useful  to run Naemon in foreground.

You can do this with this command `/opt/naemon/bin/naemon /opt/naemon/etc/naemon/naemon.cfg`
````nohighlight
[root@centos7 naemon-core-1.0.8]# sudo -u naemon /bin/bash
bash-4.2$ /opt/naemon/bin/naemon /opt/naemon/etc/naemon/naemon.cfg

Naemon Core 1.0.8.source
Copyright (c) 2013-present Naemon Core Development Team and Community Contributors
Copyright (c) 2009-2013 Nagios Core Development Team and Community Contributors
Copyright (c) 1999-2009 Ethan Galstad
License: GPL

Website: http://www.naemon.org
Naemon 1.0.8.source starting... (PID=24215)
Local time is Fri Aug 31 16:22:56 UTC 2018
qh: Socket '/opt/naemon/var/naemon.qh' successfully initialized
nerd: Channel hostchecks registered successfully
nerd: Channel servicechecks registered successfully
nerd: Fully initialized and ready to rock!
Successfully launched command file worker with pid 24220
^CCaught 'Interrupt', shutting down...
Successfully shutdown... (PID=24215)
Event broker module 'NERD' deinitialized successfully.
Successfully reaped command worker (PID = 24220)
bash-4.2$
````
