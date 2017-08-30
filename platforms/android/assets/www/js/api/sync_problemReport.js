/**
 * 定维任务数据同步接口
 * 定维任务数据同步服务。
 */
angular.module('starter.SyncProblemReport', [])
  .factory("SyncProblemReport", function ($q, eamDB, $injector, eamSyncAjax, Popup, Storage) {

    var Api_getProblemReportList = baseUrl + "/api/problemReport/list.api";
    var tableName = 'eam_sync_problemreport';
    var insertsql = "insert into eam_sync_problemreport (" +
      "json, problemNo, workorderId, workorderCode, " +
      "projectId, projectName, areaCode, areaDesc, " +
      "problemType, problemTypeDesc, problemSubject, problemDesc, " +
      "problemStatus, problemStatusDesc, problemCreater, submitDate, " +
      "uploadStatus, downloadStatus, problemId)" +
      "values(" +
      "?,?,?,?," +
      "?,?,?,?," +
      "?,?,?,?," +
      "?,?,?,?," +
      "?,?,?)";

    var updatesql = "update " +
      "eam_sync_problemreport " +
      "set " +
      " json=?, problemNo=?, workorderId=?, workorderCode=?, " +
      " projectId=?, projectName=?, areaCode=?, areaDesc=?, " +
      " problemType=?, problemTypeDesc=?, problemSubject=?, problemDesc=?, " +
      " problemStatus=?, problemStatusDesc=?, problemCreater=?, submitDate=?, " +
      " uploadStatus=?, downloadStatus=? where problemId=?";

    var selectsql = "select problemId from eam_sync_problemreport where problemId=? ";

    var downloadList = function (begintime, endtime, callback) {
      //调用服务器取数逻辑，将列表下载到本地，并通过downloadItem方法完成明细下载。
      //理论上数据应该是要做分页处理的，但是目前没有进行分页。
      Popup.waitLoad("正在同步问题报告信息数据...");
      if (isDebug) {
        console.log("sync SyncProblemReport downloadList ");
      }
      var userProfile = Storage.getProfile();
      console.log(userProfile);
      var params = {
        id: userProfile.id,
        userType: userProfile.userType,
        department: userProfile.department,
        areaCode: userProfile.areaCode,
        projectId: Storage.getSelectedProject().projectId
      };

      eamSyncAjax.doPost(Api_getProblemReportList, params, function (res) {
        if (res.success) {
          var data = res.data;
          updateOrInsert(data, callback);
        } else {
          $injector.get("eamSync").synclog("获取问题报告信息数据失败");
          callback(false, res);
        }
        Popup.eamSyncHideLoading();
      });
    };

    var batchInsertOrUpdate = function (insertData, updateData, callback) {//批量插入或者更新数据库操作
      if (insertData.length > 0) {
        // var startInsertTime=new Date().getTime();
        eamDB.insertCollection(db, insertsql, insertData).then(function (res) {
          // console.log("insertTime:"+(new Date().getTime()-startInsertTime));
          if (updateData.length > 0) {
            // var startUpdateTime=new Date().getTime();
            eamDB.insertCollection(db, updatesql, updateData).then(function (res) {
              // console.log("updateTime:"+(new Date().getTime()-startUpdateTime));
              if ($.isFunction(callback)) {
                callback(true);
              }
            }, function (error) {
              console.error(error);
              $injector.get("eamSync").synclog("批量更新任务列表失败");
              if ($.isFunction(callback)) {
                callback(false);
              }
            });
          } else if ($.isFunction(callback)) {
            callback(true);
          }
        }, function (error) {
          console.error(error);
          $injector.get("eamSync").synclog("批量插入任务列表失败");
          if ($.isFunction(callback)) {
            callback();
          }
        });
      } else if (updateData.length > 0) {//不执行插入
        eamDB.insertCollection(db, updatesql, updateData).then(function (res) {
          if ($.isFunction(callback)) {
            callback(true);
          }
        }, function (error) {
          console.error(error);
          $injector.get("eamSync").synclog("批量更新任务列表失败");
          if ($.isFunction(callback)) {
            callback();
          }
        });
      } else if ($.isFunction(callback)) {
        callback(true);
      }
    };

    var updateOrInsert = function (data, callback) {
      if (data != undefined && data.length > 0) {
        var ids = [];
        for (var i = 0; i < data.length - 1; i++) {
          ids.push(data[i]["problemId"]);
        }
        ids.join(",");
        ids.push(data[data.length - 1]["problemId"]);
        eamDB.execute(db, "select * from eam_sync_problemreport where problemId in (" + ids + ");").then(function (res) {
          res = $injector.get("OrderService").ChangeSQLResult2Array(res);
          var updateArr = [];
          var insertData = [];
          for (var j in data) {
            var isBreak = false;
            for (var k in res) {
              if (data[j]["problemId"] == res[k]["problemId"]) {
                updateArr.push(data[j]);
                res.splice(k, 1);//删除一个数据
                isBreak = true;
                break;
              }
            }
            if (!isBreak) {
              var item = data[j];
              var insertValues = [];
              insertValues.push(JSON.stringify(item));
              insertValues.push(item["problemNo"]);
              insertValues.push(item["workorderId"]);
              insertValues.push(item["workorderCode"]);
              insertValues.push(item["projectId"]);
              insertValues.push(item["projectName"]);
              insertValues.push(item["areaCode"]);
              insertValues.push(item["areaDesc"]);
              insertValues.push(item["problemType"]);
              insertValues.push(item["problemTypeDesc"]);
              insertValues.push(item["problemSubject"]);
              insertValues.push(item["problemDesc"]);
              insertValues.push(item["problemStatus"]);
              insertValues.push(item["problemStatusDesc"]);
              insertValues.push(item["problemCreater"]);
              insertValues.push(item["submitDate"] ? (new Date(item["submitDate"]).getTime()) : "");
              insertValues.push(0);//uploadStatus，是否需要往服务器同步，1为需求，0为不需要
              insertValues.push(1);//downloadStatus，是否是从服务器下载，默认为1，日常操作不需要修改此字段。
              insertValues.join(",");
              insertValues.push(item["problemId"]);
              insertData.push(insertValues);
            }
          }
          var updateData = [];
          for (var m in updateArr) {
            var item = updateArr[m];
            var updateValues = [];
            updateValues.push(JSON.stringify(item));
            updateValues.push(item["problemNo"]);
            updateValues.push(item["workorderId"]);
            updateValues.push(item["workorderCode"]);
            updateValues.push(item["projectId"]);
            updateValues.push(item["projectName"]);
            updateValues.push(item["areaCode"]);
            updateValues.push(item["areaDesc"]);
            updateValues.push(item["problemType"]);
            updateValues.push(item["problemTypeDesc"]);
            updateValues.push(item["problemSubject"]);
            updateValues.push(item["problemDesc"]);
            updateValues.push(item["problemStatus"]);
            updateValues.push(item["problemStatusDesc"]);
            updateValues.push(item["problemCreater"]);
            updateValues.push(item["submitDate"] ? (new Date(item["submitDate"]).getTime()) : "");
            updateValues.push(0);//uploadStatus，是否需要往服务器同步，1为需求，0为不需要
            updateValues.push(1);//downloadStatus，是否是从服务器下载，默认为1，日常操作不需要修改此字段。
            updateValues.join(",");
            updateValues.push(item["problemId"]);
            updateData.push(updateValues);
          }
          batchInsertOrUpdate(insertData, updateData, callback);
        }, function (error) {
          console.error(error);
          $injector.get("eamSync").synclog("筛选任务列表失败");
          if ($.isFunction(callback)) {
            callback(false);
          }
        });
      } else {
        eamDB.execute(db, 'delete from ' + tableName)
          .then(function () {
            Popup.loadMsg("服务端没有数据", 1500);
            if ($.isFunction(callback)) {
              callback(true);
            }
          }, function (err) {
            callback(false, err);
          });

      }
    };

    return {
      downloadList: downloadList
    }
  });
