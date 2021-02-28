---
layout: "page"
title: "Install Naemon Core on Ubuntu Focal 20.04"
description: "In this tutorial I show you, how to install Naemon Core by yourself on Ubuntu Focal 20.04"
---

Related topics:

- <a href="{{ site.url }}/tutorials/install-naemon">Install Naemon Core on Ubuntu Xenial 16.04</a>
- <a href="{{ site.url }}/tutorials/install-naemon-bionic">Install Naemon Core on Ubuntu Bionic 18.04</a>
- <a href="{{ site.url }}/tutorials/install-naemon-focal">Install Naemon Core on Ubuntu Focal 20.04</a>
- <a href="{{ site.url }}/tutorials/install-naemon-centos7">Install Naemon Core on CentOS 7.5</a>
- <a href="{{ site.url }}/tutorials/install-naemon-centos8">Install Naemon Core on CentOS 8</a>

## Prepare your system
In this how to, we are going to install all files to `/opt/naemon`.

If you want to delete Naemon Core, just remove this folder and the systemd config.

All commands needs to run as user `root` or via `sudo`.

````bash
addgroup --system naemon
adduser --system naemon
adduser naemon naemon
````

## Install dependencies

````nohighlight
apt-get update
apt-get install build-essential automake gperf help2man libtool libglib2.0-dev
````

## Download and install Naemon Core

<div class="callout callout-info">
    <h4>Check for new versions</h4>
    <p>
        In this how to I use Naemon 1.2.3. Check if there is
        <a href="https://github.com/naemon/naemon-core/releases" target="_blank">a new version available</a>!
    </p>
</div>
````nohighlight
cd /tmp/
wget https://github.com/naemon/naemon-core/archive/v1.2.3.tar.gz
tar xfv v1.2.3.tar.gz
cd naemon-core-1.2.3/

./autogen.sh --prefix=/opt/naemon --with-naemon-user=naemon --with-naemon-group=naemon --with-pluginsdir=/usr/lib/nagios/plugins
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
        <pre>After=network.target gearman-job-server.service</pre>
        If not already done, install the Gearman Job Server now!
        <pre>apt-get install gearman-job-server</pre>
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
root@focal:/tmp/naemon-core-1.2.3# systemctl status naemon
● naemon.service - Naemon Monitoring Daemon
     Loaded: loaded (/lib/systemd/system/naemon.service; disabled; vendor preset: enabled)
     Active: active (running) since Sun 2021-02-28 09:14:07 UTC; 4s ago
       Docs: http://naemon.org/documentation
    Process: 48031 ExecStartPre=/opt/naemon/bin/naemon --verify-config /opt/naemon/etc/naemon/naemon.cfg (code=exited, status=0/SUCCESS)
    Process: 48032 ExecStart=/opt/naemon/bin/naemon --daemon /opt/naemon/etc/naemon/naemon.cfg (code=exited, status=0/SUCCESS)
   Main PID: 48033 (naemon)
      Tasks: 6 (limit: 2344)
     Memory: 2.3M
     CGroup: /system.slice/naemon.service
             ├─48033 /opt/naemon/bin/naemon --daemon /opt/naemon/etc/naemon/naemon.cfg
             ├─48034 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
             ├─48035 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
             ├─48036 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
             ├─48037 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
             └─48051 /opt/naemon/bin/naemon --daemon /opt/naemon/etc/naemon/naemon.cfg

Feb 28 09:14:07 ubuntu-s-2vcpu-2gb-intel-fra1-01 naemon[48031]:         Checked 0 service dependencies
Feb 28 09:14:07 ubuntu-s-2vcpu-2gb-intel-fra1-01 naemon[48031]:         Checked 0 host dependencies
Feb 28 09:14:07 ubuntu-s-2vcpu-2gb-intel-fra1-01 naemon[48031]:         Checked 5 timeperiods
Feb 28 09:14:07 ubuntu-s-2vcpu-2gb-intel-fra1-01 naemon[48031]: Checking global event handlers...
Feb 28 09:14:07 ubuntu-s-2vcpu-2gb-intel-fra1-01 naemon[48031]: Checking obsessive compulsive processor commands...
Feb 28 09:14:07 ubuntu-s-2vcpu-2gb-intel-fra1-01 naemon[48031]: Checking misc settings...
Feb 28 09:14:07 ubuntu-s-2vcpu-2gb-intel-fra1-01 naemon[48031]: Total Warnings: 0
Feb 28 09:14:07 ubuntu-s-2vcpu-2gb-intel-fra1-01 naemon[48031]: Total Errors:   0
Feb 28 09:14:07 ubuntu-s-2vcpu-2gb-intel-fra1-01 naemon[48031]: Things look okay - No serious problems were detected during the pre-flight check
Feb 28 09:14:07 ubuntu-s-2vcpu-2gb-intel-fra1-01 systemd[1]: Started Naemon Monitoring Daemon.
````
To make sure that you Naemon will start automatically on boot, you need to
enable the systemd configuration:
````nohighlight
systemctl enable naemon.service
````

## Install Monitoring Plugins
By default, Naemon will install a sample config with some basic checks.
So you need to install the `monitoring plugins` to get them to work.
````nohighlight
apt-get install monitoring-plugins
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
root@focal:/opt/naemon# sudo -u naemon /bin/bash
naemon@focal:/opt/naemon$ /opt/naemon/bin/naemon /opt/naemon/etc/naemon/naemon.cfg

Naemon Core 1.2.3
Copyright (c) 2013-present Naemon Core Development Team and Community Contributors
Copyright (c) 2009-2013 Nagios Core Development Team and Community Contributors
Copyright (c) 1999-2009 Ethan Galstad
License: GPL

Website: http://www.naemon.org
Naemon 1.2.3 starting... (PID=52156)
Local time is Sun Feb 28 09:16:12 UTC 2021
qh: Socket '/opt/naemon/var/naemon.qh' successfully initialized
nerd: Channel hostchecks registered successfully
nerd: Channel servicechecks registered successfully
nerd: Fully initialized and ready to rock!
Successfully launched command file worker with pid 52161
^CCaught 'Interrupt', shutting down...
Retention data successfully saved.
Successfully shutdown... (PID=52156)
Event broker module 'NERD' deinitialized successfully.
Successfully reaped command worker (PID = 52161)
naemon@focal:/opt/naemon$
````
