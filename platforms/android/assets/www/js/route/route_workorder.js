starter.config(function ($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state('tab.workList', { //工单列表
      url: '/workorder/workList',
      // cache: false,
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/workList.html',
          controller: 'WorkListCtrl'
        }
      }
    })

    .state('tab.planWorkDetail', { //计划工单详情
      url: '/workorder/planWorkDetail',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/planWorkDetail.html',
          controller: 'PlanWorkDetailCtrl'
        }
      },
      params: {
        title: null,
        taskId: null
      }
    })
    .state('tab.planWorkDetailShow', {//工单详情页面
      url: '/workorder/planWorkDetailShow',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/planWorkDetailShow.html',
          controller: 'PlanWorkDetailShowCtrl'
        }
      },
      params: {
        work: null
      }
    })

    .state('tab.SCADAWorkDetail', { //SCADA工单详情
      url: '/workorder/SCADAWorkDetail',
      // cache: false,
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/SCADAWorkDetail.html',
          controller: 'SCADAWorkDetailCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.currentFaultList', { //SCADA工单当前故障信息
      url: '/workorder/currentFaultList',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/SCADACurrentFaultList.html',
          controller: 'SCADACurrentFaultList'
        }
      },
      params: {
        data: null
      }
    })
      .state('tab.faultAdviceDetail', { //SCADA工单当前故障建议详情
      url: '/workorder/faultAdviceDetail',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/faultAdviceDetail.html',
          controller: 'SCADAFaultAdviceDetailCtrl'
        }
      },
      params: {
        data: null
      }
    })

    .state('tab.manualWorkDetail', { //手工工单详情
      url: '/workorder/manualWorkDetail',
      cache: false,
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/manualWorkDetail.html',
          controller: 'ManualWorkDetailCtrl'
        }
      },
      params: {
        taskId: null,
        title: null
      }
    })
    .state("tab.manualEdit", {//手工工单编辑页面
      url: "/workorder/manualEdit",
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/manualEdit.html',
          controller: "ManualEidtCtrl"
        }
      },
      params: {
        work: null
      }
    })
    .state('tab.checkList', { //点检表
      url: '/workorder/checkList',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/checkList.html',
          controller: 'CheckListCtrl'
        }
      },
      params: {
        data: null
      }
    })

    .state('tab.checkDetail', { //点检表详情
      url: '/workorder/checkDetail',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/checkDetail.html',
          controller: 'checkDetailCtrl'
        }
      },
      params: {
        data: null
      }
    })

    .state('tab.checkDetailItem', { //点检表详情项
      url: '/workorder/checkDetailItem',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/checkDetailItem.html',
          controller: 'checkDetailItemCtrl'
        }
      },
      params: {
        data: null
      }
    })

    .state('tab.checkMaterial', { //所需物料
      url: '/workorder/checkMaterial/:taskId',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/checkMaterial.html',
          controller: 'CheckMaterialCtrl'
        }
      }
    })

    .state('tab.empTimeSheetList', { //人员报工
      url: '/workorder/empTimeSheet/list',
      cache: false,
      views: {
        'tab-order': {
          templateUrl: 'views/workHours/index.html',
          controller: 'WorkHoursCtrl'
        }
      },
      params:{
        data:null
      }
    })

    .state('tab.recordRepairList', { //维修记录列表
      url: '/workorder/recordRepairList',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/recordRepairList.html',
          controller: 'RecordRepairCtrl'
        }
      },
      params: {
        work: null
      }
    })
