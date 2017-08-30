/**
 * 提供与common相关的Api访问接口
 */
starter.factory('CommonApi', function ($resource, Exception, $rootScope) {
  var Api_login = "/common/user/login.api";
  var Api_getUpgradeVersionInfo = "/common/getUpgradeVersionInfo.api";
  var Api_logout = "/api/user/logout.api";
  var Api_getProfileInfo = "/api/user/getProfileInfo.api";
  var Api_getUserProject = "/api/user/getUserProject.api";
  var commondata = $resource('/common/user/login.api', {}, {
    login: { //用户登录请求
      method: 'post',
      url: baseUrl + Api_login
    },
    loginPro: { //用户登录请求
      method: 'post',
      url: baseUrl + Api_login
    },
    logout: { //用户退出登录请求
      method: 'post',
      url: baseUrl + Api_logout
    },
    getProfileInfo: { //用户退出登录请求
      method: 'post',
      url: baseUrl + Api_getProfileInfo
    },
    getUpgradeVersionInfo: { //获取版本
      method: 'post',
      url: baseUrl + Api_getUpgradeVersionInfo
    },
    getUserProject: { //用户退出登录请求
      method: 'post',
      url: baseUrl + Api_getUserProject
    }
  });

  return {
    /**
     * 用户登录（user login）
     * @param {Object} username 用户名
     * @param {Object} password 密码
     * @param {Object} deviceType 设备类型(1:苹果2:android平台)
     */
    login: function (callback, params) {
      var model = commondata.login(params).$promise;
      Exception.promise(model, callback, Api_login, params);
    },

    loginPro: function (params) {
      return commondata.loginPro(params).$promise;
    },
    /**
     * 用户退出登录（user logout）
     * @param {Object} userId 用户Id
     */
    logout: function (callback, params) {
      var model = commondata.logout(params).$promise;
      Exception.promise(model, callback, Api_logout, params);
    },
    /**
     * 用户退出登录
     * @param {Object} userId 用户Id
     */
    getProfileInfo: function (callback, params) {
      var model = commondata.getProfileInfo(params).$promise;
      Exception.promise(model, callback, Api_getProfileInfo, params);
    },
    /**
     * 获取系统时间
     * @param {Object} userId 用户Id
     */
    getUserProject: function (callback) {
      var model = commondata.getUserProject().$promise;
      Exception.promise(model, callback, Api_getUserProject);
    }, /**
     * 获取系统时间
     * @param callback
     * @param params={ versionId:int, versionFlag:int //必须	 }
     */
    getUpgradeVersionInfo: function (callback, params) {
      var model = commondata.getUpgradeVersionInfo(params).$promise;
      Exception.promise(model, callback, Api_getUpgradeVersionInfo, params);
    }
  };
});
