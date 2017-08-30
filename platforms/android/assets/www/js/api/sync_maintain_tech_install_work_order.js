/**专门处理定位、安装调试、整改/技改的工单
 * Created by Administrator on 2017/3/30.
 */
angular.module("starter.eamMaintainTechInstallWorkOrderModule", [])
  .factory("eamMTInstallWorkOrderFactory",
    function (eamDB, WorkOrderApi, starterClassFactory, Storage, eamSyncAjax, Popup,
              eamFile, $ionicBackdrop, cfpLoadingBar, SyncWorkHours, $rootScope, $injector, OrderService, $q) {
      var Api_uploadWorkOrder = baseUrl + "/api/maintain/uploadOrder.api";//上传工单接口
      var Api_updateUploadFiles = baseUrl + '/api/updateUploadFiles.api';//上传附件接口
      var tableName = "eam_table_maintainTechInstallWorkOrder";
      var userTableName = "eam_sync_user";
      var order_upload_error_code = 'order_upload_error_code';//工单上传失败
      var order_file_mapping_upload_error_code = 'order_file_mapping_upload_error_code';//附件上次失败标志
      var insertWorkOrderSql = [
        "insert into " + tableName + '(' +
        'activeFlag,' +
        'areaType,' +
        'areaTypeName,' +
        'assignPerson,' +
        'assignPersonName,' +
        // 'faultBegindate,' +
        // 'faultCode,' +
        // 'faultName,' +
        'lastUpdateDatetimeApi,' +
        'createOn,' +
        'planBegindate,' +
        'planEnddate,' +
        'planNoticeId,' +
        'positionCode,' +
        'positionId,' +
        'projectId,' +
        'projectName,' +
        'siteManager,' +
        'taskAccepted,' +
        'transNoticeNo,' +
        'workTypeId,' +
        'workTypeName,' +
        'workorderCode,' +
        'workorderStatus,' +
        'workorderStatusName,' +
        'uploadStatus,' +
        'downloadStatus,' +
        'workorderTitle,' +
        'workorderType,' +
        'workorderTypeName,' +
        'json,' +
        'workorderId' +
        ')' +
        'values(' +
        '?,?,?,?,?,?,?,?,?,?,' +
        '?,?,?,?,?,?,?,?,?,?,' +
        '?,?,?,?,?,?,?,?,?' +
        ")"
      ];
      var updateWorkOrderSql = [
        "update " + tableName + ' set ' +
        'activeFlag=?,' +
        'areaType=?,' +
        'areaTypeName=?,' +
        'assignPerson=?,' +
        'assignPersonName=?,' +
        // 'faultBegindate=?,' +
        // 'faultCode=?,' +
        // 'faultName=?,' +
        'lastUpdateDatetimeApi=?,' +
        'createOn=?,' +
        'planBegindate=?,' +
        'planEnddate=?,' +
        'planNoticeId=?,' +
        'positionCode=?,' +
        'positionId=?,' +
        'projectId=?,' +
        'projectName=?,' +
        'siteManager=?,' +
        'taskAccepted=?,' +
        'transNoticeNo=?,' +
        'workTypeId=?,' +
        'workTypeName=?,' +
        'workorderCode=?,' +
        'workorderStatus=?,' +
        'workorderStatusName=?,' +
        'uploadStatus=?,' +//0,不需要上传，1：需要上传，2：上传同步失败
        'downloadStatus=?,' +
        'workorderTitle=?,' +
        'workorderType=?,' +
        'workorderTypeName=?,' +
        'json=?' +
        'where workorderId=?'
      ];
      var countPerTime = 1;//每次下载工单详情数目
      var beginDate;
      var endDate;
      var needToDownloadOrders = [];

      function uploadWorkOrders(beginTime, endTime, eamSyncCallback) {
        setTimeout(function () {
          Popup.waitLoad("上传计划工单...");
        });
        async.autoInject({
          "selectUploadingOrders": selectUploadingOrders,
          "uploadOrdersAction": ['selectUploadingOrders', uploadOrdersAction]
        }, function (err, result) {
          Popup.hideLoading();
          if (err) {
            console.log('同步过程有错误' + JSON.stringify(err, undefined, 2));
          }
          console.log("$injector.get('eamSync').getSyncLogLength()：" + $injector.get('eamSync').getSyncLogLength());
          if ($injector.get('eamSync').getSyncLogLength() > 0) {//如果有错误日志
            eamSyncCallback(false, {
              errorType: UPLOAD_ORDER_FAIL_ERROR_TYPES.MIT_ORDER_UPLOAD_ERROR_TYPE,
              error: "计划工单上传失败"
            });
          } else {
            // console.log(result);
            SyncWorkHours.uploadList(beginTime, endTime, function () {//同步工时填报的数据
              eamSyncCallback(true);
            });
          }
        });
        function selectUploadingOrders(callback) {
          eamDB.execute(db, "select * from " + tableName + " where uploadStatus != 0")//选择所有需要上传的工单
            .then(function (res) {
              callback(null, OrderService.ChangeSQLResult2Array(res));
            }, function (err) {
              callback(err);
            })
        }

        function uploadOrdersAction(orders, callback) {
          console.log("待上传工单数：" + orders.length);
          if (orders.length > 0) {
            // each(coll, iteratee, callbackopt)
            async.eachSeries(orders, uploadIteratee, function (err) {
              if (err) {
                console.log("uploadOrdersAction" + JSON.stringify(err, undefined, 2));
              }
              callback();//这里不抛错误，只需将需要同步的工单都同步一遍，如果有任何错误，已经使用eamSync.syncLog()函数打印日志了
              // if (err) {
              //   return callback(err);
              // } else {
              //   return callback(null, "工单上传成功");
              // }
            });
          } else {
            return callback(null, "工单上传成功");
          }
        }
      }

      function uploadIteratee(item, callback) {//callback(err)
        var json = JSON.parse(item.json);
        eamFile.uploadAttachedFile(json).then(onUploadFilesSuccess, onUploadFilesFailed);
        function onUploadFilesSuccess() {
          uploadWorkOrdersBaseOnUploadFilesWin(json, callback);
        }

        function onUploadFilesFailed(err) {//附件上传失败
          saveUploadFailedOrders(json, function () {
            callback({
              errorMessage: '【' + json["apiWorkorderBaseInfoDto"]["workorderCode"] + "】上传附件失败，" + JSON.stringify(err)
            });
          }, true)//同步失败
        }
      }

      function uploadWorkOrdersBaseOnUploadFilesWin(json, callback) {
        var orderId = json.apiWorkorderBaseInfoDto.workorderId;
        async.autoInject({
          "json": function (cb) {
            return cb(null, json);
          },
          uploadOrderAction: ['json', uploadOrderAction],
          uploadFileMappings: ['uploadOrderAction', uploadFileMappings]
        }, function (err, res) {
          if (err) {
            var json = err.json;
            delete err.json;
            console.log("uploadWorkOrdersBaseOnUploadFilesWin:" + JSON.stringify(err, null, 2));
            saveUploadFailedOrders(json, function () {
              callback();//错误不抛，否则后续的工单无法进行同步了
            }, true)
          } else {
            eamDB.execute(db, "update " + tableName + " set uploadStatus=0 where workorderId=?", [orderId + ""])
              .then(function () {
                callback();
              }, function (dbErr) {
                callback({errorMessage: '工单上传成功，但更新本地数据库上传状态字段失败,' + JSON.stringify(dbErr)});
              })
          }
        });

      }

      function uploadOrderAction(json, callback) {
        Popup.waitLoad("正在上传工单" + json["apiWorkorderBaseInfoDto"]["workorderCode"]);
        eamSyncAjax.doPost(Api_uploadWorkOrder, json, function (uploadOrderRes) {
          Popup.hideLoading();
          console.log(uploadOrderRes);
          if (uploadOrderRes.success) {
            if (uploadOrderRes.data && uploadOrderRes.data.retCode == "2222") {//物料销库不成功
              //TODO 需要收集销库不成功的信息
              if (isDebug) {
                var notification = {
                  id: json["apiWorkorderBaseInfoDto"]["workorderId"],
                  title: json["apiWorkorderBaseInfoDto"]["workorderCode"],
                  text: uploadOrderRes.data['retInfo'],
                  badge: 1,
                  led: "fff153"
                };
                document.addEventListener("deviceready", function () {
                  cordova.plugins.notification.local.schedule([notification]);
                  cordova.plugins.notification.local.on("click", function (notification) {
                    alert("clicked: " + notification.id);
                  });
                }, false);
              }
              // Popup.promptMsg(uploadOrderRes.data['retInfo']);
              $injector.get('eamSync').synclog({
                errorType: UPLOAD_ORDER_FAIL_ERROR_TYPES.XIAO_KU_FAIL_ERROR_TYPE,
                errorMessage: '【' + json["apiWorkorderBaseInfoDto"]["workorderCode"] + "】，" + uploadOrderRes.data['retInfo']
              })
            }
            callback(null, {json: json});
          } else {
            var errorMessage = '【' + json["apiWorkorderBaseInfoDto"]["workorderCode"] + "】上传失败" +
              (uploadOrderRes['retInfo'] ? uploadOrderRes['retInfo'] : '');
            console.log("errorMessage: " + errorMessage);
            $injector.get('eamSync').synclog(errorMessage);
            callback({
              json: json,
              result: uploadOrderRes,
              errorCode: order_upload_error_code,
              errorMessage: errorMessage
            });
          }
        });
      }

      function uploadFileMappings(uploadOrderAction, callback) {
        var json = uploadOrderAction.json;
        var fileParams = eamFile.findUploadFilesParams(json);
        Popup.waitLoad("正在更新工单" + json["apiWorkorderBaseInfoDto"]["workorderCode"] + " 附件信息");
        eamSyncAjax.doPost(Api_updateUploadFiles, fileParams, function (res) {
          Popup.hideLoading();
          if (res.success) {
            callback(null, {json: json});
          } else {
            var errorMessage = '【' + json["apiWorkorderBaseInfoDto"]["workorderCode"] + "】上传失败," + "关联工单附件接口调用失败" + (res.data && res.data['retInfo'] ? res.data['retInfo'] : res['retInfo']);
            $injector.get('eamSync').synclog(errorMessage);
            callback({
              json: json,
              errorCode: order_file_mapping_upload_error_code,
              errorMessage: errorMessage,
              result: res
            });
          }
        });
      }


      /**
       * 下载工单
       * @param beginTime
       * @param endTime
       * @param eamSyncCallback
       */
      var downLoadWorkOrders = function (beginTime, endTime, eamSyncCallback) {
        setTimeout(function () {
          $ionicBackdrop.retain();
          Popup.waitLoad("正在下载计划工单...");
        });
        cfpLoadingBar.start();
        beginDate = beginTime;
        endDate = endTime;
        async.autoInject({
          "downloadAllOrders": downloadAllOrders,
          "neededOrders": ['downloadAllOrders', neededOrders],
          "localSpecOrders": localSpecOrders,
          "downloadOrdersDetailInfo": ["neededOrders", 'localSpecOrders', downloadOrdersDetailInfo]
        }, function (err, result) {
          $ionicBackdrop.release();
          Popup.hideLoading();
          cfpLoadingBar.complete();
          $rootScope.$emit("cfpLoadingBar:refreshCompleted");
          if (err) {
            console.error("工单下载出错", err);
            eamSyncCallback(err);
          } else {
            // console.log("工单下载结果：", result);
            eamSyncCallback(true);
          }

        });
      };

      function downloadAllOrders(callback) {
        var param = {
          workorderTypeString: "",//	工单类型(查询时// :pc端:37-风云工单,38-人工工单,39-工程工单,67-服务工单,68-整改/技改工单;手机端:4-scada工单；返回时，都是按照pc端的)
          startDate: beginDate,
          endDate: endDate,
          projectId: Storage.getSelectedProject().projectId
        };
        Promise.resolve()
          .then(function () {//先获取 workorderTypeString=39 工程工单，即安装调试
            return new Promise(function (resolve, reject) {
              WorkOrderApi.getBatchWorkorderList(function (res) {//callback(err, result)
                if (res.success) {
                  resolve(res.data);
                } else {
                  reject(res.retInfo || "下载工程工单失败");
                }
              }, Object.assign({}, param, {workorderTypeString: "39"}))
            });
          })
          .then(function (orders) {
            return new Promise(function (resolve, reject) {//定期维护
              WorkOrderApi.getBatchWorkorderList(function (res) {//callback(err, result)
                if (res.success) {
                  resolve(orders.concat(res.data));
                } else {
                  reject(res.retInfo || "下载服务工单失败");
                }
              }, Object.assign({}, param, {workorderTypeString: "67"}))
            });
          })
          .then(function (orders) {
            return new Promise(function (resolve, reject) {
              WorkOrderApi.getBatchWorkorderList(function (res) {//技改
                if (res.success) {
                  resolve(orders.concat(res.data));
                } else {
                  reject(res.retInfo || "下载整改/技改工单失败");
                }
              }, Object.assign({}, param, {workorderTypeString: "68"}))
            });
          })
          .then(function (workOrders) {
            callback(null, workOrders);
          })
          .catch(function (err) {
            callback(err || "下载工单失败");
          });
        // WorkOrderApi.getBatchWorkorderList(function (res) {//callback(err, result)
        //   if (res.success) {
        //     callback(null, res.data);
        //   } else {
        //     callback(res);
        //   }
        // }, {
        //   workorderTypeString: "",//	工单类型(查询时// :pc端:37-风云工单,38-人工工单,39-工程工单,67-服务工单,68-整改/技改工单;手机端:4-scada工单；返回时，都是按照pc端的)
        //   startDate: beginDate,
        //   endDate: endDate,
        //   projectId: Storage.getSelectedProject().projectId
        // })
      }

      function neededOrders(downloadAllOrders, callback) {
        // callback(null, downloadAllOrders.filter(function (item) {//将故障工单排除在外
        //   return !(item["workorderType"] == 37 || item["workorderType"] == 38);
        // }));
        callback(null, downloadAllOrders);
      }

      function localSpecOrders(callback) {//callback(err, result)
        eamDB.execute(db, "select * from " + tableName + " where workorderStatus=139")
          .then(function (res) {
            callback(null, OrderService.ChangeSQLResult2Array(res));
          }, function (err) {
            callback(err);
          });
      }

      function downloadOrdersDetailInfo(neededOrders, localOrders, callback) {//callback(err, result)
        needToDownloadOrders = neededOrders.concat(localOrders);
        if (needToDownloadOrders.length > 0) {
          // console.log(needToDownloadOrders);
          setTimeout(function () {
            Popup.waitLoad('正在下载计划工单详情...')
          });
          async.during(function (testCallback) {
            return testCallback(null, needToDownloadOrders.length > 0);
          }, downloadOrderDetailIteratee, function (err) {
            Popup.hideLoading();
            if (err) {
              callback(err);
            } else {
              callback(null, "工单详情下载完成");
            }
          });
        } else {
          callback(null, "工单下载完成!");
        }
      }

      /**
       * 该方法没次下载{#countPerTime}条工单详情
       * @param callback
       */
      function downloadOrderDetailIteratee(callback) {//callback(err)
        downloadAction(callback);
        // async.autoInject({
        //   "downloadAction": downloadAction
        // }, function (err, result) {
        //   if (err) {
        //     callback(err);
        //   } else {
        //     callback();
        //   }
        // });
      }

      function downloadAction(callback) {
        var fullInfoParams = [];
        //每次同步countPerTime条数据
        if (needToDownloadOrders.length > countPerTime) {
          for (var i = 0; i < countPerTime; i++) {
            var workOrder = needToDownloadOrders.shift();
            if (workOrder) {
              fullInfoParams.push({
                workorderId: workOrder['workorderId'],
                workorderType: workOrder['workorderType'],

              });
            }
          }
        } else {
          for (; ;) {
            var item = needToDownloadOrders.shift();
            if (item) {
              fullInfoParams.push({
                workorderId: item['workorderId'],
                workorderType: item['workorderType'],

              });
            } else {
              break;
            }
          }
        }
        if (fullInfoParams.length > 0) {
          // console.log(fullInfoParams);
          WorkOrderApi.getWorkorderFullInfoList(function (res) {
            if (res.success) {
              var dbOperationPromise = dbOperations(res.data);
              dbOperationPromise
                .then(
                  function () {
                    callback();
                  }, function (err) {
                    callback(err);
                  });
            } else {
              callback(res)
            }
          }, {apiWorkorderBaseInfoDto: fullInfoParams})
        } else {
          callback();
        }
      }

      function localOrders(callback) {
        eamDB.execute(db, "select * from " + tableName + "")
          .then(function (res) {
            callback(null, OrderService.ChangeSQLResult2Array(res));
          }, function (err) {
            callback(err);
          });
      }

      function dbOperations(workOrders, isModified, isUploadFailed) {
        Popup.waitLoad("计划工单数据库更新...");
        var q = $q.defer();
        async.autoInject({
          "localOrders": localOrders,
          "serverData": function (callback) {
            return callback(null, workOrders);
          },
          "isModified": function (callback) {
            return callback(null, isModified);
          },
          "isUploadFailed": function (callback) {
            return callback(null, isUploadFailed);
          },
          "updateOrInsertOrders": ["serverData", "isModified", 'localOrders', 'isUploadFailed', updateOrInsertOrders]
        }, function (err, result) {
          Popup.hideLoading();
          if (err) {
            q.reject(err);
          } else {
            q.resolve(result);
          }
        });
        return q.promise;
      }

      function updateOrInsertOrders(workOrders, isModified, localOrders, isUploadFailed, callback) {
        if (workOrders.length > 0) {
          var updateBindings = [];
          var deletingBindings = [];
          var insertBindings = [];
          for (var i = 0; i < workOrders.length; i++) {
            var order = workOrders[i]['apiWorkorderBaseInfoDto'];
            // console.log("order: ", order);
            var isUpdate = false;
            var values = [];
            if (order["taskAccepted"] == true) {//PC端不存在该工单
              deletingBindings.push(order["workorderId"]);
              continue;
            }
            values.push(order['activeFlag'] ? order['activeFlag'] : "0");
            values.push(order['areaType']);
            values.push(order['areaTypeName']);
            values.push(order['assignPerson']);
            values.push(order['assignPersonName']);
            values.push(order['lastUpdateDatetimeApi'] ? new Date(order['lastUpdateDatetimeApi']).getTime() : null);
            values.push(order['createOn'] ? new Date(order['createOn']).getTime() : null);
            values.push(order['planBegindate'] ? new Date(order['planBegindate']).getTime() : null);
            values.push(order['planEnddate'] ? new Date(order['planEnddate']).getTime() : null);
            values.push(order['planNoticeId']);
            values.push(order['positionCode']);
            values.push(order['positionId']);
            values.push(order['projectId']);
            values.push(order['projectName']);
            values.push(order['siteManager']);
            values.push(order['taskAccepted']);
            values.push(order['transNoticeNo']);
            values.push(order['workTypeId']);
            values.push(order['workTypeName']);
            values.push(order['workorderCode']);
            values.push(order['workorderStatus']);
            values.push(order['workorderStatusName']);
            if (isModified) {//uploadStatus，是否需要往服务器同步，1为需求，0为不需要
              // console.log("isModified", isModified);
              values.push(isUploadFailed ? 2 : 1);//如果是同步失败，状态位是2
            } else {
              values.push(0);
            }
            values.push(1);//downloadStatus，是否是从服务器下载，默认为1，日常操作不需要修改此字段。
            values.push(order['workorderTitle']);
            values.push(order['workorderType']);
            values.push(order['workorderTypeName']);
            values.push(JSON.stringify(workOrders[i]));
            values.push(order['workorderId'] + "");
            for (var j = 0; j < localOrders.length; j++) {
              var oldOrder = localOrders[j];
              if (oldOrder["workorderId"] == order['workorderId']) {//更新旧数据
                isUpdate = true;
                localOrders.splice(j, 1);
                break;
              }
            }
            if (isUpdate) {
              // console.log("更新数据记录", order['workorderId']);
              updateBindings.push(values);
              continue;
            }
            // console.log("插入数据记录===》", order['workorderId']);
            insertBindings.push(values);
          }
          // console.log(deletingBindings);
          // console.log(updateBindings);
          // console.log(insertBindings);
          var delDefer = $q.defer();
          eamDB.execute(db, "delete from " + tableName + " where workorderId in (" + deletingBindings + ")")
            .then(function (res) {
              delDefer.resolve(res);
            }, function (err) {
              console.error(err);
              delDefer.reject(err);
            });
          var insertDefer = $q.defer();
          var updateDefer = $q.defer();
          if (insertBindings.length > 0) {
            eamDB.insertCollection(db, insertWorkOrderSql, insertBindings)
              .then(function (res) {
                insertDefer.resolve(res);
              }, function (err) {
                console.error(err);
                insertDefer.reject(err);
              });
          } else {
            insertDefer.resolve("没有新数据插入");
          }
          if (updateBindings.length > 0) {
            eamDB.insertCollection(db, updateWorkOrderSql, updateBindings)
              .then(function (res) {
                updateDefer.resolve(res);
              }, function (err) {
                console.error(err);
                updateDefer.reject(err);
              });
          } else {
            updateDefer.resolve("没有数据更新");
          }

          $.when(delDefer.promise, insertDefer.promise, updateDefer.promise)
            .done(function () {
              callback(null, "更新" + tableName + "成功");
            })
            .fail(function (err) {
              callback(err);
            })
            .always(function (res) {
              // console.log(res);
            });
        } else {
          console.log("updateOrInsertOrders");
          callback(null, "无数据更新 " + tableName);
        }
      }

      function loadMoreOrders(params, callback) {
        console.log("loadMoreOrders", params);
        var sql = "select * from " + tableName + " where activeFlag=0";
        var values = [];
        if (StringUtils.isNotEmpty(params.areaType)) {
          sql += " and areaType=? ";
          values.push(params.areaType);
        }
        if (StringUtils.isNotEmpty(params.assignPerson)) {
          sql += " and assignPerson = ? ";
          values.push(params.assignPerson);
        }
        if (StringUtils.isNotEmpty(params.planBegindate)) {
          sql += " and planBegindate >= ? ";
          values.push(params.planBegindate.getTime() + "");
        }
        if (StringUtils.isNotEmpty(params.planEnddate)) {
          sql += " and planBegindate <= ? ";
          values.push(params.planEnddate.getTime() + "");
        }
        if (StringUtils.isNotEmpty(params.planNoticeId)) {
          sql += " and planNoticeId = ? ";
          values.push(params.planNoticeId);
        }
        if (StringUtils.isNotEmpty(params.positionCode)) {
          sql += " and positionCode = ? ";
          values.push(params.positionCode);
        }

        if (StringUtils.isNotEmpty(params.projectId)) {
          sql += " and projectId = ? ";
          values.push(params.projectId);
        }
        if (StringUtils.isNotEmpty(params.projectName)) {
          sql += " and projectName like ? ";
          values.push("%" + params.projectName + "%");
        }
        if (StringUtils.isNotEmpty(params.transNoticeNo)) {
          sql += " and transNoticeNo like ? ";
          values.push("%" + params.transNoticeNo + "%");
        }
        if (StringUtils.isNotEmpty(params.workTypeId)) {
          sql += " and workTypeId = ? ";
          values.push(params.workTypeId + "");
        }
        if (StringUtils.isNotEmpty(params.workorderCode)) {
          sql += " and workorderCode like ? ";
          values.push("%" + params.workorderCode + "%");
        }
        if (StringUtils.isNotEmpty(params.workorderStatus)) {
          sql += " and workorderStatus = ? ";
          values.push(params.workorderStatus + "");
        }
        if (StringUtils.isNotEmpty(params.workorderTitle)) {
          sql += " and workorderTitle like ? ";
          values.push("%" + params.workorderTitle + "%");
        }
        if (StringUtils.isNotEmpty(params.workorderType)) {
          sql += " and workorderType = ? ";
          values.push(params.workorderType + "");
        }
        if (StringUtils.isNotEmpty(params.workorderId)) {
          sql += " and workorderId = ? ";
          values.push(params.workorderId + "");
        }
        if (!params.pageNumber) {
          params.pageNumber = 1;
        }
        var skipRecord = 5 * (params.pageNumber - 1);
        // sql += ' order by workorderStatus ,planBegindate desc limit ?,5';
        sql += ' order by  workorderCode desc limit ?,5';
        values.push(skipRecord);
        console.log("loadMoreOrders", sql, values);
        eamDB.execute(db, sql, values)
          .then(
            function (res) {
              if (angular.isFunction(callback)) {
                callback(OrderService.ChangeSQLResult2Array(res));
              }
            },
            function (err) {
              console.error(err);
            });
      }

      function loadMoreMaintainOrders(params, callback) {//定期维护
        params.workorderType = 67;
        loadMoreOrders(params, callback);
      }

      function loadMoreInstallOrders(params, callback) {//安装调试
        params.workorderType = 39;
        loadMoreOrders(params, callback);
      }

      function loadMoreTechOrders(params, callback) {//技改工单
        params.workorderType = 68;
        loadMoreOrders(params, callback);
      }

      /**
       * @param workOrder 就是 一个工单里的json对象
       * @param callback()
       */
      function saveWorkOrder(workOrder, callback) {
        saveUploadFailedOrders(workOrder, callback)
      }

      function saveUploadFailedOrders(workOrder, callback, isUploadFailed) {
        // console.log(JSON.stringify(workOrder, undefined, 2));
        eamFile.moveFileToUpload(workOrder, function (res) {
          Popup.hideLoading();
          if (!res) {
            Popup.loadMsg("附件处理出错附", 1000);
          } else {
            //console.log("before saveFaultOrder" + JSON.stringify(faultOrder.workorderDetails.eaWoFilemappingList, undefined, 2));
          }
          workOrder.workorderDetails.eaWoWorkorderinfoDto.areaType = Storage.getSelectedProject().areaCode;
          workOrder.workorderDetails.eaWoWorkorderinfoDto.areaTypeName = Storage.getSelectedProject().areaCodeName;
          workOrder.workorderDetails.eaWoWorkorderinfoDto.lastUpdBy = Storage.getProfile() ? Storage.getProfile().id : null;
          var order = starterClassFactory.faultOrderInstance();
          console.log();
          angular.copy(workOrder, order);
          order.setFaultOrderInfo();
          order.apiWorkorderBaseInfoDto.assignPersonName = workOrder.apiWorkorderBaseInfoDto.assignPersonName;
          order.apiWorkorderBaseInfoDto.assignPerson = workOrder.apiWorkorderBaseInfoDto.assignPerson;
          dbOperations([order], true, isUploadFailed)
            .then(function () {
              callback(order);
            }, function (err) {
              console.error(err)
            });
        });
      }

      function getStatusNameByOrderStatus(status, callback) {
        var sql = "select * from eam_sync_dictionary_detail where dictionaryId=? and detailId=?";
        eamDB.execute(db, sql, [30, +status])
          .then(function (res) {
            if (res.rows.length > 0) {
              if (angular.isFunction(callback)) {
                callback(res.rows.item(0)["detailName"]);
              }
            } else {
              console.error("getStatusNameByOrderStatus：", "字典不存在该字段")
            }
          });
      }

      function orderOnSyncSuccess(orderId, callback) {
        loadMoreOrders({workorderId: orderId}, function (res) {
          if (res.length > 0) {
            callback(res[0]);
          } else {
            callback();
          }
        })
      }

      function changeWorkOrderStatusThreeOrder(workorderStatus, faultOrder, callback) {
        //
        //   console.log("faultOrder " ,faultOrder);
        OrderService.getDicDetailById(+workorderStatus, function (res) {
          if (isDebug) {
            console.log("workorderStatus: " + workorderStatus + " " + JSON.stringify(res, undefined, 2));
            console.log("workorderStatus: " + workorderStatus + " " + JSON.stringify(res.rows.item(0), undefined, 2));
          }
          var workorderStatusName = res.rows.item(0).detailName;
          faultOrder['workorderDetails']['eaWoWorkorderinfoDto']['workorderStatus'] = workorderStatus + "";
          faultOrder['workorderDetails']['eaWoWorkorderinfoDto']['workorderStatusName'] = workorderStatusName;
          saveWorkOrder(faultOrder, callback);
          // if(angular.isFunction(callback))callback(faultOrder);
        });
      }

      return {
        uploadWorkOrders: uploadWorkOrders,
        downLoadWorkOrders: downLoadWorkOrders,
        loadMoreMaintainOrders: loadMoreMaintainOrders,
        loadMoreInstallOrders: loadMoreInstallOrders,
        loadMoreTechOrders: loadMoreTechOrders,
        saveWorkOrder: saveWorkOrder,
        getTableName: function () {
          return tableName;
        },
        getStatusNameByOrderStatus: getStatusNameByOrderStatus,
        orderOnSyncSuccess: orderOnSyncSuccess,
        changeWorkOrderStatusThreeOrder: changeWorkOrderStatusThreeOrder

      }
    });
