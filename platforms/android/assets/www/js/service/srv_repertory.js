/**
 * 库存查询服务
 */
starter.factory('ServiceRepertory', function(OrderService, eamDB) {


    var list = function(page, search, callback){
        var skipR = (page - 1) * 5;
        var params = [];
        var where = "";
        if(StringUtils.isNotEmpty(search.materialSno)){
            where += " and materialSno like ?";
            params.push("%"+ search.materialSno +"%");
        }
        if(StringUtils.isNotEmpty(search.materialName)){
            where += " and materialName like ?";
            params.push("%"+ search.materialName +"%");
        }
        if(StringUtils.isNotEmpty(search.machineModel)){
            where += " and machineModel like ?";
            params.push("%"+ search.machineModel +"%");
        }
        if(StringUtils.isNotEmpty(search.materialVendor)){
            where += " and materialVendor like ?";
            params.push("%"+ search.materialVendor +"%");
        }
        if(StringUtils.isNotEmpty(search.materialSuite)){
            where += " and materialSuite like ?";
            params.push("%"+ search.materialSuite +"%");
        }

        params.push(skipR);
        var sql = "select * from eam_sync_material where 1=1 "+ where +" limit ?, 5";
        eamDB.execute(db, sql, params).then(function(res){
            list = OrderService.ChangeSQLResult2Array(res);
            for(var i in list){
                list[i].json = JSON.parse(list[i].json);
            }
            callback(list);
        }, function(err){
            console.log(err);
        });
    };

    var get = function(id, callback){
        var sql = "select * from eam_sync_material where materialId=?";
        eamDB.execute(db, sql, [id]).then(function(res){
            if(res.rows.length>0){
                callback(res.rows.item(0));
            }else{
                callback();
            }
        }, function(err){
            console.log(err);
        });
    };


    var update = function(material, callback){
        var json = angular.toJson(material);
        var sql = "update eam_sync_material set json=? where materialId=?";
        eamDB.execute(db, sql, [json, material.materialId]).then(function(res){
            callback();
        }, function(err){
            callback();
        });
    };

	return {
        list:list,
        get:get,
        update:update
	};
});
