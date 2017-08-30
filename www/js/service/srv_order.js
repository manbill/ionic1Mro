/**
 *
 */
starter.factory('OrderService', function (DataCache, WorkOrderApi, $injector, Popup, $rootScope, $timeout, eamDB, SchdleMaintainApi, $ionicActionSheet, $cordovaCamera, eamFile) {
  var getWorkOrderListByTypeSQL = "SELECT * FROM eam_sync_schdlemaintain where workorderType in ";//根据工单类型获取工单

//新建故障工单sql
  var insertsql = "insert into eam_sync_schdlemaintain (workorderCode, workorderTitle, workorderType, workorderTypeName, " +
    "areaType, areaTypeName, siteManager, workTypeId, workTypeName, projectId, projectName, positionId,positionName, workorderStatus, workorderStatusName, activeFlag," +
    " json,  uploadStatus, downloadStatus," +
    "workorderFaultCode,faultBeginTime,faultEndTime,faultName,deviceName,faultReason,faultReasonName," +
    "ncrTrigger,ncrNum,faultHandleDesc,shutdownTotalHour,faultDetailComment,createOn,workorderId) " +
    "values (?,?,?,?," +
    "?,?,?,?,?,?,?,?,?,?,?," +
    "?,?,?,?," +
    "?,?,?,?,?,?,?," +
    "?,?,?,?,?,?,?)";
  //更新故障工单sql
  var updatesql = "update eam_sync_schdlemaintain set  workorderCode=?, workorderTitle=?, workorderType=?, workorderTypeName=?, " +
    "areaType=?, areaTypeName=?, siteManager=?, workTypeId=?, workTypeName=?, projectId=?, projectName=?, positionId=?,positionName=?,  workorderStatus=?, workorderStatusName=?, activeFlag=?," +
    " json=?, uploadStatus=?, downloadStatus=? ,workorderFaultCode=?," +
    "faultBeginTime=?,faultEndTime=?,faultName=?,deviceName=?,faultReason=?,faultReasonName=?" +
    ",ncrTrigger=?,ncrNum=?,faultHandleDesc=?,shutdownTotalHour=?,faultDetailComment=?,createOn=? where workorderId=? ";
  //根据workorderId查询记录
  var selectsql = "select workorderId from eam_sync_schdlemaintain where workorderId=? ";
  //根据workorderId删除工单(未上传工单)
  var deleteWorkOrderTemp = "delete from eam_sync_schdlemaintain where workorderId=? ";
  //根据detailid 获取字典详情
  var selectDicDetailByDetailId = "select * from eam_sync_dictionary_detail where detailId=? ";
  //根据工单id修改工单状态
  var updateWorkOrderStatus = "update eam_sync_schdlemaintain set json=?,workorderStatus=?,workorderStatusName=?,uploadStatus=1 where workorderId=?";
  //根据工单id修改工单json
  var updateWorkOrderJson = "update eam_sync_schdlemaintain set json=?,uploadStatus=1 where workorderId=?";
//查询物料信息表
  var selectMaterial = "select * from eam_sync_material where activeFlag=0 ";
  //根据id获取物料信息
  var selectMaterialById = "select * from eam_sync_material where materialId=? ";
  var queryMachinesSql = "select * from eam_machine_equipment where project_id=?;";

  function uploadIfOnline(callbackOk, callbackNotOk) {
    SchdleMaintainApi.checkNetStatus(function (resp) {
      if (resp.success) {
        $injector.get('eamSync').sync(["SyncSchdlemaintain.uploadList", "SyncSchdlemaintain.downloadList"], function () {
          Popup.loadMsg("同步工单数据成功!");
          if ($.isFunction(callbackOk)) {
            callbackOk();
          }
        })
      } else if ($.isFunction(callbackNotOk)) {
        $injector.get('eamSync').synclog("网络出错！");
        callbackNotOk();
      }
    });
  }

  function synchData(datas, orderId, callback) {
    Popup.loadMsg("正在与服务器同步..", 10000);
    $timeout(function () {
      var model = null;
      if (datas.handOrder != null) { //手工工单
        //手工工单
        model = datas.handOrder;
        datas.handOrder = null;
        if (isNaN(model.orderId) && model.orderId.indexOf("T") != -1) {
          model.orderId = "";
        }
        WorkOrderApi.createFaultOrder(function (resp) {
          if (resp.success) {
            orderId = resp.data;
          }
          synchData(datas, orderId, callback);
        }, model);
      } else if (datas.scadaInfo != null) { //scada信息
        //SCADA工单
        model = datas.scadaInfo;
        datas.scadaInfo = null;
        model.orderId = orderId;
        WorkOrderApi.saveSCADAWorkOrder(function (resp) {
          synchData(datas, orderId, callback);
        }, model);
      } else if (datas.empTimes != null && datas.empTimes.length > 0) { //人员报工
        model = datas.empTimes.shift();
        if (model.delete == true) {
          //删除
          WorkOrderApi.deleteEmpTimeSheet(function () {
            synchData(datas, orderId, callback);
          }, {
            "timeSheetId": model.timeSheetId
          });
        } else { //修改或新增

          var pms = {};
          pms.timeSheetId = model.timeSheetId;
          pms.objectName = model.objectName;
          pms.type = model.type;
          pms.beginTime = new Date(model.beginTime).getTime();
          pms.endTime = new Date(model.endTime).getTime();
          pms.description = model.description;
          pms.empId = model.empId;
          var timeSheepModel = {};
          timeSheepModel.timeSheet = pms;
          timeSheepModel.orderId = orderId;
          WorkOrderApi.saveEmpTimeSheetList(function () {
            synchData(datas, orderId, callback);
          }, timeSheepModel);
        }
      } else if (datas.materiels != null && datas.materiels.length > 0) { //所需物料信息
        model = datas.materiels;
        datas.materiels = null;
        WorkOrderApi.saveCheckMaterialList(function () {
          synchData(datas, orderId, callback);
        }, {
          orderId: orderId,
          materiels: model
        });
      } else if (datas.materielRequests != null && datas.materielRequests.length > 0) { //物料请求信息
        model = datas.materielRequests.shift();
        if (model.delete == true) { //删除
          WorkOrderApi.delMaterielRqst(function () {
            synchData(datas, orderId, callback);
          }, model.materielRqstId);
        } else {
          if (model.materielRqstId) {
            //修改
            WorkOrderApi.updateMaterielRequest(function (resp) {
              synchData(datas, orderId, callback);
            }, model);
          } else {
            //新增
            WorkOrderApi.saveMaterielRequest(function () {
              synchData(datas, orderId, callback);
            }, {
              "materielRqsts": [model],
              "orderId": orderId
            });
          }
        }
      } else if (datas.repairRecords != null && datas.repairRecords.length > 0) { //设备维修
        model = datas.repairRecords.shift();
        model.orderId = orderId;
        if (model.delete == true) {
          //删除
          WorkOrderApi.deleteRepairRecord(function () {
            synchData(datas, orderId, callback);
          }, model.repairRecordId);
        } else { //修改或新增
          WorkOrderApi.saveRepairRecord(function () {
            synchData(datas, orderId, callback);
          }, model);
        }
      } else {
        if (callback != null) {
          callback(true);
        }
      }
    }, 500);
  }

  function synchronizeOrder(callback, orderId) {
    if (orderId != null) {
      Popup.loadMsg("正在与服务器同步..", 20000);
      var synchronizeData = {
        "empTimes": DataCache.getEmpTimeSheetList(orderId), //人员报工
        "materiels": DataCache.getOrderMateriels(orderId), //所需物料信息
        "scadaInfo": DataCache.getSCADAInfo(orderId), //SCADA工单
        "materielRequests": DataCache.getMaterielRequest(orderId), //物料请求信息
        "repairRecords": DataCache.getRepairRecordList(orderId), //设备维修
        "handOrder": DataCache.getHandOrder(orderId) //手工工单
      };
      console.log(synchronizeData);
      synchData(synchronizeData, orderId, function () {
        Popup.hideLoading();
        DataCache.clearOrderCache(null, orderId);
        callback(true);
      });
    }
  }

  function synchronizeFaultOrder(callback, orders) {
    if (orders != null && orders.length > 0) {
      var model = orders.shift();
      synchronizeOrder(function () {
        synchronizeFaultOrder(function (result) {
          Popup.hideLoading();
          DataCache.removeFaultOrder();
          callback(true);
        }, orders);
      }, model.orderId);
    } else {
      callback(true);
    }
  }

  var callbackRes;
//更新或者新建工单
  function updateOrInsert(workorders, callback) {
    var workorder = workorders.shift();
    if (workorder != undefined) {
      callbackRes = workorder;
      //创建fileidlist
      eamDB.execute(db, selectsql, [workorder["apiWorkorderBaseInfoDto"]["workorderId"]]).then(function (res) {
        var values = [];
        values.push(workorder["apiWorkorderBaseInfoDto"]["workorderCode"]);
        values.push(workorder["apiWorkorderBaseInfoDto"]["workorderTitle"]);
        values.push(workorder["apiWorkorderBaseInfoDto"]["workorderType"]);
        values.push(workorder["apiWorkorderBaseInfoDto"]["workorderTypeName"]);
        values.push(workorder["apiWorkorderBaseInfoDto"]["areaType"]);
        values.push(workorder["apiWorkorderBaseInfoDto"]["areaTypeName"]);
        values.push(workorder["apiWorkorderBaseInfoDto"]["siteManager"]);
        values.push(workorder["apiWorkorderBaseInfoDto"]["workTypeId"]);
        values.push(workorder["apiWorkorderBaseInfoDto"]["workTypeName"]);
        values.push(workorder["apiWorkorderBaseInfoDto"]["projectId"]);
        values.push(workorder["apiWorkorderBaseInfoDto"]["projectName"]);
        values.push(workorder["apiWorkorderBaseInfoDto"]["positionId"]);
        values.push(workorder["apiWorkorderBaseInfoDto"]["positionName"]);
        values.push(workorder["apiWorkorderBaseInfoDto"]["workorderStatus"]);
        values.push(workorder["apiWorkorderBaseInfoDto"]["workorderStatusName"]);
        values.push(workorder["apiWorkorderBaseInfoDto"]["activeFlag"]);
        values.push(angular.toJson(workorder));
        values.push(1);//uploadStatus，是否需要往服务器同步，1为需求，0为不需要
        values.push(1);//downloadStatus，是否是从服务器下载，默认为1，日常操作不需要修改此字段。
        values.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultCode"]);//采集故障编码
        values.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultBegindate"]);//故障激活时间
        values.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultEnddate"]);//故障解决时间
        values.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultName"]);//故障名称
        values.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["deviceName"]);//部件名称
        values.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultReason"]);//故障原因id
        values.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultReasonName"]);//故障原因
        values.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["ncrTrigger"]);//是否触发ncr
        values.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["ncrNum"]);//ncr编号
        values.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultHandleDesc"]);//故障处理过程描述
        values.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["shutdownTotalHour"]);//累计停机时间
        values.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["faultDetailComment"]);//故障现象详尽描述
        values.push(workorder["workorderDetails"]["eaWoWorkorderinfoDto"]["createOn"]);//创建时间
        values.push(workorder["apiWorkorderBaseInfoDto"]["workorderId"]);
        if (res.rows.length > 0) {
          //说明有数据，执行update操作
          eamDB.execute(db, updatesql, values).then(function () {
            updateOrInsert(workorders, callback);
          }, function (err) {
            console.error(err);
          });
        } else {
          //说明没有数据，执行insert操作
          eamDB.execute(db, insertsql, values).then(function () {
            updateOrInsert(workorders, callback);
          }, function (err) {
            console.error(err);
          });
        }
      }, function (err) {
        console.error(err);
      });
    } else {
      if ($.isFunction(callback)) {
        callback(callbackRes);
      }
    }
  }

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
    var array = [];
    for (var i = 0, len = resp.rows.length; i < len; i++) {
      array.push(resp.rows.item(i));
    }
    return array;
  }

