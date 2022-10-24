---
layout: "page"
title: "Install Nagios Core on CentOS 7.5"
description: "In this tutorial I show you, how to install Nagios Core by yourself on CentOS 7.5"
---

Related topics:

- <a href="{{ site.url }}/tutorials/install-nagios4">Install Nagios Core on Ubuntu Xenial 16.04</a>
- <a href="{{ site.url }}/tutorials/install-nagios4-bionic">Install Nagios Core on Ubuntu Bionic 18.04</a>
- <a href="{{ site.url }}/tutorials/install-nagios4-focal">Install Nagios Core on Ubuntu Focal 20.04</a>
- <a href="{{ site.url }}/tutorials/install-nagios4-centos7">Install Nagios Core on CentOS 7.5</a>
- <a href="{{ site.url }}/tutorials/install-nagios4-centos8">Install Nagios Core on CentOS 8</a>

## Prepare your system
In this how to, we are going to install all files to `/opt/nagios`.

If you want to delete Nagios Core, just remove this folder and the systemd config.

All commands needs to run as user `root` or via `sudo`.

````nohighlight
useradd -r nagios
````

## Install dependencies

````bash
yum install epel-release
yum check-update

yum group install "Development Tools"
yum install wget unzip libpng-devel gd-devel
````

## Download and install Nagios Core
<div class="callout callout-info">
    <h4>Check for new versions</h4>
    <p>
        In this how to I use Nagios 4.4.2. Check if there is
        <a href="https://github.com/NagiosEnterprises/nagioscore/releases" target="_blank">a new version available</a>!
    </p>
</div>
````nohighlight
cd /tmp/
wget https://github.com/NagiosEnterprises/nagioscore/archive/nagios-4.4.2.tar.gz
tar xfv nagios-4.4.2.tar.gz
cd nagioscore-nagios-4.4.2/

./configure --prefix=/opt/nagios --with-nagios-user=nagios --with-nagios-group=nagios
mkdir /opt/nagios
make all
make install
make install-commandmode
make install-config
make install-devel
````

## Start Nagios Core (through systemd - recommended)
Copy the following to the file `/lib/systemd/system/nagios.service` using your favorite editor.


<div class="callout callout-danger">
    <h4>Pitfall!</h4>
    <p>
        If you want to use Nagios with the Statusengine Broker Module, it is
        required that the Gearman Job Server is running, BEFORE your Nagios
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
Description=Nagios Core
Documentation=https://www.nagios.org/documentation
After=network.target local-fs.target

[Service]
Type=forking
ExecStartPre=/opt/nagios/bin/nagios -v /opt/nagios/etc/nagios.cfg
ExecStart=/opt/nagios/bin/nagios -d /opt/nagios/etc/nagios.cfg
ExecStop=/bin/kill -s TERM ${MAINPID}
ExecStopPost=/bin/rm -f /opt/nagios/var/rw/nagios.cmd
ExecReload=/bin/kill -s HUP ${MAINPID}

[Install]
WantedBy=multi-user.target
````


````nohighlight
systemctl daemon-reload
systemctl start nagios
````

Now you can check if your Nagios Core is running using `systemctl status nagios`:
````nohighlight
[root@centos7 nagioscore-nagios-4.4.2]# systemctl status nagios.service
● nagios.service - Nagios Core
   Loaded: loaded (/usr/lib/systemd/system/nagios.service; disabled; vendor preset: disabled)
   Active: active (running) since Fr 2018-08-31 16:56:28 UTC; 10s ago
     Docs: https://www.nagios.org/documentation
  Process: 25804 ExecStart=/opt/nagios/bin/nagios -d /opt/nagios/etc/nagios.cfg (code=exited, status=0/SUCCESS)
  Process: 25803 ExecStartPre=/opt/nagios/bin/nagios -v /opt/nagios/etc/nagios.cfg (code=exited, status=0/SUCCESS)
 Main PID: 25807 (nagios)
   CGroup: /system.slice/nagios.service
           ├─25807 /opt/nagios/bin/nagios -d /opt/nagios/etc/nagios.cfg
           ├─25809 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─25810 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─25811 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─25812 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           └─25813 /opt/nagios/bin/nagios -d /opt/nagios/etc/nagios.cfg

