/**
 * Created by Administrator on 2017/3/25 0025.
 */
angular.module("starter.eamFaultWorkOrderModule", [])
  .factory("eamFaultWorkOrderFactory",
    function (eamDB, WorkOrderApi, starterClassFactory, eamFile, Storage, SyncWorkHours,
              eamSyncAjax, Popup, $ionicBackdrop, cfpLoadingBar, $rootScope, $injector, OrderService, $q) {
      var Api_uploadWorkOrder = baseUrl + "/api/maintain/uploadOrder.api";//上传工单接口
      var Api_updateUploadFiles = baseUrl + '/api/updateUploadFiles.api';//上传附件接口
      var tableName = "eam_table_faultWorkOrder";
      var insertFaultOrderSql = [
        "insert into " + tableName + '(' +
        'activeFlag,' +
        'areaType,' +
        'areaTypeName,' +
        'assignPerson,' +
        'faultBegindate,' +
        'faultCode,' +
        'faultName,' +
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
        '?,?,?,?,?,?,?,?,?,?,' +
        "?)"
      ];
      var updateFaultOrderSql = [
        "update " + tableName + ' set ' +
        'activeFlag=?,' +
        'areaType=?,' +
        'areaTypeName=?,' +
        'assignPerson=?,' +
        'faultBegindate=?,' +
        'faultCode=?,' +
        'faultName=?,' +
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
        'uploadStatus=?,' +
        'downloadStatus=?,' +
        'workorderTitle=?,' +
        'workorderType=?,' +
        'workorderTypeName=?,' +
        'json=?' +
        'where workorderId=?'
      ];
      var sql_select_one_upload_fault_orders = "select * from " + tableName + " where uploadStatus !=0";//状态2代表上传失败
      var dowloadDetailCounts = 20;//每次下载工单详情数目
      var selectSpecFOrdersSql = "select * from " + tableName + ' where workorderStatus=139';
      var order_upload_error_code = 'order_upload_error_code';//工单上传失败
      var order_file_mapping_upload_error_code = 'order_file_mapping_upload_error_code';//附件上次失败标志
      var downloadFaultOrders = function (beginTime, endTime, eamCallback) {
        // beginTime = beginTime - 2 * 30 * 60 * 60 * 24 * 1000;
        // cfpLoadingBar.start();
        console.log('开始时间：'+new Date(beginTime));
        console.log('结束时间：'+new Date(endTime));
        setTimeout(function () {
          Popup.waitLoad("正在下载故障工单...");
        });
        // $ionicBackdrop.retain();
        function getOrdersData(callback) {//获取服务器数据
          WorkOrderApi.getBatchWorkorderList(function (res37) {
            if (res37.success) {
              WorkOrderApi.getBatchWorkorderList(function (res38) {
                if (res38.success) {
                  callback(null, res37.data.concat(res38.data));
                } else {
                  callback(res38 || "人工工单获取失败，请检查网络");
                }
              }, {
                workorderTypeString: "38",//	工单类型(查询时// :pc端:37-风云工单,38-人工工单,39-工程工单,67-服务工单,68-整改/技改工单;手机端:4-scada工单；返回时，都是按照pc端的)
                startDate: beginTime,
                endDate: endTime,
                projectId: Storage.getSelectedProject().projectId + ""
              });
            } else {
              callback(res37 || "风云工单获取失败，请检查网络");
            }
          }, {
            workorderTypeString: "37",//	工单类型(查询时// :pc端:37-风云工单,38-人工工单,39-工程工单,67-服务工单,68-整改/技改工单;手机端:4-scada工单；返回时，都是按照pc端的)
            startDate: beginTime,
            endDate: endTime,
            projectId: Storage.getSelectedProject().projectId + ""
          });
        }

        async.autoInject({
          getOrdersData: getOrdersData,//网络获取数据
          concatOrderIds: ['getOrdersData', concatOrderIds],//本地状态139工单和网络返回数据工单ids的组合
          getOrdersDetailsDataAndDbOps: ['concatOrderIds', getOrdersDetailsDataAndDbOps]//获取这些ids的详情,并且执行数据库操作
        }, function (err, results) {
          // cfpLoadingBar.complete();
          // $rootScope.$emit("cfpLoadingBar:refreshCompleted");
          // $ionicBackdrop.release();
          // Popup.hideLoading();
          if (err) {
            console.error(err);
            eamCallback(false, err || results || "同步故障工单失败");
            //$injector.get('eamSync').synclog("同步故障工单失败，err:<br/>" + JSON.stringify(err, undefined, 2));
          } else {
            eamCallback(true);
          }
        });
      };

      function concatOrderIds(getOrdersData, callback) {
        var orders = [];
        getOrdersData.forEach(function (item) {
          orders.push(item);
        });
        eamDB.execute(db, selectSpecFOrdersSql)
          .then(function (res) {
            var specOrders = OrderService.ChangeSQLResult2Array(res);
            specOrders.forEach(function (item) {
              orders.push(item);
            });
            callback(null, orders);
          }, function (error) {
            callback(error);
          });
      }

      function collectingLocalDate(callback) {
        eamDB.execute(db, "select workorderId from " + tableName)
          .then(
            function (res) {
              callback(null, OrderService.ChangeSQLResult2Array(res));
            }, function (err) {
              callback(err);
            });
      }

      function updateOrInsertOrders(collectingLocalDate, orders, isModified, isUploadFailed, callback) {
        var insertBindings = [];
        var updateBindings = [];
        orders.forEach(function (item) {
          var isLocalRecord = false;
          var values = [];
          var orderBaseInfo = item['apiWorkorderBaseInfoDto'];
          values.push(orderBaseInfo['activeFlag']);
          values.push(orderBaseInfo['areaType']);
          values.push(orderBaseInfo['areaTypeName']);
          values.push(orderBaseInfo['assignPerson']);
          values.push(orderBaseInfo['faultBegindate'] ? new Date(orderBaseInfo['faultBegindate']).getTime() : null);
          values.push(orderBaseInfo['faultCode']);
          values.push(orderBaseInfo['faultName']);
          values.push(orderBaseInfo['lastUpdateDatetimeApi'] ? new Date(orderBaseInfo['lastUpdateDatetimeApi']).getTime() : null);
          values.push(item['workorderDetails']['eaWoWorkorderinfoDto']['createOn'] ? new Date(item['workorderDetails']['eaWoWorkorderinfoDto']['createOn']).getTime() : null);//createOn
          values.push(orderBaseInfo['planBegindate'] ? new Date(orderBaseInfo['planBegindate']).getTime() : null);
          values.push(orderBaseInfo['planEnddate'] ? new Date(orderBaseInfo['planEnddate']).getTime() : null);
          values.push(orderBaseInfo['planNoticeId']);
          values.push(orderBaseInfo['positionCode']);
          values.push(orderBaseInfo['positionId']);
          values.push(orderBaseInfo['projectId'] + "");
          values.push(orderBaseInfo['projectName']);
          values.push(orderBaseInfo['siteManager']);
          values.push(orderBaseInfo['taskAccepted'] ? orderBaseInfo['taskAccepted'] : false);
          values.push(orderBaseInfo['transNoticeNo']);
          values.push(orderBaseInfo['workTypeId']);
          values.push(orderBaseInfo['workTypeName']);
          values.push(orderBaseInfo['workorderCode']);
          values.push(orderBaseInfo['workorderStatus']);
          values.push(orderBaseInfo['workorderStatusName']);
          if (isModified) {
            values.push(isUploadFailed ? 2 : 1);//如果是上传失败，状态位是2
          } else {
            values.push(0);//uploadStatus，是否需要往服务器同步，1为需求，0为不需要
          }
          values.push(1);//downloadStatus，是否是从服务器下载，默认为1，日常操作不需要修改此字段。
          values.push(orderBaseInfo['workorderTitle']);
          values.push(orderBaseInfo['workorderType']);
          values.push(orderBaseInfo['workorderTypeName']);
          values.push(JSON.stringify(item));
          values.push(orderBaseInfo['workorderId'] + "");
          for (var i = 0; i < collectingLocalDate.length; i++) {
            if (orderBaseInfo['workorderId'] == collectingLocalDate[i]['workorderId']) {//旧数据
              // console.log("本地记录：", collectingLocalDate[i]['workorderId']);
              updateBindings.push(values);
              isLocalRecord = true;
              collectingLocalDate.splice(i, 1);//
              break;
            }
          }
          if (!isLocalRecord) {
            // console.log("新纪录:", orderBaseInfo['workorderId']);
            insertBindings.push(values);
          }
        });
        var insertPro;
        var updatePro;
        if (insertBindings.length > 0) {
          insertPro = eamDB.insertCollection(db, insertFaultOrderSql, insertBindings);
        } else {
          insertPro = $q.defer().resolve("无需插入" + tableName);
        }
        if (updateBindings.length > 0) {
          updatePro = eamDB.insertCollection(db, updateFaultOrderSql, updateBindings);
        } else {
          updatePro = $q.defer().resolve("无需更新" + tableName);
        }
        if (insertBindings.length == 0 && updateBindings.length == 0) {
          callback(null, "无需更新或者插入");
        } else {
          $.when(insertPro, updatePro)
            .done(function (res) {
              callback(null, "批量操作" + tableName + " 成功");
            })
            .fail(function (err) {
              callback("插入或者删除出错！");
              console.error(err);
            })
            .progress(
              function (progress) {
                console.log(progress);
              })
            .always(function (res) {
              // console.log(updatePro);
            });
        }
      }

      function getOrdersDetailsDataAndDbOps(concatOrders, callback) {
        var totals = concatOrders.slice(0);
        // fullInfoParams.push({
        //   workorderId: workOrder['workorderId'],
        //   workorderType: workOrder['workorderType']
        // });
        //可以分批获取工单数据
        //during(test, fn, callbackopt)
        async.during(
          function (duringCback) {
            // console.log(concatOrders.length);
            return duringCback(null, concatOrders.length > 0);
          }, function (cback) {//重复操作的op callback(err)方式调用
            var fullInfoParams = [];
            for (; ;) {
              var order;
              if (fullInfoParams.length < dowloadDetailCounts) {
                order = concatOrders.shift();
                if (order) {
                  fullInfoParams.push({
                    workorderId: order['workorderId'],
                    workorderType: order['workorderType']
                  })
                } else {
                  break
                }
              } else {
                break;
              }
            }
            if (fullInfoParams.length > 0) {//需要下载数据
              var progress = ((concatOrders.length / totals.length));
              cfpLoadingBar.set(progress); // Set the loading bar to 30%
              WorkOrderApi.getWorkorderFullInfoList(function (res) {
                console.log(res);
                if (res.success) {
                  var dbPromise = dbOperations(res.data);
                  dbPromise.then(function (res) {
                    // console.log("批量操作数据库" + tableName + "结果: ", res);
                    cback();
                  }, function (err) {
                    cback(err);
                  })
                } else {
                  cback(res || "故障工单详情获取失败，请检查网络");
                }
              }, {apiWorkorderBaseInfoDto: fullInfoParams});
            } else {
              cback();//操作完成
            }
          }, callback
        );
      }

      /**
       * 批量操作数据库
       * @param orders
       * @param isModified 工单是否需要同步到服务器,默认不需要
       */
      function dbOperations(orders, isModified, isUploadFailed) {
        Popup.waitLoad("更新故障工单数据...");
        var q = $q.defer();
        async.autoInject({
          "collectingLocalDate": collectingLocalDate,//本地记录
          "orders": function (callback) {
            return callback(null, orders)
          },
          "isModified": function (callback) {
            return callback(null, isModified);
          },
          "isUploadFailed": function (callback) {
            return callback(null, isUploadFailed);
          },
          "updateOrInsertOrders": ['collectingLocalDate', 'orders', "isModified", "isUploadFailed", updateOrInsertOrders]
        }, function (err, result) {
          if (err) {
            Popup.hideLoading();
            Popup.promptMsg("跟新数据到数据库异常，原因： " + err, "更新数据库异常");
            q.reject(err);
          } else {
            Popup.hideLoading();
            q.resolve(result);
          }
        });
        return q.promise;
      }

      function uploadFaultOrders(binginTime, endTime, eamCallback) {
        Popup.waitLoad();
        async.autoInject({
          "selectUploadOrders": selectUploadOrders,
          "operatingUploadOrders": ["selectUploadOrders", operatingUploadOrders]
        }, function (err, result) {
          Popup.hideLoading();
          // console.log("uploadFaultOrders");
          if ($injector.get('eamSync').getSyncLogLength() > 0) {
            eamCallback(false, err);
          } else {
            SyncWorkHours.uploadList(binginTime, endTime, function () {
              eamCallback(true);
            });
          }
        });
        function selectUploadOrders(callback) {
          eamDB.execute(db, sql_select_one_upload_fault_orders)
            .then(function (res) {
              callback(null, OrderService.ChangeSQLResult2Array(res));
            }, function (err) {
              callback(err);
            });
        }

        function operatingUploadOrders(selectUploadOrders, callback) {
          var totalOdersNum = selectUploadOrders.length;
          if (selectUploadOrders.length > 0) {
            console.log("selectUploadOrders " + totalOdersNum);
            async.eachSeries(selectUploadOrders, uploadOrdersIteratee, function (err) {
              if (err) {//其实这里err是不会走的
                console.error(err);
                delete err.json;
                $injector.get('eamSync').synclog(err.errorMessage ? err.errorMessage : JSON.stringify(err));
                return callback();//其中的uploadOrdersIteratee并没有收到底下的函数抛出的错误
              } else {
                return callback(null);
              }
            });
          } else {
            callback(null, "上传成功");
          }
        }
      }

      /**
       * 将json中某个字段的值替换为指定值
       */
      function replaceFieldValue(json, field, specValue) {
        if (!json || !field) {
          return;
        }
        angular.forEach(json, function (value, key) {
          if (angular.isObject(value) || angular.isArray(value)) {
            replaceFieldValue(value, field, specValue);
          } else {
            if (key == field) {
              console.log("key=" + key + "  field=" + field + " specValue" + specValue);
              this[key] = specValue;//指定值替换
              // console.log("替换的对象" + JSON.stringify(this, null, 2));
            }
          }
        }, json);
      }

      function uploadOrderInfo(json, callback) {
        //附件上传成功，附件已经有自己的fileId
        var filesUploadParams = [];//附件上传接口参数
        // var workOrderFiles = {//工单的附件
        //   workOrderId: +json["apiWorkorderBaseInfoDto"]["workorderId"],
        //   filemappingIdArr: null,
        //   source: null
        // };
        var workorderIdBeforeUploadOrder = json["apiWorkorderBaseInfoDto"]["workorderId"];//上传前工单id
        Popup.waitLoad("正在上传工单[" + json["apiWorkorderBaseInfoDto"]["workorderCode"] + "]");
        eamSyncAjax.doPost(Api_uploadWorkOrder, json, function (uploadOrderRes) {
          Popup.eamSyncHideLoading();
          if (isDebug) {
            console.log("uploadOrderRes" + JSON.stringify(uploadOrderRes, undefined, 2));
          }
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
              $injector.get('eamSync').synclog("【" + json["apiWorkorderBaseInfoDto"]["workorderCode"] + "】，" + uploadOrderRes.data['retInfo'])
              // Popup.promptMsg(uploadOrderRes.data['retInfo']);
            }
            // console.log(json);
            filesUploadParams = eamFile.findUploadFilesParams(json);
            if (+json["apiWorkorderBaseInfoDto"]["workorderId"] < 0) {//是新建的故障工单,定维技改，安装调试都没有新建工单
              if (isDebug) console.debug("更新附件关联的工单Id");
              var orderIdNCode = uploadOrderRes.data.dataObject.split("|");
              var workorderId = json.apiWorkorderBaseInfoDto.workorderId = json.workorderDetails.eaWoWorkorderinfoDto.workorderId = orderIdNCode[0];
              var workorderCode = json.apiWorkorderBaseInfoDto.workorderCode = json.workorderDetails.eaWoWorkorderinfoDto.workorderCode = orderIdNCode[1];
              // replaceFieldValue(json, 'workorderId', workorderId);//需要将临时工单的负数id替换成新id
              filesUploadParams.forEach(function (item) {//故障工单没有点检表
                // if (item.workOrderId < 0
                //   || item.workOrderId == "null"//讨厌js，不知为何就变成字符串'null'
                //   || !StringUtils.isNotEmpty(item.workOrderId)) {//如果是新建的故障工单，这个数值是null,因为在添加附件时，也许还未存在故障工单的id
                //   item.workOrderId = workorderId;
                // }
                item.workOrderId = workorderId;
              });
            }
            if (isDebug) {
              console.log("filesUploadParams" + JSON.stringify(filesUploadParams, undefined, 2));
            }
            callback(null, {
              filesUploadParams: filesUploadParams,
              workorderIdBeforeUploadOrder: workorderIdBeforeUploadOrder,
              workOrderId: workorderId,
              workorderCode: workorderCode,
              json: json
            });////工单上传成功
          } else {//工单上传失败
            var errorMessage = "故障工单【" + json["apiWorkorderBaseInfoDto"]["workorderCode"] + "】上传失败" + "<br/>"
              + (uploadOrderRes.retInfo ? ",原因:" + uploadOrderRes.retInfo : uploadOrderRes);
            $injector.get('eamSync').synclog(errorMessage);
            console.error(uploadOrderRes);
            saveFaultOrder(json, function () {//工单json需要存回本地，原因是，附件已经上传成功（如果有的话），和原来的json不一样了
              callback({
                errorCode: order_upload_error_code,
                json: json,
                errorMessage: errorMessage,
                uploadOrderRes: uploadOrderRes
              })
            }, true);
          }
        });
      }

      function mappingFiles2UploadedOrder(uploadOrderInfo, json, workHoursInfoOp, callback) {
        // console.log("uploadOrderInfo: "+JSON.stringify(uploadOrderInfo,undefined,2));
        // if (isDebug) {
        //   console.log("mappingFiles2UploadedOrder,uploadOrderInfo: " + JSON.stringify(uploadOrderInfo, undefined, 2));
        // }
        eamSyncAjax.doPost(Api_updateUploadFiles, uploadOrderInfo['filesUploadParams'], function (res) {
          console.log(JSON.stringify(res, undefined, 2));
          if (res.success) {
            //根据id判断如果小于0为新建上传后删除 反之则修改上传状态
            var delete_temp_success_sql = "delete from " + tableName + " where workorderId=?";
            var update_success_sql = "update " + tableName + " set uploadStatus=0 where workorderId=? ";
            // console.log(uploadOrderInfo.workorderIdBeforeUploadOrder);
            // console.log(json["apiWorkorderBaseInfoDto"]["workorderId"]);
            if (uploadOrderInfo.workorderIdBeforeUploadOrder < 0) {
              eamDB.execute(db, delete_temp_success_sql, [uploadOrderInfo.workorderIdBeforeUploadOrder + ""])
                .then(function (res) {
                  // Popup.loadMsg("同步工单成功!",500);
                  callback(null, {uploadOrderInfo: uploadOrderInfo});
                }, function (err) {
                  callback(err || "更新失败!");
                });
            } else {
              eamDB.execute(db, update_success_sql, [json["apiWorkorderBaseInfoDto"]["workorderId"] + ""])
                .then(function (res) {
                  // Popup.loadMsg("同步工单成功!",500);
                  callback(null, {uploadOrderInfo: uploadOrderInfo});
                }, function (err) {
                  callback(err || "更新失败!");
                });
            }
          } else {
            var errorMessage = "工单附件上传失败" + (uploadOrderRes.retInfo ? " ," + uploadOrderRes.retInfo : "");
            $injector.get('eamSync').synclog(errorMessage);
            /**
             如果是新建的故障工单，此时，工单的其他信息（除附件外）都已经上传成功，工单id已经存在，不再是负数，所以需要将原来负数的工单id删除，
             保存当前的工单信息
             */
            var workorderIdBeforeUploadOrder = uploadOrderInfo.workorderIdBeforeUploadOrder;
            if (workorderIdBeforeUploadOrder < 0) {//上传的是故障工单,后台已经成功存储了工单信息但是同步过程还是有问题,比如附件上传过程中网络出错
              eamDB.execute(db, 'delete from ' + tableName + ' where workorderId =?', [+workorderIdBeforeUploadOrder + ""])
                .then(function () {
                  saveFaultOrder(json, function () {//将已经同步成功的工单信息写入数据库，仅是部分同步成功的信息，比如附件，和工单整体信息
                    callback({
                      errorCode: order_file_mapping_upload_error_code,
                      json: json,
                      errorMessage: errorMessage,
                      uploadOrderRes: res,
                      uploadOrderInfo: uploadOrderInfo
                    });
                  }, true);
                }, function (dbErr) {
                  callback({
                    errorCode: order_file_mapping_upload_error_code,
                    json: json,
                    errorMessage: "上传工单删除临时故障工单数据库操作失败",
                    uploadOrderRes: res,
                    uploadOrderInfo: uploadOrderInfo
                  });
                });
            } else {//新建的故障工单的附件未上传成功工单没有上传成功
              saveFaultOrder(json, function () {
                callback({
                  errorCode: order_file_mapping_upload_error_code,
                  json: json,
                  errorMessage: errorMessage,
                  uploadOrderRes: res,
                  uploadOrderInfo: uploadOrderInfo
                });
              }, true);
            }

          }
        });
      }

      function uploadOrderAnyway(json, callback) {
        async.autoInject({
          "json": function (cb) {
            return cb(null, json);
          },
          "uploadOrderInfo": ['json', uploadOrderInfo],//上传工单
          "workHoursInfoOp": ['uploadOrderInfo', updateWorkHoursInfo],//临时工单可能创建了工时填报记录，当上传工单成功后，需要替换临时工单的数据
          "mappingFiles2UploadedOrder": ['uploadOrderInfo', "json", 'workHoursInfoOp', mappingFiles2UploadedOrder]//工单关联的附件
        }, function (err, res) {
          // console.log(JSON.stringify(res, undefined, 2));
          callback();//不抛错误，否则后续同步受阻
        });
      }

      function updateWorkHoursInfo(uploadOrderInfo, callback) {//对工单关联的人员报工进行工单id关联
        var workorderIdBeforeUploadOrder = uploadOrderInfo.workorderIdBeforeUploadOrder;
        var WorkHoursService = $injector.get('WorkHoursService');
          WorkHoursService.getWorkHourRecordByOrderId(workorderIdBeforeUploadOrder)
          .then(function (workHours) {
            if (isDebug) {
              console.debug("临时工单上传成功，处理前关联的工时单", workHours);
            }
            if (workHours && workHours.length > 0) {
              workHours.forEach(function (workHour) {
                var workHourJson = angular.fromJson(workHour.json);
                workHourJson.workorderId = uploadOrderInfo.workOrderId;
                if (uploadOrderInfo.workorderCode) {
                  workHourJson.workorderCode = uploadOrderInfo.workorderCode;
                }
                angular.copy(workHourJson, workHour);
              });
              if (isDebug) {
                console.debug("临时工单上传成功，处理后关联的工时单", workHours);
              }
              WorkHoursService.updateOrInsert(workHours).then(function () {
                // $rootScope.$emit(REFRESH_WORK_HOURS_LIST_EVENT);
                callback();
              }, function (err) {
                callback(err);
              })
            } else {
              callback();
            }
          }, function (err) {
            callback(err)
          });
      }

      function uploadOrdersIteratee(order, callback) {//callback(err)
        console.log("正在上传工单：" + order.workorderCode);
        if (order && order.json) {
          var json = angular.fromJson(order.json);
            eamFile.uploadAttachedFile(json)
            .then(onUploadFileSuccess, onUploadFileFail);
          function onUploadFileSuccess() {
            uploadOrderAnyway(json, callback);
          }

          function onUploadFileFail(uploadFileErr) {
            saveFaultOrder(json,function () {
              callback({errorMessage: JSON.stringify(uploadFileErr || "附件上传失败")});
            },true);
            // var err = uploadFileErr;
            // var update_json_sql = "update " + tableName + " set json=?,uploadStatus=2 where workorderId=?";//更新json和上传状态位为2，表明上传失败
            // eamDB.execute(db, update_json_sql, [JSON.stringify(json), json["apiWorkorderBaseInfoDto"]["workorderId"]])
            //   .then(function () {
            //     if (err) {
            //       callback($.extend(err, {"fileUploadError": "附件上传失败", errorMessage: '附件上传失败'}));
            //       if (isDebug) {
            //         console.log("fileUploadErr" + JSON.stringify(err, undefined, 2));
            //       }
            //     } else {
            //       callback({errorMessage: JSON.stringify(err || "附件上传失败")});
            //     }
            //   }, function (dberr) {
            //     callback({errorMessage: JSON.stringify($.extend(err, dberr))});
            //   });
          }
        } else {
          callback(null);
        }

      }

      function getFaultOrders(params, callback) {//根据条件获取故障工单数据
        var values = [];
        var where = "";
        if (!params.pageNumber) {
          params.pageNumber = 1;
        }
        var skipRecord = (params.pageNumber - 1) * 5;//每次五条数据
        // console.log("skipRecord: "+skipRecord);
        if (StringUtils.isNotEmpty(params.projectName)) {
          where += " and projectName like ? ";
          values.push("%" + params.projectName + "%");
        }
        if (StringUtils.isNotEmpty(params.orderNo)) {
          where += " and workorderCode like ? ";
          values.push("%" + params.orderNo + "%");
        }
        if (StringUtils.isNotEmpty(params.faultCode)) {
          where += " and faultCode like ? ";
          values.push("%" + params.faultCode + "%");
        }
        if (params.faultBeginFromTime && angular.isDate(params.faultBeginFromTime)) {
          where += " and faultBegindate >=? ";
          values.push(params.faultBeginFromTime.getTime() + "");
        }
        if (params.faultBeginToTime && angular.isDate(params.faultBeginToTime)) {
          where += " and faultBegindate <=? ";
          values.push(params.faultBeginToTime.getTime() + "");
        }
        if (StringUtils.isNotEmpty(params.workOrderStatus)) {
          where += " and workorderStatus =? ";
          values.push(params.workOrderStatus + "");
        }
        if (StringUtils.isNotEmpty(params.workorderId)) {
          where += " and workorderId =? ";
          values.push(params.workorderId + "");
        }
        if (StringUtils.isNotEmpty(params.faultSource)) {
          where += " and workorderType =? ";
          values.push(params.faultSource + "");
        }
        values.push(skipRecord);
        var sql = "select * from " + tableName + " where 1=1" + where + " order by createOn desc limit ?,5";
        eamDB.execute(db, sql, values)
          .then(
            function (res) {
              res = OrderService.ChangeSQLResult2Array(res);
              if ($.isFunction(callback)) {
                callback(res);
              }
            }, function (err) {
              console.error("查询故障工单异常", err);
            });
      }

      function getProcessingNumber(callback) {
        var sql = "select count(*) as processingNum from " + tableName + " where workorderStatus=?";
        eamDB.execute(db, sql, ['41'])
          .then(
            function (res) {
              if (res.rows.length > 0) {
                if ($.isFunction(callback)) {
                  callback(true, res.rows.item(0)['processingNum']);
                }
              }
            }, function (err) {
              console.error("查找数据库失败: " + tableName + JSON.stringify(err, undefined, 2));
              callback(false, err);
            });
      }

      //faultOrder json
      function saveFaultOrder(faultOrder, callback, isUploadFailed) {
        //console.log("正在处理附件,saveFaultOrder" + JSON.stringify(faultOrder.workorderDetails.eaWoFilemappingList, undefined, 2));
        eamFile.moveFileToUpload(faultOrder, function (res) {
          Popup.hideLoading();
          if (!res) {
            Popup.promptMsg("附件处理出错");
          } else {
            //console.log("before saveFaultOrder" + JSON.stringify(faultOrder.workorderDetails.eaWoFilemappingList, undefined, 2));
          }
          var order = creatingFaultOrder();
          angular.copy(faultOrder, order);
          console.log(" order", order);
          order.setFaultOrderInfo(faultOrder);
          dbOperations([order], true, isUploadFailed).then(function () {
            if ($.isFunction(callback)) {
              order["apiWorkorderBaseInfoDto"].json = JSON.stringify(order);
              callback(order);
            }
          });
        });
      }

      function changeWorkOrderStatus(workorderStatus, faultOrder, callback) {
        OrderService.getDicDetailById(+workorderStatus, function (res) {
          if (isDebug) {
            console.log("workorderStatus: " + workorderStatus + " " + JSON.stringify(res, undefined, 2));
            console.log("workorderStatus: " + workorderStatus + " " + JSON.stringify(res.rows.item(0), undefined, 2));
          }
          var workorderStatusName = res.rows.item(0).detailName;
          faultOrder['workorderDetails']['eaWoWorkorderinfoDto']['workorderStatus'] = workorderStatus + "";
          faultOrder['workorderDetails']['eaWoWorkorderinfoDto']['workorderStatusName'] = workorderStatusName;
          saveFaultOrder(faultOrder, callback);
          //if(angular.isFunction(callback))callback(faultOrder);
        });
      }

      function creatingFaultOrder() {
        return starterClassFactory.faultOrderInstance();
      }

      //删除工单数据
      function deleteWorkOrderRecord(faultOrder, callback) {
        //临时数据直接删除，同时删除其相关联的工时单数据
        if (faultOrder.workorderId < 0) {
          eamDB.execute(db, "delete from " + tableName + " where workorderId=?", [faultOrder.workorderId]).then(function (res) {
            eamDB.execute(db, 'delete from eam_sync_workhours where workOrderId=?', [+faultOrder.workorderId + ""]).then(function (res) {
              callback(res);
            }, function (err) {
              Popup.promptMsg("删除临时工单关联的工时单出错");
              console.error(err);
            });
          }, function (err) {
            console.error(err);
          });
        } else {
          faultOrder = angular.fromJson(faultOrder.json);
          //同步数据另行处理
          changeWorkOrderStatus(43, faultOrder, callback);
        }
      }

      function getFaultOrderOnSyncSuccess(workorderId, callback) {
        getFaultOrders({workorderId: workorderId}, function (res) {
          console.log(res);
          if (res.length > 0) {
            callback(res[0]);
          } else {
            callback();
          }
        });
      }

      return {
        downloadFaultOrders: downloadFaultOrders,
        uploadFaultOrders: uploadFaultOrders,
        getFaultOrders: getFaultOrders,
        getProcessingNumber: getProcessingNumber,
        creatingFaultOrder: creatingFaultOrder,
        saveFaultOrder: saveFaultOrder,
        getTableName: function () {
          return tableName;
        },
        deleteWorkOrderRecord: deleteWorkOrderRecord,
        changeWorkOrderStatus: changeWorkOrderStatus,
        uploadOrdersIteratee: uploadOrdersIteratee,
        getFaultOrderOnSyncSuccess: getFaultOrderOnSyncSuccess
      }

    });
