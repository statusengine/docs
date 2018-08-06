angular.module('StatusengineDocs')

    .controller("BrokerController", function ($scope) {
        $scope.selectedOs = 'bionic';
        
        $scope.commands = {
            bionic: {
                dependencies: 'apt-get install gearman-job-server libgearman-dev gearman-tools uuid-dev libjson-c-dev manpages-dev build-essential libglib2.0-dev',
                restartMonitoring: 'systemctl restart naemon'
            },
            xenial: {
                dependencies: 'apt-get install gearman-job-server libgearman-dev gearman-tools uuid-dev libjson-c-dev manpages-dev build-essential libglib2.0-dev',
                restartMonitoring: 'systemctl restart naemon'
            },
            trusty: {
                dependencies: 'apt-get install gearman-job-server libgearman-dev gearman-tools uuid-dev libjson-c-dev manpages-dev build-essential libglib2.0-dev',
                restartMonitoring: 'service naemon restart'
            }
        };
    });