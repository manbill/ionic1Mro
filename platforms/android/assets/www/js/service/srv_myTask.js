/**
 * Created by Manbiao.Huang on 23-May-17.
 */
starter.factory('myTaskService', function (eamSyncAjax,Storage,Popup, $q) {
  var mailInfoListApi= baseUrl +'/api/todo/getMailListApi.api';//消息列表api
  var mailInfoApi= baseUrl +'/api/todo/getMailInfoApi.api';//消息详情api
  var config={};
      config['timeout']=60*1000;
  var getMailList=function () {
    var defer = $q.defer();
    Popup.waitLoad();
    eamSyncAjax.doPost(mailInfoListApi,{},function (res) {
      // console.log(res);
      Popup.hideLoading();
      if(res.success){
        defer.resolve(res.data.sort(function (msg1,msg2) {
          return msg2.sendtime-msg1.sendtime;
        }));
      }else{
        defer.reject(res.retInfo||"获取消息列表失败");
      }
    },config);
    return defer.promise;
  };
  var getMailInfo = function (mailId) {
    var defer = $q.defer();
    Popup.waitLoad();
    eamSyncAjax.doPost(mailInfoApi,mailId,function (res) {
      Popup.hideLoading();
      // console.log(res);
      if(res.success){
        defer.resolve(res.data);
      }else{
        defer.reject(res.retInfo||"获取消息列表失败");
      }
    },config);
    return defer.promise;
  };
  return {
    getMailInfo:getMailInfo,
    getMailList:getMailList
  }
});
