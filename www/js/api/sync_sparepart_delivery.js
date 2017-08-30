/**
 * 调拨单同步服务。
 */
angular.module('starter.SyncSparepartDelivery', [])
  .factory("SyncSparepartDelivery", function ($q, eamDB, $injector,Storage, Popup,eamSyncAjax) {
    var Api_getShippingOrderDtoList = baseUrl + "/api/sparepart/getShippingOrderDtoList.api"; //根据时间段获取备件发货单信息
    var tableName = 'eam_sync_sparepart_delivery';
    var insertsql = "insert into eam_sync_sparepart_delivery" +
      " (receivingTime,transferOrderId,shippingOrderNo,shippingMethod,materialNo,materialComment," +
      " statusId,createOn,json,lastUpdateDatetimeApi,lastUpdateDatetimeApp," +
      " uploadStatus,downloadStatus,giWhName,grWhName,transferOrderNo," +
      " grWhId,giWhId,shippingOrderId)" +
      " values" +
      " (?,?,?,?,?, " +
      " ?,?,?,?,?,?," +
      " ?,?,?,?,?," +
      " ?,?,?)";

    var updatesql = "update eam_sync_sparepart_delivery set " +
      "receivingTime=?,transferOrderId=?,shippingOrderNo=?,shippingMethod=?,materialNo=?,materialComment=?," +
      " statusId=?,createOn=?,json=?,lastUpdateDatetimeApi=?,lastUpdateDatetimeApp=?," +
      " uploadStatus=?,downloadStatus=?,giWhName=?,grWhName=?,transferOrderNo=?," +
      " grWhId=?,giWhId=?" +
      " where shippingOrderId=?";
    /**
     * 更新json对象
     * @type {string}
     */
    var update_json_sql = "update eam_sync_sparepart_delivery set json=? where shippingOrderId=? ";
    /**
     * 更新上传状态为不需要上传了
     * @type {string}
     */
    var update_success_sql = "update eam_sync_sparepart_delivery set uploadStatus=0 where shippingOrderId=? ";

    var selectsql = "select shippingOrderId from eam_sync_sparepart_delivery where shippingOrderId=? ";

    var select_update_one = "select * from eam_sync_sparepart_delivery where uploadStatus=1 lIMIT 1";

    var nowPage = 0;
    var downloadParams;


    var uploadList = function (begintime, endtime, callback) {
      callback();
    };
    var downloadList = function (begintime, endtime, callback) {
      //增量更新
      downloadParams = {
        startDate: begintime,
        endDate: endtime,
        projectId:Storage.getSelectedProject().projectId,
        page:1
      };
      async.doWhilst(iterateeAction,function(args){
        //console.log(args);
        return args>0;
      },function(err){
        if(err){
          callback(false,err);
        }else{
          callback(true);
        }
      });
    };
    function iterateeAction(callback){
      Popup.waitLoad("正在加载发货单数据...");
      nowPage++;
      downloadParams["page"] = nowPage;
      eamSyncAjax.doPost(Api_getShippingOrderDtoList, downloadParams, function (res) {
        Popup.eamSyncHideLoading();
        if (res.success) {
          var data = res.data;
          if(data.length==0){
            return callback(null,data.length);
          }
          dbActions(data).then(function(){
          callback(null,data.length)
          },function(err){callback(err)});
        } else {
          callback(res);
        }
      },{timeout:60*1000});
    }
    function dbActions(spareparts){
      var defer = $q.defer();
      var delIds = [];
      var bindings =[];
      spareparts.forEach(function(sparepart){
        delIds.push(sparepart["shippingOrderId"]);
        var values = [];
        values.push(angular.isDate(sparepart["receivingTime"])?sparepart["receivingTime"].getTime():sparepart["receivingTime"]);
        values.push(sparepart["transferOrderId"]);
        values.push(sparepart["shippingOrderNo"]);
        values.push(sparepart["shippingMethod"]);
        var materialNo = "";
        var materialComment = "";
        for (var i in sparepart["tranferOrderItemDtoList"]) {
          materialNo += sparepart["sOrderItemDtoList"][i]["materialSno"] + ",";
          materialComment += sparepart["sOrderItemDtoList"][i]["materialName"] + ",";
        }
        values.push(materialNo);//从列表中获取组合数据模糊查询。
        values.push(materialComment);//从列表中获取组合数据模糊查询。
        values.push(sparepart["statusId"]);
        values.push(sparepart["createOn"]);
        values.push(JSON.stringify(sparepart));
        values.push(new Date().getTime());
        values.push(new Date().getTime());
        values.push(0);//uploadStatus，是否需要往服务器同步，1为需求，0为不需要
        values.push(1);//downloadStatus，是否是从服务器下载，默认为1，日常操作不需要修改此字段。
        values.push(sparepart["giWhName"]);//调入调出方
        values.push(sparepart["grWhName"]);//调入调出方
        values.push(sparepart["transferOrderNo"]);//调入调出方
        values.push(sparepart["grWhId"]);//转办仓库
        values.push(sparepart["giWhId"]);//转办仓库
        values.push(sparepart["shippingOrderId"]);//调拨单id
        bindings.push(values);
      });
      eamDB.execute(db,'delete from '+tableName+' where shippingOrderId in ('+delIds+")")
        .then(function(){
          eamDB.insertCollection(db,insertsql,bindings)
            .then(function(){
              defer.resolve();
            },function(err){
              defer.reject(err);
            });
        },function(err){
          defer.reject(err);
        });
      return defer.promise;
    }
    return {
      downloadList: downloadList,
      uploadList: uploadList,
      dbActions:dbActions
    }
  });
