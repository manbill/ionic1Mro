/*
 * 技改模块
 * */
starter
//安装调试列表
  .controller("ReformCtrl",
    function ($rootScope, $scope, $state, Storage,
              MaintainTaskRW, InstallService, eamSyncAjax,
              OrderService, eamSync, ReformService, modifiedJson,
              eamMTInstallWorkOrderFactory,$ionicScrollDelegate,
              Popup, $ionicModal, SchdleMaintainApi) {
      //默认选中左边的 tab
      var api_getSystemTime = baseUrl + "/api/common/getSystemTime.api";
      $scope.selectStatus = 0;//默认是分派任务
      //任务分派/安装任务 tab 切换 标示当前在哪个页面的数据结构
      $scope.status = [{
        "ele": "active"
      }, {
        "ele": ""
      }];
      var syncFunctions = ["eamMTInstallWorkOrderFactory.uploadWorkOrders", "eamMTInstallWorkOrderFactory.downLoadWorkOrders"];
      //从缓存里 找到当前用户的 id 用来判断 里一个项目里那些定维任务 自己可以接受和开始
      $scope.currentUserId = Storage.get("USER_PROFILE").id;
      console.log("$scope.currentUserId:" + $scope.currentUserId);
      $scope.now_server_date = new Date();
      $scope.isUpdateServerDate = false;
      $scope.reformTaskList = [];
      $scope.pageNumber = 1;
      $scope.scrollPostion = null /*{left:null,top:null,zoom:null}*/;//滚动的位置
      $scope.isMoreReformTaskData = false;//是否没有更多安装任务数据,需是false
      $scope.isMoreAssignTaskData = true;//是否没有更多分派任务数据
      $scope.loadMoreReformTaskData = function () {//加载安装任务数据
        var params = {
          pageNumber: $scope.pageNumber
        };
        $.extend(params, $scope.paramsOfTaskFilter);
        console.log(params);
        eamMTInstallWorkOrderFactory.loadMoreTechOrders(params, function (res) {
          if (res.length > 0) {
            $scope.reformTaskList = $scope.reformTaskList.concat(res);
            console.log("技改 任务单 ", $scope.reformTaskList);
            $scope.isMoreReformTaskData = true;
            $scope.pageNumber++;
          } else {
            $scope.isMoreReformTaskData = false;
          }
          $scope.$broadcast('scroll.refreshComplete');
          $scope.$broadcast('scroll.infiniteScrollComplete');
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
              transNoticeNo: null,
              workorderCode: null,
              projectName: null
            };
          } else {//任务列表
            //安装任务列表 筛选 参数
            $scope.paramsOfTaskFilter = {
              workorderCode: null,
              projectName: null,
              planBegindate: null,
              planEnddate: null,
              // assignPerson: null,
              positionCode: null,
              transNoticeNo: null
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
      $scope.doRefreshReformTaskListData = function () {//刷新安装任务列表
        $scope.initFilterParams($scope.selectStatus, function () {
          $scope.reformTaskList = [];
          if ($rootScope.isOnline) {
              ReformService.uploadIfOnline(function () {
                  eamSync.sync(syncFunctions, function (res) {//此处是异步完成
                      if (res) {
                          Popup.loadMsg("同步数据成功");
                      } else {
                          Popup.loadMsg("同步失败")
                      }
                      $scope.loadMoreReformTaskData();//有网络且同步成功
                  }, function () {
                      $scope.loadMoreReformTaskData();//网络不通
                  });
              });
            } else {
          $scope.loadMoreReformTaskData();//离线
          }
        });
      };
      //todo 在线的时候 调用API 获取 任务分派列表
      $scope.getTaskAssignListFromNet = function () {
        Popup.waitLoad("正在从网络获取通知单……");
        SchdleMaintainApi.getSchdleNotificationList(function (resp) {
            Popup.hideLoading();
            // Popup.waitLoad("正在获取通知单……");
          if (resp.success) {
            Popup.waitLoad("获取成功,正在合并通知单……");
            ReformService.mergeNotification(resp.data, function () {
              Popup.hideLoading();
              $scope.loadMoreNotificationData();
            });
          } else {
            eamSync.synclog("请检查网络" + JSON.stringify(resp.retInfo));
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
          stage: "trans_stage"//技改任务应该传 project_stage  定期维护："service_stage"；安装调试："construct_stage"；技改整改："trans_stage"
        });
      };
      $scope.$on('$ionicView.beforeEnter', function () {
        if ($scope.selectedNotification) {
          var selectedNotification = modifiedJson.getJsonByWorkorderId($scope.selectedNotification.notiseId);
          if (selectedNotification) {
            $scope.selectedNotification.statusName = selectedNotification.statusName;
          }
        }
      });
      $scope.doRefresh = function () {
        if ($scope.selectStatus == 0) {
          $scope.$broadcast('scroll.refreshComplete');
          $scope.doRefreshNotificationData();
        } else {
          $scope.doRefreshReformTaskListData();
        }
      };
      $scope.loadMoreNotificationData = function () {//加载更多通知单数据
        // console.log($scope.paramsOfAsignFilter);
        // console.log($scope.pageNumber);
        ReformService.queryNotificationData($scope.pageNumber, $scope.paramsOfAsignFilter, function (res) {
          $scope.$broadcast('scroll.refreshComplete');
          $scope.$broadcast('scroll.infiniteScrollComplete');//it should broadcast the scroll.infiniteScrollComplete event from your controller
          if (res.length > 0) {
            console.log("assignTaskList:" + res);
            $scope.assignTaskList = $scope.assignTaskList.concat(res);
            $scope.pageNumber++;
            $scope.isMoreAssignTaskData = true;
          } else {
            $scope.isMoreAssignTaskData = false;
          }
        });
      };
      $scope.goReformTaskDetail = function (task) {
        if (!$rootScope.auth['auth_460106'] || ((task.workorderStatus == maintainTask.taskStatus.received ) || task.workorderStatus == maintainTask.taskStatus.unreceived)) {
          return
        }
        $scope.selectedTask = task;
        $state.go("tab.reformTaskDetail", {
          data: task
        });
      };
      $scope.loadMoreData = function () {//加载更多数据的方法
        if ($scope.selectStatus == 1) {//安装任务：1
          $scope.loadMoreReformTaskData();
        } else {//通知单
          $scope.loadMoreNotificationData();
        }
        $scope.$broadcast('scroll.infiniteScrollComplete');//it should broadcast the scroll.infiniteScrollComplete event from your controller
      };
      $scope.initNotificationList = function () {//初始化通知单列表
        $scope.doRefreshNotificationData();
      };
      $scope.initReformTaskData = function () {//初始化通知单列表
        if ($scope.reformTaskList.length == 0) {//如果还没有数据,第一次点击[任务列表]的tab时候
          $scope.doRefreshReformTaskListData();
        }
      };
      ReformService.getDicOfArea(function (res) {
        $scope.areas = res;
        // console.log(res);
      });
      ReformService.getDicOfNotificationStatus(function (res) {
        $scope.taskStatus = res;
        // console.log(res);
      });
      ReformService.getDicOfReformTaskStatus(function (res) {
        $scope.reformTaskStatus = res;
        // console.log($scope.reformTaskStatus);
      });
      $scope.assignTaskList = [];
      //选择状态
      $scope.selectTitleTab = function (orderStatus) {
        //tab 标志位 （0，定维通知单 1，定维任务）
        $scope.selectStatus = orderStatus;
        //改变tab 样式（0，选中"定维通知单" 1，选中"定维任务"）
        // $scope.status[orderStatus].ele="active1";
        // for (var i = 0; i < 2; i++) {
        //   if (orderStatus == i) {
        //     $scope.status[i].ele = "active1";
        //   } else {
        //     $scope.status[i].ele = "";
        //   }
        // }
        //点击tab 也要切换筛选的modelView
        $scope.switchFilter();
        if (orderStatus == 0) {
          // $scope.initNotificationList();
        } else {
          $scope.initReformTaskData();
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
          $ionicModal.fromTemplateUrl("views/reform/notificationFilter.html", {
            scope: $scope,
            animation: "slide-in-up"
          }).then(function (modal) {
            $scope.filterModal = modal;
          });
        } else {
          $ionicModal.fromTemplateUrl("views/reform/taskFilter.html", {
            scope: $scope,
            animation: "slide-in-up"
          }).then(function (modal) {
            $scope.filterModal = modal;
          });
        }
      };

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
          var params = $scope.paramsOfTaskFilter;
          if (params.planBegindate != null && params.planEnddate != null && (params.planBegindate > params.planEnddate)) {
            Popup.loadMsg("计划开始时间不能晚于计划结束时间", 1500);
          } else {
            $scope.filterModal.hide();
            $scope.reformTaskList = [];
            $scope.loadMoreReformTaskData();
            Popup.delayRun(function () {//200ms滚动到顶部
              $ionicScrollDelegate.scrollTop();
            },null,200);
          }
        }
      };
      if ($rootScope.auth['auth_47'] && $rootScope.auth['auth_46']) {//同时具有分派和技改任务的功能
        $scope.selectTitleTab(0);//默认显示分派界面
      } else if ($rootScope.auth['auth_47']) {//只有分派
        $scope.selectTitleTab(0);//默认显示分派界面
      } else if ($rootScope.auth['auth_46']) {
        $scope.selectTitleTab(1);//只有技改任务功能
      } else {//都没有权限

      }
      $scope.switchFilter();
      //筛选 分派任务种类
      $scope.taskAssign = function (notification) {
        // $scope.selectedNotification = notification;
        $scope.notification = notification;
        // modifiedJson.setJsonByWorkorderId(notification.notiseId, notification);
        // console.log("notification" + JSON.stringify(notification));
        $state.go("tab.assigntask", {
          data: {
            notification: notification,
            type: "68"//安装调试39; 定维任务:67; 技改:68
          }
        });
        // $scope.selectWorkId = notification.notiseNo;
      };
      $scope.processTask = function (task) {//接受任务时的处理事件
        console.log(task);
        var taskJson = angular.fromJson(task.json);
        var status = task.workorderStatus;
        if (status == maintainTask.taskStatus.unreceived) {//如果是未接受任务
          Popup.confirm("您确定要接受任务吗？", function () {
            SchdleMaintainApi.changeTaskStatus(function (resp) {
              console.log(resp);
              if (resp.success) {
                MaintainTaskRW.queryStatusTextFromDict(maintainTask.taskStatus.received, function (statusName) {
                  taskJson.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.received;
                  taskJson.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = statusName;
                  eamMTInstallWorkOrderFactory.saveWorkOrder(taskJson, function (order) {
                    $scope.doRefreshReformTaskListData();
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
              console.log(resp);
              if (resp.success) {
                MaintainTaskRW.queryStatusTextFromDict(maintainTask.taskStatus.processing, function (statusName) {
                  taskJson.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.processing;
                  taskJson.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = statusName;
                  eamMTInstallWorkOrderFactory.saveWorkOrder(taskJson, function (order) {
                    $scope.doRefreshReformTaskListData();
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
      $scope.initNotificationList();//第一次进入页面时候加载
      //筛选备选项


    })
  .controller("reformTaskDetailCtrl",
    function ($rootScope, $scope, $ionicModal, $ionicSlideBoxDelegate, $ionicHistory, eamSync,
              $stateParams, $state, SchdleMaintainApi, OrderService, eamFile,
              Popup, Store, Storage, Params, eamMTInstallWorkOrderFactory, $ionicScrollDelegate, ReformService,
              $ionicActionSheet, $cordovaCamera, eamDB, modifiedJson, MaintainTaskRW) {
      $scope.baseTaskInfo = $stateParams.data;
      $scope.taskDetailInfo = angular.fromJson($scope.baseTaskInfo.json);
      console.log($scope.taskDetailInfo);
      $scope.taskDetail = $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto;
      $scope.taskId = $scope.baseTaskInfo.workorderId;
      $scope.isManager = Storage.isManager();//是否是经理
      $scope.isShowReformTaskDetail = false;
      //  详情中 assignPerson 等字段 为空，要从 外层 copy
      angular.forEach($scope.baseTaskInfo, function (value1, key1) {
          angular.forEach($scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto, function (value2, key2) {
              if(key2 === key1){
                  if(!value2){
                      this[key2] = value1;
                  }
              }
          },$scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto)
      },$scope.baseTaskInfo);


      $scope.showReformTaskDetail = function () {
        /**=======动画开始======**/
        var divTopItems = $('.click-hide-item-action').children();
        var divItems = $('#id-plan-detail').children();
        $scope.isShowReformTaskDetail = !$scope.isShowReformTaskDetail;
        if ($scope.isShowReformTaskDetail) {
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
      var syncFunctions = ['eamMTInstallWorkOrderFactory.uploadWorkOrders', 'eamMTInstallWorkOrderFactory.downLoadWorkOrders'];
      var verifyListData = [];
      var suspendListData = [];
      suspendListData = $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList ? $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList :[];
      verifyListData = $scope.taskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList ? $scope.taskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList : [];
      $scope.imgFiles = $scope.taskDetailInfo.workorderDetails.eaWoFilemappingList ? $scope.taskDetailInfo.workorderDetails.eaWoFilemappingList :[];
      $scope.downloadImage = function (image, index) {
        var filePath = image.filePath;
        var fileId = image.fileId;
        eamFile.openEamAttachedFile(image);
      };//downloadImage end·······
      $scope.uploadIfOnline = function (callback) {
        SchdleMaintainApi.checkNetStatus(function (resp) {
          if (resp.retCode = "0000") {
            eamSync.sync(["SyncSchdlemaintain.uploadList", "SyncSchdlemaintain.downloadList"], function () {
              callback();
            })
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
      $scope.navigateToStdMaterial = function () {
        $state.go("tab.scheduledMaintainTaskStdMaterial", {
          data: $scope.taskDetailInfo
        });
      };

      //跳转到 技改详情展示界面
      $scope.goToReformDetailShow = function () {
          $state.go("tab.reformTaskDetailShow" , {
            data : $scope.taskDetailInfo
          })
      };
      //跳转到 暂停列表界面
      $scope.goToPauseList = function () {
        $state.go("tab.reformPauseList" ,{
          data : $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList
        })
      };
      //跳转到 审核记录列表界面
      $scope.goToVerifyList  = function () {
        $state.go("tab.reformVerifyList" ,{
          data : $scope.taskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList
        })
      };

      //跳转到维修记录界面
    $scope.goToRepairRecords  = function () {
        $state.go("tab.reformRepairRecords" ,{
            data : {
                taskDetailInfo: $scope.taskDetailInfo
            }
        })
    };

      $scope.navigateToInstrucktor = function () {
        $state.go("tab.instructor", {
          data: $scope.taskDetailInfo
        });
      };
      $scope.goToWorkorderCheckList = function () {
        $state.go("tab.checkList", {
          data: $scope.taskDetailInfo
        });
      };
      //跳转人员报工界面
      $scope.goToPeopleReport = function () {
        $state.go("tab.workHours", {
          data: $scope.taskDetailInfo
        });
      };
      //跳转 物料请求界面
      // $scope.goToMaterialRequest = function () {
      //   $state.go("tab.materialRequest", {
      //     taskId: $scope.taskId
      //   });
      // };

      //  跳转到审核界面 界面共用
      $scope.goToVerifyOrder = function () {
          $state.go('tab.verifyReformOrder',{
              data:{
                  detailFaultOrder : $scope.taskDetailInfo,
                  baseFaultOrder : $scope.baseTaskInfo,
                  workOrderCode : $scope.baseTaskInfo.workorderCode,
                  workOrderType : $scope.baseTaskInfo.workorderType //工单类型 0 为故障工单  1 为 三工单
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
            console.log("suspendList ",suspendListData );

            if(suspendListData[0]["pauseRemark"].len4FullWidthCharacterNChinese(3) > 100){
                Popup.promptMsg("备注字数最大不超过100个字符，请减少字数,中文按三个字符计算");
                return;
            }else {
                // $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList = suspendListData;
                $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList = suspendListData;
            }

            // $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.pause;


            $scope.taskDetail.workorderStatus = 144;
            $scope.taskDetail.workorderStatusName = "暂停";

            eamMTInstallWorkOrderFactory.changeWorkOrderStatusThreeOrder(144, $scope.taskDetailInfo, function (savedOrder){
                angular.copy(savedOrder, $scope.taskDetailInfo);
                savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
                angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.baseTaskInfo);//目的是同步改变故障工单列表的信息
                console.log("pauselist ", $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList);
                closeModal();
            });

        };



        //恢复处理
        $scope.recoveryOrder = function (order) {
            Popup.confirm("您确定要恢复么？", function () {
                // console.log($scope.faultOrderDetailInfo);
                console.log(order);
                //暂停列表中  记录恢复操作
                suspendListData = $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList || [];
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
                console.log("suspendList ",suspendListData );

                $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList = suspendListData;

                $scope.taskDetail.workorderStatus = 141;
                $scope.taskDetail.workorderStatusName = "处理中";
                // order.workorderStatus = 141;
                // order.workorderStatusName = "处理中";
                // 恢复一个工单后 更新基本信心里面的状态 和 详细信息里面的状态
                eamMTInstallWorkOrderFactory.changeWorkOrderStatusThreeOrder(141, $scope.taskDetailInfo, function (savedOrder) {
                    angular.copy(savedOrder, $scope.taskDetailInfo);
                    savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
                    angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.baseTaskInfo);
                })
            });
        };



      $scope.pauseBackBtnAction = function () {
        closeModal();
      };
      $scope.setStatusName = function (workorderStatus, callback) {
        MaintainTaskRW.queryStatusTextFromDict(workorderStatus, function (statusName) {
          $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = statusName;
          // $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = workorderStatus;
          if ($.isFunction(callback)) {
            callback();
          }
        });
      };
      $scope.onPauseResumeBtnClick = function () {//点击暂停按钮
        if ($scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus == maintainTask.taskStatus.processing) {//暂停任务
          openModal();
        } else {//如果点击时刻是暂停,恢复任务
          Popup.confirm("确认恢复", function ok() {
            $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.processing;
            $scope.saveScheduleTask();
          }, function notOk() {

          });
        }
      };
      // $scope.pauseInfoConfirmed = function () {//确定“暂停信息采集”,暂停任务后，状态为暂停
      //   var pauseIds = [];
      //   for (var i = 0; i < $scope.pauseReasons.length; i++) {
      //     var pauseReason = $scope.pauseReasons[i];//"isChecked":false "resultCode":"149","desc":"现场因素"
      //     if (pauseReason.isChecked) {
      //       $scope.pauseInfoFromModal.pauseReasons.push(pauseReason.desc);
      //       pauseIds.push(pauseReason.resultCode);
      //     }
      //   }
      //   if ($scope.pauseInfoFromModal.pauseReasons.length == 0) {
      //     Popup.promptMsg("请选择原因");
      //     $("div.popup-container>div.popup").css("border-radius", "5%");
      //     return;
      //   }
      //   var nowDate = new Date();
      //   suspendListData.push({
      //     pauseId: "",//暂停编号
      //     workorderId: $scope.taskId,//工单Id
      //     pausereasonId: pauseIds.join(","),//暂停原因id
      //     pausereasonName: $scope.pauseInfoFromModal.pauseReasons.join(","),//暂停原因名称
      //     pauseRemark: $scope.pauseInfoFromModal.remark,//暂停描述
      //     status: 154,//暂停/开启状态
      //     statusName: "暂停",//暂停/开启状态名称
      //     activeFlag: 0,//有效标志
      //     createBy: Storage.getProfile()['id'],//暂停人
      //     createOn: nowDate.format("yyyy-MM-dd hh:mm")//暂停时间
      //   });
      //   $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList = suspendListData;
      //   $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.pause;
      //   $scope.saveScheduleTask();
      //   closeModal();
      // };
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
                  $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.completed;
                  var pass = {
                    auditingId: null,
                    workorderId: $scope.taskId,
                    auditingResult: 91,
                    auditiogResultName: "通过",
                    auditingOpinion: $scope.unVerifiedInfo.reason,
                    activeFlag: 0,
                    auditingUser: Storage.getProfile()['id'],
                    auditingDate: new Date().format("yyyy-MM-dd")
                  };
                  $scope.taskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList.push(pass);
                  verifyListData = $scope.taskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList;
                  $scope.saveScheduleTask();
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
                  $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.processing;
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
                  $scope.taskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList.push(unpass);
                  verifyListData = $scope.taskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList;
                  $scope.saveScheduleTask();
                }
              }
            }
          ]
        });
      };
      $scope.saveScheduleTask = function () {//保存
        var workorderStatus = $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus;
        $scope.setStatusName(workorderStatus, function () {
          eamMTInstallWorkOrderFactory.saveWorkOrder($scope.taskDetailInfo, function (order) {

              order['apiWorkorderBaseInfoDto'].json = JSON.stringify(order);
              angular.copy(order['apiWorkorderBaseInfoDto'], $scope.baseTaskInfo);
              console.log($scope.baseTaskInfo);
              // $scope.taskBaseInfo = savedOrder;
              Popup.delayRun(function () {
                  $ionicHistory.goBack();
              }, "", 600);
        //     order.apiWorkorderBaseInfoDto.json = JSON.stringify(order);
        //     angular.copy(order["apiWorkorderBaseInfoDto"], $scope.taskDetailInfo);
        //     eamSync.sync(syncFunctions, function (success) {
        //       if (success) {
        //         Popup.loadMsg("同步成功!", 500);
        //         eamMTInstallWorkOrderFactory.orderOnSyncSuccess(order.apiWorkorderBaseInfoDto.workorderId, function (dbOrder) {
        //           angular.copy(dbOrder, $scope.taskDetailInfo);
        //           Popup.delayRun(function () {
        //             $ionicHistory.goBack();
        //           }, "", 800);
        //         })
        //       } else {
        //         Popup.loadMsg("同步数据失败!", 500);
        //         Popup.delayRun(function () {
        //           $ionicHistory.goBack();
        //         }, "", 800);
        //       }
        //     });
          })
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
                $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.finishedUnaudited;
                $scope.saveScheduleTask();
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
        eamFile.removeAttachedFile(item)
          .then(function () {
            $scope.imgFiles.splice(index, 1);
          },function (err) {
            Popup.promptMsg(JSON.stringify(err),"删除附件失败")
          })
      };
      $scope.addAttachment = function (task) {
        if (task.workorderStatus != maintainTask.taskStatus.processing) {//不是处理中就不进行操作
          Popup.loadMsg("工单不能添加图片");
          return;
        }
        eamFile.getPicture({
          source: AttachedFileSources.workorder_detail_source,
          workorderId: $scope.taskDetailInfo.workorderId,
          fileActualName: "定维_" + $scope.taskDetailInfo.workorderId + "_" + $scope.taskDetailInfo.workorderCode
        }).then(function (fileItem) {
          $scope.imgFiles.push(fileItem);
        }, function (err) {
          Popup.promptMsg(JSON.stringify(err), "获取附件失败")
        });
      };  //end addAttachment();

      //从缓存里 找到当前用户的 id 用来判断 里一个项目里那些定维任务 自己可以接受和开始
      $scope.currentUserId = Storage.get("USER_PROFILE").id;
    })
    .controller("reformTaskDetailShowCtrl", function ($scope, MaintainTaskRW, $cordovaFile,$ionicHistory, $timeout, $stateParams, $cordovaFileTransfer , Popup, eamFile, eamMTInstallWorkOrderFactory , Storage) {
        console.log("scheduleDetailShow :" ,$stateParams.data );
        $scope.allOrderData = $stateParams.data;
        $scope.baseTaskInfo = $stateParams.data.apiWorkorderBaseInfoDto;
        $scope.detailTaskInfo = $stateParams.data.workorderDetails;

        $scope.taskInfoForWeb = $scope.detailTaskInfo["eaWoWorkorderinfoDto"];
        $scope.imgFiles = $stateParams.data.workorderDetails.eaWoFilemappingList;//附件列表

        $scope.currentUserId = Storage.get("USER_PROFILE").id;

        $scope.isCanEditImg = function () {
            return $scope.baseTaskInfo.assignPerson == $scope.currentUserId && $scope.baseTaskInfo.workorderStatus == 141;
        };

        // $scope.responsiblePersion = "";
        // MaintainTaskRW.getResponsiblePerson($scope.baseTaskInfo.assignPerson,function (res) {
        //     if(res){
        //         $scope.responsiblePersion = res;
        //     }
        // });

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
    .controller("reformRepairRecordsCtrl", function ($scope, $rootScope, $state, MaintainTaskRW, $cordovaFile,$ionicHistory, $timeout, $stateParams,
                                                     $cordovaFileTransfer , Popup, eamFile, eamMTInstallWorkOrderFactory , Storage){

        //工单详情里的 json 数据 taskDetailInfo
        $scope.reformDetailJson = $stateParams.data.taskDetailInfo;
        //是否可编辑flag
        $scope.isCanEditFlag = true;
        //维修记录 列表
        $scope.recordRepairList = $scope.reformDetailJson.repairRecordList.workorderFixInfoDtoList;

        // if($scope.reformDetailJson.repairRecordList.workorderFixInfoDtoList.length > 0){
        //     $scope.recordRepairList = $scope.reformDetailJson.repairRecordList.workorderFixInfoDtoList;
        // }else {
        //     $scope.recordRepairList = [];
        // }

        console.log("list "+ JSON.stringify($scope.recordRepairList, undefined, 2));


        console.log("status--- " + $scope.reformDetailJson.apiWorkorderBaseInfoDto.workorderStatus  + "assign person--- " +  $scope.reformDetailJson.apiWorkorderBaseInfoDto.assignPerson + "auth--- "
            +  $rootScope.auth['auth_460105'])

        //是否能 添加修改维修记录
        $scope.isCanEditRecord = function () {
            if(($scope.reformDetailJson.apiWorkorderBaseInfoDto.workorderStatus == maintainTask.taskStatus.processing )
                && ($scope.reformDetailJson.apiWorkorderBaseInfoDto.assignPerson == Storage.getProfile().id) &&
                $rootScope.auth['auth_460105'] ){
                $scope.isCanEditFlag  = true;
                return true;
            }else {
                $scope.isCanEditFlag  = false;
                return false;
            }
        };


        //添加维修记录
        $scope.createReformRepair = function () {
            $state.go("tab.createReformRepair", {
                data: {
                    "work": $scope.reformDetailJson,
                    "recordRepairList": $scope.recordRepairList,
                    "isCanEdit" :  $scope.isCanEditFlag
                }
            });
        };

        // 跳转到维修记录详情
        $scope.editRecordRepair = function (recordRepair, index) {
            $state.go("tab.reformRecordRepairEdit", {
                data:{
                    "work": $scope.reformDetailJson,//整个工单对象
                    // "recordRepairList": $scope.recordRepairList,//维修列表
                    "recordRepairIndex": index,//选中列表中某一项的索引
                    "isCanEdit" :  $scope.isCanEditFlag
                }
            });
        };


    })


    //新增维修
    .controller("CreateReformRepairCtrl", function ($scope, $state, MaintainTaskRW, $cordovaFile,$ionicHistory, $timeout,
                                                    $stateParams, $cordovaFileTransfer , Popup, eamFile, eamMTInstallWorkOrderFactory ,
                                                    Storage, Params, DeviceTreeService,starterClassFactory, OrderService) {
        $scope.work = $stateParams.data.work;//整个工单对象
        $scope.recordRepairList = $stateParams.data.recordRepairList;//维修记录列表
        $scope.params = {
            fixBeginDate1: null
        };
        var fixType = {//维修类型
            'isChange': 60,//更换设备
            'repair': 61// 维修设备
        };
        $scope.title = '新建维修记录';
        $scope.params = {isChange: false};//维修设备
        $scope.recordRepair = starterClassFactory.workOrderFixInfoInstance();//新建设备维修
        $scope.recordRepair.deviceId = $scope.work.workorderDetails.eaWoWorkorderinfoDto.deviceId;
        $scope.recordRepair.deviceName = $scope.work.workorderDetails.eaWoWorkorderinfoDto.deviceName;//设备名称,默认带出工单内部的设备
        $scope.recordRepair.repairMaterialDtoList = [];//物料消耗列表
        $scope.selectFanEquipment = function (work) {
            $state.go("tab.selectedEquipment", {
                data: work
            });
        };
        $scope.$on('$ionicView.beforeEnter', function () {
            $scope.equipmentDetail = Params.getTransferredObjByKey("selectedEquipment");
            $scope.selectedMaterial = Params.getTransferredObjByKey("selectedMaterial");
            if ($scope.equipmentDetail) {
                $scope.recordRepair.serialNum1 = $scope.equipmentDetail["seriesNo"] + "";
                $scope.recordRepair.deviceName = $scope.equipmentDetail["equipmentName"];
                $scope.recordRepair.deviceId = $scope.equipmentDetail["equipmentId"];
                $scope.recordRepair.originalMaterialSno = $scope.equipmentDetail["materialNo"];
                $scope.recordRepair.wuliaohao1 = $scope.equipmentDetail["materialId"];
                $scope.recordRepair.provider1 = $scope.equipmentDetail["vendorShortname"];
                $scope.recordRepair.guaranteePeriod1 = $scope.equipmentDetail["guaranteePeriod"];
                $scope.params.fixBeginDate1 = $scope.equipmentDetail["warrantySupplierBegindate"];//数据库中的数据是时间戳
                Params.clearTransferredObjByKey("selectedEquipment");
            }
            if ($scope.selectedMaterial) {
                if ($scope.params.isChange) {//设备更换
                    $scope.recordRepair.wuliaohao2 = $scope.selectedMaterial["materialId"];
                    $scope.recordRepair.updateMaterialSno = $scope.selectedMaterial["materialName"];
                }
                Params.clearTransferredObjByKey("selectedMaterial");
            }
        });
        $scope.switchFixType = function () {
            $scope.recordRepair.fixType = $scope.params.isChange ? fixType.isChange : fixType.repair;
        };
        $scope.goToChangedEquipmentDetail = function () {
            $state.go('tab.changeEquipmentDetail', {
                data: {
                    recordRepair: $scope.recordRepair,
                    isCanEditDetail: $stateParams.data.isCanEdit

                }
            });
        };
        /**
         * 增加物料消耗
         */
        $scope.addConsume = function () {
            $state.go("tab.reformRecordRepairEditAddMaterial", {
                data: {
                    selectMateriels : $scope.recordRepair.repairMaterialDtoList
                }
            });
        };
        $scope.saveRecordRepair = function () {
            console.log("$scope.recordRepair" + JSON.stringify($scope.recordRepair, undefined, 2));
            if (!StringUtils.isNotEmpty($scope.recordRepair.fixType)) {
                Popup.promptMsg("请确认维修类型");
                return;
            }
            if (angular.isDate($scope.params.fixBeginDate1)) {
                $scope.recordRepair.fixBeginDate1 = new Date(parseInt($scope.params.fixBeginDate1)).format("yyyy-MM-dd");//后台需要的是这种格式
            }
            if (!$scope.params.isChange) {//维修设备
                if (!StringUtils.isNotEmpty($scope.recordRepair.deviceName)) {
                    Popup.loadMsg("部件名称不能为空");
                    return false;
                }
            }
            if ($scope.params.isChange) {//变更设备
                if (!StringUtils.isNotEmpty($scope.recordRepair.deviceName)) {
                    Popup.loadMsg("部件名称不能为空");
                    return;
                }
                // if (!$scope.recordRepair.serialNum2) {
                //   Popup.loadMsg("请输入部件序列号");
                //   return;
                // }
                // if (!$scope.recordRepair.wuliaohao2) {
                //   Popup.loadMsg("请选择物料");
                //   return;
                // }
                // if (!$scope.recordRepair.provider2) {
                //   Popup.loadMsg("请输入供应商");
                //   return;
                // }
                // if (!$scope.params.fixBeginDate2) {
                //   Popup.loadMsg("请输入质保开始日期");
                //   return;
                // }
                if (angular.isDate($scope.params.fixBeginDate2)) {
                    $scope.recordRepair.fixBeginDate2 = $scope.params.fixBeginDate2.format("yyyy-MM-dd");
                }
                // if (!$scope.params.guaranteePeriod2) {
                //   Popup.loadMsg("请输入质保期");
                //   return;
                // }
                if ($scope.params.guaranteePeriod2) {
                    $scope.recordRepair.guaranteePeriod2 = 2 * $scope.params.guaranteePeriod2;//后台需要存储0.5年的倍数
                }
            }
            //修改json信息
            OrderService.getDicDetailById($scope.recordRepair.fixType, function (res) {
                // console.log("getDicDetailById: " + JSON.stringify(res.rows[0], undefined, 2));
                $scope.recordRepair.fixTypeText = res.rows[0] ? res.rows[0].detailName :
                    $scope.recordRepair.fixType == fixType.isChange ? '更换设备' : "维修设备";
                if (!$scope.recordRepair.workorderId) {//新建,没有id
                    $scope.recordRepair.workorderId = $scope.work.apiWorkorderBaseInfoDto.workorderId;
                }
                $scope.recordRepair.createOn = Date.now();
                $scope.recordRepairList.unshift($scope.recordRepair);
                eamMTInstallWorkOrderFactory.saveWorkOrder($scope.work, function (order) {
                    // Popup.loadMsg("保存成功", 800);
                    Popup.delayRun(function () {
                        $ionicHistory.goBack();
                    }, "创建成功", 1200)
                });
            });
        };

        $scope.deleteRepairMaterialDto = function (index) {//新建的情况下增加的物料消耗直接删除
            $scope.recordRepair.repairMaterialDtoList.splice(index, 1);
            $ionicListDelegate.closeOptionButtons();
            // $scope.saveRecordRepair();
        };
    })

    //编辑维修记录详情
    .controller("ReformRepairRecordDetailEdit", function ($scope, $state, MaintainTaskRW, $cordovaFile,$ionicHistory, $timeout, $stateParams, $cordovaFileTransfer ,
                                                          Popup, eamFile, eamMTInstallWorkOrderFactory , Storage,$rootScope, WorkOrderApi, modifiedJson, eamFaultWorkOrderFactory,
                                                          RepairRecordService, $ionicListDelegate, Store, $ionicScrollDelegate,  Params, OrderService) {
        //
        $scope.recordRepair = {};
        //TODO 调试完页面后可以将||modifiedJson.getMockFaultOrder()删除 || modifiedJson.getMockFaultOrder()
        $scope.work = $stateParams.data.work ;//整个工单对象
        $scope.title = "维修记录";
        var fixType = {//维修类型
            'isChange': 60,//更换设备
            'repair': 61// 维修设备
        };
        console.log($stateParams);
        //TODO 可以删除||"0" || "0"
        $scope.recordRepairIndex = $stateParams.data.recordRepairIndex ;
        console.log($scope.work);
        $scope.originalRecordRepair = $scope.work.repairRecordList.workorderFixInfoDtoList[+$stateParams.data.recordRepairIndex];
        console.log($scope.originalRecordRepair);
        angular.copy($scope.originalRecordRepair, $scope.recordRepair);//防止原对象被直接修改
        $scope.params = {
            fixBeginDate2: $scope.recordRepair && $scope.recordRepair.fixBeginDate2 ? new Date($scope.recordRepair.fixBeginDate2) : null,
            fixBeginDate1: $scope.recordRepair ? $scope.recordRepair.fixBeginDate1 : null,
            guaranteePeriod2: $scope.recordRepair ? $scope.recordRepair.guaranteePeriod2 / 2 : null,
            isChange: $scope.recordRepair.fixType == fixType.isChange
        };
        $scope.selectFanEquipment = function (work) {
            console.log(work);
            $state.go("tab.selectedEquipment", {
                data: work
            });
        };
        $scope.selectMateriel = function () {
            $state.go("tab.planMaterialSelect");
        };
        $scope.goToChangedEquipmentDetail = function () {
            $state.go('tab.changeEquipmentDetail', {
                data: {
                    recordRepair: $scope.recordRepair,
                    isCanEditDetail: $stateParams.data.isCanEdit
                }
            });
        };
        // 当前工单状态 是处理中  141 且有权限 才能修改编辑
        $scope.isCanEditRepairDetail = function () {
            // console.log($scope.work.apiWorkorderBaseInfoDto.workorderStatus, "-", $rootScope.auth['auth_110103']);
            // return ($scope.work.apiWorkorderBaseInfoDto.workorderStatus == $rootScope.faultStatus.FAULT_STATUS_PROCESSING) && $rootScope.auth['auth_110103'];
            return $stateParams.data.isCanEdit;
        };
        $scope.$on('$ionicView.beforeEnter', function () {
            $scope.equipmentDetail = Params.getTransferredObjByKey("selectedEquipment");
            $scope.selectedMaterial = Params.getTransferredObjByKey("selectedMaterial");
            if ($scope.equipmentDetail) {
                $scope.recordRepair.serialNum1 = $scope.equipmentDetail["seriesNo"] + "";
                $scope.recordRepair.deviceName = $scope.equipmentDetail["equipmentName"];
                $scope.recordRepair.deviceId = $scope.equipmentDetail["equipmentId"];
                $scope.recordRepair.provider1 = $scope.equipmentDetail["vendorShortname"];
                $scope.params.fixBeginDate1 = $scope.equipmentDetail["warrantySupplierBegindate"];
                $scope.recordRepair.originalMaterialSno = $scope.equipmentDetail["materialNo"];
                $scope.recordRepair.wuliaohao1 = $scope.equipmentDetail["materialId"];
                $scope.recordRepair.guaranteePeriod1 = $scope.equipmentDetail["guaranteePeriod"];
                Params.clearTransferredObjByKey('selectedEquipment');
            }
            if ($scope.selectedMaterial) {
                if ($scope.params.isChange) {
                    $scope.recordRepair.wuliaohao2 = $scope.selectedMaterial["materialId"];
                    $scope.recordRepair.updateMaterialSno = $scope.selectedMaterial["materialName"];
                }
                Params.clearTransferredObjByKey('selectedMaterial');
            }

        });
        /**
         * 改变维修类型
         */
        $scope.switchFixType = function () {
            $scope.recordRepair.fixType = $scope.params.isChange ? fixType.isChange : fixType.repair;
            console.log("维修类型:", $scope.recordRepair.fixType, $scope.recordRepair.fixType == 60 ? "更换" : '维修')
        };


        /**
         * 保存维修记录
         */
        $scope.save = function () {
            if (!$scope.params.isChange && $scope.recordRepair.deviceName == null || $scope.recordRepair.deviceName == "") {
                Popup.loadMsg("部件名称不能为空");
                return false;
            }
            if ($scope.params.isChange) {//如果是更换设备
                if (!StringUtils.isNotEmpty($scope.recordRepair.deviceName)) {
                    Popup.loadMsg("部件名称不能为空");
                    return;
                }
                // if (!$scope.recordRepair.serialNum2) {
                //   Popup.loadMsg("请输入部件序列号");
                //   return;
                // }
                // if (!$scope.recordRepair.wuliaohao2) {
                //   Popup.loadMsg("请选择物料");
                //   return;
                // }
                // if (!$scope.recordRepair.provider2) {
                //   Popup.loadMsg("请输入供应商");
                //   return;
                // }
                // if (!$scope.params.fixBeginDate2) {
                //   Popup.loadMsg("请输入质保开始日期");
                //   return;
                // }
                if (angular.isDate($scope.params.fixBeginDate2)) {
                    $scope.recordRepair.fixBeginDate2 = $scope.params.fixBeginDate2.format("yyyy-MM-dd");
                }
                // if (!$scope.params.guaranteePeriod2) {
                //   Popup.loadMsg("请输入质保期");
                //   return;
                // }
                if ($scope.params.guaranteePeriod2) {
                    $scope.recordRepair.guaranteePeriod2 = $scope.params.guaranteePeriod2 * 2;
                }
            }
            if (!$scope.recordRepair.fixType) {
                return Popup.loadMsg("请选择维修类型");
            }
            //修改json信息
            OrderService.getDicDetailById($scope.recordRepair.fixType, function (res) {
                $scope.recordRepair.fixTypeText = res.rows.item(0) ? res.rows.item(0)["detailName"] : $scope.params.isChange ? "更换设备" : "维修设备";//更换、维修
                if (!$scope.recordRepair.workorderId) {
                    $scope.recordRepair.workorderId = $scope.work['apiWorkorderBaseInfoDto'].workorderId;
                }
                $scope.work.repairRecordList.workorderFixInfoDtoList[$scope.recordRepairIndex]["repairMaterialDtoList"] = $scope.recordRepair.repairMaterialDtoList;
                $scope.work.repairRecordList.workorderFixInfoDtoList[$scope.recordRepairIndex] = $scope.recordRepair;
                console.log($scope.work);
                eamMTInstallWorkOrderFactory.saveWorkOrder($scope.work, function () {
                    Popup.loadMsg("保存成功");
                    angular.copy($scope.work, $stateParams.work);
                    angular.copy($scope.recordRepairList, $stateParams.recordRepairList);
                    $ionicHistory.goBack();
                });
            });

        };
        /**
         * 增加物料消耗
         */
        // $scope.addConsume = function () {
        //     $state.go("tab.reformRecordRepairEditAddMaterial", {
        //         data: {
        //                 selectMateriels : $scope.recordRepair.repairMaterialDtoList
        //             }
        //     });
        // };
        /**
         * 删除消耗物料
         */
        // $scope.delete = function (consume, index) {
        //     console.log(consume);
        //     if (!consume['repairMaterialId']) {//新建的消耗物料
        //         $scope.recordRepair.repairMaterialDtoList.splice(index, 1);//新建的消耗物料,物理删除
        //     } else {
        //         consume['activeFlag'] = 1;//已存在的消耗物料,逻辑删除
        //     }
        //     $ionicListDelegate.closeOptionButtons();
        //     $scope.save();
        // }
    });


