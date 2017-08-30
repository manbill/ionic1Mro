/**
 * Created by Administrator on 2017/3/10.
 */
angular.module('starter.SyncCommonManual', [])
  .factory("SyncCommonManual", function (eamSyncAjax, SyncSchdlemaintain, OrderService, eamDB, $injector, Popup, Storage) {
    var get_common_manual_url = baseUrl + '/api/getManualInfoList.api';
    var insertSql = 'insert into eam_manual(manualId,manualJson)values(?,?);';
    var updateSql = 'update eam_manual set manualJson=? where manualId=?';

    function doAction(array, oldManualIds, updateBindings, insertBindings, callback) {//批量进行数据库操作
      array.forEach(function (item) {
        var values = [];
        var isUpdate = false;
        values.push(+item['manualInfoDTO']['manualId']);
        values.push(JSON.stringify(item));
        for (var i = 0; i < oldManualIds.length; i++) {
          var oldItemId = oldManualIds[i];
          if (oldItemId == +item['manualInfoDTO']['manualId']) {//更新本地数据
            values = [];
            values.push(JSON.stringify(item));
            values.push(oldItemId);
            oldManualIds.splice(i, 1);//删除一个
            updateBindings.push(values);
            isUpdate = true;
            break;
          }
        }
        if (!isUpdate) {
          insertBindings.push(values);
        }
      });
      var errorMessage = "批量处理指导书";
      SyncSchdlemaintain.bachInsertOrUpdate(insertBindings, updateBindings, insertSql, updateSql, errorMessage, function () {
        callback();
      })
    }

    return {
      getCommonManual: function (last_update_time, now_server_date, eamSyncCallback) {
        var params = {
          page: -1,
          startDate: new Date(last_update_time).format("yyyy-MM-dd hh:mm:ss"),
          endDate: new Date(now_server_date).format("yyyy-MM-dd hh:mm:ss")
        };
        var bufferArray = [];//
        var bufferCount = 5;
        var oldManualIds = [];//本地数据
        var updateOrInsert = function (array, callback) {
          var updateBindings = [];
          var insertBindings = [];
          if (oldManualIds.length == 0) {
            eamDB.execute(db, "select * from eam_manual")
              .then(function (res) {
                res = OrderService.ChangeSQLResult2Array(res);
                res.forEach(function (manual) {
                  oldManualIds.push(manual['manualId']);
                });
                doAction(array, oldManualIds, updateBindings, insertBindings, callback);
              });
          } else {
            doAction(array, oldManualIds, updateBindings, insertBindings, callback);
          }
        };
        downloadManual(params);//该方法是Async所以可以放在定义前
        function downloadManual(par) {
          Popup.waitLoad("正在下载指导书...");
          par.page++;
          eamSyncAjax.doPost(get_common_manual_url, par, function (response) {
            if (response.success) {
              Popup.eamSyncHideLoading();
              var data = response.data["dataObject"];
              if (data && data['manualInfoDTO']) {
                bufferArray.push(data);
                if (bufferArray.length < bufferCount) {
                  downloadManual(par);
                } else {
                  updateOrInsert(bufferArray, function () {
                    bufferArray = [];
                    downloadManual(par);
                  });
                }
              } else {
                if (bufferArray.length > 0) {
                  updateOrInsert(bufferArray, function () {
                    if ($.isFunction(eamSyncCallback))
                      eamSyncCallback(true);
                  })
                } else {
                  if ($.isFunction(eamSyncCallback))
                    eamSyncCallback(true);
                }
              }
            } else {
              // $injector.get("eamSync").synclog("获取指导书失败，请检查网络!");
              if ($.isFunction(eamSyncCallback)) {
                eamSyncCallback(false,"获取指导书失败，请检查网络!");
              }
            }
          },{timeout:60*1000});
        }
      }
    }
  });
