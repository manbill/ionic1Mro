/**
 * 公用基础数据下载。
 */
angular.module('starter.SyncCommonProject', [])
  .factory("SyncCommonProject", function ($q, eamDB, $injector, Popup, Storage, $ionicBackdrop, eamSyncAjax) {

    var Api_getUserProject = baseUrl + "/api/user/getUserProject.api"; //获取数据。

    /**
     * 根据时间段下载工单列表
     * @param begintime
     * @param endtime
     * @param callback
     */
    var downloadList = function (begintime, endtime, callback) {
      Popup.waitLoad("正在同步项目信息数据......");
      eamSyncAjax.doPost(Api_getUserProject, {},
        function (res) {
          if (res.success) {
            Storage.setProjects(res.data);
            callback(true,res.data);
          } else {
            $injector.get("eamSync").synclog("获取用户项目信息失败");
            callback();
          }
          Popup.eamSyncHideLoading();
        });
    };

    return {
      downloadList: downloadList
    }
  });
