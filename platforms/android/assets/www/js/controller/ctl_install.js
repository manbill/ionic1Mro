/**
 * Created by jinagwei.wang on 2016/11/16.
 */
starter
//安装调试列表
  .controller("InstallCtrl",
    function ($rootScope, eamMTInstallWorkOrderFactory, $scope,$ionicScrollDelegate, $state, Storage, $ionicBackdrop, MaintainTaskRW, eamSyncAjax, OrderService, eamSync, InstallService, modifiedJson, Popup, $ionicModal, SchdleMaintainApi) {
      //默认选中左边的 tab
      var api_getSystemTime = baseUrl + "/api/common/getSystemTime.api";
      $scope.selectStatus = 0;
      //任务分派/安装任务 tab 切换 标示当前在哪个页面的数据结构
      $scope.status = [{
        "ele": "active"
      }, {
        "ele": ""
      }];
      var syncFunctions = ["eamMTInstallWorkOrderFactory.uploadWorkOrders", "eamMTInstallWorkOrderFactory.downLoadWorkOrders"];
      $scope.now_server_date = new Date();
      $scope.isUpdateServerDate = false;
      $scope.installTaskList = [];
      $scope.pageNumber = 1;
      $scope.scrollPostion = null /*{left:null,top:null,zoom:null}*/;//滚动的位置
      $scope.isMoreInstallTaskData = false;//是否没有更多安装任务数据,初始化必须是false
      $scope.isMoreAssignTaskData = true;//是否没有更多分派任务数据
      $scope.loadMoreInstallTaskData = function () {//加载安装任务数据
        var params = {
          pageNumber: $scope.pageNumber
        };
        params = $.extend(params, $scope.paramsOfTaskFilter);
        eamMTInstallWorkOrderFactory.loadMoreInstallOrders(params, function (res) {
            $scope.$broadcast('scroll.infiniteScrollComplete');
            if (res.length > 0) {
            $scope.installTaskList = $scope.installTaskList.concat(res);
            console.log("安装 任务单 ",  $scope.installTaskList);
            $scope.isMoreInstallTaskData = true;
            $scope.pageNumber++;
          } else {
            $scope.isMoreInstallTaskData = false;
          }
          // $scope.$broadcast('scroll.refreshComplete');
        });
      };
      $scope.initFilterParams = function (selectStatus, callback) {//初始化查询参数
        $scope.pageNumber = 1;
        function initParams(selectStatus, now_server_date, callback) {
          if (selectStatus == 0) {//通知单列表
            //任务分派列表 筛选 参数
            if (now_server_date) {
              // console.log("now_server_date: " + now_server_date);
              $scope.now_server_date = now_server_date;
            }
            $scope.paramsOfAsignFilter = {
              planEndDate: new Date($scope.now_server_date.getFullYear(), $scope.now_server_date.getMonth() + 3),//后三个月
              planBeginDate: new Date($scope.now_server_date.getFullYear(), $scope.now_server_date.getMonth() - 3),//前三个月
              workorderStatus: 136,//136 待分派
              workTypeId: null,
              positionCode: null,
              planNoticeId: null,
              projectName: null,
              areaType: null
            };
          } else {//任务列表
            //安装任务列表 筛选 参数
            $scope.paramsOfTaskFilter = {
              workorderCode: null,
              projectName: null,
              workTypeId: null,//作业节点
              planBeginDate: null,//计划开始(开始）
              planEndDate: null,//计划开始（结束)
              positionCode: null,
              workorderStatus: null
            };
          }
          if ($.isFunction(callback)) {
            callback();
          }
        }

        if (!$scope.isUpdateServerDate) {//如果还没获取到服务器端的时间
          if ($rootScope.isOnline) {
            Popup.loadMsg("正在同步服务器的时间...");
            eamSyncAjax.doGet(api_getSystemTime, [], function (req) {
              Popup.hideLoading();
              // console.log(req);
              $scope.now_server_date = new Date(req.data);
              $scope.isUpdateServerDate = true;
              // console.log("正在同步服务器的时间" + $scope.now_server_date);
              initParams(selectStatus, $scope.now_server_date, callback);
            }, {timeout: 5000});
          } else {
            initParams(selectStatus, null, callback);
          }
        } else {
          initParams(selectStatus, null, callback);
        }
      };
      $scope.isManage = Storage.isManager();
      $scope.doRefreshNotificationData = function () {//刷新通知单的信息
        $scope.initFilterParams($scope.selectStatus, function () {
          $scope.assignTaskList = [];
          if ($rootScope.isOnline) {
            $scope.getTaskAssignListFromNet();
          } else {
            $scope.loadMoreNotificationData();
          }
        });
      };
      $scope.doRefreshInstallTaskListData = function () {//刷新安装任务列表
        $scope.initFilterParams($scope.selectStatus, function () {
          $scope.installTaskList = [];
          // if ($rootScope.isOnline) {
          InstallService.uploadIfOnline(function () {
            eamSync.sync(syncFunctions, function (res) {//此处是异步完成
              if (res) {
                Popup.loadMsg("同步数据成功", 800);
              } else {
                Popup.loadMsg("同步失败!", 800);
              }
              $scope.loadMoreInstallTaskData();//有网络且同步成功
            }, function () {
              Popup.loadMsg("网络不通,同步失败!", 800);
              $scope.loadMoreInstallTaskData();//网络不通
            });
          });
        });
      };
      //todo 在线的时候 调用API 获取 任务分派列表
      $scope.getTaskAssignListFromNet = function () {
        Popup.waitLoad("正在获取通知单...");
        // $ionicBackdrop.retain();
        SchdleMaintainApi.getSchdleNotificationList(function (resp) {
          // Popup.waitLoad("正在获取通知单……");
          if (resp.success) {
            Popup.hideLoading();
            // var start = new Date().getTime();
            InstallService.mergeNotification(resp.data, function () {
              // var end = new Date().getTime();
              // console.log(end - start);
              // console.log("insertOrUpdate,执行完了");
              $ionicBackdrop.release();
              $scope.loadMoreNotificationData();
            });
          } else {
            eamSync.synclog("请检查网络" + JSON.stringify(resp.retInfo));
            $ionicBackdrop.release();
            Popup.hideLoading();
            $scope.loadMoreNotificationData();
          }
      }, {
          projectName: null,
          projectId: Storage.getSelectedProject().projectId,
          anchor: null,
          status: null,
          planBeginDate: null,
          planEndDate: null,
          pageNumber: 1,
          lastUpdateOnBegin: null /*"2015-08-03 01:01:01"*/,//DataCache.getApiRequestTime("SchdleMaintainApi.getSchdleNotificationList"),
          lastUpdateOnEnd: null/*"2017-08-03 01:01:01"*/,//new Date().Format("yyyy-MM-dd HH:mm:ss")
          stage: "construct_stage"//技改任务应该传 project_stage  定期维护："service_stage"；安装调试："construct_stage"；技改整改："trans_stage"
        });
      };
      $scope.$on('$ionicView.beforeEnter', function () {

      });
      $scope.$on("cfpLoadingBar:refreshCompleted", function () {//进度条
        $scope.$broadcast('scroll.refreshComplete');
      });
      $scope.doRefresh = function () {
        if ($scope.selectStatus == 0) {
          $scope.$broadcast('scroll.refreshComplete');
          $scope.doRefreshNotificationData();
        } else {
          $scope.doRefreshInstallTaskListData();
        }
      };
      $scope.loadMoreNotificationData = function () {//加载更多通知单数据
        // console.log($scope.paramsOfAsignFilter);
        // console.log($scope.pageNumber);
        InstallService.queryNotificationData($scope.pageNumber, $scope.paramsOfAsignFilter, function (res) {
          // $scope.$broadcast('scroll.refreshComplete');
          $scope.$broadcast('scroll.infiniteScrollComplete');//it should broadcast the scroll.infiniteScrollComplete event from your controller
          if (res.length > 0) {
            // console.log(res);
            $scope.assignTaskList = $scope.assignTaskList.concat(res);
            console.log("安装 通知单 ", $scope.assignTaskList);
            $scope.pageNumber++;
            $scope.isMoreAssignTaskData = true;
          } else {
            $scope.isMoreAssignTaskData = false;
          }
        });
      };
      $scope.goInstallTaskDetail = function (task) {
        if (!$rootScope.auth['auth_430106'] || ((task.workorderStatus == maintainTask.taskStatus.received ) || task.workorderStatus == maintainTask.taskStatus.unreceived)) {
          return;
        }
        $scope.selectedTask = task;
        $state.go("tab.installTaskDetail", {
            data: task
          // data: {
          //   baseInstallTaskInfo: task,
          //   installTaskDetailInfo: angular.fromJson(task.json)
          // }
        });
      };
      $scope.loadMoreData = function () {//加载更多数据的方法
        if ($scope.selectStatus == 1) {//安装任务：1
          $scope.loadMoreInstallTaskData();
        } else {//通知单
          $scope.loadMoreNotificationData();
        }
        $scope.$broadcast('scroll.infiniteScrollComplete');//it should broadcast the scroll.infiniteScrollComplete event from your controller
      };
      $scope.initNotificationList = function () {//初始化通知单列表
        $scope.doRefreshNotificationData();
      };
      $scope.initInstallTaskData = function () {//初始化通知单列表
        if ($scope.installTaskList.length == 0) {//如果还没有数据,第一次点击[任务列表]的tab时候
          $scope.doRefreshInstallTaskListData();
        }
      };
      $scope.initNotificationList();//第一次进入页面时候加载
      //筛选备选项
      InstallService.getDicOfWorkAnchor(function (res) {
        $scope.workAnchors = res;
        // console.log(res);
      });
      InstallService.getDicOfArea(function (res) {
        $scope.areas = res;
        console.log(res);
      });
      InstallService.getDicOfWorkOrderStatus(function (res) {
        $scope.taskStatus = res;
        console.log(res);
      });
      InstallService.getDicOfInstallTaskStatus(function (res) {
        $scope.installTaskStatus = res;
        console.log($scope.installTaskStatus);
      });
      $scope.assignTaskList = [];

      //选择状态
      $scope.selectTitleTab = function (orderStatus) {
        //tab 标志位 （0，定维通知单 1，定维任务）
        $scope.selectStatus = orderStatus;
        //改变tab 样式（0，选中"定维通知单" 1，选中"定维任务"）
        for (var i = 0; i < 2; i++) {
          if (orderStatus == i) {
            $scope.status[i].ele = "active";
          } else {
            $scope.status[i].ele = "";
          }
        }
        //点击tab 也要切换筛选的modelView
        $scope.switchFilter();
        if (orderStatus == 0) {
          // $scope.initNotificationList();
        } else {
          $scope.initInstallTaskData();
        }
      };
      /************  分派任务 在线请求部分 begin ************/
      //todo maybe change params List
      $scope.params = {
        taskId: null,
        machineId: null,
        projectName: null,
        anchor: null,  //全年检，半年检等
        status: null,
        planBeginDate: null,
        planEndDate: null
      };

      //切换 筛选界面
      $scope.switchFilter = function () {
        if ($scope.selectStatus == 0) {
          $ionicModal.fromTemplateUrl("views/install/assignTaskFilter.html", {
            scope: $scope,
            animation: "slide-in-up"
          }).then(function (modal) {
            $scope.filterModal = modal;
          });
        } else {
          $ionicModal.fromTemplateUrl("views/install/installTaskFilter.html", {
            scope: $scope,
            animation: "slide-in-up"
          }).then(function (modal) {
            $scope.filterModal = modal;
          });
        }
      };
      $scope.switchFilter();
      //点击筛选按钮
      $scope.filterData = function () {
        $scope.filterModal.show();
      };
      //点击 筛选页面 的返回按钮
      $scope.backButtonAction = function () {
        $scope.filterModal.hide();
        $scope.initFilterParams($scope.selectStatus);
      };
      $scope.queryByCondition = function () {

        $scope.pageNumber = 1;
        if ($scope.selectStatus == 0) {
          var params = $scope.paramsOfAsignFilter;
          if (params.planBeginDate != null && params.planEndDate != null && (params.planBeginDate > params.planEndDate)) {
            Popup.loadMsg("计划开始时间不能晚于计划结束时间", 1500);
          } else {
            $scope.filterModal.hide();
            $scope.assignTaskList = [];
            $scope.loadMoreNotificationData();
          }

        } else {
          $scope.paramsOfTaskFilter.planBeginDate=DateUtil.searchStartDate($scope.paramsOfTaskFilter.planBeginDate);
          $scope.paramsOfTaskFilter.planEndDate= DateUtil.searchEndDate($scope.paramsOfTaskFilter.planEndDate);
          var params = $scope.paramsOfTaskFilter;
          if (params.planBeginDate != null && params.planEndDate != null && (params.planBeginDate > params.planEndDate)) {
            Popup.loadMsg("计划开始时间不能晚于计划结束时间", 1500);
          } else {
            $scope.filterModal.hide();
            $scope.installTaskList = [];
            $scope.loadMoreInstallTaskData();
            Popup.delayRun(function () {//200ms滚动到顶部
              $ionicScrollDelegate.scrollTop();
            },null,200);
          }

        }
      };

      //判断角色来显示不同UI
      $scope.isManage = Storage.isManager();
      if (!$scope.isManage) {
        $scope.selectTitleTab(1);
      }
      //筛选 分派任务种类
      $scope.taskAssign = function (notification) {
        // $scope.selectedNotification = notification;
        $scope.notification = notification;
        // modifiedJson.setJsonByWorkorderId(notification.notiseId, notification);
        // console.log("notification" + JSON.stringify(notification));
        $state.go("tab.assigntask", {
          data: {
            notification: notification,
            type: "39"//安装调试39; 定维任务:67; 技改:68
          }
        });
        // $scope.selectWorkId = notification.notiseNo;
      };
      $scope.processTask = function (task) {//接受任务时的处理事件
        var status = task.workorderStatus;
        if (status == maintainTask.taskStatus.unreceived) {//如果是未接受任务
          Popup.confirm("您确定要接受任务吗？", function () {
            SchdleMaintainApi.changeTaskStatus(function (resp) {
              if (resp.success) {
                MaintainTaskRW.queryStatusTextFromDict(maintainTask.taskStatus.received, function (statusName) {
                  var taskJson = angular.fromJson(task.json);
                  taskJson.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = statusName;
                  taskJson.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.received;
                  eamMTInstallWorkOrderFactory.saveWorkOrder(taskJson, function (order) {
                    eamSync.sync(syncFunctions, function (res) {
                      if (res) {
                        Popup.loadMsg("任务开启成功", 800);
                      } else {
                        Popup.loadMsg("任务开始失败", 800);
                      }
                      $scope.doRefreshInstallTaskListData();
                    });
                  });
                });
              }
            }, {
              sequenceNO: "",
              newStatus: 0,//0,接受任务;1,开始任务；2暂停任务；3 恢复任务；4 完成任务；5审核
              taskId: task.workorderId,
              timeStamp: new Date().getTime().toString(),
              info: "info",
              remark: "remark"
            });
          }, function () {
            //if no ,do something here
          });
        } else if (status == maintainTask.taskStatus.received) {//如果是已接受任务
          Popup.confirm("您确定要开始任务吗？", function () {
            SchdleMaintainApi.changeTaskStatus(function (resp) {
              if (resp.success) {
                MaintainTaskRW.queryStatusTextFromDict(maintainTask.taskStatus.processing, function (statusName) {
                  var taskJson = angular.fromJson(task.json);
                  taskJson.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = statusName;
                  taskJson.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.processing;
                  eamMTInstallWorkOrderFactory.saveWorkOrder(taskJson, function (order) {
                    eamSync.sync(syncFunctions, function (res) {
                      if (res) {
                        Popup.loadMsg("任务开启成功", 800);
                      } else {
                        Popup.loadMsg("任务开始失败", 800);
                      }
                      $scope.doRefreshInstallTaskListData();
                    });
                  });
                });
              }
            }, {
              newStatus: 1,//处理中
              taskId: task.workorderId,
              timeStamp: new Date().getTime().toString(),
              info: "info",
              remark: "remark",
              sequenceNO: ""
            });
          }, function () {
            //if no ,do something here
          });
        }
      };//~~~~~~~~~~~~~~~~~~~ processTask end ~~~~~~~~~~~~~~~~~~~

      //从缓存里 找到当前用户的 id 用来判断 里一个项目里那些定维任务 自己可以接受和开始
      $scope.currentUserId = Storage.get("USER_PROFILE") ? Storage.get("USER_PROFILE").id : null;
    })
  .controller("InstallTaskDetailCtrl",
    function ($rootScope, $scope, $ionicModal, $ionicSlideBoxDelegate, $ionicHistory, eamSync,
              $stateParams, $state, SchdleMaintainApi, $ionicBackdrop, OrderService,
              Popup, Store, eamFile, eamMTInstallWorkOrderFactory, Storage, Params, $ionicScrollDelegate, InstallService,
              $ionicActionSheet, $cordovaCamera, eamDB, modifiedJson, MaintainTaskRW) {
      // $scope.baseInstallTaskInfo = $stateParams.data.baseInstallTaskInfo;
      // console.log($scope.baseInstallTaskInfo);
        $scope.baseInstallTaskInfo = $stateParams.data;
        // console.log($stateParams.data);
        //json
        $scope.installTaskDetailInfo = angular.fromJson($scope.baseInstallTaskInfo.json);
        // $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.assignPerson = $scope.baseInstallTaskInfo.assignPerson;
        // angular.copy($scope.baseInstallTaskInfo.assignPerson, $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.assignPerson);
        // console.log($scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.assignPerson);
        // angular.copy($scope.baseInstallTaskInfo.assignPersonName, $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.assignPersonName);
        //
        // console.time("baseCopy");
        angular.forEach($scope.baseInstallTaskInfo,function (value1, key1) {
            angular.forEach($scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderinfoDto,function (value2, key2) {
               // var inner = this;
                if(key1 === key2){
                    if(!value2){
                        this[key2]=value1;
                    }
                }
            },$scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderinfoDto);
        },$scope.baseInstallTaskInfo);
        console.timeEnd("baseCopy");
        // console.log($scope.baseInstallTaskInfo);
        // console.log($scope.installTaskDetailInfo);
        // 详情中显示信息
        // $scope.taskInfoForWeb = $scope.taskDetailInfo['workorderDetails']["eaWoWorkorderinfoDto"];
        // 详情中显示信息
        $scope.taskInfoForWeb = $scope.installTaskDetailInfo['workorderDetails']["eaWoWorkorderinfoDto"];
      // $scope.installTaskDetailInfo = $stateParams.data.installTaskDetailInfo;
      $scope.taskId = $scope.baseInstallTaskInfo.workorderId;
      $scope.webInfo = $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderinfoDto;
      $scope.isManager = Storage.isManager();//是否是经理x
      //assignPerson 其实记录的是被分派人的id这里PC端字段也有歧义。且一条安装调试的通知单 被分派给一个作业人后，生成的任务单中看不到分派人的信息，页也看不到被分派人的信息，只有一个现场经理人的信息，且需求上这个现场经理并没不一定执行一条工单。我认为是需求有缺陷，工单怎么能不记录分派人和被分派人呢。
      $scope.assignPerson = $scope.baseInstallTaskInfo.assignPerson;
      console.log($scope.installTaskDetailInfo);
      var syncFunctions = ['eamMTInstallWorkOrderFactory.uploadWorkOrders', 'eamMTInstallWorkOrderFactory.downLoadWorkOrders'];
      $scope.isShowScheduledTaskkDetail = false;
      $scope.showScheduledTaskkDetail = function () {
        /**=======动画开始======**/
        var divTopItems = $('.click-hide-item-action').children();
        var divItems = $('#id-plan-detail').children();
        $scope.isShowScheduledTaskkDetail = !$scope.isShowScheduledTaskkDetail;
        if ($scope.isShowScheduledTaskkDetail) {
          $('.div-buttons-items-action').hide();
          $.each(divTopItems, function (i, ele) {
            $(ele).slideUp(100);
          });
          $.each(divItems, function (i, ele) {
            $(ele).hide();
          });
          $.each(divItems, function (i, ele) {
            $(ele).fadeIn(100 + i * 100);
          });

        } else {
          $('.div-buttons-items-action').fadeIn(300);
          $.each(divTopItems, function (i, ele) {
            $(ele).fadeIn(100 + 100 * i);
          });
          $.each(divItems, function (i, ele) {
            $(ele).fadeOut(100 + i * 100, function () {
              $scope.isbuttonsShow = !$scope.isbuttonsShow;
            });
          });
        }
      };
      /**<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<动画结束<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<**/
      var verifyListData = [];
      var suspendListData = [];
      $scope.imgFiles = $scope.installTaskDetailInfo.workorderDetails.eaWoFilemappingList;
      verifyListData = $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList ? $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList:[];
      suspendListData = $scope.installTaskDetailInfo.workorderDetails.eaWoPauseDtoList ? $scope.installTaskDetailInfo.workorderDetails.eaWoPauseDtoList:[];
      $scope.downloadImage = function (image, index) {
        var filePath = image.filePath;
        var fileId = image.fileId;
        eamFile.openEamAttachedFile(image);
      };//downloadImage end·······
      $scope.uploadIfOnline = function (callback, cbNotOk) {
        SchdleMaintainApi.checkNetStatus(function (resp) {
          if (resp.retCode = "0000") {
            eamSync.sync(syncFunctions, function (res) {
              callback(res);
            })
          } else {
            if (angular.isFunction(cbNotOk)) {
              cbNotOk();
            }
          }
        });
      };
      $scope.verifyData = [];
      $scope.suspendData = [];
      $scope.isShowVerifyList = false;
      $scope.showVerifyList = function () {
        $scope.verifyData = verifyListData;
        $scope.suspendData = [];
        $scope.isShowVerifyList = true;
      };
      $scope.showSuspendList = function () {
        $scope.suspendData = suspendListData;
        $scope.verifyData = [];
        $scope.isShowVerifyList = false;
      };
      //跳转到 详情展示
      $scope.goToInstallDetailShow =function () {
          $state.go("tab.installDetailShow",{
            data :  $scope.installTaskDetailInfo
          });
      };

      //跳转到 暂停记录列表
      $scope.goToPauseList = function () {
          $state.go("tab.installPauseList", {
            data :  $scope.installTaskDetailInfo.workorderDetails.eaWoPauseDtoList
          })
      };

      //跳转到 审核记录列表
      $scope.goToVerifyList = function () {
          $state.go("tab.installVerifyList" ,{
            data : $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList
          });
      };
      $scope.navigateToStdMaterial = function () {
        $state.go("tab.scheduledMaintainTaskStdMaterial", {
          data: $scope.installTaskDetailInfo

        });
      };
      $scope.navigateToInstrucktor = function () {
        $state.go("tab.instructor", {
          data: $scope.installTaskDetailInfo
        });
      };
      $scope.goToWorkorderCheckList = function () {
        $state.go("tab.checkList", {
          data: $scope.installTaskDetailInfo
        });
      };
      //跳转人员报工界面
      $scope.goToPeopleReport = function () {
        $state.go("tab.workHours", {
          data: $scope.installTaskDetailInfo
        });
      };

      //跳转到审核界面 界面共用
      $scope.goToVerifyOrder = function () {
          console.log($scope.taskBaseInfo);
          $state.go('tab.verifyInstallOrder',{
              data:{
                  detailFaultOrder : $scope.installTaskDetailInfo,
                  baseFaultOrder : $scope.baseInstallTaskInfo,
                  workOrderCode : $scope.baseInstallTaskInfo.workorderCode,
                  workOrderType : $scope.baseInstallTaskInfo.workorderType //工单类型 0 为故障工单  1 为 三工单
              }
          })
      };

        var initStatusPauseReason = function (callback) {
            OrderService.getDicListByType("pause_reason", function (res) {
                //暂停原因 列表
                $scope.pauseReasons = [];
                //暂停描述 初始化为 ''
                $scope.pauseInfoFromModal.remark = "";
                angular.forEach(res, function (data) {
                    $scope.pauseReasons.push({
                        "isChecked": false,
                        "resultCode": data.detailId,
                        "desc": data.detailName
                    });
                    if ($.isFunction(callback)) {
                        callback();
                    }
                });
                // $scope.pauseReasons.push({
                //     "isChecked" : false,
                //     "resultCode" : res.detailId,
                //     "desc" : res.detailName
                //   });
            });
        };

        //暂停modal收集的信息
        $scope.pauseInfoFromModal = {
            "remark": "",
            "pauseReasons": []
        };


        var openModal = function () {
            $scope.pauseInfoFromModal = {
                "remark": "",
                "pauseReasons": []
            };
            initStatusPauseReason(function () {
                $scope.modal.show();
            });

        };
        var closeModal = function () {
            $scope.pauseInfoFromModal = {
                "remark": "",
                "pauseReasons": []
            };
            initStatusPauseReason(function () {
                $scope.modal.hide();
            });
        };

        //暂停处理状态 --- 无暂停原因
        $scope.pauseOrder = function (order) {
            openModal();
        };

      $ionicModal.fromTemplateUrl("views/schdlemaintain/maintainTaskPause.html", {
        scope: $scope,
        animation: 'slide-in-up'
      }).then(function (modal) {
        $scope.modal = modal;
      });


      $scope.pauseBackBtnAction = function () {
      closeModal();
    };

      $scope.pauseInfoConfirmed = function () {//确定“暂停信息采集”,暂停任务后，状态为暂停
        var pauseIds = [];
        for (var i = 0; i < $scope.pauseReasons.length; i++) {
          var pauseReason = $scope.pauseReasons[i];//"isChecked":false "resultCode":"149","desc":"现场因素"
          if (pauseReason.isChecked) {
            $scope.pauseInfoFromModal.pauseReasons.push(pauseReason.desc);
            pauseIds.push(pauseReason.resultCode);
          }
        }
        if ($scope.pauseInfoFromModal.pauseReasons.length == 0) {
          Popup.promptMsg("请选择原因");
          $("div.popup-container>div.popup").css("border-radius", "5%");
          return;
        }
        var nowDate = new Date();
        suspendListData.unshift({
          pauseId: "",//暂停编号
          workorderId: $scope.taskId,//工单Id
          pausereasonId: pauseIds.join(","),//暂停原因id
          pausereasonName: $scope.pauseInfoFromModal.pauseReasons.join(","),//暂停原因名称
          pauseRemark: $scope.pauseInfoFromModal.remark,//暂停描述
          status: 154,//暂停/开启状态
          statusName: "暂停",//暂停/开启状态名称
          activeFlag: 0,//有效标志
          createBy: Storage.getProfile()['id'],//暂停人
          createOn: nowDate.format("yyyy-MM-dd hh:mm")//暂停时间
        });

          if(suspendListData[0]["pauseRemark"].len4FullWidthCharacterNChinese(3) > 100){
              Popup.promptMsg("备注字数最大不超过100个字符，请减少字数,中文按三个字符计算");
              return;
          }else {
              $scope.installTaskDetailInfo.workorderDetails.eaWoPauseDtoList = suspendListData;
          }


        $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.pause;


        $scope.webInfo.workorderStatus = 144;
        $scope.webInfo.workorderStatusName = "暂停";

        eamMTInstallWorkOrderFactory.changeWorkOrderStatusThreeOrder(144, $scope.installTaskDetailInfo, function (savedOrder){
            angular.copy(savedOrder, $scope.installTaskDetailInfo);
            savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
            angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.baseInstallTaskInfo);//目的是同步改变故障工单列表的信息
            console.log("pauselist ", $scope.installTaskDetailInfo.workorderDetails.eaWoPauseDtoList);
            closeModal();
        });

      };



        //恢复处理
        $scope.recoveryOrder = function (order) {
            Popup.confirm("您确定要恢复么？", function () {
                // console.log($scope.faultOrderDetailInfo);
                console.log(order);
                //暂停列表中  记录恢复操作
                suspendListData = $scope.installTaskDetailInfo.workorderDetails.eaWoPauseDtoList || [];
                // ($scope.taskId.toString() + (suspendListData.length < 10 ? '0'+suspendListData.length:suspendListData.length)).toValue
                var nowDate = new Date();
                suspendListData.unshift({
                    pauseId: null,//暂停编号
                    workorderId: $scope.taskId,//工单Id
                    pausereasonId: null,//暂停原因id
                    pausereasonName: null,//恢复
                    pauseRemark: null,//暂停描述
                    status: 155,//暂停/开启状态
                    statusName: "恢复",//暂停/开启状态名称
                    activeFlag: 0,//有效标志
                    createBy: Storage.getProfile()['id'],//暂停人
                    createOn: nowDate.format("yyyy-MM-dd hh:mm")//暂停时间
                });
                $scope.installTaskDetailInfo.workorderDetails.eaWoPauseDtoList = suspendListData;

                $scope.webInfo.workorderStatus = 141;
                $scope.webInfo.workorderStatusName = "处理中";
                // order.workorderStatus = 141;
                // order.workorderStatusName = "处理中";
                // 恢复一个工单后 更新基本信心里面的状态 和 详细信息里面的状态
                eamMTInstallWorkOrderFactory.changeWorkOrderStatusThreeOrder(141, $scope.installTaskDetailInfo, function (savedOrder) {
                    angular.copy(savedOrder, $scope.installTaskDetailInfo);
                    savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
                    angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.baseInstallTaskInfo);
                })
            });
        };



      $scope.verified = function () {//审核通过
        Popup.popup({
          title: "审核通过信息描述",
          subTitle: "审核通过原因",
          scope: $scope,
          template: '<input type="text" autofocus="autofocus" placeholder="请输入原因描述" ng-model="verifiedInfo.reason">',
          buttons: [
            {
              text: '取消',
              type: 'button-default',
              onTap: function (e) {
                // e.preventDefault();
              }
            },
            {
              text: "确认",
              type: "button-positive",
              onTap: function (e) {//审核通过
                if (!$scope.verifiedInfo.reason) {
                  e.preventDefault();
                  Popup.promptMsg("请您输入原因描述");
                  $("div.popup-container>div.popup").css("border-radius", "5%");
                } else {
                  var pass = {
                    auditingId: null,
                    workorderId: $scope.taskId,
                    auditingResult: 91,
                    auditiogResultName: "通过",
                    auditingOpinion: $scope.unVerifiedInfo.reason,
                    activeFlag: 0,
                    auditingUser: Storage.getProfile()["id"],
                    auditingDate: new Date().format("yyyy-MM-dd")
                  };
                  $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList.push(pass);
                  verifyListData = $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList;
                  eamMTInstallWorkOrderFactory.getStatusNameByOrderStatus(maintainTask.taskStatus.completed, function (name) {
                    $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.completed;
                    $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = name || "确认完工";
                    $scope.saveScheduleTask();
                  });
                }
              }
            }
          ]
        });
        $("div.popup-container>div.popup").css("border-radius", "5%");
      };
      $scope.unVerified = function () {//审核未通过
        Popup.popup({
          title: "审核未通过信息描述",
          subTitle: "未通过原因",
          scope: $scope,
          template: '<input type="text" autofocus="autofocus" placeholder="请输入原因描述" ng-model="unVerifiedInfo.reason">',
          buttons: [
            {
              text: '取消',
              type: 'button-default',
              onTap: function (e) {
                // e.preventDefault();
              }
            },
            {
              text: "确认",
              type: "button-positive",
              onTap: function (e) {//审核未通过
                if (!$scope.unVerifiedInfo.reason) {
                  e.preventDefault();
                  Popup.promptMsg("请您输入原因描述");
                  $("div.popup-container>div.popup").css("border-radius", "5%");
                } else {
                  var unpass = {
                    auditingId: null,
                    workorderId: $scope.taskId,
                    auditingResult: 92,
                    auditiogResultName: "不通过",
                    auditingOpinion: $scope.unVerifiedInfo.reason,
                    activeFlag: 0,
                    auditingUser: Storage.getProfile()['id'],
                    auditingDate: new Date().format("yyyy-MM-dd")
                  };
                  $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList.push(unpass);
                  verifyListData = $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList;
                  eamMTInstallWorkOrderFactory.getStatusNameByOrderStatus(maintainTask.taskStatus.processing, function (name) {
                    $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.processing;
                    $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = name || "处理中";
                    $scope.saveScheduleTask();
                  });
                }
              }
            }
          ]
        });
      };
      $scope.saveScheduleTask = function () {//保存
        eamMTInstallWorkOrderFactory.saveWorkOrder($scope.installTaskDetailInfo, function (order) {
            order['apiWorkorderBaseInfoDto'].json = JSON.stringify(order);
            angular.copy(order['apiWorkorderBaseInfoDto'], $scope.baseInstallTaskInfo);
            console.log($scope.baseInstallTaskInfo);
            // $scope.taskBaseInfo = savedOrder;
            Popup.delayRun(function () {
                $ionicHistory.goBack();
            }, "", 600);
          // $scope.uploadIfOnline(function (res) {
          //   // console.log(res);
          //   order['apiWorkorderBaseInfoDto'].json = JSON.stringify(order);
          //   angular.copy(order['apiWorkorderBaseInfoDto'], $scope.baseInstallTaskInfo);
          //   if (res) {
          //     Popup.loadMsg("同步数据成功", 500);
          //     eamMTInstallWorkOrderFactory.orderOnSyncSuccess(order['apiWorkorderBaseInfoDto']["workorderId"], function (dbOrder) {
          //       angular.copy(dbOrder, $scope.baseInstallTaskInfo);
          //     });
          //     Popup.delayRun(function () {
          //       $ionicHistory.goBack();
          //     }, "", 800);
          //   } else {
          //     Popup.loadMsg("同步数据失败", 500);
          //     Popup.delayRun(function () {
          //       $ionicHistory.goBack();
          //     }, "", 800);
          //   }
          // }, function () {
          //   Popup.loadMsg("成功缓存数据", 500);
          //   Popup.delayRun(function () {
          //     $ionicHistory.goBack();
          //   }, "", 800);
          // });
        })
      };
      $scope.taskCompleted = function () {//完成任务,等待审核
        Popup.popup({
          title: "确认完成？",
          scope: $scope,
          buttons: [
            {
              text: '取消',
              type: 'button-default',
              onTap: function (e) {
                // e.preventDefault();
              }
            },
            {
              text: "确认",
              type: "button-positive",
              onTap: function (e) {
                $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.finishedUnaudited;
                eamMTInstallWorkOrderFactory.getStatusNameByOrderStatus(maintainTask.taskStatus.finishedUnaudited, function (name) {
                  $scope.installTaskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = name || "已完工待确认";
                  $scope.saveScheduleTask();
                });
              }
            }
          ]
        });
        $("div.popup-container>div.popup").css("border-radius", "5%");
      };
      $scope.unVerifiedInfo = {//未审核通过收集的信息
        "reason": ""
      };
      $scope.verifiedInfo = {
        "reason": ''
      };
      $scope.pauseReasons = Store.getPauseReasons();
      $scope.pauseInfoFromModal = {//暂停modal收集的信息
        "remark": "",
        "pauseReasons": []
      };
      $scope.uploadFile = "";
      $scope.deleteAttachedImage = function (item, index, task) {
        if (task.workorderStatus != maintainTask.taskStatus.processing) {//不是处理中就不进行操作
          return;
        }
        // var index = $scope.imgFiles.indexOf(item);
        eamFile.removeAttachedFile()
          .then(function () {
            $scope.imgFiles.splice(index, 1);
          },function (err) {
            Popup.promptMsg(JSON.stringify(err),"删除附件失败")
          })
      };
      $scope.addAttachment = function (task) {
        if (task.workorderStatus != maintainTask.taskStatus.processing) {//不是处理中就不进行操作
          return;
        }
        eamFile.getPicture({
          source: AttachedFileSources.workorder_detail_source,
          workorderId: $scope.taskId,
          fileActualName: "定维_" + $scope.baseInstallTaskInfo.workorderId + "_" + $scope.baseInstallTaskInfo.workorderCode
        }).then(function (fileItem) {
          $scope.imgFiles.push(fileItem);
        }, function (err) {
          Popup.promptMsg(JSON.stringify(err), "获取附件失败")
        });
      };  //end addAttachment();

      //从缓存里 找到当前用户的 id 用来判断 里一个项目里那些定维任务 自己可以接受和开始
      $scope.currentUserId = Storage.get("USER_PROFILE").id;
    })
    .controller("installDetailShowCtrl", function ($scope, $ionicHistory, $cordovaFile, $timeout, $stateParams, $cordovaFileTransfer , Popup, eamFile, eamMTInstallWorkOrderFactory, MaintainTaskRW, Storage ) {
        console.log("scheduleDetailShow :" ,$stateParams.data );
        $scope.allOrderData = $stateParams.data;
        $scope.baseTaskInfo = $stateParams.data.apiWorkorderBaseInfoDto;
        $scope.detailTaskInfo = $stateParams.data.workorderDetails;

        $scope.taskInfoForWeb = $scope.detailTaskInfo["eaWoWorkorderinfoDto"];
        $scope.imgFiles = $stateParams.data.workorderDetails.eaWoFilemappingList;//附件列表

        // $scope.responsiblePersion = "";
        // MaintainTaskRW.getResponsiblePerson($scope.baseTaskInfo.assignPerson,function (res) {
        //     if(res){
        //         $scope.responsiblePersion = res;
        //     }
        // });

        $scope.currentUserId = Storage.get("USER_PROFILE").id;

        $scope.isCanEditImg = function () {
            return $scope.baseTaskInfo.assignPerson == $scope.currentUserId && $scope.baseTaskInfo.workorderStatus == 141;
        };

        $scope.remark = $scope.detailTaskInfo.eaWoWorkorderinfoDto.remark;
        // $scope.remark = $scope.detailTaskInfo.eaWoWorkorderinfoDto;
        // angular.copy(res);
        console.log("remark: " ,$scope.remark == $scope.detailTaskInfo.eaWoWorkorderinfoDto.remark);
        $scope.downloadImage = function (image, index) {
            var filePath = image.filePath;
            var fileId = image.fileId;
            eamFile.openEamAttachedFile(image).then();
        };//downloadImage end·······

        $scope.deleteAttachedImage = function (item, index, task) {
            if (task.workorderStatus != maintainTask.taskStatus.processing) {//不是处理中就不进行操作
                return;
            }
            // var index = $scope.imgFiles.indexOf(item);
            eamFile.removeAttachedFile(item).then(function () {
                $scope.imgFiles.splice(index, 1);
            },function (err) {
                Popup.promptMsg(JSON.stringify(err),"获取附件失败")
            });
        };

        $scope.addAttachment = function (task) {
            if (task.workorderStatus != maintainTask.taskStatus.processing) {//不是处理中就不进行操作
                return;
            }
            eamFile.getPicture({
                source:AttachedFileSources.workorder_detail_source,
                workorderId:$scope.baseTaskInfo.workorderId,
                fileActualName:"定维_"+$scope.taskInfoForWeb.workorderId+"_"+$scope.taskInfoForWeb.workorderCode
            }).then(function (fileItem) {
                $scope.imgFiles.push(fileItem);
            },function (err) {
                Popup.promptMsg(JSON.stringify(err),"获取附件失败")
            });
        };  //end addAttachment();

        $scope.saveDetailInfo = function(){
            Popup.confirm("确定要保存详情信息吗？",function () {
                eamMTInstallWorkOrderFactory.saveWorkOrder($scope.allOrderData, function (res) {
                    if(res){
                        console.log("remark: " ,$scope.remark == $scope.detailTaskInfo.eaWoWorkorderinfoDto.remark);
                        console.log("保存后信息" ,res);
                    }
                    $ionicHistory.goBack();
                });
            },function () {

            },"确定","取消");

        }
    })
;
