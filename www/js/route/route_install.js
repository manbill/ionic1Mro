/**
 * Created by jiangwei.wang on 2016/11/16.
 */
starter.config(function ($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state('tab.install',{
      url:'/install/installList',
      views:{
        "tab-order":{
          templateUrl: 'views/install/installList.html',
          controller: 'InstallCtrl'
        }
      }
    })
    .state("tab.installTaskDetail",{
      url:'/install/installTaskDetail',
      views:{
        "tab-order":{
          templateUrl:'views/install/installTaskDetail.html',
          controller:"InstallTaskDetailCtrl"
        }
      },
      params:{
        data:null
      }
    })
  //todo other states


    //暂停列表路由
    .state("tab.installPauseList", {
        url : '/install/installTaskDetail/pauseList',
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
    .state("tab.installVerifyList",{
        url : '/install/installTaskDetail/verifyList',
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
    .state("tab.verifyInstallOrder",{
        url:'/install/installTaskDetail/verifyOrder',
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

    //  技改 详情信息展示
    .state("tab.installDetailShow", {
      url : '/install/installTaskDetail/showDetail',
      views:{
          'tab-order':{
              templateUrl : 'views/install/installTaskDetailShow.html',
              controller : 'installDetailShowCtrl'
          }
      },
      params:{
          data:null
      }
    })


});