//工单列表查询方法
  function loadMore(params, callback) {
    getFaultWorkOrderList(function (resp) {
      callback(resp);
    }, {
      orderNo: params.orderNo,
      projectName: params.projectName,
      faultCode: params.faultCode,
      faultReasonName: params.faultReasonName,
      faultDetailComment: params.faultDetailComment,
      workOrderStatus: params.workOrderStatus,
      faultBeginFromTime: params.faultBeginFromTime != null ? params.faultBeginFromTime.getTime() : null, //故障开始日期(开始)
      faultBeginToTime: params.faultBeginToTime != null ? params.faultBeginToTime.getTime() : null, //故障开始日期(结束)
      workEndFromDate: params.workEndFromDate,
      workEndToDate: params.workEndToDate,
      pageNumber: params.pageNumber,
      faultSource: params.faultSource
    });
  }

  /**
   * 取得故障工单列表
   * @param {Object} callback
   * @param {Object} params
   */
  function getFaultWorkOrderList(callback, params) {
    var skipR = (params.pageNumber - 1) * 5;
    var SqlFiter = "";//sql条件
    SqlFiter += params.projectName ? " and projectName like '%" + params.projectName + "%'" : "";//项目名称
    SqlFiter += params.orderNo ? " and workorderCode like '%" + params.orderNo + "%'" : "";//工单号
    SqlFiter += params.faultCode ? " and workorderFaultCode like '%" + params.faultCode + "%'" : ""; //采集故障码
    SqlFiter += params.faultBeginFromTime ? " and faultBeginTime >= " + params.faultBeginFromTime : "";//故障开始日期开始
    SqlFiter += params.faultBeginToTime ? " and faultBeginTime <= " + params.faultBeginToTime : "";//故障开始日期结束
    SqlFiter += params.workOrderStatus ? " and workorderStatus = " + params.workOrderStatus : "";//状态
    SqlFiter += params.faultSource ? " and workorderType = " + params.faultSource : "";//来源
    SqlFiter += params.faultReasonName ? " and faultReasonName like '%" + params.faultReasonName + "%'" : "";//故障原因
    SqlFiter += params.faultDetailComment ? " and faultDetailComment like '%" + params.faultDetailComment + "%'" : "";//故障详尽描述

    eamDB.execute(db, getWorkOrderListByTypeSQL + " (37,38) " + SqlFiter + " order by workOrderStatus,createOn desc limit " + skipR + ",5").then(function (res) {
      if ($.isFunction(callback)) {
        callback(res);
      }
    }, function (err) {
      console.error(err);
    });
  }

  //构建工单数据结构
  function createWorkorders(order) {
    //如果工单id为空则为新增人工工单
    if (!order.workorderId) {
      //生成id为负数证明为新工单
      var orderId = 0 - (new Date()).getTime();
      order.workorderId = orderId;
      order.workorderCode = "Temp" + order.workorderId;
      order.workorderStatus = "41";//处理中
      order.workorderType = "38";//人工工单
      order.workorderTypeName = "人工填报故障";
      order.workorderStatusName = "处理中";
    }
    var eaWoWorkorderinfoDto = {
      "faultCode": order.workorderFaultCode,//采集故障码
      "faultBegindate": new Date(order.faultBeginTime).format("yyyy-MM-dd hh:mm"),//故障激活时间,必填项
      "faultEnddate": order.faultEndTime ? new Date(order.faultEndTime).format("yyyy-MM-dd hh:mm") : order.faultEndTime,//故障解决时间,选填
      "faultName": order.faultName,//故障名称
      "deviceName": order.deviceName, //部件名称
      "deviceId": order.deviceId, // 设备id
      "faultDetailComment": order.faultDetailComment,//故障详细描述
      "faultReason": order.faultCause.detailId,//故障原因id
      "faultReasonName": order.faultCause.detailName,//故障原因
      "ncrTrigger": order.ncrTrigger == 1 ? 1 : 0,//是否激活ncr
      "ncrNum": order.ncrNum,//ncr号
      "faultHandleDesc": order.faultHandleDesc,//故障处理描述
      "shutdownTotalHour": order.shutdownTotalHour,//总关机时间
      "createOn": new Date().getTime(),
      "workorderCode": order.workorderCode,//工单编号 临时编号为Temp+工单id
      "workorderTitle": order.workorderTitle,//工单主题
      "workorderType": order.workorderType,//工单类型
      "workorderTypeName": order.workorderTypeName,//工单类型名称
      "areaType": order.project.areaCode,//areaType 所属区域
      "areaTypeName": order.project.areaCodeName,//areaTypeName 所属区域名称
      "siteManager": order.project.userId,//siteManager
      "workTypeId": order.project.worktypeId,//workTypeId
      "workTypeName": order.project.worktypeName,//workTypeName
      "projectId": order.project.projectId,//projectId
      "projectName": order.project.projectName,//projectName
      "positionId": order.positionId,//positionId 机位号或风机
      "positionName": order.positionName,//positionId 机位号或风机
      "workorderStatus": order.workorderStatus,//workorderStatus
      "workorderStatusName": order.workorderStatusName,//workorderStatusName
      "activeFlag": order.activeFlag,//activeFlag
      "workorderId": order.workorderId
    };
    var workorderDetails = {
      "eaWoWorkorderinfoDto": eaWoWorkorderinfoDto,
      "eaWoFilemappingList": order.fileList ? order.fileList : null
    };
    var apiWorkorderBaseInfoDto = {
      "workorderCode": order.workorderCode,//工单编号 临时编号为Temp+工单id
      "workorderTitle": order.workorderTitle,//工单主题
      "workorderType": order.workorderType,//工单类型
      "workorderTypeName": order.workorderTypeName,//工单类型名称
      "areaType": order.project.areaCode,//areaType 所属区域
      "areaTypeName": order.project.areaCodeName,//areaTypeName 所属区域名称
      "siteManager": order.project.userId,//siteManager
      "workTypeId": order.project.worktypeId,//workTypeId
      "workTypeName": order.project.worktypeName,//workTypeName
      "projectId": order.project.projectId,//projectId
      "projectName": order.project.projectName,//projectName
      "positionId": order.positionId,//positionId 机位号或风机
      "positionName": order.positionName,//positionId 机位号或风机
      "workorderStatus": order.workorderStatus,//workorderStatus
      "workorderStatusName": order.workorderStatusName,//workorderStatusName
      "activeFlag": order.activeFlag,//activeFlag
      "lastUpdateDatetimeApi": new Date(),//lastUpdateDatetimeApi
      "workorderId": order.workorderId
    };
    var workorder = {
      "apiWorkorderBaseInfoDto": apiWorkorderBaseInfoDto, "workorderDetails": workorderDetails
    };
    //将其他对象放入新对象
    if (order["json"]) {
      var oldJsonObject = angular.fromJson(order["json"]);
      //
      if (oldJsonObject["workorderManuals"]) {
        workorder["workorderManuals"] = oldJsonObject["workorderManuals"];
      }
      if (oldJsonObject["workorderChecks"]) {
        workorder["workorderChecks"] = oldJsonObject["workorderChecks"];
      }
      if (oldJsonObject["materialStandarList"]) {
        workorder["materialStandarList"] = oldJsonObject["materialStandarList"];
      }
      if (oldJsonObject["repairRecordList"]) {
        workorder["repairRecordList"] = oldJsonObject["repairRecordList"];
      }
      if (oldJsonObject["materialStandarList"]) {
        workorder["materialStandarList"] = oldJsonObject["materialStandarList"];
      }
      //workorderDetails
      if (oldJsonObject["workorderDetails"]["eaWoFaultInfoDtoList"]) {
        workorder["workorderDetails"]["eaWoFaultInfoDtoList"] = oldJsonObject["workorderDetails"]["eaWoFaultInfoDtoList"];
      }
      if (oldJsonObject["workorderDetails"]["eaWoWorkorderAuditingDtoList"]) {
        workorder["workorderDetails"]["eaWoWorkorderAuditingDtoList"] = oldJsonObject["workorderDetails"]["eaWoWorkorderAuditingDtoList"];
      }
      if (oldJsonObject["workorderDetails"]["eaWoPauseDtoList"]) {
        workorder["workorderDetails"]["eaWoPauseDtoList"] = oldJsonObject["workorderDetails"]["eaWoPauseDtoList"];
      }
    }
    var workorders = [];
    workorders.push(workorder);
    return workorders;
  }

  //改变工单状态
  function changeWorkOrderStatus(work, workorderStatus, callback) {
    var json = JSON.parse(work.json);
    json.apiWorkorderBaseInfoDto.workorderStatus = workorderStatus;
    getDicDetailById(workorderStatus, function (res) {
      json.apiWorkorderBaseInfoDto.workorderStatusName = res.rows[0].detailName;
      eamDB.execute(db, updateWorkOrderStatus, [JSON.stringify(json), json.apiWorkorderBaseInfoDto.workorderStatus, res.rows[0].detailName, work.workorderId]).then(function (res) {
        if ($.isFunction(callback)) {
          callback(json.apiWorkorderBaseInfoDto.workorderStatusName);
        }
      }, function (err) {
        console.error(err);
      });
    })
  }

