/**
 * Created by kingman_li on 2016/8/8.
 */
/**
 * 页面交换数据的服务类
 */
starter.factory('TempVar', function(DataCache) {
var schdleNotificatonFocusUpdate = false;
  return {
    all: function () {
      var projectString = window.localStorage['projects'];
      if (projectString) {
        return angular.fromJson(projectString);
      }
      return [];
    },
    getFocusUpdateFlag: function () {
      return schdleNotificatonFocusUpdate;
    },
    setFocusUpdateFlag: function (flag) {
      schdleNotificatonFocusUpdate = flag;
    }
  }
});
