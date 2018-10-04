angular.module('StatusengineDocs')

    .controller("BrokerController", function ($scope) {
        $scope.selectedOs = 'bionic';
        $scope.selectedCore = 'naemon';
        $scope.selectedQueue = 'rabbitmq';

        $scope.commands = {
            bionic: {
                dependencies: 'apt-get install git libglib2.0-dev uuid-dev libicu-dev libjson-c-dev pkg-config libssl-dev',
                restartMonitoring: 'systemctl restart naemon',
                queueDep: {
                    rabbitmq: 'rabbitmq-server librabbitmq-dev',
                    gearman: 'gearman-job-server libgearman-dev',
                    both: 'rabbitmq-server gearman-job-server libgearman-dev librabbitmq-dev'
                }
            },
            xenial: {
                dependencies: 'apt-get install git libglib2.0-dev uuid-dev libicu-dev libjson-c-dev pkg-config libssl-dev',
                restartMonitoring: 'systemctl restart naemon',
                queueDep: {
                    rabbitmq: 'rabbitmq-server librabbitmq-dev',
                    gearman: 'gearman-job-server libgearman-dev',
                    both: 'rabbitmq-server gearman-job-server libgearman-dev librabbitmq-dev'
                }
            },
            trusty: {
                dependencies: 'apt-get install git libglib2.0-dev uuid-dev libicu-dev libjson-c-dev pkg-config libssl-dev',
                restartMonitoring: 'service naemon restart',
                queueDep: {
                    rabbitmq: 'rabbitmq-server librabbitmq-dev',
                    gearman: 'gearman-job-server libgearman-dev',
                    both: 'rabbitmq-server gearman-job-server libgearman-dev librabbitmq-dev'
                }
            },
            centos7: {
                dependencies: 'yum install #TODO',
                restartMonitoring: 'systemctl restart naemon',
                queueDep: {
                    rabbitmq: '#TODO',
                    gearman: '#TODO',
                    both: '#TODO'
                }
            }
        };

        $scope.seConfiguration = {
            naemon: {
                cmake: '-DCMAKE_INSTALL_PREFIX:PATH=/opt/naemon',
                cmakeQueue: {
                    rabbitmq: '-DWITH_GEARMAN=OFF -DWITH_RABBITMQ=ON',
                    gearman: '-DWITH_GEARMAN=ON -DWITH_RABBITMQ=OFF',
                    both: ''
                },
                prefix: '/opt/naemon',
                lib: '/opt/naemon/lib/libstatusengine.so',
                path: '/opt/naemon/etc/statusengine.toml',
                coreConf: '/opt/naemon/etc/naemon/naemon.cfg',
            },
            nagios: {
                cmake: '-DCMAKE_INSTALL_PREFIX:PATH=/opt/nagios -DBUILD_NAGIOS=ON -DNAGIOS_INCLUDE_DIR=/opt/nagios/include',
                prefix: '/opt/nagios',
                lib: '/opt/nagios/lib/libstatusengine.so ',
                path: '/opt/nagios/etc/statusengine.toml',
                coreConf: '/opt/nagios/etc/nagios.cfg',
                cmakeQueue: {
                    rabbitmq: '-DWITH_GEARMAN=OFF -DWITH_RABBITMQ=ON',
                    gearman: '-DWITH_GEARMAN=ON -DWITH_RABBITMQ=OFF',
                    both: ''
                },
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