//删除工单数据
  function deleteWorkOrderRecord(work, callback) {
    //临时数据直接删除
    if (work.workorderId < 0) {
      eamDB.execute(db, deleteWorkOrderTemp, [work.workorderId]).then(function (res) {
        callback(res);
      }, function (err) {
        console.error(err);
      });
    } else {
      //同步数据另行处理
      var json = JSON.parse(work.json);
      json.apiWorkorderBaseInfoDto.workorderStatus = 43;
      getDicDetailById(json.apiWorkorderBaseInfoDto.workorderStatus, function (res) {
        json.apiWorkorderBaseInfoDto.workorderStatusName = res.rows[0].detailName;
        eamDB.execute(db, updateWorkOrderStatus, [JSON.stringify(json), json.apiWorkorderBaseInfoDto.workorderStatus, res.rows[0].detailName, work.workorderId]).then(function (res) {
          callback(res);
          // uploadIfOnline(function () {
          //   callback(res)
          // }, function () {
          //   $injector.get('eamSync').synclog("网络出错！");
          //   callback(res)
          // });
        }, function (err) {
          console.error(err);
        });
      })

    }
  }

  //修改json/保存工单
  function changeWorkOrderJson(work, callback) {
    eamDB.execute(db, updateWorkOrderJson, [work.json, work.workorderId]).then(function (res) {
      if ($.isFunction(callback)) {
        callback(res);
      }
    }, function (err) {
      $injector.get('eamSync').synclog("数据库操作出错！");
      if ($.isFunction(callback)) {
        callback(res);
      }
      // console.error(err);
    });

  }

  //根据detailid获取字典项
  function getDicDetailById(DetailId, callback) {
    eamDB.execute(db, selectDicDetailByDetailId, [+DetailId]).then(function (res) {
      callback(res);
    }, function (err) {
      console.error(err);
    });

  }

  //根据全部列表获取部分数据
  function getListFormAllList(faultListALL, pagenum) {
    //起始下标
    var start = (pagenum - 1) * 10;
    var end = (pagenum * 10) > faultListALL.length ? faultListALL.length - 1 : (pagenum * 10) - 1;
    var res = new Array();
    for (var i = start; i <= end; i++) {
      res.push(faultListALL[i]);
    }
    return res;
  }

