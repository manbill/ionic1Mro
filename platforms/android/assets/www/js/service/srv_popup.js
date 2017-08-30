/**
 * 提示信息等展示
 */
starter.factory('Popup', function ($ionicLoading, $ionicPopup, $injector, $timeout, $ionicActionSheet, $rootScope) {
  function loadMsg(msg, delayTime, callback) {
    delayTime = delayTime || 2000;
    var options = {};
    if (msg) {
      options.template = msg;
    }
    $ionicLoading.show(options);
    $timeout(function () {
      $ionicLoading.hide();
      if (callback && $.isFunction(callback)) {
        callback();
      }
    }, delayTime);
  }

  return {
    delayRun: function (callback, msg, delayTime) {
      loadMsg(msg || "操作成功", delayTime || 2000, callback);
    },

    /**
     * 隐藏加载提示
     */
    hideLoading: function () {
      $ionicLoading.hide();
    },
    eamSyncHideLoading: function () {
      if (!$injector.get('eamSync').getIsSystemSync()) {
        this.hideLoading();
      }
    },
    /**
     * 等待加载
     * @param {Object} msg
     */
    waitLoad: function (msg) {
      var options = {};
      if (msg) {
        options.template = msg/*+"<br/> <button ng-click=''></button>"*/;
      }
      $ionicLoading.show(options);
    },
    /**
     * 载入指示器
     * @param {Object} msg 提示信息
     * @param {Object} delayTime 信息存在时间（毫秒）
     */
    loadMsg: function (msg, delayTime, callback) {
      loadMsg(msg, delayTime, callback);
    },
    /**
     * 提示框
     * @param {Object} msg 提示的内容
     * @param {Object} title 提示标题
     */
    promptMsg: function (msg, title) {
      title = title || "提示";
      return $ionicPopup.alert({
        title: title,
        template: msg
      });
    },
    /**
     * 提示框
     * @param {Object} msg 提示的内容
     * @param {Object} fn_ok 确认后需要执行的function
     * @param {Object} fn_no 取消后需要执行的function，默认什么也不做
     * @param template
     */
    confirm: function (msg, fn_ok, fn_no, fn_ok_text, fn_no_text, template) {
      var hideSheet = $ionicActionSheet.show({
        titleText: msg,
        template: template ? template : null,
        cancelText: fn_no_text || "取消",
        cancel: function () {
          if ($.isFunction(fn_no)) {
            fn_no();
          }
        },
        destructiveText: fn_ok_text || "确认",
        destructiveButtonClicked: function () {
          if ($.isFunction(fn_ok)) {
            fn_ok();
          }
          return true;
        }
      });
    },

    popupConfirm: function (callback, option, title, cancel) {
      var defaultOption = {
        title: "提醒",
        template: "缓存中存在未提交的数据，是否同步到服务器？",
        cancelText: "忽略",
        okText: "同步"
      };
      if (option) {
        defaultOption = $.extend(true, defaultOption, option);
      }
      $ionicPopup.confirm(defaultOption)
        .then(function (res) {
          if (!$.isFunction(callback)) {
            return;
          }
          if (res) {
            callback(true);
          } else {
            if ($.isFunction(cancel)) {
              cancel(false);
            }
          }
        });
    },

    /**
     *
     * @param {Object} option
     */
    popup: function (option) {
      /*
       title - 弹出框标题文本
       subTitle - 弹出框副标题文本
       template - 弹出框内容的字符串模板
       templateUrl - 弹出框内容的内联模板URL
       scope - 要关联的作用域对象
       buttons - 自定义按钮数组。按钮总是被置于弹出框底部
       cssClass - 附加的CSS样式类
       */
      var _option = {
        title: "",
        subTitle: "",
        template: ""
      };
      _option = $.extend(_option, option);
      return $ionicPopup.show(_option);
    },

      /**
       *  @brief
       *  审核时的弹出框
       */
      popVerify: function (callback) {
        $rootScope.verifyReasonData = {
            status:null,
            verifyReason:null
        };
       $ionicPopup.show({
           template : "<textarea type= 'text' class='text-wrap' ng-model = 'verifyReasonData.verifyReason' style='height:60px'>",
           title :"审核故障工单",
           subTitle : "请输入审核原因",
           scope : $rootScope,
           cssClass:'verify-popup',
           buttons:[
               {
                   text:"取消",
                    onTap:function () {
                        $rootScope.verifyReasonData.status = null;
                        $rootScope.verifyReasonData.verifyReason = null;
                    }
               },
               {
                 text:"<b>通过</b>",
                 type:"button-positive",
                 onTap:function (e) {
                     $rootScope.verifyReasonData.status = 1;
                     // console.log($rootScope.verifyReasonData.status);
                     // console.log(e);
                     if($rootScope.verifyReasonData.verifyReason == null || $rootScope.verifyReasonData == ""){
                         e.preventDefault();
                     }else {
                         if($.isFunction(callback)){
                             callback($rootScope.verifyReasonData);
                             return;
                         }
                     }

                     // return $scope.data;
                 }
               }
               ,
               {
                 text:"<b>拒绝</b>",
                 type:"button-positive",
                 onTap:function (e) {
                     $rootScope.verifyReasonData.status = 2;
                     if($rootScope.verifyReasonData.verifyReason == null || $rootScope.verifyReasonData == ""){
                         e.preventDefault();
                     }else {
                         if($.isFunction(callback)){
                             callback($rootScope.verifyReasonData);
                             return;
                         }
                     }
                     // return $scope.data;
                 }
               }
           ]
       })
           // .then(function (res) {
           //     if($.isFunction(callback)){
           //         callback($rootScope.verifyReasonData);
           //     }
           //     console.log($rootScope.verifyReasonData.status + $rootScope.verifyReasonData.verifyReason);
           // })
      }
  };
});
