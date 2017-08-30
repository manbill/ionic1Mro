starter.config(function ($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state('tab.workHours', {//工时填报
      url: '/workHours/index',
      views: {
        'tab-order': {
          templateUrl: 'views/workHours/index.html',
          controller: 'WorkHoursCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.workHoursDetail', {
      url: '/workHours/detail',
      views: {
        'tab-order': {
          templateUrl: 'views/workHours/detail.html',
          controller: 'WorkHoursDetailCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.workHoursUsingWorkOrder', {
      url: '/workHours/UsingWorkOrder',
      views: {
        'tab-order': {
          templateUrl: 'views/workHours/createUsingWorkOrder.html',
          controller: 'WorkHoursCreateUsingWorkOrderCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.workHoursWithoutWorkOrder', {
      url: '/workHours/workHoursCreateWithoutWorkOrder',
      views: {
        'tab-order': {
          templateUrl: 'views/workHours/workHoursCreateWithoutWorkOrder.html',
          controller: 'CreateWorkHoursWithoutWorkOrder'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.workerSelect', {
      url: '/workerSelect/index',
      views: {
        'tab-order': {
          templateUrl: 'views/workHours/workerSelect.html',
          controller: 'WorkerSelectCtrl'
        }
      },
      params:{
        data:null
      }
    })
    .state('tab.workOrderSelect', {
      url: '/workOrderSelect/index',
      views: {
        'tab-order': {
          templateUrl: 'views/workHours/workOrderSelect.html',
          controller: 'WorkOrderSelectWorkHoursCtrl'
        }
      },
      params:{
        data:null
      }
    });
});
