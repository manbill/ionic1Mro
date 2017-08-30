starter.config(function ($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state('tab.schdleMaintainList', { //任务维护列表
      url: '/maintain/schdleMaintainList',
      // cache:false,
      views: {
        'tab-order': {
          templateUrl: 'views/schdlemaintain/schdleMaintainList.html',
          controller: 'SchdleMaintainListCtrl'
        }
      },
      params:{
        data:null
      }
    })
    .state('tab.assigntask', { //分派任务
      url: '/maintain/assigntask',
      views: {
        'tab-order': {
          templateUrl: 'views/schdlemaintain/assigntask.html',
          controller: 'AssignTaskCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state("tab.pdfDetailView", {//pdf详情页面
    url: '/schdlemaintain/pdfDetailView',
    views: {
      "tab-order": {
        templateUrl: 'views/schdlemaintain/PdfDetailView.html',
        controller: "PdfDetailViewCtrl"
      }
    },
    params: {
      params: null
    }
  })
    .state("tab.scheduledMaintainTaskDetail", {//定期维护任务详情页面
      url: "/schdlemaintain/scheduledMaintainTaskDetail",
      views: {
        "tab-order": {
          templateUrl: "views/schdlemaintain/scheduledMaintainTaskDetail.html",
          controller: "scheduledMaintainTaskDetailCtrl"
        }
      },
      params: {
        data: null
      }
    })
    .state("tab.pdfTreeView", {//pdf目录树
      url: '/schdlemaintain/pdfTreeView',
      views: {
        "tab-order": {
          templateUrl: 'views/schdlemaintain/PdfTreeView.html',
          controller: "PdfTreeViewCtrl"
        }
      },
      params: {
        params: null
      }
    })
    .state("tab.scheduledMaintainTaskStdMaterial", {//用料标准页面
      url: "/schdlemaintain/scheduledMaintainTaskStdMaterial",
      views: {
        "tab-order": {
          templateUrl: "views/schdlemaintain/scheduledMaintainTaskStdMaterial.html",
          controller: "scheduledMaintainTaskStdMaterialCtrl"
        }
      },
      params: {
        data: null
      }
    })
    .state("tab.newInstanceStdMaterial", {//新增用料标准页面
      url: "/schdlemaintain/newInstanceStdMaterial",
      views: {
        "tab-order": {
          templateUrl: "views/schdlemaintain/newInstanceStdMaterial.html",
          controller: "scheduledMaintainTaskNewStdMaterialCtrl"
        }
      },
      params: {
        data: null
      },
        cache: false
    })
    .state("tab.getAllMaterials", {
      url: "/schdlemaintain/getAllMaterials",
      views: {
        "tab-order": {
          templateUrl: "views/schdlemaintain/getAllMaterials.html",
          controller: "scheduledMaintainTaskGetAllMaterialsCtrl"
        }
      },
      params: {
        data: null
      }
    })
    //  查看物料详情 后续新增  所有物料能够查看详情
    .state('tab.materialDetailOfM', {//查看物料详情
        url: '/schdlemaintain/materialDetail',
        views: {
            'tab-order': {
                templateUrl: 'views/workorder/materialDetail.html',
                controller: 'MaterialDetailCtrl'
            }
        },
        params: {
            data: null
        }
    })

    .state('tab.instructor', { //作业指导书
      url: '/schdlemaintain/scheduledMaintainTaskDetail/instructor',
      views: {
        'tab-order': {
          templateUrl: 'views/schdlemaintain/instructor.html',
          controller: 'InstructorCtrl'
        }
      },
      params:{
        data:null
      }
    })

    //暂停列表路由
    .state("tab.schedulePauseList", {
      url : '/schdlemaintain/scheduledMaintainTaskDetail/pauseList',
      views:{
          'tab-order':{
              templateUrl:'views/workorder/faultOrderPauseList.html',
              controller:'FaultWorkOrderPauseListCtrl'
          }
      },
        params:{
          data:null
        }
    })


    //审核列表路由
    .state("tab.scheduleVerifyList",{
      url : '/schdlemaintain/scheduledMaintainTaskDetail/verifyList',
      views : {
        'tab-order':{
            templateUrl:'views/workorder/faultOrderVerifyList.html',
            controller:'FaultWorkOrderVerifyListCtrl'
        }
      },
      params :{
        data : null
        }
    })
    // 定维任务详情展示
    .state("tab.scheduleDetailShow",{
      url : '/schdlemaintain/scheduledMaintainTaskDetail/showDetail',
      views : {
        "tab-order" : {
          templateUrl : 'views/schdlemaintain/scheduledMaintainTaskDetailShow.html',
          controller : 'scheduledMaintainTaskDetailShow'
        }
      },
      params:{
        data : null
      }
    })

    //审核 定维工单的路由
    //   .state("tab.verifyScheduleOrder",{
    //       url:'/schdlemaintain/scheduledMaintainTaskDetail/verifyOrder',
    //       views:{
    //           'tab-order':{
    //               templateUrl : 'views/common/verifyOrder.html',
    //               controller:'VerifyOrder'
    //           }
    //       },
    //       params:{
    //           data : null
    //       }
    //   })


});
