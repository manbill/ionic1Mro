/**
 * Created by kingman_li on 11/15/16.
 */
starter
  .config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state("tab.reform", {
        url: '/reform/index',
        views: {
          'tab-order': {
            templateUrl: 'views/reform/reformPage.html',
            controller: 'ReformCtrl'
          }
        }
      })
      .state("tab.reformTaskDetail", {
      url: "/reform/reformTaskDetail",
      views: {
        "tab-order": {
          templateUrl: "views/reform/reformTaskDetail.html",
          controller: "reformTaskDetailCtrl"
        }
      },
      params: {
        data: null
      }
    })
      //暂停列表路由
        .state("tab.reformPauseList", {
            url : '/reform/reformTaskDetail/pauseList',
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
        .state("tab.reformVerifyList",{
            url : '/reform/reformTaskDetail/verifyList',
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

        //审核 安装工单的路由
        .state("tab.verifyReformOrder",{
            url:'/reform/reformTaskDetail/verifyOrder',
            views:{
                'tab-order':{
                    templateUrl : 'views/common/verifyOrder.html',
                    controller:'VerifyOrder'
                }
            },
            params:{
                data : null
            }
        })
        //技改详情展示 路由
        .state("tab.reformTaskDetailShow", {
            url : '/reform/reformTaskDetail/reformShow',
            views : {
                'tab-order' : {
                    templateUrl : 'views/reform/reformTaskDetailShow.html',
                    controller : 'reformTaskDetailShowCtrl'
                }
            },
            params : {
                data : null
            }
        })

        // 技改 设备维修 维修记录界面
        .state("tab.reformRepairRecords", {
            url:'/reform/reformTaskDetail/reformRepairRecords',
            views :{
                'tab-order' : {
                    templateUrl : 'views/reform/reformRepairRecords.html',
                    controller : 'reformRepairRecordsCtrl'
                }
            },
            params : {
                data : null
            }

        })

        .state('tab.createReformRepair', { //创建一条维修记录
            url: '/reform/reformTaskDetail/createReformRepair',
            views: {
                'tab-order': {
                    templateUrl: 'views/reform/reformRepairCreate.html',
                    controller: 'CreateReformRepairCtrl'
                }
            },
            params: {
                data: null
            }
        })

        .state('tab.reformRecordRepairEdit', { //编辑维修记录
            url: '/reform/reformTaskDetail/recordRepairEdit',
            views: {
                'tab-order': {
                    templateUrl: 'views/reform/reformRepairDetail.html',
                    controller: 'ReformRepairRecordDetailEdit'
                }
            },
            params: {
                data:null
            }
        })
        .state('tab.reformRecordRepairEditAddMaterial',{//技改 新增物料路由
            url: '/reform/reformTaskDetail/recordRepairEdit/AddMaterial',
            views: {
                'tab-order': {
                    templateUrl: 'views/workorder/consumeMaterielAdd.html',
                    controller: 'ConsumeMaterielAddCtrl'
                }
            },
            params: {
                data:null
            }
        })

  });
