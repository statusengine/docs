---
layout: "page"
title: "Setup a Naemon Development environment with Eclipse"
description: "Setup a Naemon Development environment with attached Debugger using Eclipse on Ubuntu 18.04"
---

This document describes how to setup Naemon in a development environment with attached Debugger using Eclipse on Ubuntu 18.04

If you are looking for an production setup please follow one of these guides:

- <a href="{{ site.url }}/tutorials/install-naemon">Install Naemon Core on Ubuntu Xenial 16.04</a>
- <a href="{{ site.url }}/tutorials/install-naemon-bionic">Install Naemon Core on Ubuntu Bionic 18.04</a>
- <a href="{{ site.url }}/tutorials/install-naemon-centos7">Install Naemon Core on CentOS 7.5</a>

> I'm not a professional C developer. Want to improve this document?
> Please send a Pull Request to [https://github.com/statusengine/docs](https://github.com/statusengine/docs)

This tutorial contains a lot of screenshots. Hopefully this helps developers that are not familiar with eclipse (like myself) to follow this guide.

## Prepare your system
Please run all commands as your user. It is not recommended to use `root` user.

### Install Eclipse IDE
Download the latest version of [Eclipse IDE for C/C++ Developers](https://www.eclipse.org/downloads/packages/) using your favorite web browser.

Install OpenJDK

````
sudo apt-get update
sudo apt-get install default-jre
````

Open a terminal and navigate to your downloads folder. Extract Eclipse to your home directory:
````
tar xfv eclipse-cpp-2019-03-R-linux-gtk-x86_64.tar.gz -C ~/
````

#### Start Eclipse
Execute:
````
~/eclipse/eclipse
````

Use the default path as Workspace and continue.
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/1_set_eclipse_workspace.png" class="img-responsive" alt="Set Eclipse Workspace"/>
        </center>
    </p>
</div>

If you see the welcome message just minimize Eclipse for now.
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/2_eclipse_welcome.png" class="img-responsive" alt="Eclipse welcome message"/>
        </center>
    </p>
</div>

### Install dependencies for Naemon Core

````nohighlight
sudo apt-get update
sudo apt-get install build-essential automake gperf help2man libtool libglib2.0-dev gdb monitoring-plugins git valgrind
````

## Build a Basic Naemon configuration
To run Naemon a few configuration files are required like `naemon.cfg` and a host and service definition.
I'm used to use the default configuration examples that are shipped with Naemon.

I'm also pretty sure that there is an easier way to generate this configuration files, which I didn't discovered yet. ¯\\_(ツ)_/¯

````nohighlight
cd /tmp/
wget https://github.com/naemon/naemon-core/archive/v1.0.10.tar.gz
tar xfv v1.0.10.tar.gz
cd naemon-core-1.0.10/

mkdir ~/naemon-dev
./autogen.sh --prefix=$(echo ~/naemon-dev) --with-naemon-user=$(whoami) --with-naemon-group=users --with-pluginsdir=/usr/lib/nagios/plugins
make all
make install

mkdir -p ~/naemon-dev/var/
mkdir -p ~/naemon-dev/var/cache/naemon
mkdir -p ~/naemon-dev/var/spool/checkresults
mkdir ~/naemon-dev/etc/naemon/module-conf.d

rm -rf ~/naemon-dev/bin
rm -rf ~/naemon-dev/include
rm -rf ~/naemon-dev/lib
rm -rf ~/naemon-dev/share
````

## Clone Naemon source code
````nohighlight
mkdir -p ~/git
cd ~/git

git clone https://github.com/naemon/naemon-core.git
````

## Configure Eclipse

Switch back to Eclipse IDE.

First of all, close the welcome message.

Now import the Naemon code to Eclipse by navigate to **File** <i class="fa fa-arrow-right"></i> **Import**
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/3_import_project.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

Select `C/C++` `Existing code as Autotools project` and continue.
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/4_import_autotools_project_to_eclipse.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

Set the path where the Naemon source code is located (`~/git/naemon-core`) and continue.
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/5_select_code_path.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

Finish import.
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/6_finish_import.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

### Setup Autotools
Now its time to enable Eclipse to compile and run Naemon.

Go to **Project** <i class="fa fa-arrow-right"></i> **Properties** <i class="fa fa-arrow-right"></i> **Autotools** <i class="fa fa-arrow-right"></i> **Configuration Settings**

<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/7_project_pro.png" class="img-responsive"/>
        </center>
    </p>
</div>

Set the `--prefix` option to the path, where your naemon configuration is stored: `/home/$USERNAME$/naemon-dev`.

**Replace $USERNAME$ with your user name.**
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/8_autotools_config_prefix.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

Make sure to enable the Debug option
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/9_enable_debug.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

And set the following additional command line options:
````nohighlight
--with-naemon-user=$(echo ~/naemon-dev) --with-naemon-group=users --with-pluginsdir=/usr/lib/nagios/plugins
````
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/10_addidional_command_options.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>


Make sure that all **Builders** are checked and click on **Apply and Close**
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/11_check_builders.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>


Now build Naemon Core through **Project** <i class="fa fa-arrow-right"></i> **Build All**
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/12_build_naemon.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>
Check that the build was successful.
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/13_build_success.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

### Setup Run environment
After Naemon was built successfully through the IDE you can set up the "Run environment" for Naemon.

This allows you to run Naemon Core inside the IDE.

Navigate to **Project** <i class="fa fa-arrow-right"></i> **Properties**  <i class="fa fa-arrow-right"></i> **Run/Debug Settings**
 <i class="fa fa-arrow-right"></i> **New** <i class="fa fa-arrow-right"></i> **C/C++ Application**
and click on **Search Project** and select the naemon binary.

<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/14_setup_run_config.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

Switch to the **Arguments** Tab and set `/home/$USERNAME$/naemon-dev/etc/naemon/naemon.cfg` as argument.

**Replace $USERNAME$ with your user name.**
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/15_run_args.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

Switch to the **Environment** Tab and create a new environment variable:

Name: `LD_LIBRARY_PATH`

Value: `/home/$USERNAME$/git/naemon-core/.libs:$LD_LIBRARY_PATH`

**Replace $USERNAME$ with your user name.**
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/16_run_env.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

Press **Apply** and close the window.

#### Run Naemon-Core in the IDE
Run Naemon through the IDE and check the Console for the following line:
````nohighlight
Successfully launched command file worker with pid <PID>
````

<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/17_run_naemon.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/18_naemon_started_successfully.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

Press **Stop** to kill the Naemon process.

### Setup Debugger environment
Now you are able to configure, compile and run Naemon inside the IDE.
In the last step you need to configure the IDE to be able to attach a Debugger.

Open the **Debug Configurations**
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/19_open_debug_configuration.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

Select
**C/C++ Application** <i class="fa fa-arrow-right"></i> **Naemon-Core Build** <i class="fa fa-arrow-right"></i>
**Debugger Tab** <i class="fa fa-arrow-right"></i> **Disable `Stop on startup at: main`** <i class="fa fa-arrow-right"></i>
**Apply** and close the window.

<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/20_set_debug_configuration.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

#### Run Naemon-Core with attached Debugger
Open a C-File, for Example `src/naemon/checks_service.c` and add a **Breakpoint** by double clicking on a line number (line 127 in my case).
Than start Naemon with the Debugger.

<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/21_set_breakpoint.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

If Eclipse ask you if you want to switch into the Debug perspective select **switch**.
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/22_switch_to_debug_view.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

As soon as the code reaches your Breakpoint you can debug as you are used to.
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/23_breakpoint.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

### Setup Valgrind
Valgrind is a powerful profiling tool which can also be integrated to Eclipse. It can be used to find memory leaks.

Navigate to **Project** <i class="fa fa-arrow-right"></i> **Properties**  <i class="fa fa-arrow-right"></i> **Run/Debug Settings**
 <i class="fa fa-arrow-right"></i> **New** <i class="fa fa-arrow-right"></i> **Profile With Valgrind**
and click on **Search Project** and select the naemon binary.

<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/24_create_valgrind_profile.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

Switch to the **Arguments** Tab and set `/home/$USERNAME$/naemon-dev/etc/naemon/naemon.cfg` as argument.

**Replace $USERNAME$ with your user name.**

<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/25_valgrid_profile_args.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

Switch to the **Valgrind Options** Tab. [Valgrind provides different profiling tools](https://www.eclipse.org/linuxtools/projectPages/valgrind/). I chosed `Massif` in my case.

<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/26_valgrid_options_profile.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

Switch to the **Environment** Tab and create a new environment variable:

Name: `LD_LIBRARY_PATH`

Value: `/home/$USERNAME$/git/naemon-core/.libs:$LD_LIBRARY_PATH`

**Replace $USERNAME$ with your user name.**

<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/27_valgrid_env_var.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

#### Run Naemon-Core through Valgrind
Switch you Launch Configuration to `Naemon Valgrind` and click on `Launch in Profile mode`
<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/28_launch_config.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/29_launch_in_profile_mode.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

Let Naemon run in profiling mode for a few minutes. As soon as you stop Naemon you will get a heap allocation chart.

<div class="container">
    <p>
        <center>
            <img src="{{ site.url }}/assets/img/tutorials/eclipse/30_heap_allocation.png" class="img-responsive" alt="Import code to Eclipse"/>
        </center>
    </p>
</div>

**Happy hacking!**