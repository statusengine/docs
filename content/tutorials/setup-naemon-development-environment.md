---
title: "Set up a Naemon development environment with Eclipse"
description: "Build, run and debug Naemon Core inside Eclipse, with a debugger and Valgrind attached."
date: 2026-09-06
weight: 30
---

This guide sets up Naemon Core for development, with a debugger and Valgrind
attached, using Eclipse. For a production install, follow
[Install Naemon Core on Ubuntu](../install-naemon/) instead.

{{< callout type="info" >}}
Written against Ubuntu 18.04 and Eclipse 2019-03, and the screenshots come from
that. The steps still hold, but Eclipse has moved some menus around since —
treat the pictures as a guide to roughly where things live rather than an exact
match.
{{< /callout >}}

Run everything as your own user, not as `root`.

## Install Eclipse

Download [Eclipse IDE for C/C++ Developers](https://www.eclipse.org/downloads/packages/),
then install a JRE:

```bash
sudo apt-get update
sudo apt-get install default-jre
```

Extract Eclipse into your home directory — substitute the filename you actually
downloaded:

```bash
tar xfv eclipse-cpp-2019-03-R-linux-gtk-x86_64.tar.gz -C ~/
```

Start it:

```bash
~/eclipse/eclipse
```

Accept the default workspace path.

![Set the Eclipse workspace](/images/tutorials/eclipse/1_set_eclipse_workspace.png)

Minimise the welcome screen for now.

![The Eclipse welcome screen](/images/tutorials/eclipse/2_eclipse_welcome.png)

## Install the Naemon build dependencies

```bash
sudo apt-get update
sudo apt-get install build-essential automake gperf help2man libtool libglib2.0-dev gdb monitoring-plugins git valgrind
```

## Build a basic Naemon configuration

Naemon needs a `naemon.cfg` plus a host and service definition before it will
start. The quickest way to get them is to install a release once, into a
throwaway prefix, and keep only the configuration it generates:

```bash
cd /tmp/
wget https://github.com/naemon/naemon-core/archive/v{{< param naemonVersion >}}.tar.gz
tar xfv v{{< param naemonVersion >}}.tar.gz
cd naemon-core-{{< param naemonVersion >}}/

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
```

The four `rm -rf` lines are the point of the exercise: the binaries go away
again, and only `~/naemon-dev/etc` and `~/naemon-dev/var` are kept. Eclipse
builds the binary from now on.

## Clone the Naemon source

```bash
mkdir -p ~/git
cd ~/git

git clone https://github.com/naemon/naemon-core.git
```

## Configure Eclipse

Close the welcome screen, then import the code with **File → Import**.

![Import code into Eclipse](/images/tutorials/eclipse/3_import_project.png)

Choose **C/C++ → Existing code as Autotools project**.

![Import as an Autotools project](/images/tutorials/eclipse/4_import_autotools_project_to_eclipse.png)

Point it at `~/git/naemon-core`.

![Select the source path](/images/tutorials/eclipse/5_select_code_path.png)

Finish the import.

![Finish the import](/images/tutorials/eclipse/6_finish_import.png)

### Set up Autotools

Go to **Project → Properties → Autotools → Configuration Settings**.

![Project properties](/images/tutorials/eclipse/7_project_pro.png)

Set `--prefix` to the configuration you built above,
`/home/<your user>/naemon-dev`.

![Set the Autotools prefix](/images/tutorials/eclipse/8_autotools_config_prefix.png)

Enable the debug option.

![Enable debug](/images/tutorials/eclipse/9_enable_debug.png)

Add these additional command line options:

```bash
--with-naemon-user=$(echo ~/naemon-dev) --with-naemon-group=users --with-pluginsdir=/usr/lib/nagios/plugins
```

![Additional command line options](/images/tutorials/eclipse/10_addidional_command_options.png)

Check that all **Builders** are enabled, then **Apply and Close**.

![Check the builders](/images/tutorials/eclipse/11_check_builders.png)

Build with **Project → Build All**.

![Build Naemon](/images/tutorials/eclipse/12_build_naemon.png)

Confirm the build succeeded.

![A successful build](/images/tutorials/eclipse/13_build_success.png)

### Set up the run configuration

Go to **Project → Properties → Run/Debug Settings → New → C/C++ Application**,
click **Search Project** and pick the `naemon` binary.

![Set up the run configuration](/images/tutorials/eclipse/14_setup_run_config.png)

On the **Arguments** tab, pass
`/home/<your user>/naemon-dev/etc/naemon/naemon.cfg`.

![Run arguments](/images/tutorials/eclipse/15_run_args.png)

On the **Environment** tab, add `LD_LIBRARY_PATH` with the value
`/home/<your user>/git/naemon-core/.libs:$LD_LIBRARY_PATH`. Without it the
binary picks up an installed Naemon library instead of the one you just built.

![Run environment](/images/tutorials/eclipse/16_run_env.png)

Apply and close.

#### Run Naemon inside the IDE

Run it, and watch the console for:

```text
Successfully launched command file worker with pid <PID>
```

![Running Naemon](/images/tutorials/eclipse/17_run_naemon.png)

![Naemon started successfully](/images/tutorials/eclipse/18_naemon_started_successfully.png)

Press **Stop** to kill the process.

### Attach the debugger

Open the **Debug Configurations**.

![Open the debug configuration](/images/tutorials/eclipse/19_open_debug_configuration.png)

Under **C/C++ Application → Naemon-Core Build → Debugger**, turn off
**Stop on startup at: main**, then apply and close.

![Set the debug configuration](/images/tutorials/eclipse/20_set_debug_configuration.png)

#### Run with the debugger attached

Open a source file — `src/naemon/checks_service.c` is a good one — and set a
breakpoint by double-clicking a line number. Then start Naemon under the
debugger.

![Set a breakpoint](/images/tutorials/eclipse/21_set_breakpoint.png)

Switch to the debug perspective when Eclipse offers.

![Switch to the debug perspective](/images/tutorials/eclipse/22_switch_to_debug_view.png)

Once execution reaches the breakpoint you can step through as usual.

![Stopped at a breakpoint](/images/tutorials/eclipse/23_breakpoint.png)

### Set up Valgrind

Valgrind finds memory leaks and can run from inside Eclipse. Go to
**Project → Properties → Run/Debug Settings → New → Profile With Valgrind**,
click **Search Project** and pick the `naemon` binary.

![Create a Valgrind profile](/images/tutorials/eclipse/24_create_valgrind_profile.png)

On the **Arguments** tab, pass
`/home/<your user>/naemon-dev/etc/naemon/naemon.cfg` again.

![Valgrind profile arguments](/images/tutorials/eclipse/25_valgrid_profile_args.png)

On the **Valgrind Options** tab, pick a tool —
[Valgrind offers several](https://www.eclipse.org/linuxtools/projectPages/valgrind/);
*Massif* is the one used here.

![Valgrind options](/images/tutorials/eclipse/26_valgrid_options_profile.png)

Set the same `LD_LIBRARY_PATH` on the **Environment** tab.

![Valgrind environment variable](/images/tutorials/eclipse/27_valgrid_env_var.png)

#### Run Naemon through Valgrind

Switch the launch configuration to `Naemon Valgrind` and launch in profile mode.

![Launch configuration](/images/tutorials/eclipse/28_launch_config.png)

![Launch in profile mode](/images/tutorials/eclipse/29_launch_in_profile_mode.png)

Let it run for a few minutes. When you stop Naemon you get a heap allocation
chart.

![Heap allocation chart](/images/tutorials/eclipse/30_heap_allocation.png)

**Happy hacking!**
