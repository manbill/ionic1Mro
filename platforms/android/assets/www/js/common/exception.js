/**
 * 对与Api通信过程中的异常与错误代码处理
 */
starter.factory('Exception', function (Popup, $state, $rootScope, $cordovaNetwork) {
  /**
   * 对应用错误码 的处理
   * @param {Object} errorCode 应用错误码
   */
  function exceptionHandle(errorCode, errorMsg,callback) {
    if (errorCode == "10008" || errorCode == "10009") {
      Popup.waitLoad("当前用户被踢出，需要重新登录");
      $state.go("login", {});
    } else if (errorCode == "10002") {
      Popup.loadMsg("参数验证错误");
    } else if (errorCode == "10003") {
      Popup.loadMsg("用户登录失败,请检查用户名与密码");
    } else if (errorCode == "10004") {
      Popup.loadMsg("信息不存在");
    } else if (errorCode == "10010") {
      Popup.loadMsg(errorMsg);
    } else {
      Popup.loadMsg(errorMsg);
    }
    $rootScope.$broadcast(SCROLL_REFRESH_COMPLETE);
    $rootScope.$broadcast(SCROLL_INFINITE_COMPLETE);
    callback(errorMsg);
  }

  return {
    /**
     * 对应用错误码 的处理
     * @param {Object} errorCode 应用错误码
     */
    exceptionHandle: function (errorCode) {
      exceptionHandle(errorCode);
    },
    /**
     * 对访问API回调结果的共同处理
     * @param {Object} promise
     */
    promise: function (promise, callback, key_url, key_params, isSaveData) {
      promise.then(function (resp) {
        Popup.hideLoading();
        if (!resp.success) {
          if (!window.cordova) {
          $rootScope.isOnline = false;
          }
          exceptionHandle(resp.retCode, resp.retInfo,callback);
        } else if ($.isFunction(callback)) {
          if (!window.cordova) {
            $rootScope.isOnline = window.navigator.onLine;
          }
          callback(resp);
        }
      }, function (resp) {
        Popup.hideLoading();
        if (window.cordova) {
          if (!$rootScope.isOnline) {
            //如果没网络
            $rootScope.errorText = "请检查您的手机是否联网";
            Popup.loadMsg("无网络服务，请检查网络连接。", 2000);
          } else {
            //有网络但还是失败，说明服务器出错了
            $rootScope.errorText = "服务器出小差了";
            Popup.loadMsg("服务器出小差了..");
          }
          resp.success = false;
          callback(resp);
        } else {
          Popup.loadMsg("网络错误", 2000);
          resp.success = false;
          callback(resp);
        }
      });
    }
  };
});
