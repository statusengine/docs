---
layout: "page"
title: "Install Nagios Core on Ubuntu Focal 20.04"
description: "In this tutorial I show you, how to install Nagios Core by yourself on Ubuntu 20.04"
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
        In this how to I use Nagios 4.4.6. Check if there is
        <a href="https://github.com/NagiosEnterprises/nagioscore/releases" target="_blank">a new version available</a>!
    </p>
</div>
````nohighlight
cd /tmp/
wget https://github.com/NagiosEnterprises/nagioscore/archive/nagios-4.4.6.tar.gz
tar xfv nagios-4.4.6.tar.gz
cd nagioscore-nagios-4.4.6/

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
root@ubuntu-s-2vcpu-2gb-intel-fra1-01:/tmp/nagioscore-nagios-4.4.6# systemctl status nagios
● nagios.service - Nagios Core
     Loaded: loaded (/lib/systemd/system/nagios.service; disabled; vendor preset: enabled)
     Active: active (running) since Sun 2021-02-28 09:23:39 UTC; 4s ago
       Docs: https://www.nagios.org/documentation
    Process: 58178 ExecStartPre=/opt/nagios/bin/nagios -v /opt/nagios/etc/nagios.cfg (code=exited, status=0/SUCCESS)
    Process: 58179 ExecStart=/opt/nagios/bin/nagios -d /opt/nagios/etc/nagios.cfg (code=exited, status=0/SUCCESS)
   Main PID: 58180 (nagios)
      Tasks: 6 (limit: 2344)
     Memory: 2.5M
     CGroup: /system.slice/nagios.service
             ├─58180 /opt/nagios/bin/nagios -d /opt/nagios/etc/nagios.cfg
             ├─58181 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
             ├─58182 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
             ├─58183 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
             ├─58184 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
             └─58200 /opt/nagios/bin/nagios -d /opt/nagios/etc/nagios.cfg

Feb 28 09:23:39 ubuntu-s-2vcpu-2gb-intel-fra1-01 nagios[58180]: qh: core query handler registered
Feb 28 09:23:39 ubuntu-s-2vcpu-2gb-intel-fra1-01 nagios[58180]: qh: echo service query handler registered
Feb 28 09:23:39 ubuntu-s-2vcpu-2gb-intel-fra1-01 nagios[58180]: qh: help for the query handler registered
Feb 28 09:23:39 ubuntu-s-2vcpu-2gb-intel-fra1-01 nagios[58180]: wproc: Successfully registered manager as @wproc with query handler
Feb 28 09:23:39 ubuntu-s-2vcpu-2gb-intel-fra1-01 nagios[58180]: wproc: Registry request: name=Core Worker 58182;pid=58182
Feb 28 09:23:39 ubuntu-s-2vcpu-2gb-intel-fra1-01 nagios[58180]: wproc: Registry request: name=Core Worker 58181;pid=58181
Feb 28 09:23:39 ubuntu-s-2vcpu-2gb-intel-fra1-01 nagios[58180]: wproc: Registry request: name=Core Worker 58183;pid=58183
Feb 28 09:23:39 ubuntu-s-2vcpu-2gb-intel-fra1-01 nagios[58180]: wproc: Registry request: name=Core Worker 58184;pid=58184
Feb 28 09:23:40 ubuntu-s-2vcpu-2gb-intel-fra1-01 nagios[58180]: Successfully launched command file worker with pid 58200
Feb 28 09:23:40 ubuntu-s-2vcpu-2gb-intel-fra1-01 nagios[58180]: HOST ALERT: localhost;DOWN;SOFT;1;(No output on stdout) stderr: execvp(/opt/nagios/libexec/check_ping, ...) failed. errno is 2: No such file or directory
root@ubuntu-s-2vcpu-2gb-intel-fra1-01:/tmp/nagioscore-nagios-4.4.6#
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
root@focal:/opt/nagios# sudo -u nagios /bin/bash
nagios@focal:/opt/nagios$ /opt/nagios/bin/nagios /opt/nagios/etc/nagios.cfg

Nagios Core 4.4.6
Copyright (c) 2009-present Nagios Core Development Team and Community Contributors
Copyright (c) 1999-2009 Ethan Galstad
Last Modified: 2020-04-28
License: GPL

Website: https://www.nagios.org
Nagios 4.4.6 starting... (PID=58340)
Local time is Sun Feb 28 09:25:12 UTC 2021
wproc: Successfully registered manager as @wproc with query handler
wproc: Registry request: name=Core Worker 58343;pid=58343
wproc: Registry request: name=Core Worker 58341;pid=58341
wproc: Registry request: name=Core Worker 58342;pid=58342
wproc: Registry request: name=Core Worker 58344;pid=58344
Successfully launched command file worker with pid 58345
^C
nagios@focal:/opt/nagios$
````

---

````nohighlight
Nagios, NDOUtils and the Nagios logo are trademarks, servicemarks, registered trademarks or registered servicemarks owned by Nagios Enterprises, LLC. All other trademarks, servicemarks, registered trademarks, and registered servicemarks are the property of their respective owner(s).
All other trademarks are property of their respective owners. Other product or company names mentioned may be trademarks or trade names of their respective owner.
````
