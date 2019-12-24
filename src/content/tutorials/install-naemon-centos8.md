---
layout: "page"
title: "Install Naemon Core on CentOS 8"
description: "In this tutorial I show you, how to install Naemon Core by yourself on CentOS 8"
---

Related topics:


- <a href="{{ site.url }}/tutorials/install-naemon">Install Naemon Core on Ubuntu Xenial 16.04</a>
- <a href="{{ site.url }}/tutorials/install-naemon-bionic">Install Naemon Core on Ubuntu Bionic 18.04</a>
- <a href="{{ site.url }}/tutorials/install-naemon-centos7">Install Naemon Core on CentOS 7.5</a>

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
yum install glib2-devel wget sudo
dnf --enablerepo=PowerTools install gperf help2man
````

## Download and install Naemon Core
<div class="callout callout-info">
    <h4>Check for new versions</h4>
    <p>
        In this how to I use Naemon 1.1.0. Check if there is
        <a href="https://github.com/naemon/naemon-core/releases" target="_blank">a new version available</a>!
    </p>
</div>
````nohighlight
cd /tmp/
wget https://github.com/naemon/naemon-core/archive/v1.1.0.tar.gz
tar xfv v1.1.0.tar.gz
cd naemon-core-1.1.0/

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
[root@centos8 naemon-core-1.1.0]# systemctl status naemon
● naemon.service - Naemon Monitoring Daemon
   Loaded: loaded (/usr/lib/systemd/system/naemon.service; disabled; vendor preset: disabled)
   Active: active (running) since Tue 2019-12-24 13:03:49 UTC; 4s ago
     Docs: http://naemon.org/documentation
  Process: 10163 ExecStart=/opt/naemon/bin/naemon --daemon /opt/naemon/etc/naemon/naemon.cfg (code=exited, status=0/SUCCESS)
  Process: 10162 ExecStartPre=/opt/naemon/bin/naemon --verify-config /opt/naemon/etc/naemon/naemon.cfg (code=exited, status=0/SUCCESS)
 Main PID: 10164 (naemon)
    Tasks: 14 (limit: 26213)
   Memory: 5.7M
   CGroup: /system.slice/naemon.service
           ├─10164 /opt/naemon/bin/naemon --daemon /opt/naemon/etc/naemon/naemon.cfg
           ├─10165 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
           ├─10166 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
           ├─10167 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
           ├─10168 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
           ├─10169 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
           ├─10170 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
           ├─10171 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
           ├─10172 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
           ├─10173 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
           ├─10174 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
           ├─10175 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
           ├─10176 /opt/naemon/bin/naemon --worker /opt/naemon/var/naemon.qh
           └─10177 /opt/naemon/bin/naemon --daemon /opt/naemon/etc/naemon/naemon.cfg

Dec 24 13:03:49 centos8 systemd[1]: Starting Naemon Monitoring Daemon...
Dec 24 13:03:49 centos8 systemd[1]: Started Naemon Monitoring Daemon.
[root@centos8 naemon-core-1.1.0]#
````
To make sure that you Naemon will start automatically on boot, you need to
enable the systemd configuration:
````nohighlight
systemctl enable naemon.service
````

## Install Nagios Plugins
By default, Naemon will install a sample config with some basic checks.
So you need to install the `nagios plugins` to get them to work.

At the time writing this article the package `nagios-plugins-all` has unmet dependencies to the package `nagios-plugins-disk_smb`.
For this reason we pick the plugins we need manually.

````nohighlight
yum install nagios-plugins-{load,http,users,procs,disk,swap,nrpe,uptime,dns,ssh,dhcp,icmp,ping,snmp,dummy,by_ssh,tcp}
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
[root@centos8 naemon-core-1.1.0]# sudo -u naemon /bin/bash
bash-4.4$ /opt/naemon/bin/naemon /opt/naemon/etc/naemon/naemon.cfg

Naemon Core 1.1.0.source
Copyright (c) 2013-present Naemon Core Development Team and Community Contributors
Copyright (c) 2009-2013 Nagios Core Development Team and Community Contributors
Copyright (c) 1999-2009 Ethan Galstad
License: GPL

Website: http://www.naemon.org
Naemon 1.1.0.source starting... (PID=10240)
Local time is Tue Dec 24 13:06:05 UTC 2019
qh: Socket '/opt/naemon/var/naemon.qh' successfully initialized
nerd: Channel hostchecks registered successfully
nerd: Channel servicechecks registered successfully
nerd: Fully initialized and ready to rock!
Successfully launched command file worker with pid 10253
^CCaught 'Interrupt', shutting down...
Retention data successfully saved.
Successfully shutdown... (PID=10240)
Event broker module 'NERD' deinitialized successfully.
Successfully reaped command worker (PID = 10253)
bash-4.4$
````
