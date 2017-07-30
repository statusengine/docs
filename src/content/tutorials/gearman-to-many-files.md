---
layout: "page"
title: "Gearman Job Server - Too many open files"
description: "How to fix Gearman Job Server issue 'Too many open files'"
---
# Gearman Job Server - Too many open files

If you are monitoring large environments you may be are using [Mod_Gearman](http://mod-gearman.org/)
to spread the execution of checks using multiple worker nodes.

However, unfortunately I had the problem that the Gearman Job Server eats 100% of my CPU time
if more than 450 workers tried to connect to it and `gearadmin --status` stuck and
did not return information anymore.

In the log file `/var/log/gearman-job-server/gearman.log` I found the following message:

`ERROR 2015-04-14 22:02:54.000000 [ main ] accept(Too many open files) -> libgearman-server/gearmand.cc:788`

By default the Linux kernel set a limit of `1024` open files which is bad for
MySQL servers or the Gearman Job Server.

To fix this issue, you need to increase this limit.


## Set the limit
#### SysVinit (/etc/init.d/gearman-job-server start)
Edit the file `/etc/init.d/gearman-job-server` like this:
````bash
# Description:       Enable gearman job server
### END INIT INFO

ulimit -n 16384    # <--- Add this line

prefix=/usr
exec_prefix=${prefix}
````
And restart: `/etc/init.d/gearman-job-server restart`

#### Upstart (service gearman-job-server start)
Edit the file `/etc/init/gearman-job-server.conf` like this:
````bash
respawn

limit nofile 16384 16384 # <--- Add this line
exec start-stop-daemon --start --chuid gearman --exec ...
````
And restart: `service gearman-job-server restart`

#### systemd (systemctl start gearman-job-server)
Edit the file `/etc/systemd/system/multi-user.target.wants/gearman-job-server.service` like this:
````ini
PIDFile=/run/gearman/server.pid

LimitNOFILE=16384

ExecStart=/usr/sbin/gearmand --listen=127.0.0.1 ...
````
And restart:
````nohighlight
systemctl daemon-reload
systemctl restart gearman-job-server
````

## Check your settings
To make sure that the new limit is enabled, you should check the file `/proc/$PID$/limits`:
````nohighlight
root@ubuntu-dev:~# cat /proc/2945/limits | grep -i 'max open files'
Max open files            16384                16384                files
````

<br />

If you are interested in, this is a screenshot showing the system:
<div class="jumbotron jumbotron-black">
    <div class="container">
        <p>
            <center>
                <img src="{{ site.url }}/assets/img/tutorials/statusengine_mod_gearman.png" class="img-responsive" alt="gearadmin --status with > 815 workers"/>
            </center>
        </p>
    </div>
</div>
