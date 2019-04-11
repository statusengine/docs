angular.module('StatusengineDocs')

    .controller("BrokerController", function ($scope) {
        $scope.selectedOs = 'bionic';
        $scope.selectedCore = 'naemon';
        $scope.selectedQueue = 'rabbitmq';

        $scope.commands = {
            bionic: {
                dependencies: 'apt-get install libglib2.0-0 libuuid1 libicu60 libjson-c3 libssl1.1 librabbitmq4 libgearman8',
                restartMonitoring: 'systemctl restart naemon',
                queueDep: {
                    rabbitmq: 'rabbitmq-server',
                    gearman: 'gearman-job-server'
                }
            },
            xenial: {
                dependencies: 'apt-get install libglib2.0-0 libuuid1 libicu55 libjson-c2 libssl1.0.0 librabbitmq4 libgearman7',
                restartMonitoring: 'systemctl restart naemon',
                queueDep: {
                    rabbitmq: 'rabbitmq-server',
                    gearman: 'gearman-job-server'
                }
            },
            trusty: {
                dependencies: 'apt-get install libglib2.0-0 libuuid1 libicu52 libjson-c2 libssl1.0.0 librabbitmq1 libgearman7',
                restartMonitoring: 'service naemon restart',
                queueDep: {
                    rabbitmq: 'rabbitmq-server',
                    gearman: 'gearman-job-server'
                }
            },
            centos7: {
                dependencies: 'yum install #TODO',
                restartMonitoring: 'systemctl restart naemon',
                queueDep: {
                    rabbitmq: '#TODO',
                    gearman: '#TODO',
                }
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