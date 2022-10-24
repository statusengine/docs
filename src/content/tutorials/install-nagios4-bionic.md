---
layout: "page"
title: "Install Nagios Core on Ubuntu Bionic 18.04"
description: "In this tutorial I show you, how to install Nagios Core by yourself on Ubuntu 18.04"
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
addgroup --system nagios
adduser --system nagios
adduser nagios nagios
````

## Install dependencies

````bash
apt-get update
apt-get install build-essential libgd-dev libpng-dev unzip
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
        <pre>After=network.target gearman-job-server.service</pre>
        If not already done, install the Gearman Job Server now!
        <pre>apt-get install gearman-job-server</pre>
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
root@bionic:/tmp/nagioscore-nagios-4.4.2# systemctl status nagios
● nagios.service - Nagios Core
   Loaded: loaded (/lib/systemd/system/nagios.service; disabled; vendor preset: enabled)
   Active: active (running) since Wed 2018-08-29 11:38:17 UTC; 6s ago
     Docs: https://www.nagios.org/documentation
  Process: 24992 ExecStart=/opt/nagios/bin/nagios -d /opt/nagios/etc/nagios.cfg (code=exited, status=0/SUCCESS)
  Process: 24989 ExecStartPre=/opt/nagios/bin/nagios -v /opt/nagios/etc/nagios.cfg (code=exited, status=0/SUCCESS)
 Main PID: 24995 (nagios)
    Tasks: 6 (limit: 1152)
   CGroup: /system.slice/nagios.service
           ├─24995 /opt/nagios/bin/nagios -d /opt/nagios/etc/nagios.cfg
           ├─24997 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─24998 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─25000 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─25001 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           └─25003 /opt/nagios/bin/nagios -d /opt/nagios/etc/nagios.cfg

Aug 29 11:38:17 bionic nagios[24995]: qh: core query handler registered
Aug 29 11:38:17 bionic nagios[24995]: qh: echo service query handler registered
Aug 29 11:38:17 bionic nagios[24995]: qh: help for the query handler registered
Aug 29 11:38:17 bionic nagios[24995]: wproc: Successfully registered manager as @wproc with query handler
Aug 29 11:38:17 bionic nagios[24995]: wproc: Registry request: name=Core Worker 24997;pid=24997
Aug 29 11:38:17 bionic nagios[24995]: wproc: Registry request: name=Core Worker 24998;pid=24998
Aug 29 11:38:17 bionic nagios[24995]: wproc: Registry request: name=Core Worker 25000;pid=25000
Aug 29 11:38:17 bionic nagios[24995]: wproc: Registry request: name=Core Worker 25001;pid=25001
Aug 29 11:38:17 bionic nagios[24995]: Successfully launched command file worker with pid 25003
Aug 29 11:38:17 bionic nagios[24995]: HOST ALERT: localhost;DOWN;SOFT;1;(No output on stdout) stderr: execvp(/opt/nagios/libexec/check_ping, ...) failed. errno is 2: No such file or directory
root@bionic:/tmp/nagioscore-nagios-4.4.2#
````
To make sure that you Nagios will start automatically on boot, you need to
enable the systemd configuration:
````nohighlight
systemctl enable nagios.service
````

## Install Monitoring Plugins
By default, Nagios will install a sample config with some basic checks.
So you need to install the `monitoring plugins` to get them to work.
````nohighlight
apt-get install monitoring-plugins
echo '$USER1$=/usr/lib/nagios/plugins' > /opt/nagios/etc/resource.cfg
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
root@bionic:/opt/nagios# sudo -u nagios /bin/bash
bash: /root/.bashrc: Permission denied
nagios@bionic:/opt/nagios$ /opt/nagios/bin/nagios /opt/nagios/etc/nagios.cfg

Nagios Core 4.4.2
Copyright (c) 2009-present Nagios Core Development Team and Community Contributors
Copyright (c) 1999-2009 Ethan Galstad
Last Modified: 2018-08-16
License: GPL

Website: https://www.nagios.org
Nagios 4.4.2 starting... (PID=25194)
Local time is Wed Aug 29 11:42:49 UTC 2018
wproc: Successfully registered manager as @wproc with query handler
wproc: Registry request: name=Core Worker 25195;pid=25195
wproc: Registry request: name=Core Worker 25197;pid=25197
wproc: Registry request: name=Core Worker 25198;pid=25198
wproc: Registry request: name=Core Worker 25196;pid=25196
Successfully launched command file worker with pid 25199
^C
nagios@bionic:/opt/nagios$
````

---

````nohighlight
Nagios, NDOUtils and the Nagios logo are trademarks, servicemarks, registered trademarks or registered servicemarks owned by Nagios Enterprises, LLC. All other trademarks, servicemarks, registered trademarks, and registered servicemarks are the property of their respective owner(s).
All other trademarks are property of their respective owners. Other product or company names mentioned may be trademarks or trade names of their respective owner.
````
