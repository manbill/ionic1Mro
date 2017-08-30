/**
 * 定维任务数据同步接口
 * 定维任务数据同步服务。
 */
angular.module('starter.SyncWorkHours', [])
  .factory("SyncWorkHours", function ($q, eamDB, WorkHoursApi, OrderService, Storage, $injector, eamSyncAjax, Popup) {

    var Api_getWorkHoursList = baseUrl + "/api/workHours/list.api";
    var Api_uploadWorkHours = baseUrl + "/api/workHours/upload.api";//上传接口
    var tableName = "eam_sync_workhours";
    var insertsql = "insert into eam_sync_workhours (" +
      "json, workerId, worker, startDate, endDate, " + "workedTotalHours, " +
      "workType,workTypeName,workOrderId, workOrderNo, " +
      "projectId, project, content, activeFlag,isVendor, uploadStatus, " +
      "downloadStatus,elseReason, id) " +
      "values (?,?,?,?,?," +
      "?,?,?,?,?,?,?," +
      "?,?,?,?,?,?,?)";
    var updateSql = "update " + tableName + " set " +
      "json=?, workerId=?, worker=?, startDate=?, endDate=?, " + "workedTotalHours=?, " +
      "workType=?,workTypeName=?,workOrderId=?, workOrderNo=?, " +
      "projectId=?, project=?, content=?, activeFlag=?,isVendor=?, uploadStatus=?, " +
      "downloadStatus=?,elseReason=? where id=? ";

    /**
     * 更新上传状态为不需要上传了
     * @type {string}
     */
    var update_success_sql = "update eam_sync_workhours set uploadStatus=0 where id=? ";
    var update_sql = "update eam_sync_workhours set uploadStatus=1 where id=? ";
    //新增记录同步后删除
    var delete_temp_success_sql = "delete from eam_sync_workhours where id=? ";

    var deleteSql = "delete from eam_sync_workhours";//删除此前同步成功过的本地数据记录
    var selectSql = "select * from eam_sync_workhours";//删除此前同步成功过的本地数据记录

    var select_uploaded_workhours = "select * from eam_sync_workhours where uploadStatus=1";//所有需要上传的工时单
    var callbackFunc;


    function uploadIteratee(item, callback) {
      if (item.workType == 213 && item.workOrderId < 0) {//如果是关联了工单，但是工单时临时创建的，先不上传，等待工单上传成功后替换工单号再能上传工时单数据
        if (isDebug) {
          console.debug("关联临时工单，不上传", item);
        }
        return callback();
        // eamDB.execute(db,update_sql,[+item["id"]+""])
        //   .then(function () {
        //     return callback();
        //   },function (dbErr) {
        //     return callback(dbErr);
        //   });
      }
      //处理数据
      var whJson = angular.fromJson(item['json']);
      // var temJson = angular.copy(whJson);
      // temJson.id = null;
      // console.log(item );
      console.log(whJson);
      whJson.startDate = item.startDate ? new Date(item.startDate).getTime() : null;
      whJson.endDate = item['endDate'] ? new Date(item.endDate).getTime() : null;
      //根据id判断如果小于0为新建上传后删除 反之则修改上传状态
      Popup.waitLoad("正在上传工时填报工单信息<span style='color: #FFFFFF'>" + item.id + "</span>");
      eamSyncAjax.doPost(Api_uploadWorkHours, whJson, function (res) {
        console.log(res);
        Popup.hideLoading();
        if (res.success) {
          eamDB.execute(db, delete_temp_success_sql, [+item["id"] + ""]).then(function () {
            callback();
          }, function (error) {
            //$injector.get("eamSync").synclog("工单" + item["id"] + "<br/>上传成功后更新数据库中临时工时工单记录出错!");
            callback(error);
          });
        } else {
          return callback(res);
        }

      });
    }

    /**
     * 上传工单信息
     * @param begintime
     * @param endtime
     * @param callback //回调函数,必须调用
     */
    var uploadList = function (begintime, endtime, callback) {
      eamDB.execute(db, select_uploaded_workhours).then(function (res) {
        if (res.rows.length > 0) {
          var items = OrderService.ChangeSQLResult2Array(res);
          console.log("工单报工将要上传的记录: ", items);
          async.each(items, uploadIteratee, function (err) {
            if (err) {
              callback(false, err);
            } else {
              callback(true);
            }
          });
        } else {
          //数据处理完成
          Popup.eamSyncHideLoading();
          if ($.isFunction(callback)) {
            callback(true);
          }
        }
      }, function (err) {
        //为了保证数据安全，不在进行数据同步，结束数据同步操作
        console.error(err);
        //$injector.get("eamSync").synclog("<div>获取待上传工单报工信息详情失败</div> err:<div style='color: red'>" + angular.toJson(err) + "</div>");
        //$injector.get("eamSync").stopSync();
        Popup.eamSyncHideLoading();
        if ($.isFunction(callback)) {
          callback(false, err);
        }
      });
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
      Popup.waitLoad("正在下载工时填报工单信息...");
      callbackFunc = callback;
      if (isDebug) {
        console.log("sync SyncWorkHours downloadList ");
      }
      eamSyncAjax.doPost(Api_getWorkHoursList, {
        beginTime: begintime,
        endTime: endtime,
        projectId: Storage.getSelectedProject().projectId
      }, function (res) {
        if (res.success) {
          var workHours = res.data;
          //console.log(workHours);
          updateOrInsert(workHours).then(function () {
            callbackFunc(true);
          }, function (error) {
            callbackFunc(false, error);
          });
        } else {
          Popup.eamSyncHideLoading();
          $injector.get("eamSync").synclog("获取工时填报工单信息数据失败");
          if ($.isFunction(callbackFunc)) {
            callbackFunc(false, res);
          }
        }
      });
    };


    var updateOrInsert = function (workHours) {
      // console.log(workHours)
      if (!angular.isArray(workHours)) {
        workHours = [workHours];
      }
      if (workHours.length == 0) {
        var defer = $q.defer();
        defer.resolve();
        return defer.promise;
      }
      var insertDefer = $q.defer();
      var updateDefer = $q.defer();
      Popup.waitLoad("正在操作工时填报工单数据库数据...");
      eamDB.execute(db, selectSql)
        .then(function (res) {
          var oldRecords = OrderService.ChangeSQLResult2Array(res).filter(function (item) {
            return item.id < 0;
          });
          eamDB.execute(db, deleteSql).then(function (res) {
            console.log("删除记录", res);
            console.log("旧数据", oldRecords);
            var updateWhs = [];
            var insertWhs = [];//插入
            oldRecords.forEach(function (item) {
              workHours.push(JSON.parse(item.json));
            });
            for (var index = 0; index < workHours.length; index++) {
              // var isUpdate = false;
              var newWhs = workHours[index];
              // console.log(newWhs);
              var values = [];
              newWhs["beginDate"] = newWhs['startDate'] = newWhs["beginDate"] || newWhs['startDate'];//后台返回的数据，只有这个有
              values.push(JSON.stringify(newWhs));
              values.push(newWhs["workerId"] ? newWhs["workerId"] + "" : null);
              values.push(newWhs["workerName"]);
              values.push(new Date(newWhs["beginDate"].replace(/-/g,'/')).getTime());
              values.push(new Date(newWhs["endDate"].replace(/-/g,'/')).getTime());//ios 需要替换
              values.push(newWhs['workTime'] + "");
              values.push(newWhs['worktypeId'] + "");
              values.push(newWhs["worktypeName"]);
              values.push(newWhs["workorderId"] ? newWhs["workorderId"] + "" : null);
              values.push(newWhs["workorderCode"]);
              values.push(newWhs["projectId"] + "");
              values.push(newWhs["projectName"] || (newWhs["project"] ? newWhs["project"] : null));
              values.push(newWhs["workContent"]);
              values.push(newWhs["activeFlag"] ? newWhs["activeFlag"] : 0);//服务器只返回有效的数据
              values.push(+newWhs["isVendor"] + "");
              values.push(newWhs["id"] < 0 ? 1 : 0);//uploadStatus，是否需要往服务器同步，1为需求，0为不需要
              values.push(1);//downloadStatus，是否是从服务器下载，默认为1，日常操作不需要修改此字段。ionic serve
              values.join(",");
              values.push(newWhs['elseReason']);
              values.push(newWhs["id"]);
              insertWhs.push(values);
              // for (var j = 0; j < oldRecords.length; j++) {
              //   var oldWh = oldRecords[j];
              //   if (oldWh['id'] == newWhs["id"]) {
              //     console.log('更新报工数据记录'+oldWh['id']);
              //     isUpdate = true;
              //     oldRecords.splice(j, 1);
              //     break;
              //   }
              // }
              // if (!isUpdate) {
              //   insertWhs.push(values);
              // }else{
              //   updateWhs.push(values);
              // }
            }
            Popup.waitLoad("正在插入工时填报工单数据库...");
            if (insertWhs.length > 0) {
              eamDB.insertCollection(db, insertsql, insertWhs).then(function () {
                Popup.eamSyncHideLoading();
                insertDefer.resolve("插入数据成功");
              }, function (error) {
                console.error(error);
                Popup.eamSyncHideLoading();
                insertDefer.reject(error);
              });
            } else {
              insertDefer.resolve("没有新数据插入");
            }
            if (updateWhs.length > 0) {
              eamDB.insertCollection(db, updateSql, updateWhs).then(function () {
                Popup.eamSyncHideLoading();
                updateDefer.resolve("更新数据成功");
              }, function (error) {
                console.error(error);
                Popup.eamSyncHideLoading();
                updateDefer.reject(error);
              });
            } else {
              updateDefer.resolve("无需更新数据");
            }
          }, function (error) {
            console.error(error);
            insertDefer.reject(error);
          }).catch(function (e) {
              alert(JSON.stringify(e));
              console.log(e);
          });

        }, function (err) {
          Popup.eamSyncHideLoading();
          console.error(err);
          insertDefer.reject(err);
          $injector.get("eamSync").synclog("删除工时填报工单数据失败");
        });
      return $q.all(insertDefer, updateDefer)
    };

    return {
      downloadList: downloadList,
      uploadList: uploadList
    }
  });
