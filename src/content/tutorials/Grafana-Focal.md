---
layout: "page"
title: "Install Grafana Ubuntu 20.04"
description: "How to install Grafana on Ubuntu Focal 20.04"
---

## Install Grafana
Related topics:

- <a href="{{ site.url }}/tutorials/Graphite-Grafana">Install Graphite and Grafana on Ubuntu 16.04</a>
- <a href="{{ site.url }}/tutorials/Grafana-Bionic">Install Grafana on Ubuntu 18.04</a>
- <a href="{{ site.url }}/tutorials/Grafana-Focal">Install Grafana on Ubuntu 20.04</a>


**Before you start! Please take a look at the official  documentation!
[http://docs.grafana.org/installation/debian/](http://docs.grafana.org/installation/debian/)**

````nohighlight
apt-get install apt-transport-https

echo "deb https://packages.grafana.com/oss/deb stable main" > /etc/apt/sources.list.d/grafana.list
curl https://packages.grafana.com/gpg.key | apt-key add -
apt-get update

apt-get install grafana

systemctl daemon-reload
systemctl start grafana-server
systemctl enable grafana-server
````

### Configure Apache as reverse proxy for Grafana (optional)
````nohighlight
apt-get install apache2 ssl-cert
````

Create the file `/etc/apache2/sites-available/apache2-grafana.conf` with the following content:

````apache
<VirtualHost *:80>
    ServerName statusengine.org

    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule (.*) https://%{SERVER_NAME}/$1 [R,L]
</VirtualHost>

<VirtualHost *:443>
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    SSLEngine On
    SSLCertificateFile /etc/ssl/certs/ssl-cert-snakeoil.pem
    SSLCertificateKeyFile /etc/ssl/private/ssl-cert-snakeoil.key
</VirtualHost>
````

**Notice:** We added an automatically redirect from http to https using self-signed certificates.


Enable the new configuration
````nohighlight
a2ensite apache2-grafana
a2enmod proxy
a2enmod proxy_http
a2enmod ssl
a2enmod xml2enc
a2enmod rewrite
systemctl restart apache2
````

Now you should able to browse to the Grafana Frontend via `https://your-address`.

Username: `admin`

Password: `admin`

<div class="jumbotron jumbotron-black">
    <div class="container">
        <p>
            <center>
                <img src="{{ site.url }}/assets/img/tutorials/grafana7-web.png" class="img-responsive" alt="Grafana via HTTPS"/>
            </center>
        </p>
    </div>
</div>

The Grafana configuration is located at `/etc/grafana/grafana.ini`. I would recommend
you to take a look at this file.

#### Add Datasource for Statusengine
This tutorial is basically made for the Statusengine project. To continue, decide which storage backend you prefer to store metric data.

- [CrateDB](/tutorials/CrateDB-Perfdata-Backend)
- [MySQL](/tutorials/MySQL-Perfdata-Backend)
- [Elasticsearch 5.x](/tutorials/Elasticsearch-Perfdata-Backend) / [Elasticsearch 6.x](/tutorials/Elasticsearch6-Perfdata-Backend) / [Elasticsearch 7.x](/tutorials/Elasticsearch7-Perfdata-Backend)
- [Graphite](/tutorials/Graphite-Grafana)


