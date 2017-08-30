/**
 * 数据同步服务。
 *
 * 数据库表增加一个lastupdate表，用来记录最后下载时间。
 * 每条数据的主表增加一个最后修改时间，用来记录最后修改时间。
 * 当前时间，使用服务器时间。
 *
 * 数据同步基本入参 开始时间、结束时间、结束后回调方法
 * 附件信息异步下载，通过异步将附件信息下载到手机，将需要下载的附件信息写入附件表，并标记附件是否已经下载，然后由手机自动排序将附件下载到本地。
 *
 */
angular.module('starter.eamSync',
  [
    'starter.SyncRepertory',
    'starter.SyncCommonMaterial',
    'starter.SyncCommonDictionary',
    'starter.SyncCommonProject',
    'starter.SyncSchdlemaintain',
    'starter.SyncSparepart',
    'starter.SyncSparepartDelivery',
    'starter.SyncWorkHours',
    'starter.SyncWorkorder',
    'starter.SyncUsers',
    'starter.SyncCommonDeviceEquipment',
    'starter.SyncProblemReport',
    'starter.SyncCommonManual',
    "starter.eamFaultWorkOrderModule",
    "starter.eamMaintainTechInstallWorkOrderModule"
  ]
)
  .factory("eamSync", function ($q, $timeout, $rootScope, $http, $cordovaNetwork, $cordovaFile, $cordovaFileTransfer,
                                Storage, Popup, eamDB, eamSyncAjax, eamFile, SyncCommonMaterial, SchdleMaintainApi,
                                eamFaultWorkOrderFactory, $ionicBackdrop, SyncRepertory, SyncCommonDictionary, SyncCommonProject,
                                $state, SyncCommonManual, SyncSparepart, SyncSparepartDelivery, SyncWorkHours, SyncUsers,
                                SyncWorkorder, $ionicHistory, cfpLoadingBar, OrderService, SyncCommonDeviceEquipment, SyncProblemReport, eamMTInstallWorkOrderFactory) {
    var api_getSystemTime = baseUrl + "/api/common/getSystemTime.api";
    var api_getFile = baseUrl + "/api/common/getFile.api";
    var api_getFileType = baseUrl + "/api/common/getFileType.api";
    var api_uploadfile = baseUrl + "/api/common/uploadFile.api";

    var sql_get_one_file = "select * from eam_sync_file where downloadStatus=0 LIMIT 1";
    var sql_check_one_file = "select * from eam_sync_file where fileId=?";
    var sql_update_file_fail = "update eam_sync_file set downloadStatus=? where fileId=?";
    var sql_update_file_to_0 = "update eam_sync_file set downloadStatus=0 where downloadStatus=-1";
    var sql_update_file_success = "update eam_sync_file set downloadStatus=1, filePath=?, originalFilename=?,contentType=?,lastUpdateDatetimeApi=? where fileId=?";
    var sql_insert_file = "insert into eam_sync_file (fileid, downloadStatus) values (?, ?)";
    //上次网络操作时间
    var last_handle_time = new Date();
    /*
     数据同步开关，如果状态为false则表示需要停止同步操作，如果为开则表示继续同步。
     在sync方法执行时，如果监听到状态关闭以后，在完成当前数据同步后就停止数据同步了，并将同步状态还原为true。
     */
    var sync_Switch = true;
    var sync_File_Switch = true;

    //同步服务是否正在运行。
    var is_running = false;

    var is_system_sync = false;

    //当前服务器时间
    var now_server_date = "";
    //同步的方法名，先上传后下载。
    var upSyncFuncs = [//需要顺序上传的方法名。
      "eamMTInstallWorkOrderFactory.uploadWorkOrders",
      "eamFaultWorkOrderFactory.uploadFaultOrders",
      "SyncSparepart.uploadList",
      "SyncWorkHours.uploadList"
    ];
    var downSyncBaseFuncs = [//基础数据
      "SyncCommonManual.getCommonManual",//指导书
      "SyncCommonMaterial.downloadList",//物料
      "SyncCommonDictionary.downloadList",//字典信息
      // "SyncCommonProject.downloadList",//项目信息
      "SyncRepertory.downloadList"//仓库信息
    ];
    var downSyncBusinessFuncs = [//需要顺序下载的方法名。
      "eamMTInstallWorkOrderFactory.downLoadWorkOrders",//工单数据
      "eamFaultWorkOrderFactory.downloadFaultOrders",//故障工单数据
      "SyncSparepart.downloadList",//备品备件
      "SyncCommonDeviceEquipment.downloadList",//风机设备
      // "SyncSparepartDelivery.downloadList",//发货单
      "SyncUsers.downloadList", //作业人
      // "SyncSparepartDelivery.downloadList",//收货、发货单据,已经有api根据id获取发货单信息
      "SyncWorkHours.downloadList", //工时填报/人员报工
      "SyncProblemReport.downloadList"//问题报告
    ];


    /**
     *
     * @type {Array}
     */
    var synclogs = [];
    /**
     * 当前弹出窗口
     */
    var popalerts = [];
    var tempDownloadBaseSyncFn = {};


    function initStorageFuncNum() {
      downSyncBaseFuncs.filter(function (fn) {
        return StringUtils.isNotEmpty(fn);
      }).forEach(function (item) {
        tempDownloadBaseSyncFn[item] = item;
      });
    }

    function isBasicMethod(method) {
      return downSyncBaseFuncs.indexOf(method) >= 0;
    }

    function isUploadMethod(method) {
      return upSyncFuncs.indexOf(method) >= 0;
    }


    var isAutoSync = false;//是否自动同步
    initStorageFuncNum();


    /**
     * 执行同步任务
     * @param func 如果指定方法则只执行当前方法。
     * @param callback
     */
    var funcSyncStartDate = new Date();
    var syncTimestamp = 'syncTimestamp';
    console.time(syncTimestamp);
    var sync = function (tasks, callback) {
      $ionicBackdrop.retain();
      var taskFunc = [];
      Popup.waitLoad("正在同步数据......<br/>" +
        "<a class='sync a' ng-click='stopSync();'>点击停止同步</a>");
      /**
       * 判断是否传入任务信息，如果有任务则将任务添加到待执行任务队列里面。
       */
      if (tasks !== undefined) {
        isAutoSync = false;
        console.log("eamSync,tasks", tasks);
        if ($.isArray(tasks)) {
          taskFunc = taskFunc.concat(tasks);
        } else {
          taskFunc.push(tasks);
        }
      } else {
        console.log("是否正在同步:", is_running);
        isAutoSync = true;
        if (!is_running) {//只有任务未执行时才执行全局任务
          // 将任务生成队列。
          taskFunc = taskFunc.concat(upSyncFuncs);
          taskFunc = taskFunc.concat(downSyncBaseFuncs);
          taskFunc = taskFunc.concat(downSyncBusinessFuncs);
        }
      }
      if (!window.cordova) {
        $rootScope.isOnline = window.navigator.onLine;
      }
      console.log("$rootScope.isOnline:" + $rootScope.isOnline + "\ttaskFunc " + JSON.stringify(taskFunc, undefined, 2));
      //判断网络情况，如果网路不通，则停止同步。
      if (!$rootScope.isOnline) {
        // console.log(tasks);
        //不进行同步，直接结束当前任务
        Popup.eamSyncHideLoading();
        is_running = false;
        now_server_date = "";
        sync_Switch = true;//下一次需要同步数据
        $ionicBackdrop.release();
        callback(false);
        Popup.loadMsg("请检查网络");
        // synclog("请检查网络");
        showLog();
        return;
      }
      console.log("sync_Switch: " + sync_Switch);
      //首先先判断sync_Switch是否是false，如果是false就不进行同步了，并将sync_Switch设置为true
      if (sync_Switch && taskFunc.length > 0) {
        cfpLoadingBar.start();
        // console.log(taskFunc);
        is_running = true;
        is_system_sync = true;
        var startSyncAll = new Date;
        Popup.waitLoad("正在同步数据...");
        async.autoInject({
          "needSyncFunctions": function (callback) {
            return callback(null, taskFunc);
          },
          "runSyncFunctions": ["needSyncFunctions", runSyncFunctions]
        }, function (err, results) {
          $ionicBackdrop.release();
          Popup.hideLoading();
          $rootScope.$broadcast(SCROLL_INFINITE_COMPLETE);
          $rootScope.$broadcast(SCROLL_REFRESH_COMPLETE);
          cfpLoadingBar.complete();//进度条完成
          is_running = false;
          is_system_sync = false;
          if (isDebug) {
            console.log("同步耗时：", (new Date - startSyncAll) / 1000.0, "秒");
          }
          now_server_date = "";
          // if (err) {
          //   if (isDebug) {
          //     console.log("同步过程出错： <br/>" + err);
          //     console.error(err);
          //   }
          //   // synclog(angular.isObject(err) ? JSON.stringify(err) : err);
          //   callback(false, err);
          // } else {
          //   callback(true);
          // }
          callback(getSyncLogLength() === 0);//如果没有错误日志，说明没有错误产生，否则同步失败
          showLog();//不管成功失败，都显示同步过程中的一些日志信息（如果有的话）
        });
      } else {
        //本次不同步，清空当前待同步任务
        //因为监控到sync_Switch设置为关闭了，所以停用以后需要将开关设置为打开，否则任务就不会再同步了
        sync_Switch = true;
        //任务运行状态设置为false
        is_running = false;
        is_system_sync = false;
        taskFunc = [];
        now_server_date = "";
        Popup.hideLoading();
        showLog();
        cfpLoadingBar.complete();//进度条消失
        $ionicBackdrop.release();
        checkBaseDataDownloadStat()
          .then(function (baseFunctions) {//如果网络中断，基础数据尚未下载完成，则需要调回登录界面
            if (baseFunctions.length !== 0) {
              $rootScope.$broadcast(SCROLL_REFRESH_COMPLETE);
              $rootScope.$broadcast(SCROLL_INFINITE_COMPLETE);
              Popup.hideLoading();
              $ionicBackdrop.release();
              Popup.loadMsg("请重新登录", 500);
              return $state.go("login");
            }
          }).then(function () {
          if ($.isFunction(callback)) callback(true);
        }).catch(function (e) {
          synclog(JSON.stringify(e));
        });
      }
    };
    console.timeEnd(syncTimestamp);

    /**
     * 使用each方法
     * @param currentServerTime
     * @param taskFuncs
     * @param runSyncFunctionsCallback
     */
    function runSyncFunctions(taskFuncs, runSyncFunctionsCallback) {
      // console.log(currentServerTime);
      async.eachSeries(taskFuncs, taskIteratee, function (err, result) {
        if (err) {
          console.error(err);
          runSyncFunctionsCallback(err);
        } else {
          runSyncFunctionsCallback(null);
        }
      });
      /**
       * 迭代同步函数
       * @param item
       * @param taskIterateeCallback
       */
      function taskIteratee(item, taskIterateeCallback) {
        // console.log(item);
        async.autoInject({
          "currentSyncServerTime": currentSyncServerTime,
          "syncFunction": function (callback) {
            return callback(null, item);
          },
          "lastSyncTime": ['currentSyncServerTime', "syncFunction", getLastSyncTime],
          "executingEachTask": ["currentSyncServerTime", "lastSyncTime", "syncFunction", executingEachTask]
        }, function (err, results) {
          if (err) {
            console.error(err);
          }
          taskIterateeCallback();//错误不抛，所有的错误已经记录在syncLog中，原因是，必须同步每一个传入进来的函数
          // if (err) {
          //   taskIterateeCallback(err);
          // } else {
          //   taskIterateeCallback(null, results);
          // }
        });
      }
    }

    /**
     * 执行每一个同步函数
     * @param currentSyncServerTime
     * @param lastSyncTime
     * @param syncFunction
     * @param executingEachTaskCallback
     */
    function executingEachTask(currentSyncServerTime, lastSyncTime, syncFunction, executingEachTaskCallback) {
      var syncFunctionName = syncFunction;
      console.log(syncFunctionName);
      syncFunction = eval(syncFunction);
      funcSyncStartDate = new Date;
      if (!sync_Switch) {
        synclog("网络不通，" + "停止同步 " + syncFunctionName);
        return executingEachTaskCallback("停止同步 " + syncFunctionName);
      }
      eachSyncFunction(function (err, status) {
        if (err) {
          console.error(err);
          return executingEachTaskCallback(err);
        } else if (status === true) {
          eamDB.execute(db, "update eam_sync set sync_type=?,update_time=? where sync_func=?",
            ["1", currentSyncServerTime, syncFunctionName])
            .then(
              function (res) {
                return executingEachTaskCallback(null, "方法: " + syncFunctionName + "同步成功");
              },
              function (err) {
                console.error(err);
                return executingEachTaskCallback(err);
              });
        } else {
          executingEachTaskCallback("业务数据下载失败，请重新执行下载操作");
        }
      });
      // async.parallel([async.reflect(eachSyncFunction)],
      //   function (err, results) {
      //     results = results[0];
      //     if (angular.isObject(results)) {
      //       if (results.error) {
      //         console.error(err);
      //         executingEachTaskCallback(err);
      //       } else if (results.value) {
      //         eamDB.execute(db, "update eam_sync set sync_type=?,update_time=? where sync_func=?",
      //           ["1", currentSyncServerTime, syncFunctionName])
      //           .then(
      //           function (res) {
      //             // callback("同步失败");
      //             return executingEachTaskCallback(null, "方法: " + syncFunctionName + "同步成功");
      //           },
      //           function (err) {
      //             console.error(err);
      //             return executingEachTaskCallback(err);
      //           });
      //       }
      //     }
      //     // console.log(results);
      //   });
      function eachSyncFunction(callback) {
        // console.log(syncFunctionName);
        console.log("当前同步函数：" + syncFunctionName + " " + new Date(lastSyncTime) + "--->" + " " + new Date(currentSyncServerTime));
        cfpLoadingBar.start();
        $ionicBackdrop.retain();
        syncFunction(lastSyncTime, currentSyncServerTime, function (status, err) {
          cfpLoadingBar.complete();
          $ionicBackdrop.release();
          $rootScope.$emit("cfpLoadingBar:refreshCompleted");
          console.log("方法：" + syncFunctionName + "同步耗时：" + (new Date - funcSyncStartDate) + "ms" + "同步状态：" + (status ? "成功" : "失败"));
          if (status) {
            return callback(null, status);
          } else {
            console.error("syncFunctionName：", syncFunctionName + " 同步失败!", "原因：", err);
            if (isBasicMethod(syncFunctionName)) {
              stopSync('基础数据同步失败');
              var errMessage = JSON.stringify(err);
              callback('基础数据下载失败,' + errMessage);
            } else {
              if (isUploadMethod(syncFunctionName)) {//如果是上传同步失败
                var errorMessage = err && err.errorMessage || JSON.stringify(err);
                console.error(errorMessage);
                // Popup.promptMsg("上传同步失败<br/>" + errorMessage);
                callback("上传同步失败<br/>" + errorMessage);
              } else {//业务数据下载失败
                // synclog("业务数据同步失败，请手动同步数据");
                callback(null, err);
                console.error(err);
              }
            }
          }
        });
      }
    }

    /**
     * 获取服务器的时间
     * @param callback
     */
    function currentSyncServerTime(callback) {
      eamSyncAjax.doGet(api_getSystemTime, [], function (res) {
        if (res.success) {
          now_server_date = res.data;
          callback(null, res.data);
        } else {
          console.error(res);
          callback(res || "网络错误");
        }
      }, {timeout: 5000});
    }

    /**
     * 获取同步函数上一次更新的时间
     * @param currentSyncServerTime
     * @param syncFunction
     * @param callback
     */
    function getLastSyncTime(currentSyncServerTime, syncFunction, callback) {
      eamDB.execute(db, "select * from eam_sync where sync_func =?", [syncFunction])
        .then(function (res) {
          var lastUpdateTime = 0;
          if (res.rows.length > 0) {
            // if (isDebug) {
            //   console.log(res.rows.item(0));
            // }
            lastUpdateTime = res.rows.item(0)["update_time"];
            if (!lastUpdateTime) {
              if (downSyncBaseFuncs.indexOf(syncFunction) >= 0) {//基础数据
                lastUpdateTime = 946684800000;//置为2000年
              } else {//业务数据
                lastUpdateTime = currentSyncServerTime - 2 * 30 * 24 * 3600 * 1000;//当前服务器时间两个月前
                if (syncFunction == "SyncCommonDeviceEquipment.downloadList") {//如果是风机设备
                  lastUpdateTime = 946684800000;//置为2000年
                }
              }
            }
            callback(null, lastUpdateTime);
          } else {//由于后来在sql.js里面一次性将所有的同步函数写入eam_sync表格中，这里仅当同步函数是上行同步的函数时才走
            if (isDebug) {
              console.log("syncFunction: ", syncFunction);
            }
            if (downSyncBaseFuncs.indexOf(syncFunction) >= 0) {//基础数据
              lastUpdateTime = 946684800000;//置为2000年
            } else {//业务数据
              lastUpdateTime = currentSyncServerTime - 2 * 30 * 24 * 3600 * 1000;//当前服务器时间两个月前
              if (syncFunction == "SyncCommonDeviceEquipment.downloadList") {//如果是风机设备
                lastUpdateTime = 946684800000;//置为2000年
              }
            }
            eamDB.execute(db, "insert into eam_sync(sync_type,sync_func,update_time)values(?,?,?)",
              ["0", syncFunction, lastUpdateTime])
              .then(function () {
                callback(null, lastUpdateTime);
              }, function (err) {
                console.error(err);
                callback(err);
              });
          }
        }, function (err) {
          callback(err);
          console.error(err);
        })
    }

    /**
     * 更新系统最后操作时间。
     * 用户每一步操作都建议更新一下这个时间。
     */
    var updateLastHandleTime = function () {
      last_handle_time = new Date();
    };
    /**
     * 停止数据同步或上传。
     */
    var stopSync = function (reason) {
      reason = reason || {reason: '点击停止同步'};
      if (isDebug) {
        console.log('stopSync: ' + JSON.stringify(reason), undefined, 2);
      }
      sync_Switch = false;
      sync_File_Switch = false;
      is_running = false;
      // var po = Popup.waitLoad("当前任务结束后会自动停止同步…… <div ng-click='stoppingMessage()'>点击停止</div>");
      // popalerts.push(po);
      // closePopups();
      showLog();
      checkBaseDataDownloadStat()
        .then(function (funcs) {
          if (funcs.length) {//如果仍有需要同步的基础函数
            $state.go('login');
          }
        }, function (err) {
          Popup.promptMsg("检查同步函数失败" + JSON.stringify(err));
        });
    };
    /**
     * 检查基本数据下载的情况
     */
    var checkBaseDataDownloadStat = function () {
      var defer = $q.defer();
      eamDB.execute(db, "select sync_func from " + "eam_sync where sync_type=1")
        .then(function (res) {
          var remainBaseFuncs = downSyncBaseFuncs.filter(function (bf) {
            //如果bf不在下载成功的函数列中，则这个基础数据函数就没有下载成功
            return !OrderService.ChangeSQLResult2Array(res)
              .some(function (f) {
                return f.sync_func == bf;
              });
          });
          defer.resolve(remainBaseFuncs);
        }, function (err) {
          if (err.code === 5) {
            defer.resolve(downSyncBaseFuncs);//手机上第一次安装，这个表格还未创建，会抛这个错误
          } else {
            defer.reject(err);
          }
        });
      return defer.promise;
    };
    /**
     * 每隔 syncCheckInterval 分钟监听一次上次操作时间，如果长时间没有用户操作则尝试启动同步任务。
     * 如果用户开启仅WiFi联网，需要在WiFi条件下方能自动同步
     */
//TODO 五分钟同步，测试，用一分钟
    var syncCheckInterval = 1000 * 60 * 5;
    var times = 500000;
    var lastAutoSyncTime = new Date;
    var runsyncjob = function () {
      async.retry({
        times: times,
        interval: syncCheckInterval
      }, function (callback) {
        console.log("继续尝试:", is_running == true || (new Date - last_handle_time.getTime() < syncCheckInterval));
        if (is_running == true || (new Date - last_handle_time.getTime() < syncCheckInterval)) {
          return callback("继续尝试");
        }
        if (!Storage.getAccessToken()) {
          $state.go("login");
          stopSync("token不存在");
          console.error("终止自动同步");
          return callback();
        }
        $rootScope.checkNetWorkState()
          .then(function () {
            if ($rootScope.isOnline) {//在线情况下
              if ($rootScope.isWiFi) {//无线
                console.log("开始使用WiFi自动同步", "时间间隔", new Date - lastAutoSyncTime, "ms");
                sync(undefined, function (res, err) {
                  lastAutoSyncTime = new Date;
                  if (res) {
                    console.log("自动同步成功");
                    callback("自动同步成功");
                  } else {
                    callback(err || "自动同步失败");
                  }
                })
              } else {//使用流量
                if (!$rootScope.onlyWifi) {//用户关了开关
                  console.log("开始使用流量自动同步", "时间间隔", new Date - lastAutoSyncTime, "ms");
                  sync(undefined, function (res, err) {
                    lastAutoSyncTime = new Date;
                    if (res) {
                      console.log("自动同步成功");
                      callback("自动同步成功");
                    } else {
                      callback(err || "自动同步失败");
                    }
                  })
                } else {//不同步
                  console.log("仅WiFi开关关闭，当前是手机流量，不同步");
                }
              }
            }
          });
      }, function (err, results) {
        if (err) {
          console.error(err);
          alert("自动同步失败！");
        }
      });
    };

    /**
     * 操作完成后写入日志
     * @param log
     */
    var synclog = function (log) {
      synclogs.push(log);
    };
    var getSyncLogLength = function () {
      return synclogs.length;
    };

    function closePopups() {
      $ionicBackdrop.release();
      if (popalerts.length > 0) {
        popalerts.forEach(function (item) {
          if (item != undefined) {
            item.close();
          }
        });
        popalerts = [];
      }
      Popup.hideLoading();
      // $ionicHistory.clearHistory();
      // $ionicHistory.clearCache();
    }

    /**
     * 任务执行完成了，显示日志。
     */
    var showLog = function () {
      //显示日志
      Popup.hideLoading();
      if (isAutoSync) {
        return synclogs = [];//清空日志即可，不显示日志信息
      }
      if (synclogs.length > 0) {
        var html = "";
        for (var i in synclogs) {
          console.log("syncLog: " + JSON.stringify(synclogs[i]), undefined, 2);
          html += synclogs[i] && synclogs[i].errorMessage ? synclogs[i].errorMessage ://销库不成功的是一个对象{errorType,errorMessage}
            synclogs[i] + "</br>";
        }
        //closePopups();
        var popal = Popup.popupConfirm(function (res) {
        }, {
          title: "同步出错信息",
          template: html,
          buttons: [{
            text: "停止",
            type: 'button-default',
            onTap: function () {
              closePopups();
              return false;
            }
          }, {
            text: "确定",
            type: 'button-positive',
            onTap: function () {
              closePopups();
              return true;
            }
          }]
        }, '同步结果');
        console.log(popal);
        popalerts.push(popal);
        synclogs = [];
      }
    };

    var getIsSystemSync = function () {
      return is_system_sync;
    };

    function getSyncFuncArr() {
      return angular.copy(tempDownloadBaseSyncFn);
    }

    return {
      sync: sync,
      synclog: synclog,
      runsyncjob: runsyncjob,
      stopSync: stopSync,
      updateLastHandleTime: updateLastHandleTime,
      getIsSystemSync: getIsSystemSync,
      getSyncFuncArr: getSyncFuncArr,
      getDownSyncBaseFunctions: function () {
        return downSyncBaseFuncs;
      },
      getDownSyncBusinessFunctions: function () {
        return downSyncBusinessFuncs.slice(0);
      },
      setSyncSwitch: function (boolean) {
        sync_Switch = !!boolean;
      },
      getSyncLogLength: getSyncLogLength,
      checkBaseFuncsStat: checkBaseDataDownloadStat,
    }
  });
