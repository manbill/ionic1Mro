angular.module('starter.controllers', [])
  .controller('LoginCtrl', function ($scope, eamSync, $state, eamDB, eamFile, SyncCommonProject, dbTableService, OrderService, $ionicPlatform, Store, Popup, CommonApi, Storage, $ionicHistory, $rootScope, SQLVersion) { //登录界面
    Storage.setAccessToken(null);
    var tableName = 'eam_accounts_table';
    $ionicHistory.clearCache();
    $ionicHistory.clearHistory();
    var cacheUser = Storage.getProfile();
    //进入首页 就开启同步检测
    eamSync.setSyncSwitch(true);
    $scope.firstLogin = true;
    $scope.needSyncData = true;//默认需要同步数据
    $scope.user = {};
    if (cacheUser) {
      $scope.user.userName = cacheUser.name;
      $scope.user.password = cacheUser.password;
    }

    $scope.myCol = [{
      url: '/img/logo.png',
      name: 'Some Title',
      email: 'test@text.com',
      list: [{email: 'test_two@text.com', url: '/img/ionic.png'}]
    }, {
      name: 'Another Title',
      list: [{email: 'test@text.com', url: '/img/ionic.png'}]
    }];

    $scope.returnedValues = [];

    $scope.selectAccount = function (account) {
      // console.log(account);
      $scope.user.userName = account.account;
      $scope.user.password = account.password;
      $scope.accountList = [];
    };
    $scope.accountList = [];
    $scope.returnedValues = [];
    // $scope.$watch('user.userName', function (newVal, oldVal) {
    //     $scope.queryHistoryUserName(newVal);
    // });
    $scope.queryHistoryUserName = function () {
      if (StringUtils.isEmpty($scope.user.userName)) {
        $scope.accountList = [];
        return;
      }
      eamDB.execute(db, 'select * from ' + tableName + " where account like ? limit 0,3", [$scope.user.userName + "%"])
        .then(function (res) {
          $scope.accountList = OrderService.ChangeSQLResult2Array(res);
          // console.log('$scope.accountList',$scope.accountList);
        }, function (err) {
          Popup.loadMsg('用户查找失败!');
        });
    };
    $scope.user.deviceFlag = 2;
    // alert("window cordova:" + window cordova);
    if (window.cordova) {
      var deviceInformation = ionic.Platform.device();

      var isWebView = ionic.Platform.isWebView();
      var isIPad = ionic.Platform.isIPad();
      var isIOS = ionic.Platform.isIOS();
      var isAndroid = ionic.Platform.isAndroid();
      var isWindowsPhone = ionic.Platform.isWindowsPhone();

      var currentPlatform = ionic.Platform.platform();
      var currentPlatformVersion = ionic.Platform.version();
      $scope.user.deviceFlag = 2;
      if (isAndroid) {
        $scope.user.deviceFlag = 2;
      } else if (isIOS) {
        $scope.user.deviceFlag = 1;
      }
    }

    //登录成功后，不管是不是切换了用户都要走这一步
    var initLocalDatabaseAfterLogin = function (callback) {
      //检查本地数据库版本情况
      if (!window.cordova) { //如果不加判断，导致重复执行初始化数据库的语句
        $ionicPlatform.ready(deviceReady);
      }
      document.addEventListener('deviceready', deviceReady); //只在手机上面运行
      function deviceReady() {
        Popup.waitLoad("初始化本地数据库...");
        if (isDebug) {
          console.log("======================================执行初始化本地数据库的操作===============================")
        }
        SQLVersion.checkVersion(function () {
          Popup.hideLoading();
          if ($.isFunction(callback)) {
            callback();
          }
        });
      }
    };
    /**
     * 初始化权限操作
     */
    var initAuth = function () {
      // console.log("auths result " + JSON.stringify(result.list, undefined, 2));
      // console.log("auths result length" + result.list.length);
      var auths = Storage.getProfile() ? Storage.getProfile().list : null;
      if (auths) {
        if (!$rootScope.auth) {
          $rootScope.auth = {};
        }
        for (var i in auths) {
          $rootScope.auth["auth_" + auths[i]] = true;
        }
      }
    };
    $scope.login = function () {
      if ($.trim($scope.user.userName) == "") {
        Popup.loadMsg("请输入用户名", 1000);
        return false;
      }
      if ($.trim($scope.user.password) == "") {
        Popup.loadMsg("请输入密码", 1000);
        return false;
      }
      Popup.waitLoad("正在请求登陆...");
      async.autoInject({
        'login': function (callback) {
          var loginPro = CommonApi.loginPro($scope.user);
          loginPro.then(function (res) {
            if (res.success) {
              Storage.setAccessToken(res.data.token);
              Storage.setLastLoginDate(new Date().getTime());//设置本次登录成功的时间
              //检查附件存储目录
              eamFile.initLocalFileSystem()
                .then(function () {
                  initLocalDatabaseAfterLogin(function () {
                    eamDB.execute(db, 'select * from ' + tableName + ' where account=?', [$scope.user.userName])
                      .then(function (dbRes) {
                        console.log(res);
                        if (dbRes.rows.length > 0) {
                          eamDB.execute(db, 'update ' + tableName + " set password=? where account=?", [$scope.user.password, $scope.user.userName])
                            .then(function () {
                              callback(null, res.data);
                            }, function (dberr) {
                              callback("更新账号数据库失败");
                            });
                        } else {
                          eamDB.execute(db, 'insert into ' + tableName + "(password,account) values(?,?)", [$scope.user.password, $scope.user.userName])
                            .then(function () {
                              callback(null, res.data);
                            }, function (dberr) {
                              callback('插入账号数据失败');
                            });
                        }
                      }, function (dberr) {
                        callback('查找账号数据失败');
                      });

                  });
                }, function (error) {
                  Popup.promptMsg(JSON.stringify(error, undefined, 2), "文件夹初始化失败");
                  callback(error);
                });
            } else {
              return callback(res, "登录失败：" + res.retCode);
            }
          }, function (err) {
            return callback(err, "网络请求失败!");
          });
        },
        "fetchProjects": ['login', function (login, callback) {
          console.log(login);
          SyncCommonProject.downloadList(null, null, function (res, results) {
            if (res) {
              //  todo 2 (项目获取的接口更改需要修改此次) +0:
              login.projectList = results;
              // console.log(login, results);
              callback(null, login);
            } else {
              callback("下载项目失败,请检查网络");
            }
          })
        }],
        "fetchCompanies": ['fetchProjects', function (login, callback) {

          var companies = [
            {
              companyId: 1,
              companyName: '上海电气风电集团有限公司',
              projectIds: login.projectList.map(function (item) {
                return +item.projectId;
              })
            }
          ];
          console.log(companies);
          Storage.setCompanies(companies);
          Storage.setSelectedCompany(companies[0]);//目前只有一个公司
          return callback(null, login);
        }]
      }, function (err, result) {
        result = result.login;
        // console.log(result);
        Popup.hideLoading();
        if (err) {
          console.log("err: " + JSON.stringify(err, undefined, 2));
          return Popup.promptMsg("登录过程失败：" + err.retInfo);
        }
        var localId = Storage.getProfile() ? Storage.getProfile()['id'] : null;
        console.log("local id  " + localId + " result.id " + result.id);
        Storage.setProfile(result);
        if (localId) { //用户已经登录过
          $scope.firstLogin = false;
          if (!angular.equals(localId, result.id)) { //切换用户,清空数据
            $scope.needSyncData = true;
            Popup.waitLoad("更换账号后需要清空之前用户的数据,请稍后...");
            SQLVersion.ckeckSyncStatus()
              .then(function (res) {
                selectProjectGoHomeAction(result);
              }, function (err) {
                Popup.promptMsg("清楚数据失败");
                console.log("清空数据库失败" + JSON.stringify(err));
                console.error(err);
              });
          } else { //相同的用户
            if (Storage.getSelectedProject()) {//如果用户已经选择了项目,直接进入首页
              //需要更新一下所选项目的信息
              var pros = Storage.getProfile().projectList ? Storage.getProfile().projectList : [];
              var newPro = pros.find(function (p) {
                return p.projectId == Storage.getSelectedProject().projectId;
              });
              if (newPro) {
                Storage.setSelectedProject(newPro);
              }
              //如果是网络中断退出到登录界面，或者基础数据下载过程中不知原因退出到登录界面，重新进入，在跳转首页前，判断是否需要重新下载基础数据
              eamSync.checkBaseFuncsStat().then(
                function success(baseFuncs) {
                  $scope.needSyncData = baseFuncs.length !== 0;//如果需要下载的基础数据不等于0，即还需要下载基础数据
                  $state.go("tab.home", {
                    data: {
                      firstLogin: false,
                      needSyncData: $scope.needSyncData//需要重新下载数据
                    }
                  });
                }, function (e) {
                  console.error(e);
                });
              return;
            }
            selectProjectGoHomeAction(result);//否则需要选择项目
          }
        } else { //首次使用应用,localId还不存在
          $scope.firstLogin = true;
          $scope.needSyncData = true;
          if (!result.projectList || result.projectList.length == 0) {
            return Popup.promptMsg("没有项目", '项目筛选');
          }
          selectProjectGoHomeAction(result);
        }

      });

    };
    /**
     * 选择项目
     * @param result
     */
    function selectProjectGoHomeAction(result) {
      Popup.hideLoading();
      if (result.projectList.length == 1) {//只有一个项目,不需要筛选,直接进入首页
        Storage.setSelectedCompany({
          companyId: 1,
          companyName: "上海电气MRO",
          projectIds: [result.projectList[0].projectId]
        });
        Storage.setSelectedProject(result.projectList[0]);
        $state.go("tab.home", {
          data: {
            firstLogin: $scope.firstLogin,
            needSyncData: $scope.needSyncData
          }
        });
        return;
      }
      $state.go("tab.selectProjects", {//多个项目，需要选择项目
        data: {
          firstLogin: $scope.firstLogin,
          needSyncData: $scope.needSyncData
        }
      });
    }

    // window.onerror = function (msg, url, line) {
    //   var idx = url.lastIndexOf("/");
    //   if (idx > -1) {
    //     url = url.substring(idx + 1);
    //   }
    //   alert("ERROR in " + url + " (line #" + line + "): " + msg);
    //   return false;
    // };
  })
  /**
   * 选择项目的界面
   */
  .controller('SelectProjectsCtrl', function ($scope, $stateParams, $ionicTabsDelegate, $state, $ionicHistory, Popup, Storage, SQLVersion) {
    // $scope.projectList = $stateParams.data.projectList;
    // $scope.companies = $stateParams.data.companies || [];
    $ionicTabsDelegate.showBar(false);
    var firstLogin = $stateParams.data && $stateParams.data.firstLogin;//是否第一次登陆
    $scope.projectList = Storage.getProjects();
    $scope.companies = Storage.getCompanies() ? Storage.getCompanies() : [
      {
        companyId: 1,
        companyName: 'A公司',
        projectIds: $scope.projectList.slice(0, 2).map(function (item) {
          return +item.projectId;
        })
      },
      {
        companyId: 2,
        companyName: 'B公司名',
        projectIds: $scope.projectList.slice(3, 4).map(function (item) {
          return +item.projectId;
        })
      },
      {
        companyId: 3,
        companyName: 'AB公司名',
        projectIds: $scope.projectList.slice(0).map(function (item) {
          return +item.projectId;
        })
      }
    ];
    console.log("$scope.companies: " + JSON.stringify($scope.companies, undefined, 2));
    $scope.selectedCompany = Storage.getSelectedCompany() ? Storage.getSelectedCompany() : $scope.companies[0];
    $scope.projects = $scope.projectList.filter(function (pro) {
      return $scope.selectedCompany.projectIds.some(function (proId) {
        return proId == pro.projectId;
      });
    });
    console.log($scope.selectedCompany);
    $scope.webParams = {
      selectedCompany: null,
      selectedProject: null /*Storage.getSelectedProject() ? $scope.projects.find(function (project) {
       return project.projectId == Storage.getSelectedProject().projectId;
       }) : $scope.projects[0]*/
    };
    angular.forEach($scope.companies, function (value, key) {
      if (value.companyId == $scope.selectedCompany.companyId) {
        $scope.webParams.selectedCompany = value;
      }
    });
    if (Storage.getSelectedProject()) {
      angular.forEach($scope.projects, function (value, key) {
        if (value && angular.equals(Storage.getSelectedProject().projectId, value.projectId)) {
          $scope.webParams.selectedProject = value;
        }
      });
      if (!$scope.webParams.selectedProject) {
        $scope.webParams.selectedProject = $scope.projects[0];
      }
    }

    //取消选择则 返回登录界面
    $scope.backToLogin = function () {
      $ionicHistory.goBack();
    };
    $scope.onConfirmSelect = function () {
      if (!$scope.webParams.selectedCompany) {
        return Popup.confirm("请选择公司")
      }
      if (!$scope.webParams.selectedProject) {
        return Popup.confirm("请选择项目")
      }
      var oldSelectedProject = Storage.getSelectedProject();
      console.log("oldSelectedProject,", oldSelectedProject);
      // console.log(oldSelectedProject.projectName);
      //首次登陆或者相同的项目，直接跳转到首页
      if (firstLogin || oldSelectedProject && +oldSelectedProject.projectId === +$scope.webParams.selectedProject.projectId) {//用户选择相同的项目
        Storage.setSelectedCompany($scope.webParams.selectedCompany);
        Storage.setSelectedProject($scope.webParams.selectedProject);
        $state.go("tab.home", {
          data: {
            firstLogin: firstLogin,
            needSyncData: false//选择相同项目,不需要再次下载数据
          }
        });
        return;
      }
      //如果不是首次登陆或者是不同的项目
      if (oldSelectedProject && +oldSelectedProject.projectId !== +$scope.webParams.selectedProject.projectId) {//如果是不同的项目，提示
        Popup.confirm("更换项目将清除未上传的工单数据，确定更换吗？", function ok() {
          Storage.setSelectedCompany($scope.webParams.selectedCompany);
          Storage.setSelectedProject($scope.webParams.selectedProject);
          //不同的项目，需要清空本地数据库
          setTimeout(function () {
            Popup.waitLoad("正在切换项目...");
          });
          $ionicHistory.clearCache();
          $ionicHistory.clearHistory();
          SQLVersion.ckeckSyncStatus().then(function () {
            Popup.hideLoading();
            $state.go("tab.home", {
              data: {
                firstLogin: firstLogin,
                needSyncData: true//需要重新下载数据
              }
            });
          }, function (err) {
            Popup.hideLoading();
            Popup.promptMsg(JSON.stringify(err));
          });
        }, function cancel() {
          // $ionicHistory.goBack();
        }, '确定', "取消");
      }
      if (!oldSelectedProject) {//说明尚未选择过任何项目
        Storage.setSelectedCompany($scope.webParams.selectedCompany);
        Storage.setSelectedProject($scope.webParams.selectedProject);
        $state.go("tab.home", {
          data: {
            firstLogin: firstLogin,
            needSyncData: true//选择相同项目,不需要再次下载数据
          }
        });
      }

    };
    // $scope.$watch('webParams.selectedProject', function (newPro, oldPro) {
    //   if (!angular.equals(newPro, oldPro)) {
    //     console.log('newPro: ', newPro);
    //     // Storage.setSelectedProject(newPro);
    //   }
    // });
    $scope.$watch('webParams.selectedCompany', function (newVal, oldVal) {
      if (!angular.equals(newVal, oldVal)) {
        console.log("newCompany: ", newVal);
        $scope.webParams.selectedProject = null;
        if (!newVal) {
          return Popup.confirm("请选择一个公司");
        }
        $scope.projects = $scope.projectList.filter(function (pro) {
          return newVal.projectIds.some(function (proId) {
            return pro.projectId == proId;
          })
        });
      }
    });
    $scope.$watch('webParams.selectedProject', function (newVal, oldVal) {
      $ionicTabsDelegate.showBar(false);
    });
  })
  /*
   *  主页使用的ctrl
   */
  .controller('HomeCtrl',
    function ($scope, $cordovaBarcodeScanner, $ionicNavBarDelegate, $stateParams, WorkOrderApi, Popup, $ionicTabsDelegate, $ionicPlatform, $cordovaFileTransfer, eamFaultWorkOrderFactory, $ionicHistory, Storage, eamSync, eamFile, eamDB, SQLVersion, $state, OrderService, $rootScope) { //首页
      var token = null;
      var firstLogin = $stateParams.data && $stateParams.data.firstLogin;//是否第一次登陆
      var needSyncData = $stateParams.data && $stateParams.data.needSyncData;//是否需要同步数据
      /**
       * 回到首页，执行如下代码
       */
      $scope.$on('$ionicView.beforeEnter', function (event) {
        console.log("$ionicView.beforeEnter");
        firstLogin = $stateParams.data && $stateParams.data.firstLogin;//是否第一次登陆
        needSyncData = $stateParams.data && $stateParams.data.needSyncData;//是否需要同步数据
        console.log("$stateParams", $stateParams, "firstLogin", firstLogin, "needSyncData", needSyncData);
        if (!window.cordova) { //电脑上执行
          $ionicPlatform.ready(function () {
            firstCkeckBaseData();
          });
        }
        document.addEventListener("deviceready", function () { //手机上执行
          cordova.getAppVersion.getVersionNumber().then(function (version) {
            firstCkeckBaseData(Storage.getCurrentAppVersion() !== version);
          });

        }, false);
      });
      $scope.logout = function () {
        $state.go("tab.my", {
          userId: token
        });
      };
      $scope.processCnt = {
        faultOrderCnt: 0,
        repairCnt: 0,
        technicalCnt: 0,
        installCnt: 0
      };
      // var showBar =  $ionicNavBarDelegate.$getByHandle("top-nav-handler").showBar(false);
      // console.log("showBar",showBar);
      // $rootScope.showNavBar=false;
      $scope.initAuthData = function () {
        var auths = Storage.getProfile() ? Storage.getProfile().list : null;
        if (auths) {
          // console.log("auths " + auths.length + JSON.stringify(auths, undefined, 2));
          console.log("auths " + auths.length);
          // if (!$rootScope.auth) {
          $rootScope.auth = {};
          // }
          for (var i in auths) {
            $rootScope.auth["auth_" + auths[i]] = true;
          }
          // console.log("root auths " + auths.length +  JSON.stringify($rootScope.auth ,undefined, 2) );
          console.log("root auths " + auths.length);
        }
      }; //初始化权限
      var initbadge = function () {
        //未处理工单数量(这个位置获取的数据可能不准确，应该采用全局变量，并在同步完工单数据后进行统计显示)
        var init = function () {
          $stateParams.data = {};//发现回到首页，$stateParams.data.needSyncData之类的值还存在
          $stateParams.data.needSyncData = null;
          $stateParams.data.firstLogin = null;
          console.log("$stateParams.data={}");
          if (!db) {
            return;
          }
          eamFaultWorkOrderFactory.getProcessingNumber(function (status, res) {
            if (status) {
              console.log("getProcessingNumber");
              $scope.processCnt.faultOrderCnt = res;
            } else {
              eamSync.synclog(res);
            }
          });
          eamSync.runsyncjob();
        };
        if (window.cordova) {
          document.addEventListener('deviceready', function () {
            init();
          });
        } else {
          init();
        }
      };
      //同步基础数据
      $scope.initSyncData = function (baseSyncFunctions, callback) {
        //如果没有同步完所有数据 那么在进入Home直接同步，如果同步完了所数据，只开启一次定时同步
        //根据同步
        if (isDebug) {
          console.log("db: " + JSON.stringify(db, undefined, 2));
        }
        eamSync.sync(baseSyncFunctions, function (status, err) {
          if (status) {
            needSyncData = false;//同步完所有数据后,需要将该标志位置FALSE，原因是tab是直接跳转url,不是$state.go();
            firstLogin = false;//同步完所有数据后,需要将该标志位置FALSE，原因是tab是直接跳转url,不是$state.go();
            if (angular.isFunction(callback)) callback();
          } else {
            Popup.confirm("同步基础数据失败", function okContinue() {
              // $scope.initSyncData(baseSyncFunctions, callback);//递归
              syncDataAction(baseSyncFunctions);
            }, function no() {
              eamSync.stopSync("在首页sync基础数据同步失败");
              $state.go("login");
            }, "继续", "停止");
          }
        });
      };
      //第一次检查网络状态，wifi 时 可以下载所有数据，非wifi 提示用户当前的网络环境，点击'确定'继续下载，点击'取消'
      function firstCkeckBaseData(isUpdateApp) {
        token = Storage.getAccessToken();
        //如果没选择公司，直接回到登录界面
        var lastLoginDate = new Date(Storage.getLastLoginDate());
        var curDate = new Date();
        if (!StringUtils.isNotEmpty(token)
          || isUpdateApp
          || !Storage.getSelectedProject()
          || !Storage.getSelectedProject().projectId
          || !(lastLoginDate.getFullYear() === curDate.getFullYear()//如果不是当天，需要重新登录一次
          && lastLoginDate.getMonth() === curDate.getMonth()
          && lastLoginDate.getDay() === curDate.getDay())
        ) {
          $ionicHistory.clearHistory();
          $ionicHistory.clearCache();
          $state.go("login", {});
          return;
        }
        $scope.currentSelectedProjectName = Storage.getSelectedProject().projectName;
        $ionicTabsDelegate.showBar(true);
        $scope.initAuthData();
        if (!db) {
          db = eamDB.openDB(DB_NAME, function () {
            if (isDebug) {
              console.log("db打开成功: " + JSON.stringify(db, undefined, 2));
            }
          });
        }
        Popup.waitLoad("正在加载数据");
        eamSync.checkBaseFuncsStat().then(
          function success(baseFuncs) {
            Popup.hideLoading();
            syncDataAction(baseFuncs);
          },
          function fail(err) {
            Popup.hideLoading();
          }
        )
      }

      /**
       * 同步基础数据
       * @param baseSyncFunctions
       */
      function syncDataAction(baseSyncFunctions) {
        console.log("需要同步的函数：", baseSyncFunctions, "firstLogin", firstLogin);
        console.log("needSyncData", needSyncData, "firstLogin", firstLogin);
        if (firstLogin || needSyncData) {//如果第一次登陆,或者需要下载业务数据
          baseSyncFunctions = baseSyncFunctions.concat(eamSync.getDownSyncBusinessFunctions());
        }
        console.log("首页，还需要同步数据的函数： ", baseSyncFunctions);
        if (baseSyncFunctions && baseSyncFunctions.length > 0) {
          if (window.cordova) {
            $rootScope.checkNetWorkState()
              .then(function () {
                if (isDebug) {
                  console.log("$rootScope.isOnline && !$rootScope.isWiFi" + $rootScope.isOnline && !$rootScope.isWiFi);
                  console.log("$rootScope.isOnline && $rootScope.isWiFi" + $rootScope.isOnline && $rootScope.isWiFi);
                }
                if ($rootScope.isOnline && !$rootScope.isWiFi) {
                  var title = "基础数据下载";
                  var option = {
                    title: "友情提醒",
                    templateUrl: 'views/common/downloadBaseDataTemplate.html',
                    cancelText: "否",
                    okText: "是"
                  };
                  Popup.popupConfirm(confirm, option, title, cancel);
                  //下载基础数据 之前提示用户
                  //点击取消，返回登录界面
                  function cancel() {
                    $state.go("login", {});
                  }

                  //点击确认 在4G 环境下下载数据
                  function confirm() {
                    $scope.initSyncData(baseSyncFunctions, function () {
                      initbadge();
                    })
                  }
                } else if ($rootScope.isOnline && $rootScope.isWiFi) {
                  //提示
                  $scope.initSyncData(baseSyncFunctions, function () {
                    initbadge();
                  });
                } else {
                  Popup.loadMsg("请检查网络");
                }
              }, function (err) {
                Popup.promptMsg("网络不通", '网络问题')
              });
          } else {//电脑上
            $scope.initSyncData(baseSyncFunctions, function () {
              initbadge();
            })
          }
        } else {
          initbadge();
        }

      }
    })

  .controller('MyCtrl', function ($scope, Popup, $state, eamSync, DataCache, $ionicHistory, $stateParams,
                                  $rootScope, $cordovaAppVersion, $cordovaNetwork, $ionicPopup, $timeout,
                                  CommonApi, Storage, SQLVersion, $cordovaInAppBrowser, eamFile) {
    var userId = $stateParams.userId;
    //要显示的当前app版本号，初始化为 0.0.0.0
    $scope.currentVersion = "0.0.0";
    $scope.logout = function () {
      Popup.confirm("你确定要退出吗", function () {
        Popup.waitLoad("正在退出...");
        CommonApi.logout(function (resp) {
          if (resp.success) {
            // Popup.waitLoad("正在清空用户数据，请稍后...");
            // Popup.hideLoading();
            // DataCache.clearCache();
            $state.go("login");
          } else {
            Popup.hideLoading();
            Popup.promptMsg("退出失败，请检查网络或者联系服务器管理员retCode=" + resp.retCode);
          }
        }, userId);

      });
    };
    $scope.syncData = function () {//手动同步数据
      eamSync.sync(undefined, function (status) {
        console.log(status);
        if (status) {
          setTimeout(function () {
            if (!Storage.getAccessToken()) {
              return;
            }
            Popup.loadMsg('同步成功');
          });
        } else {
          setTimeout(function () {
            Popup.loadMsg("同步失败");
          });
        }
      })
    };
    $scope.$on('$ionicView.beforeEnter', function (event) {
      $scope.selectedProject = Storage.getSelectedProject();
      $scope.selectedCompany = Storage.getSelectedCompany();
      $scope.profileInfo = Storage.getProfile();
    });
    $scope.switchProject = function () {
      $state.go("tab.selectProjectFromMy", {
        data: {
          firstLogin: false//已经不是第一次登陆
        }
      });
    };
    $scope.wifiSwitch = {
      onlyWifi: $rootScope.onlyWifi
    };
    $scope.wifiSwitchAction = function (e) {
      e.stopPropagation();
      // console.log("仅WiFi: ",$scope.wifiSwitch.onlyWifi);
      $rootScope.onlyWifi = $scope.wifiSwitch.onlyWifi;
      return false;
    };
    $scope.goAbout = function () {
      $state.go("tab.about", {})
    };
    //通过插件获取当前APP的版本号
    window.onload = function () {
      (function () {
        if (window.cordova) {
          cordova.getAppVersion.getVersionNumber().then(function (version) {
            $scope.currentVersion = version;
            VERSION_ID = version;
          });
        } else {
          $scope.currentVersion = VERSION_ID;
        }

      })()
    };
    window.onload();
    console.log($scope.profileInfo);
    // CommonApi.getProfileInfo(function (resp) {
    //   if (resp.success) {
    //     $scope.profileInfo = resp.data;
    //   }
    // }, {});

    //检查更新
    $scope.upgradeVersion = function () {
      var versionFlag = ionic.Platform.isIOS() ? 1 : 2;
      var version = Storage.getCurrentAppVersion();
      if (!window.cordova) {
        Promise.resolve().then(function () {
          CommonApi.getUpgradeVersionInfo(function (res) {
            if (!res.success) {
              throw new Error("获取应用版本号信息失败" + (res.retInfo ? res.retInfo : ""));
            }
            Popup.hideLoading();
            var appVersion = res.data.dataObject.serverVersion;
            var upgradeInfo = res.data.dataObject.upgradeInfo;
            var url = res.data.dataObject.updateUrl;
            //获取当前app版本信息
            if (VERSION_ID !== appVersion) {
              showUpdateConfirm(upgradeInfo, url);
            } else {
              Popup.promptMsg('没有新版本可用', "更新提示");
            }
          }, {versionFlag: versionFlag});
        }).catch(function (e) {
          Popup.promptMsg(JSON.stringify(e));
        });
        return;
      }
      onReady();
      function onReady() {
        cordova.getAppVersion.getVersionNumber().then(function (version) {

        });
        Popup.waitLoad('正在检查是否有可更新版本');
        CommonApi.getUpgradeVersionInfo(function (res) {
          if (!res.success) {
            throw new Error("获取应用版本号信息失败" + (res.retInfo ? res.retInfo : ""));
          }
          Popup.hideLoading();
          var appVersion = res.data.dataObject.serverVersion;
          var upgradeInfo = res.data.dataObject.upgradeInfo;
          var url = res.data.dataObject.updateUrl;
          console.log("platform is ios: " + ionic.Platform.isIOS());
          //获取当前app版本信息
          if (version !== appVersion) {
            showUpdateConfirm(upgradeInfo, url, appVersion);
          } else {
            Popup.promptMsg('没有新版本可用', "更新提示");
          }
        }, {versionFlag: versionFlag});
      }
    };

    var showUpdateConfirm = function (upgradeInfo, updateUrl, versionId) {
      // $ionicPopup.show({
      //   template: '<p>更新信息：' + upgradeInfo + '</p>',
      //   title: '有新版本可用，是否要更新',
      //   scope: $scope,
      //   buttons: [
      //     {text: '取消'}, {
      //       text: '更新',
      //       type: 'button-positive',
      //       onTap: function () {
      //         window.open(encodeURI(updateUrl), '_system');
      //       }
      //     }
      //   ]
      // });
      Popup.popupConfirm(function () {

      }, {
        template: '<p>更新信息：' + upgradeInfo + '</p>',
        title: '有新版本可用，是否要更新',
        scope: $scope,
        buttons: [
          {text: '取消'}, {
            text: '更新',
            type: 'button-positive',
            onTap: function () {
              window.open(encodeURI(updateUrl), '_system');
            }
          }
        ]
      })

    }
  })
  /**
   * 浏览图片
   */
  .controller('ShowImageCtrl',
    function ($scope, $stateParams, $ionicTabsDelegate, $ionicHistory, eamFile, Popup, modifiedJson) {
      $scope.imgList = $stateParams.data && $stateParams.data.imgList || modifiedJson.getMockEaWoFilemappingList();
      $scope.index = $stateParams.data && $stateParams.data.index || 0;
      $ionicTabsDelegate.showBar(false);
      console.log("图片浏览器", $scope.imgList, $stateParams.data);
      var parameters = {
        pagination: '.swiper-pagination',
        paginationType: 'bullets',
        direction: 'horizontal',
        effect: 'coverflow',
        onTap: function (swiper) {
          $ionicHistory.goBack();
          $ionicTabsDelegate.showBar(true);
        },
        onSlideChangeEnd: function (swiper) {
          console.log(swiper.activeIndex);
          var file = $scope.imgList[swiper.activeIndex];
          // eamFile.downloadAttachedFile(file).then(function (downloadedFile) {
          //   angular.merge(file,downloadedFile);
          //   // swiper.update();
          // },function (err) {
          //
          // });
          eamFile.isLocalExist(file)
            .then(function () {
              swiper.update();
              swiper.unlockSwipes();
            }, function (err) {
              swiper.lockSwipes();
              console.error(err);
              Popup.waitLoad("正在下载附件...");
              eamFile.downloadAttachedFile(file)
                .then(function (downloadedFile) {
                  Popup.hideLoading();
                  angular.merge(file, downloadedFile);
                  swiper.update();
                  swiper.unlockSwipes();
                }, function (err) {
                  Popup.hideLoading();
                  swiper.unlockSwipes();
                });
            });
        }
      };
      var mySwiper = new Swiper('.swiper-container', parameters);
      mySwiper.slideTo($scope.index);
    })
  .controller('AboutCtrl', function ($scope) {
  })
  .controller("EditBlockTextCtrl", function ($scope, $stateParams, $ionicHistory, Popup) {
    $scope.title = $stateParams.data.title || "编辑内容";
    var editObj = $stateParams.data.editObj;//编辑的对象
    var editField = $stateParams.data.editField;//对象的某个字段
    // console.log($stateParams.data);
    $scope.params = {editContent: editObj[editField]};
    $scope.confirmEdit = function () {
      if (!$scope.params.editContent || !StringUtils.isNotEmpty($scope.params.editContent)) {
        return Popup.promptMsg("请输入内容");
      }
      editObj[editField] = $scope.params.editContent;
      // console.log($stateParams.data.editObj[editField]);
      $ionicHistory.goBack();
    }
  });
