starter
//库存查询首页
  .controller('RepertoryCtrl', function ($scope,$ionicScrollDelegate, $ionicModal, $state, OrderService, Popup,  ServiceRepertory) {
    $scope.materiels = [];
    $scope.search = {};
    $scope.page = 0;
    $scope.hasMoreData = false;
    $scope.doRefreshRepertoryData = function () {
      $scope.search = {};
      $scope.query();
    };
    var init = function () {
      OrderService.getDicListByType("machine_model", function (res) {
        $scope.machineModels = res;
        for (var i in  $scope.machineModels) {
          $scope.machineModels[i]["detailId"] = $scope.machineModels[i]["detailName"];
        }
        $scope.machineModels.unshift({detailName: "请选择", detailId: ""});
        $scope.search.machineModel = "";
      });
    };
    init();

    //初始化过滤器
    $ionicModal.fromTemplateUrl("views/repertory/searchFilter.html", {
      scope: $scope,
      animation: "slide-in-up"
    }).then(function (modal) {
      $scope.filterModal = modal;
      //页面初始化完成自动打开。
      $scope.filterModal.show();
    }, function (err) {
    });


    $scope.openFilter = function () {
      $scope.filterModal.show();
    };
    $scope.backButtonAction = function () {
      $scope.filterModal.hide();
    };

    $scope.query = function () {
      $scope.hasMoreData = true;
      $scope.page = 0;
      $scope.materiels = [];
      $scope.loadMoreData();
      $scope.filterModal.hide();
      Popup.delayRun(function () {//200ms滚动到顶部
        $ionicScrollDelegate.scrollTop();
      },null,200);
    };


    //上拉加载更多
    $scope.loadMoreData = function () {
      $scope.page++;
      ServiceRepertory.list($scope.page, $scope.search, function (rows) {
        $scope.$broadcast('scroll.infiniteScrollComplete');
        if (rows.length > 0) {
          $scope.materiels = $scope.materiels.concat(rows);
        } else {
          $scope.hasMoreData = false;
        }
      });
    };


    /**
     * 查看物料详情，以及库存详情信息
     * @param data
     */
    $scope.showDetail = function (detail) {
      $state.go("tab.repertoryDetail", {
        data: detail
      });
    }

  })
