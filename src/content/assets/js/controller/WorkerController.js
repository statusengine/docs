angular.module('StatusengineDocs')

    .controller("WorkerController", function ($scope) {
        $scope.selectedOs = 'bionic';
        $scope.hasSystemd = true;
        
        
        $scope.commands = {
            bionic: {
                dependencies: 'apt-get install git php-cli php-zip php-redis redis-server php-mysql php-json php-gearman',
                stopStatusengineWorker: 'systemctl stop statusengine',
                startStatusengineWorker: 'systemctl start statusengine'
            },
            xenial: {
                dependencies: 'apt-get install git php-cli php-zip php-redis redis-server php-mysql',
                stopStatusengineWorker: 'systemctl stop statusengine',
                startStatusengineWorker: 'systemctl start statusengine'
            },
            trusty: {
                dependencies: 'apt-get install git php5-cli php5-redis redis-server php5-mysql php5-gearman',
                stopStatusengineWorker: 'service statusengine stop',
                startStatusengineWorker: 'service statusengine start'
            },
            centos7: {
                dependencies: 'yum install git php-cli php-pecl-redis redis php-mysql php-pecl-gearman php-json',
                stopStatusengineWorker: 'systemctl stop statusengine',
                startStatusengineWorker: 'systemctl start statusengine'
            }
        };
        
        $scope.mysql = {
            ubuntu: {
                short: 'mysql.service',
                long: 'After=syslog.target network.target gearman-job-server.service mysql.service'
            },
            centos7: {
                short: 'mysql.service',
                long: 'After=syslog.target network.target gearmand.service mariadb.service'
            }
        };
        
        $scope.$watch('selectedOs', function(){
            $scope.hasSystemd = $scope.selectedOs !== 'trusty';
            
            $scope.mysqlShort = $scope.mysql.ubuntu.short;
            $scope.mysqlLong = $scope.mysql.ubuntu.long;
            if($scope.selectedOs === 'centos7'){
                $scope.mysqlShort = $scope.mysql.centos7.short;
                $scope.mysqlLong = $scope.mysql.centos7.long;
            }
            
        });
    });