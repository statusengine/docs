---
layout: "page"
title: "Install PHP-Gearman yourself"
description: "In this tutorial I show you, how to install the php gearman extension"
---
## Use APT on Ubuntu

#### Ubuntu 18.04 (Bionic)
Unfortunately the php-gearman extension is broken in Ubuntu 20.04. This was also the case with Ubuntu 16.04 :(

You can use the version provided by the <a href="https://launchpad.net/~ondrej/+archive/ubuntu/php/" target="_blank">
PPA of Ondřej Surý.
</a>

I have tested it with the file <a href="{{ site.url }}/uploads/php7.4-gearman_2.1.0+1.1.2-5+ubuntu20.04.1+deb.sury.org+1_amd64.deb">php7.4-gearman_2.1.0+1.1.2-5+ubuntu20.04.1+deb.sury.org+1_amd64.deb </a>
which is the reason why I am mirroring this file! (<a href="{{ site.url }}/uploads/php7.4-gearman_2.1.0+1.1.2-5+ubuntu20.04.1+deb.sury.org+1_amd64-copyright.txt" target="_blank">License: PHP-3.01</a>)

**I am not the author of the Debian Package! This is Ondřej Surý &lt;ondrej@debian.org&gt;. I did not modified the package!**

If you don't trust me, you can also download this file from the official PPA
<a href="https://launchpad.net/~ondrej/+archive/ubuntu/php/+build/21059578" target="_blank">https://launchpad.net/~ondrej/+archive/ubuntu/php/+build/21059578</a>

Checksums to verify what you have downloaded:
````nohighlight
md5: 7ece02885d0201cb1f7512ef11a94afd
sha1: b40e73e41189a5650e53a3083e7782df921e4a94
sha256: c49113ed2abe596c700f46cea9119a409b0e6bb43cc0802eea47d0112021fd6e
sha512: fb6458a86264191445d74486efc8984fcd8dca475a6467ea280dc510f2f6402cddec58669f5f746801886b26d8d492744e60ca7c11bf58c90e795036a01ed111
````

Install the debian file
````nohighlight
wget {{ site.url }}/uploads/php7.4-gearman_2.1.0+1.1.2-5+ubuntu20.04.1+deb.sury.org+1_amd64.deb
dpkg -i php7.4-gearman_2.1.0+1.1.2-5+ubuntu20.04.1+deb.sury.org+1_amd64.deb
````
This will throw an error and complain about missing dependencies. You can simply resolve this by running:
````nohighlight
apt-get install -f
````

Now the extension is installed and loaded. You can check this using the following command:
````nohighlight
root@focal:~# php -m | grep gearman
gearman
````


#### Ubuntu 18.04 (Bionic)
````nohighlight
apt-get install php-gearman
````

#### Ubuntu 16.04 (Xenial)
Unfortunately the php-gearman extension is missing in Ubuntu 16.04.

You can use the version for *Debian Stretch* on Ubuntu as well without any issues.

I have tested it with the file <a href="{{ site.url }}/uploads/php-gearman_2.0.2+1.1.2-1_amd64.deb">php-gearman_2.0.2+1.1.2-1_amd64.deb</a>
which is the reason why I am mirroring this file! (<a href="{{ site.url }}/uploads/php-gearman_2.0.2+1.1.2-1_amd64-copyright.txt" target="_blank">License: PHP-3.01</a>)

**I am not the author of the Debian Package! This is Ondřej Surý &lt;ondrej@debian.org&gt;. I did not modified the package!**

If you don't trust me, you can also download this file from the official Debian Mirrors
<a href="https://packages.debian.org/stretch/php-gearman" target="_blank">https://packages.debian.org/stretch/php-gearman</a>

Checksums to verify what you have downloaded:
````nohighlight
md5: cae789a6163171ef4b25a2535d5901fd
sha1: 67b9530cf1276a9140605c9f8b05b605fdd4d9f1
sha256: 13440a0b6dac41dfc3269087e177e96fd53393cd3807e92e75dc7de2f20b6932
sha384: 114ac173253b94bd79355c5ce244ea80bbd168d5b37c9c2918336a4f3959a5d943f981847ea5a006c8a28191e82303db
````

Install the debian file
````nohighlight
wget {{ site.url }}/uploads/php-gearman_2.0.2+1.1.2-1_amd64.deb
dpkg -i php-gearman_2.0.2+1.1.2-1_amd64.deb
````
This will throw an error and complain about missing dependencies. You can simply resolve this by running:
````nohighlight
apt-get install -f
````

Now the extension is installed and loaded. You can check this using the following command:
````nohighlight
root@xenial:~# php -m | grep gearman
gearman
````

#### Ubuntu 14.04 (Trusty)
````nohighlight
apt-get install php5-gearman
````

---

## Compile it yourself
<div class="callout callout-warning">
    <h4>Fair warning</h4>
    <p>
        Compiling software yourself may be fail. If possible always use the packages from your distribution
    </p>
</div>
````nohighlight
apt-get install git libgearman-dev php-dev
git clone https://github.com/wcgallego/pecl-gearman.git
cd pecl-gearman/
phpize
./configure
make
make install
echo "extension=gearman.so" > /etc/php/7.0/mods-available/gearman.ini
phpenmod -s ALL gearman
````

Now the extension is installed and loaded. You can check this using the following command:
````nohighlight
root@xenial:~# php -m | grep gearman
gearman
````
