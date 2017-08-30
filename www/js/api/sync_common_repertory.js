/**
 * 调拨单同步服务。
 */
angular.module('starter.SyncRepertory', [])
  .factory("SyncRepertory", function ($q, $injector, eamSyncAjax, Storage, $ionicBackdrop, Popup) {
    var Api_getRepertory = baseUrl + "/api/common/getRepertory.api"; //根据时间段获取调拨单信息

    /**
     * 根据时间段下载调拨单信息
     * @param begintime
     * @param endtime
     * @param callback
     */
    var downloadList = function (begintime, endtime, callback) {
      Popup.waitLoad("正在同步仓库信息数据......");
      eamSyncAjax.doPost(Api_getRepertory, {}, function (res) {
        console.log(res);
        Popup.eamSyncHideLoading();
        if (res.success) {
          Storage.setRepertory(res.data);
          callback(true);
        } else {
          $injector.get("eamSync").synclog("获取仓库信息失败");
          $injector.get("eamSync").stopSync();
          callback();
        }

      });
    };

    return {
      downloadList: downloadList
    }
  });
