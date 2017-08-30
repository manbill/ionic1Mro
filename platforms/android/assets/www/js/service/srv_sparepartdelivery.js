/**
 * 发货单香菇你功能。
 */
starter.factory('ServiceSparepartDelivery', function ($rootScope,OrderService, eamDB,Popup, Storage, eamSyncAjax, SyncSparepartDelivery) {
  var tableName = "eam_sync_sparepart_delivery";
  var api_getShippingOrderById = baseUrl + "/api/sparepart/getShippingOrderById.api";
  var listSparepart = function (page, search, callback) {
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
      params.push(search.createOnBegin.getTime());
    }
    if (StringUtils.isNotEmpty(search.createOnEnd)) {
      where += " and createDate <= ?";
      params.push(search.createOnEnd.getTime());
    }

    params.push(skipR);

    //发货权限，看是否是调出方，是调出方才能发货，只显示有发货仓库权限的调拨单信息。
    var repertorys = Storage.getRepertory();
    var ids = "";
    for (var j in repertorys) {
      var repertory = repertorys[j];
      ids += repertory.repertoryId + ",";
    }
    if (ids.length > 0) {
      ids = ids.substring(0, ids.length - 1);
    }
    var auth = " and giWhId in (" + ids + ")";

    var sql = "select * from eam_sync_sparepart where 1=1 " + where + auth + " order by transferOrderId desc limit ?, 5";
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
      params.push(search.transferOrderNo);
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

    var sql = "select * from eam_sync_sparepart_delivery where 1=1 " + where + " order by expectReceiveDateTime,shippingOrderId desc limit ?, 5";
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

  function findDeliveryOrder(orderId, callback) {
    var params = {
      shippingOrderId: orderId
    };
    if ($rootScope.isOnline) {
      Popup.waitLoad();
      eamSyncAjax.doPost(api_getShippingOrderById, params, function (res) {
        Popup.hideLoading();
        console.log(res);
        if (res.success) {
          var shippingOrder = res.data.dataObject;
          SyncSparepartDelivery.dbActions([shippingOrder])
            .then(function () {
              if (angular.isFunction(callback)) {
                callback(shippingOrder);
              }
            }, function (err) {
              console.error(err);
              if (angular.isFunction(callback)) {
                callback(false, "更新发货单缓存数据失败");
              }
            });
        } else if (angular.isFunction(callback)) {
          callback(false, "获取发货单信息错误<br/>" + res.retInfo);
        }
      })
    } else {
      var sql = "select * from " + tableName + " where shippingOrderId=?";
      eamDB.execute(db, sql, [+orderId]).then(function (res) {
        if (res.rows.length > 0) {
          var shippingOrder = res.rows.item(0);
          if (angular.isFunction(callback)) {
            callback(shippingOrder);
          }
        } else if (angular.isFunction(callback)) {
          callback(false, "没有离线数据");
        }
      })
    }
  }

  return {
    listSparepart: listSparepart,
    list: list,
    findDeliveryOrder: findDeliveryOrder
  };
});
