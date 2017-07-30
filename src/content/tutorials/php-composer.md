---
layout: "page"
title: "PHP Composer"
description: "How to install PHP Composer on Ubuntu Linux."
---

## Installation
````nohighlight
apt-get install php7.0-cli
curl -o composer-setup.php  https://getcomposer.org/installer
````
<div class="callout callout-danger">
    <h4>Security first!</h4>
    <p>
        Go to <a href="https://getcomposer.org/download/" target="_blank">https://getcomposer.org/download/</a>
        and verify your installer. <b>Now!</b>
    </p>
</div>

````nohighlight
php composer-setup.php
cp composer.phar /usr/local/bin/composer
````

## Usage
No you should be able to run the command `composer` and get the following output
````nohighlight
root@xenial:~# composer
Do not run Composer as root/super user! See https://getcomposer.org/root for details
   ______
  / ____/___  ____ ___  ____  ____  ________  _____
 / /   / __ \/ __ `__ \/ __ \/ __ \/ ___/ _ \/ ___/
/ /___/ /_/ / / / / / / /_/ / /_/ (__  )  __/ /
\____/\____/_/ /_/ /_/ .___/\____/____/\___/_/
                    /_/
Composer version 1.4.2 2017-05-17 08:17:52

Usage:
  command [options] [arguments]

Options:
  -h, --help                     Display this help message
  -q, --quiet                    Do not output any message
  -V, --version                  Display this application version
      --ansi                     Force ANSI output
      --no-ansi                  Disable ANSI output
  -n, --no-interaction           Do not ask any interactive question
      --profile                  Display timing and memory usage information
      --no-plugins               Whether to disable plugins.
  -d, --working-dir=WORKING-DIR  If specified, use the given directory as working directory.
  -v|vv|vvv, --verbose           Increase the verbosity of messages: 1 for normal output, 2 for more verbose output and 3 for debug

Available commands:
  about           Short information about Composer.
  archive         Create an archive of this composer package.
  browse          Opens the package's repository URL or homepage in your browser.
  clear-cache     Clears composer's internal package cache.
  clearcache      Clears composer's internal package cache.
  config          Set config options.
  create-project  Create new project from a package into given directory.
  depends         Shows which packages cause the given package to be installed.
  diagnose        Diagnoses the system to identify common errors.
  dump-autoload   Dumps the autoloader.
  dumpautoload    Dumps the autoloader.
  exec            Execute a vendored binary/script.
  global          Allows running commands in the global composer dir ($COMPOSER_HOME).
  help            Displays help for a command
  home            Opens the package's repository URL or homepage in your browser.
  info            Show information about packages.
  init            Creates a basic composer.json file in current directory.
  install         Installs the project dependencies from the composer.lock file if present, or falls back on the composer.json.
  licenses        Show information about licenses of dependencies.
  list            Lists commands
  outdated        Shows a list of installed packages that have updates available, including their latest version.
  prohibits       Shows which packages prevent the given package from being installed.
  remove          Removes a package from the require or require-dev.
  require         Adds required packages to your composer.json and installs them.
  run-script      Run the scripts defined in composer.json.
  search          Search for packages.
  self-update     Updates composer.phar to the latest version.
  selfupdate      Updates composer.phar to the latest version.
  show            Show information about packages.
  status          Show a list of locally modified packages.
  suggests        Show package suggestions.
  update          Updates your dependencies to the latest version according to composer.json, and updates the composer.lock file.
  validate        Validates a composer.json and composer.lock.
  why             Shows which packages cause the given package to be installed.
  why-not         Shows which packages prevent the given package from being installed.
````
