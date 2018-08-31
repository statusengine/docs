---
layout: "page"
title: "Install Nagios Core on Ubuntu 16.04"
description: "In this tutorial I show you, how to install Nagios Core by yourself"
---

Related topics:

- <a href="{{ site.url }}/tutorials/install-nagios4-bionic">Install Nagios Core on Ubuntu Bionic 18.04</a>
- <a href="{{ site.url }}/tutorials/install-nagios4-centos7">Install Nagios Core on CentOS 7.5</a>

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
apt-get install build-essential libgd-dev libpng12-dev unzip
````

## Download and install Nagios Core
<div class="callout callout-info">
    <h4>Check for new versions</h4>
    <p>
        In this how to I use Nagios 4.3.2. Check if there is
        <a href="https://github.com/NagiosEnterprises/nagioscore/releases" target="_blank">a new version available</a>!
    </p>
</div>
````nohighlight
cd /tmp/
wget https://github.com/NagiosEnterprises/nagioscore/archive/nagios-4.3.2.tar.gz
tar xfv nagios-4.3.2.tar.gz
cd nagioscore-nagios-4.3.2/

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
root@xenial:/tmp/nagioscore-nagios-4.3.2# systemctl status nagios
● nagios.service - Nagios network monitor
   Loaded: loaded (/lib/systemd/system/nagios.service; disabled; vendor preset: enabled)
   Active: active (running) since Mi 2017-05-17 21:01:02 CEST; 3s ago
  Process: 14340 ExecStart=/opt/nagios/bin/nagios --daemon /opt/nagios/etc/nagios.cfg (code=exited, status=0/SUCCESS)
  Process: 14336 ExecStartPre=/opt/nagios/bin/nagios --verify-config /opt/nagios/etc/nagios.cfg (code=exited, status=0/SUCCESS)
 Main PID: 14341 (nagios)
    Tasks: 6
   Memory: 1.7M
      CPU: 7ms
   CGroup: /system.slice/nagios.service
           ├─14341 /opt/nagios/bin/nagios --daemon /opt/nagios/etc/nagios.cfg
           ├─14342 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─14344 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─14345 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           ├─14346 /opt/nagios/bin/nagios --worker /opt/nagios/var/rw/nagios.qh
           └─14347 /opt/nagios/bin/nagios --daemon /opt/nagios/etc/nagios.cfg

Mai 17 21:01:02 xenial nagios[14341]: nerd: Channel servicechecks registered successfully
Mai 17 21:01:02 xenial nagios[14341]: nerd: Channel opathchecks registered successfully
Mai 17 21:01:02 xenial nagios[14341]: nerd: Fully initialized and ready to rock!
Mai 17 21:01:02 xenial nagios[14341]: wproc: Successfully registered manager as @wproc with query handler
Mai 17 21:01:02 xenial nagios[14341]: wproc: Registry request: name=Core Worker 14342;pid=14342
Mai 17 21:01:02 xenial nagios[14341]: wproc: Registry request: name=Core Worker 14344;pid=14344
Mai 17 21:01:02 xenial nagios[14341]: wproc: Registry request: name=Core Worker 14345;pid=14345
Mai 17 21:01:02 xenial nagios[14341]: wproc: Registry request: name=Core Worker 14346;pid=14346
Mai 17 21:01:02 xenial nagios[14341]: Successfully launched command file worker with pid 14347
Mai 17 21:01:02 xenial nagios[14341]: HOST ALERT: localhost;DOWN;SOFT;1;(No output on stdout) stderr: execvp(/opt/nagios/libexec/check_ping, ...) failed. errno is 2: No such file or directory
root@xenial:/tmp/nagioscore-nagios-4.3.2#
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
apt-get install nagios-plugins
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
root@xenial:/tmp/nagioscore-nagios-4.3.2# sudo -u nagios /bin/bash
bash: /root/.bashrc: Keine Berechtigung
nagios@xenial:/tmp/nagioscore-nagios-4.3.2$ /opt/nagios/bin/nagios /opt/nagios/etc/nagios.cfg

Nagios Core 4.3.2
Copyright (c) 2009-present Nagios Core Development Team and Community Contributors
Copyright (c) 1999-2009 Ethan Galstad
Last Modified: 2017-05-09
License: GPL

Website: https://www.nagios.org
Nagios 4.3.2 starting... (PID=20972)
Local time is Wed May 17 21:04:54 CEST 2017
nerd: Channel hostchecks registered successfully
nerd: Channel servicechecks registered successfully
nerd: Channel opathchecks registered successfully
nerd: Fully initialized and ready to rock!
wproc: Successfully registered manager as @wproc with query handler
wproc: Registry request: name=Core Worker 20973;pid=20973
wproc: Registry request: name=Core Worker 20974;pid=20974
wproc: Registry request: name=Core Worker 20976;pid=20976
wproc: Registry request: name=Core Worker 20975;pid=20975
Successfully launched command file worker with pid 20977
^C
nagios@xenial:/tmp/nagioscore-nagios-4.3.2$
````

---

````nohighlight
Nagios, NDOUtils and the Nagios logo are trademarks, servicemarks, registered trademarks or registered servicemarks owned by Nagios Enterprises, LLC. All other trademarks, servicemarks, registered trademarks, and registered servicemarks are the property of their respective owner(s).
All other trademarks are property of their respective owners. Other product or company names mentioned may be trademarks or trade names of their respective owner.
````
