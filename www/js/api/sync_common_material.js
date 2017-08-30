/**
 * 公用基础数据下载。
 */
angular.module('starter.SyncCommonMaterial', [])
  .factory("SyncCommonMaterial", function ($q, eamDB, $injector, OrderService, Popup, Storage, cfpLoadingBar, eamSyncAjax) {

    var Api_getMaterial = baseUrl + "/api/common/getMaterial.api"; //获取数据。
    var tableName = "eam_sync_material";
    var insert_eam_sync_material_sql = "insert into eam_sync_material (materialName, unit, materialSno, materialType, " +
      "materialTypeText, materialSuite, machine_model,materialFileid," +
      "materialValue,marterialExpiredate,materialComment,unitText," +
      "materialSupplier,materialFilePath,qrcodeFileid,materialQrFilePath," +
      "material_replace,comment,materialVendor,machineModel," +
      "machineModelId,materialReplace,activeFlag,sapInventoryFlag,json, " +
      "materialId) " +
      "values (?,?,?,?," +
      "?,?,?,?," +
      "?,?,?,?," +
      "?,?,?,?," +
      "?,?,?,?," +
      "?,?,?,?," +
      "?,?)";

    var update_eam_sync_material = "update eam_sync_material set materialName=?, unit=?, materialSno=?, materialType=?, " +
      "materialTypeText=?, materialSuite=?, machine_model=?,materialFileid=?," +
      "materialValue=?,marterialExpiredate=?,materialComment=?,unitText=?," +
      "materialSupplier=?,materialFilePath=?,qrcodeFileid=?,materialQrFilePath=?," +
      "material_replace=?,comment=?,materialVendor=?,machineModel=?," +
      "machineModelId=?,materialReplace=?,activeFlag=?,sapInventoryFlag=?,json=?" +
      " where materialId=? ";


    var select_eam_sync_material_byid = "select * from eam_sync_material where materialId=? ";
    /**
     * 检查当前表中是否有数据
     * @type {string}
     */
    var select_eam_sync_local_material = "select * from eam_sync_material";

    /**
     * 分页下载数据
     * @type {number}
     */
    var nowPage = 0;
    var totalMaterialNum = 35067;//2017年7月6日18:15:52测试数据大概这个数
    var downLoadNumbers = 1000;//后台每次下载的数据量
    /**
     * 回调方法暂存值
     */
    var callbackFunc;
    /**
     * 下载数据的时间对象
     */
    var downloadParams;

    /**
     * 根据时间段下载工单列表
     * @param begintime
     * @param endtime
     * @param eamSyncCallback 成功传入true
     */
    var downloadList = function (begintime, endtime, eamSyncCallback) {
      cfpLoadingBar.complete();//原因是，在eamSync#sync函数中已经为每一个同步函数调用了start方法
      cfpLoadingBar.autoIncrement = false;//不需要自动增加进度条
      cfpLoadingBar.startSize = 0;
      cfpLoadingBar.start();
      Popup.waitLoad("正在同步物料信息数据......");
      nowPage = 1;
      downloadParams = {
        startDate: begintime,
        endDate: endtime
      };
      async.doDuring(downloadListPage, function (args, callback) {
        // console.log(args);
        return callback(null, args > 0);
      }, function (err) {
        cfpLoadingBar.complete();
        if (err) {
          eamSyncCallback(false, err);
        } else {
          eamSyncCallback(true);
        }
      });
    };
    /**
     * 分页下载物料信息
     */
    var downloadListPage = function (callback) {
      Popup.waitLoad("正在下载物料详情...");
      //分页更新数据
      downloadParams["page"] = nowPage;
      // console.log(downloadParams);
      eamSyncAjax.doPost(Api_getMaterial, downloadParams, function (res) {
        if (res.success) {
          var data = res.data;
          downLoadNumbers = data.length;//后台每次传递的物料数量
          cfpLoadingBar.set(nowPage * downLoadNumbers / totalMaterialNum);//设置进度条
          nowPage++;
          var promise = dbOperations(data);
          promise.then(function () {
            callback(null, data.length);
          }, function (err) {
            console.error(err);
            callback(err);
          });
        } else {
          callback(res || "获取物料信息数据失败");
        }
      }, {timeout: 1000 * 120});
    };

    function dbOperations(itemList) {
      var defer = $q.defer();
      if (!window.cordova) {
        updateOrInsert(itemList, function (res, insertBindings, updateBindings) {
          var insertDefer = $q.defer();
          var updateDefer = $q.defer();
          if (res == true) {
            if (insertBindings.length > 0) {
              // var startInsert = new Date;
              eamDB.insertCollection(db, insert_eam_sync_material_sql, insertBindings).then(function () {
                // Popup.waitLoad("执行插入数据耗时：" + (new Date - startInsert) + " ms");
                // console.log("执行插入数据耗时：" + (new Date - startInsert) + " ms");
                insertDefer.resolve("插入数据成功");
              }, function (err) {
                console.error(err);
                insertDefer.reject(err);
              });
            } else {
              insertDefer.resolve("没有数据插入");
            }
            if (updateBindings.length > 0) {
              // var startUpdate = new Date;
              eamDB.insertCollection(db, update_eam_sync_material, updateBindings).then(function () {
                // Popup.waitLoad("更新数据耗时：" + (new Date - startUpdate) + " ms");
                // console.log("更新数据耗时：" + (new Date - startUpdate) + " ms");
                updateDefer.resolve("更新物料成功");
              }, function (err) {
                console.error(err);
                updateDefer.reject(err);
              });
            } else {
              updateDefer.resolve("更新数据完成");
            }
            $q.all(insertDefer, updateDefer)
              .then(function (res) {
                // console.log(res);
                defer.resolve("物料操作完成");
              }, function (err) {
                console.log(err);
                defer.reject(err || "物料操作失败");
              }, function (progress) {
                console.log(progress);
              });
          } else {
            defer.reject(insertBindings)
          }
        });

      } else {//手机上
        var sqlBatch = [];
        Popup.waitLoad("正在更新物料数据...");
        for (var i = 0; i < itemList.length; i++) {
          var item = itemList[i];
          var value = [];
          value.push(item["materialName"]);
          value.push(item["unit"]);
          value.push(item["materialSno"]);
          value.push(item["materialType"]);
          value.push(item["materialTypeText"]);
          value.push(item["materialSuite"]);
          value.push(item["machine_model"]);
          value.push(item["materialFileid"]);
          value.push(item["materialValue"]);
          value.push(item["marterialExpiredate"]);
          value.push(item["materialComment"]);
          value.push(item["unit"]);
          value.push(item["materialSupplier"]);
          value.push(item["materialFilePath"]);
          value.push(item["qrcodeFileid"]);
          value.push(item["materialQrFilePath"]);
          value.push(item["material_replace"]);
          value.push(item["comment"]);
          value.push(item["materialVendor"]);
          value.push(item["machineModel"]);
          value.push(item["machineModelId"]);
          value.push(item["materialReplace"]);
          value.push(item["activeFlag"]);
          value.push(item["sapInventoryFlag"]);
          value.push(JSON.stringify(item));
          value.push(item["materialId"]);
          sqlBatch.push(["delete from eam_sync_material where materialId=?",[item["materialId"]]]);
          sqlBatch.push([insert_eam_sync_material_sql,value]);
        }
        eamDB.sqlBatch(sqlBatch)
          .then(function (res) {
            defer.resolve(res);
          })
          .catch(function (err) {
            Popup.hideLoading();
            console.error(JSON.stringify(err));
            defer.reject(err);
            // Popup.promptMsg(JSON.stringify(err));
          })
      }


      return defer.promise;
    }

    var updateOrInsert = function (itemList, callback) {
      Popup.waitLoad("正在更新数据库信息...");
      if (itemList.length == 0) {
        return callback(true, [], []);
      }
      var ids = [];
      var insertBindings = [];
      itemList.forEach(function (item) {
        var value = [];
        value.push(item["materialName"]);
        value.push(item["unit"]);
        value.push(item["materialSno"]);
        value.push(item["materialType"]);
        value.push(item["materialTypeText"]);
        value.push(item["materialSuite"]);
        value.push(item["machine_model"]);
        value.push(item["materialFileid"]);
        value.push(item["materialValue"]);
        value.push(item["marterialExpiredate"]);
        value.push(item["materialComment"]);
        value.push(item["unit"]);
        value.push(item["materialSupplier"]);
        value.push(item["materialFilePath"]);
        value.push(item["qrcodeFileid"]);
        value.push(item["materialQrFilePath"]);
        value.push(item["material_replace"]);
        value.push(item["comment"]);
        value.push(item["materialVendor"]);
        value.push(item["machineModel"]);
        value.push(item["machineModelId"]);
        value.push(item["materialReplace"]);
        value.push(item["activeFlag"]);
        value.push(item["sapInventoryFlag"]);
        value.push(JSON.stringify(item));
        value.push(item["materialId"]);
        ids.push(item["materialId"]);
        insertBindings.push(value);
      });
      // var delStart = new Date;
      eamDB.execute(db, "delete from eam_sync_material where materialId in (" + ids + ") ")
        .then(function () {
          // Popup.waitLoad("删除数据使用时间：" + (new Date - delStart) + " ms");
          // console.log("删除数据使用时间：" + (new Date - delStart) + " ms");
          callback(true, insertBindings, []);
        }, function (err) {
          console.error(err);
          callback(false, err);
        });
    };

    return {
      downloadList: downloadList
    }
  });
