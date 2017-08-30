/**
 *
 * Created by Manbiao.Huang on 13-Dec-16.
 */
starter.factory("DeviceTreeService", function (eamDB, Storage, OrderService, SchdleMaintainApi) {
  var queryProjectsSql = "select distinct project_id,project_name from eam_machine_equipment;";
  var queryAreasSql = "select distinct areaCode,areaName from eam_machine_equipment;";
  var querySpecEquipmentDetailsSql = 'select * from eam_machine_equipment_detail where id=?;';
  var querySpecMachineSql = 'select * from eam_machine_equipment where project_id=? and position_code = ?;';
  var queryProjects = function (callback) {
    eamDB.execute(db, queryProjectsSql).then(function (res) {
      if ($.isFunction(callback)) {
        callback(OrderService.ChangeSQLResult2Array(res));
      }
    }, function (error) {
      console.log(error);
    });
  };
  var queryAreas = function (callback) {
    eamDB.execute(db, queryAreasSql).then(function (res) {
      if ($.isFunction(callback)) {
        callback(OrderService.ChangeSQLResult2Array(res));
      }
    }, function (error) {
      console.log(error);
    });
  };

  function getAllDataOfFanEquipments(pageNum, search, callback) {
    // console.log(search,pageNum);
    var skipR = (pageNum - 1) * 5;
    var params = [];
    var where = "";
    if (StringUtils.isNotEmpty(search.machinePositionNo)) {
      where += " and position_code like ?";
      params.push("%"+search.machinePositionNo+"%" );
    }
    if (StringUtils.isNotEmpty(search.machineId)) {
      where += " and machine_id like ?";
      params.push("%" + search.machineId + "%");
    }
    if (StringUtils.isNotEmpty(search.projectId)) {
      where += " and project_id =?";
      params.push(search.projectId);
    }
    if (StringUtils.isNotEmpty(search.areaCode)) {
      where += " and areaCode = ?";
      params.push(search.areaCode);
    }
    params.push(skipR);
    var sql = "select * from eam_machine_equipment where 1=1 " + where + " order by position_id limit ?,5 ";
    eamDB.execute(db, sql, params).then(function (res) {
      var list = OrderService.ChangeSQLResult2Array(res);
      callback(list);
    }, function (err) {
      callback([]);
      console.error(err);
    });
  }

  var querySpecEquipmentDetails = function (id, callback) {
    eamDB.execute(db, querySpecEquipmentDetailsSql, [id]).then(function (res) {
      if ($.isFunction(callback)) {
        if (res.rows.length > 0) {
          callback(res.rows.item(0));
        }else {
          callback();
        }
      }
    }, function (error) {
      console.error(error)
    });
  };
  var querySpecEquipmentsByPositionId = function (projectId,positionCode, callback) {
    eamDB.execute(db, querySpecMachineSql, [projectId+"",positionCode+""]).then(function (res) {
      if ($.isFunction(callback)) {
        if (res.rows.length > 0) {
          callback(res.rows.item(0));
        }else {
          callback();
        }
      }
    }, function (error) {
      console.error(error)
    });
  };
  return {
    getAllDataOfFanEquipments: getAllDataOfFanEquipments,
    queryProjects: queryProjects,
    queryAreas: queryAreas,
    querySpecEquipmentDetails: querySpecEquipmentDetails,
    querySpecEquipmentsByPositionId: querySpecEquipmentsByPositionId
  }
});
