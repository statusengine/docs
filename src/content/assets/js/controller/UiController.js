angular.module('StatusengineDocs')

    .controller("UiController", function ($scope) {
        $scope.selectedOs = 'bionic';
        $scope.hasSystemd = true;
        
        
        $scope.commands = {
            bionic: {
                dependencies: 'apt-get install git php-cli php-zip php-mysql php-ldap php-json',
                apache2: 'apt-get install apache2 libapache2-mod-php',
                apache2Restart: 'systemctl restart apache2.service',
                nginx: 'apt-get install nginx php-fpm',
                phpFpmRestart: 'systemctl restart php7.2-fpm',
                nginxRestart: 'systemctl restart nginx'
            },
            xenial: {
                dependencies: 'apt-get install git php-cli php-zip php-mysql php-ldap',
                apache2: 'apt-get install apache2 libapache2-mod-php',
                apache2Restart: 'service apache2 restart',
                nginx: 'apt-get install nginx php-fpm',
                phpFpmRestart: 'service php7.0-fpm restart',
                nginxRestart: 'service nginx restart'
            },
            trusty: {
                dependencies: 'apt-get install git php5-cli php5-zip php5-mysql php5-ldap',
                apache2: 'apt-get install apache2 libapache2-mod-php5',
                apache2Restart: 'service apache2 restart',
                nginx: 'apt-get install nginx php5-fpm',
                phpFpmRestart: 'service php5-fpm restart',
                nginxRestart: 'service nginx restart'
            }
        };
        
        $scope.$watch('selectedOs', function(){
            $scope.hasSystemd = $scope.selectedOs !== 'trusty';
        });
    });