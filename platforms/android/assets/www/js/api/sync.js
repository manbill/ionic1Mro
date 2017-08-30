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
    'starter.SyncCommonManual'
  ]
)
  .factory("eamSync", function ($q, $timeout, $rootScope, $http, $cordovaNetwork, $cordovaFile, $cordovaFileTransfer, Storage, Popup, eamDB, eamSyncAjax, eamFile,
                                SyncCommonMaterial, SchdleMaintainApi, $ionicBackdrop, SyncRepertory, SyncCommonDictionary, SyncCommonProject, SyncSchdlemaintain, SyncCommonManual, SyncSparepart, SyncSparepartDelivery, SyncWorkHours, SyncWorkorder, SyncUsers, SyncCommonDeviceEquipment, SyncProblemReport) {
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
      "SyncSchdlemaintain.uploadList",
      "SyncSparepart.uploadList",
      "SyncWorkHours.uploadList"
    ];
    var downSyncBaseFuncs = [//基础数据
      'SyncCommonManual.getCommonManual',//指导书
      "SyncCommonMaterial.downloadList",//物料
      "SyncCommonProject.downloadList",//项目信息
      "SyncCommonDictionary.downloadList",//字典信息
      'SyncCommonDeviceEquipment.downloadList',//风机设备
      "SyncUsers.downloadList", //可选用户
      "SyncRepertory.downloadList"//仓库信息
    ];
    var downSyncBusinessFuncs = [//需要顺序下载的方法名。
      "SyncSchdlemaintain.downloadList",//工单数据
      "SyncSparepart.downloadList",//备品备件
      "SyncSparepartDelivery.downloadList",//备件发货
      "SyncWorkorder.downloadList",//人员报工
      "SyncWorkHours.downloadList", //工时填报
      "SyncProblemReport.downloadList"//问题报告
    ];

    var taskFunc = [];

    /**
     *
     * @type {Array}
     */
    var synclogs = [];

    /**
     * 当前弹出窗口
     */
    var popalerts = [];
    var tempDownSyncFn = {};

    function initStorageFuncNum() {
      downSyncBaseFuncs.forEach(function (item) {
        tempDownSyncFn[item] = item;
      })
    }

    initStorageFuncNum();
    /**
     * 执行同步任务
     * @param func 如果指定方法则只执行当前方法。
     * @param callback
     */
    var funcSyncStartDate = new Date();
    var sync = function (tasks, callback) {
      Popup.waitLoad("正在同步数据......<br/>" +
        "<a class='sync a' ng-click='stopSync();'>点击停止同步</a>");
      /**
       * 判断是否传入任务信息，如果有任务则将任务添加到待执行任务队列里面。
       */
      if (tasks != undefined) {
        //判断网络状态
        if (!$rootScope.isOnline) {
          //不进行同步，直接结束当前任务
          Popup.eamSyncHideLoading();
          is_running = false;
          callback();
          return;
        }

        if (!$.isFunction(callback)) {
          is_running = false;
          Popup.eamSyncHideLoading();
          Popup.promptMsg("没有回调方法，手动调起同步任务失败！", "没有回调方法");
          return;
        }
        Popup.waitLoad("正在同步数据......");
        //或者需要执行单个任务。
        if ($.isArray(tasks)) {
          taskFunc = taskFunc.concat(tasks);
        } else {
          taskFunc.push(tasks);
        }
      } else {
        if (is_running == false) {//只有任务未执行时才执行全局任务
          is_system_sync = true;
          // 将任务生成队列。
          taskFunc = taskFunc.concat(upSyncFuncs);
          taskFunc = taskFunc.concat(downSyncBaseFuncs);
          taskFunc = taskFunc.concat(downSyncBusinessFuncs);
        }
      }
      is_running = true;

      //判断网络情况，如果网路不通，则停止同步。
      if (!$rootScope.isOnline) {
        sync_Switch = false;
        // synclog("当前网络不通");
      }

      //首先先判断sync_Switch是否是false，如果是false就不进行同步了，并将sync_Switch设置为true
      if (sync_Switch == true && taskFunc.length > 0) {
        //获取最新一条需要同步的任务方法
        var func = taskFunc.shift();
        if (func == undefined) {//找不到待执行方法了，任务结束。
          is_running = false;
          is_system_sync = false;
          now_server_date = "";
          Popup.hideLoading();
          // synclog("数据任务同步结束！");
          showlog();

          //如果有回调函数调用回调函数
          if (callback != undefined) {
            Popup.eamSyncHideLoading();
            is_running = false;
            callback();
          } else {
            //如果是系统自动运行的同步job，调用表完成则自动清理同步附件文件夹
            if (is_system_sync) {
              eamFile.clearUploadFile();
            }
          }
        } else {
          //从数据库中获取这个方法的上次更新时间，数据库时间是时间戳。
          eamDB.execute(db, "select * from eam_sync where sync_func =?", [func])
            .then(function (res) {
              var last_update_time = new Date().getTime() - 1000 * 60 * 60 * 24 * 60;//两个月以前的时间。
              if (res.rows.length > 0) {
                last_update_time = res.rows.item(0)["update_time"];
                if (last_update_time == "" || last_update_time == "undefined") {
                  last_update_time = new Date().getTime() - 1000 * 60 * 60 * 24 * 60;
                }
              } else {
                //说明没有最后更新时间，是一条新数据。
                if (downSyncBaseFuncs.indexOf(func) >= 0) {
                  //说明是基础数据同步，如果基础数据同步不成功的话会造成业务失败，所以必须同步成功
                  last_update_time = 946684800000;//设置为2000年
                }
                //将本条数据写入到数据库。
                eamDB.execute(db, "insert into eam_sync (sync_type,sync_func,update_time) values (?,?,?)", ['0', func, last_update_time]);
              }
              //执行后续同步操作。
              var funcrun = eval(func);
              if (StringUtils.isNotEmpty(now_server_date)) {
                ajaxCallback(now_server_date);
              } else {
                //从服务器拉取服务器当前时间。
                eamSyncAjax.doGet(api_getSystemTime, [], ajaxCallback, {timeout: 5000});
              }
              function ajaxCallback(req) {
                now_server_date = now_server_date || req.data;
                funcSyncStartDate = new Date();//用于记录每一个同步函数的同步过程消耗时间
                funcrun(last_update_time, now_server_date, function (success) {
                  //seccuss 可能是undfind;
                  if (success && success == true) {
                    console.log("方法" + func + "同步成功耗时", (new Date() - funcSyncStartDate) / 1000.0, 's');
                    //更新最后操作时间到数据库，成功后 sync_type="1"
                    eamDB.execute(db, "update eam_sync set sync_type=?,update_time=? where sync_func=?", ["1", now_server_date, func])
                      .then(function () {
                        last_handle_time = new Date();
                        sync(undefined, callback);
                      }, function (error) {
                        console.error(error);
                        synclog("更新" + func + "最后操作时间到数据库失败！");
                        if (taskFunc.length > 0) {
                          sync(undefined, callback);
                        } else if ($.isFunction(callback)) {
                          is_running = false;
                          callback();
                        }
                      });
                  } else {
                    sync(undefined, callback);
                  }
                });
              }
            }, function (err) {
              console.error(err);
              //显示同步任务失败提示，提醒用户联系管理员
              synclog("检查[" + func + "]上次同步时间失败！");
              is_running = false;
              if ($.isFunction(callback)) callback();
            });
        }
      } else {
        //本次不同步，清空当前待同步任务
        //因为监控到sync_Switch设置为关闭了，所以停用以后需要将开关设置为打开，否则任务就不会再同步了
        sync_Switch = true;
        //任务运行状态设置为false
        is_running = false;
        is_system_sync = false;
        taskFunc = [];
        now_server_date = "";
        showlog();
        Popup.hideLoading();
        if ($.isFunction(callback)) callback();
      }
    };

    /**
     * 通过数据库后台慢慢同步文件信息。
     * @param fileid 需要下载的文件id
     * @param callback 回调,传递参数是 eam_syn_file数据库查询对象
     */
    var downloadFile = function (fileid, callback) {
      //后台异步进行附件下载。
      //判断当前网络状况是在wifi状态下。
      //网络下载数据，完成下载后更新数据库，调用本方法。
      if (window.cordova && $rootScope.isOnline && $rootScope.isWiFi && !fileid) { //说明是从后台默默下载附件信息。
        //sync_File_Switch状态为true状态。
        if (sync_File_Switch) {
          //从数据库获取一条同步数据。
          eamDB.execute(db, sql_get_one_file).then(function (res) {
            if (res.rows.length > 0) {
              var item = res.rows.item(0);
              fileid = item.fileId;
              //先获取文件信息。
              $http.get(api_getFileType + "?fileid=" + fileid)
                .then(function (req) {
                  if (req.data.retCode != "00000") {
                    //将这个文件设置为下载失败，将状态设置为-1
                    eamDB.execute(db, sql_update_file_fail, [-1, fileid]).then(function (res) {
                    }, function (err) {
                      console.log("更新文件下载失败状态" + err);
                    });
                    //继续下载其他附件
                    downloadFile();
                    return;
                  }
                  var type = req.data.data;
                  //下载附件并将附件写入文件中。
                  var options = {
                    requestTimestamp: new Date().getTime(),
                    headers: {tokenId: Storage.getAccessToken()}
                  };
                  $cordovaFileTransfer.download(api_getFile + "?fileid=" + fileid, eamFile.downloadPath() + fileid + "." + type, options, true)
                    .then(function (result) {
                      // Success!
                      //更新数据文件
                      console.log("下载文件成功：" + JSON.stringify(result));
                      //更新文件下载成功
                      eamDB.execute(db, sql_update_file_success, [eamFile.downloadPath() + fileid + "." + type, fileid + "." + type, type, new Date().getTime(), fileid]).then(function (res) {
                        console.log("更新文件下载成功状态" + res);
                      }, function (err) {
                        console.log("更新文件下载成功状态" + err);
                      });
                      downloadFile();
                    }, function (err) {
                      // Error
                      console.log("下载文件失败：" + JSON.stringify(err));
                      eamDB.execute(db, sql_update_file_fail, [-1, fileid]).then(function (res) {
                        console.log("更新文件下载失败状态" + res);
                      }, function (err) {
                        console.log("更新文件下载失败状态" + err);
                      });
                      //继续下载其他附件
                      downloadFile();
                    }, function (progress) {
                      Popup.waitLoad("正在下载" + (progress.loaded / progress.total * 100));
                    });
                }, function (error) {
                  console.log("接口调用失败：" + JSON.stringify(error));
                });
            } else {
              //重置下载失败的附件信息。
              eamDB.execute(db, sql_update_file_to_0).then(function (res) {
                console.log("更新文件下载状态=0成功" + res);
              }, function (err) {
                console.log("更新文件下载状态=0失败" + err);
              });
            }

          }, function (err) {
            console.error("同步文件下载任务失败" + err);
            //显示同步任务失败提示，提醒用户联系管理员。
            // synclog("获取需要下载的文件信息失败");
          });
        } else {
          sync_File_Switch = true;
        }


      } else if ($rootScope.isOnline && fileid) {
        //下载指定的文件，不管是不是在wifi情况下。
        //检查文件是否已经下载过了
        Popup.waitLoad("正在下载附件...");
        eamDB.execute(db, sql_check_one_file, [fileid]).then(function (res) {
          Popup.eamSyncHideLoading();
          if (res.rows.length > 0) {
            var item = res.rows.item(0);
            if (item["downloadStatus"] == 1) {
              //返回当前数据
              if ($.isFunction(callback)) {

                callback(item);
                return;
              }
            }
          } else {
            //没有这个附件，初始化这个附件
            eamDB.execute(db, sql_insert_file, [fileid, 0]);
          }
          //需要下载并插入
          // 先获取文件信息。
          $http.get(api_getFileType + "?fileid=" + fileid).then(function (req) {
            if (req.data.retCode != "00000") {
              //将这个文件设置为下载失败，将状态设置为-1
              eamDB.execute(db, sql_update_file_fail, [-1, fileid]);
              return;
            }
            var type = req.data.data;
            //下载附件并将附件写入文件中。
            var options = {
              requestTimestamp: new Date().getTime(),
              headers: {tokenId: Storage.getAccessToken()}
            };

            if (window.cordova) { //如果是手机端调用则走这行代码
              $cordovaFileTransfer.download(api_getFile + "?fileid=" + fileid, eamFile.downloadPath() + fileid + "." + type, options, true)
                .then(function (result) {
                  // Success!
                  //更新数据文件
                  // console.log("下载文件成功：" + JSON.stringify(result));
                  Popup.eamSyncHideLoading();
                  eamDB.execute(db, sql_update_file_success, [eamFile.downloadPath() + fileid + "." + type, fileid + "." + type, type, new Date().getTime(), fileid]);
                  downloadFile(fileid, callback);
                }, function (err) {
                  // Error
                  console.log("下载文件失败：" + JSON.stringify(err));
                  eamDB.execute(db, sql_update_file_fail, [-1, fileid]);
                  Popup.eamSyncHideLoading();
                  callback();
                });
            } else {
              //下载附件并将附件写入文件中。
              SchdleMaintainApi.downloadFile(function (res) {
                if (res.success) {
                  var result = res.data;
                  // Success!
                  //更新数据文件
                  // console.log(result);
                  eamDB.execute(db, sql_update_file_success, ["data:image/jpeg;base64," + result, fileid + "." + type, type, new Date().getTime(), fileid]);
                  Popup.eamSyncHideLoading();
                  callback({
                    fileId: fileid,
                    filePath: "data:image/jpeg;base64," + result
                  });
                  downloadFile(fileid, callback);
                }
              }, {
                fileid: fileid,
                requestTimestamp: new Date().getTime(),
                tokenId: "" /*Storage.getAccessToken()*/
              });
            }
          }, function (error) {
            console.log("接口调用失败：" + JSON.stringify(error));
            Popup.eamSyncHideLoading();
            callback();
          });
        }, function (err) {
          console.log(err);
          Popup.eamSyncHideLoading();
          callback();
        });
      }
    };


    /**系统中附件上传功能说明：
     1、  功能中有待上传的附件，需要将附件放到upload目录下，并在操作对象对应的fileid的位置写入需要上传的文件路径信息
     2、  待数据上传时会将这个文件上传到服务器并将数据提交到服务器。
     3、  当数据同步到服务器以后，将本地缓存的图片删除。
     * 将对象中的文件上传到服务器，并将本地文件删除掉
     * @param data
     * @param callback
     */
    var updateFile = function (data, callback) {
      // 执行附件上传操作。
      var updateFileList = checkUploadFile(data);
      updateFileTransfer(data, updateFileList, callback);
    };

    var updateFileTransfer = function (data, updateFileList, callback) {
      Popup.waitLoad("正在上传附件...");
      var filePath = updateFileList.shift();
      if (filePath == undefined) {
        Popup.eamSyncHideLoading();
        callback(true);
      } else {
        //上传这个附件。
        var options = {
          fileKey: "attachFile",
          fileName: filePath,
          requestTimestamp: new Date().getTime(),
          headers: {tokenId: Storage.getAccessToken()}
        };
        $cordovaFileTransfer.upload(api_uploadfile, filePath, options, false)
          .then(function (req) {
            req = JSON.parse(req.response);
            if (req.retCode === "00000") {
              var fileid = req.data;
              setUploadFileId(data, filePath, fileid);
              updateFileTransfer(data, updateFileList, callback);
            } else {
              Popup.eamSyncHideLoading();
              callback(false);
            }
            // 文件上传成功，将文件移动到downloads目录下，并设置为已经下载成功。
          }, function (err) {
            console.log(err);
            Popup.eamSyncHideLoading();
            callback(false);
          }, function (progress) {
            Popup.hideLoading();
            Popup.waitLoad("正在上传" + (progress.loaded / progress.total * 100));
          });
      }
    };

    /**
     * 将文件id设置到对应的fileid中
     * @param data
     * @param filePath
     * @param fileid
     * @returns {Array}
     */
    var setUploadFileId = function (data, filePath, fileid) {
      Popup.waitLoad("更新附件的数据库信息...");
      if ($.isArray(data)) {
        for (var i in data) {
          setUploadFileId(data[i], filePath, fileid);
        }
      } else {
        for (var i in data) {
          if (i.toLocaleLowerCase() == "fileid") {
            //设置为fileid
            if (data[i] == filePath) {
              data[i] = fileid;
              //移动文件并将文件写入到数据库中。
              eamDB.execute(db, sql_insert_file, [fileid, 0]).then(function (success) {
              }, function (error) {
              });
              return;
            }
          } else if ($.isArray(data[i]) || typeof data[i] === 'object') {
            setUploadFileId(data[i], filePath, fileid);
          }
        }
      }
    };


    /**
     * 检查有哪些附件需要上传服务器
     * @param data
     * @returns {Array}
     */
    var checkUploadFile = function (data) {
      Popup.waitLoad("正在收集要上传的附件...");
      var filelist = [];
      if ($.isArray(data)) {
        for (var i in data) {
          filelist = filelist.concat(checkUploadFile(data[i]));
        }
      } else {
        for (var i in data) {
          if (i.toLocaleLowerCase() == "fileid") {
            //这个需要添加到array中
            if (Number.isNaN(Number(data[i])) && data[i].indexOf("file://") >= 0) {
              filelist.push(data[i]);
            }
          } else if ($.isArray(data[i]) || typeof data[i] === 'object') {
            filelist = filelist.concat(checkUploadFile(data[i]));
          }
        }
      }
      return filelist;
    };


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
    var stopSync = function () {
      sync_Switch = false;
      sync_File_Switch = false;
      is_running = false;
      // var po = Popup.waitLoad("当前任务结束后会自动停止同步…… <div ng-click='stoppingMessage()'>点击停止</div>");
      // popalerts.push(po);
      closePopups();
    };

    /**
     * 每隔 syncCheckInterval 分钟监听一次上次操作时间，如果长时间没有用户操作则尝试启动同步任务。
     */
    var syncCheckInterval = 100/*0 * 60 */ * 2;
    var timeouts = [];
    var runsyncjob = function () {
      if (!$rootScope.isOnline || !StringUtils.isNotEmpty(Storage.getAccessToken())) {//没有token
        return;
      }
      if (popalerts.length > 0) {//有错误框弹出，结束
        return;
      }
      var promiseAutoSync = $timeout(runsyncjob, syncCheckInterval);
      timeouts.push(promiseAutoSync);
      var promiseCheckConn = is_running == false ? eamSyncAjax.checkNetwork(false) : $q.defer().promise;
      if (is_running == false) {
        console.log("runsyncjob");
        var onPromise = $.when(promiseCheckConn, promiseAutoSync);
        /*
         如果n分钟没有使用设备，则启动同步任务。
         */
        if (new Date().getTime() - last_handle_time.getTime() > 1000/* * 5 * 60*/) {
          //判断网络是否正常，如果正常则启动同步服务
          onPromise.then(function () {
            console.log("autoSync: ");
            if ($rootScope.isOnline && $rootScope.isWiFi) {
              sync(undefined, function () {
                downloadFile();
                runsyncjob();
              });
            } else if ($rootScope.isOnline && !$rootScope.isWiFi) {//手机上
              sync(undefined, function () {
                runsyncjob();
              })
            }
          }, function () {
            if (timeouts.length > 0) {
              timeouts.forEach(function (promise) {
                console.log("cancel timeout promise");
                $timeout.cancel(promise);
              })
            }
          });
        } else {
          promiseAutoSync = timeouts.shift();//取出最后一次的延时promise
          if (timeouts.length > 0) {
            console.log("时间未到，自动同步处理取消");
            timeouts.forEach(function (item) {
              $timeout.cancel(item)
            });
          }
          if (promiseAutoSync) {
            promiseAutoSync.then(function () {
              runsyncjob();
            });
          }
        }
      }
    };

    /**
     * 操作完成后写入日志
     * @param log
     */
    var synclog = function (log) {
      synclogs.push(log);
    };

    function closePopups() {
      if (popalerts.length > 0) {
        popalerts.forEach(function (item) {
          if (item != undefined) {
            item.close();
          }
        });
        popalerts = [];
      }
    };
    /**
     * 任务执行完成了，显示日志。
     */
    var showlog = function () {
      //显示日志
      if (synclogs.length > 0) {
        var html = "";
        for (var i in synclogs) {
          html += synclogs[i] + "</br>";
        }
        closePopups();
        var popal = Popup.popupConfirm(function (res) {
          $ionicBackdrop.release();
        }, {
          title: "同步出错信息",
          template: html,
          cancelText: "停止",
          okText: "确定"
        }, '同步结果');
        popalerts.push(popal);
        synclogs = [];
      }
    };

    /**
     * 检查所有的fileid
     *
     * 如果 isNotdownload == true  则将downloadStatus设置为2，否则默认为0
     *
     * @param data
     * @param isNotdownload 是否需要下载完就更新
     */
    var checkFileid = function (data, isNotdownload) {
      var filelist = [];
      if ($.isArray(data)) {
        for (var i in data) {
          checkFileid(data[i], isNotdownload);
        }
      } else {
        for (var i in data) {
          if (i.toLocaleLowerCase() == "fileid") {
            //这个需要添加到array中
            if (data[i] != 0 && data[i] != null && data[i] != undefined) {
              filelist.push(data[i]);
            }
          } else if ($.isArray(data[i]) || typeof data[i] === 'object') {
            checkFileid(data[i], isNotdownload);
          }
        }
      }
      //将附件信息写入数据库中。
      for (var i in filelist) {
        (function (i) {
          eamDB.execute(db, sql_check_one_file, [filelist[i]]).then(function (res) {
            if (res.rows.length <= 0) {
              if (isNotdownload) {
                eamDB.execute(db, sql_insert_file, [filelist[i], 2]);
              } else {
                eamDB.execute(db, sql_insert_file, [filelist[i], 0]);
              }
            }
          });
        })(i);
      }
    };
    var getIsSystemSync = function () {
      return is_system_sync;
    };

    function getSyncFuncArr() {
      return tempDownSyncFn;
    }


    return {
      sync: sync,
      synclog: synclog,
      runsyncjob: runsyncjob,
      stopSync: stopSync,
      updateLastHandleTime: updateLastHandleTime,
      checkFileid: checkFileid,
      downloadFile: downloadFile,
      updateFile: updateFile,
      getIsSystemSync: getIsSystemSync,
      getSyncFuncArr: getSyncFuncArr,
    }
  });
