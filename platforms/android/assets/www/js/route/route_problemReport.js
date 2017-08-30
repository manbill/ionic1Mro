starter.config(function ($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state('tab.problemReport', {
      url: '/problemReport/index',
      // cache: false,
      views: {
        'tab-order': {
          templateUrl: 'views/problemReport/index.html',
          controller: 'ProblemReportCtrl'
        }
      }
    })
    .state('tab.problemReportDetail', {
      url: '/problemReport/detail',
      //cache: false,
      views: {
        'tab-order': {
          templateUrl: 'views/problemReport/detail.html',
          controller: 'ProblemReportDetailCtrl'
        }
      },
      params: {
        pr: null
      }
    })
    .state('tab.problemReportCreate', {
      url: '/problemReport/create',
      views: {
        'tab-order': {
          templateUrl: 'views/problemReport/create.html',
          controller: 'ProblemReportCreateCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.problemReportFeedBack', {
      url: '/problemReportFeedBack/index',
      // cache: false,
      views: {
        'tab-order': {
          templateUrl: 'views/problemReport/feedBack.html',
          controller: 'ProblemReportFeedBackCtrl'
        }
      },
      params: {
        pr: null
      }
    })
    .state('tab.problemReportTurnTodo', {
      url: '/problemReportTurnTodo/index',
      views: {
        'tab-order': {
          templateUrl: 'views/problemReport/turnTodo.html',
          controller: 'ProblemReportTurnTodoCtrl'
        }
      },
      params: {
        pr: null
      }
    })
    .state('tab.problemReportClose', {
      url: '/problemReportClose/index',
      views: {
        'tab-order': {
          templateUrl: 'views/problemReport/close.html',
          controller: 'ProblemReportCloseCtrl'
        }
      },
      params: {
        pr: null
      }
    });
});
