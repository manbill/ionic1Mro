/**
 * 公用基础数据下载。
 */
angular.module('starter.SyncCommonDictionary', [])
  .factory("SyncCommonDictionary", function ($q, eamDB, Popup, $injector, $ionicBackdrop, eamSyncAjax) {

    var Api_getDictionaryDetail = baseUrl + "/api/common/getDictionaryDetail.api"; //获取数据。


    var insert_eam_sync_dictionary_detail = "insert into eam_sync_dictionary_detail (dictionaryId, paraType, detailCode, detailName, " +
      "detailComment, activeFlag, detailId) " +
      "values (?,?,?,?," +
      "?,?,?)";

    var update_eam_sync_dictionary_detail = "update eam_sync_dictionary_detail set dictionaryId=?, paraType=?, detailCode=?, detailName=?, " +
      "detailComment=?, activeFlag=? where detailId=? ";


    var select_eam_sync_dictionary_detail_byid = "select * from eam_sync_dictionary_detail where detailId=? ";
    /**
     * 检查当前表中是否有数据
     * @type {string}
     */
    var select_eam_sync_dictionary_detail_count = "select count(*) as size from eam_sync_dictionary_detail";

    /**
     * 根据时间段下载工单列表
     * @param begintime
     * @param endtime
     * @param callback
     */
    var downloadList = function (begintime, endtime, callback) {
      Popup.waitLoad("正在同步字典信息数据......");
      $ionicBackdrop.retain();
      //先检查表中是否有数据，没有数据的话，则下载全表数据
      eamDB.execute(db, select_eam_sync_dictionary_detail_count).then(function (res) {
        if (res.rows.item(0)["size"] > 0) {
          //增量更新
          eamSyncAjax.doPost(Api_getDictionaryDetail, {
            startDate: begintime,
            endDate: endtime
          }, function (res) {
            if (res.success) {
              var data = res.data;
              updateOrInsert(data, callback);
            } else {
              $injector.get("eamSync").synclog("获取字典表数据失败");
              $ionicBackdrop.release();
              callback();
            }
          });
        } else {
          //全量更新
          eamSyncAjax.doPost(Api_getDictionaryDetail, {}, function (res) {
            if (res.success) {
              var data = res.data;
              updateOrInsert(data, callback);
            } else {
              $injector.get("eamSync").synclog("获取字典表数据失败");
              $ionicBackdrop.release();
              callback();
            }
          });
        }
      }, function (err) {
        $injector.get("eamSync").synclog("检查字典表数据失败");
        $ionicBackdrop.release();
        callback();
      });

    };

    var updateOrInsert = function (newDate, callback) {
      if (newDate.length == 0) {
        if ($.isFunction(callback)) {
          $ionicBackdrop.release();
          callback(true);
        }
        return;
      }
      var detailIds = [];
      for (var i = 0; i < newDate.length - 1; i++) {
        detailIds.push(newDate[i]["detailId"]);
      }
      detailIds.join(",");
      detailIds.push(newDate[newDate.length - 1]["detailId"]);
      eamDB.execute(db, "select * from eam_sync_dictionary_detail where detailId in (" + detailIds + ");").then(function (res) {
        var oldData = $injector.get("OrderService").ChangeSQLResult2Array(res);
        // console.log(oldData);
        var updatingBindings = [];//需要更新的本地记录
        var insertingBindings = [];//将要批量插入的数组
        for (var index = 0; index < newDate.length; index++) {
          var item = newDate[index];
          var isBreak = false;//判断工单是插入还是要更新
          var insertValues = [];
          for (var j = 0; j < oldData.length; j++) {
            if (oldData[j]["detailId"] == item["detailId"]) {
              var updateValues = [];
              updateValues.push(item["dictionaryId"]);
              updateValues.push(item["paraType"]);
              updateValues.push(item["detailCode"]);
              updateValues.push(item["detailName"]);
              updateValues.push(item["detailComment"]);
              updateValues.push(item["activeFlag"]);
              updateValues.join(",");
              updateValues.push(item["detailId"]);
              updatingBindings.push(updateValues);
              oldData.splice(j, 1);
              isBreak = true;
              break;
            }
          }
          if (isBreak) {
            continue;
          }
          insertValues.push(item["dictionaryId"]);
          insertValues.push(item["paraType"]);
          insertValues.push(item["detailCode"]);
          insertValues.push(item["detailName"]);
          insertValues.push(item["detailComment"]);
          insertValues.push(item["activeFlag"]);
          insertValues.join(",");
          insertValues.push(item["detailId"]);
          insertingBindings.push(insertValues);
        }
        if (insertingBindings.length > 0) {
          eamDB.insertCollection(db, insert_eam_sync_dictionary_detail, insertingBindings).then(function () {
            if (updatingBindings.length > 0) {
              eamDB.insertCollection(db, update_eam_sync_dictionary_detail, updatingBindings).then(function () {
                if ($.isFunction(callback)) {
                  $ionicBackdrop.release();
                  callback(true);
                }
              }, function (error) {
                $ionicBackdrop.release();
                console.error(error);
                callback();
              });
            } else if ($.isFunction(callback)) {
              $ionicBackdrop.release();
              callback(true);
            }
          }, function (error) {
            $ionicBackdrop.release();
            console.error(error);
            callback();
          });
        } else if (updatingBindings.length > 0) {
          eamDB.insertCollection(db, update_eam_sync_dictionary_detail, updatingBindings).then(function () {
            if ($.isFunction(callback)) {
              $ionicBackdrop.release();
              callback(true);
            }
          }, function (error) {
            $ionicBackdrop.release();
            console.error(error);
            callback();
          });
        } else if ($.isFunction(callback)) {
          $ionicBackdrop.release();
          callback(true);
        }
      }, function (error) {
        $ionicBackdrop.release();
        console.error(error);
        callback();
      });
    };

    return {
      downloadList: downloadList
    }
  });
