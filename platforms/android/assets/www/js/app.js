// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
var starter = angular.module('starter', ['ionic', 'ui.tree', "cfp.loadingBar", 'ngCordova', 'starter.eamDB', 'starter.SQLVersion', 'maintain.dto', 'ngAnimate', 'ngResource',
  'starter.controllers', 'starter.workorder',//
  'starter.eamFile', 'starter.eamSync']);//数据同步相关的
var db = null;
var startDate;
starter.config(function ($ionicConfigProvider, $httpProvider, cfpLoadingBarProvider, treeConfig) {
  treeConfig.defaultCollapsed = true; // collapse nodes by default
  cfpLoadingBarProvider.includeSpinner = true;//Turn the spinner on or off
  // cfpLoadingBarProvider.includeBar = false;//Turn the loading bar on or off
  // cfpLoadingBarProvider.parentSelector = '#loading-bar-container';
  // cfpLoadingBarProvider.spinnerTemplate = '<div><span class="fa fa-spinner">Custom Loading Message...</div>';
  $ionicConfigProvider.backButton.text('');
  $ionicConfigProvider.backButton.previousTitleText(false);
  $ionicConfigProvider.platform.ios.tabs.style('standard');
  $ionicConfigProvider.platform.ios.tabs.position('bottom');
  $ionicConfigProvider.platform.android.tabs.style('standard');
  $ionicConfigProvider.platform.android.tabs.position('bottom');
  $ionicConfigProvider.tabs.position('bottom');

  $ionicConfigProvider.platform.ios.navBar.alignTitle('center');
  $ionicConfigProvider.platform.android.navBar.alignTitle('center');

  $ionicConfigProvider.platform.ios.backButton.previousTitleText('').icon('ion-ios-arrow-thin-left');
  $ionicConfigProvider.platform.android.backButton.previousTitleText('').icon('ion-android-arrow-back');

  $ionicConfigProvider.platform.ios.views.transition('ios');
  $ionicConfigProvider.platform.android.views.transition('android');
  $ionicConfigProvider.scrolling.jsScrolling(true);//Whether to use JS or Native scrolling. Defaults to native scrolling. Setting this to true has the same effect as setting each ion-content to have overflow-scroll='false'.
  $httpProvider.interceptors.push('LoadingInterceptor');

  $httpProvider.config = {};
  $httpProvider.config.timeout = 5 * 60 * 1000;
  //PDFJS.workerSrc = 'js/plugin/pdf.worker.js';
  //ios禁止左滑 手势, 否则有可能出现错误
  $ionicConfigProvider.views.swipeBackEnabled(false);
})
  .constant("$ionicLoadingConfig", {
    template: '<ion-spinner icon="lines" class="spinner-calm"></ion-spinner>',
    hideOnStateChange: true
  })

  //.constant('sparepartStatus',{
  //  TRANSFERORDER_STATUS_SAVE : 171,//保存状态还未提交
  //  TRANSFERORDER_STATUS_UNHANDLE : 172,//未处理状态(已提交未发货)
  //  TRANSFERORDER_STATUS_INHANDLE : 173,//处理中(至少有一笔发货记录)
  //  TRANSFERORDER_STATUS_FINISH : 174,//已完成
  //  TRANSFERORDER_STATUS_REJECT : 175,//被驳回
  //  TRANSFERORDER_STATUS_CANCEL : 176//已取消
  //})
  .run(function ($ionicPlatform, $rootScope, $q, $cordovaSQLite, $location, $timeout, $ionicHistory, $cordovaToast, $ionicTabsDelegate,
                 $cordovaKeyboard, $cordovaNetwork, $ionicGesture, $window, Store, $ionicBackdrop, Storage, eamDB, eamFile, eamSync, eamSyncAjax, SQLVersion, Popup, $state) {
    $rootScope.pageParams = {};
    $rootScope.isOnline = true;
    $rootScope.isPop = false;
    var guestureEvents = [];
    var eventTypes = ["hold", "tap", "drag", "swipe", "transform", "rotate", "touch", "release"];//屏幕点击事件
    /**
     *
     * 备品备件-调拨单状态
     TRANSFERORDER_STATUS_SAVE = 171;//保存状态还未提交
     TRANSFERORDER_STATUS_UNHANDLE = 172;//未处理状态(已提交未发货)
     TRANSFERORDER_STATUS_INHANDLE = 173;//处理中(至少有一笔发货记录)
     TRANSFERORDER_STATUS_FINISH = 174;//已完成
     TRANSFERORDER_STATUS_REJECT = 175;//被驳回
     TRANSFERORDER_STATUS_CANCEL = 176;//已取消
     */
    $rootScope.sparepartStatus = {
      TRANSFERORDER_STATUS_SAVE: 171,//保存状态还未提交
      TRANSFERORDER_STATUS_UNHANDLE: 172,//未处理状态(已提交未发货)
      TRANSFERORDER_STATUS_INHANDLE: 173,//处理中(至少有一笔发货记录)
      TRANSFERORDER_STATUS_FINISH: 174,//已完成
      TRANSFERORDER_STATUS_REJECT: 175,//被驳回
      TRANSFERORDER_STATUS_CANCEL: 176//已取消
    };
    $rootScope.problemStatus = {
      PROBLEM_STATUS_UNSUBMIT: 191,//未提交
      PROBLEM_STATUS_AREA_PROCESSING: 192,//区域处理中
      PROBLEM_STATUS_HQ_PROCESSING: 193,//总部处理中
      PROBLEM_STATUS_REPLY: 194,//已回复
      PROBLEM_STATUS_CLOSED: 195//已关闭
    };

    //故障工单状态
    $rootScope.faultStatus = {
      FAULT_STATUS_PROCESSING: 41,//处理中
      FAULT_STATUS_CLOSED: 42,//已关闭
      FAULT_STATUS_DELETED: 43,//已删除
      FAULT_STATUS_TOREVICEW: 66,//待审核
      FAULT_STATUS_PAUSE: 301//暂停
    };
    $rootScope.onlyWifi = false;//仅wifi联网
    $rootScope.auth = {};
    $rootScope.hasBeenInit = false;
    function checkConnection() {
      var networkState = navigator.connection.type;
      var states = {};
      states[Connection.UNKNOWN] = 'Unknown connection';
      states[Connection.ETHERNET] = 'Ethernet connection';
      states[Connection.WIFI] = 'WiFi connection';
      states[Connection.CELL_2G] = 'Cell 2G connection';
      states[Connection.CELL_3G] = 'Cell 3G connection';
      states[Connection.CELL_4G] = 'Cell 4G connection';
      states[Connection.CELL] = 'Cell generic connection';
      states[Connection.NONE] = 'No network connection';
      if (isDebug) {
        console.log('Connection type: ' + states[networkState]);
      }
      $rootScope.isOnline = states[networkState] == states[Connection.CELL] || states[networkState] == states[Connection.CELL_2G] ||
        states[networkState] == states[Connection.CELL_3G] || states[networkState] == states[Connection.CELL_4G] ||
        states[networkState] == states[Connection.WIFI];
      $rootScope.isWiFi = states[networkState] == states[Connection.WIFI];
    }

    //判断工单是否可以编辑
    $rootScope.isOrderCanEdit = function (status) {
      return status == 41;
    };

    // $root.hideTabForKeyboard = false;
    $rootScope.checkNetWorkState = function () {
      var defer = $q.defer();
      if (!window.cordova) {//电脑上
        $rootScope.isOnline = navigator.onLine;
        if ($rootScope.isOnline) {
          $rootScope.network = "wifi";
          $rootScope.isWiFi = true;
        }
        defer.resolve();
        return defer.promise;
      }
      document.addEventListener("deviceready", function () {
        if (isDebug) {
          console.log("navigator.connection" + JSON.stringify(navigator.connection));
        }
        checkConnection();
        defer.resolve();
      }, false);
      return defer.promise;
    };

    $ionicPlatform.ready(function () {
      //完成数据初始化
      db = eamDB.openDB(DB_NAME, function () {//这一段主要为浏览器模拟器使用
        eamFile.initLocalFileSystem();
      });

      if (isDebug) {
        console.log("app.js db is open " + JSON.stringify(db));
      }
      Popup.waitLoad();
      console.time("notExistCreateAccountsTable");
      SQLVersion.notExistCreateAccountsTable(function () {
        Popup.hideLoading();
        console.timeEnd("notExistCreateAccountsTable");
        console.log("账号记录表格创建成功");
      });
      if (window.cordova && window.cordova.plugins.Keyboard) {
        document.addEventListener("deviceready", function () {
          if (ionic.Platform.isIOS()) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
          }
          if (ionic.Platform.isAndroid()) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
          }
        }, false);
      }

      window.addEventListener('native.keyboardshow', keyboardShowHandler);
      function keyboardShowHandler(e) {
        $ionicTabsDelegate.showBar(false);
        cordova.plugins.Keyboard.disableScroll(true);
      }

      window.addEventListener('native.keyboardhide', keyboardHideHandler);
      function keyboardHideHandler(e) {
        $ionicTabsDelegate.showBar(true);
        cordova.plugins.Keyboard.disableScroll(false);
      }

      if (window.StatusBar) {
        // org.apache.cordova.statusbar required
        StatusBar.styleDefault();
      }
      if (window.cordova) {//手机上
        document.addEventListener("pause", onPause, false);
        function onPause() {
          // Handle the pause event
          // if (guestureEvents.length > 0) {
          //   guestureEvents.forEach(function (e) {
          //     if (e) {
          //       $ionicGesture.off(e);
          //     }
          //   });
          //   guestureEvents = [];
          // }
        }

        document.addEventListener("resume", onResume, false);

        function onResume() {
          $ionicBackdrop.release();
          guestureEvents = [];
          // Handle the resume event
          eventTypes.forEach(function (etype) {
            var gestureEvent = $ionicGesture.on(etype, function () {
              // console.log(new Date());
              eamSync.updateLastHandleTime();
            }, angular.element(document));
            guestureEvents.push(gestureEvent);
          });
        }


        //监听网络状体
        document.addEventListener("deviceready", deviceReady, false);
        function deviceReady() {
          //完成数据初始化
          db = eamDB.openDB(DB_NAME, function () {
            eamFile.initLocalFileSystem();
          });
          if (isDebug) {
            console.log("app.js db is open ");
          }
          // alert(JSON.stringify(cordova.file, undefined, 2));
          //应用内打开一个web
          if (window.cordova) {
            window.open = cordova.InAppBrowser.open;
          }
          //监听网络状况
          $rootScope.checkNetWorkState();
          // listen for Online event
          $rootScope.$on('$cordovaNetwork:online', function (event, networkState) {
            eamSync.setSyncSwitch(true);//一旦有网，将值设置为true,表明，只要有需要同步的数据，就应该能下载数据；
            var onlineState = networkState;
            if (isDebug) {
              console.log("networkState: " + JSON.stringify(networkState, undefined, 2));
            }
            $rootScope.isWiFi = angular.equals(networkState.toLowerCase(), "wifi");
            $rootScope.isOnline = true;
            // $rootScope.$digest();
            eamSync.runsyncjob();//网络重新可用，重启自动同步
          });
          // listen for Offline event
          $rootScope.$on('$cordovaNetwork:offline', function (event, networkState) {
            var offlineState = networkState;
            $rootScope.$broadcast(SCROLL_REFRESH_COMPLETE);
            $rootScope.$broadcast(SCROLL_INFINITE_COMPLETE);
            if (isDebug) {
              console.log("networkState" + JSON.stringify(networkState, undefined, 2));
            }
            $rootScope.isOnline = false;
            // eamSync.synclog({
            //   errorMessage:"网络中断，请检查网络连接",
            //   errorType:UPLOAD_ORDER_FAIL_ERROR_TYPES.NETWORK_FAIL_ERROR_TYPE
            // });
            Popup.loadMsg('网络中断，请检查网络');
            $rootScope.stopSync('网络中断，请检查网络连接');
            eamSync.checkBaseFuncsStat().then(function (baseFunctions) {//如果网络中断，基础数据尚未下载完成，则需要调回登录界面
              if (baseFunctions.length !== 0) {
                $rootScope.$broadcast(SCROLL_REFRESH_COMPLETE);
                $rootScope.$broadcast(SCROLL_INFINITE_COMPLETE);
                Popup.hideLoading();
                $ionicBackdrop.release();
                Popup.loadMsg("请重新登录", 500);
                return $state.go("login");
              }
            });
            // $rootScope.$digest();
          });
        }
      } else {//电脑上
        // console.log(navigator);
        $rootScope.isOnline = navigator.onLine;
        if ($rootScope.isOnline) {
          $rootScope.network = "wifi";
          $rootScope.isWiFi = true;
        }
      }
      $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
        //监听页面跳转
        if (!window.cordova) {
          $rootScope.isOnline = navigator.onLine;
        }
        eamSync.updateLastHandleTime();
      });
      $rootScope.$on('$stateChangeSuccess', function (event) {
        // console.log(event);
        event.preventDefault();
        if (!Storage.getAccessToken()) {
          $rootScope.$broadcast(SCROLL_REFRESH_COMPLETE);
          $rootScope.$broadcast(SCROLL_INFINITE_COMPLETE);
          Popup.hideLoading();
          $ionicBackdrop.release();
          Popup.loadMsg("请重新登录", 500);
          return $state.go("login");
        }
      });
    });
    //物理返回按钮控制&双击退出应用
    document.addEventListener("deviceready", function () {
      $ionicPlatform.registerBackButtonAction(backBtnAction, 501);
    }, false);
    function backBtnAction(event) {
      //判断处于哪个页面时双击退出
      if ($location.path() == '/tab/home' || $location.path() == '/login') {
        if ($rootScope.backButtonPressedOnceToExit) {
          ionic.Platform.exitApp();
        } else {
          $rootScope.backButtonPressedOnceToExit = true;
          $cordovaToast.showShortBottom('再按一次退出系统');
          setTimeout(function () {
            $rootScope.backButtonPressedOnceToExit = false;
          }, 2000);
        }
      } else if ($ionicHistory.backView()) {
        if ($cordovaKeyboard.isVisible()) {
          $cordovaKeyboard.hide();
        } else {
          if (!$rootScope.isEditData) {
            $ionicHistory.goBack();
          }
        }
      } else {
        $rootScope.backButtonPressedOnceToExit = true;
        $cordovaToast.showShortBottom('再按一次退出系统');
        setTimeout(function () {
          $rootScope.backButtonPressedOnceToExit = false;
        }, 2000);
      }
      event.preventDefault();
      return false;

    }

    //注册全局退出同步接口方法
    $rootScope.stopSync = function (reason) {
      eamSync.stopSync(reason);
    };

    //设置文件编辑状态。
    $rootScope.isEditData = false;
    $rootScope.showNavBar = false;//顶部导航栏是否显示,默认显示
    $rootScope.tabClick = function (i) {
      console.log("$location.path(): ", $location.path(), i);
      // if ($rootScope.isEditData) {
      //   Popup.confirm("您当前操作的数据未保存，您确定要跳转吗？", function () {
      //     $rootScope.isEditData = false;
      //     $ionicTabsDelegate.select(i);
      //   }, function cancel() {
      //
      //   });
      // } else {
      //   if (i === 0) {//首页
      //     $location.url('/home');
      //   }
      //   $ionicTabsDelegate.select(i);
      // }
      //如果点击Home按钮，不能再跳转到选项目界面
      if ($location.url == "/tab/selectProjects") {
        return;
      }


      $ionicTabsDelegate.select(i);
    };
    //根据是否打开键盘 隐藏tabs 的标志
    $rootScope.hideTabsForKeyboard = true;


    //监听，如果app从后台回到前台，界面被遮罩，则 把遮罩去掉
    document.addEventListener("resume", onResume, false);
    function onResume() {
      // 处理resume事件
      $rootScope.$on('backdrop.shown', function () {
        // Execute action
        $ionicBackdrop.release();
      });
    }

  });
