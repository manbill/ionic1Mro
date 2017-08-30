/**
 * 发货单香菇你功能。
 */
starter.factory('ServiceSparepartReceive', function (OrderService, eamDB, Storage) {
    var list = function (page, search, callback) {
        var skipR = (page - 1) * 5;
        var params = [];
        var where = "";
        if (StringUtils.isNotEmpty(search.transferOrderId)) {
            where += " and transferOrderId = ?";
            params.push(search.transferOrderId);
        }
        if (StringUtils.isNotEmpty(search.transferOrderNo)) {
            where += " and transferOrderNo like ?";
            params.push("%" + search.transferOrderNo + "%");
        }
        if (StringUtils.isNotEmpty(search.workorderCode)) {
            where += " and workorderCode like ?";
            params.push("%" + search.workorderCode + "%");
        }
        if (StringUtils.isNotEmpty(search.shippingOrderNo)) {
            where += " and shippingOrderNo like ?";
            params.push("%" + search.shippingOrderNo + "%");
        }
        if (StringUtils.isNotEmpty(search.materialSno)) {
            where += " and materialNo like ?";
            params.push("%" + search.materialSno + "%");
        }
        if (StringUtils.isNotEmpty(search.materialName)) {
            where += " and materialComment like ?";
            params.push("%" + search.materialName + "%");
        }
        if (StringUtils.isNotEmpty(search.statusId)) {
            where += " and statusId = ?";
            params.push(search.statusId);
        }
        if (StringUtils.isNotEmpty(search.createOnBegin)) {
            where += " and createOn >= ?";
            params.push(search.createOnBegin.getTime());
        }
        if (StringUtils.isNotEmpty(search.createOnEnd)) {
            where += " and createOn <= ?";
            params.push(search.createOnEnd.getTime());
        }

        params.push(skipR);
        //看当前用户是否有调入方仓库权限，只看当前用户有权限的仓库信息。
        var repertorys = Storage.getRepertory();
        var ids = "";
        for (var j in repertorys) {
            var repertory = repertorys[j];
            ids += repertory.repertoryId + ",";
        }
        if (ids.length > 0) {
            ids = ids.substring(0, ids.length - 1);
        }
        var auth = " and grWhId in (" + ids + ")";

        var sql = "select * from eam_sync_sparepart where 1=1 " + where + auth + " order by shippingOrderId desc limit ?, 5";
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

    return {
        list: list
    };
});