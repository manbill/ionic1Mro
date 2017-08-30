/**
 * Created by Manbiao.Huang on 06-Dec-16.
 */
/**
 * Created by jiangwei.wang on 2016/11/16.
 */
starter.factory("ReformService", function (eamDB, Storage, OrderService, $injector, InstallService) {
  var mergeNotification = function (data, callback) {
    var insertSql = "insert into eam_local_tech " +
      "(notiseId,transNoticeNo,notiseNo,projectName,anchor,anchorName,assignTime,planStartTime,assignOwner,assignDevieNo,assignTaskID,assignStatus,statusName) " +
      "values (?,?,?,?,?,?,?,?,?,?,?,?,?)";
    var updateSql = "update eam_local_tech set " +
      "transNoticeNo=?,notiseNo=?,projectName=?,anchor=?,anchorName=?,assignTime=?,planStartTime=?,assignOwner=?,assignDevieNo=?,assignTaskID=?,assignStatus=?,statusName=? "
      + "where notiseId = ? ;";
    if (data.length === 0) {
      return callback();
    }
    eamDB.execute(db, 'delete from eam_local_tech')
      .then(
        function () {
          return new Promise(function (resolve, reject) {
            var insertSqls = [];
            data.forEach(function (notification) {
              var values = [];
              values.push(notification.notiseId);
              values.push(notification.transNoticeNo);
              values.push(notification.notiseNo);
              values.push(notification.projectName);
              values.push(notification.anchor);
              values.push(notification.anchorName);
              values.push(notification.assignTime);
              values.push(notification.planStartTime);
              values.push(notification.assignOwner);
              values.push(notification.assignDevieNo);
              values.push(notification.assignTaskID);
              values.push(notification.assignStatus);
              values.push(notification.statusName);
              if (window.cordova) {
                insertSqls.push([insertSql, values]);
              } else {
                insertSqls.push(values);
              }
            });
            if (window.cordova) {//手机上
              eamDB.sqlBatch(insertSqls)
                .then(function (res) {
                  resolve(res);
                })
                .catch(function (e) {
                  reject(e);
                })
            } else {//pc上
              eamDB.insertCollection(db, insertSql, insertSqls)
                .then(function (res) {
                  resolve(res);
                })
                .catch(function (e) {
                  reject(e);
                })
            }
          });
        }
      )
      .then(function () {
        callback();
      })
      .catch(function (e) {
        callback(e);
      })
    // function insertOrUpdateNotification(newData, callback) {//将返回的数据和数据库中的旧数据进行比较,分成插入和更新两个数组
    //   var querySql = "select * from eam_local_tech";//查询当前数据库的所有记录
    //   eamDB.execute(db, querySql).then(function (res) {
    //     var oldData = OrderService.ChangeSQLResult2Array(res);
    //     // console.log(oldData);
    //     var updateArray = [];
    //     var insertArray = [];
    //     // console.log(newData);
    //     var isBreak = false;
    //     for (var i = 0; i < newData.length; i++) {
    //       var newItem = newData[i];
    //       for (var j = 0; j < oldData.length; j++) {
    //         if (newItem["notiseId"] == oldData[j]["notiseId"]) {//需要更新
    //           updateArray.push(newItem);
    //           oldData.splice(j, 1);
    //           isBreak = true;
    //           break;
    //         }
    //       }
    //       if (!isBreak) {//如果是内层for循环结束
    //         isBreak = false;
    //         insertArray.push(newItem);
    //       }
    //     }
    //     var updateBindings = [];
    //     for (var k = 0; k < updateArray.length; k++) {
    //       var updateNotification = updateArray[k];
    //       var updateValues = [];
    //       updateValues.push(updateNotification["transNoticeNo"]);
    //       updateValues.push(updateNotification["notiseNo"]);
    //       updateValues.push(updateNotification["projectName"]);
    //       updateValues.push(updateNotification["anchor"]);
    //       updateValues.push(updateNotification["anchorName"]);
    //       updateValues.push(updateNotification["assignTime"]);
    //       updateValues.push(updateNotification["planStartTime"]);
    //       updateValues.push(updateNotification["assignOwner"]);
    //       updateValues.push(updateNotification["assignDevieNo"]);
    //       updateValues.push(updateNotification["assignTaskID"]);
    //       updateValues.push(updateNotification["assignStatus"]);
    //       updateValues.push(updateNotification["statusName"]);
    //       updateValues.join(",");
    //       updateValues.push(updateNotification["notiseId"]);
    //       updateBindings.push(updateValues);
    //     }
    //
    //
    //     var insertBindings = [];
    //     for (var h = 0; h < insertArray.length; h++) {
    //       var insertValues = [];
    //       var insertNotification = insertArray[h];
    //       insertValues.push(insertNotification["notiseId"]);
    //       insertValues.push(insertNotification["transNoticeNo"]);
    //       insertValues.push(insertNotification["notiseNo"]);
    //       insertValues.push(insertNotification["projectName"]);
    //       insertValues.push(insertNotification["anchor"]);
    //       insertValues.push(insertNotification["anchorName"]);
    //       insertValues.push(insertNotification["assignTime"]);
    //       insertValues.push(insertNotification["planStartTime"]);
    //       insertValues.push(insertNotification["assignOwner"]);
    //       insertValues.push(insertNotification["assignDevieNo"]);
    //       insertValues.push(insertNotification["assignTaskID"]);
    //       insertValues.push(insertNotification["assignStatus"]);
    //       insertValues.join(",");
    //       insertValues.push(insertNotification["statusName"]);
    //       insertBindings.push(insertValues);
    //     }
    //     // console.log(insertBindings[0]);
    //     // var startTime = new Date().getTime();
    //     if(insertArray.length>0){
    //       eamDB.insertCollection(db, insertSql, insertBindings).then(function (res) {
    //         // console.log("insert consume : " + (new Date().getTime() - startTime));
    //         // startTime = new Date().getTime();
    //         if(updateArray.length>0){
    //           eamDB.insertCollection(db, updateSql, updateBindings).then(function (res) {
    //             // console.log("update consume : " + (new Date().getTime() - startTime));
    //             if ($.isFunction(callback)) {
    //               callback();
    //             }
    //           }, function (error) {
    //             console.error(error);
    //             $injector.get("eamSync").synclog("批量更新技改通知单失败！");
    //             if($.isFunction(callback)){
    //               callback();
    //             }
    //           });
    //         }else if($.isFunction(callback)){
    //           callback();
    //         }
    //
    //       }, function (error) {
    //         console.error(error);
    //         $injector.get("eamSync").synclog("批量插入技改通知单失败!");
    //         if($.isFunction(callback)){
    //           callback();
    //         }
    //       });
    //     }else if(updateArray.length>0){
    //       eamDB.insertCollection(db, updateSql, updateBindings).then(function (res) {
    //         // console.log("update consume : " + (new Date().getTime() - startTime));
    //         if ($.isFunction(callback)) {
    //           callback();
    //         }
    //       }, function (error) {
    //         console.error(error);
    //         $injector.get("eamSync").synclog("批量更新技改通知单失败！");
    //         if($.isFunction(callback)){
    //           callback();
    //         }
    //       });
    //     }else if($.isFunction(callback)){
    //       callback();
    //     }
    //   }, function (error) {
    //     console.error(error);
    //     $injector.get("eamSync").synclog("查询技改通知单失败！");
    //     if($.isFunction(callback)){
    //       callback();
    //     }
    //   });
    // }
    // insertOrUpdateNotification(data,callback);
  };
  var queryNotificationData = function (pageNum, search, callback) {//从数据库获取数据,每次5条数据
    var skipR = (pageNum - 1) * 5;
    var params = [];
    var where = "";
    if (StringUtils.isNotEmpty(search.planBeginDate)) {
      where += " and planStartTime >= ? ";
      params.push(search.planBeginDate.getTime() + "");
    }
    if (StringUtils.isNotEmpty(search.planEndDate)) {
      where += " and planStartTime <= ? ";
      params.push(search.planEndDate.getTime() + "");
    }
    if (StringUtils.isNotEmpty(search.projectName)) {
      where += " and projectName like ?";
      params.push("%" + search.projectName + "%");
    }
    if (StringUtils.isNotEmpty(search.workorderStatus)) {
      where += " and assignStatus = ?";
      params.push(parseInt(search.workorderStatus) + "");
    }
    /*if (StringUtils.isNotEmpty(search.positionName)) {
     where += " and assignDevieNo like ?";
     params.push("%" + search.positionName + "%");
     }*/
    if (StringUtils.isNotEmpty(search.workOrderCode)) {
      where += " and notiseNo like ?";
      params.push("%" + search.workOrderCode + "%");
    }
    if (StringUtils.isNotEmpty(search.transNoticeNo)) {
      where += " and transNoticeNo like ?";
      params.push("%" + search.transNoticeNo + "%");
    }
    params.push(skipR);
    var sql = "select * from eam_local_tech where 1=1 " + where + " order by assignTime desc , notiseNo  limit ?, 5";
    eamDB.execute(db, sql, params).then(function (res) {
      var list = OrderService.ChangeSQLResult2Array(res);
      callback(list);
    }, function (err) {
      console.error(err);
      $injector.get("eamSync").synclog("筛选通知单操作失败！");
      if ($.isFunction(callback)) {
        callback();
      }
    });
  };

  function getDicOfArea(callback) {
    var dicOfArea = [];
    var areaObj = {
      areaId: "",
      areaName: ""
    };
    var query = "";
    query += "select detailId,detailName from eam_sync_dictionary_detail where dictionaryId = 1";
    eamDB.execute(db, query, []).then(function (res) {
      if (res.rows.length > 0) {
        // dicOfArea = [res.rows.length];
        for (var i = 0; i < res.rows.length; i++) {
          areaObj.areaId = res.rows.item(i).detailId;
          areaObj.areaName = res.rows.item(i).detailName;
          dicOfArea.push(areaObj);
        }
      }
      callback(dicOfArea);
      // console.log("dicOfArea" + JSON.stringify(dicOfArea));
    });
  }


  //到字典里找到 通知单单状态
  function getDicOfNotificationStatus(callback) {
    InstallService.getDicOfWorkOrderStatus(callback);
  }

  //到字典里找到 安装任务工单状态
  function getDicOfReformTaskStatus(callback) {
    var dicOfWorkOrderStatus = [];
    var query = "";
    query += "select * from eam_sync_dictionary_detail where dictionaryId = 30";
    eamDB.execute(db, query, []).then(function (res) {
      if (res.rows.length > 0) {
        for (var i = 0; i < res.rows.length; i++) {
          dicOfWorkOrderStatus.push({
            statusId: res.rows.item(i)["detailId"],
            statusName: res.rows.item(i)["detailName"]
          });
        }
      }
      callback(dicOfWorkOrderStatus);
    });
  }


  function getAllDataOfReformList(pageNum, search, callback) {
    var pageSize = 10;
    var skipR = (pageNum - 1) *pageSize ;
    var params = [];
    var where = "";
    if (StringUtils.isNotEmpty(search.planBeginDate)) {
      where += " and planBegindate >= ? ";
      params.push(search.planBeginDate.getTime() + "");
    }
    if (StringUtils.isNotEmpty(search.planEndDate)) {
      where += " and planBegindate <= ? ";
      params.push(search.planEndDate.getTime() + "");
    }
    if (StringUtils.isNotEmpty(search.projectName)) {
      where += " and projectName like ?";
      params.push("%" + search.projectName + "%");
    }
    if (StringUtils.isNotEmpty(search.workorderStatus)) {
      where += " and workorderStatus = ?";
      params.push(parseInt(search.workorderStatus) + "");
    }
    if (StringUtils.isNotEmpty(search.positionName)) {
      where += " and positionName like ?";
      params.push("%" + search.positionName + "%");
    }
    /*if (StringUtils.isNotEmpty(search.assignPerson)) {
     where += " and assignOwner like ?";
     params.push("%" + search.assignPerson + "%");
     }*/
    if (StringUtils.isNotEmpty(search.workorderCode)) {//任务编号
      where += " and workorderCode like ?";
      params.push("%" + search.workorderCode + "%");
    }
    if (StringUtils.isNotEmpty(search.transNoticeNo)) {//下发通知单编号
      where += " and transNoticeNo like ?";
      params.push("%" + search.transNoticeNo + "%");
    }
    params.push(skipR);
    // var sql = "select * from eam_sync_schdlemaintain where workorderType = 68 " + where + " ORDER BY workorderStatus ASC, planBegindate DESC limit ?,5 ";
    var sql = "select * from eam_sync_schdlemaintain where workorderType = 68 " + where + " ORDER BY workorderCode DESC limit ?,"+pageSize;
    eamDB.execute(db, sql, params).then(function (res) {
      var list = OrderService.ChangeSQLResult2Array(res);
      callback(list);
    }, function (err) {
      console.log(err);
      $injector.get("eamSync").synclog("获取技改任务列表失败！");
      if ($.isFunction(callback)) {
        callback();
      }
    });
  }

  function uploadIfOnline(funcOk, funcNot) {
    InstallService.uploadIfOnline(funcOk, funcNot);
  }

  return {
    getAllDataOfReformList: getAllDataOfReformList,
    getDicOfArea: getDicOfArea,
    mergeNotification: mergeNotification,
    getDicOfNotificationStatus: getDicOfNotificationStatus,
    getDicOfReformTaskStatus: getDicOfReformTaskStatus,
    queryNotificationData: queryNotificationData,
    uploadIfOnline: uploadIfOnline
  }
});
