/**
 * 定维任务数据同步接口
 * 定维任务数据同步服务。
 */
angular.module('starter.SyncUsers', [])
  .factory("SyncUsers", function ($q, eamDB, WorkHoursApi,Storage, $injector, eamSyncAjax, Popup) {

    var Api_getUserList = baseUrl + "/api/user/fetchUsers.api";

    var insertsql = "insert into eam_sync_user (json, realname, typechname, name, companyName, " +
      "roleNames, selProjects, selProjectIds, departmentName, jobTypeName, jobName, uploadStatus, downloadStatus, id) " +
      "values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

    var deleteSql = "delete from eam_sync_user where id in ";
    var currPage = 1;
    var pageSize = 1024;
    var hasMoreData = false;
    var downloadList = function (begintime, endtime, eamSyncCallback) {
      //调用服务器取数逻辑，将列表下载到本地，并通过downloadItem方法完成明细下载。
      //理论上数据应该是要做分页处理的，但是目前没有进行分页。
      Popup.waitLoad("正在同步作业人信息数据...");
      if (isDebug) {
        console.log("sync SyncUsers downloadList");
      }
      async.doWhilst(downLoadUsersIteratee, function (cb) {
        console.log(cb);
        return cb;
      }, function (err, results) {
        if (err) {
          eamSyncCallback(err);
        } else {
          eamSyncCallback(true);
        }
      })
    };

    function downLoadUsersIteratee(callback) {
      eamSyncAjax.doPost(Api_getUserList, {
        currPage: currPage,
        pageSize: pageSize,
        projectId: Storage.getSelectedProject().projectId
      }, function (res) {
        if (res.success) {
          if (res.data.length > 0) {
            hasMoreData = true;
            currPage++;
            // console.log(res.data);
            updateOrInsert(res.data, function () {
              callback(null, hasMoreData);
            });
          } else {
            hasMoreData = false;
            callback(null, hasMoreData);
          }
        } else {
          callback(res, false);
        }
      });
    }

    /**
     * 插入或更新作业人数据库操作
     * @param newData
     * @param callback
     */
    var updateOrInsert = function (newData, callback) {
      if (newData.length > 0) {
        // $injector.get("eamSync").checkFileid(newData);
        var ids = [];
        for (var i = 0; i < newData.length - 1; i++) {
          ids.push(newData[i]["id"]);
        }
        ids.join(",");
        ids.push(newData[newData.length - 1]["id"]);
        eamDB.execute(db, deleteSql + "(" + ids + ")").then(function () {
          var insertUsers = [];
          for (var j = 0; j < newData.length; j++) {
            var wUser = newData[j];
            var values = [];
            values.push(JSON.stringify(wUser));
            values.push(wUser["realname"]);
            values.push(wUser["typechname"]);
            values.push(wUser["name"]);
            values.push(wUser["companyName"]);
            values.push(wUser["roleNames"]);
            values.push(wUser["selProjects"]);
            values.push(wUser["selProjectIds"]);
            values.push(wUser["departmentName"]);
            values.push(wUser["jobTypeName"]);
            values.push(wUser["jobName"]);
            values.push(0);//uploadStatus，是否需要往服务器同步，1为需求，0为不需要
            values.push(1);//downloadStatus，是否是从服务器下载，默认为1，日常操作不需要修改此字段。
            values.join(",");
            values.push(wUser["id"]);
            insertUsers.push(values);
          }
          if (insertUsers.length > 0) {
            eamDB.insertCollection(db, insertsql, insertUsers).then(function () {
              if ($.isFunction(callback)) {
                Popup.eamSyncHideLoading();
                callback(true);
              }
            }, function (error) {
              console.error(error);
              $injector.get("eamSync").synclog("批量插入人员信息数据失败！");
              $injector.get("eamSync").stopSync();
              if ($.isFunction(callback)) {
                Popup.eamSyncHideLoading();
                callback(false);
              }
            });
          } else {
            if ($.isFunction(callback)) {
              Popup.eamSyncHideLoading();
              callback(true);
            }
          }
        }, function (error) {
          console.error(error);
          $injector.get("eamSync").synclog("删除多个人员信息数据库记录失败！");
          $injector.get("eamSync").stopSync();
          Popup.eamSyncHideLoading();
          if ($.isFunction(callback)) {
            callback(false);
          }
        });
      } else {
        if ($.isFunction(callback)) {
          Popup.eamSyncHideLoading();
          callback(true);
        }
      }
    };

    return {
      downloadList: downloadList
    }
  });
