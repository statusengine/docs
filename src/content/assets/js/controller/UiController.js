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
                fpmConfigPath: '/etc/php/7.2/fpm/pool.d/www.conf',
                nginxRestart: 'systemctl restart nginx'
            },
            xenial: {
                dependencies: 'apt-get install git php-cli php-zip php-mysql php-ldap',
                apache2: 'apt-get install apache2 libapache2-mod-php',
                apache2Restart: 'service apache2 restart',
                nginx: 'apt-get install nginx php-fpm',
                phpFpmRestart: 'service php7.0-fpm restart',
                fpmConfigPath: '/etc/php/7.0/fpm/pool.d/www.conf',
                nginxRestart: 'service nginx restart'
            },
            trusty: {
                dependencies: 'apt-get install git php5-cli php5-mysql php5-ldap',
                apache2: 'apt-get install apache2 libapache2-mod-php5',
                apache2Restart: 'service apache2 restart',
                nginx: 'apt-get install nginx php5-fpm',
                phpFpmRestart: 'service php5-fpm restart',
                fpmConfigPath: '/etc/php5/fpm/pool.d/www.conf',
                nginxRestart: 'service nginx restart'
            },
            centos7: {
                dependencies: 'yum install git php-cli php-mysql php-ldap',
                apache2: "yum install httpd mod_ssl php\nsystemctl enable httpd",
                apache2Restart: 'systemctl restart httpd',
                nginx: 'yum install nginx php-fpm\nsystemctl enable nginx\nsystemctl enable php-fpm',
                phpFpmRestart: 'systemctl restart php-fpm',
                fpmConfigPath: ' /etc/php-fpm.d/www.conf',
                nginxRestart: 'systemctl restart nginx'
            }
        };
        
        $scope.$watch('selectedOs', function(){
            $scope.hasSystemd = $scope.selectedOs !== 'trusty';
            
            $scope.apacheConfig = '/etc/apache2/sites-available/statusengine-ui.conf';
            $scope.nginxConfig = '/etc/nginx/sites-available/statusengine-ui';
            if($scope.selectedOs === 'centos7'){
                $scope.apacheConfig = '/etc/httpd/conf.d/statusengine-ui.conf';
                $scope.nginxConfig = '/etc/nginx/conf.d/statusengine-ui.conf'
            }
            
        });
    });