---
title: "Gearman Job Server: Too many open files"
description: "How to fix the Gearman Job Server error 'Too many open files' by raising the file descriptor limit."
date: 2026-09-06
weight: 20
---

If you monitor large environments you may be using
[Mod-Gearman](https://mod-gearman.org/) to spread check execution across
multiple worker nodes.

Past roughly 450 connected workers, the Gearman Job Server can start eating
100% CPU, and `gearadmin --status` hangs instead of returning anything. The log
at `/var/log/gearman-job-server/gearman.log` shows the reason:

```text
ERROR 2015-04-14 22:02:54.000000 [ main ] accept(Too many open files) -> libgearman-server/gearmand.cc:788
```

The Linux kernel defaults to a limit of `1024` open files per process, which is
too low for a Gearman Job Server — as it is for a MySQL server. Every connected
worker holds a socket, and sockets are file descriptors.

## Raise the limit

```ini
[Service]
PIDFile=/run/gearman/server.pid

LimitNOFILE=16384

ExecStart=/usr/sbin/gearmand --listen=127.0.0.1 ...
```

Rather than editing the packaged unit, put that in a drop-in so a package
update cannot overwrite it:

```bash
systemctl edit gearman-job-server
```

Then reload and restart:

```bash
systemctl daemon-reload
systemctl restart gearman-job-server
```

{{< details title="Older init systems" closed="true" >}}
Both of these predate systemd and are only relevant on very old installations.

**SysVinit** — edit `/etc/init.d/gearman-job-server`:

```bash
# Description:       Enable gearman job server
### END INIT INFO

ulimit -n 16384    # <--- Add this line

prefix=/usr
exec_prefix=${prefix}
```

Then `/etc/init.d/gearman-job-server restart`.

**Upstart** — edit `/etc/init/gearman-job-server.conf`:

```bash
respawn

limit nofile 16384 16384 # <--- Add this line
exec start-stop-daemon --start --chuid gearman --exec ...
```

Then `service gearman-job-server restart`.
{{< /details >}}

## Check the setting took

Read the limits of the running process rather than trusting the config — this is
the only check that proves the new value reached the daemon:

```console
root@ubuntu-dev:~# cat /proc/2945/limits | grep -i 'max open files'
Max open files            16384                16384                files
```

For reference, this is `gearadmin --status` on a job server carrying more than
815 workers:

![gearadmin --status with more than 815 workers](/images/tutorials/statusengine_mod_gearman.png)
