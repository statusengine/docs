---
layout: "page"
title: "Install MySQL Server on Ubuntu 16.04"
description: "How to install a MySQL Server on Ubuntu Xenial"
---
# How to install a MySQL Server on Ubuntu 16.04 (Xenial)

## Steps to go
All commands needs to run as user `root` or via `sudo`.
````nohighlight
apt-get update
apt-get install mysql-server
````

Enter a strong password, for the MySQL `root` user:
<div class="jumbotron jumbotron-black">
    <div class="container">
        <p>
            <center>
                <img src="{{ site.url }}/assets/img/tutorials/mysql_password.png" class="img-responsive" alt="MySQL root password question"/>
            </center>
        </p>
    </div>
</div>

## Test the MySQL Server
If the installation is completed, you should be able to login to the MySQL server
with the command `mysql -p`.
<div class="jumbotron jumbotron-black">
    <div class="container">
        <p>
            <center>
                <img src="{{ site.url }}/assets/img/tutorials/mysql_root_login.png" class="img-responsive" alt="MySQL login"/>
            </center>
        </p>
    </div>
</div>

## Reduce IO made by MySQL
````nohighlight
service mysql stop
echo "innodb_log_file_size    = 512M" >> /etc/mysql/mysql.conf.d/mysqld.cnf
rm /var/lib/mysql/ib_logfile0
rm /var/lib/mysql/ib_logfile1
service mysql start
````

## Shame on me! I forgot my root password
Cool down. You can use the `debian-sys-maint` to reset your root password.
````nohighlight
mysql --defaults-extra-file=/etc/mysql/debian.cnf
````
<div class="jumbotron jumbotron-black">
    <div class="container">
        <p>
            <center>
                <img src="{{ site.url }}/assets/img/tutorials/mysql_debian_sysmaint.png" class="img-responsive" alt="MySQL login via debian-sys-maint"/>
            </center>
        </p>
    </div>
</div>
