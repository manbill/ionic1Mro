

angular.module('starter.SyncWorkorder', [])
  .factory("SyncWorkorder", function ($q, eamDB, $injector, eamSyncAjax, Popup, $cordovaSQLite, $http) {
    var Api_getWorkOrderList = baseUrl+"/api/order/queryWorkOrdering.api"; //获取我的工单列表请求
    var insertsql = "insert into eam_sync_workorder (json, areaName, orderId, orderNo, orderType, status, " +
      "scenePM, machineNo, projectName, workTypeName, workType, faultCode, faultDescription, " +
      "faultComponentName, faultDetailDes, faultCause, windCloudFaultCode, windCloudFaultName, " +
      "subject, faultSource, projectId, uploadStatus, downloadStatus, id) " +
      "values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

    var updatesql = "update eam_sync_workorder set json=?, areaname=?, orderid=?, orderno=?, ordertype=?, status=?, " +
      "scenepm=?, machineno=?, projectname=?, worktypename=?, worktype=?, faultcode=?, faultdescription=?, " +
      "faultcomponentname=?, faultdetaildes=?, faultcause=?, windcloudfaultcode=?, windcloudfaultname=?, " +
      "subject=?, faultsource=?, projectid=?, uploadStatus=?, downloadStatus=? where id=? ";

    /**
     * 更新json对象
     * @type {string}
     */
    var update_json_sql = "update eam_sync_schdlemaintain set json=? where workorderId=? ";
    /**
     * 更新上传状态为不需要上传了
     * @type {string}
     */
    var update_success_sql = "update eam_sync_schdlemaintain set uploadStatus=0 where workorderId=? ";
    //新增记录同步后删除
    var delete_temp_success_sql = "delete from eam_sync_schdlemaintain where workorderId=? ";

    var selectsql = "select id from eam_sync_workorder where id=? ";
    /**
     * 上传工单信息。
     * @param callback
     */
    var uploadList = function (callback) {
      //拿到对象以后生成检查里面有哪些是需要下载的附件，将这些附件以队列形式插入到附件表中，以便附件表下载附件。
      Popup.eamSyncHideLoading();
      callback(true);
    };

    /**
     * 根据时间段下载工单列表
     * @param begintime
     * @param endtime
     * @param callback
     */
    var downloadList = function (begintime, endtime, callback) {
      //调用服务器取数逻辑，将列表下载到本地，并通过downloadItem方法完成明细下载。
      //理论上数据应该是要做分页处理的，但是目前没有进行分页。
      Popup.waitLoad("正在同步故障工单数据...");
      eamSyncAjax.doPost(Api_getWorkOrderList, {}, function (res) {
        Popup.eamSyncHideLoading();
        if (res.success) {
          var data = res.data;
          if (isDebug) {
            console.log("sync SyncWorkorder downloadList ",data);
          }
          updateOrInsert(data, callback);
        } else {
          $injector.get("eamSync").synclog("获取正在同步故障工单数据失败");
          $injector.get("eamSync").stopSync();
          callback();
        }
      });
    };

    var batchInsertOrUpdate = function (insertData, updateData, callback) {//批量插入或者更新数据库操作
      Popup.waitLoad("正在批量更新故障工单数据库数据...");
      if (insertData.length > 0) {
        eamDB.insertCollection(db, insertsql, insertData).then(function (res) {
          if (updateData.length > 0) {
            eamDB.insertCollection(db, updatesql, updateData).then(function (res) {
              if ($.isFunction(callback)) {
                Popup.eamSyncHideLoading();
                callback(true);
              }
            }, function (error) {
              console.error(error);
              $injector.get("eamSync").synclog("批量更新故障工单数据失败");
              if ($.isFunction(callback)) {
                Popup.eamSyncHideLoading();
                callback();
              }
            });
          } else if ($.isFunction(callback)) {
            Popup.eamSyncHideLoading();
            callback(true);
          }
        }, function (error) {
          console.error(error);
          $injector.get("eamSync").synclog("批量插入故障工单数据失败!" + "<br/>error:" + JSON.stringify(error));
          if ($.isFunction(callback)) {
            Popup.eamSyncHideLoading();
            callback();
          }
        });
      } else if (updateData.length > 0) {//不执行插入
        eamDB.insertCollection(db, updatesql, updateData).then(function (res) {
          Popup.eamSyncHideLoading();
          if ($.isFunction(callback)) {
            callback(true);
          }
        }, function (error) {
          console.error(error);
          Popup.eamSyncHideLoading();
          $injector.get("eamSync").synclog("批量更新故障工单数据失败");
          if ($.isFunction(callback)) {
            callback();
          }
        });
      } else if ($.isFunction(callback)) {
        Popup.eamSyncHideLoading();
        callback(true);
      }
    };

    var updateOrInsert = function (data, callback) {
      if (data && data.length > 0) {
        var ids = [];
        for (var i = 0; i < data.length - 1; i++) {
          ids.push(data[i]["orderId"]);
        }
        ids.join(",");
        ids.push(data[data.length - 1]["orderId"]);
        eamDB.execute(db, "delete from eam_sync_workorder where id in (" + ids + ");").then(function () {
          var insertData = [];
          for (var l in data) {
            var item = data[l];
            var insertValues = [];
            insertValues.push(JSON.stringify(item));
            insertValues.push(item["areaName"]);
            insertValues.push(item["orderId"]);
            insertValues.push(item["orderNo"]);
            insertValues.push(item["orderType"]);
            insertValues.push(item["status"]);
            insertValues.push(item["scenePM"]);
            insertValues.push(item["machineNo"]);
            insertValues.push(item["projectName"]);
            insertValues.push(item["workTypeName"]);
            insertValues.push(item["workType"]);
            insertValues.push(item["faultCode"]);
            insertValues.push(item["faultDescription"]);
            insertValues.push(item["faultComponentName"]);
            insertValues.push(item["faultDetailDes"]);
            insertValues.push(item["faultCause"]);
            insertValues.push(item["windCloudFaultCode"]);
            insertValues.push(item["windCloudFaultName"]);
            insertValues.push(item["subject"]);
            insertValues.push(item["faultSource"]);
            insertValues.push(item["projectId"]);
            insertValues.push(0);//uploadStatus，是否需要往服务器同步，1为需求，0为不需要
            insertValues.push(1);//downloadStatus，是否是从服务器下载，默认为1，日常操作不需要修改此字段。
            insertValues.join(",");
            insertValues.push(item["orderId"]);
            insertData.push(insertValues);
          }
          batchInsertOrUpdate(insertData, [], callback);
        }, function (error) {
          console.error(error);
          if ($.isFunction(callback)) {
            callback();
          }
        });
      } else {
        if ($.isFunction(callback)) {
          callback(true);
        }
      }
    };

    return {
      downloadList: downloadList,
      uploadList: uploadList
    }
  });
