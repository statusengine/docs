# Statusengine Documentation

This is the official documentation of the [Statusengine Project](https://statusengine.org/).


## For Developers
### Static Page build with [Spress](http://spress.yosymfony.com/)
Install Spress
````
curl -LOS https://github.com/spress/Spress/releases/download/v2.1.3/spress.phar
sudo mv spress.phar /usr/local/bin/spress
chmod +x /usr/local/bin/spress
````

Run a local server
````
spress site:build --server --watch
````

Open `http://127.0.0.1:4000` in your browser

You can also use Spress on Windows 10 using the `Windows Subsystem for Linux`
