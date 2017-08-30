/**
 * 库存查询服务
 */
starter.factory('ServiceMaterial', function (OrderService, eamDB) {


  var list = function (page, search, callback) {
    var skipR = (page - 1) * 20;
    var params = [];
    var where = "";
    if (search.excludedMaterielIds && search.excludedMaterielIds.length > 0) {
      where += " and materialId not in (" + search.excludedMaterielIds + ") "
    }
    if (StringUtils.isNotEmpty(search.materielNo)) {
      where += " and materialSno like ?";
      params.push("%" + search.materielNo + "%");
    }
    if (StringUtils.isNotEmpty(search.materielName)) {
      where += " and materialName like ?";
      params.push("%" + search.materielName + "%");
    }
    params.push(skipR);
    var sql = "select * from eam_sync_material where 1=1 " + where + " limit ?, 20";
    eamDB.execute(db, sql, params).then(function (res) {
      list = OrderService.ChangeSQLResult2Array(res);
      for (var i in list) {
        list[i].json = JSON.parse(list[i].json);
      }
      callback(list);
    }, function (err) {
      console.log(err);
    });
  };
 function findMaterial(materialId,callback) {
   var sql = 'select * from eam_sync_material where materialId=?';
   eamDB.execute(db,sql,[+materialId]).then(function (res) {
     if(res.rows.length>0&&angular.isFunction(callback)){
       var material = res.rows.item(0);
       // console.log("查找的物料",material);
       callback(material);
     }else if(angular.isFunction(callback)){
       callback();
     }
   });
 }
  return {
    list: list,
    findMaterial:findMaterial
  };
});
