starter
  .factory('WorkHoursService',
    function (DataCache, $q, WorkHoursApi, Popup, $rootScope, OrderService, $timeout, $ionicHistory, eamDB, eamSync, eamFaultWorkOrderFactory, eamMTInstallWorkOrderFactory, SyncWorkHours) {
      var getWorkHoursList = "select * from eam_sync_workhours where activeFlag=0 ";
      var tableName = "eam_sync_workhours";
      var getWorkerList = "select * from eam_sync_user where 1=1 ";

      var getWorkOrderList = "select * from eam_sync_workorder where 1=1 ";
      var getDicId2NameByDictionaryIdSql = "select * from eam_sync_dictionary_detail where dictionaryId = ?";
      var insertsql = "insert into eam_sync_workhours (json, workerId, worker, startDate, endDate,workedTotalHours, workType,workTypeName, " +
        "workOrderId, workOrderNo, projectId,  project, content, activeFlag,isVendor,uploadStatus, downloadStatus,elseReason, id) " +
        "values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

      var updatesql = "update eam_sync_workhours set " +
        "json=?, workerId=?, worker=?, startDate=?, endDate=?,workedTotalHours=?, workType=?,workTypeName=?, " +
        "workOrderId=?, workOrderNo=?, projectId=?,  project=?, content=?, activeFlag=?,isVendor=?, " +
        "uploadStatus=?, downloadStatus=? ,elseReason=? where id=? ";

      var selectsql = "select id from eam_sync_workhours where id=? ";
      //根据workorderId删除工单(未上传工单)
      var deleteWorkHoursTemp = "delete from eam_sync_workhours where id=? ";
      var selectDicDetailByDetailId = "select * from eam_sync_dictionary_detail where detailId=? ";
      var updateWorkHoursStatus = "update eam_sync_workhours set json=?, activeFlag=1, uploadStatus=1 where id=?";

      ////构建数据结构
      function createTemId(wh) {
        //如果工单id为空则为新增
        if (!wh.id) {
          //生成id为负数证明为新工单
          var id = new Date().getTime().toString();
          wh.id = -id.substr(id.length - 8, 8);
        }
        return wh.id;
      }

      function workHoursDbOperation(workHours) {
        if (workHours && !angular.isArray(workHours)) {
          workHours = [workHours];
        }
        var updateBindings = [];
        var insertBindings = [];
        var oldRecords = [];
        var updateDefer = $q.defer();
        var insertDefer = $q.defer();
        eamDB.execute(db, 'select * from ' + tableName)
          .then(function (res) {
            oldRecords = ChangeSQLResult2Array(res);
            workHours.forEach(function (workHour) {
              var values = [];
              var isUpdate = false;
              workHour["startDate"] = angular.isDate(workHour["startDate"]) ? workHour["startDate"].getTime().toString() : workHour["startDate"];
              workHour["endDate"] = angular.isDate(workHour["endDate"]) ? workHour["endDate"].getTime().toString() : workHour["endDate"];
              values.push(JSON.stringify(workHour));
              values.push(workHour["workerId"] ? workHour["workerId"] + "" : null);
              values.push(workHour["workerName"] || null);
              values.push(workHour["startDate"] || null);
              values.push(workHour["endDate"] || null);
              values.push(workHour["workTime"] || null);
              values.push(workHour["worktypeId"] ? +workHour["worktypeId"] + "" : null);//将数字转成文本
              values.push(workHour["worktypeName"] || null);
              values.push(workHour["workorderId"] ? workHour["workorderId"] + "" : null);
              values.push(workHour["workorderCode"] || null);
              values.push(workHour["projectId"] + "");
              values.push(workHour["project"] || null);//项目名称
              values.push(workHour["workContent"] || null);
              values.push(StringUtils.isNotEmpty(workHour["activeFlag"]) ? workHour["activeFlag"] : 0);
              values.push(+workHour['isVendor'] + "");//是否是现场值守人员,1是，0否
              values.push(1);//uploadStatus，是否需要往服务器同步，1为需求，0为不需要
              values.push(1);//downloadStatus，是否是从服务器下载，默认为1，日常操作不需要修改此字段。
              values.push(workHour['elseReason'] || null);
              values.push(workHour["id"]);
              for (var i = 0; i < oldRecords.length; i++) {
                var oldRecord = oldRecords[i];
                if (oldRecord.id == workHour["id"]) {//如果是旧数据，更新
                  oldRecords.splice(i, 1);
                  isUpdate = true;
                  break;
                }
              }
              if (!isUpdate) {
                insertBindings.push(values);
              } else {
                updateBindings.push(values);
              }
            });
            if (updateBindings.length > 0) {
              eamDB.insertCollection(db, updatesql, updateBindings).then(function () {
                updateDefer.resolve()
              }, function (err) {
                updateDefer.reject(err)
              })
            } else {
              updateDefer.resolve();
            }
            if (insertBindings.length > 0) {
              eamDB.insertCollection(db, insertsql, insertBindings)
                .then(function () {
                  insertDefer.resolve();
                }, function (err) {
                  insertDefer.reject(err);
                });
            } else {
              insertDefer.resolve();
            }
          }, function (err) {
            insertDefer.reject(err);
          });
        return $q.when(insertDefer, updateDefer);
      }

      /*function updateOrInsert(workHours, callback) {
       var workHour = workHours.shift();
       if (workHour != undefined) {
       eamDB.execute(db, selectsql, [workHour["id"]]).then(function (res) {
       console.debug(res);

       if (res.rows.length > 0) {
       if (isDebug) {
       console.log('更新工时填报数据:' + workHour["id"])
       }
       //说明有数据，执行update操作
       eamDB.execute(db, updatesql, values).then(function () {
       updateOrInsert(workHours, callback);
       }, function (err) {
       console.error(err);
       });
       } else {
       //说明没有数据，执行insert操作
       eamDB.execute(db, insertsql, values).then(function () {
       updateOrInsert(workHours, callback);
       }, function (err) {
       console.error(err);
       });
       }
       }, function (err) {
       console.error(err);
       });
       } else {
       if ($.isFunction(callback)) {
       callback();
       }
       }
       }*/

      //根据paratype获取字典项
      function getDicListByType(type, callback) {
        var getDicListByTypeSQL = "select * from eam_sync_dictionary_detail where paraType=? ";
        eamDB.execute(db, getDicListByTypeSQL, [type]).then(function (res) {
          callback(ChangeSQLResult2Array(res));
        }, function (err) {
          callback();
        });
      }

//sql结果转array
      function ChangeSQLResult2Array(resp) {
        var array = new Array();
        for (var i = 0, len = resp.rows.length; i < len; i++) {
          array.push(resp.rows.item(i));
        }
        return array;
      }

      //列表查询方法
      function loadMore(params, callback) {
        getFaultWorkHoursList(function (resp) {
          callback(resp);
        }, params);
      }

      function getFaultWorkHoursList(params, callback) {
        if (isDebug) {
          console.debug(params)
        }
        var skipR = (params.pageNumber - 1) * 5;
        var SqlFiter = "";//sql条件
        var bindings = [];
        if (StringUtils.isNotEmpty(params.worker)) {
          SqlFiter += " and worker like ? ";
          bindings.push("%" + params.worker + "%");
        }
        if (StringUtils.isNotEmpty(params.startDate)) {
          SqlFiter += " and startDate >= ? ";
          bindings.push(params.startDate.getTime() + "");
        }
        if (StringUtils.isNotEmpty(params.endDate)) {
          SqlFiter += " and endDate <= ? ";
          bindings.push(params.endDate.getTime() + "");
        }
        if (StringUtils.isNotEmpty(params.workType)) {
          SqlFiter += " and workType = ? ";
          bindings.push(params.workType + "");
        }
        if (!params.workOrderId && StringUtils.isNotEmpty(params.workOrderNo)) {//如果不是工单跳转来的人员报工查找
          SqlFiter += " and workOrderNo like ? ";
          bindings.push("%" + params.workOrderNo + "%");
        }
        if (StringUtils.isNotEmpty(params.workOrderId)) {
          SqlFiter += " and workOrderId = ? ";
          bindings.push(params.workOrderId + "");
        }
        if (params.project && StringUtils.isNotEmpty(params.project.projectId)) {
          SqlFiter += " and projectId =? ";
          bindings.push(+params.project.projectId + "");
        }
        var sql = getWorkHoursList + SqlFiter + " order by endDate desc limit ?,5";
        bindings.push(skipR);
        if (isDebug) console.debug(sql, bindings);
        eamDB.execute(db, sql, bindings).then(function (res) {
          callback(res);
        }, function (err) {
          console.error(err);
        });
      }

      function loadWorkerInfo(params, callback) {
        var skipRecord = (params.pageNumber - 1) * 5;
        var SqlFiter = "";//sql条件
        var bindings = [];
        if (StringUtils.isNotEmpty(params.realname)) {
          SqlFiter += " and realname like ?";
          bindings.push("%" + params.realname + "%");
        }
        SqlFiter += "and typechname like ?";
        bindings.push("%现场%");
        SqlFiter += " limit ?,5";
        bindings.push(skipRecord);
        console.log(getWorkerList + SqlFiter, bindings);
        eamDB.execute(db, getWorkerList + SqlFiter, bindings)
          .then(function (res) {
            callback(res);
          }, function (err) {
            console.error(err);
          });
      }

      function loadWorkOrderInfo(params, pageNumber, callback) {
        var SqlFiter = "";//sql条件
        var sqlFaultOrdersSQLS = "";
        var sqlOrdersSQLS = "";
        var bindingsOrders = [];
        var bindingsFaultOrders = [];
        var skipR = (pageNumber - 1) * 5;
        if (StringUtils.isNotEmpty(params.workorderCode)) {
          sqlOrdersSQLS += " and workorderCode like ? ";
          sqlFaultOrdersSQLS += " and workorderCode like ? ";
          bindingsOrders.push("%" + params.workorderCode + "%");
          bindingsFaultOrders.push("%" + params.workorderCode + "%");
        }
        if (StringUtils.isNotEmpty(params.workorderTitle)) {
          sqlOrdersSQLS += " and workorderTitle like ? ";
          bindingsOrders.push("%" + params.workorderTitle + "%");
          sqlFaultOrdersSQLS += " and workorderTitle like ? ";
          bindingsFaultOrders.push("%" + params.workorderTitle + "%");
        }
        if (StringUtils.isNotEmpty(params.projectId)) {
          sqlFaultOrdersSQLS += " and projectId=? ";
          bindingsFaultOrders.push(params.projectId + "");
          sqlOrdersSQLS += " and projectId=? ";
          bindingsOrders.push(params.projectId + "");
        }
        var sqlFiter = 'select * from (' + ' select ' +
          ' projectId,projectName,workorderStatusName, workorderCode,workorderId,json,workorderTitle from eam_table_faultWorkOrder  where workorderStatus=41 and workorderId >0'
          + sqlFaultOrdersSQLS +
          " union all select" +
          " projectId,projectName,workorderStatusName, workorderCode,workorderId,json,workorderTitle from eam_table_maintainTechInstallWorkOrder  where workorderStatus=141  " +
          sqlOrdersSQLS + " ) limit ?,5";
        var bindings = bindingsFaultOrders.concat(bindingsOrders);
        bindings.push(skipR);
        console.log(sqlFiter, bindings);
        eamDB.execute(db, sqlFiter, bindings).then(function (res) {
          //console.log(res.rows);
          callback(res);
        }, function (err) {
          console.error(err);
        });
      }

      //删除工单数据
      function deleteWorkHoursRecord(work, callback) {
        //临时数据直接删除
        if (work.id < 0) {
          eamDB.execute(db, deleteWorkHoursTemp, [work.id]).then(function (res) {
            callback(res);
          }, function (err) {
            console.error(err);
          });
        } else {
          //同步数据另行处理
          var json = angular.fromJson(work.json);
          json.activeFlag = 1;
          eamDB.execute(db, updateWorkHoursStatus, [JSON.stringify(json), work.id+""]).then(function (res) {
            callback(res)
          }, function (err) {
            console.error(err);
          });
        }
      }

      //改变工单状态
      function changeWorkOrderStatus(work, callback) {
        var json = JSON.parse(work.json);
        json.workorderStatus = work.workorderStatus;
        getDicDetailById(json.workorderStatus, function (res) {
          json.workorderStatusName = res.rows[0].detailName;
          eamDB.execute(db, updateWorkOrderStatus, [JSON.stringify(json), json.workorderStatus, res.rows[0].detailName, work.workorderId]).then(function (res) {
            callback(res)
          }, function (err) {
            console.error(err);
          });
        })
      }

      //根据detailid获取字典项
      function getDicDetailById(DetailId, callback) {
        eamDB.execute(db, selectDicDetailByDetailId, [DetailId]).then(function (res) {
          callback(res);
        }, function (err) {
          console.error(err);
        });
      }

      //根据detailid获取字典项
      function getDicId2NameByDictionaryId(dictionaryId, callback) {
        eamDB.execute(db, getDicId2NameByDictionaryIdSql, [dictionaryId]).then(function (res) {
          var ids2Names = [];
          if (res.rows.length > 0) {
            for (var i = 0; i < res.rows.length; i++) {
              ids2Names.push({
                detailId: res.rows.item(i)["detailId"],
                detailName: res.rows.item(i)["detailName"]
              });
            }
          }
          callback(ids2Names);
        }, function (err) {
          console.error(err);
        });
      }

      function getWorkOrderByWorkorderId(workorderId) {
        var defer = $q.defer();
        eamDB.execute(db, "select * from " + eamFaultWorkOrderFactory.getTableName() + " where workorderId=?", [workorderId + ""])
          .then(function (res) {
            res = OrderService.ChangeSQLResult2Array(res);
            if (res.length !== 0) {
              defer.resolve(res[0]);
            }
          }, function (err) {
            defer.reject(err);
          });
        eamDB.execute(db, 'select * from ' + eamMTInstallWorkOrderFactory.getTableName() + " where workorderId=?", [workorderId + ""])
          .then(function (res) {
            res = OrderService.ChangeSQLResult2Array(res);
            if (res.length !== 0) {
              defer.resolve(res[0]);
            }
          }, function (e) {
            return e;
          })
          .catch(function (err) {
            defer.reject(err);
          });
        return defer.promise;
      }

      function getWorkHourRecordByOrderId(orderId) {//离线创建的工单人员报工数据需要将工时单对应的工单信息替换
        var defer = $q.defer();
        eamDB.execute(db, "select * from " + tableName + " where uploadStatus=1 and workOrderId=?", [+orderId + ""])
          .then(function (res) {
            //if (isDebug) {
            //  console.log(JSON.stringify(ChangeSQLResult2Array(res),undefined,2));
            //}
            defer.resolve(ChangeSQLResult2Array(res));
          }, function (err) {
            defer.reject(err);
          });
        return defer.promise;
      }

      return {
        //根据dictionaryId获取字典里面的id到名字的映射
        getDicId2NameByDictionaryId: getDicId2NameByDictionaryId,
        //更改工单状态
        changeWorkOrderStatus: changeWorkOrderStatus,
        //删除工单记录
        deleteWorkHoursRecord: deleteWorkHoursRecord,
        createTemId: createTemId,
        loadMore: getFaultWorkHoursList,
        loadWorkerInfo: loadWorkerInfo,
        loadWorkOrderInfo: loadWorkOrderInfo,
        //sql结果转array
        ChangeSQLResult2Array: ChangeSQLResult2Array,
        //根据type获取字典列表
        getDicListByType: getDicListByType,
        getWorkHourRecordByOrderId: getWorkHourRecordByOrderId,
        //工单创建或修改方法
        updateOrInsert: workHoursDbOperation,
        getWorkOrderByWorkorderId: getWorkOrderByWorkorderId,
        //获取未处理工单个数
        getOrderProcessCount: function (callback) {
          var getUnHandleWorkOrderCout = "select count(workorderId) as sum from eam_sync_schdlemaintain where workorderStatus=41";
          eamDB.execute(db, getUnHandleWorkOrderCout).then(function (res) {
            callback(res.rows[0].sum);
          }, function (err) {
            console.error(err);
          });
        }
      };
    });