.state('tab.createRecordRepair', { //维修记录
      url: '/workorder/createRecordRepair',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/createRecordRepair.html',
          controller: 'CreateRecordRepairCtrl'
        }
      },
      params: {
        data: null
      }
    })

    .state('tab.deviceSelect', { //设备选择
      url: '/workorder/deviceSelect/:taskId',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/deviceSelect.html',
          controller: 'DeviceSelectCtrl'
        }
      }
    })

    .state('tab.recordRepairEdit', { //编辑维修记录
      url: '/workorder/recordRepairEdit',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/recordRepairEdit.html',
          controller: 'RecordRepairEditCtrl'
        }
      },
      params: {
        recordRepair: null,
        work: null,
        recordRepairList: null,
        recordRepairIndex:null
      }
    })

    .state('tab.SCADAEdit', { //描述信息编辑
      url: '/workorder/SCADAEdit',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/SCADAEdit.html',
          controller: 'SCADAEditCtrl'
        }
      },
      params: {data: null}
    })
    .state('tab.empInfoList', {
      url: '/workorder/empInfoList',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/empInfoList.html',
          controller: 'EmpInfoListCtrl'
        }
      }
    })
    .state('tab.empTimeSheetEdit', { //增加人员报工
      url: '/workorder/empTimeSheet/edit/:taskId',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/empTimeSheetEdit.html',
          controller: 'EmpTimeSheetEditCtrl'
        }
      },
      params: {
        emp: null,//编辑报工
        newEmp: null//新建报工
        //timeSheetId: null,
        //objectName: null,
        //beginTime: null,
        //endTime: null,
        //description: null,
        //cacheId: null,
        //orderId: null,
        //type: null

      }
    })
    .state('tab.checkListImage', { //点检表图片
      url: '/workorder/checkListImage/:taskId',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/checkListImage.html',
          controller: 'CheckListImageCtrl'
        }
      }
    })

    .state('tab.pendingList', { //待办事项列表
      url: '/pengingList',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/pendingList.html',
          controller: 'PendingListCtrl'
        }
      }
    })

    .state('tab.historyFaultList', { //历史故障信息
      url: '/workorder/historyFaultList',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/historyFaultList.html',
          controller: 'HistoryFaultListCtrl'
        }
      },
      params: {
        workorderFaultCode: null
      }
    })

    .state('tab.historyFaultDetail', { //历史故障详情
      url: '/workorder/historyFaultDetail',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/historyFaultDetail.html',
          controller: 'HistoryFaultDetailCtrl'
        }
      },
      params: {workOrderInfo: null}
    })

    .state('tab.materialRequest', { //计划工单-物料请求
      url: '/workorder/materialRequest/:taskId',
      cache: false,
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/materialRequest.html',
          controller: 'MaterialRequestCtrl'
        }
      }
    })

    .state('tab.materialRequestEdit', { //SCADA工单-编辑物料请求
      url: '/workorder/materialRequestEdit',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/materialRequestEdit.html',
          controller: 'MaterialRequestEditCtrl'
        }
      },
      params: {
        materielRqstId: null,
        materielNo: null,
        materielName: null,
        unit: null,
        unitId: null,
        count: null,
        status: null,
        orderId: null
      }
    })

    .state('tab.planMaterialSelect', { //SCADA工单-选择物料
      url: '/workorder/planMaterialSelect/:materielRqstId',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/planMaterialSelect.html',
          controller: 'planMaterialSelectCtrl'
        }
      },
      params: {
        entity: null,
        pro: null
      }
    })

    .state('tab.OrderArrivalDetail', { //计划工单-到货验收详情
      url: '/workorder/orderArrivalDetail',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/orderArrivalDetail.html',
          controller: 'OrderArrivalDetailCtrl'
        }
      },
      params: {
        taskId: null,
        title: null
      }
    })

    .state('tab.ReviceOrderInfos', { //计划工单-收货信息
      url: '/workorder/reviceOrderInfos/:taskId',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/reviceOrderInfos.html',
          controller: 'ReviceOrderInfosCtrl as vm'
        }
      }
    })

    .state('tab.ReviceOrderInfosEdit', { //计划工单-编辑收货信息
      url: '/workorder/reviceOrderInfosEdit/:materielRqstId',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/reviceOrderInfosEdit.html',
          controller: 'ReviceOrderInfosEditCtrl'
        }
      },
      params: {
        orderId: null,
        orderReviceInfo: null,
        bigMachinePartsData: null
      }
    })

    .state('tab.deviceDetail', { //计划工单-编辑收货信息
      url: '/workorder/detailDetail/:deviceId',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/deviceDetail.html',
          controller: 'DeviceDetailCtrl'
        }
      },
      params: {
        device: null
      }
    })
    .state('tab.pdfDetail', { //计划工单-pdf详情
      url: '/workorder/pdfDetail',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/pdfDetail.html',
          controller: 'PdfDetailCtrl'
        }
      },
      params: {
        url: null,
        title: null
      }
    })
    .state('tab.faultOrderCreate', {
      url: '/workorder/faultOrderCreate',
      // cache:false,
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/faultOrderCreate.html',
          controller: 'FaultOrderCreateCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.consumeMaterielAdd', {//维修记录新增物料
      url: '/workorder/consumeMaterielAdd',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/consumeMaterielAdd.html',
          controller: 'ConsumeMaterielAddCtrl'
        }
      },
      params: {
        data : null
      }
    })
    .state('tab.changeEquipmentDetail', {//维修记录查看更换设备详情
      url: '/changeEquipmentDetail',
      views: {
        'tab-order': {
          templateUrl: 'views/workorder/changeEquipmentDetail.html',
          controller: 'ChangeEquipmentDetailCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.materialDetail', {//查看物料详情
      url: '/workorder/materialDetail',
      cache:false,
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

    //故障工单 暂停记录路由
    .state('tab.faultOrderPauseList',{
      url : '/workorder/SCADAWorkDetail/faultOrderPauseList',
        views:{
          'tab-order':{
            templateUrl:'views/workorder/faultOrderPauseList.html',
              controller:'FaultWorkOrderPauseListCtrl'
          }
        },
        params : {
            data : null
        }
    })
    //故障工单 审核记录路由
    .state('tab.faultOrderVerifyList',{
        url : '/workorder/SCADAWorkDetail/faultOrderVerifyList',
        views:{
            'tab-order':{
                templateUrl:'views/workorder/faultOrderVerifyList.html',
                controller:'FaultWorkOrderVerifyListCtrl'
            }
        },
        params : {
          data : null
        }
    })
    //故障工单详情/修改路由
      .state('tab.faultOrderDetailShowNModify', {
        url : '/workorder/SCADAWorkDetail/faultOrderDetailShowNModify',
          views : {
            'tab-order':{
              templateUrl : 'views/workorder/faultOrderDetailShowNModify.html',
              controller: 'FaultOrderDetailShowNModifyCtrl'
            }
          },
          params:{
            data : null
          }
      })

      //审核工单的路由
      .state("tab.verifyOrder",{
        url:'/workorder/SCADAWorkDetail/verifyOrder',
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

})
;
