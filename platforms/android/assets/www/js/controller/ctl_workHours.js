starter
//人员报工首页
  .controller('WorkHoursCtrl', function (Store, $rootScope, DataCache, $filter, $scope, Popup, $stateParams,
                                         WorkHoursService, $ionicListDelegate, $state, eamSync, WorkHoursApi, $timeout, modifiedJson, $ionicModal,
                                         OtherApi, Storage, $ionicScrollDelegate, eamFaultWorkOrderFactory, eamMTInstallWorkOrderFactory, InstallService) {
    $scope.projectList = Storage.getProjects();
    $scope.params = {project: Storage.getSelectedProject()};
    $scope.detailFaultOrder = $stateParams.data;
    if (isDebug) {
      console.log($scope.detailFaultOrder);
      console.log($rootScope.auth);
    }
    $scope.currentUserId = Storage.getProfile().id;
    $scope.title = '工时填报';
    $scope.isNotWorkHoursReportEntry = false;//是否是工时填报直接跳转，默认是
    if ($scope.detailFaultOrder) {//工单跳转过来的
      $scope.isNotWorkHoursReportEntry = true;
      $scope.work = $scope.detailFaultOrder;
      $scope.title = '人员报工';
      $scope.params.project = {
        projectId: +$scope.work.apiWorkorderBaseInfoDto.projectId,
        projectName: $scope.work.apiWorkorderBaseInfoDto.projectName
      };
      //$scope.params.workOrderNo = $scope.work.apiWorkorderBaseInfoDto.workorderCode;//工单编号
      $scope.params.workOrderId = $scope.work.apiWorkorderBaseInfoDto.workorderId;//工单id
      $scope.params.workType = 213;//指定为工单报工
    }
    //根据报工跳转来源判断是否能添加报工
    $scope.isCanAddNewReport = function () {
      //如果是从计划工单的人员报工模块跳转过来的
      if ($scope.isNotWorkHoursReportEntry) {
        //故障工单 界面 来的
        if ($scope.detailFaultOrder.apiWorkorderBaseInfoDto.workorderStatus == 41) {
          //如果 有新增报工的权限返回true 否则返回 false
          return $rootScope.auth['auth_500101'];
        } else if ($scope.detailFaultOrder.apiWorkorderBaseInfoDto.workorderStatus == 141) {
          //计划工单 界面 来的  有新增权限且 当前登陆人 是 当前工单的作业人 才返回true ，能新建报工
          return ($scope.detailFaultOrder.apiWorkorderBaseInfoDto.assignPerson == $scope.currentUserId) && $rootScope.auth['auth_500101'];
        } else {
          return false;
        }
      } else {//如果是从主页面进入人员报工界面
        // console.log($rootScope.auth['auth_500101']);
        return $rootScope.auth['auth_500101'];
      }
    };
    // $scope.$on("$ionicView.beforeEnter",function () {
    //   $scope.query();
    // });
    // $rootScope.$on(SAVE_WORK_TOTAL_HOUR_EVENT, function (event, args) {//计算 累计作业时间，pc端已经做了，手机端不展示，所以不用计算
    //   event.stopPropagation();
    //   event.preventDefault();
    //   console.log(event, args);
    //   var detailFaultOrder = args.workOrder;
    //   if (detailFaultOrder) {
    //     var startSaveHours = new Date;
    //     if (args.isFaultWorkOrder) {//如果是故障工单
    //       eamFaultWorkOrderFactory.saveFaultOrder(detailFaultOrder, function () {
    //         // $rootScope.$emit(SAVE_WORK_TOTAL_HOUR_EVENT_COMPLETE);
    //         if (isDebug) {
    //           console.log("保存工单 " + detailFaultOrder.apiWorkorderBaseInfoDto.workorderCode + " 累计作业时间耗时：" + (new Date - startSaveHours) + " ms");
    //         }
    //       })
    //     } else if ("39,67,68".indexOf(detailFaultOrder.apiWorkorderBaseInfoDto.workorderType) >= 0) {//定维技改安装调试
    //       eamMTInstallWorkOrderFactory.saveWorkOrder(detailFaultOrder, function () {
    //         // $rootScope.$emit(SAVE_WORK_TOTAL_HOUR_EVENT_COMPLETE);
    //         if (isDebug) {
    //           console.log("保存工单 " + detailFaultOrder.apiWorkorderBaseInfoDto.workorderCode + " 累计作业时间耗时：" + (new Date - startSaveHours) + " ms");
    //         }
    //       })
    //     }
    //   }
    // });
    $scope.hasMoreData = false;
    $scope.workHoursList = [];
    WorkHoursService.getDicId2NameByDictionaryId(51, function (ids2Names) {//51是工时报工对应的作业类型
      $scope.workAnchors = ids2Names;
    });
    $scope.params.pageNumber = 1;
    $scope.loadMoreWork = function () {
      // 点击查询工单进来后的方法
      WorkHoursService.loadMore($scope.params, function (resp) {
        console.log("resp ", resp);
        //追加结果
        if (resp.rows.length == 0) {
          $scope.hasMoreData = false;
          $scope.$broadcast(SCROLL_INFINITE_COMPLETE);
        } else {
          $scope.params.pageNumber++;
          $scope.hasMoreData = true;
          $scope.$broadcast(SCROLL_INFINITE_COMPLETE);
          var l = WorkHoursService.ChangeSQLResult2Array(resp);
          l.forEach(function (item) {
            item.json = JSON.parse(item.json);
            // console.log(item)
          });
          $scope.workHoursList = $scope.workHoursList.concat(l);
        }
      });
    };
    // $scope.loadMoreWork();
    /*$scope.$on('$ionicView.beforeEnter', function () {

     });*/
    //初始化过滤器
    $ionicModal.fromTemplateUrl("views/workHours/searchFilter.html", {
      scope: $scope,
      animation: "slide-in-up"
    }).then(function (modal) {
      $scope.filterModal = modal;
    }, function (err) {
    });

    $scope.openFilter = function () {
      $scope.filterModal.show();
    };

    $scope.backButtonAction = function () {
      $scope.filterModal.hide();
    };

    $scope.query = function () {
      Popup.hideLoading();
      if ($scope.filterModal) {
        $scope.filterModal.hide();
      }
      $scope.params.pageNumber = 1;
      // $scope.hasMoreData = false;
      $scope.params.startDate = DateUtil.searchStartDate($scope.params.startDate);
      $scope.params.endDate = DateUtil.searchEndDate($scope.params.endDate);
      $scope.workHoursList = [];
      $scope.loadMoreWork();
      Popup.delayRun(function () {//200ms滚动到顶部
        $ionicScrollDelegate.scrollTop();
      }, null, 200);
    };

    $scope.detail = function (wh) {
      // data.workOrderId = $scope.taskId;
      //   console.log(wh);
      //如果json是字符串，转换为对象 再传递 json对象
      // wh.json = JSON.stringify(wh.json);//angular.fromJson(wh.json);
      console.log("before go" + JSON.stringify(wh, null, 2));
      // $state.go("tab.workHoursDetail", {
      //     data: {
      //         wh : wh ,
      //         workOrder : $scope.detailFaultOrder ? $scope.detailFaultOrder : null  ,
      //         isConfirm : $scope.isNotWorkHoursReportEntry ? $scope.isNotWorkHoursReportEntry : null
      //     }
      // });
      // console.log("detail fault order",JSON.stringify($scope.detailFaultOrder, undefined, 2));

      if ($scope.detailFaultOrder) {//由工单跳转去修改工时填报
        $state.go("tab.workHoursDetail", {
          data: {
            wh: wh,
            workOrder: $scope.detailFaultOrder
          }
        });
      } else {
        $state.go("tab.workHoursDetail", {//工时填报列表进来
          data: {
            wh: wh,
            isConfirm: $scope.isNotWorkHoursReportEntry
          }
        });
      }
    };
    $scope.doRefreshWorkHoursData = function () {
      Popup.waitLoad();
      $scope.params = {};
      if ($scope.detailFaultOrder) {//工单跳转过来的
        $scope.work = $scope.detailFaultOrder;
        $scope.params.project = {
          projectId: $scope.work.apiWorkorderBaseInfoDto.projectId,
          projectName: $scope.work.apiWorkorderBaseInfoDto.projectName
        };
        $scope.params.workOrderNo = $scope.work.apiWorkorderBaseInfoDto.workorderCode;//工单编号
        $scope.params.workOrderId = $scope.work.apiWorkorderBaseInfoDto.workorderId;//工单id
        $scope.params.workType = 213;//指定为工单报工
      }
      $scope.params.pageNumber = 1;

      $scope.$broadcast(SCROLL_REFRESH_COMPLETE);
      // $scope.query();

      InstallService.uploadIfOnline(function () {
        eamSync.sync(['eamFaultWorkOrderFactory.uploadFaultOrders', 'eamFaultWorkOrderFactory.downloadFaultOrders',
          'eamMTInstallWorkOrderFactory.uploadWorkOrders', 'eamMTInstallWorkOrderFactory.downLoadWorkOrders',
          'SyncWorkHours.uploadList', 'SyncWorkHours.downloadList'], function (res) {
          Popup.hideLoading();
          console.log(res);
          $scope.query();
          if (res) {
            Popup.loadMsg('同步数据成功', 500);
          } else {
            Popup.loadMsg('同步数据失败', 500);
          }

          $scope.$broadcast(SCROLL_REFRESH_COMPLETE);
        });
      }, function () {
        $scope.$broadcast(SCROLL_REFRESH_COMPLETE);
        $scope.query();
      });
    };
    $scope.formatDate = function (strTime, format) {
      var date = new Date(parseFloat(strTime));
      var paddNum = function (num) {
        num += "";
        return num.replace(/^(\d)$/, "0$1");
      };
      //指定格式字符
      var cfg = {
        yyyy: date.getFullYear() //年 : 4位
        , yy: date.getFullYear().toString().substring(2)//年 : 2位
        , M: date.getMonth() + 1  //月 : 如果1位的时候不补0
        , MM: paddNum(date.getMonth() + 1) //月 : 如果1位的时候补0
        , d: date.getDate()   //日 : 如果1位的时候不补0
        , dd: paddNum(date.getDate())//日 : 如果1位的时候补0
        , hh: date.getHours()  //时
        , mm: date.getMinutes() //分
        , ss: date.getSeconds() //秒
      };
      format || (format = "yyyy-MM-dd hh:mm:ss");
      return format.replace(/([a-z])(\1)*/ig, function (m) {
        return cfg[m];
      });
    };
    $scope.createWorkHours = function () {//创建人员报工，直接
      if (!$scope.detailFaultOrder) {
        $state.go("tab.workHoursWithoutWorkOrder", {
          data: {
            workHoursList: $scope.workHoursList
          }
        });
      } else {
        $state.go("tab.workHoursUsingWorkOrder", {
          data: {
            detailFaultOrder: $scope.detailFaultOrder,
            workHoursList: $scope.workHoursList
          }
        });
      }
    };
    $scope.deleteWorkHoursRecord = function (work, index) {
      if (isDebug) {
        console.log("删除的报工对象", work);
      }
      Popup.confirm("确认删除该工单吗？", function () {
        //删除工单
        WorkHoursService.deleteWorkHoursRecord(work, function (res) {
          // if ($scope.detailFaultOrder) {//人员报工跳转进来
          //   var workTotalHour = $scope.detailFaultOrder.workorderDetails.eaWoWorkorderinfoDto.workTotalHour;
          //   workTotalHour = workTotalHour ? +workTotalHour : 0;
          //   $scope.detailFaultOrder.workorderDetails.eaWoWorkorderinfoDto.workTotalHour = workTotalHour > work.workedTotalHours ? (workTotalHour - (+work.workedTotalHours)) : 0;
          //   // $rootScope.$emit(SAVE_WORK_TOTAL_HOUR_EVENT, {
          //   //   workOrder: $scope.detailFaultOrder,
          //   //   isFaultWorkOrder: "38" == $scope.detailFaultOrder.apiWorkorderBaseInfoDto.workorderType
          //   // });
          // } else {//非人员报工跳转
          //   if (work.workType == 213) {//如果删除的是工单报工，累计作业时间需要递减
          //     var id = work.workOrderId;
          //     var isFaultOrder = work.workOrderNo ? work.workOrderNo.indexOf("GZ") >= 0 || id < 0 : false;//只有故障工单能够离线创建
          //     if (isFaultOrder) {
          //       eamFaultWorkOrderFactory.getFaultOrderOnSyncSuccess(id, function (order) {
          //         if (!order) {
          //           return;
          //         }
          //         var detailJson = angular.fromJson(order.json);
          //         var workTotalHour = detailJson.workorderDetails.eaWoWorkorderinfoDto.workTotalHour;
          //         workTotalHour = workTotalHour ? +workTotalHour : 0;
          //         detailJson.workorderDetails.eaWoWorkorderinfoDto.workTotalHour = workTotalHour > work.workedTotalHours ? (workTotalHour - (+work.workedTotalHours)) : 0;
          //         // $rootScope.$emit(SAVE_WORK_TOTAL_HOUR_EVENT, {
          //         //   workOrder: detailJson,
          //         //   isFaultWorkOrder: true
          //         // });
          //       })
          //     } else {
          //       eamMTInstallWorkOrderFactory.orderOnSyncSuccess(id, function (order) {
          //         if (!order) {
          //           return;
          //         }
          //         var detailJson = angular.fromJson(order.json);
          //         var workTotalHour = detailJson.workorderDetails.eaWoWorkorderinfoDto.workTotalHour;
          //         workTotalHour = workTotalHour ? +workTotalHour : 0;
          //         detailJson.workorderDetails.eaWoWorkorderinfoDto.workTotalHour = workTotalHour > work.workedTotalHours ? (workTotalHour - (+work.workedTotalHours)) : 0;
          //         // $rootScope.$emit(SAVE_WORK_TOTAL_HOUR_EVENT, {
          //         //   workOrder: detailJson,
          //         //   isFaultWorkOrder: false
          //         // });
          //       })
          //     }
          //   }
          // }
          $scope.workHoursList.splice(index, 1);
          Popup.loadMsg("删除成功", 500);
          $ionicListDelegate.closeOptionButtons();
        });
      });
    };
    // $rootScope.$on(REFRESH_WORK_HOURS_LIST_EVENT,function(event){
    //   event.stopPropagation();
    //   event.preventDefault();
    //   $scope.doRefreshWorkHoursData();
    // });
    $scope.doRefreshWorkHoursData();
  })
  //人员报工创建
  .controller('WorkHoursCreateUsingWorkOrderCtrl', function (Store, DataCache, $filter, $scope, Popup, $stateParams, modifiedJson,
                                                             WorkHoursService, $ionicHistory, $state, WorkHoursApi, $timeout, $rootScope, $ionicModal, OtherApi, Storage, Params) {
    console.log("$stateParams.data: ", $stateParams.data);
    $scope.detailFaultOrder = $stateParams.data['detailFaultOrder'];
    $scope.workHoursList = $stateParams.data["workHoursList"];//某个工单下面的人员报工列表
    $scope.wh = {
      activeFlag: 0,
      endDate: null,
      id: null,
      isVendor: 1,
      projectId: $scope.detailFaultOrder.apiWorkorderBaseInfoDto.projectId,
      project: $scope.detailFaultOrder.apiWorkorderBaseInfoDto.projectName,
      startDate: null,
      workContent: null,
      workTime: null,
      workerId: null,
      workerName: null,
      workorderCode: $scope.detailFaultOrder.apiWorkorderBaseInfoDto.workorderCode,
      workorderId: $scope.detailFaultOrder.apiWorkorderBaseInfoDto.workorderId,
      worktypeId: 213,
      worktypeName: "工单报工"
    };
    $scope.title = "新增人员报工";
    $scope.webParams = {
      startDate: null,
      endDate: null,
      confirm: true
    };
    $scope.isVendorFlag = function () {
      console.log("isVendor confirm", $scope.webParams.confirm);
      if (!$scope.webParams.confirm) {
        $scope.wh.worker = "";
      }
    };
    WorkHoursService.getDicId2NameByDictionaryId(51, function (ids2Names) {//51是工时报工对应的作业类型
      $scope.workAnchors = ids2Names;
    });
    $scope.workerSelect = function () {//选择作业人
      $state.go("tab.workerSelect", {
        data: {
          wh: $scope.wh
        }
      });
    };
    $scope.calculateStopTime = function (end, start) { //计算累计停机时间,<.5是0.5,>0.5&&<1是1
      $scope.webParams.startDate = start;
      $scope.webParams.endDate = end;
      if ($scope.webParams.startDate && $scope.webParams.endDate) {
        var endTime = $scope.webParams.endDate.getTime();
        var startTime = $scope.webParams.startDate.getTime();
        if (endTime >= startTime) {
          var delta = (endTime - startTime) / 1000; //秒
          if (delta % 3600 == 0) { //正好是整小时数
            $scope.webParams.workedTotalHours = delta / 3600;
          } else { //含有小数
            $scope.webParams.workedTotalHours = delta / 3600.0; //小时
            $scope.webParams.workedTotalHours = $scope.webParams.workedTotalHours.toFixed(2);
            var str = $scope.webParams.workedTotalHours + "";
            var str2 = str.substr(str.indexOf("."), 2); //小数部分
            str = str.substr(0, str.indexOf(".")); //整数部分
            //console.log("str2:bef: " + str2);
            str2 = str2 < 0.5 ? 0.5 : 1;
            //console.log("str2:aft: " + str2);
            $scope.webParams.workedTotalHours = parseInt(str) + parseFloat(str2);
          }
        }
      } else {
        $scope.webParams.workedTotalHours = 0;
      }
    };

    $scope.$on('$ionicView.beforeEnter', function () {
      if (Params.getTransferredObjByKey("selectedWorker")) {//选中的作业人员
        var selectedWorker = Params.getTransferredObjByKey('selectedWorker');
        $scope.wh.workerId = selectedWorker.id ? selectedWorker.id : "";
        $scope.wh.workerName = selectedWorker.name ? selectedWorker.name : "";
        Params.clearTransferredObjByKey('selectedWorker');
      }
    });
    $scope.selectedIdName = {};
    $scope.$watch('webParams.startDate', function (newVal, oldVal) {
      if ($scope.webParams.startDate && !angular.equals(newVal, oldVal)) {
        var date = new Date();
        if (!(date.getFullYear() == $scope.webParams.startDate.getFullYear() && $scope.webParams.startDate.getMonth() == date.getMonth())) {
          Popup.loadMsg('请设置本月的日期', 500);
        }
      }
    });
    $scope.saveWorkHours = function () {
      if (!$scope.wh.workerName) {
        Popup.delayRun(function () {
        }, "作业人必填");
        return;
      }
      if (!$scope.webParams.startDate) {
        Popup.delayRun(function () {
        }, "开始时间必填");
        return;
      }
      $scope.wh.startDate = $scope.webParams.startDate;
      var date = new Date();
      if (!(date.getFullYear() == $scope.wh.startDate.getFullYear() && $scope.wh.startDate.getMonth() == date.getMonth())) {
        Popup.loadMsg('开始时间必需是本月的日期', 500);
        return;
      }
      $scope.wh.endDate = $scope.webParams.endDate;
      if (!$scope.wh.endDate) {
        Popup.delayRun(function () {
        }, "结束时间必填");
        return;
      }
      if ($scope.wh.endDate.getTime() <= $scope.wh.startDate.getTime()) {
        Popup.delayRun(function () {
        }, "结束时间必须大于开始时间");
        return;
      }
      if (!($scope.wh.endDate.getFullYear() == $scope.wh.startDate.getFullYear() && $scope.wh.endDate.getMonth() == $scope.wh.startDate.getMonth() && $scope.wh.endDate.getDay() == $scope.wh.startDate.getDay())) {
        Popup.delayRun(function () {
        }, "开始时间和结束时间必须同一天");
        return;
      }
      $scope.calculateStopTime($scope.wh.endDate, $scope.wh.startDate);
      $scope.wh.workTime = $scope.webParams.workedTotalHours;
      if (!StringUtils.isNotEmpty($scope.wh.workContent)) {
        Popup.delayRun(function () {
        }, "作业内容必填");
        return;
      }
      $scope.wh.isVendor = $scope.webParams.confirm ? 1 : 0;
      console.log($scope.wh);
      WorkHoursService.createTemId($scope.wh);

      WorkHoursService.updateOrInsert($scope.wh)
        .then(function () {
          Popup.loadMsg("创建成功", 500);
          var project = null;
          Storage.getProjects().forEach(function (item) {
            if (item.projectId == $scope.wh.projectId) {
              project = item;
            }
          });
          if ($scope.workHoursList) {
            var temWh = {
              activeFlag: $scope.wh.activeFlag,
              content: $scope.wh.workContent,
              endDate: $scope.wh.endDate,
              startDate: $scope.wh.startDate,
              id: $scope.wh.id,
              isVendor: $scope.wh.isVendor,
              project: project.projectName,
              projectId: project.projectId,
              workOrderId: $scope.wh.workorderId,
              workOrderNo: $scope.wh.workorderCode,
              workTypeName: $scope.wh.worktypeName,
              workedTotalHours: $scope.wh.workTime,
              worker: $scope.wh.workerName,
              workerId: $scope.wh.workerId,
              workType: $scope.wh.workType
            };
            console.log("新增的报工", temWh);
            $scope.workHoursList.unshift(temWh);
          }
          if (!StringUtils.isNotEmpty($scope.detailFaultOrder.workorderDetails.eaWoWorkorderinfoDto.workTotalHour)) {
            $scope.detailFaultOrder.workorderDetails.eaWoWorkorderinfoDto.workTotalHour = 0;
          }
          $scope.detailFaultOrder.workorderDetails.eaWoWorkorderinfoDto.workTotalHour = (+$scope.detailFaultOrder.workorderDetails.eaWoWorkorderinfoDto.workTotalHour) + (+$scope.wh.workTime);
          // $rootScope.$emit(SAVE_WORK_TOTAL_HOUR_EVENT, {
          //   workOrder: $scope.detailFaultOrder,
          //   isFaultWorkOrder: $scope.detailFaultOrder.apiWorkorderBaseInfoDto.workorderType == "38"
          // });
          $scope.wh = {};
          $ionicHistory.goBack();
        }, function (err) {
          Popup.promptMsg(JSON.stringify(err), '新建工时单出错');
        });
    }
  })

  /**
   * 选择作业人
   */
  .controller('WorkerSelectCtrl', function (Store, SyncUsers, $rootScope, DataCache, $filter, $scope, Popup, $stateParams,
                                            WorkHoursService, $state, WorkHoursApi, $timeout, $ionicModal,
                                            OtherApi, eamSync, Storage, $ionicHistory, Params) {
    var syncFunc = ['SyncUsers.downloadList'];
    $scope.workerList = [];
    $scope.wh = $stateParams.data.wh;
    console.log($scope.wh);
    $scope.params = {pageNumber: 1};//初始值为1页
    $scope.hasMoreDate = true;
    $scope.loadWorker = function () {
      // 点击查询工单进来后的方法
      WorkHoursService.loadWorkerInfo($scope.params, function (resp) {
          $scope.params.pageNumber++;
          //追加结果
          $scope.hasMoreDate = resp.rows.length !== 0;
          if (resp.rows.length > 0) {
            $scope.workerList = $scope.workerList.concat(WorkHoursService.ChangeSQLResult2Array(resp));
          }
          $scope.$broadcast(SCROLL_INFINITE_COMPLETE);
          $scope.$broadcast(SCROLL_REFRESH_COMPLETE);
        }
      );
    };
    //初始化过滤器
    $ionicModal.fromTemplateUrl("views/workHours/searchWorkerFilter.html", {
      scope: $scope,
      animation: "slide-in-up"
    }).then(function (modal) {
      $scope.filterModal = modal;
    }, function (err) {
    });

    $scope.openFilter = function () {
      $scope.filterModal.show();
    };
    $scope.selected = function (id, name) {
      var obj = {'id': id, 'name': name};
      Params.setTransferredObjByKey("selectedWorker", obj);
      $ionicHistory.goBack();
    };

    $scope.query = function () {
      // $scope.params = {};
      // if ($scope.wh) {
      //   $scope.params.projectId = $scope.wh.projectId;
      // }
      $scope.params.pageNumber = 1;
      $scope.workerList = [];
      $scope.loadWorker();
      $scope.filterModal ? $scope.filterModal.hide() : null;
    };
    $scope.query();
    $scope.refreshDate = function () {
      eamSync.sync(syncFunc, function (status, err) {
        if (status) {
          Popup.loadMsg("同步成功!", 800);
        } else {
          Popup.loadMsg("同步失败!", 800);
        }
        $scope.query();
      })
    }
  })
  .controller('WorkOrderSelectWorkHoursCtrl', function (Store, $rootScope, DataCache, $filter, $scope, Popup, $stateParams,
                                                        WorkHoursService, $state, WorkHoursApi, $timeout, $ionicModal,
                                                        OtherApi, Storage, $ionicHistory, Params, modifiedJson) {
    if (isDebug) {
      console.log($stateParams.data);
    }
    $scope.workOrderList = [];
    $scope.params = {
      projectId: $stateParams.data && $stateParams.data.projectId || Storage.getSelectedProject().projectId
    };
    $scope.pageNumber = 1;
    $scope.isMoreWorkOrderData = true;
    $scope.loadWorkOrder = function () {
      // 点击查询工单进来后的方法
      WorkHoursService.loadWorkOrderInfo($scope.params, $scope.pageNumber, function (resp) {
        //追加结果
        $scope.$broadcast(SCROLL_INFINITE_COMPLETE);
        $scope.$broadcast(SCROLL_REFRESH_COMPLETE);
        if (resp.rows.length === 0) {
          $scope.isMoreWorkOrderData = false;
        } else {
          $scope.workOrderList = $scope.workOrderList.concat(WorkHoursService.ChangeSQLResult2Array(resp));
          $scope.isMoreWorkOrderData = true;
          $scope.pageNumber++;
        }
      });
    };
    $scope.loadWorkOrder();
    $scope.doRefreshWorkOrder = function () {
      $scope.$broadcast(SCROLL_REFRESH_COMPLETE);
      $scope.params = {
        projectId: $stateParams.data.projectId
      };
      $scope.pageNumber = 1;
      $scope.workOrderList = [];
      $scope.loadWorkOrder();
    };
    //初始化过滤器
    $ionicModal.fromTemplateUrl("views/workHours/searchWorkOrderFilter.html", {
      scope: $scope,
      animation: "slide-in-up"
    }).then(function (modal) {
      $scope.filterModal = modal;
    }, function (err) {
    });

    $scope.openFilter = function () {
      $scope.filterModal.show();
    };
    $scope.selectWorkOrder = function (wo) {
      Params.setTransferredObjByKey('selectedOrderNo', wo);
      $ionicHistory.goBack();
      $scope.filterModal.hide();
    };
    $scope.query = function () {
      $scope.workOrderList = [];
      $scope.pageNumber = 1;
      $scope.loadWorkOrder();
      $scope.filterModal.hide();
    };
    $scope.backButtonAction = function () {
      $scope.filterModal.hide();
    }
  })
  /**
   * 工时填报修改
   */
  .controller('WorkHoursDetailCtrl', function (Store, $rootScope, DataCache, $filter, $scope, Popup, $stateParams,
                                               WorkHoursService, $state, WorkHoursApi, OrderService, $timeout, $ionicModal,
                                               OtherApi, Storage, $ionicHistory, Params, eamSync, $ionicPlatform) {
    $scope.wh = angular.copy($stateParams.data.wh);
    // $scope.wh.json = angular.fromJson($scope.wh.json);
    $scope.oldWorkorderId = $scope.wh.workorderId;//如果原本是工单报工，修改后变成非工单类型的报工，需要将累计作业时间减掉这个报工的工时数
    $scope.oldWhWorkTime = $scope.wh.workedTotalHours;//未修改前的工时
    $scope.isFromWorkOrder = false;//是否由工单跳转而来 默认不是来自 计划工单
    $scope.isFirstEntry = true;  //默认是第一次进到该模块
    $scope.statusCanEdit = true;//默认当前的工单状态下是可以编辑的

    if (isDebug) {
      console.debug("debug > wh " ,$scope.wh);
    }
    if ($stateParams.data.workOrder) {//工单的人员报工
      $scope.workOrderObj = $stateParams.data.workOrder;
      console.log($scope.workOrderObj);
      $scope.isFromWorkOrder = true;
      $scope.wh.workType = 213;//工单报工
      $scope.wh.worktypeName="工单报工";
      $scope.wh.workOrderId=$scope.workOrderObj.apiWorkorderBaseInfoDto.workorderId;
      $scope.wh.workOrderNo=$scope.workOrderObj.apiWorkorderBaseInfoDto.workorderCode;
      //   if($scope.workOrderObj.apiWorkorderBaseInfoDto.workorderStatus == 141 || $scope.workOrderObj.apiWorkorderBaseInfoDto.workorderStatus == 41){
      //         Popup.loadMsg("来自工单的报工，")
      //   }
      //如果来自计划工单 的报工， 则根据状态 处理中的才能编辑 ，计划工单 maintainTask.taskStatus.processing  故障工单
      $scope.statusCanEdit = ($scope.workOrderObj.apiWorkorderBaseInfoDto.workorderStatus == 141 || $scope.workOrderObj.apiWorkorderBaseInfoDto.workorderStatus == 41) ? true : false;
    } else if ($scope.wh.workType == 213 && $scope.wh.workOrderId) {//不是从工单跳转而来，但却是工单类型的报工
      Popup.loadMsg("获取对应工单的信息");
      WorkHoursService.getWorkOrderByWorkorderId($scope.wh.workOrderId)
        .then(function (order) {
            Popup.hideLoading();
            console.log("获取对应工单的信息",order);
          if (!order) {
            Popup.promptMsg("当前关联的工单尚未下载成功,或没有该工单，改无法编辑");
            $scope.statusCanEdit = false;//可编辑状态置为false
            $scope.isCanEditWorkHoursDetail();
          } else {
            $scope.workOrderObj = JSON.parse(order.json);
            $scope.statusCanEdit = $scope.workOrderObj.apiWorkorderBaseInfoDto.workorderStatus == 141 || $scope.workOrderObj.apiWorkorderBaseInfoDto.workorderStatus == 41;
          }
        }, function (err) {
          Popup.hideLoading();
          console.error(err)
        });
    }
    // 格式化 日期时间，如果是字符串类型的 字符串中有- 替换为/ 如果是时间戳，格式化字符串 为2017/8/24 下午9:32:00
    // function dateFormater(date) {
    //   var date = new Date(date).format('yyyy-MM-dd hh:mm:ss');
    //   console.log(date);
    //     return date.replace(/-/g, "/");
    // };
    //
    // $scope.wh.json.beginDate = dateFormater($scope.wh.json.startDate);
    // $scope.wh.json.endDate = dateFormater($scope.wh.json.endDate);
    $scope.webParams = {
      project: Storage.getSelectedProject(),
      startDate: $scope.wh.startDate ? new Date($scope.wh.startDate) : null,
      endDate: $scope.wh.endDate ? new Date($scope.wh.endDate) : null,
      confirm: ($scope.wh && $scope.wh.isVendor) ? +$scope.wh.isVendor == 1 : true//1是
    };
    console.log("webParams" ,$scope.webParams);

    var curDate = new Date();
    // console.log($scope.webParams.startDate.getFullYear(),"-",curDate.getFullYear(),"-",$scope.webParams.startDate.getMonth(),"-",curDate.getMonth());
    // 当年 当月的工时填报 才可以 修改
    $scope.isCanEditWorkHours = ($scope.webParams.startDate.getFullYear() === curDate.getFullYear()) &&
      ($scope.webParams.startDate.getMonth() === curDate.getMonth());
    //是否可以编辑 报工详情 权限控制
    $scope.isCanEditWorkHoursDetail = function () {
      //如果来自工单
      if ($scope.isFromWorkOrder) {
        //如果是处理中的计划工单
        if ($scope.workOrderObj.apiWorkorderBaseInfoDto.workorderStatus == 141) {
          //如果有修改工单的权限
          if ($rootScope.auth['auth_410105'] || $rootScope.auth['auth_430105'] || $rootScope.auth['auth_460105']) {
            //是当年 当月 ----且任务单的负责人是当前登录用户--- 去掉该条件了
            if (($scope.webParams.startDate.getFullYear() == curDate.getFullYear()) &&
              ($scope.webParams.startDate.getMonth() == curDate.getMonth())
                // &&(Storage.getProfile()['id'] == $scope.wh.workerId)
            ) {
              return true;
            }
            return false;
          }
          return false;
          //如果是 处理中的 故障工单 且有修改编辑任务单的权限
        } else if ($scope.workOrderObj.apiWorkorderBaseInfoDto.workorderStatus == 41) {
          if (($scope.webParams.startDate.getFullYear() == curDate.getFullYear()) &&
            ($scope.webParams.startDate.getMonth() == curDate.getMonth()) && $rootScope.auth['auth_110103']) {
            return true;
          }
          return false;
          //    不是处理中的工单 不能报工
        } else {
          return false;
        }
      } else {
        //从主页面进入报工界面列表，在进入详情，如果是当年当月 可以编辑 //todo  没有加权限 新文档中没有需求中说现场经理可以报工
        return ($scope.webParams.startDate.getFullYear() == curDate.getFullYear()) &&
          ($scope.webParams.startDate.getMonth() == curDate.getMonth());
      }
    };


    console.log($scope.webParams);
    $scope.toggleChange = function () {
      $scope.wh.worker = "";
      // if (!$scope.webParams.confirm) {//如果不是现场值守人员，可以手动输入人员
      // }
    };
    $scope.selectedIdName = {
      workTypeIdName: null
    };
    WorkHoursService.getDicId2NameByDictionaryId(51, function (ids2Names) {//51是工时报工对应的作业类型
      $scope.workAnchors = ids2Names;
      for (var anIndex in ids2Names) {
        if (ids2Names[anIndex]["detailId"] == $scope.wh.workType) {
          $scope.selectedIdName.workTypeIdName = ids2Names[anIndex];
          $scope.isFirstEntry = true;//第一次进入
          break;
        }
      }
    });
    $scope.projectList = Storage.getProjects();
    for (var i = 0; i < $scope.projectList.length; i++) {
      if ($scope.projectList[i]['projectId'] == $scope.wh.projectId) {
        $scope.webParams.project = $scope.projectList[i];
        break;
      }
    }
    $scope.workerSelect = function () {//选择作业人
      $state.go("tab.workerSelect", {
        data: {
          wh: $scope.wh
          // isScenePeople:$scope.webParams.confirm//是否是现场值守人员
        }
      });
    };
    $scope.workOrderSelect = function () {//选择工单编号,只能选择处理中的工单
      $state.go("tab.workOrderSelect", {
        data: $scope.wh
      });
    };


    $scope.$on('$ionicView.beforeEnter', function () { //选中的作业人员
      if (Params.getTransferredObjByKey('selectedOrderNo')) {//选中的工单编号
        // var od = {'oi': orderid, 'on': orderno};
        var wo = Params.getTransferredObjByKey('selectedOrderNo');
        console.log(wo);
        $scope.workOrderObj = angular.fromJson(wo.json);
        $scope.wh.workOrderId = wo.workorderId;
        $scope.wh.workOrderNo = wo.workorderCode;
        Params.clearTransferredObjByKey('selectedOrderNo');
      }
      if (Params.getTransferredObjByKey("selectedWorker")) {//选中的作业人员
        var selectedWorker = Params.getTransferredObjByKey('selectedWorker');
        $scope.wh.workerId = selectedWorker.id ? selectedWorker.id : "";
        $scope.wh.worker = selectedWorker.name ? selectedWorker.name : "";
        Params.clearTransferredObjByKey('selectedWorker');
      }
    });


    $scope.calculateStopTime = function (start, end) { //计算累计停机时间,<.5是0.5,>0.5&&<1是1
      $scope.webParams.startDate = start;
      $scope.webParams.endDate = end;
      if ($scope.webParams.startDate && $scope.webParams.endDate) {
        var endTime = $scope.webParams.endDate.getTime();
        var startTime = $scope.webParams.startDate.getTime();
        if (endTime >= startTime) {
          var delta = (endTime - startTime) / 1000; //秒
          if (delta % 3600 == 0) { //正好是整小时数
            $scope.webParams.workedTotalHours = delta / 3600;
          } else { //含有小数
            $scope.webParams.workedTotalHours = delta / 3600.0; //小时
            $scope.webParams.workedTotalHours = $scope.webParams.workedTotalHours.toFixed(2);
            var str = $scope.webParams.workedTotalHours + "";
            var str2 = str.substr(str.indexOf("."), 2); //小数部分
            str = str.substr(0, str.indexOf(".")); //整数部分
            //console.log("str2:bef: " + str2);
            str2 = str2 < 0.5 ? 0.5 : 1;
            //console.log("str2:aft: " + str2);
            $scope.webParams.workedTotalHours = parseInt(str) + parseFloat(str2);
          }
        }
      } else {
        $scope.webParams.workedTotalHours = 0;
      }
    };

    $scope.$watch("webParams.project", function (newVal, oldVal) {
      if (!angular.equals(newVal, oldVal)) {
        if (isDebug) {
          console.log(newVal);
        }
        $scope.webParams.project = newVal;
        $scope.wh.project = $scope.webParams.project.projectName;
        $scope.wh.projectId = $scope.webParams.project.projectId;
        $scope.wh.workOrderNo = null;
      }
    });
    $scope.$watch("selectedIdName.workTypeIdName", function (newVal, oldVal) {
      if (isDebug) {
        console.log(newVal, oldVal);
      }
      if (!angular.equals(oldVal, newVal)) {
        $scope.wh.workType = newVal ? newVal.detailId : newVal;
        if ($scope.wh.workType == 213 && !$scope.isFirstEntry) {
          $scope.wh.workOrderNo = null;
        }
        if ($scope.wh.workType == 214 && !$scope.isFirstEntry) {
          $scope.wh.elseReason = null;
          $scope.wh.workOrderNo = null;//清空工单相关的信息
          $scope.wh.workOrderId = null;//清空工单相关的信息
        } else {
          $scope.isFirstEntry = false;
        }
      } else {
        $scope.isFirstEntry = true;//第一次进入
      }
    });

    $scope.save = function (wh) {
      wh.workType = $scope.selectedIdName["workTypeIdName"] ? $scope.selectedIdName["workTypeIdName"].detailId : null;
      wh.workTypeName = $scope.selectedIdName["workTypeIdName"] ? $scope.selectedIdName["workTypeIdName"].detailName : null;
      if (!$scope.webParams.project) {
        $scope.webParams.project = Storage.getSelectedProject();
      }
      wh.project = $scope.webParams.project.projectName;
      wh.projectId = $scope.webParams.project.projectId;
      if (!wh.worker) {
        Popup.delayRun(function () {
        }, "作业人必填");
        return;
      }
      if (!wh.workType) {
        Popup.delayRun(function () {
        }, "作业类型必填");
        return;
      }
      if (wh.workType == '213' && !wh.workOrderNo) {
        Popup.delayRun(function () {
        }, "工单编号必填");
        return;
      }
      if (wh.workType == '214' && !wh.elseReason) {
        Popup.delayRun(function () {
        }, "原因必填");
        return;
      }
      if (wh.workType !== 213) {
        $scope.wh.workOrderNo = null;//清空工单相关的信息
        $scope.wh.workOrderId = null;//清空工单相关的信息
      }
      if (!$scope.webParams.startDate) {
        Popup.delayRun(function () {
        }, "开始时间必填");
        return;
      }
      wh.startDate = new Date($scope.webParams.startDate.getTime());
      if (!$scope.webParams.endDate) {
        Popup.delayRun(function () {
        }, "结束时间必填");
        return;
      }
      if ($scope.webParams.endDate.getTime() <= $scope.webParams.startDate.getTime()) {
        Popup.delayRun(function () {
        }, "结束时间必须大于开始时间");
        return;
      }
      wh.endDate = new Date($scope.webParams.endDate.getTime());
      if (!($scope.webParams.startDate.getFullYear() == curDate.getFullYear() &&
        $scope.webParams.startDate.getMonth() == curDate.getMonth())) {
        return Popup.loadMsg("只能设置为本月的时间", 1200);
      }
      if (!($scope.webParams.endDate.getFullYear() == wh.startDate.getFullYear() && $scope.webParams.endDate.getMonth() == wh.startDate.getMonth() && $scope.webParams.endDate.getDay() == wh.startDate.getDay())) {
        Popup.delayRun(function () {
        }, "开始时间和结束时间必须在同一天");
        return;
      }
      $scope.calculateStopTime(wh.startDate, wh.endDate);
      if (!wh.content) {
        Popup.delayRun(function () {
        }, "作业内容必填");
        return;
      }
      $scope.wh.isVendor = $scope.webParams.confirm ? 1 : 0;//是否是现场值守人员
      //wh.workTime = $scope.webParams.workedTotalHours;
      wh.workedTotalHours = $scope.webParams.workedTotalHours;
      var temWh = {
        activeFlag: wh.activeFlag,
        endDate: wh.endDate,
        id: wh.id,
        isVendor: wh.isVendor,
        projectId: wh.projectId,
        project: wh.project,
        startDate: wh.startDate,
        workContent: wh.content,
        workTime: +wh.workedTotalHours,
        workerId: wh.workerId,
        workerName: wh.worker,
        elseReason: wh.elseReason,
        workorderCode: wh.workOrderNo,
        workorderId: wh.workOrderId || $scope.oldWorkorderId,//这个值一直保持，后台需要判断是否原来工单报工改成非工单报工了
        worktypeId: wh.workType,
        worktypeName: wh.workTypeName
      };
      console.log(wh);
      /*function calcWorkTotalHours(workOrderObj, newWorkTime, increase) {
        if (isDebug) {
          console.log(workOrderObj, newWorkTime);
        }
        if (!workOrderObj) {
          return;
        }
        var workTotalHour = StringUtils.isNotEmpty(workOrderObj.workorderDetails.eaWoWorkorderinfoDto.workTotalHour) ?
          +workOrderObj.workorderDetails.eaWoWorkorderinfoDto.workTotalHour : 0;//累计前工单的累计工时数
        if (isDebug) {
          console.log("累计前总工时：" + workTotalHour + ",新工时：" + newWorkTime);
        }
        if (increase) {//如果修改的不是同一个工单，直接加上工时数
          workOrderObj.workorderDetails.eaWoWorkorderinfoDto.workTotalHour += newWorkTime;
        } else {//否则改变这个累计作业时间
          workOrderObj.workorderDetails.eaWoWorkorderinfoDto.workTotalHour = workTotalHour > $scope.oldWhWorkTime ?
            workTotalHour - $scope.oldWhWorkTime + newWorkTime : newWorkTime;
        }
        if (isDebug) {
          console.debug("累计前工单的累计工时数: " + workTotalHour + "，修改后: " + workOrderObj.workorderDetails.eaWoWorkorderinfoDto.workTotalHour)
        }
        // $rootScope.$emit(SAVE_WORK_TOTAL_HOUR_EVENT, {
        //   workOrder: workOrderObj,
        //   isFaultWorkOrder: workOrderObj.apiWorkorderBaseInfoDto.workorderType == '38'
        // });
        Popup.delayRun(function () {
          wh.json = JSON.stringify(wh);
          angular.extend($stateParams.data.wh, wh);
        }, '', 1000);
      }*/

      WorkHoursService.updateOrInsert(temWh)
        .then(function () {
            Popup.delayRun(function () {
              // wh.json = JSON.parse(wh.json);
                angular.copy(wh,$stateParams.data.wh);
                $ionicHistory.goBack();
            }, '', 800);
         /* if (temWh.worktypeId == 213 && temWh.workorderId) {//如果是工单类型的报工,如果是主页上面直接点击工时填报，选中的报工时工单报工且进入修改详情页面
            if ($scope.oldWhWorkTime !== temWh.workTime) {//两个时间不等才去更新工单的累计作业时间
              if (!$scope.isFromWorkOrder) {//直接点击了工时填报列表中的工单报工类型的工时单
                if (+temWh.workorderId !== +temWh.oldWorkorderId) {//如果不是同一个工单了,原工单的累计作业时间减去这个工时数
                  console.log("不是同一个工单了");
                  // calcWorkTotalHours($scope.workOrderObj, 0);
                  var promise = WorkHoursService.getWorkOrderByWorkorderId(temWh.workorderId);//数据库中找出这个工单对象
                  promise.then(function (obj) {
                    console.log(obj);
                    if (obj) {
                      // calcWorkTotalHours(angular.fromJson(obj.json), temWh.workTime, true);//新工单的累计作业时间直接加上这个工时数
                      $ionicHistory.goBack();
                    } else {
                      $ionicHistory.goBack();
                    }
                  });
                } else {//同一个工单
                  // calcWorkTotalHours($scope.workOrderObj, temWh.workTime);
                  $ionicHistory.goBack();

                }
              } else {//某个工单直接点击人员报工跳转到报工列表，进而修改详情
                // calcWorkTotalHours($scope.workOrderObj, temWh.workTime);
                $ionicHistory.goBack();
              }
            } else {
              Popup.delayRun(function () {
                wh.json = JSON.stringify(wh);
                angular.extend($stateParams.data.wh, wh);
                //
                // wh.json = angular.fromJson(wh.json);

                $ionicHistory.goBack();
              }, '', 800);
            }
          } else if ($scope.oldWorkorderId) {//如果原来是工单报工，现在不是
            // calcWorkTotalHours($scope.workOrderObj, 0);//减去这个报工的时间
            $ionicHistory.goBack();
          } else {//除工单报工外的报工类型
            Popup.delayRun(function () {
              wh.json = JSON.stringify(wh);
              angular.extend($stateParams.data.wh, wh);
              $ionicHistory.goBack();
            }, '', 800);
          }*/
        }, function (err) {
          Popup.promptMsg(JSON.stringify(err), '保存工时填报出错');
        });
    };
    window.onerror = function (msg, url, line) {
      var idx = url.lastIndexOf("/");
      if (idx > -1) {
        url = url.substring(idx + 1);
      }
      alert("ERROR in " + url + " (line #" + line + "): " + msg);
      return false;
    };

  })
  /**
   * 不是从工单中跳转而来的新建报工
   */
  .controller("CreateWorkHoursWithoutWorkOrder", ["Popup", "$state", '$rootScope', "Params", "$stateParams", "$scope", "Storage", "WorkHoursService", "$ionicHistory",
    function (Popup, $state, $rootScope, Params, $stateParams, $scope, Storage, WorkHoursService, $ionicHistory) {
      $scope.workHoursList = $stateParams.data["workHoursList"];//某个工单下面的人员报工列表
      $scope.webParams = {
        confirm: true,
        project: Storage.getSelectedProject()
      };
      $scope.wh = {
        activeFlag: 0,
        content: null,
        endDate: null,
        id: null,
        isVendor: 1,
        project: Storage.getSelectedProject().projectName,
        projectId: Storage.getSelectedProject().projectId,
        startDate: null,
        workOrderId: null,
        workOrderNo: null,
        workType: null,
        workTypeName: null,
        workedTotalHours: null,
        worker: null,
        elseReason: null,
        workerId: null
      };
      $scope.canSelectWorkOrder = false;
      $scope.title = "新增人员报工";
      $scope.projectList = Storage.getProjects();
      WorkHoursService.getDicId2NameByDictionaryId(51, function (ids2Names) {//51是工时报工对应的作业类型
        $scope.workAnchors = ids2Names;
        for (var anIndex in ids2Names) {
          if (ids2Names[anIndex]["detailId"] == $scope.wh.workType) {
            $scope.selectedIdName.workTypeIdName = ids2Names[anIndex];
            break;
          }
        }
      });

      $scope.workerSelect = function () {//选择作业人
        $state.go("tab.workerSelect", {
          data: {
            wh: $scope.wh
          }
        });
      };
      $scope.isVendor = function () {
        console.log("isVendor ", $scope.webParams.confirm);
        $scope.wh.worker = "";
      };
      $scope.workOrderSelect = function () {//选择工单编号
        $state.go("tab.workOrderSelect", {
          data: $scope.wh
        });
      };
      // $scope.$watch("webParams.project", function (newVal, oldVal) {
      //   console.log("project: ", oldVal, newVal);
      //   //if (!angular.equals(newVal, oldVal)) {
      //   $scope.wh.project = newVal ? newVal.projectName : null;
      //   $scope.wh.projectId = newVal ? newVal.projectId : null;
      //   //}
      //   $scope.wh.workOrderNo = null;
      //   $scope.canSelectWorkOrder = $scope.wh.project && $scope.wh.workType == 213;
      // });
      $scope.selectedIdName = {
        workTypeIdName: null
      };
      $scope.$watch("selectedIdName.workTypeIdName", function (newVal, oldVal) {
        console.log("anchor", oldVal, newVal);
        //if (!angular.equals(oldVal, newVal)) {
        $scope.wh.workType = newVal ? newVal.detailId : null;
        $scope.wh.workTypeName = newVal ? newVal.detailName : null;
        $scope.wh.elseReason = "";
        $scope.wh.workOrderNo = null;
        //}
        if ($scope.wh.workType == 213 && !$scope.webParams.project) {
          Popup.loadMsg("请先选中项目", 800);
          $scope.canSelectWorkOrder = false;
        } else if ($scope.wh.workType == 213) {
          $scope.canSelectWorkOrder = true;
        }
      });
      $scope.$on('$ionicView.beforeEnter', function () { //选中的作业人员
        if (Params.getTransferredObjByKey('selectedOrderNo')) {//选中的工单编号
          // var od = {'oi': orderid, 'on': orderno};
          var wo = Params.getTransferredObjByKey('selectedOrderNo');
          $scope.selectedWorkOrder = angular.fromJson(wo.json);
          // console.log(wo);
          $scope.wh.workOrderId = wo.workorderId;
          $scope.wh.workOrderNo = wo.workorderCode;
          Params.clearTransferredObjByKey('selectedOrderNo');
        }
        if (Params.getTransferredObjByKey("selectedWorker")) {//选中的作业人员
          var selectedWorker = Params.getTransferredObjByKey('selectedWorker');
          $scope.wh.workerId = selectedWorker.id ? selectedWorker.id : "";
          $scope.wh.worker = selectedWorker.name ? selectedWorker.name : "";
          Params.clearTransferredObjByKey('selectedWorker');
        }
      });
      $scope.save = function (wh) {
        wh.workType = $scope.selectedIdName["workTypeIdName"] ? $scope.selectedIdName["workTypeIdName"].detailId : null;
        wh.workTypeName = $scope.selectedIdName["workTypeIdName"] ? $scope.selectedIdName["workTypeIdName"].detailName : null;
        if (!$scope.webParams.project) {
          $scope.webParams.project = Storage.getSelectedProject();
        }
        wh.project = $scope.webParams.project.projectName;
        wh.projectId = $scope.webParams.project.projectId;
        if (!wh.worker) {
          Popup.delayRun(function () {
          }, "作业人必填");
          return;
        }
        if (!wh.workType) {
          Popup.delayRun(function () {
          }, "作业类型必填");
          return;
        }
        if (wh.workType == 213 && !wh.workOrderId) {//工单报工
          Popup.delayRun(function () {
          }, "工单编号必填");
          return;
        }
        if (wh.workType == 214 && !StringUtils.isNotEmpty(wh.elseReason)) {//工单报工
          Popup.delayRun(function () {
          }, "请输入原因");
          return;
        }
        if (!$scope.webParams.startDate) {
          Popup.delayRun(function () {
          }, "开始时间必填");
          return;
        }
        wh.startDate = new Date($scope.webParams.startDate.getTime());
        if (!$scope.webParams.endDate) {
          Popup.delayRun(function () {
          }, "结束时间必填");
          return;
        }
        if ($scope.webParams.endDate.getTime() <= $scope.webParams.startDate.getTime()) {
          Popup.delayRun(function () {
          }, "结束时间必须大于开始时间");
          return;
        }
        var date = new Date();
        if (!($scope.webParams.startDate.getFullYear() == date.getFullYear() &&
            $scope.webParams.startDate.getMonth() == date.getMonth() &&
            $scope.webParams.endDate.getFullYear() == wh.startDate.getFullYear() &&
            $scope.webParams.endDate.getMonth() == wh.startDate.getMonth() &&
            $scope.webParams.endDate.getDay() == wh.startDate.getDay()
          )) {
          Popup.loadMsg("开始时间和结束时间须在当前月同一天内天", 1500);
          return;
        }
        wh.endDate = new Date($scope.webParams.endDate.getTime());
        $scope.calculateStopTime = function (start, end) { //计算累计停机时间,<.5是0.5,>0.5&&<1是1
          if (start && end) {
            var endTime = end.getTime();
            var startTime = start.getTime();
            if (endTime >= startTime) {
              var delta = (endTime - startTime) / 1000; //秒
              if (delta % 3600 == 0) { //正好是整小时数
                $scope.webParams.workedTotalHours = delta / 3600;
              } else { //含有小数
                $scope.webParams.workedTotalHours = delta / 3600.0; //小时
                $scope.webParams.workedTotalHours = $scope.webParams.workedTotalHours.toFixed(2);
                var str = $scope.webParams.workedTotalHours + "";
                var str2 = str.substr(str.indexOf("."), 2); //小数部分
                str = str.substr(0, str.indexOf(".")); //整数部分
                //console.log("str2:bef: " + str2);
                str2 = str2 < 0.5 ? 0.5 : 1;
                //console.log("str2:aft: " + str2);
                $scope.webParams.workedTotalHours = parseInt(str) + parseFloat(str2);
              }
            }
          } else {
            $scope.webParams.workedTotalHours = 0;
          }
        };
        $scope.calculateStopTime(wh.startDate, wh.endDate);
        wh.workedTotalHours = $scope.webParams.workedTotalHours;
        if (!wh.content) {
          Popup.delayRun(function () {
          }, "作业内容必填");
          return;
        }
        $scope.wh.isVendor = $scope.webParams.confirm ? 1 : 0;//是否是现场值守人员
        wh.workTime = $scope.webParams.workedTotalHours;
        var temWh = {
          activeFlag: wh.activeFlag,
          endDate: wh.endDate,
          id: wh.id,
          isVendor: wh.isVendor,
          projectId: wh.projectId,
          project: wh.project,
          startDate: wh.startDate,
          workContent: wh.content,
          workTime: wh.workedTotalHours,
          workerId: wh.workerId,
          workerName: wh.worker,
          workorderCode: wh.workOrderNo,
          workorderId: wh.workOrderId,
          worktypeId: +wh.workType + "",
          worktypeName: wh.workTypeName
        };
        if ($scope.selectedWorkOrder) {
          var workTotalHour = $scope.selectedWorkOrder.workorderDetails.eaWoWorkorderinfoDto.workTotalHour || 0;
          workTotalHour += +temWh.workTime;
          $scope.selectedWorkOrder.workorderDetails.eaWoWorkorderinfoDto.workTotalHour = workTotalHour;
          // $rootScope.$emit(SAVE_WORK_TOTAL_HOUR_EVENT, {//用来更改累计作业时间，后台已经做了，app端不需要这些代码，
          //   workOrder: $scope.selectedWorkOrder,
          //   isFaultWorkOrder: temWh.workorderCode.indexOf("GZ") >= 0
          // });
        }
        console.log("要上传的对象", temWh);
        wh.id = WorkHoursService.createTemId(temWh);
        WorkHoursService.updateOrInsert(temWh)
          .then(function () {
            $scope.workHoursList.unshift(wh);
            $ionicHistory.goBack();
          }, function (err) {
            Popup.promptMsg(JSON.stringify(err), "新建工时填报出错");
          });
      }
    }])


