/**
 * 调拨单同步服务。
 */
angular.module('starter.SyncSparepart', [])
  .factory("SyncSparepart", function ($q, eamFile, eamDB, Storage, SparepartApi, OrderService, $injector, cfpLoadingBar, Popup, eamSyncAjax) {
    var Api_gettransferOrderDtoList = baseUrl + "/api/sparepart/gettransferOrderDtoList.api"; //根据时间段获取调拨单信息
    var Api_updateUploadFiles = baseUrl + '/api/updateUploadFiles.api';//上传附件接口
    var tableName = "eam_sync_sparepart";
    var insertsql = "insert into eam_sync_sparepart" +
      " (expectReceiveDateTime,editRight,transferOrderNo,transferTypeId ,transferReasonId ,workOrderId ,workorderCode ," +
      " statusId ,createOn ,giWhName ,grWhName ,createByName ," +
      " createDate ,flag , materialNo , materialComment,json," +
      " lastUpdateDatetimeApi, lastUpdateDatetimeApp, uploadStatus, downloadStatus, " +
      " shiftWarehouseId, grWhId, giWhId, transferOrderId)" +
      " values" +
      " (?,?,?,?,?,?," +
      " ?,?,?,?,?, " +
      " ?,?,?,?,?, " +
      " ?,?,?,?,?," +
      " ?,?,?,?)";

    var updatesql = "update eam_sync_sparepart set" +
      " expectReceiveDateTime=?,editRight=?,transferOrderNo=?,transferTypeId =?,transferReasonId =?,workOrderId =?,workorderCode =?," +
      " statusId =?,createOn =?,giWhName =?,grWhName =?,createByName =?," +
      " createDate =?,flag =?, materialNo =?, materialComment=?,json=?," +
      " lastUpdateDatetimeApi=?, lastUpdateDatetimeApp=?, uploadStatus=?, downloadStatus=?," +
      " shiftWarehouseId=?,grWhId=? ,giWhId=?  " +
      " where transferOrderId=?";
    /**
     * 更新json对象
     * @type {string}
     */
    var update_json_sql = "update eam_sync_sparepart set json=? where transferOrderId=? ";
    /**
     * 更新上传状态为不需要上传了
     * @type {string}
     */
    var update_success_sql = "update eam_sync_sparepart set uploadStatus=0 where transferOrderId=? ";

    var selectsql = "select transferOrderId from eam_sync_sparepart where transferOrderId=? ";

    var select_update_one = "select * from eam_sync_sparepart where uploadStatus=1 lIMIT 1";

    var nowPage = 0;
    var downloadParams;

    /**
     * 上传调拨单信息。
     * @param callback
     */
    var uploadList = function (beginTime, endTime, callback) {
      Popup.eamSyncHideLoading();
      callback(true);
    };

    // /**
    //  * 根据时间段下载调拨单信息
    //  * @param begintime
    //  * @param endtime
    //  * @param callback
    //  */
    // var downloadList = function (begintime, endtime, callback) {
    //     //调用服务器取数逻辑，将列表下载到本地，并通过downloadItem方法完成明细下载。
    //     //理论上数据应该是要做分页处理的，但是目前没有进行分页。
    //     eamSyncAjax.doPost(Api_gettransferOrderDtoList, {
    //         startDate: begintime,
    //         endDate: endtime
    //     }, function (res) {
    //         if (res.success) {
    //             var data = res.data;
    //             updateOrInsert(data, callback);
    //         } else {
    //             $injector.get("eamSync").synclog("获取调拨单失败");
    //             callback();
    //         }
    //     });
    // };

    var downloadList = function (begintime, endtime, callback) {
      cfpLoadingBar.start();
      nowPage = 0;
      //增量更新
      downloadParams = {
        startDate: begintime,
        endDate: endtime,
        page: 1,
        projectId: Storage.getSelectedProject().projectId
      };
      async.doDuring(downloadAction, function (arg, testCb) {
        return testCb(null, arg > 0);
      }, function (err) {
        cfpLoadingBar.complete();
        if (err) {
          callback(false, err);
        } else {
          callback(true);
        }
      });
    };

    function downloadAction(callback) {
      Popup.waitLoad("正在下载调拨单信息...");
      console.debug("开始时间：" + new Date(downloadParams.startDate));
      console.debug("结束时间： " + new Date(downloadParams.endDate));
      eamSyncAjax.doPost(Api_gettransferOrderDtoList, downloadParams, function (res) {
        if (res.success) {
          var data = res.data;
          console.log('调拨单网络数据:', data);
          if (data.length > 0) {
            downloadParams.page++;
          }
          dbActions(data).then(
            function () {
              callback(null, data.length);
            }, function (err) {
              callback(err);
            })
        } else {
          callback(res);
        }
      }, {timeout: 60 * 1000});
    }

    function dbActions(spareparts) {
      Popup.waitLoad("正在操作调拨单数据库...");
      var defer = $q.defer();
      var transferOrderIds = [];
      var bindings = [];
      spareparts.forEach(function (sparepart) {
        transferOrderIds.push(+sparepart['transferOrderId']);
        var values = [];
        values.push(angular.isNumber(sparepart["expectReceiveDateTime"]) ? +sparepart["expectReceiveDateTime"] : sparepart["expectReceiveDateTime"]);
        values.push(sparepart["editRight"]);
        values.push(sparepart["transferOrderNo"] || null);
        values.push(sparepart["transferTypeId"] || null);
        values.push(sparepart["transferReasonId"] || null);
        values.push(sparepart["workOrderId"] || null);
        values.push(sparepart["workorderCode"] || null);
        values.push(sparepart["statusId"] || null);
        values.push(sparepart["createOn"] || null);
        values.push(sparepart["giWhName"] || null);
        values.push(sparepart["grWhName"] || null);
        values.push(sparepart["createByName"] || null);
        values.push(sparepart["createDate"] || null);//标识--add:新增保存、addSubmit:新增提交、edit：修改保存、editSubmit:修改提交
        values.push(sparepart["flag"]);
        var materialNo = "";
        var materialComment = "";
        for (var i in sparepart["tranferOrderItemDtoList"]) {
          materialNo += sparepart["tranferOrderItemDtoList"][i]["materialNo"] + ",";
          materialComment += sparepart["tranferOrderItemDtoList"][i]["materialComment"] + ",";
        }
        values.push(materialNo);//从列表中获取组合数据模糊查询。
        values.push(materialComment);//从列表中获取组合数据模糊查询。
        values.push(JSON.stringify(sparepart));
        values.push(new Date().getTime());
        values.push(new Date().getTime());
        values.push(0);//uploadStatus，是否需要往服务器同步，1为需求，0为不需要
        values.push(1);//downloadStatus，是否是从服务器下载，默认为1，日常操作不需要修改此字段。
        values.push(sparepart["shiftWarehouseId"]);//转办仓库
        values.push(sparepart["grWhIdNum"]);//转办仓库
        values.push(sparepart["giWhIdNum"]);//转办仓库
        values.push(sparepart["transferOrderId"]);//调拨单id
        bindings.push(values);
      });
      var sql = 'delete from ' + tableName + " where transferOrderId in (" + transferOrderIds + ")";
      eamDB.execute(db, sql)
        .then(function (res) {
          if (bindings.length > 0) {
            eamDB.insertCollection(db, insertsql, bindings)
              .then(function () {
                Popup.hideLoading();
                defer.resolve();
              }, function (err) {
                Popup.hideLoading();
                defer.reject(err);
              })
          } else {
            Popup.hideLoading();
            defer.resolve();
          }
        }, function (err) {
          Popup.hideLoading();
          defer.reject(err);
        });
      return defer.promise;
    }


    function syncTransferOrderInfo(transferOrder) {
      var defer = $q.defer();
      eamFile.moveFileToUpload(transferOrder,function () {
        eamFile.uploadAttachedFile(transferOrder)
          .then(onUploadFileSuccess, onUploadFileFail);
      });
      function onUploadFileSuccess() {
        var filesParams = [];
        SparepartApi.save(function (resp) {
          var filemappingIdArr = [];
          console.log("transferOrder" + JSON.stringify(transferOrder, null, 2));
          var temFileItem = eamFile.iterateeJsonAction(transferOrder, false) || [];
          if (isDebug) {
            console.log("调拨单附件收集结果：" + JSON.stringify(temFileItem, undefined, 2));
          }
          temFileItem.forEach(function (item) {
            if (item.filemappingId) {
              filemappingIdArr.push(item.filemappingId);
            }
          });
          if (resp.success) {
            if (+transferOrder.transferOrderId < 0) {//新建的调拨单
              filesParams.push({
                workOrderId: +resp.data.dataObject,
                source: AttachedFileSources.transferorder_info_source,
                filemappingIdArr: filemappingIdArr
              })
            } else {
              filesParams.push({
                workOrderId: +transferOrder.transferOrderId,
                source: AttachedFileSources.transferorder_info_source,
                filemappingIdArr: filemappingIdArr
              })
            }
            if (isDebug) {
              console.log("保存调拨单附件信息：filesParams:" + JSON.stringify(filesParams, null, 2));
            }
            eamSyncAjax.doPost(Api_updateUploadFiles, filesParams, function (res) {
              if (res.success) {
                defer.resolve($.extend(res, resp));
              } else {
                defer.reject(res);
              }
            });
          } else {
            defer.reject(resp.retInfo||"上传调拨单失败");
          }
        }, transferOrder);
      }

      function onUploadFileFail(err) {
        defer.reject("附件上传失败");
      }

      return defer.promise;
    }

    function saveTransferOrderInfo(sparepart) {
      return dbActions([sparepart]);
    }

    function deleteSparepart(transferOrderId) {
      var d = $q.defer();
      eamDB.execute(db, 'delete from ' + tableName + " where transferOrderId=?", [+transferOrderId+""])
        .then(function () {
          d.resolve();
        }, function (err) {
          d.reject(err)
        });
      return d.promise;
    }

    return {
      downloadList: downloadList,
      uploadList: uploadList,
      syncTransferOrderInfo: syncTransferOrderInfo,
      saveTransferOrderInfo: saveTransferOrderInfo,
      deleteSparepart: deleteSparepart
    }
  })
;