//获取物料列表
  function getMaterialPageList(callback, params) {
    var skipR = (params.pageNumber - 1) * 5;
    var SqlFiter = "";//sql条件
    SqlFiter += params.materielNo ? " and materialSno like '%" + params.materielNo + "%'" : "";//物料号
    // SqlFiter += params.orderNo ? " and workorderCode like '%" + params.orderNo + "%'" : "";//工单号
    SqlFiter += params.materielName ? " and materialName like '%" + params.materielName + "%'" : ""; //物料描述
    if(isDebug){console.debug(SqlFiter,params)}
    eamDB.execute(db, selectMaterial + SqlFiter + " limit " + skipR + ",5").then(function (res) {
      callback(res);
    }, function (err) {
      console.error(err);
    });
  }

  //获取物料列表
  function getMaterialList(callback, params) {
    var sqlFilter = [];//sql条件
    var pagerNumber = (params.pageNumber - 1) * 5;
    var where = "";
    if (StringUtils.isNotEmpty(params.materielNo)) {
      where += " and materialSno like ? ";
      sqlFilter.push("%" + params.materielNo + "%");
    }
    if (StringUtils.isNotEmpty(params.materielName)) {
      where += " and materialName like ? ";
      sqlFilter.push("%" + params.materielName + "%");
    }
    where += " limit ?,5";
    sqlFilter.push(pagerNumber);
    if(isDebug){console.debug(sqlFilter,params)}
    eamDB.execute(db, selectMaterial + where, sqlFilter).then(function (res) {
      callback(res);
    }, function (err) {
      console.error(err);
    });
  }

