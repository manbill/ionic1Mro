/**
 * 定维任务数据同步接口
 * 定维任务数据同步服务。
 */
angular.module('starter.SyncSchdlemaintain', [])
  .factory("SyncSchdlemaintain", function ($q, eamDB, SchdleMaintainApi, $injector, $timeout, Popup, eamSyncAjax, Storage) {

    var Api_getBatchWorkorderList = baseUrl + "/api/maintain/getBatchWorkorderList.api"; //据时间段批量获取列表数据
    var Api_getWorkorderFullInfoList = baseUrl + "/api/maintain/getWorkorderFullInfoList.api"; //以工单号获取工单所有数据
    var Api_uploadWorkOrder = baseUrl + "/api/maintain/uploadOrder.api";//上传工单接口
    var Api_updateUploadFiles = baseUrl + 'api/updateUploadFiles.api';//上传附件接口
    var insertSQL = "insert into eam_sync_schdlemaintain (transNoticeNo,workorderCode, workorderTitle, workorderType, workorderTypeName, " +
      "areaType, areaTypeName, siteManager, workTypeId, workTypeName, planBegindate, planEnddate, planNoticeId, " +
      "assignPerson, projectId, projectName, positionId, positionName, workorderStatus, workorderStatusName, activeFlag," +
      "taskAccepted, json, lastUpdateDatetimeApi, lastUpdateDatetimeApp, uploadStatus, downloadStatus," +
      "workorderFaultCode,faultBeginTime,faultEndTime,faultName,deviceName,faultReason,faultReasonName,ncrTrigger,ncrNum,faultHandleDesc,shutdownTotalHour,faultDetailComment,workTotalHour,createOn,faultAdvice,faultReasonComment,workorderId) " +
      "values (?,?,?,?,?,?,?,?,?,?,"
      + "?,?,?,?,?,?,?,?,?,?,"
      + "?,?,?,?,?,?,?,?,?,?,"
      + "?,?,?,?,?,?,?,?,?,?,"
      + "?,?,?,?)";

    var updateSQL = "update eam_sync_schdlemaintain set transNoticeNo=?, workorderCode=?, workorderTitle=?, workorderType=?, workorderTypeName=?, " +
      "areaType=?, areaTypeName=?, siteManager=?, workTypeId=?, workTypeName=?, planBegindate=?, planEnddate=?, planNoticeId=?, " +
      "assignPerson=?, projectId=?, projectName=?, positionId=?, positionName=?, workorderStatus=?, workorderStatusName=?, activeFlag=?," +
      "taskAccepted=?, json=?, lastUpdateDatetimeApi=?, lastUpdateDatetimeApp=?, uploadStatus=?, downloadStatus=? ,workorderFaultCode=?," +
      "faultBeginTime=?,faultEndTime=?,faultName=?,deviceName=?,faultReason=?,faultReasonName=?,ncrTrigger=?,ncrNum=?,faultHandleDesc=?,shutdownTotalHour=?,faultDetailComment=?,workTotalHour=?,createOn=?,faultAdvice=?,faultReasonComment=? where workorderId=? ";

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

    var selectsql = "select workorderId from eam_sync_schdlemaintain where workorderId=? ";


    var select_eam_sync_schdlemaintain_one = "select * from eam_sync_schdlemaintain where uploadStatus=1 LIMIT 1";

    /**
     * 上传工单信息。
     * @param begintime
     * @param endtime
     * @param callback
     */
    var uploadList = function (begintime, endtime, callback) {
      //拿到对象以后生成检查里面有哪些是需要上传的附件，将这些附件以队列形式插入到附件表中，以便附件表下载附件。
      // 获取一行数据
      eamDB.execute(db, select_eam_sync_schdlemaintain_one)
        .then(function (res) {
          //TODO delete this line res.rows.length=0;
          // res.rows.length = 0;
          if (res.rows.length > 0) {
            //处理数据
            var item = res.rows.item(0);
            var json = JSON.parse(item["json"]);
            //上传附件信息
            $injector.get("eamSync").updateFile(json, function (data) {
              if (!data) {
                // console.log(new Date() + "updateFile,json: " + JSON.stringify(json));
                //某个附件上传错误，保存当前数据，重新上传。
                // 更新json对象
                //存在一个问题，如果某个附件多次上传失败，将多次在此递归
                eamDB.execute(db, update_json_sql, [JSON.stringify(json), json["apiWorkorderBaseInfoDto"]["workorderId"]])
                  .then(function () {
                    uploadList(begintime, endtime, callback);
                  }, function (err) {
                    $injector.get("eamSync").synclog(JSON.stringify(err, undefined, 2));
                    $injector.get("eamSync").synclog("保存定维任务[" + json["apiWorkorderBaseInfoDto"]["workorderId"] + "]对象失败");
                    $injector.get("eamSync").stopSync();
                    callback();
                  });
              } else {//附件上传成功，附件已经有自己的fileId
                var filesUploadParams = [];//附件上传接口参数
                var workOrderFiles = {//工单的附件
                  workOrderId: +json["apiWorkorderBaseInfoDto"]["workorderId"],
                  filemappingIdArr: null
                };
                if (json.workorderDetails.eaWoFilemappingList && json.workorderDetails.eaWoFilemappingList.length > 0) {//这是工单下面的附件,未包括点检表的附件
                  var temList = [];
                  for (var i = 0; i < json.workorderDetails.eaWoFilemappingList.length; i++) {//这里取出来的fileId如果是file://说明是需要替换的
                    var fileDto = json.workorderDetails.eaWoFilemappingList[i];
                    if (!fileDto["filemappingId"]) {
                      temList.push(fileDto.fileId);
                    }
                  }
                  json.workorderDetails.eaWoWorkorderinfoDto.fileIdArr = null;
                  workOrderFiles.filemappingIdArr = temList;
                }
                if (json.workorderChecks && json.workorderChecks.length > 0) {//这是这条工单下面的点检表的点检项的附件
                  console.log("workorderChecks: ", json.workorderChecks);
                  angular.forEach(json.workorderChecks, function (value, key) {//遍历所有点检表
                    if (value['eaWoCheckListCatDtoList'] && value['eaWoCheckListCatDtoList'].length > 0) {
                      angular.forEach(value['eaWoCheckListCatDtoList'], function (v, k) {//某个点检表下的点检项
                        if (v['eaWoCheckListDtoList'] && v['eaWoCheckListDtoList'].length > 0) {
                          angular.forEach(v['eaWoCheckListDtoList'], function (checkDtoListItem, dtoItemKey) {
                            filesUploadParams.push({
                              workOrderId: +checkDtoListItem['checklistId'],
                              filemappingIdArr: checkDtoListItem['eaWoFilemappingDtoList'] &&
                              checkDtoListItem['eaWoFilemappingDtoList'].length > 0 ?
                                checkDtoListItem['eaWoFilemappingDtoList'].map(function (item) {
                                  return item.fileId + "";
                                }) : null
                            });
                            checkDtoListItem['eaWoFilemappingDtoList'] = null;//不需要再将此数组传给后台
                          });
                        }
                      }, value['eaWoCheckListCatDtoList']);
                    }
                  });
                }
                filesUploadParams.push(workOrderFiles);
                // console.log("上传参数", filesUploadParams);
                replaceDelPropertyAction(json, 'positionName', 'positionCode', "workorderManuals");//后台把positionName改名为positionCode,不需要传递指导书对象
                Popup.waitLoad("正在上传工单[" + json["apiWorkorderBaseInfoDto"]["workorderCode"] + "]");
                eamSyncAjax.doPost(Api_uploadWorkOrder, json, function () {
                  Popup.eamSyncHideLoading();
                  eamSyncAjax.doPost(Api_updateUploadFiles, filesUploadParams, function (res) {
                    console.log(res);
                    if (res.success) {
                      //调用上传接口，上传数据，如果没有回调说明数据同步失败了
                      //根据id判断如果小于0为新建上传后删除 反之则修改上传状态
                      eamDB.execute(db, json["apiWorkorderBaseInfoDto"]["workorderId"] < 0 ? delete_temp_success_sql : update_success_sql, [json["apiWorkorderBaseInfoDto"]["workorderId"]])
                        .then(function () {
                          // Popup.loadMsg("同步工单成功!",500);
                        }, function (err) {
                        });
                      uploadList(begintime, endtime, callback);
                    } else {
                      uploadList(begintime, endtime, callback);
                    }
                  });
                }, {headers: {"tokenId": Storage.getAccessToken()}});

              }
            });
          } else {
            //数据处理完成
            callback(true);
          }
        }, function (err) {
          //为了保证数据安全，不在进行数据同步，结束数据同步操作。
          console.log("获取待上传的定维任务失败" + err);
          $injector.get("eamSync").synclog("获取待上传定维任务详情失败");
          $injector.get("eamSync").stopSync();
          callback();
        });
    };
    /**
     * 将一个对象的某个属性名更名为另一个名字
     * @param obj 需要更名的对象
     * @param replacedProperty 被替换的属性名
     * @param usedProperty 要使用的属性名
     * @param delPro 要删除的属性名
     */
    var replaceDelPropertyAction = function (obj, replacedProperty, usedProperty, delPro) {
      angular.forEach(obj, function (value, key) {
        if (angular.isObject(value) || angular.isArray(value)) {
          replaceDelPropertyAction(value, replacedProperty, usedProperty);
        }
        if (key == replacedProperty) {
          this[usedProperty] = value;
          delete this[key];
        }
        if (key == delPro) {
          delete this[delPro];
        }
      }, obj);
    };
    /**
     * 根据时间段下载工单列表
     * @param begintime
     * @param endtime
     * @param eamSyncCallback 成功，传入true，否则FALSE或者空，null，undefined等
     */
    var downloadList = function (begintime, endtime, eamSyncCallback) {
      //先选择数据库中 workorderStatus=139 的工单,合并到将要更新的工单中,确保本地数据库的记录和pc端同步/*where workorderStatus=139;*/
      //调用服务器取数逻辑，将列表下载到本地，并通过downloadItem方法完成明细下载。
      //理论上数据应该是要做分页处理的，但是目前没有进行分页。
      var countPerTime = 10;//每次下载countPerTime条数据
      eamDB.execute(db, "select * from eam_sync_schdlemaintain where workorderStatus=139;", []).then(function (res) {
        var deletingOrders = $injector.get("OrderService").ChangeSQLResult2Array(res);
        Popup.waitLoad("正在下载任务单数据...");
        if (isDebug) {
          console.log("sync SyncSchdlemaintain downloadList ");
        }
        eamSyncAjax.doPost(Api_getBatchWorkorderList, {
          workorderTypeString: "",//	工单类型(查询时// :pc端:37-风云工单,38-人工工单,39-工程工单,67-服务工单,68-整改/技改工单;手机端:4-scada工单；返回时，都是按照pc端的)
          startDate: begintime,
          endDate: endtime
        }, function (res) {
          Popup.eamSyncHideLoading();
          if (res.success) {
            var data = res.data;
            data = data.concat(deletingOrders);
            if (data.length == 0) {
              eamSyncCallback(true);
              return;
            }
            downloadItem(data, countPerTime, eamSyncCallback);
          } else {
            $injector.get("eamSync").synclog("获取定维任务列表失败");
            eamSyncCallback();
          }
        });
      }, function (error) {
        console.error(error);
        eamSyncCallback();
      });

    };
    /**
     * 下载工单详情
     * @param workorders
     * @param countPerTime
     * @param eamSyncCallback 同步成功需要传参数true
     */
    var downloadItem = function (workorders, countPerTime, eamSyncCallback) {
      Popup.waitLoad("正在下载任务单详情数据···");
      var fullInfoParams = [];
      //每次同步countPerTime条数据
      if (workorders.length > countPerTime) {
        for (var i = 0; i < countPerTime; i++) {
          var workOrder = workorders.shift();
          fullInfoParams.push({
            workorderId: workOrder['workorderId'],
            workorderType: workOrder['workorderType']
          });
        }
      } else {
        for (; ;) {
          var item = workorders.shift();
          if (item) {
            fullInfoParams.push({
              workorderId: item['workorderId'],
              workorderType: item['workorderType']
            });
          } else {
            break;
          }
        }
      }
      if (fullInfoParams.length == 0) {
        eamSyncCallback(true);
      } else {
        eamSyncAjax.doPost(Api_getWorkorderFullInfoList, {apiWorkorderBaseInfoDto: fullInfoParams}, function (res) {
          if (res.data == 0) {
            eamSyncCallback(true);
            return;
          }
          updateOrInsert(res.data, countPerTime, function () {
            downloadItem(workorders, countPerTime, eamSyncCallback);//下载完countPerTime并且更新到数据库后再请求countPerTime条记录,直到结束
          });
        });
      }

    };
    var batchInsertOrUpdate = function (insertingBindings, updatingBindings, insertsql, updatesql, errorMessage, callback) {//批量插入或者更新数据库操作
      Popup.waitLoad("正在批量操作任务单数据库...");
      if (insertingBindings.length > 0) {
        // var startInsertTime=new Date().getTime();
        eamDB.insertCollection(db, insertsql, insertingBindings).then(function (res) {
          // console.log("insertTime:"+(new Date().getTime()-startInsertTime));
          if (updatingBindings.length > 0) {
            // var startUpdateTime=new Date().getTime();
            eamDB.insertCollection(db, updatesql, updatingBindings).then(function (res) {
              // console.log("updateTime:"+(new Date().getTime()-startUpdateTime));
              if ($.isFunction(callback)) {
                Popup.eamSyncHideLoading();
                callback();
              }
            }, function (error) {
              console.error(error);
              $injector.get("eamSync").synclog(errorMessage || "批量更新列表失败");
              if ($.isFunction(callback)) {
                Popup.eamSyncHideLoading();
                callback();
              }
            });
          } else if ($.isFunction(callback)) {
            Popup.eamSyncHideLoading();
            callback();
          }
        }, function (error) {
          console.error("批量插入任务列表失败" + JSON.stringify(error));
          $injector.get("eamSync").synclog(errorMessage || "批量插入失败" + "<br/>error:" + JSON.stringify(error));
          if ($.isFunction(callback)) {
            Popup.eamSyncHideLoading();
            callback();
          }
        });
      } else if (updatingBindings.length > 0) {//不执行插入
        eamDB.insertCollection(db, updatesql, updatingBindings).then(function (res) {
          if ($.isFunction(callback)) {
            Popup.eamSyncHideLoading();
            callback();
          }
        }, function (error) {
          console.error(error);
          $injector.get("eamSync").synclog("批量更新任务列表失败");
          if ($.isFunction(callback)) {
            Popup.eamSyncHideLoading();
            callback();
          }
        });
      } else if ($.isFunction(callback)) {
        Popup.eamSyncHideLoading();
        callback();
      }
    };
    var updateOrInsert = function (newData, countPerTime, callback) {
      Popup.waitLoad("正在更新数据库的任务工单信息...");
      if (newData.length == 0 && $.isFunction(callback)) {
        Popup.eamSyncHideLoading();
        callback();
        return;
      }
      var workOrderIds = [];
      for (var i = 0; i < newData.length - 1; i++) {
        workOrderIds.push(newData[i]["apiWorkorderBaseInfoDto"]["workorderId"]);
      }
      workOrderIds.join(",");
      workOrderIds.push(newData[newData.length - 1]["apiWorkorderBaseInfoDto"]["workorderId"]);
      eamDB.execute(db, "select * from eam_sync_schdlemaintain where workorderId in (" + workOrderIds + ");").then(function (res) {
        var oldData = $injector.get("OrderService").ChangeSQLResult2Array(res);
        var deletingBindings = [];//本地需要删除的记录,其实可以将oldData全部push到该数组中,然后把网络返回来的数据全部插入数据库,就无需再有更新操作了
        var updatingBindings = [];//需要更新的本地记录
        var insertingBindings = [];//将要批量插入的数组
        for (var index = 0; index < newData.length; index++) {//将网络请求回来的数据分成两组,插入和更新,以便后边直接批量进行数据库操作
          var isCheckFileId = false;
          var isBreak = false;//判断工单是插入还是要更新
          var insertValues = [];
          var workorder = newData[index];
          workorder.positionName = workorder.positionCode;//由于后台的positionName被改名为positionCode
          if (workorder["apiWorkorderBaseInfoDto"]["taskAccepted"] == true) {//PC端不存在该工单
            var deleteValues = [];
            deleteValues.push(workorder["apiWorkorderBaseInfoDto"]["workorderId"]);
            deletingBindings.push(deleteValues);
            continue;
          }
          for (var key = 0; key < oldData.length; key++) {
            var oldWorkOrder = oldData[key];
            var createOn = null;
            if (oldWorkOrder["workorderId"] == workorder["apiWorkorderBaseInfoDto"]["workorderId"]) {//如果新数据包含需要更新的id
              var updateValues = [];
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["transNoticeNo"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["workorderCode"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["workorderTitle"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["workorderType"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["workorderTypeName"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["areaType"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["areaTypeName"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["siteManager"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["workTypeId"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["workTypeName"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["planBegindate"] ? (new Date(workorder["apiWorkorderBaseInfoDto"]["planBegindate"]).getTime()) : null);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["planEnddate"] ? (new Date(workorder["apiWorkorderBaseInfoDto"]["planEnddate"]).getTime()) : null);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["planNoticeId"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["assignPerson"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["projectId"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["projectName"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["positionId"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["positionCode"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["workorderStatus"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["workorderStatusName"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["activeFlag"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["taskAccepted"]);
              updateValues.push(JSON.stringify(workorder));
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["lastUpdateDatetimeApi"]);
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["lastUpdateDatetimeApi"]);//lastUpdateDatetimeApp  默认与服务器时间相同。
              updateValues.push(0);//uploadStatus，是否需要往服务器同步，1为需求，0为不需要
              updateValues.push(1);//downloadStatus，是否是从服务器下载，默认为1，日常操作不需要修改此字段。
              updateValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultCode"]);//采集故障编码
              var beginDate = workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultBegindate"];
              var endDate = workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultEnddate"];
              if (StringUtils.isNotEmpty(beginDate)) {
                if (isNaN(beginDate)) {//'2017-1-4 17:06:04'
                  beginDate = new Date(beginDate).getTime();//故障激活时间
                } else {//'1483520385759'
                  beginDate = parseInt(beginDate);
                }
              }
              if (StringUtils.isNotEmpty(endDate)) {//故障解决时间
                if (isNaN(endDate)) {//'2017-1-4 17:06:04'
                  endDate = new Date(endDate).getTime();
                } else {//'1483520385759'
                  endDate = parseInt(endDate);
                }
              }
              updateValues.push(beginDate);//故障激活时间
              updateValues.push(endDate);//故障解决时间
              updateValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultName"]);//故障名称
              updateValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["deviceName"]);//部件名称
              updateValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultReason"]);//故障原因id
              updateValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultReasonName"]);//故障原因
              updateValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["ncrTrigger"]);//是否触发ncr
              updateValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["ncrNum"]);//ncr编号
              updateValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultHandleDesc"]);//故障处理过程描述
              updateValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["shutdownTotalHour"]);//累计停机时间
              updateValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultDetailComment"]);//故障现象详尽描述
              updateValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["workTotalHour"]);//累计作业时间
              createOn = workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["createOn"];//创建时间
              if (StringUtils.isNotEmpty(createOn)) {//创建时间
                if (isNaN(createOn)) {//'2017-1-4 17:06:04'
                  createOn = new Date(createOn).getTime();
                } else {//'1483520385759'
                  createOn = parseInt(createOn);
                }
              }
              updateValues.push(createOn);//创建时间
              updateValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultAdvice"]);//故障机建议
              updateValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultReasonComment"]);//故障原因描述
              updateValues.join(",");
              updateValues.push(workorder["apiWorkorderBaseInfoDto"]["workorderId"]);
              updatingBindings.push(updateValues);
              if (!isCheckFileId) {//如果当前的工单还没执行下面的方法
                $injector.get("eamSync").checkFileid(workorder);
                isCheckFileId = true;
              }
              oldData.splice(key, 1);//删除一个数据
              isBreak = true;
              break;//
            }
          }
          if (isBreak) {//如果是由于跳出内层循环,则循环下一个工单
            continue;
          }
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["transNoticeNo"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["workorderCode"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["workorderTitle"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["workorderType"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["workorderTypeName"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["areaType"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["areaTypeName"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["siteManager"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["workTypeId"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["workTypeName"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["planBegindate"] ? (new Date(workorder["apiWorkorderBaseInfoDto"]["planBegindate"]).getTime()) : "");
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["planEnddate"] ? (new Date(workorder["apiWorkorderBaseInfoDto"]["planEnddate"]).getTime()) : "");
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["planNoticeId"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["assignPerson"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["projectId"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["projectName"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["positionId"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["positionCode"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["workorderStatus"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["workorderStatusName"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["activeFlag"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["taskAccepted"]);
          insertValues.push(JSON.stringify(workorder));
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["lastUpdateDatetimeApi"]);
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["lastUpdateDatetimeApi"]);//lastUpdateDatetimeApp  默认与服务器时间相同。
          insertValues.push(0);//uploadStatus，是否需要往服务器同步，1为需求，0为不需要
          insertValues.push(1);//downloadStatus，是否是从服务器下载，默认为1，日常操作不需要修改此字段。
          insertValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultCode"]);//采集故障编码
          insertValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultBegindate"] ? (new Date(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultBegindate"]).getTime()) : "");//故障激活时间
          insertValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultEnddate"] ? (new Date(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultEnddate"]).getTime()) : "");//故障解决时间
          insertValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultName"]);//故障名称
          insertValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["deviceName"]);//部件名称
          insertValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultReason"]);//故障原因id
          insertValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultReasonName"]);//故障原因
          insertValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["ncrTrigger"]);//是否触发ncr
          insertValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["ncrNum"]);//ncr编号
          insertValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultHandleDesc"]);//故障处理过程描述
          insertValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["shutdownTotalHour"]);//累计停机时间
          insertValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultDetailComment"]);//故障现象详尽描述
          insertValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["workTotalHour"]);//累计作业时间
          createOn = workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["createOn"];//创建时间
          if (StringUtils.isNotEmpty(createOn)) {//创建时间
            if (isNaN(createOn)) {//'2017-1-4 17:06:04'
              createOn = new Date(createOn).getTime();
            } else {//'1483520385759'
              createOn = parseInt(createOn);
            }
          }
          insertValues.push(createOn);//创建时间
          insertValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultAdvice"]);//故障机建议
          insertValues.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultReasonComment"]);//故障原因描述
          insertValues.join(",");
          insertValues.push(workorder["apiWorkorderBaseInfoDto"]["workorderId"]);
          insertingBindings.push(insertValues);
          if (!isCheckFileId) {//如果当前的工单还没执行下面的方法
            $injector.get("eamSync").checkFileid(workorder);
            isCheckFileId = true;
          }
        }
        // console.log("sum:"+newData.length+" for consuming time:"+(new Date().getTime()-startForTime));
        if (deletingBindings.length > 0) {
          eamDB.insertCollection(db, "delete from eam_sync_schdlemaintain where workorderId=?;", deletingBindings).then(function () {
            batchInsertOrUpdate(insertingBindings, updatingBindings, insertSQL, updateSQL, null, callback);
          }, function (error) {
            console.error(error);
            $injector.get("eamSync").synclog("批量删除任务列表失败");
            if ($.isFunction(callback)) {
              Popup.eamSyncHideLoading();
              callback();
            }
          });
        } else {
          batchInsertOrUpdate(insertingBindings, updatingBindings, insertSQL, updateSQL, null, callback);
        }

      }, function (error) {
        console.error(error);
        $injector.get("eamSync").synclog("筛选任务列表失败");
        if ($.isFunction(callback)) {
          Popup.eamSyncHideLoading();
          callback();
        }
      });
    };

    return {
      downloadList: downloadList,
      uploadList: uploadList,
      bachInsertOrUpdate: batchInsertOrUpdate
    }
  });
