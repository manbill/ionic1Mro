angular.module('maintain.dto', ['starter.eamDB'])
  .factory("maintainDTO", function (eamDB, OrderService) {
    /**
     * @brief 根据条件筛选通知单
     * @param pageNum
     * @param callback
     */
    function filterNotificationTable(pageNum, params, callback) {
      var filterData = [];
      var query = "";
      var tempParams = [];
      var where = " where 1=1 ";
      // if (StringUtils.isNotEmpty(params.projectName)) {
      //   where += " and projectName like ?";
      //   tempParams.push("%" + params.projectName + "%");
      // }
      if (StringUtils.isNotEmpty(params.anchor)) {
        where += " and anchor = ?";
        tempParams.push(params.anchor + "");
      }
      if (StringUtils.isNotEmpty(params.assignStatus)) {
        where += " and assignStatus = ?";
        tempParams.push(params.assignStatus + "");
      }
      if (StringUtils.isNotEmpty(params.planStartTime)) {
        where += " and planStartTime >= ?";
        tempParams.push(params.planStartTime.getTime() + "");
      }
      if (StringUtils.isNotEmpty(params.planEndTime)) {
        where += " and planStartTime <= ?";
        tempParams.push(params.planEndTime.getTime() + "");
      }
      query += "SELECT * from eam_local_notification " + where;
      // query += "SELECT a.anchor, a.anchorName, a.assignDevieNo, a.assignOwner, a.assignStatus, a.assignTaskID, " +
      //     " a.assignTime, a.notiseId, a.notiseNo, a.planStartTime,  a.projectName,  a.statusName, b.realname AS realName, c.position_code AS positionName " +
      //     " from eam_local_notification AS a " +
      //     " LEFT OUTER JOIN  eam_sync_user AS b ON a.assignOwner = b.id  LEFT OUTER JOIN  eam_machine_equipment AS c ON a.assignDevieNo =  c.position_id " + where;
      query += " order by assignTime desc , notiseNo ";
      //分派时间降序 通知单号升序 TODO
      query += " limit " + (pageNum * itemsPerPage) + "," + itemsPerPage;
      eamDB.execute(db, query, tempParams).then(function (res) {
        for (var i = 0; i < res.rows.length; i++) {
          // console.log(res.rows.item(i));
          filterData.push(res.rows.item(i));
        }
        callback(filterData);
      });
    }


      var insertSql = "insert into eam_local_notification " +
          "(notiseId," +
          "notiseNo," +
          "projectName," +
          "anchor," +
          "anchorName," +
          "assignTime," +
          "planStartTime," +
          "assignOwnerId," +
          "assignOwner," +
          "assignDeviceNoId," +
          "assignDevieNo," +
          "assignTaskID," +
          "assignStatus," +
          "statusName) " +
          "values (?,?,?,?,?,?,?,?,?,?,?,?,?,?);";
      function mergerNotification(data, callback) {
      var updateSql = "update eam_local_notification set " +
        "notiseNo=?," +
          "projectName=?," +
          "anchor=?," +
          "anchorName=?," +
          "assignTime=?," +
          "planStartTime=?," +
          "assignOwnerId=?," +
          "assignOwner=?," +
          "assignDeviceNoId=?," +
          "assignDevieNo=?," +
          "assignTaskID=?," +
          "assignStatus=?," +
          "statusName=? " +
          "where notiseId = ? ;";

      function insertOrUpdate(data, callback) {
        if (data) {
          if (data.length == 0 && $.isFunction(callback)) {
            callback();
            return;
          }
        } else if ($.isFunction(callback)) {
          callback();
          return;
        }
        var ids = [];
        for (var i = 0; i < data.length - 1; i++) {
          ids.push(data[i]["notiseId"]);
        }
        ids.join(",");
        ids.push(data[data.length - 1]["notiseId"]);
        eamDB.execute(db, "delete from eam_local_notification where notiseId in (" + ids + ");").then(function () {
          var insertValues = [];
          for (var index = 0; index < data.length; index++) {
            var notification = data[index];
            var value = [];
            value.push(notification["notiseId"]);
            value.push(notification["notiseNo"]);
            value.push(notification["projectName"]);
            value.push(notification["anchor"]);
            value.push(notification["anchorName"]);
            value.push(notification["assignTime"]);
            value.push(notification["planStartTime"]);
              value.push(notification["assignOwnerId"]);
              value.push(notification["assignOwner"]);
              value.push(notification["assignDeviceNoId"]);
              value.push(notification["assignDevieNo"]);
            value.push(notification["assignTaskID"]);
            value.push(notification["assignStatus"]);
            value.push(notification["statusName"]);
            insertValues.push(value);
          }
          if (insertValues.length > 0) {
            eamDB.insertCollection(db, insertSql, insertValues).then(function () {
              if ($.isFunction(callback)) {
                callback();
              }
            }, function (error) {
              console.error(error);
            });
          }
        }, function (error) {
          console.error(error);
        });
      }

      insertOrUpdate(data, callback);
    }

    function getNotification(callback) {
      // var query = "SELECT notiseId, notiseNo,projectName, anchor, anchorName assignTime," +
      //     " planStartTime,assignOwner, assignDevieNo,assignTaskID,assignStatus ,statusName" +
      //     "FROM eam_local_notification";
      var queryAll = "SELECT * FROM eam_local_notification;";
      var array = new Array();
      eamDB.execute(db, queryAll, []).then(function (res) {
        for (var i = 0; i < res.rows.length; i++) {
          array.push(res.rows.item(i));
        }
        callback(array);
      });
    }


    return {
      getNotification: getNotification,
      mergerNotification: mergerNotification,
      filterNotificationTable: filterNotificationTable
    };
  })


  //定维任务从数据库 读取数据/写入数据
  .factory("MaintainTaskRW", function ($q, $injector, eamDB, OrderService) {

    //定维任务列表筛选查询
    function queryByCondition(pageNum, params, callback) {
      var queryByConditionData = [];
      var where = "";
      var tempParams = [];

      if (StringUtils.isNotEmpty(params.projectName)) {//项目名称
        where += " and projectName like ?";
        tempParams.push("%" + params.projectName + "%");
      }
      if (StringUtils.isNotEmpty(params.planNoticeId)) {//任务编号
        where += " and workorderCode like ?";
        tempParams.push("%" + params.planNoticeId + "%");
      }
      if (StringUtils.isNotEmpty(params.positionName)) {//机位号
        where += " and positionName like ?";
        tempParams.push("%" + params.positionName + "%");
      }
      if (StringUtils.isNotEmpty(params.workTypeId)) {//作业节点
        where += " and workTypeId = ?";
        tempParams.push(params.workTypeId + "");
      }
      if (StringUtils.isNotEmpty(params.workorderStatus)) {//任务状态号（筛选时显示的是任务状态名称）
        where += " and workorderStatus = ?";
        tempParams.push(params.workorderStatus + "");
      }
      if (StringUtils.isNotEmpty(params.planBeginDate)) {
        where += " and planBegindate >= ?";
        tempParams.push(Date.parse(params.planBeginDate) + "");
      }
      if (StringUtils.isNotEmpty(params.planEndDate)) {
        where += " and planBegindate <= ?";
        tempParams.push(Date.parse(params.planEndDate) + "");
      }

      var queryByConditionStr = "";
      queryByConditionStr += "select * from eam_sync_schdlemaintain where workorderType = 67 ";
      queryByConditionStr += where;
      // queryByConditionStr += " order by workorderStatus, planBegindate desc";
      queryByConditionStr += " order  workorderCode desc";
      queryByConditionStr += " limit " + (pageNum * itemsPerPage) + "," + itemsPerPage;

      eamDB.execute(db, queryByConditionStr, tempParams).then(function (res) {
        // console.log("queryByConditionStr: " + queryByConditionStr);
        // console.log("queryByConditionData obj: " + res);
        for (var i = 0; i < res.rows.length; i++) {
          // console.log("filter data " + "[" + i + "]" + JSON.stringify(res.rows.item(i)));
          queryByConditionData.push(res.rows.item(i));
        }
        callback(queryByConditionData);
      });

    }

    //按照工单号 查询工单信息
    var queryByWorkOrderId = function (orderID, callback) {
      var queryByWorkOrderIdData = {};
      eamDB.execute(db, "select * from eam_sync_schdlemaintain where workorderId=?", [orderID])
        .then(function (res) {
          if (res.rows.length > 0) {
            queryByWorkOrderIdData = res.rows.item(0);
            callback(queryByWorkOrderIdData);
          } else {
            console.log("查询工单：" + orderID + " 信息失败");
          }
        });

    };
    //更新定维任务详情
    var updateModifiedJson = function (workorderId, workorderStatus, modifiedJson, callback) {
      var update_json_sql = "update eam_sync_schdlemaintain set workorderStatus=? ,json=?,uploadStatus=1 where workorderId=? ";

      eamDB.execute(db, update_json_sql, [workorderStatus, modifiedJson, workorderId]).then(function (res) {
        callback(res);
      }, function (error) {
        $injector.get("eamSync").synclog("更新定维任务[" + workorderId + "]Json失败!" + JSON.stringify(error));
      });
    };

    var updateScheduleTaskStatus = function (taskId, status, statusName, callback) {
      var updateTaskStatus = "update eam_sync_schdlemaintain set workorderStatus=?, workorderStatusName=?,lastUpdateDatetimeApp=? where workorderId=?";
      eamDB.execute(db, updateTaskStatus, [status, statusName, new Date().getTime() + "", taskId]).then(function (res) {
        if ($.isFunction(callback)) {
          callback(res);
        }
      }, function (err) {
        // console.log("updateScheduleTaskStatus: ");
        $injector.get("eamSync").synclog("更新定维任务[" + taskId + "]Json失败!");
        console.error(err);
      });
    };
    var queryFileByFileId = function (fileId, callback) {
      var querySql = "select * from eam_sync_file where fileId=?;";
      eamDB.execute(db, querySql, [parseInt(fileId)]).then(function (res) {
        if (res.rows.length > 0) {
          callback(res.rows.item(0));
        }
      }, function (error) {
        console.error(error)
      });
    };
    //按照 关键字查询物料
    var queryMaterialsByKeyWords = function (search, callback, pageNum) {
      var where = "";
      var params = [];
      var skipRecords = (pageNum - 1) * 10;//每次十条记录
      if (StringUtils.isNotEmpty(search.queryMaterialKeyWord)) {
        where += " and materialName like ? or materialSno like ? ";
        params.push("%" + search.queryMaterialKeyWord + "%");
        params.push("%" + search.queryMaterialKeyWord + "%");
      }
      var sql = "select * from eam_sync_material where 1=1" + where + " limit ?,10;";
      params.push(skipRecords);
      eamDB.execute(db, sql, params).then(function (res) {
        callback(OrderService.ChangeSQLResult2Array(res));
      }, function (err) {
        console.log(err);
      })
    };

    //更新定维通知单item
    var updateAssignNotificationItem = function (notiseId, modifiedJson, callback) {
      var update_maintain_json_sql = "update eam_local_notification set assignOwnerId=?, assignOwner=?,assignDeviceNoId=?, assignDevieNo=?,assignStatus=?,statusName=?,assignTime=? where notiseId=? ";
      var update_install_json_sql = "update eam_local_install set assignOwnerId=?, assignOwner=?,assignDeviceNoId=?, assignDevieNo=?, assignStatus=?,statusName=?,assignTime=? where notiseId=? ";
      var update_tech_json_sql = "update eam_local_tech set assignOwnerId=?, assignOwner=?,assignDeviceNoId=?, assignDevieNo=?, assignStatus=?,statusName=?,assignTime=? where notiseId=? ";
      var sqls = [];
      sqls.push(update_maintain_json_sql);
      sqls.push(update_install_json_sql);
      sqls.push(update_tech_json_sql);
      for (var i = 0; i < sqls.length; i++) {
        (function (i) {
          var update_json_sql = sqls[i];
          eamDB.execute(db, update_json_sql, [modifiedJson.assignOwnerId, modifiedJson.assignOwner, modifiedJson.assignDeviceNoId, modifiedJson.assignDevieNo, modifiedJson.assignStatus, modifiedJson.statusName, modifiedJson.assignTime, parseInt(notiseId)]).then(function (res) {
            if (res.rowsAffected > 0) {
              callback(res);
            }
          }, function (error) {
            $injector.get("eamSync").synclog("更新通知单列表失败！" + JSON.stringify(error));
            if ($.isFunction(callback)) {
              callback();
            }
          });
        })(i);
      }

    };

    //到字典里找到 作业节点
    function getDicOfWorkAnchor(callback) {
      var dicOfWorkAnchor = [];
      var query = "";
      query += "select * from eam_sync_dictionary_detail where dictionaryId = 24";
      eamDB.execute(db, query, []).then(function (res) {
        if (res.rows.length > 0) {
          for (var i = 0; i < res.rows.length; i++) {
            dicOfWorkAnchor.push({
              workAnchorId: res.rows.item(i).detailId,
              workAnchorName: res.rows.item(i).detailName
            });
          }
        }
        callback(dicOfWorkAnchor);
      });
    }

    //到字典里找到 通知单状态
    function getDicOfAssignStatus(callback) {
      var dicOfWorkOrderStatus = [];
      var query = "";
      query += "select * from eam_sync_dictionary_detail where dictionaryId = 28";
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

    //到字典里找到 安装任务工单状态
    function getDicOfTaskStatus(callback) {
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

    //到字典里找到状态的文本名称
    function queryStatusTextFromDict(status, callback) {
      OrderService.getDicDetailById(status, function (res) {
        if (res && $.isFunction(callback)) {
          callback(res.rows.item(0)["detailName"]);
        }
      })
    }

    function getInstructors(manualIds, callback) {
      eamDB.execute(db, "select * from eam_manual where manualId in (" + manualIds + ")")
        .then(function (res) {
          if ($.isFunction(callback)) {
            var rs = [];
            var arr = OrderService.ChangeSQLResult2Array(res);
            if (arr.length == 0) {
              callback(rs);
              return;
            }
            arr.forEach(function (item) {
              rs.push(angular.fromJson(item['manualJson']));
            });
            callback(rs);
          }
        }, function (error) {
          console.error("指导书获取失败", error);
          if ($.isFunction(callback)) {
            callback([]);
          }
        });
    }

    function getInstructorById(manualId, callback) {
      eamDB.execute(db, 'select * from eam_manual where manualId=?', [+manualId]).then(
        function (res) {
          res = OrderService.ChangeSQLResult2Array(res);
          if (res.length > 0) {
            var json = res[0]['manualJson'];
            return callback(JSON.parse(json));
          }
          callback();
        }, function (error) {
          console.error("id查询指导书失败",error);
        }
      )
    }

    //从 eam_sync_user 表中根据用户ID 查找负责人姓名
    function getResponsiblePerson(userId, callback) {
      var query = "select realname from eam_sync_user where id = ?";
      eamDB.execute(db,query,[userId]).then(
          function (res) {
            if(res){
                if ($.isFunction(callback)){
                  callback(res.rows[0].realname);
                }
            }else {
                callback("无姓之人");
            }
      },function (err) {
              console.log(err);
        });
  }

    return {
      queryByCondition: queryByCondition,
      queryByWorkOrderId: queryByWorkOrderId,
      queryFileByFileId: queryFileByFileId,
      queryStatusTextFromDict: queryStatusTextFromDict,
      updateModifiedJson: updateModifiedJson,
      updateScheduleTaskStatus: updateScheduleTaskStatus,
      queryMaterialsByKeyWords: queryMaterialsByKeyWords,
      updateAssignNotificationItem: updateAssignNotificationItem,
      getDicOfWorkAnchor: getDicOfWorkAnchor,
      getDicOfAssignStatus: getDicOfAssignStatus,
      getDicOfTaskStatus: getDicOfTaskStatus,
      getInstructors: getInstructors,
      getInstructorById: getInstructorById,
      getResponsiblePerson: getResponsiblePerson
    }

  });