//获取单个物料
  function getMaterialById(id, callback) {
    eamDB.execute(db, selectMaterialById, [id]).then(function (res) {
      callback(res);
    }, function (err) {
      console.error(err);
    });
  }

  //附件方法
  function downloadImg(file) {
    $injector.get('eamSync').downloadFile(file.fileId, function (image) {
      file.filePath = image.filePath;
    });
  };

  //获取消耗物料列表
  function getMaterial(obj) {
    eamDB.execute(db, selectMaterialById, [obj.materialId]).then(function (res) {
      if (res.rows.length > 0) {
        obj.material = res.rows[0];
      }
    }, function (err) {
      console.error(err);
    });
  }


  /****************图片相关处理功能****************/
  /**
   * 图片上传功能不是在这里实现的。
   */
  function addeditAttachment(fileList, fileItem) {
    eamFile.getPicture(fileItem, function (item) {
      if (item&&angular.isObject(item)) {
        fileList.push(item);
        console.log(JSON.stringify(fileList,undefined,2));
      }
    });
  }

  var queryMachinesByProjectId = function (projectId, callback) {
    Popup.waitLoad("请稍后..");
    eamDB.execute(db, queryMachinesSql, [projectId + ""]).then(function (res) {
      Popup.hideLoading();
      if ($.isFunction(callback)) {
        callback(ChangeSQLResult2Array(res));
      }
    }, function (error) {
      Popup.hideLoading();
      console.error(error);
      if ($.isFunction(callback)) {
        $injector.get("eamSync").synclog("查询风机列表出错！");
        callback([]);
      }
    });
  };


  return {
    //选择图片
    addeditAttachment: addeditAttachment,
    //附件方法
    downloadImg: downloadImg,
    //获取物料列表
    getMaterialList: getMaterialList,
    //获取物料信息
    getMaterial: getMaterial,
    //根据id获取物料
    getMaterialById: getMaterialById,
    //获取物料信息
    getMaterialPageList: getMaterialPageList,
    //根据字典id获取字典项
    getDicDetailById: getDicDetailById,
    //修改工单json
    changeWorkOrderJson: changeWorkOrderJson,
    //根据全部列表获取部分数据
    getListFormAllList: getListFormAllList,
    //更改工单状态
    changeWorkOrderStatus: changeWorkOrderStatus,
    //删除工单记录
    deleteWorkOrderRecord: deleteWorkOrderRecord,
    //构建工单对象
    createWorkorders: createWorkorders,
    //获取工单列表
    loadMore: loadMore,
    //sql结果转array
    ChangeSQLResult2Array: ChangeSQLResult2Array,
    //根据type获取字典列表
    getDicListByType: getDicListByType,
    //工单创建或修改方法
    updateOrInsert: updateOrInsert,
    //检查网络并且上传
    uploadIfOnline: uploadIfOnline,
    //查询风机列表,提供用户选择
    queryMachinesByProjectId: queryMachinesByProjectId,
    //获取未处理工单个数
    getOrderProcessCount: function (callback) {
      var checksql = "SELECT * FROM sqlite_master where type='table' and name='eam_sync_schdlemaintain'";
      //检查数据库表是否存储
      eamDB.execute(db, checksql).then(function (res) {
        if (res.rows.length > 0) {
          var getUnHandleWorkOrderCout = "select count(workorderId) as sum from eam_sync_schdlemaintain where workorderStatus=41 and workorderType in (37,38)";
          eamDB.execute(db, getUnHandleWorkOrderCout).then(function (res) {
            callback(res.rows.item(0).sum);
          }, function (err) {
            console.error(err);
          });
        }
      });
    }
    ,
    /**
     * 同步工单
     * @param {Object} callback
     * @param {Object} orderId
     */
    synchronizeOrder: function (callback, orderId) {
      synchronizeOrder(callback, orderId);
    },

    /**
     * 清空指定工单号的缓存
     * @param {Object} callback
     * @param {Object} orderId
     */
    clearCacheData: function (callback, orderId) {
      DataCache.clearOrderCache(callback, orderId);
    }
  };
});
