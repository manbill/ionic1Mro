starter
  .controller('FanEquipmentsCtrl',
    function ($rootScope, $scope, DeviceTreeService, SyncCommonDeviceEquipment, eamSync,
              Popup, OrderService, Storage, $timeout,$ionicScrollDelegate, $state, $ionicModal) { //设备树
      $scope.fanEquipmentList = [];
      $scope.initSearchParams = function () {//初始化参数
        // Popup.waitLoad();
        $scope.isMoreFanListData = true;
        $scope.pageNumber = 1;
        $scope.fanEquipmentList = [];
        $scope.fanSearchParams = {
          machinePositionNo: null,//机位号
          machineId: null,//风机ID
          projectId: null,
          areaCode: null
        };
      };
      $scope.initSearchParams();
      DeviceTreeService.queryAreas(function (areas) {
        $scope.areas = areas;
      });
      $scope.$on(CFPLOADINGBAR_REFRESHCOMPLETED, function () {
        $scope.$broadcast('scroll.refreshComplete');
      });
      DeviceTreeService.queryProjects(function (projects) {
        $scope.projects = projects;
      });
      $scope.doRefreshFanEquipmentList = function () {//下拉刷新
        eamSync.sync(['SyncCommonDeviceEquipment.downloadList'], function (res) {
          if (res) {
            Popup.loadMsg("同步数据成功", 1200);
          }
          $scope.initSearchParams();
          $scope.loadMoreFanListData();
          $scope.$broadcast('scroll.refreshComplete');
        });
      };
      $scope.loadMoreFanListData = function () {//加载更多参数
        Popup.waitLoad();
        Popup.delayRun(function () {
          Popup.hideLoading();
        },null,500);
        DeviceTreeService.getAllDataOfFanEquipments($scope.pageNumber, $scope.fanSearchParams, function (fanEquipments) {
          // console.log(fanEquipments);
          Popup.hideLoading();
          $scope.$broadcast('scroll.infiniteScrollComplete');
          if (fanEquipments.length > 0) {
            $scope.fanEquipmentList = $scope.fanEquipmentList.concat(fanEquipments);
            $scope.pageNumber++;
            $scope.isMoreFanListData = true;
          } else {
            $scope.isMoreFanListData = false;
          }
        });
      };
      $scope.goFanEquipmentDetail = function (fanEquipment) {
        $state.go("tab.deviceTree", {
          data: fanEquipment['id']
        });
      };
      $scope.loadMoreFanListData();
      $scope.backButtonAction = function () {
        $scope.closeModal();
      };
      $ionicModal.fromTemplateUrl('views/devicetree/fanFilter.html', {
        scope: $scope,
        animation: 'slide-in-up'
      }).then(function (modal) {
        $scope.modal = modal;
      });
      $scope.filterFanData = function () {
        $scope.modal.show();
      };
      $scope.closeModal = function () {
        $scope.modal.hide();
      };
      // Cleanup the modal when we're done with it!
      $scope.$on('$destroy', function () {
        $scope.modal.remove();
      });
      $scope.queryByCondition = function () {
        if(isDebug){
          console.log($scope.fanSearchParams);
        }
        $scope.pageNumber = 1;
        $scope.fanEquipmentList = [];
        $scope.loadMoreFanListData();
        $scope.closeModal();
        Popup.delayRun(function () {
          $ionicScrollDelegate.scrollTop();
        },null,200);
      }

    }
  )
  .controller('DeviceTreeCtrl',
    function ($rootScope, $scope, $stateParams, $ionicScrollDelegate, $state, eamSync, $ionicHistory, DeviceTreeApi, Popup, DeviceTreeService) {
      var params = angular.fromJson($stateParams.data);
      Popup.waitLoad();
      $scope.isCollapseAll = true;
      $scope.id = $stateParams.data;
      if (params && params["isSelectingEquipment"]) {//选择设备
        $scope.id = params["id"];
      }
      $scope.expandOrCollapseAll = function () {
        if (!$scope.isCollapseAll) {
          $scope.isCollapseAll = true;
          $scope.$broadcast('angular-ui-tree:collapse-all');
        } else {
          $scope.expandAll();
        }
      };

      $scope.expandAll = function () {
        $scope.$broadcast('angular-ui-tree:expand-all');
        $scope.isCollapseAll = false;
      };
      $scope.toggle = function (scope) {
        scope.toggle();
      };
      $scope.fanEquipmentTree = [];
      $scope.replaceProperties = function (obj) {
        if ($.isArray(obj)) {
          angular.forEach(obj, function (value, key) {
            $scope.replaceProperties(value);
          }, obj);
        } else {
          angular.forEach(obj, function (value, key) {
            if (key == 'equipmentName') {
              this.text = value;
              delete this[key];
            }
            if (key == 'childDeviceTrees') {
              this.icon = 'icon ion-ios-cog-outline fanStyle';
              if (value && value.length > 0) {
                if (value[0]['parentId'] == 0) {
                  this.icon = 'icon icon-fanequipment fanStyle';
                }
                $scope.replaceProperties(value);
              }
              this.children = value;
              delete this[key];
            }
          }, obj);
        }
      };
      DeviceTreeService.querySpecEquipmentDetails($scope.id, function (res) {
        Popup.hideLoading();
        if (!res) {
          return;
        }
        $scope.fanEquipmentTree.push(JSON.parse(res["equipmentTreeJson"]));
        $scope.treeData = angular.copy($scope.fanEquipmentTree);
        $scope.replaceProperties($scope.treeData);
        $('#equipmentsTree')
          .on('select_node.jstree', function (e, data) {
            var selectedNode = data.node.original;
            $scope.browseEquipmentDetail(selectedNode);
          })
          .on("after_open.jstree", function (e, data) {
            $ionicScrollDelegate.resize();
          })
          .on("close_node.jstree", function (e, data) {
            $ionicScrollDelegate.resize();
          })
          .jstree({
            'core': {
              'data': $scope.treeData,
              "themes": {
                "variant": "large",
                'stripes': true,
                'icons': true,
                'check_callback': false
              },
              "multiple": true,
              "animation": 100
            }
          });
        $scope.equipmentsDetailsJson = JSON.parse(res["equipmentsDetailsJson"]);
        $scope.fanMachineInfo = JSON.parse(res["fanMachineInfo"]);
      });
      $scope.browseEquipmentDetail = function (fanEquipment) {
        $scope.isMachineInfo = true;//点击的是风机信息
        for (var i in $scope.equipmentsDetailsJson) {
          if ($scope.equipmentsDetailsJson[i]["equipmentId"] == fanEquipment['equipmentId']) {
            $scope.equipmentDetail = $scope.equipmentsDetailsJson[i];
            $scope.isMachineInfo = false;
            break;
          }
        }
        $state.go("tab.equipmentDetail", {
          data: JSON.stringify({
            equipmentDetail: $scope.equipmentDetail,
            machineInfo: $scope.fanMachineInfo,
            isMachineInfo: $scope.isMachineInfo,
            isSelectingEquipment: false
          })
        });
      }
    })
  .controller('EquipmentDetailCtrl', function ($rootScope, $state, $stateParams, eamFile,$ionicHistory, $scope) {
    var params = angular.fromJson($stateParams.data);
    $scope.isSelectingEquipment = params["isSelectingEquipment"];
    $scope.isMachineInfo = params["isMachineInfo"];
    $scope.equipmentDetail = params['equipmentDetail'];
    console.log($scope.equipmentDetail);
    $scope.machineInfo = params['machineInfo'];
    $scope.openFile=function (file,index) {
      eamFile.openEamAttachedFile(file).then();
    }
  })
  .controller("SelectedEquipmentCtrl", function ($rootScope, $timeout, $scope, Params, $stateParams, $state, eamSync, $ionicHistory, DeviceTreeApi, Popup, DeviceTreeService) {
    var params = $stateParams.data;
    console.log(params);
    if (!params) {
      return;
    }
    $scope.replaceProperties = function (obj) {
      if ($.isArray(obj)) {
        angular.forEach(obj, function (value, key) {
          $scope.replaceProperties(value);
        }, obj);
      } else {
        angular.forEach(obj, function (value, key) {
          if (key == 'equipmentName') {
            this.text = value;
            delete this[key];
          }
          if (key == 'childDeviceTrees') {
            this.icon = 'icon fanStyle ion-ios-cog-outline icon-size';
            if (value && value.length > 0) {
              if (value[0]['parentId'] == 0) {
                this.icon = 'icon icon-fanequipment  fanStyle';
              }
              $scope.replaceProperties(value);
            }
            this.children = value;
            delete this[key];
          }
        }, obj);
      }
    };
    $scope.positionCode = params['apiWorkorderBaseInfoDto']['positionCode'];
    $scope.projectId = params['apiWorkorderBaseInfoDto']['projectId'];
    console.log($scope.positionCode);
    Popup.waitLoad();
    $scope.fanEquipmentTree = [];
    function generateEquipmentTree() {
      $scope.treeData = angular.copy($scope.fanEquipmentTree);
      $scope.replaceProperties($scope.treeData);
      $('#selectedEquipmentsTree')
        .on('select_node.jstree', function (e, data) {
          var selectedNode = data.node.original;
          $scope.browseEquipmentDetail(selectedNode);
        }).jstree({
        'core': {
          'data': $scope.treeData,
          "themes": {
            "variant": "large",
            'stripes': true
          },
          "multiple": true,
          "animation": 100
        }
      });
    }

    if ($scope.positionCode) {//通过$scope.positionId字符串匹配查询，如果是修改故障工单
      DeviceTreeService.querySpecEquipmentsByPositionId($scope.projectId + "", +$scope.positionCode, function (machine) {
        if (!machine) {
          Popup.confirm("没有风机设备,是否同步风机设备信息?", function () {
            eamSync.sync(['SyncCommonDeviceEquipment.downloadList'],function () {

            });
            $ionicHistory.goBack();
          }, function () {
            $ionicHistory.goBack();
          }, "确定", "取消");
          return;
        }
        DeviceTreeService.querySpecEquipmentDetails(machine["id"], function (res) {
          Popup.hideLoading();
          if (!res) {
            return;
          }
          $scope.fanEquipmentTree.push(JSON.parse(res["equipmentTreeJson"]));
          generateEquipmentTree();
          $scope.equipmentsDetailsJson = JSON.parse(res["equipmentsDetailsJson"]);
          $scope.fanMachineInfo = JSON.parse(res["fanMachineInfo"]);
        });
      })
    } else {
      Popup.promptMsg("风机不存在");
      $timeout(function () {
        Popup.hideLoading();
        $ionicHistory.goBack();
      }, 500);
      return;
    }
    $scope.goBackLastPage = function () {
      $ionicHistory.goBack();
    };
    $scope.browseEquipmentDetail = function (fanEquipment) {
      $scope.isMachineInfo = true;//点击的是风机信息
      for (var i in $scope.equipmentsDetailsJson) {
        if ($scope.equipmentsDetailsJson[i]["equipmentId"] == fanEquipment['equipmentId']) {
          $scope.equipmentDetail = $scope.equipmentsDetailsJson[i];
          $scope.isMachineInfo = false;
          break;
        }
      }
      if ($scope.isMachineInfo) {
        Popup.loadMsg("请您点选设备！");
        return;
      }
      Popup.confirm("选择设备?", function () {
        Params.setTransferredObjByKey("selectedEquipment", $scope.equipmentDetail);
        $ionicHistory.goBack();
      }, function () {
        Params.setTransferredObjByKey("selectedEquipment", null);
        $ionicHistory.goBack();
      }, "确定")
    }
  });
