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
                dependencies: 'apt-get install git php5-cli php5-zip php5-redis redis-server php5-mysql php5-gearman',
                stopStatusengineWorker: 'service statusengine stop',
                startStatusengineWorker: 'service statusengine start'
            }
        };
        
        $scope.$watch('selectedOs', function(){
            $scope.hasSystemd = $scope.selectedOs !== 'trusty';
        });
    });