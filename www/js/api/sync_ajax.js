/**
 * 数据接口通不用ajax调用请求。
 */
starter.factory('eamSyncAjax', function (Popup, $state, $rootScope, Storage, $cordovaNetwork, $http, $injector, $interval, $timeout) {
  var api_check = baseUrl + "/common/common/check.api";
  /**
   *
   * get请求
   *
   * @param apiPath
   * @param params
   * @param callback
   * @param config
   */
  var doGet = function (apiPath, params, callback, config) {
    execute(apiPath, params, "get", callback, config);
  };

  /**
   * post请求
   *
   * @param apiPath
   * @param params
   * @param callback
   * @param config
   */
  var doPost = function (apiPath, params, callback, config) {
    execute(apiPath, params, "post", callback, config);
  };

  var execute = function (apiPath, params, method, callback, config) {
    $injector.get("eamSync").updateLastHandleTime();
    //检查网络状况
    if (window.cordova && !$rootScope.isOnline) {
      // $injector.get("eamSync").synclog("没有网络同步失败");
      // $injector.get("eamSync").stopSync();
      // $injector.get("eamSync").sync();
      $rootScope.$broadcast(SCROLL_REFRESH_COMPLETE);
      $rootScope.$broadcast(SCROLL_INFINITE_COMPLETE);
      if(angular.isFunction(callback)){
        return callback("没有网络，停止同步");
      }
      return;
    }

    if (!config) {
      config = {};
    }
    config['headers'] = config['headers']?config['headers']:{"tokenId":null};
    config['headers']['tokenId'] = Storage.getAccessToken();
    config["method"] = method;
    config["url"] = apiPath;
    config['timeout']=config['timeout']||5*1000*60;

    if (method == "get") {
      config["params"] = params;
    } else {
      config["data"] = params;
    }

    $http(config).then(function (response) {
      var resp = response.data;
      // console.log(response);
      if (!resp.success) {
        if (resp.retCode == "10008" || resp.retCode == "10009") {
          $state.go("login", {});
        }
        //同步失败，结束数据同步
        // $injector.get("eamSync").synclog("同步出错</br>" + resp.retInfo);
        // $injector.get("eamSync").stopSync();
        // $injector.get("eamSync").sync();
        if ($.isFunction(callback)) {
          $rootScope.$broadcast(SCROLL_REFRESH_COMPLETE);
          $rootScope.$broadcast(SCROLL_INFINITE_COMPLETE);
         return callback("同步出错:" + resp.retInfo);
        }
      } else if ($.isFunction(callback)) {
        callback(resp);
      }
    }, function (response) {
      $rootScope.$broadcast(SCROLL_REFRESH_COMPLETE);
      $rootScope.$broadcast(SCROLL_INFINITE_COMPLETE);
      console.error("eamSyncAjax:",JSON.stringify(response,undefined,2));
      if(angular.isFunction(callback)){
        return callback(response.statusText||"服务器错误");
      }
      if (window.cordova) {
        //如果没网络
        if (!$rootScope.isOnline) {
          // $injector.get("eamSync").synclog("没有网络同步失败");
        }
      } else {
        //有网络但还是失败，说明服务器出错了
        // $injector.get("eamSync").synclog("服务器出现异常同步失败");
      }
      //同步失败结束同步
      // $injector.get("eamSync").stopSync();
      // $injector.get("eamSync").sync();
    });
  };

  /**
   * * 检查网络通讯状况
   * 如果网络正常，则一分钟通讯一次，如果与服务器检测不正常，则提高检测频率未10秒
   *
   * @param bool 是否手动检测
   */
  var checkNetwork = function (bool) {
    var config = {
      method: "get",
      timeout: 5000,
      url: api_check
    };
    return $http(config);
    //检查网络状况
    /*    if (window.cordova&&!$cordovaNetwork.isOnline()) {
     $rootScope.isOnline = false;
     //网络不通，继续60秒检测一次。
     if (bool != true)$timeout(checkNetwork, 60 * 1000);
     } else {
     var config = {
     method: "get",
     timeout: 5000,
     url: api_check
     };
     $http(config).then(function (response) {
     //网络通讯正常,5分钟检测一次。
     $rootScope.isOnline = true;
     if (bool != true)$timeout(checkNetwork, 5 * 60 * 1000);
     }, function (response) {
     $rootScope.isOnline = false;
     if (bool != true)$timeout(checkNetwork, 10 * 1000);
     });
     }*/
  };


  return {
    doGet: doGet,
    doPost: doPost,
    checkNetwork: checkNetwork
  };
});
