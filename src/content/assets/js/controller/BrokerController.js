angular.module('StatusengineDocs')

    .controller("BrokerController", function ($scope) {
        $scope.selectedOs = 'focal';
        $scope.selectedCore = 'naemon';
        $scope.selectedQueue = 'gearman'; // rabbitmq

        $scope.commands = {
            focal: {
                dependencies: 'apt-get install git python3-pip gcc g++ cmake build-essential libglib2.0-dev libgearman-dev uuid-dev libuchardet-dev libjson-c-dev pkg-config libssl-dev librabbitmq-dev',
                pip: 'pip3 install meson ninja',
                restartMonitoring: 'systemctl restart naemon',
                queueDep: {
                    rabbitmq: 'rabbitmq-server',
                    gearman: 'gearman-job-server'
                }
            },
            bionic: {
                dependencies: 'apt-get install git python3-pip gcc g++ cmake build-essential libglib2.0-dev libgearman-dev uuid-dev libuchardet-dev libjson-c-dev pkg-config libssl-dev librabbitmq-dev',
                pip: 'pip3 install meson ninja',
                restartMonitoring: 'systemctl restart naemon',
                queueDep: {
                    rabbitmq: 'rabbitmq-server',
                    gearman: 'gearman-job-server'
                }
            },
            centos8: {
                dependencies: 'yum install git python-pip gcc gcc-c++ cmake3 pkgconfig librabbitmq-devel libgearman-devel libuchardet-devel json-c-devel openssl-devel glib2-devel',
                pip: 'pip install meson ninja',
                restartMonitoring: 'systemctl restart naemon',
                queueDep: {
                    rabbitmq: 'rabbitmq-server',
                    gearman: 'gearman-job-server'
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