Aug 31 16:56:28 centos7 nagios[25807]: qh: core query handler registered
Aug 31 16:56:28 centos7 nagios[25807]: qh: echo service query handler registered
Aug 31 16:56:28 centos7 nagios[25807]: qh: help for the query handler registered
Aug 31 16:56:28 centos7 nagios[25807]: wproc: Successfully registered manager as @wproc with query handler
Aug 31 16:56:28 centos7 nagios[25807]: wproc: Registry request: name=Core Worker 25812;pid=25812
Aug 31 16:56:28 centos7 nagios[25807]: wproc: Registry request: name=Core Worker 25809;pid=25809
Aug 31 16:56:28 centos7 nagios[25807]: wproc: Registry request: name=Core Worker 25810;pid=25810
Aug 31 16:56:28 centos7 nagios[25807]: wproc: Registry request: name=Core Worker 25811;pid=25811
Aug 31 16:56:28 centos7 nagios[25807]: Successfully launched command file worker with pid 25813
Aug 31 16:56:28 centos7 nagios[25807]: HOST ALERT: localhost;DOWN;SOFT;1;(No output on stdout) stderr: execvp(/opt/nagios/libexec/check_ping, ...) failed. errno is 2: No such file or directory
[root@centos7 nagioscore-nagios-4.4.2]#
````
To make sure that you Nagios will start automatically on boot, you need to
enable the systemd configuration:
````nohighlight
systemctl enable nagios.service
````

## Install Nagios Plugins
By default, Nagios will install a sample config with some basic checks.
So you need to install the `nagios plugins` to get them to work.
````nohighlight
yum install nagios-plugins-all
echo '$USER1$=/usr/lib64/nagios/plugins' > /opt/nagios/etc/resource.cfg
systemctl restart nagios
````

<br />
**Congrats!** You installed Nagios Core!

<div class="callout callout-info">
    <h4>Load Statusengine Broker Module</h4>
    <p>
        Now you are ready to install and load the
        <a href="{{ site.url }}/broker">Statusengine Broker Module</a>.
    </p>
</div>

---

## Start Nagios in foreground (expert or debugging)
For some reasons it can be useful  to run Nagios in foreground.

You can do this with this command `/opt/nagios/bin/nagios /opt/nagios/etc/nagios.cfg`
````nohighlight
[root@centos7 nagioscore-nagios-4.4.2]# sudo -u nagios /bin/bash
bash-4.2$ /opt/nagios/bin/nagios /opt/nagios/etc/nagios.cfg

Nagios Core 4.4.2
Copyright (c) 2009-present Nagios Core Development Team and Community Contributors
Copyright (c) 1999-2009 Ethan Galstad
Last Modified: 2018-08-16
License: GPL

Website: https://www.nagios.org
Nagios 4.4.2 starting... (PID=26147)
Local time is Fri Aug 31 16:58:26 UTC 2018
wproc: Successfully registered manager as @wproc with query handler
wproc: Registry request: name=Core Worker 26151;pid=26151
wproc: Registry request: name=Core Worker 26148;pid=26148
wproc: Registry request: name=Core Worker 26149;pid=26149
wproc: Registry request: name=Core Worker 26150;pid=26150
Successfully launched command file worker with pid 26152
^C
bash-4.2$
````

---

````nohighlight
Nagios, NDOUtils and the Nagios logo are trademarks, servicemarks, registered trademarks or registered servicemarks owned by Nagios Enterprises, LLC. All other trademarks, servicemarks, registered trademarks, and registered servicemarks are the property of their respective owner(s).
All other trademarks are property of their respective owners. Other product or company names mentioned may be trademarks or trade names of their respective owner.
````
