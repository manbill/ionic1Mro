/**
 * 调拨单服务
 */
starter.factory('ServiceSparepart', function (OrderService, eamDB, eamSyncAjax, Popup, Storage) {
  var workOder4sparepartInfoListApi = baseUrl + '/api/sparepart/getWorkOderInfoList.api';
  var projectIds = Storage.getProjects()
    .map(function (pro) {
      return pro.projectId
    });//用户的项目
  var repertorys = [];
  angular.forEach(Storage.getRepertory(), function (val, key) {
    if (val.selProjects) {
      for (var i = 0; i < projectIds.length; i++) {
        if (val.selProjects.indexOf(projectIds[i]) !== -1) {
          console.log(val);
          repertorys.push(val);
          break;
        }
      }
    }
  });
  if (isDebug) {
    console.log("projectIds", projectIds);
  }
  var ids = "";
  for (var j in repertorys) {
    var repertory = repertorys[j];
    ids += repertory.repertoryId + ",";
  }
  if (ids.length > 0) {
    ids = ids.substring(0, ids.length - 1);
  }
  var list = function (page, search, callback) {
    var skipR = (page - 1) * 5;
    var params = [];
    var where = "";
    if (StringUtils.isNotEmpty(search.transferOrderNo)) {
      where += " and transferOrderNo like ?";
      params.push("%" + search.transferOrderNo + "%");
    }
    if (StringUtils.isNotEmpty(search.transferTypeId)) {
      where += " and transferTypeId = ?";
      params.push(search.transferTypeId);
    }
    if (StringUtils.isNotEmpty(search.materialNo)) {
      where += " and materialNo like ?";
      params.push("%" + search.materialNo + "%");
    }
    if (StringUtils.isNotEmpty(search.materialComment)) {
      where += " and materialComment like ?";
      params.push("%" + search.materialComment + "%");
    }
    if (StringUtils.isNotEmpty(search.statusId)) {
      where += " and statusId = ?";
      params.push(search.statusId);
    } else if (search.isDefaultSearch) {
      where += " and statusId not in(176,174)";
    }
    if (StringUtils.isNotEmpty(search.workorderCode)) {
      where += " and workorderCode like ?";
      params.push("%" + search.workorderCode + "%");
    }
    if (StringUtils.isNotEmpty(search.transferReasonId)) {
      where += " and transferReasonId = ?";
      params.push(search.transferReasonId);
    }
    if (StringUtils.isNotEmpty(search.createOnBegin)) {
      where += " and createDate >= ?";
      params.push(search.createOnBegin.getTime()+"");
    }
    if (StringUtils.isNotEmpty(search.createOnEnd)) {
      where += " and createDate <= ?";
      params.push(search.createOnEnd.getTime()+"");
    }
    params.push(skipR);
    //调拨单查看，只看是否有调入仓库、shiftWarehouseId仓库权限的
    var auth = " and (grWhId in (" + ids + ") or shiftWarehouseId in (" + ids + ") )";//转办仓库id,0代表非转办
    var sql = "select * from eam_sync_sparepart where 1=1 " + where + auth + " order by createDate desc limit ?, 5";
    console.log("调拨单查询", search, params);
    eamDB.execute(db, sql, params).then(function (res) {
      list = OrderService.ChangeSQLResult2Array(res);
      for (var i in list) {
        list[i].json = JSON.parse(list[i].json);
      }
      callback(list);
    }, function (err) {
      console.error(err);
    });
  };

  var get = function (id, callback) {
    var sql = "select * from eam_sync_sparepart where transferOrderId=?";
    eamDB.execute(db, sql, [id]).then(function (res) {
      if (res.rows.length > 0) {
        callback(res.rows.item(0));
      } else {
        callback();
      }
    }, function (err) {
      console.log(err);
    });
  };

  /**
   * 查询工单
   * @param page
   * @param search
   * @param callback
   */
  var listWorkOrder = function (page, search, callback) {
    page = page <= 0 ? 1 : page;
    var skipR = (page - 1) * 5;
    var params = [];
    var where = "";
    var faultOrderBindings = [];
    var faultOrderSQL = "";
    if (StringUtils.isNotEmpty(search.projectName)) {
      where += " and projectName like ? ";
      faultOrderSQL += " and projectName like? ";
      params.push("%" + search.projectName + "%");
      faultOrderBindings.push("%" + search.projectName + "%");
    }
    if (StringUtils.isNotEmpty(search.workorderCode)) {
      where += " and workorderCode like ?";
      params.push("%" + search.workorderCode + "%");
      faultOrderSQL += " and workorderCode like ?";
      faultOrderBindings.push("%" + search.workorderCode + "%");
    }
    if (StringUtils.isNotEmpty(search.workorderTypeId)) {
      where += " and workorderType = ?";
      params.push(search.workorderTypeId + "");
      faultOrderSQL += " and workorderType = ?";
      faultOrderBindings.push(search.workorderTypeId + "");
    }
    if (StringUtils.isNotEmpty(search.createOnBegin)) {
      where += " and createOn >= ?";
      params.push(search.createOnBegin.getTime());
      faultOrderSQL += " and createOn >= ?";
      faultOrderBindings.push(search.createOnBegin.getTime());
    }
    if (StringUtils.isNotEmpty(search.createOnEnd)) {
      where += " and createOn <= ?";
      params.push(search.createOnEnd.getTime());
      faultOrderSQL += " and createOn <= ?";
      faultOrderBindings.push(search.createOnEnd.getTime());
    }
    where += " and projectId in (" + search.filterProjectIds + ") ";
    faultOrderSQL += " and projectId in (" + search.filterProjectIds + ")";
    var bindings = params.concat(faultOrderBindings);
    bindings.push(skipR);
    var ordersSql = " select * from (" +
      " select workorderStatusName, projectName,workorderTypeName,positionId,json, workorderId,workorderCode,workorderTitle,createOn " +
      " from eam_table_maintainTechInstallWorkOrder where workorderStatus <> 143  and workorderType <> 39 " + where +//过滤安装调试
      " union all " +
      " select workorderStatusName, projectName,workorderTypeName,positionId,json, workorderId,workorderCode,workorderTitle,createOn " +
      " from eam_table_faultWorkOrder where workorderStatus not in(43,42)" + faultOrderSQL +//去除已完工、已删除
      ") order by createOn desc limit ?,5 ";

    //var sql = "select * from eam_sync_schdlemaintain where 1=1 " + where + " order by createOn desc limit ?, 5";
    //if(isDebug){
    //  console.log("多项目联合查询工单SQL: "+ordersSql,bindings);
    //}
    eamDB.execute(db, ordersSql, bindings).then(function (res) {
      list = OrderService.ChangeSQLResult2Array(res);
      for (var i in list) {
        list[i].json = JSON.parse(list[i].json);
      }
      callback(list);
    }, function (err) {
      console.log(err);
    });
  };

  /**
   * 在线查询工单
   * @param searchParams
   * @param callback
   */
  function onlineList(searchParams, callback) {
    if (isDebug) {
      console.log("searchParams", searchParams);
    }
    Popup.waitLoad("正在联网查询工单信息，请稍后...");
    eamSyncAjax.doPost(workOder4sparepartInfoListApi, {
      repertoryId: searchParams.repertoryId,
      projectName: searchParams.projectName,
      projectId: searchParams.projectId,
      pagNum: searchParams.page,
      workorderTitle: searchParams.workorderTitle,
      workorderType: searchParams.workorderTypeId,
      faultBegindate: searchParams.createOnBegin ? searchParams.createOnBegin.format("yyyy-MM-dd hh:mm:ss") : null,
      faultEnddate: searchParams.createOnEnd ? searchParams.createOnEnd.format("yyyy-MM-dd hh:mm:ss") : null,
      workorderCode: searchParams.workorderCode
    }, function (res) {
      Popup.hideLoading();
      if (res.success) {
        callback(res.data.records);
      } else {
        setTimeout(function () {
          Popup.loadMsg("查询工单失败");
        })
      }
    })
  }

  return {
    list: list,
    onlineList: onlineList,
    listWorkOrder: listWorkOrder,
    get: get
  };
});
