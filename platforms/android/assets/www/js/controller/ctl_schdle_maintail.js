//工单模块
var workorderModel = angular.module('starter.workorder', [])
  //定维通知单/定维任务单列表控制器
    .controller('SchdleMaintainListCtrl', function (Store, $filter, $scope, Popup, $stateParams, $state,
                                                    WorkOrderApi, SchdleMaintainApi, $timeout, $rootScope,
                                                    $ionicModal, OtherApi, TempVar, Storage, Params,
                                                    eamDB, DataCache, maintainDTO, eamSyncAjax, InstallService,
                                                    MaintainTaskRW, eamMTInstallWorkOrderFactory, eamSync, modifiedJson, $ionicScrollDelegate) {


      // eamDB.execute(db,"drop table eam_local_notification if exists");
      /****************************  变量    *****************************/
      //通知单/任务单切换 标示当前在哪个页面的数据结构
      $scope.status = [{
        "ele": "active"
      }, {
        "ele": ""
      }];

      //默认页面显示通知单
      $scope.selectStatus = 0;
      //初始 设置有无更多数据标志位 false ,不能加载 即不执行 doLoadLore()
      $scope.noMoreDataFlag = true;
      //筛选后的请求数据？ 默认为false：未筛选请求数据 true:筛选请求数据
      $scope.filterDataFlag = false;

      //判断登录人员 是否是 管理人员
      $scope.isManager = Storage.isManager();

      //api 请求时传递的参数表
      $scope.params = {
        taskId: null,
        machineId: null,
        projectName: null,
        anchor: null,  //全年检，半年检等
        status: null,
        planBeginDate: null,
        planEndDate: null
      };
      //如果在线 请求 通知单时 页数初始化为1
      $scope.pageNumber = 1;
      //定维通知单 列表数据 初始为空
      $scope.workNotificationList = [];
      //定维通知单 列表请求页数
      $scope.pageNumberOfNotifacation = 0;
      //定维通知单 筛选 页数 初始为 0
      $scope.pageNumberOfNotifacationFilter = 0;
      //用来存放 定维任列表 数据 初始为 空
      $scope.taskList = [];
      //定维任务 列表 请求的页数
      $scope.pageNumberOfTask = 0;
      //定维任务 筛选后 列表  请求的页数
      $scope.pageNumberOfTaskFilter = 0;
      //请求系统时间的 url
      var api_getSystemTime = baseUrl + "/api/common/getSystemTime.api";
      //是否获取到了服务器时间
      $scope.isUpdateServerDate = false;
      //请求获取服务器时间 初始化
      // $scope.now_server_date = null;
      //初始化时，如果是manager ,只初始化 通知单，任务单不会被初始化，会调用任务单的loadMore，
      // 所以加一个标志位，在第一次点击"定维任务"tab 按钮的时候初始化一次数据，之后，再点击"定维任务" 就不会再次刷新。会显示缓存的数据，直到用户主动刷新界面再次调用refreshs
      $scope.initedTask = false;
      //筛选  定维任务 作业节点待选项
      MaintainTaskRW.getDicOfWorkAnchor(function (res) {
        $scope.workAnchors = res;
      });
      //筛选  定维通知单 作业节点待选项
      // $scope.getWorkAnchorsOfNotification = Store.getWorkAnchorsOfNotification();
      //筛选 作业状态待选项
      MaintainTaskRW.getDicOfAssignStatus(function (res) {
        $scope.assignStatus = res;
      });
      // $scope.taskStatus = Store.getAllTaskStatus();
      //分派状态

      MaintainTaskRW.getDicOfTaskStatus(function (res) {
        console.log(res);
        $scope.taskStatus = res;
      });

      //用来同步的函数数组
      var syncFuncs = ["eamMTInstallWorkOrderFactory.uploadWorkOrders", "eamMTInstallWorkOrderFactory.downLoadWorkOrders"];

      //定维通知单 本地筛选 参数
      $scope.queryParamsOfNoti = {
        "projectName": null,
        "anchor": null,
        "assignStatus": null,
        "planStartTime": null,
        "planEndTime": null
      };
      //定维任务 本地筛选 参数
      $scope.queryParams = {
        "projectName": null,
        "workorderCode": null,
        "positionCode": null,
        "workTypeId": null,//作业节点
        "workorderStatus": null,//作业状态
        "planBegindate": null,
        "planEnddate": null,
        "pageNumber": 1
      };
      /****************************  变量    *****************************/

      //init filter, default notification filter
      //根据条件筛选工单，弹出筛选页面
      $ionicModal.fromTemplateUrl("views/schdlemaintain/maintainNotificationFilter.html", {
        scope: $scope,
        animation: "slide-in-up"
      }).then(function (modal) {
        $scope.filterModal = modal;
      });

      //选择状态
      $scope.selectTitleTab = function (selectStatus) {
        // $ionicScrollDelegate.scrollTop();
        //改变tab 样式（0，选中"定维通知单" 1，选中"定维任务"）
        for (var i = 0; i < 2; i++) {
          if (selectStatus == i) {
            $scope.status[i].ele = "active";
          } else {
            $scope.status[i].ele = "";
          }
        }
        //置筛选标志位 为false
        $scope.selectStatus = selectStatus;
        $scope.filterDataFlag = false;
        $scope.noMoreDataFlag = true;
        $scope.switchFilter(selectStatus);
        $scope.doRefresh();
      };

      $scope.processTask = function (task) {// 通知单点击分派 接受任务时的处理事件
        var status = task.workorderStatus;
        if (status == maintainTask.taskStatus.unreceived) {//如果是未接受任务
          Popup.confirm("您确定要接受任务吗？", function () {
            SchdleMaintainApi.changeTaskStatus(function (resp) {
              if (resp.success) {
                MaintainTaskRW.queryStatusTextFromDict(maintainTask.taskStatus.received, function (statusName) {
                  var taskInfo = angular.fromJson(task.json);
                  // console.log(taskInfo);
                  taskInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.received;
                  taskInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = statusName;
                  //传入 详情里的json===taskInfo
                  eamMTInstallWorkOrderFactory.saveWorkOrder(taskInfo, function (savedOrder) {
                    // angular.copy(savedOrder,task);
                    InstallService.uploadIfOnline(function () {
                      $scope.doRefresh();
                      Popup.loadMsg("任务已接受", 800);
                    }, function () {
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
                  var taskInfo = angular.fromJson(task.json);
                  // console.log(taskInfo);
                  taskInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.processing;
                  taskInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = statusName;
                  eamMTInstallWorkOrderFactory.saveWorkOrder(taskInfo, function (savedOrder) {
                    // angular.copy(savedOrder,task);
                    $scope.doRefresh();
                    Popup.loadMsg("任务已接受", 800);
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
      };
      var startTime = "";
      //同步 通知单 数据 一次请求回所有数据，和数据库中已有数据比较。新的插入，重复的更新
        function syncNotificationData(callback) {
        SchdleMaintainApi.getSchdleNotificationList(function (resp) {
          if (resp.success) {
            startTime = new Date().getTime();
            console.log("from server notice List ", resp.data);
            //请求到服务器数据之后  合并更新到本地数据库
            maintainDTO.mergerNotification(resp.data, function () {
              console.log("请求到定维通知单，并更新了数据库");
              if($.isFunction(callback)){
                    callback();
                }
            });
            //save to db
            // 先取出table_notification 里的旧数据
            //todo to check ??
            // DataCache.setApiRequestTime("SchdleMaintainApi.getSchdleNotificationList", new Date().Format("yyyy-MM-dd HH:mm:ss"));
          }
        }, {
          projectName: null,
          projectId: Storage.getSelectedProject().projectId,
          anchor: null,
          status: null,
          planBeginDate: null,
          planEndDate: null,
          pageNumber: 1,
          lastUpdateOnBegin: null,//DataCache.getApiRequestTime("SchdleMaintainApi.getSchdleNotificationList"),
          lastUpdateOnEnd: null,//new Date().Format("yyyy-MM-dd HH:mm:ss")
          stage: "service_stage"
          // stage: "construct_stage"
        });
      };

      // 获取系统时间
      // $scope.getServeTime = function (callback) {
      //   if (!$scope.isUpdateServerDate) {//如果还没获取到服务器端的时间
      //     Popup.loadMsg("正在同步服务器的时间...");
      //     eamSyncAjax.doGet(api_getSystemTime, [], function (req) {
      //       // Popup.hideLoading();
      //       // console.log(req);
      //       $scope.now_server_date = new Date(req.data);
      //       $scope.isUpdateServerDate = true;
      //       console.log("正在同步服务器的时间" + $scope.now_server_date);
      //       callback(new Date(req.data));
      //     }, {timeout: 5000});
      //   } else {
      //     callback(new Date());
      //   }
      // };

      // $scope.getServeTime();

      //在线的时候 获取 服务器时间 初始化参数通知单列表查询参数 只查询系统时间前后3个月的数据
      function getQueryParamsOfNotiInitOnline(callback) {
        var duringMillisecond = 90 * 24 * 3600 * 1000;
        if (!$scope.isUpdateServerDate) {//如果还没获取到服务器端的时间
          Popup.loadMsg("正在同步服务器的时间...");
          eamSyncAjax.doGet(api_getSystemTime, [], function (res) {
            if (res.success) {
              // console.log("服务器时间：" + new Date(res.data));
              // console.log("服务器时间：" + res);
              var startDate = new Date(res.data - duringMillisecond);
              var endDate = new Date(res.data + duringMillisecond);
              // startDate.setDate(startDate.getDate() );
              // endDate.setDate(endDate.getDate() + 3*24*3600*1000);
              var queryParamsOfNotiInitOnline = {
                "projectName": null,
                "anchor": null,
                "assignStatus": 136/*null*/,
                "planStartTime": startDate,
                "planEndTime": endDate
              };
              callback(queryParamsOfNotiInitOnline);
            }
            $scope.now_server_date = new Date(res.data);
            $scope.isUpdateServerDate = true;
            // console.log("正在同步服务器的时间" + $scope.now_server_date);
            // callback();
          }, {timeout: 5000});
        } else {
          var nowDate = new Date();
          var queryParamsOfNotiInitOnline = {
            "projectName": null,
            "anchor": null,
            "assignStatus": 136/*null*/,
            "planStartTime": new Date(nowDate.getTime() - duringMillisecond),
            "planEndTime": new Date(nowDate.getTime() + duringMillisecond)
          };
          callback(queryParamsOfNotiInitOnline);
        }

      }

      //初始化 离线时 通知单查询参数  只查询系统时间前后3个月的数据
      function getQueryParamsOfNotiInit() {
        var startDate = new Date();
        var endDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        endDate.setDate(endDate.getDate() + 90);
        var queryParamsOfNoti = {
          "projectName": null,
          "anchor": null,
          "assignStatus": 136/*null*/,
          "planStartTime": startDate,
          "planEndTime": endDate
        };
        return queryParamsOfNoti;
      }

      $scope.$on("cfpLoadingBar:refreshCompleted", function () {//进度条
        $scope.$broadcast('scroll.refreshComplete');
      });
      $scope.hasMoreTaskData = false;
      $scope.doRefresh = function () {
        // $ionicScrollDelegate.scrollTop();
        $scope.noMoreDataFlag = true;
        $scope.filterDataFlag = false;
        //通知单刷新
        if ($scope.selectStatus == 0) {
          Popup.waitLoad("重新获取数据...");
          $scope.workNotificationList = [];
          $scope.pageNumberOfNotifacation = 0;
          if ($rootScope.isOnline) {
            //获取在线请求 参数
            getQueryParamsOfNotiInitOnline(function (params) {
              console.log("在线时查询参数"+params);
              //请求通知单数据
              syncNotificationData(function () {
                //请求到服务器数据之后 合并更新数据库  最后再从数据库中读取最新数据
                maintainDTO.filterNotificationTable(0, params, function (res) {
                  $scope.$broadcast('scroll.refreshComplete');
                  // var endTime = new Date().getTime();
                  // console.log("during " + (endTime - startTime));
                  if (res.length > 0) {
                    $scope.workNotificationList = res;
                    console.log("list ", res);
                  } else {
                    $scope.noMoreDataFlag = false;
                  }
                  Popup.hideLoading();
                });
              });
            });
          } else {
            var queryParamsOfNotiOffline = getQueryParamsOfNotiInit();
            maintainDTO.filterNotificationTable(0, queryParamsOfNotiOffline, function (res) {
              $scope.$broadcast('scroll.refreshComplete');
              if (res.length > 0) {
                $scope.workNotificationList = res;
              } else {
                $scope.noMoreDataFlag = false;
              }
              Popup.hideLoading();
            });
          }
        } else {
          //任务单刷新
          $scope.queryParams = {};
          $scope.queryParams.pageNumber = 1;
          console.log("$rootScope.isOnline", $rootScope.isOnline);
          if ($rootScope.isOnline) {
            eamSync.sync(syncFuncs, function (res) {
              $scope.taskList = [];
              // console.log(res);
              Popup.hideLoading();
              $scope.doLoadMore();
            });
          } else {
            $scope.taskList = [];
            $scope.doLoadMore();
          }
        }
      };

      $scope.doLoadMore = function () {
        if ($scope.selectStatus == 0) {
          //不是筛选
          if (!$scope.filterDataFlag) {
            //调用 filter1 参数 params 一般为空  回调 拿到数据
            $scope.pageNumberOfNotifacation++;
            var queryParamsOfNoti = getQueryParamsOfNotiInit();
            maintainDTO.filterNotificationTable($scope.pageNumberOfNotifacation, queryParamsOfNoti, function (res) {
              $scope.$broadcast('scroll.infiniteScrollComplete');
              if (res.length > 0) {
                $scope.workNotificationList = $scope.workNotificationList.concat(res);
                console.log("list more ", $scope.workNotificationList);
              } else {
                $scope.noMoreDataFlag = false;
              }
            });

          } else {
            //调用 filter1 参数params 真正的筛选条件  回调 拿到数据
            $scope.pageNumberOfNotifacationFilter++;
            maintainDTO.filterNotificationTable($scope.pageNumberOfNotifacationFilter, $scope.queryParamsOfNoti, function (res) {
              $scope.$broadcast('scroll.infiniteScrollComplete');
              if (res.length > 0) {
                $scope.workNotificationList = $scope.workNotificationList.concat(res);
                console.log("list more ", $scope.workNotificationList);

              } else {
                $scope.noMoreDataFlag = false;
              }
            });
          }
        } else {//加载任务单数据
          console.log("加载更多任务单数据", $scope.queryParams);
          eamMTInstallWorkOrderFactory.loadMoreMaintainOrders($scope.queryParams, function (res) {
            $scope.$broadcast(SCROLL_INFINITE_COMPLETE);
            $scope.$broadcast(SCROLL_REFRESH_COMPLETE);
            if (res.length > 0) {
              $scope.taskList = $scope.taskList.concat(res);
              console.log("task list ", $scope.taskList);
              $scope.hasMoreTaskData = true;
            } else {
              $scope.hasMoreTaskData = false;
            }
              $scope.queryParams.pageNumber++;
          });
        }
      };
      //筛选调用的方法
      $scope.filterData = function () {
        $ionicScrollDelegate.scrollTop();
        $scope.noMoreDataFlag = true;
        if ($scope.selectStatus == 0) {
          $scope.workNotificationList = [];
          $scope.pageNumberOfNotifacationFilter = 0;
          maintainDTO.filterNotificationTable($scope.pageNumberOfNotifacationFilter, $scope.queryParamsOfNoti, function (res) {
            $scope.$broadcast('scroll.refreshComplete');
            if (res.length > 0) {
              $scope.workNotificationList = res;
              console.log("筛选 ", res);
            } else {
              $scope.noMoreDataFlag = false;
            }
          });
        } else {
          $scope.taskList = [];
          $scope.queryParams.pageNumber = 1;
          $scope.doLoadMore();
          Popup.delayRun(function () {//200ms滚动到顶部
            $ionicScrollDelegate.scrollTop();
          },null,200);
        }
      };

      //初始化 界面
      $scope.doRefresh();

      //筛选 分派任务种类
      $scope.taskAssign = function (notification) {
        $scope.notification = notification;
        // modifiedJson.setJsonByWorkorderId(notification.notiseId, notification);
        $state.go("tab.assigntask", {
          data: {
            notification: notification,
            type: "67"//定维任务
          }
        });
      }

      //修改UI时 ，分派 和 修改 跳转功能合并到一个箭头里
      $scope.assignOrChange = function (notification) {
        $scope.notification = notification;
        // modifiedJson.setJsonByWorkorderId(notification.notiseId, notification);
        $state.go("tab.assigntask", {
          data: {
            notification: notification,
            type: "67"//定维任务
          }
        });
      };

      //选择状态
      $scope.selectTab = function (orderStatus) {
        for (var i = 0; i < $scope.status.length; i++) {
          $scope.status[i].ele = "";
          if (i == orderStatus) {
            $scope.status[i].ele = "active";
            // $scope.loadMore();
          }
        }
      };
      $scope.$on('$ionicView.beforeEnter', function () {

      });

      $scope.goDetail = function (task) {
        console.log(task);
        if (!$rootScope.auth['auth_410106'] || ((task.workorderStatus == maintainTask.taskStatus.received ) || task.workorderStatus == maintainTask.taskStatus.unreceived)) {
          // Popup.loadMsg("任务未接受！", 800);
          return
        }
        $scope.filterModal.hide();
        $state.go("tab.scheduledMaintainTaskDetail", {
          data: task
        });
      };
      //切换 筛选界面
      $scope.switchFilter = function (selectStatus) {
        if (selectStatus == 0) {
          // Storage.set("noMoreDataOfNotification", true);
          $ionicModal.fromTemplateUrl("views/schdlemaintain/maintainNotificationFilter.html", {
            scope: $scope,
            animation: "slide-in-up"
          }).then(function (modal) {
            $scope.filterModal = modal;
          });
        } else {
          // Storage.set("noMoreDataOfMaintainTaskFilter", true);
          $ionicModal.fromTemplateUrl("views/schdlemaintain/taskFilter.html", {
            scope: $scope,
            animation: "slide-in-up"
          }).then(function (modal) {
            $scope.filterModal = modal;
          });
        }
      };
      $scope.openFilterOfMaintain = function () {
        //置筛选标志位 为true
        $scope.filterDataFlag = true;
        // $scope.noMoreDataFlag = false;
        $scope.pageNumberOfNotifacationFilter = 0;
        $scope.pageNumberOfTaskFilter = 0;
        $scope.filterModal.show();
      };
      //点击 筛选页面的返回按钮
      $scope.backButtonAction = function () {
        $scope.filterDataFlag = false;
        // $scope.noMoreDataFlag = false;
        $scope.filterModal.hide();
      };

      //点击筛选按钮 触发的事件函数
      $scope.queryByCondition = function () {
        //定维通知单筛选请求
        if ($scope.selectStatus == 0) {
          //输入时间的检测
          var params = $scope.queryParamsOfNoti;
          if (params.planStartTime != null && params.planEndTime != null && (params.planStartTime > params.planEndTime)) {
            Popup.loadMsg("计划开始时间不能晚于计划结束时间", 1000);
          } else {
            $scope.filterModal.hide();
            $scope.filterDataFlag = true;
            // $scope.noMoreDataFlag = true;
            $scope.filterData();
          }
        } else {
          $scope.queryParams.pageNumber=1;
          //定维任务 筛选请求
          var params = $scope.queryParams;
          if (params.planBeginDate != null && params.planEndDate != null && params.planBeginDate > params.planEndDate) {
            Popup.loadMsg("计划开始时间不能晚于计划结束时间", 1000);
          } else {
            $scope.filterModal.hide();
            $scope.taskList = [];
            $scope.queryParams.pageNumber = 1;
            $scope.doLoadMore();
            Popup.delayRun(function () {//200ms滚动到顶部
              $ionicScrollDelegate.scrollTop();
            },null,200);
          }
        }

      };

      //判断角色来显示不同UI
      $scope.isManage = Storage.isManager();
      if (!$rootScope.auth['auth_40'] && !$scope.isManage) {
        $scope.selectTitleTab(1);
      }

      //从缓存里 找到当前用户的 id 用来判断 里一个项目里那些定维任务 自己可以接受和开始
      $scope.currentUserId = Storage.get("USER_PROFILE").id;
      // console.log("userId"+Storage.get("USER_PROFILE").id);
      // console.log($scope.task[].assignPerson);

    })
    .controller('AssignTaskCtrl', function ($scope, $stateParams, Popup, $ionicHistory, TempVar, SchdleMaintainApi, Params, modifiedJson, MaintainTaskRW, $q) {

      // var dataObj = JSON.parse($stateParams.data);
      //从参数里获取 通知单列表中的数据
      $scope.maintainNotiData = $stateParams.data.notification;
      console.log("data", $stateParams.data);
      // console.log("dataObj", dataObj);
      // var notification = dataObj["notification"];
      var type = $stateParams.data.type;
      // console.log("notification: " + JSON.stringify(notification));
      $scope.notificationId = $scope.maintainNotiData.notiseId;
      // $scope.taskId = notification.taskId;
      $scope.peoples = [];
      $scope.machineIds = [];
      $scope.defaultOwner = $scope.maintainNotiData.assignOwner;
      // $scope.defaultOwner = "xiaoming";
      $scope.defaultDeviceNo = $scope.maintainNotiData.assignDevieNo;
      // $scope.defaultDeviceNo = "#A001";
      $scope.isAssignFlag = ($scope.maintainNotiData.assignStatus == "136") ? true : false;
      $scope.isModifyFlag = ($scope.maintainNotiData.assignStatus == "137") ? true : false;
      $scope.title = ($scope.maintainNotiData.assignStatus == "136") ? "分派" : "修改";
      //如果是修改通知单的分派人和机位，默认把人员和机位显示到 分派的界面
      if ($scope.isAssignFlag) {
        $scope.task = {
          assignOwnerId: null,
          assignDeviceNoId: null
        }
      } else {
        $scope.task = {
          assignOwnerId: $scope.maintainNotiData.assignOwnerId,
          assignDeviceNoId: $scope.maintainNotiData.assignDeviceNoId
        }
      }

      Popup.waitLoad("请求人员和机位");

      var defer1 = $q.defer();
      var defer2 = $q.defer();
      //获取人员列表
      SchdleMaintainApi.getEmployees(function (resp) {
        if (resp.success) {
          $scope.peoples = resp.data;
          console.log("$scope.peoples ", $scope.peoples);
          if ($scope.isModifyFlag) {
            for (var i = 0; i < $scope.peoples.length; i++) {
              if ($scope.peoples[i].userName == $scope.maintainNotiData.assignOwner) {
                $scope.task.assignOwnerId = $scope.peoples[i].userId;
              }
            }
          }

          defer1.resolve();
        } else {
          defer1.reject(resp);
        }
        // defer1.promise;
      }, {
        notificationId: $scope.notificationId
      });

      //获取机位列表
      SchdleMaintainApi.getMachines(function (resp) {
        if (resp.success) {
          defer2.resolve();
          $scope.machineIds = resp.data;
          console.log("machineIds", resp.data);
          if ($scope.isModifyFlag) {
            console.log("position ", $scope.maintainNotiData.assignDevieNo);
            for (var i = 0; i < $scope.machineIds.length; i++) {
              if ($scope.machineIds[i].positionName == $scope.maintainNotiData.assignDevieNo) {
                $scope.task.assignDeviceNoId = $scope.machineIds[i].positionId;
              }
            }
          }
          // if ($scope.machineIds.length > 0) {
          //   angular.forEach($scope.machineIds, function (value, key) {
          //     if (value.positionName) {
          //       value.positionName = value.positionName + "#";
          //     }
          //   }, $scope.machineIds);
          // }
        } else {
          defer2.reject();
        }
        // defer2.promise;
      }, {
        notificationId: $scope.notificationId
      });


      var getRealName = function (personId) {
        var temName = "";
        angular.forEach($scope.peoples, function (value, key) {
          if (value.userId == personId) {
            temName = value.userName;
          }
        });
        return temName;
      };

      var getPositionCode = function (machineId) {
        var temMachine = "";
        angular.forEach($scope.machineIds, function (value, key) {
          if (value.positionId == machineId) {
            temMachine = value.positionName;
          }
        })
        return temMachine;

      };


      var getPeopleName = function (id) {
        for (var i = 0; i < $scope.peoples.length; i++) {
          if ($scope.peoples[i].userId == id) {
            return $scope.peoples[i].userName;
          }
        }
      };

      var getMachineName = function (id) {
        for (var i = 0; i < $scope.machineIds.length; i++) {
          if ($scope.machineIds[i].positionId == id) {
            return $scope.machineIds[i].positionName;
          }
        }
      };


      var promise = $q.all(defer1, defer2);
      promise.then(function (res) {
        Popup.hideLoading();
      }, function (err) {
        Popup.hideLoading();
        Popup.loadMsg("获取人员和机位失败" + JSON.stringify(err), 1000);
      });
      $scope.submitAssign = function (task) {

        if (!task.assignOwnerId) {
          Popup.promptMsg("请选择人员", "输入信息不完整");
          return;
        } else if (!task.assignDeviceNoId) {
          Popup.promptMsg("请选择机位号", "输入信息不完整");
          return;
        } else {
          var paramsTem = {
            notificationId: $scope.notificationId,
            type: type,
            workerId: $scope.task.assignOwnerId,
            machineId: $scope.task.assignDeviceNoId
          };
          console.log("params", paramsTem);
          // var maintainNotiData = angular.copy($scope.maintainNotiData);

          // console.log("hash " ,$scope.maintainNotiData.$$hashKey, maintainNotiData.$$hashKey, mm.$$hashKey);
          Popup.waitLoad("同步任务状态...");
          SchdleMaintainApi.taskAssign(function (resp) {
            if (resp.success) {
              // var notification = modifiedJson.getJsonByWorkorderId($scope.notificationId);
              // //TempVar.setFocusUpdateFlag(true); //整个ListView刷新
              //   var maintainNotiData = angular.copy($scope.maintainNotiData);
              var maintainNotiData = {};
              angular.copy($scope.maintainNotiData, maintainNotiData);
              // console.log("hash " ,$scope.maintainNotiDat.$$hashKey, maintainNotiData.$$hashKey);
              maintainNotiData.assignOwnerId = $scope.task.assignOwnerId;
              maintainNotiData.assignOwner = getPeopleName(maintainNotiData.assignOwnerId);
              // notification.assignOwner = $scope.task.tempOwner;
              maintainNotiData.assignDeviceNoId = $scope.task.assignDeviceNoId;
              maintainNotiData.assignDevieNo = getMachineName(maintainNotiData.assignDeviceNoId);
              // notification.assignDevieNo = $scope.task.assignDevieNo;
              maintainNotiData.assignStatus = "137";  //137代表已分派，分派完成或者修改完成后，状态都是已分派状态，不用再去请求数据库，而是直接给出数据刷新
              maintainNotiData.statusName = "已分派";
              maintainNotiData.assignTime = new Date().format("yyyy-MM-dd hh:mm:ss");

              console.log(" id  id ", $scope.maintainNotiData.assignOwner, $scope.maintainNotiData.assignDevieNo);
              MaintainTaskRW.queryStatusTextFromDict(maintainNotiData.assignStatus, function (statusName) {
                $scope.maintainNotiData.statusName = statusName;
                // notification.assignDevieNo = $scope.getMachineName(task.assignDeviceNo);
                MaintainTaskRW.updateAssignNotificationItem($scope.notificationId, maintainNotiData, function (res) {
                  angular.copy(maintainNotiData, $scope.maintainNotiData);
                  console.log("分派后 更新数据库后 最新数据 ", res);
                  Popup.hideLoading();
                  $ionicHistory.goBack();
                });
              });
            }
          }, {
            notificationId: $scope.maintainNotiData.notiseId,
            type: type,
            workerId: $scope.task.assignOwnerId,
            machineId: $scope.task.assignDeviceNoId
          });
        }
      };


      $scope.openFilter = function () {
        $scope.empInfoFilterModal.show();
      };
    })
    // .controller('WorkOrderCtrl', function ($scope, Popup, WorkOrderApi) {
    //
    // })
    // .controller('PendingListCtrl', function ($scope, WorkOrderApi, Popup) {
    //   Popup.waitLoad();
    //   WorkOrderApi.getPendingList(function (resp) {
    //     if (resp.success) {
    //       $scope.pendingList = resp.data;
    //
    //     }
    //   })
    // })
    //人员报工
    // .controller('EmpTimeSheetListCtrl', function ($scope, Popup, $stateParams, WorkOrderApi, $state, EmpTimeSheet, modifiedJson) {
    //   $scope.taskId = $stateParams.taskId;
    //   $scope.type = 1;
    //   $scope.title = "人员报工";
    //   Popup.waitLoad("获取人员报工列表信息");
    //   $scope.staffs = modifiedJson.getJsonByWorkorderId($scope.taskId).manualReportList;
    //   if ($scope.staffs) {
    //     Popup.hideLoading();
    //     console.log("人员报工列表" + $scope.staffs);
    //   } else {
    //     Popup.promptMsg("没有人员报工信息", "提示");
    //   }
    //   /**
    //    * 新建报工
    //    * @param {Object} workOrderId
    //    */
    //   $scope.newStaff = function (taskId) {
    //     console.log('taskId ' + taskId);
    //     var newStaff = {};
    //     newStaff.taskId = $scope.taskId;
    //     newStaff.type = $scope.type;
    //     var params = JSON.stringify(newStaff);
    //     $state.go("tab.empTimeSheetEdit", {
    //       newEmp: params
    //     });
    //   };
    //
    //   /**
    //    * 编辑报工
    //    * @param {Object} emp
    //    */
    //   $scope.edit = function (emp) {
    //     console.log(emp);
    //     emp.taskId = $scope.taskId;
    //     var staff = JSON.stringify(emp);
    //     $state.go("tab.empTimeSheetEdit", {
    //       emp: staff
    //     });
    //   };
    //
    //   //判断有无缓存数据
    //   if (EmpTimeSheet.hasCacheData($scope.taskId)) {
    //     Popup.popupConfirm(function (result) {
    //       if (result) {
    //         //同步数据到服务器
    //         EmpTimeSheet.synchronizeEmpTimeSheet(function (result) {
    //           if (result) {
    //             //同步到服务器成功
    //             Popup.loadMsg("数据同步成功");
    //           } else {
    //             Popup.loadMsg("同步失败");
    //             //同步到服务器失败
    //           }
    //           getTimeSheetList();
    //         }, $scope.taskId);
    //       } else {
    //         //清空缓存数据
    //         EmpTimeSheet.clearCacheData(function () {
    //           Popup.loadMsg("对应的缓存数据已清空");
    //         });
    //         getTimeSheetList();
    //       }
    //     });
    //   } else {
    //     getTimeSheetList();
    //   }
    //   function getTimeSheetList() {
    //     EmpTimeSheet.getEmpTimeSheetList(function (resp) {
    //       if (resp.success) {
    //         $scope.staffs = resp.data;
    //       }
    //     }, {
    //       orderId: $scope.taskId
    //     });
    //   }
    //
    //   $scope.delete = function (item) {
    //     Popup.confirm("您确定要删除该报工吗？", function () {
    //       EmpTimeSheet.deleteEmpTimeSheetList(function (resp) {
    //         if (resp.success) {
    //           $scope.staffs.splice($scope.staffs.indexOf(item), 1);
    //         }
    //       }, item, $scope.taskId);
    //     });
    //   }
    // })
    //新增和编辑人员报工
    // .controller('EmpTimeSheetEditCtrl', function ($scope, $filter, $ionicHistory, Params, Popup, EmpTimeSheet, WorkOrderApi, $stateParams, $state, Storage, modifiedJson) {
    //   var staff = JSON.parse($stateParams.emp);
    //   console.log(staff);
    //   var newEmp = JSON.parse($stateParams.newEmp);
    //   $scope.title = "编辑报工";
    //   $scope.isEditStatus = true;
    //   $scope.isSelectedEmpInfo = false;
    //   $scope.isSupplyer = false;//如果原本不是供应商,则可以编辑,否则不能改变供应商的身份
    //   $scope.empTimeSheet = {};
    //   if (staff) {//如果是编辑人员报工
    //     $scope.isEditStatus = true;
    //     $scope.orderId = staff.taskId;
    //     if (staff.type != null) {
    //       $scope.empTimeSheet.pink = $scope.isSupplyer = staff.type == 2;//是2就是供应商
    //       $scope.empTimeSheet.timeSheetId = staff.timeSheetId;
    //       $scope.empTimeSheet.objectName = staff.empName;
    //       $scope.empTimeSheet.type = staff.type;
    //       $scope.empTimeSheet.empId = staff.empId;
    //       if (staff.beginTime != null) {
    //         $scope.empTimeSheet.beginTime = new Date($filter('Infydate')(staff.beginTime));
    //       }
    //       if (staff.endTime != null) {
    //         $scope.empTimeSheet.endTime = new Date($filter('Infydate')(staff.endTime));
    //       }
    //       $scope.empTimeSheet.description = staff.description;
    //       $scope.empTimeSheet.cacheId = staff.cacheId;
    //       $scope.empTimeSheet.orderId = staff.taskId;
    //     }
    //   } else if (!!newEmp) {//如果是新建人员报工
    //     $scope.empTimeSheet.pink = false;
    //     console.log(newEmp.taskId);
    //     $scope.isEditStatus = false;
    //     $scope.title = "新增报工";
    //     $scope.orderId = newEmp.taskId;
    //     $scope.empTimeSheet.type = 1;
    //     $scope.empTimeSheet.description = null;
    //     $scope.empTimeSheet.cacheId = null;
    //     $scope.empTimeSheet.orderId = $scope.orderId;
    //   }
    //   $scope.$on('$ionicView.beforeEnter', function () { //选中的作业人员
    //     console.log($scope.isSelectedEmpInfo);
    //     if (Params.getTransfertedObj() != null) {
    //       var obj = Params.getTransfertedObj();
    //       console.log(obj);
    //       $scope.isSelectedEmpInfo = true;
    //       $scope.empTimeSheet.objectName = obj.name;
    //       $scope.empTimeSheet.type = 1;
    //       $scope.empTimeSheet.empId = obj.userId;
    //       $scope.empTimeSheet.empName = obj.name;
    //       Params.clearTransfertedObj();
    //     } else
    //       $scope.isSelectedEmpInfo = false;
    //   });
    //   $scope.selectEmp = function (type) {//选择作业人
    //     if (type == 2)
    //       return false;
    //     $state.go("tab.empInfoList");
    //   };
    //   $scope.toggleSwitch = function () {
    //     console.log($scope.empTimeSheet.pink);
    //     $scope.empTimeSheet.type = $scope.empTimeSheet.pink == true ? 2 : 1;
    //     $scope.empTimeSheet.empId = null;
    //     $scope.empTimeSheet.empName = null;
    //     $scope.empTimeSheet.objectName = null;
    //   };
    //
    //   //保存数据
    //   $scope.save = function () {
    //     console.log($scope.empTimeSheet);
    //
    //     if ($scope.empTimeSheet.objectName == null || $scope.empTimeSheet.objectName == "") {
    //       Popup.promptMsg("名称不能为空");
    //       return;
    //     }
    //     if ($scope.empTimeSheet.beginTime == null) {
    //       Popup.promptMsg("开始时间不能为空");
    //       return;
    //     }
    //     if ($scope.empTimeSheet.endTime == null) {
    //       Popup.promptMsg("结束时间不能为空");
    //       return;
    //     }
    //     if ($scope.empTimeSheet.endTime - $scope.empTimeSheet.beginTime < 0) {
    //       Popup.promptMsg("结束时间应该不小于开始时间");
    //       return;
    //     }
    //
    //     EmpTimeSheet.saveEmpTimeSheetList(function (resp) {
    //       console.log($scope.empTimeSheet);
    //       if (resp.success) {
    //         Popup.delayRun(function () {
    //           $ionicHistory.goBack();
    //         }, "保存成功");
    //       }
    //     }, $scope.empTimeSheet, $scope.orderId);
    //   }
    // })
    // .controller("EmpInfoListCtrl", function ($scope, $ionicModal, $timeout, $ionicHistory, WorkOrderApi, Params) {
    //   $scope.empInfos = [];
    //   $scope.pageNumber = 1;
    //   $scope.noMoreData = true;
    //   $scope.searchCondition = {
    //     name: null,
    //     userAccount: null,
    //     pageNumber: $scope.pageNumber
    //   };
    //   $scope.loadMore = function () {
    //     WorkOrderApi.getEmpInfoList(function (resp) {
    //       if (resp.success) {
    //         $scope.empInfos = $scope.empInfos.concat(resp.data);
    //         if (resp.data.length == 0) {
    //           $scope.noMoreData = true;
    //         } else {
    //           $scope.pageNumber++;
    //           $timeout(function () {
    //             $scope.noMoreData = false;
    //             $scope.$broadcast(SCROLL_INFINITE_COMPLETE);
    //           }, INFINITE_TIME);
    //         }
    //       }
    //     }, {
    //       name: $scope.searchCondition.name,
    //       userAccount: $scope.searchCondition.userAccount,
    //       pageNumber: $scope.pageNumber
    //     });
    //   };
    //   $scope.loadMore();//第一次进来调用
    //   $scope.getEmpInfo = function (empInfo) {
    //     Params.setTransfertedObj(empInfo);
    //     $ionicHistory.goBack();
    //   };
    //   $ionicModal.fromTemplateUrl("views/workorder/empInfoFilter.html", {
    //     scope: $scope,
    //     animation: "slide-in-up"
    //   }).then(function (modal) {
    //     $scope.empInfoFilterModal = modal;
    //   });
    //
    //   $scope.openFilter = function () {
    //     $scope.empInfoFilterModal.show();
    //   };
    //   $scope.backButtonAction = function () {
    //     $scope.empInfoFilterModal.hide();
    //   };
    //   $scope.openEmpInfoFilter = function () {
    //     $scope.openFilter();
    //   };
    //   $scope.confirmEmpInfo = function () {
    //     $scope.empInfos = [];
    //     $scope.pageNumber = 1;
    //     $scope.loadMore();
    //     $scope.empInfoFilterModal.hide();
    //   }
    // })
    .controller("scheduledMaintainTaskGetAllMaterialsCtrl", function ($scope, $timeout, $stateParams, Popup, MaintainTaskRW, Params, SchdleMaintainApi, $ionicHistory) {
      $scope.data = {};
      $scope.data.queryMaterialKeyWord = null;
      $scope.data.filterFlag = false;
      $scope.isMoreData = true;
      $scope.pageNumber = 0;
      $scope.materials = [];
      $scope.selectMaterial = function (material) {
        // var selectedMaterial=JSON.parse(material.json);
        Params.setTransferredObjByKey("selectMaterial", /*selectedMaterial*/material);
        $ionicHistory.goBack();
      };
      $scope.refreshMaterialData = function () {
        $scope.data.queryMaterialKeyWord = null;
        $scope.data.filterFlag = false;
        $scope.materials = [];
        $scope.pageNumber = 1;
        $scope.loadMoreMaterialsData();
        $scope.$broadcast('scroll.refreshComplete');
      };
      $scope.loadMoreMaterialsData = function () {
        Popup.waitLoad("正在加载物料信息...");
        $scope.$broadcast('scroll.infiniteScrollComplete');
        MaintainTaskRW.queryMaterialsByKeyWords($scope.data, function (materials) {
          Popup.hideLoading();
          if (materials.length > 0) {
            $scope.isMoreData = true;
            $scope.materials = $scope.materials.concat(materials);
            $scope.pageNumber++;
          } else {
            $scope.isMoreData = false;
          }
        }, $scope.pageNumber);
      };
      $scope.refreshMaterialData();//第一次进来
      $scope.openStandardMaterialFilter = function () {
        var option = {
          title: '筛选用料标准模糊查询', // String. 弹窗的标题。
          subTitle: '请输入物料号或者物料描述关键字', // String (可选)。弹窗的子标题。
          scope: $scope, // Scope (可选)。一个链接到弹窗内容的scope（作用域）。
          template: '<input type="text" autofocus="autofocus" ng-model="data.queryMaterialKeyWord"/>', // String (可选)。放在弹窗body内的html模板。
          // templateUrl: '', // String (可选)。在弹窗body内的html模板的URL。
          buttons: [{ //Array[Object] (可选)。放在弹窗footer内的按钮。
            text: '取消',
            type: 'button-default',
            onTap: function (e) {
              // 当点击时，e.preventDefault() 会阻止弹窗关闭。
              // e.preventDefault();
            }
          }, {
            text: '确认',
            type: 'button-positive',
            onTap: function (e) {
              $scope.pageNumber = 1;
              $scope.materials = [];
              $scope.data.filterFlag = true;
              $scope.loadMoreMaterialsData();
            }
          }]
        };
        Popup.popup(option);
        $("div.popup-container>div.popup").css("border-radius", "5%");//弹框圆角化处理
      };
    })
    .controller("scheduledMaintainTaskDetailCtrl",
      function ($rootScope, $scope, $ionicModal, $ionicSlideBoxDelegate, $ionicHistory, eamSync,
                $stateParams, eamFile, $state, SchdleMaintainApi, $ionicBackdrop, OrderService, eamMTInstallWorkOrderFactory,
                Popup, Store, Storage, Params, $ionicScrollDelegate, InstallService,
                $ionicActionSheet, $cordovaCamera, eamDB, modifiedJson, MaintainTaskRW) {
        var syncFus = ["eamMTInstallWorkOrderFactory.uploadWorkOrders", "eamMTInstallWorkOrderFactory.downLoadWorkOrders"];
        //一条工单的全部信息
        $scope.taskBaseInfo = $stateParams.data;
        console.log($stateParams.data);
        //json
        $scope.taskDetailInfo = angular.fromJson($scope.taskBaseInfo.json);
        // console.log($scope.taskDetailInfo);
        // 详情中显示信息
        $scope.taskInfoForWeb = $scope.taskDetailInfo['workorderDetails']["eaWoWorkorderinfoDto"];
        angular.forEach($scope.taskBaseInfo, function (val, key) {
          angular.forEach($scope.taskInfoForWeb, function (val2, key2) {
            if (key2 == key && val) {
              this[key2] = val;
            }
          }, $scope.taskInfoForWeb);
        });
        $scope.taskId = $scope.taskInfoForWeb.workorderId;
        $scope.isManager = Storage.isManager();//是否是经理
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

        if(!$scope.taskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList) {
            $scope.taskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList = [];
        }
        if (!$scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList){
            $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList = [];
        }
        var verifyListData = $scope.taskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList;//审核列表
        var suspendListData = $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList;//暂停列表
        $scope.imgFiles = $scope.taskDetailInfo.workorderDetails.eaWoFilemappingList;//附件列表

        $scope.downloadImage = function (image, index) {
          var filePath = image.filePath;
          var fileId = image.fileId;
          eamFile.openEamAttachedFile(image).then();
        };//downloadImage end·······
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

        $scope.$on("$ionicView.beforeEnter", function () {
          console.log(" 详情 ", $stateParams.data);
        });


        //跳转至点检表界面
        $scope.navigateToStdMaterial = function () {
          $state.go("tab.scheduledMaintainTaskStdMaterial", {
            data: $scope.taskDetailInfo
          });
        };
        //跳转到 详情展示界面
        $scope.goToShowScheduleDetail = function () {
          $state.go("tab.scheduleDetailShow", {
            data: $scope.taskDetailInfo
          });
        };
        //跳转至作业指导书界面
        $scope.navigateToInstrucktor = function () {
          $state.go("tab.instructor", {
            data: $scope.taskDetailInfo
          });
        };
        //跳转至点检表界面
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

        //跳转到暂停列表界面
        $scope.goToPauseList = function () {
          $state.go("tab.schedulePauseList", {
            data: suspendListData
          })
        };

        //跳转到审核列表界面
        $scope.goToVerifyList = function () {
          $state.go("tab.scheduleVerifyList", {
            data: verifyListData
          })
        };

        //跳转到 审核工单界面  共用
        $scope.goToVerifyOrder = function () {
          $state.go('tab.verifyOrder', {
            data: {
              detailFaultOrder: $scope.taskDetailInfo, //工单里详情信息 json
              baseFaultOrder: $scope.taskBaseInfo, //工单里所有信息 包含json里的外层
              workOrderCode: $scope.taskBaseInfo.workorderCode,
              workOrderType: $scope.taskBaseInfo.workorderType //工单类型 定维 技该 安装
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


        $ionicModal.fromTemplateUrl("views/schdlemaintain/maintainTaskPause.html", {
          scope: $scope,
          animation: 'slide-in-up'
        }).then(function (modal) {
          $scope.modal = modal;
        });

        //暂停处理状态 --- 无暂停原因
        $scope.pauseOrder = function (order) {
          openModal();
        };


        //暂停 原因处理 todo
        $scope.pauseInfoConfirmed = function (tempPauseOrder) {//确定“暂停信息采集”,暂停任务后，状态为暂停
          console.log("tempPauseOrder ", tempPauseOrder);
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
          suspendListData = $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList;
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
                $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList = suspendListData;
            }

            //暂停列表 中记录暂停操作
          // $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList = suspendListData;
          console.log("pauselist ", $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList);

          //暂停一个工单之后 需要更新
          $scope.taskInfoForWeb.workorderStatus = 144;
          $scope.taskInfoForWeb.workorderStatusName = "暂停";
          // 恢复一个工单后 更新基本信心里面的状态 和 详细信息里面的状态
          eamMTInstallWorkOrderFactory.changeWorkOrderStatusThreeOrder(144, $scope.taskDetailInfo, function (savedOrder) {
            angular.copy(savedOrder, $scope.taskDetailInfo);
            savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
            angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.taskBaseInfo);//目的是同步改变故障工单列表的信息
            console.log("pauselist ", $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList);
            closeModal();
          });
        };

        //恢复处理
        // $scope.recoveryOrder = function (order) {
        //   Popup.confirm("您确定要恢复么？", function () {
        //     // console.log($scope.faultOrderDetailInfo);
        //     console.log(order);
        //     //暂停列表中  记录恢复操作
        //     suspendListData = $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList || [];
        //     var nowDate = new Date();
        //     suspendListData.unshift({
        //
        //         pauseId: "",//暂停编号
        //         workorderId: $scope.taskId,//工单Id
        //         pausereasonId: pauseIds.join(","),//暂停原因id
        //         pausereasonName:"恢复",//暂停原因名称
        //         pauseRemark: "恢复",//暂停描述
        //         status: 155,//暂停/开启状态
        //         statusName: "恢复",//暂停/开启状态名称
        //         activeFlag: 0,//有效标志
        //         createBy: Storage.getProfile()['id'],//暂停人
        //         createOn: nowDate.format("yyyy-MM-dd hh:mm")//暂停时间
        //
        //     });
        //     $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList = suspendListData;
        //
        //     order.workorderStatus = 141;
        //     order.workorderStatusName = "处理中";
        //     // 恢复一个工单后 更新基本信心里面的状态 和 详细信息里面的状态
        //     eamMTInstallWorkOrderFactory.changeWorkOrderStatusThreeOrder(order.workorderStatus, $scope.taskDetailInfo, function (savedOrder) {
        //       angular.copy(savedOrder, $scope.taskDetailInfo);
        //       savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
        //       angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.taskBaseInfo);
        //     })
        //   });
        // };

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
                    pausereasonId: null ,//暂停原因id
                    pausereasonName: null,//恢复
                    pauseRemark: null,//暂停描述
                    status: 155,//暂停/开启状态
                    statusName: "恢复",//暂停/开启状态名称
                    activeFlag: 0,//有效标志
                    createBy: Storage.getProfile()['id'],//暂停人
                    createOn: nowDate.format("yyyy-MM-dd hh:mm")//暂停时间
                });
                $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList = suspendListData;


                $scope.taskInfoForWeb.workorderStatus = 141;
                $scope.taskInfoForWeb.workorderStatusName = "处理中";
                // order.workorderStatus = 141;
                // order.workorderStatusName = "处理中";
                // 恢复一个工单后 更新基本信心里面的状态 和 详细信息里面的状态
                eamMTInstallWorkOrderFactory.changeWorkOrderStatusThreeOrder(order.workorderStatus, $scope.taskDetailInfo, function (savedOrder) {
                    angular.copy(savedOrder, $scope.taskDetailInfo);
                    savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
                    angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.taskBaseInfo);
                })

            });
        };

        $scope.pauseBackBtnAction = function () {
          closeModal();
        };
        $scope.setStatusName = function (workorderStatus, json, callback) {
          MaintainTaskRW.queryStatusTextFromDict(workorderStatus, function (statusName) {
            $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = statusName;
            $scope.taskDetailInfo.apiWorkorderBaseInfoDto.workorderStatusName = statusName;
            json.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = statusName;
            json.apiWorkorderBaseInfoDto.workorderStatusName = statusName;
            MaintainTaskRW.updateScheduleTaskStatus($scope.taskId, workorderStatus, statusName, function () {
              Popup.loadMsg("更新本地数据状态成功！");
              if ($.isFunction(callback)) {
                callback();
              }
            })
          });
        };

        //点击暂停按钮
        // $scope.onPauseResumeBtnClick = function () {//点击暂停按钮
        //   if ($scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus == maintainTask.taskStatus.processing) {//暂停任务
        //     openModal();
        //   } else {//如果点击时刻是暂停,恢复任务
        //     Popup.confirm("确认恢复", function ok() {
        //       $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.processing;
        //       eamMTInstallWorkOrderFactory.getStatusNameByOrderStatus(maintainTask.taskStatus.processing, function (name) {
        //         $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = name || "处理中";
        //         $scope.saveScheduleTask();
        //       });
        //     }, function notOk() {
        //
        //     });
        //   }
        // };

        //确定“暂停信息采集”,暂停任务后，状态为暂停
        // $scope.pauseInfoConfirmed = function () {
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
        //     status: "154",//暂停/开启状态
        //     statusName: "暂停",//暂停/开启状态名称
        //     activeFlag: 0,//有效标志
        //     createBy: Storage.getProfile()['id'],//暂停人
        //     createOn: nowDate.format("yyyy-MM-dd")//暂停时间
        //   });
        //   $scope.taskDetailInfo.workorderDetails.eaWoPauseDtoList = suspendListData;
        //   $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.pause;
        //   eamMTInstallWorkOrderFactory.getStatusNameByOrderStatus(maintainTask.taskStatus.pause, function (name) {
        //     $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = name || "暂停";
        //     $scope.saveScheduleTask();
        //     closeModal();
        //   });
        //   // $scope.setStatusName(maintainTask.taskStatus.pause);
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
                    var pass = {
                      auditingId: null,
                      workorderId: $scope.taskId,
                      auditingResult: 91,
                      auditiogResultName: "通过",
                      auditingOpinion: $scope.unVerifiedInfo.reason,
                      activeFlag: 0,
                      auditingUser: Storage.getProfile().id,
                      auditingDate: new Date().format("yyyy-MM-dd")
                    };
                    $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.completed;
                    eamMTInstallWorkOrderFactory.getStatusNameByOrderStatus(maintainTask.taskStatus.completed, function (name) {
                      $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = name || "确认完工";
                      $scope.taskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList.push(pass);
                      verifyListData = $scope.taskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList;
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
                      auditingUser: Storage.getProfile().id,
                      auditingDate: new Date().format("yyyy-MM-dd")
                    };
                    $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatus = maintainTask.taskStatus.processing;
                    eamMTInstallWorkOrderFactory.getStatusNameByOrderStatus(maintainTask.taskStatus.processing, function (name) {
                      $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = name || "处理中";
                      $scope.taskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList.push(unpass);
                      verifyListData = $scope.taskDetailInfo.workorderDetails.eaWoWorkorderAuditingDtoList;
                      $scope.saveScheduleTask();
                    });

                  }
                }
              }
            ]
          });
        };


        $scope.saveScheduleTask = function () {//保存
          eamMTInstallWorkOrderFactory.saveWorkOrder($scope.taskDetailInfo, function (order) {
            order['apiWorkorderBaseInfoDto'].json = JSON.stringify(order);
            angular.copy(order['apiWorkorderBaseInfoDto'], $scope.taskBaseInfo);
            console.log($scope.taskBaseInfo);
            // $scope.taskBaseInfo = savedOrder;
            Popup.delayRun(function () {
              $ionicHistory.goBack();
            }, "", 600);
            // $scope.taskBaseInfo.json = JSON.stringify(order);
            // $scope.taskBaseInfo.workorderStatus=order['apiWorkorderBaseInfoDto']['workorderStatus'];
            // $scope.taskBaseInfo.workTypeName=order['apiWorkorderBaseInfoDto']['workTypeName'];
            // $scope.taskBaseInfo.workTypeId=order['apiWorkorderBaseInfoDto']['workTypeId'];
            // $scope.taskBaseInfo.workorderStatusName=order['apiWorkorderBaseInfoDto']['workorderStatusName'];
            // $(".popup").css("border-radius", "5%");//弹框圆角化处理
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
                  eamMTInstallWorkOrderFactory.getStatusNameByOrderStatus(maintainTask.taskStatus.finishedUnaudited, function (name) {
                    $scope.taskDetailInfo.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName = name || "已完工待确认";
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
          eamFile.removeAttachedFile(item).then(function () {
            $scope.imgFiles.splice(index, 1);
          }, function (err) {
            Popup.promptMsg(JSON.stringify(err), "获取附件失败")
          });
        };
        $scope.addAttachment = function (task) {
          if (task.workorderStatus != maintainTask.taskStatus.processing) {//不是处理中就不进行操作
            return;
          }
          eamFile.getPicture({
            source: AttachedFileSources.workorder_detail_source,
            workorderId: $scope.taskId,
            fileActualName: "定维_" + $scope.taskInfoForWeb.workorderId + "_" + $scope.taskInfoForWeb.workorderCode
          }).then(function (fileItem) {
            $scope.imgFiles.push(fileItem);
          }, function (err) {
            Popup.promptMsg(JSON.stringify(err), "获取附件失败")
          });
        };  //end addAttachment();

        //从缓存里 找到当前用户的 id 用来判断 里一个项目里那些定维任务 自己可以接受和开始
        $scope.currentUserId = Storage.get("USER_PROFILE").id;
      })
    //定维详情 用料标准
    .controller("scheduledMaintainTaskStdMaterialCtrl",
      function ($scope,$rootScope, $ionicHistory, $state, $stateParams, SchdleMaintainApi, $ionicListDelegate, Popup, eamMTInstallWorkOrderFactory, Storage) {
        if (!$stateParams.data) {
          return;
        }
        $scope.webParams = [];
        $scope.taskDetailInfo = $stateParams.data;
          console.log($scope.taskDetailInfo);

        $scope.currentUserId = Storage.get("USER_PROFILE")['id'];
        console.log("user id " ,$scope.currentUserId ,"detailInfo ", $scope.taskDetailInfo );
        //后台返回缺少 workorderId字段 添加该字段
        angular.forEach($scope.stdMaterials,function (data, index, array) {
            if(!data.workorderId){
                data.workorderId = $scope.taskDetailInfo.apiWorkorderBaseInfoDto.workorderId
            }
            if(!data.workOrderCode){
                data.workOrderCode = $scope.taskDetailInfo.apiWorkorderBaseInfoDto.workOrderCode
            }
        });

          $scope.stdMaterials = $scope.taskDetailInfo.materialStandarList.eaWoMaterialDemandDtoList;
          // console.log("添加物料后，总物料数",$scope.stdMaterials.length);
          // console.log("before enter ，",JSON.stringify($scope.stdMaterials, undefined, 2));

          $scope.stdMaterialsViewModels =  $scope.stdMaterials.map(function (item) {
              return Object.assign({},item,{sapInventoryFlag:item.sapInventoryFlag===0});
          });
        //是否可以添加用料标准
        $scope.isCanAddNewMaterial = function () {
            //当前登录用户是当前作业人， 当前任务单状态是处理中
            if($scope.currentUserId == $scope.taskDetailInfo.apiWorkorderBaseInfoDto.assignPerson && $scope.taskDetailInfo.apiWorkorderBaseInfoDto.workorderStatus == 141){
              //只有定维 和 技改会有用料标准。模块。$rootScope.auth("auth_410105") 定维任务编辑任务单的权限码  460105 技改模块编辑权限码
              if($rootScope.auth["auth_410105"] || $rootScope.auth["auth_460105"]){
                return true;
              }else {
                return false;
              }
            }else {
                return false;
            }
        };

        $scope.navigateToNewStdMaterial = function () {
          $state.go("tab.newInstanceStdMaterial", {
            data:{
                taskDetailInfo: $scope.taskDetailInfo,
                stdMaterialsViewModels : $scope.stdMaterialsViewModels
            }
          });
        };
        $scope.delStandardMaterialItem = function (item, index) {//删除用料标准
          Popup.confirm("删除用料标准", function () {
            if (!item['demandId']) {//新建的用料标准
              $scope.stdMaterialsViewModels.splice(index, 1);
            } else {
              item['activeFlag'] = 1;
            }
            $ionicListDelegate.closeOptionButtons();
            $scope.saveNewMaterials(true);
          }, function () {

          }, '确定', '取消');

        };
        $scope.saveNewMaterials = function (isDelete) {
          for(var i=0;i< $scope.stdMaterialsViewModels.length;i++){
            var item =  $scope.stdMaterialsViewModels[i];
            if(item.referNum&&item.referNum<item.actualNum){//实际数量大于参考数量
              Popup.promptMsg("物料【"+item.materialSno+"】<br/>实际消耗数量不能大于参考物料数量");
             return;
            }
          }
            $scope.taskDetailInfo.materialStandarList.eaWoMaterialDemandDtoList=
                $scope.stdMaterialsViewModels.map(function (item) {
                    return Object.assign({},item,{sapInventoryFlag:item.sapInventoryFlag?0:1})
                });
          eamMTInstallWorkOrderFactory.saveWorkOrder($scope.taskDetailInfo, function (order) {
              console.log(" after save ",order.materialStandarList.eaWoMaterialDemandDtoList);
              angular.copy(order.materialStandarList.eaWoMaterialDemandDtoList, $scope.taskDetailInfo.materialStandarList.eaWoMaterialDemandDtoList);
            Popup.loadMsg("保存成功", 500);
            if(isDelete){
              return ;//如果删除，不返回上一个页面
            }
            Popup.delayRun(function () {
              $ionicHistory.goBack();
            }, "", 800);
          });
        };
      })
    //新增物料标准
    .controller("scheduledMaintainTaskNewStdMaterialCtrl",
        function ($scope, $stateParams, $state, $ionicHistory, $ionicModal, Popup, Params, OrderService, SchdleMaintainApi, Storage) {
          if (!$stateParams.data) {
            return;
          }
          $ionicModal.fromTemplateUrl("views/workorder/materialQuery.html", {
            scope: $scope,
            animation: "slide-in-up"
          })
            .then(function (modal) {
              $scope.filterModal = modal;
              $scope.filterModal.show();
            });
          $scope.doRefresh = function () {
            $scope.params = {};
            $scope.webMaterielList = [];
            $scope.params.pageNumber = 1;
            $scope.query();
          };
          $scope.query = function () {
            $scope.params.pageNumber = 1;
            $scope.webMaterielList = [];
            $scope.loadMoreMaterials();
            $scope.closeQuery();
          };
          $scope.closeQuery = function () {
            $scope.filterModal.hide();
          };
          //工单 json 对象
          $scope.taskDetailInfo = $stateParams.data.taskDetailInfo;
          //工单 有料标准列表 且 flag是 true 和 false
          $scope.stdMaterialsViewModels = $stateParams.data.stdMaterialsViewModels;

          $scope.webMaterielList = [];
          // $scope.stdMaterials = $scope.taskDetailInfo.materialStandarList.eaWoMaterialDemandDtoList;
          //   console.log("新增时已经 存在的用料标准 ",$stateParams.data.taskDetailInfo.materialStandarList.eaWoMaterialDemandDtoList);
        $scope.isMoreData = true;
          $scope.params = {
            materielNo: null,
            pageNumber: 1,
            materielName: null
          };
          $scope.openQuery = function () {
            $scope.filterModal.show();
          };
          $scope.loadMoreMaterials = function () {
            OrderService.getMaterialList(function (res) {
              $scope.$broadcast(SCROLL_INFINITE_COMPLETE);
              $scope.$broadcast(SCROLL_REFRESH_COMPLETE);
              res = OrderService.ChangeSQLResult2Array(res);
              console.log("用料标准 ",res[0]);
              if (res.length > 0) {
                res.forEach(function (materiel) {
                  materiel.sapInventoryFlag = true;
                  $scope.webMaterielList.push(materiel);
                });
                $scope.isMoreData = true;
                $scope.params.pageNumber++;
              } else {
                $scope.isMoreData = false;
              }
            }, $scope.params);
          };
          $scope.saveMaterials = function () {
            $scope.webMaterielList
              .forEach(function (stdMaterial) {
                //console.log(stdMaterial);
                //如果物料数量大于0
                if (stdMaterial.amount > 0) {
                  $scope.createStandardMaterial(stdMaterial);
                }
              });
            $ionicHistory.goBack();
              // console.log("新增的物料 保存 go back " ,JSON.stringify($stateParams.data.taskDetailInfo.materialStandarList.eaWoMaterialDemandDtoList, undefined,2));
              // console.log("新增的物料 展示 go back " ,JSON.stringify($scope.stdMaterialsViewModels, undefined,2));
          };

            $scope.materialDetail = function (materialDetail) {
              $state.go("tab.materialDetailOfM",{
                data: {
                    title: '物料详情',
                    materialDetail: angular.fromJson(materialDetail.json)
                }
              })
            };
          $scope.createStandardMaterial = function (stdMaterial) {//新增用料标准
            //默认是账内库存
            // $scope.sapInventoryFlag = true;
            var stdMaterialJson = JSON.parse(stdMaterial.json);
            //添加到工单对象的用料标准数组， sapInventoryFlag 0 账内， 1 账外
            // $scope.stdMaterials.push({
            //   demandId: null,
            //   workorderId: $scope.taskDetailInfo.apiWorkorderBaseInfoDto.workorderId,
            //   materialId: stdMaterialJson.materialId,
            //   materialName: stdMaterialJson.materialName,
            //   materialSno: stdMaterialJson.materialSno,
            //   referNum: null,
            //   actualNum: stdMaterial.amount,
            //   activeFlag: 0,
            //   sapInventoryFlag: stdMaterial.sapInventoryFlag ? 0 : 1,//0代表帐内库存
            //   unitName: stdMaterial.unitText,
            //   fileId: stdMaterialJson.materialFileid,
            //   comment: stdMaterialJson.comment,
            //   createBy: stdMaterialJson.lastUpdBy ? stdMaterialJson.lastUpdBy : Storage.getProfile().id,
            //   createOn: new Date().getTime(),
            //   lastUpdBy: stdMaterialJson.lastUpdBy ? stdMaterialJson.lastUpdBy : Storage.getProfile().id,
            //   lastUpdOn: stdMaterialJson.lastUpdateDatetimeApi,
            //   currPage: stdMaterialJson.currPage
            // });

            // 添加到展示数组，  sapInventoryFlag 是true 和 false
            $scope.stdMaterialsViewModels.push({
                demandId: null,
                workorderId: $scope.taskDetailInfo.apiWorkorderBaseInfoDto.workorderId,
                materialId: stdMaterialJson.materialId,
                materialName: stdMaterialJson.materialName,
                materialSno: stdMaterialJson.materialSno,
                referNum: null,
                actualNum: stdMaterial.amount,
                activeFlag: 0,
                sapInventoryFlag: stdMaterial.sapInventoryFlag,//0代表帐内库存
                unitName: stdMaterial.unitText,
                fileId: stdMaterialJson.materialFileid,
                comment: stdMaterialJson.comment,
                createBy: stdMaterialJson.lastUpdBy ? stdMaterialJson.lastUpdBy : Storage.getProfile().id,
                createOn: new Date().getTime(),
                lastUpdBy: stdMaterialJson.lastUpdBy ? stdMaterialJson.lastUpdBy : Storage.getProfile().id,
                lastUpdOn: stdMaterialJson.lastUpdateDatetimeApi,
                currPage: stdMaterialJson.currPage
            });
            // console.log("新增的物料 存储" + JSON.stringify($scope.stdMaterials[$scope.stdMaterials.length-1], null, 2));
            // console.log("新增的物料 展示" + JSON.stringify($scope.stdMaterialsViewModels[$scope.stdMaterialsViewModels.length-1], null, 2));
          }
        })
    //作业指导书
    .controller('InstructorCtrl', function (Storage, $scope, MaintainTaskRW, Utils, $cordovaFile,eamFile ,modifiedJson, SchdleMaintainApi, Popup, $stateParams, $ionicLoading, WorkOrderApi, $state, $cordovaFileTransfer, $timeout) { //作业指导书
      $scope.workOrderDetailInfo = $stateParams.data;
      console.log("workOrderDetailInfo: ", $scope.workOrderDetailInfo);
      $scope.instructors = [];
      var manualIds = [];
      $scope.workOrderDetailInfo.workorderManuals.forEach(function (item) {
        manualIds.push(item['eaWoManualDTO']['mastermanualId']);
      });
      if (manualIds.length == 0) {
        return;
      }
      MaintainTaskRW.getInstructors(manualIds, function (instructors) {
        Popup.hideLoading();
        console.log(instructors);
        $scope.instructors = instructors;
      });
      $scope.openFile=function (fileItem) {
        eamFile.openEamAttachedFile(fileItem);
      };
      //打开一本作业指导书
      $scope.openDirectory = function (instructor) {
        $state.go("tab.pdfTreeView", {
          params: JSON.stringify({
            "instructorTitle": instructor.manualInfoDTO.manualName,
            "manualCataContnList": instructor.manualCataContnList
          })
        });
      };
      $scope.download = function (downFile) {
        var storePath = cordova.file.dataDirectory;
        //
        if (storePath.lastIndexOf("/") == -1) {
          storePath += "/";
        }
        var const_upgradeFilePath = storePath + Utils.generateUUID() + ".pdf";//存放pdf地址

        var fileServerPath = baseUrl + "/api/other/downloadFile.api?fileId=" + downFile.fileId;
        var ops = {
          headers: {"tokenId": Storage.getAccessToken()}
        };
        try {
          $scope.loadData = 0;
          $cordovaFileTransfer.download(fileServerPath, const_upgradeFilePath, ops, true).then(function (fileEntry) {
            $ionicLoading.hide();
            $state.go("tab.pdfDetail", {url: const_upgradeFilePath, title: downFile.fileName});
          }, function (err) {
            alert("savePath:" + const_upgradeFilePath);
            alert(window.JSON.stringify(err));
          }, function (progress) {
            //进度，这里使用文字显示下载百分比
            $timeout(function () {
              var downloadProgress = (progress.loaded / progress.total) * 100;
              $ionicLoading.show({template: "已经下载：" + Math.floor(downloadProgress) + "%"});
              if (downloadProgress > 99) {
                $ionicLoading.hide();
              }
            });
          });
        } catch (e) {
          alert("error:" + window.JSON.stringify(e));
        }
      }
    })
    //详情展示
    .controller('scheduledMaintainTaskDetailShow', function ($scope,modifiedJson, $ionicHistory, $cordovaFile,$stateParams , $timeout, $cordovaFileTransfer,  Popup, eamFile, eamMTInstallWorkOrderFactory ,MaintainTaskRW, Storage) {
      console.log("scheduleDetailShow :", $stateParams.data);
      $scope.allOrderData = $stateParams.data||modifiedJson.getMockOrderJson();
      $scope.baseTaskInfo = $scope.allOrderData.apiWorkorderBaseInfoDto;
      $scope.detailTaskInfo = $scope.allOrderData.workorderDetails;

      $scope.taskInfoForWeb = $scope.detailTaskInfo["eaWoWorkorderinfoDto"];
      $scope.imgFiles = $scope.allOrderData.workorderDetails.eaWoFilemappingList;//附件列表

      // $scope.responsiblePersion = "";
      // MaintainTaskRW.getResponsiblePerson($scope.baseTaskInfo.assignPerson, function (res) {
      //   if (res) {
      //     $scope.responsiblePersion = res;
      //   }
      // });
      $scope.currentUserId = Storage.get("USER_PROFILE").id;

      $scope.isCanEditImg = function () {
          return $scope.baseTaskInfo.assignPerson == $scope.currentUserId && $scope.baseTaskInfo.workorderStatus == 141;
      };

      $scope.remark = $scope.detailTaskInfo.eaWoWorkorderinfoDto.remark;
      // $scope.remark = $scope.detailTaskInfo.eaWoWorkorderinfoDto;
      // angular.copy(res);
      console.log("remark: ", $scope.remark == $scope.detailTaskInfo.eaWoWorkorderinfoDto.remark);
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
        }, function (err) {
          Popup.promptMsg(JSON.stringify(err), "获取附件失败")
        });
      };

      $scope.addAttachment = function (task) {
        if (task.workorderStatus != maintainTask.taskStatus.processing) {//不是处理中就不进行操作
          return;
        }
        eamFile.getPicture({
          source: AttachedFileSources.workorder_detail_source,
          workorderId: $scope.baseTaskInfo.workorderId,
          fileActualName: "定维_" + $scope.taskInfoForWeb.workorderId + "_" + $scope.taskInfoForWeb.workorderCode
        }).then(function (fileItem) {
          $scope.imgFiles.push(fileItem);
        }, function (err) {
          Popup.promptMsg(JSON.stringify(err), "获取附件失败")
        });
      };  //end addAttachment();

      $scope.saveDetailInfo = function () {
        Popup.confirm("确定要保存详情信息吗？", function () {
          eamMTInstallWorkOrderFactory.saveWorkOrder($scope.allOrderData, function (res) {
            if (res) {
              console.log("remark: ", $scope.remark == $scope.detailTaskInfo.eaWoWorkorderinfoDto.remark);
              console.log("保存后信息", res);
            }
            $ionicHistory.goBack();
          });
        }, function () {

        }, "确定", "取消");

      }
    })
;
