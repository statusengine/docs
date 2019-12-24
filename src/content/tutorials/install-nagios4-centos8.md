---
layout: "page"
title: "Install Nagios Core on CentOS 8"
description: "In this tutorial I show you, how to install Nagios Core by yourself on CentOS 8"
---

Related topics:

- <a href="{{ site.url }}/tutorials/install-nagios4">Install Nagios Core on Ubuntu Xenial 16.04</a>
- <a href="{{ site.url }}/tutorials/install-nagios4-bionic">Install Nagios Core on Ubuntu Bionic 18.04</a>
- <a href="{{ site.url }}/tutorials/install-nagios4-centos7">Install Nagios Core on CentOS 7.5</a>


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
        In this how to I use Nagios 4.4.5. Check if there is
        <a href="https://github.com/NagiosEnterprises/nagioscore/releases" target="_blank">a new version available</a>!
    </p>
</div>
````nohighlight
cd /tmp/
wget https://github.com/NagiosEnterprises/nagioscore/archive/nagios-4.4.5.tar.gz
tar xfv nagios-4.4.5.tar.gz
cd nagioscore-nagios-4.4.5/

./configure --prefix=/opt/nagios --with-nagios-user=nagios --with-nagios-group=nagios
mkdir /opt/nagios
make all
make install
make install-commandmode
make install-config
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
[root@centos8 nagioscore-nagios-4.4.5]# systemctl status nagios
● nagios.service - Nagios Core
   Loaded: loaded (/usr/lib/systemd/system/nagios.service; disabled; vendor preset: disabled)
   Active: active (running) since Tue 2019-12-24 12:17:19 UTC; 12s ago
     Docs: https://www.nagios.org/documentation
  Process: 32003 ExecStart=/opt/nagios/bin/nagios -d /opt/nagios/etc/nagios.cfg (code=exited, status=0/SUCCESS)
  Process: 32002 ExecStartPre=/opt/nagios/bin/nagios -v /opt/nagios/etc/nagios.cfg (code=exited, status=0/SUCCESS)
 Main PID: 32004 (nagios)
    Tasks: 14 (limit: 26213)
   Memory: 6.0M
   CGroup: /system.slice/nagios.service
           ├─32004 /opt/nagios/bin/nagios -d /opt/nagios/etc/nagios.cfg
           ├─32005 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─32006 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─32007 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─32008 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─32009 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─32010 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─32011 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─32012 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─32013 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─32014 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─32015 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─32016 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           └─32017 /opt/nagios/bin/nagios -d /opt/nagios/etc/nagios.cfg

Dec 24 12:17:19 centos8 nagios[32004]: wproc: Registry request: name=Core Worker 32009;pid=32009
Dec 24 12:17:19 centos8 nagios[32004]: wproc: Registry request: name=Core Worker 32011;pid=32011
Dec 24 12:17:19 centos8 nagios[32004]: wproc: Registry request: name=Core Worker 32012;pid=32012
Dec 24 12:17:19 centos8 nagios[32004]: wproc: Registry request: name=Core Worker 32013;pid=32013
Dec 24 12:17:19 centos8 nagios[32004]: wproc: Registry request: name=Core Worker 32010;pid=32010
Dec 24 12:17:19 centos8 nagios[32004]: wproc: Registry request: name=Core Worker 32014;pid=32014
Dec 24 12:17:19 centos8 nagios[32004]: wproc: Registry request: name=Core Worker 32015;pid=32015
Dec 24 12:17:19 centos8 nagios[32004]: wproc: Registry request: name=Core Worker 32016;pid=32016
Dec 24 12:17:20 centos8 nagios[32004]: Successfully launched command file worker with pid 32017
Dec 24 12:17:20 centos8 nagios[32004]: HOST ALERT: localhost;DOWN;SOFT;1;(No output on stdout) stderr: execvp(/opt/nagios/libexec/check_ping, ...) failed. errno is 2: No such file or directory
[root@centos8 nagioscore-nagios-4.4.5]#
````
To make sure that you Nagios will start automatically on boot, you need to
enable the systemd configuration:
````nohighlight
systemctl enable nagios.service
````

## Install Nagios Plugins
By default, Nagios will install a sample config with some basic checks.
So you need to install the `nagios plugins` to get them to work.

At the time writing this article the package `nagios-plugins-all` has unmet dependencies to the package `nagios-plugins-disk_smb`.
For this reason we pick the plugins we need manually.

````nohighlight
yum install nagios-plugins-{load,http,users,procs,disk,swap,nrpe,uptime,dns,ssh,dhcp,icmp,ping,snmp,dummy,by_ssh,tcp}
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
[root@centos8 nagioscore-nagios-4.4.5]# /opt/nagios/bin/nagios /opt/nagios/etc/nagios.cfg

Nagios Core 4.4.5
Copyright (c) 2009-present Nagios Core Development Team and Community Contributors
Copyright (c) 1999-2009 Ethan Galstad
Last Modified: 2019-08-20
License: GPL

Website: https://www.nagios.org
Nagios 4.4.5 starting... (PID=32104)
Local time is Tue Dec 24 12:25:38 UTC 2019
wproc: Successfully registered manager as @wproc with query handler
wproc: Registry request: name=Core Worker 32105;pid=32105
wproc: Registry request: name=Core Worker 32107;pid=32107
wproc: Registry request: name=Core Worker 32112;pid=32112
wproc: Registry request: name=Core Worker 32113;pid=32113
wproc: Registry request: name=Core Worker 32111;pid=32111
wproc: Registry request: name=Core Worker 32114;pid=32114
wproc: Registry request: name=Core Worker 32110;pid=32110
wproc: Registry request: name=Core Worker 32116;pid=32116
wproc: Registry request: name=Core Worker 32115;pid=32115
wproc: Registry request: name=Core Worker 32109;pid=32109
wproc: Registry request: name=Core Worker 32106;pid=32106
wproc: Registry request: name=Core Worker 32108;pid=32108
Successfully launched command file worker with pid 32117
^C
[root@centos8 nagioscore-nagios-4.4.5]#
````

---

````nohighlight
Nagios, NDOUtils and the Nagios logo are trademarks, servicemarks, registered trademarks or registered servicemarks owned by Nagios Enterprises, LLC. All other trademarks, servicemarks, registered trademarks, and registered servicemarks are the property of their respective owner(s).
All other trademarks are property of their respective owners. Other product or company names mentioned may be trademarks or trade names of their respective owner.
````