/**
 * 查看物料详情
 */
  .controller('RepertoryDetailCtrl', function ($scope, $state, eamFile, Storage,$rootScope, $stateParams, RepertoryApi, ServiceRepertory, Popup, eamSync, modifiedJson) {
    $scope.detail = $stateParams.data;
    if (isDebug) {
      console.log("RepertoryDetailCtrl,detail: ", $scope.detail);
    }
    //$scope.detail.repertory=$scope.detail.repertory.filter();
    $scope.currentArea=Storage.getProfile()['areaCode'];
    $scope.initimg = function (detail) {
      Popup.waitLoad("正在初始化附件...");
      eamFile.retrieveInfoOrInsertFileRecord(detail)
        .then(function () {
          Popup.hideLoading();
        }, function (err) {
          Popup.hideLoading();
          Popup.promptMsg(JSON.stringify(err, undefined, 2), "附件处理错误")
        });
    };
    //判断当前网路状况，如果网路畅通，则从网络获取库存信息，否则显示本地库存信息（有库存信息的话）  todo 生产环境时打开
    $rootScope.checkNetWorkState()
      .then(function () {
        loadDataFromServerOrLocal();
      });


    //筛选出 假数据 获取该物料对应额库存信息 todo
    //  function getTheStore(){
    //     $scope.storeListToFilter =   modifiedJson.getMockStoreList();
    //      $scope.storeListToFilter.filter(function (item) {
    //          console.log(item);
    //          return item['belongArea']==$scope.currentArea;
    //      });
    //  }
    //   getTheStore();

    //todo 跳转到 库存列表界面
    $scope.goStoreList = function () {
      // $scope.detail.repertory = $scope.repertory;
      $state.go('tab.storeList',{
          data:{
              title:"库存信息",
              detail:$scope.detail,//物料详情
              repertory : $scope.detail.repertory//当前项目所在区域的库存信息  todo 生产环境时打开 并替换掉下句代码
              // repertory : $scope.storeListToFilter//当前项目所在区域的库存信息
          }
      });
    };

    //sap接口 获取所有的库存信息  筛选出 当前项目所在区域的库存信息
    function loadDataFromServerOrLocal() {
      if ($rootScope.isOnline) {
        Popup.waitLoad("正在更新库存信息……");
        RepertoryApi.getMaterialRepertory(function (req) {
          if (isDebug) {
            console.log("RepertoryDetailCtrl,getMaterialRepertory: req=", JSON.stringify(req, undefined, 2));
          }
          Popup.hideLoading();
          if (req.success) {
            if (req.data) {
              $scope.repertory = req.data.repertoryDTOs;
              $scope.detail.materialPicList = req.data.filemappingDtoList;
              $scope.detail.repertory = $scope.repertory
                .filter(function (item) {
                  // console.log(item);
                  return item['belongArea']==$scope.currentArea;
                });
              $scope.initimg($scope.detail);
              // ServiceRepertory.update($scope.detail, function () {
              // });
            }
          } else {
            $scope.initimg($scope.detail);
            Popup.promptMsg(req.retInfo || "物料无可用库存", "在线库存查询");
          }
        }, {
          materialNo: $scope.detail.materialSno,
          materialId: $scope.detail.materialId
        });
      } else {
        $scope.initimg($scope.detail);
      }
    }

    $scope.downloadImage = function (image, index) {
      var filePath = image.filePath;
      var fileId = image.fileId;
      eamFile.openEamAttachedFile(image).then();
    };//downloadImage end·······


    $scope.openFile = function (fileItem) {
      eamFile.openEamAttachedFile(fileItem)
        .then();
    }

  })
    //库存列表
    .controller("StoreListCtrl", function ($scope, $rootScope, $state, $stateParams, Popup , RepertoryApi, modifiedJson) {

    // 默认显示 当前项目相关 的库存信息 todo 生产环境 打开
        $scope.storeList = $stateParams.data.repertory;
        // $scope.storeList = $stateParams.data.repertory;
        console.log("storeList ",$scope.storeList);
        $scope.detail = $stateParams.data.detail;
    //    根据当前项目  获取对应的库存信息


    // 点击右上角的 所有库存则显示 全国 所有的库存新信息
        $scope.allStore = function () {
            // $scope.storeList = modifiedJson.getMockStoreList();
        //  显示所有库存信息  todo 生产环境 打开注释
            $rootScope.checkNetWorkState()
                .then(function () {
                    loadDataFromServerOrLocal();
                });
        };


        //获取 所有库存信息
        function loadDataFromServerOrLocal() {
            if ($rootScope.isOnline) {
                Popup.waitLoad("正在更新库存信息……");
                RepertoryApi.getMaterialRepertory(function (req) {
                    if (isDebug) {
                        console.log("RepertoryDetailCtrl,getMaterialRepertory: req=", JSON.stringify(req, undefined, 2));
                    }
                    Popup.hideLoading();
                    if (req.success) {
                        if (req.data) {
                            $scope.storeList = req.data.repertoryDTOs;
                            console.log("storeList", JSON.stringify($scope.storeList));
                        }
                    } else {
                        Popup.promptMsg(req.retInfo || "物料无可用库存", "在线库存查询");
                    }
                }, {
                    materialNo: $scope.detail.materialSno,
                    materialId: $scope.detail.materialId
                });
            } else {
                Popup.loadMsg("网络错误", 700);
            }
        }

    //    点击一条库存信息的名字，跳转到详情界面
        $scope.goToStoreDetail = function (repertoryItem) {
            $state.go("tab.storeDetail",{
                data:{
                    storeDetail : repertoryItem
                }
            })
        };

    })

    //库存详情
    .controller("StoreDetailCtrl", function ($rootScope, $scope, $state, $stateParams ) {
        //库存详情信心
        $scope.storeDetail = $stateParams.data.storeDetail;
        console.log(" store detail ", $scope.storeDetail);



    })
;

