angular.module('StatusengineDocs', [])

    //Twig template engine workaround https://twig.symfony.com/
    //https://docs.angularjs.org/api/ng/provider/$interpolateProvider
    .config(function($interpolateProvider) {
        $interpolateProvider.startSymbol('{[{');
        $interpolateProvider.endSymbol('}]}');
      })
;
