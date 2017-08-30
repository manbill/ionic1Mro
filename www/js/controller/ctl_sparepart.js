/**
 * 备件调拨相关控制器
 */
starter
/**
 * 备品备件列表
 */
  .controller('SparepartCtrl',
    function ($state, $scope, $rootScope, Popup, $ionicModal, SyncSparepart, $ionicScrollDelegate, $ionicListDelegate, Storage, OrderService, ServiceSparepart, eamSync) {

      $scope.spareparts = [];
      $scope.hasMoreData = false;
      $scope.isDefaultSearch = true;//默认查询,不显示已取消和完成的调拨单
      $scope.page = 1;
      var syncFunctions = ['SyncSparepart.downloadList'];
      //初始化查询筛选项参数
      var initSelect = function () {
        $scope.search = {};
        OrderService.getDicListByType("transfer_order_type", function (res) {
          $scope.transferOrderTypes = res;
          $scope.transferOrderTypes.unshift({detailName: "请选择", detailId: ""});
          $scope.search.transferTypeId = "";
        });
        OrderService.getDicListByType("transfer_reason", function (res) {
          $scope.transferReasons = res;
          $scope.transferReasons.unshift({detailName: "请选择", detailId: ""});
          $scope.search.transferReasonId = "";
        });
        OrderService.getDicListByType("transfer_status", function (res) {
          $scope.transferStatuses = res;
          $scope.transferStatuses.unshift({detailName: "请选择", detailId: ""});
          $scope.search.statusId = "";
        });
      };
      initSelect();
      //初始化过滤器
      $ionicModal.fromTemplateUrl("views/sparepart/filter.html", {
        scope: $scope,
        animation: "slide-in-up"
      }).then(function (modal) {
        $scope.filterModal = modal;
      }, function (err) {
      });

      /**
       * 打开查询过滤器
       */
      $scope.openFilter = function () {
        $scope.filterModal.show();
      };
      $scope.closeFilter = function () {
        $scope.filterModal.hide();
      };

      //搜索数据
      $scope.searchFilter = function () {
        //查询搜索选项
        $scope.page = 1;
        $scope.filterModal.hide();
        $scope.spareparts = [];
        //$scope.hasMoreData = false;
        $scope.isDefaultSearch = false;
        $scope.search.createOnEnd = DateUtil.searchEndDate($scope.search.createOnEnd);
        $scope.search.createOnBegin = DateUtil.searchStartDate($scope.search.createOnBegin);
        $scope.loadMoreData(function () {
          $ionicScrollDelegate.scrollTop();
        });
      };

      //下拉刷新数据
      $scope.refreshData = function () {
        $scope.search = {};
        eamSync.sync(syncFunctions, function () {
          $scope.page = 1;
          $scope.spareparts = [];
          $scope.isDefaultSearch = true;
          //$scope.hasMoreData = false;
          $scope.loadMoreData();
          $scope.$broadcast(SCROLL_REFRESH_COMPLETE);
        });
      };

      //上拉加载更多
      $scope.loadMoreData = function (callback) {
        $scope.search.isDefaultSearch = $scope.isDefaultSearch;
        ServiceSparepart.list($scope.page, $scope.search, function (rows) {
          $scope.$broadcast('scroll.infiniteScrollComplete');
          if (rows.length > 0) {
            $scope.page++;
            $scope.spareparts = $scope.spareparts.concat(rows);
            $scope.hasMoreData = true;
          } else {
            $scope.hasMoreData = false;
          }
          if (angular.isFunction(callback)) {
            callback();
          }
        });
      };

      /**
       * 创建新的调拨单
       */
      $scope.create = function () {
        $state.go("tab.createSparePartOrder");
      };

      $scope.showDetail = function (data) {
        console.log(data);
        // 未提交171；未处理172；处理中173；已完成174；被驳回175；已取消176
        //有编辑权限才能进入编辑界面
        if ($rootScope.auth['auth_310103'] && data.statusId == 172 || data.statusId == 175 || data.statusId == 171) {
          return $state.go('tab.sparePartEditDetail', {//编辑页面
            data: data.json
          });
        }
        //切换到详情页面中
        $state.go("tab.sparepartDetail", {
          data: data.json
        });
      };

      //$rootScope.flashSparepart = function () {
      //  $scope.refreshData();
      //};
      $scope.$on("$ionicView.beforeEnter", function () {
        $scope.refreshData();
      });
      //$scope.refreshData();
      $scope.deleteSparepart = function (sparepart, index) {
        Popup.confirm("删除调拨单", function () {
          SyncSparepart.deleteSparepart(sparepart.transferOrderId)
            .then(function () {
              $scope.spareparts.splice(index, 1);
              $ionicListDelegate.closeOptionButtons();
            }, function (err) {
              console.error(err);
            })
        }, null, "确定", "取消")
      }
    })
  //创建调拨单，在线操作
  .controller('CreateSparePartOrderCtrl',
    function ($scope, $state, $stateParams, Popup, SyncSparepart, Storage, $ionicHistory, OrderService, eamFile, starterClassFactory) {
      $scope.transferOrder = starterClassFactory.transferOrderInstance();
      console.log($scope.transferOrder);
      $scope.requestInventories = [];//收货仓库
      $scope.responseInventories = [];//发货仓库
      $scope.transferOrder.tOFilemappingDtoList = [];//附件列表
      OrderService.getDicListByType("transfer_status", function (res) {//调拨状态
        $scope.transferStatuses = res;
      });
      var profile = Storage.getProfile();
      var allInventories = Storage.getRepertory();//全部未停用的仓库
      var curProjects = [Storage.getSelectedProject()];//当前用户的项目
      if (profile.userType == 1) {//总部用户
        $scope.requestInventories = allInventories.filter(function (inventory) {//判断仓库级别：项目+204 区域+203 202
          return inventory.repertoryLevel == 202;//总部仓库
        });
        $scope.responseInventories = allInventories;//发货仓库
      }
      if (profile.userType == 2) {//区域用户
        $scope.requestInventories = allInventories.filter(function (inventory) {
          return inventory.repertoryLevel == 203//区域仓库
            && inventory.selProjects && inventory.selProjects.split(',').some(function (selProId) {//当前用户所属库位
              return curProjects.map(function (pro) {
                return pro.projectId;
              }).some(function (curProId) {
                console.log("curProId=", curProId, "selProId=", selProId);
                return curProId == selProId
              })
            })

        });
        $scope.responseInventories = allInventories;//发货仓库
      }
      if (profile.userType == 3) {//现场用户
        $scope.requestInventories = allInventories.filter(function (inventory) {
          return inventory.repertoryLevel == 204//现场仓库
            && inventory.selProjects && inventory.selProjects.split(',')
              .some(function (selProId) {//当前用户所属库位
              return Storage.getSelectedProject().projectId==selProId
            })
        });
        $scope.responseInventories = allInventories.filter(function (inventory) {//发货仓库
          return inventory.repertoryLevel == 203//区域仓库
            || inventory.repertoryLevel == 204//现场仓库
          // && inventory.belongArea == Storage.getSelectedProject().areaCode//该现场的所属区域
        });
        // $scope.responseInventories = allInventories.filter(function (inventory) {//发货仓库
        //   return inventory.repertoryLevel == 203 &&//区域仓库
        //     inventory.belongArea == Storage.getSelectedProject().areaCode//该现场的所属区域
        // });
      }
      $scope.selectInventory = function (type) {//仓库选择详细界面
        console.log($scope.requestInventories);
        var data = type === 'request' ?
          {
            inventories: $scope.requestInventories,
            isRequest: true
          } :
          {
            inventories: $scope.responseInventories,
            isRequest: false
          };
        $state.go('tab.selectInventory', {
          data: $.extend(data, {
            transferOrder: $scope.transferOrder,
            isCanEdit: true
          })
        });
      };
      $scope.params = {
        expectReceiveDateTime: null
      };
      $scope.$on('$ionicView.beforeEnter', function () {
        $scope.transferMaterialsInfo = $scope.transferOrder.tranferOrderItemDtoList ? $scope.transferOrder.tranferOrderItemDtoList
          .slice(0, 4)
          .map(function (m) {
            return m.materialNo
          }).join(",") : "";
      });
      $scope.$watch('params.transferReason', function (newReason, oldReason) {//调拨原因
        //后台$scope.transferOrder.transferReason需要一个Integer类型的值
        $scope.transferOrder.transferReason = $scope.transferOrder.transferReasonId = newReason ? newReason.detailId : null;
        // $scope.transferOrder.transferReason = newReason ? newReason.detailName : null;
      });
      $scope.$watch('params.transferOrderType', function (newVal, oldVal) {//调拨单类型，字典表37：常规备库164；紧急备库165
        //后台将transferType当做transferTypeId使用，需要一个Integer类型的值
        // $scope.transferOrder.transferType = newVal ? newVal.detailName : null;
        $scope.transferOrder.transferType = $scope.transferOrder.transferTypeId = newVal ? newVal.detailId : null;
        if (!angular.equals(newVal, oldVal)) {
          if (newVal && newVal.detailId == 164) {//常规,工单信息清空
            $scope.transferOrder.workorderCode = null;
            $scope.transferOrder.workOrderId = null;
          } else if (newVal && newVal.detailId == 165) {//紧急，调拨原因信息清空
            $scope.transferOrder.transferReasonId = null;
            $scope.transferOrder.transferReason = null;
          }
        }
      });
      // $scope.transferOrder.grWhName = $scope.requestInventories[0] ? $scope.requestInventories[0].repertoryName : null;//收货仓库名
      // $scope.transferOrder.grWhId = $scope.requestInventories[0] ? $scope.requestInventories[0].repertoryId : null;//收货仓库id
      // $scope.transferOrder.giWhId = $scope.responseInventories[0] ? $scope.responseInventories[0].repertoryName : null;//发货仓库名
      // $scope.transferOrder.giWhName = $scope.responseInventories[0] ? $scope.responseInventories[0].repertoryId : null;//发货仓库id
      $scope.gotoTransferMaterials = function () {//调拨物料
        $state.go("tab.sparepartdetailEditMateriel", {
          data: $scope.transferOrder
        });
      };
      //创建调拨单时 是否可以编辑图片（添加删除图片）
      $scope.isCanEditImg = function () {
        return true;
      };

      $scope.addeditAttachment = function () {
        var item = {
          workorderId: $scope.transferOrder.transferOrderId,
          fileActualName: $scope.transferOrder.transferOrderId || "" + "_DB_",
          fileOriginalName: $scope.transferOrder.transferOrderId || "" + "_DB_",
          source: AttachedFileSources.transferorder_info_source
        };
        eamFile.getPicture(item).then(function (fileItem) {
          $scope.transferOrder.tOFilemappingDtoList.push(fileItem);
        }, function (err) {
          Popup.promptMsg(JSON.stringify(err), '获取附件失败');
        })
      };

      /**
       * 删除图片附件
       * @param item
       * @param index
       */
      $scope.removeAttachment = function (item, index) {
        eamFile.removeAttachedFile(item)
          .then(function () {
            $scope.transferOrder.tOFilemappingDtoList.splice(index, 1);
          }, function (err) {
            Popup.promptMsg(JSON.stringify(err, undefined, 2), "删除附件失败");
          });
      };
      $scope.selectWorkOrder = function () {
        if (!$scope.transferOrder.grWhId) {
          Popup.loadMsg("请先选择收货仓库");
          return;
        }
        if (isDebug) {
          console.log("收货仓库", $scope.transferOrder.grWhName);
        }
        $state.go("tab.sparepartEditDetailWorkorder", {
          data: {
            detail: $scope.transferOrder,
            repertoryId: $scope.transferOrder.grWhId
          }
        });
      };
      OrderService.getDicListByType("transfer_order_type", function (res) {//调拨类型
        $scope.transferOrderTypes = res;
        //判断用户类型
        if (profile.userType != 3) {
          for (var i in $scope.transferOrderTypes) {
            if ($scope.transferOrderTypes[i].detailId == 165) {
              ArrayUitls.remove($scope.transferOrderTypes, $scope.transferOrderTypes[i]);
              break;
            }
          }
        }
      });
      OrderService.getDicListByType("transfer_reason", function (res) {//调拨原因
        $scope.transferReasons = res;
        if (profile.userType != 1) {
          for (var i in $scope.transferReasons) {
            if ($scope.transferReasons[i].detailId == 166) {
              ArrayUitls.remove($scope.transferReasons, $scope.transferReasons[i]);
              break;
            }
          }
        }
      });
      $scope.inputTextNum = 0;
      $scope.$watch('transferOrder.commentText', function (newVal, oldVal) {
        // console.log(newVal);
        if (newVal) {
          $scope.inputTextLen = newVal.len4FullWidthCharacterNChinese(3);
          //console.log($scope.inputTextLen);
          if ($scope.inputTextLen > 200) {
            Popup.loadMsg("备注信息太长", 1200);
          }
        }
      });
      $scope.submitTransferOrder = function (type) {
        console.log($scope.transferOrder);
        var loadMsgDelayTime = 1200;
        if (!$scope.transferOrder.grWhId) {//收货仓库
          return Popup.loadMsg("请选择收货仓库");
        }
        if (!$scope.params.expectReceiveDateTime) {
          return Popup.loadMsg("请输入期望到货时间");
        }
        $scope.transferOrder.expectReceiveDate = $scope.transferOrder.expectReceiveDateTime = $scope.params.expectReceiveDateTime.format('yyyy-MM-dd');
        if (!$scope.transferOrder.transferTypeId) {
          return Popup.loadMsg("请选择调拨类型");
        }
        if ($scope.transferOrder.transferTypeId == 164 && !$scope.transferOrder.transferReasonId) {//常规
          return Popup.loadMsg("请选择调拨原因");
        }
        if ($scope.transferOrder.transferTypeId == 165 && !$scope.transferOrder.workOrderId) {//紧急
          return Popup.loadMsg("请选择关联工单");
        }
        if (!$scope.transferOrder.giWhId) {//发货仓库
          return Popup.loadMsg("请选择发货仓库");
        }
        if ($scope.transferOrder.grWhContactNum && $scope.transferOrder.grWhContactNum.toString().len4FullWidthCharacterNChinese(3) > 50) {
          return Popup.loadMsg("收货仓库的电话号码太长", loadMsgDelayTime);
        }
        if ($scope.transferOrder.grWhContactName && $scope.transferOrder.grWhContactName.len4FullWidthCharacterNChinese(3) > 50) {
          return Popup.loadMsg("收货仓库的联系人名字太长", loadMsgDelayTime);
        }
        if ($scope.transferOrder.grAddress && $scope.transferOrder.grAddress.len4FullWidthCharacterNChinese(3) > 200) {
          return Popup.loadMsg("收货仓库的发货地址太长", loadMsgDelayTime);
        }
        if ($scope.transferOrder.giWhContactNum && $scope.transferOrder.giWhContactNum.toString().len4FullWidthCharacterNChinese(3) > 50) {
          return Popup.loadMsg("发货仓库的电话号码太长", loadMsgDelayTime);
        }
        if ($scope.transferOrder.giWhContactName && $scope.transferOrder.giWhContactName.len4FullWidthCharacterNChinese(3) > 50) {
          return Popup.loadMsg("发货仓库的联系人名字太长", loadMsgDelayTime);
        }
        if ($scope.transferOrder.giAddress && $scope.transferOrder.giAddress.len4FullWidthCharacterNChinese(3) > 200) {
          return Popup.loadMsg("发货仓库的发货地址太长", loadMsgDelayTime);
        }
        if ($scope.inputTextLen > 200) {
          return Popup.loadMsg("备注信息太长", loadMsgDelayTime);

        }
        if ($scope.transferOrder.tranferOrderItemDtoList.length === 0) {
          Popup.loadMsg("没有选择调拨物料", loadMsgDelayTime);
          return;
        }
        if (type === 'submit') {//提交
          //新增 //标识--add:新增保存、addSubmit:新增提交、edit：修改保存、editSubmit:修改提交
          $scope.transferOrder.flag = "addSubmit";//新增的提交
        } else if (type === 'save') {//保存
          //新增 //标识--add:新增保存、addSubmit:新增提交、edit：修改保存、editSubmit:修改提交
          $scope.transferOrder.flag = "add";//新增的保存草稿
        }
        var temId = Date.now().toString();
        $scope.transferOrder.transferOrderId = -(temId.substr(temId.length - 8, 8));//调拨单Id
        $scope.transferOrder.userType = profile.userType;//用户类型
        $scope.transferOrder.createBy = profile.id;//用户
        $scope.transferOrder.shiftWarehouseId = 0;//0代表非转办调拨单
        $scope.transferOrder.createOn = $scope.transferOrder.createDate = new Date().getTime();//创建日期
        Popup.waitLoad("正在提交调拨单...");
        SyncSparepart.syncTransferOrderInfo($scope.transferOrder)
          .then(function (resp) {
            Popup.hideLoading();
            if (isDebug) {
              console.log(JSON.stringify(resp, undefined, 2));
            }
            //跳转回列表页
            $ionicHistory.goBack();
          }, function (err) {
            Popup.hideLoading();
            Popup.promptMsg("创建调拨单失败: " + JSON.stringify(err, undefined, 2));
          });
      }
    })
  /**
   * 选择仓库
   */
  .controller('SelectInventoryCtrl',
    function ($stateParams, $ionicHistory, $state, $scope, Popup) {
      var isRequest = $stateParams.data.isRequest;//收货仓库
      function comparator(obj1, obj2, propertyName) {
        return obj1[propertyName].localeCompare(obj2[propertyName]);
      }

      var controlInventories = $stateParams.data.inventories
        .filter(function (inventory) {
          return inventory.repertoryLevel == 202;
        }).sort(function (obj1, obj2) {
          return comparator(obj1, obj2, 'repertoryName');
        });//总部库
      var areaInventories = $stateParams.data.inventories
        .filter(function (inventory) {
          return inventory.repertoryLevel == 203;
        }).sort(function (obj1, obj2) {
          return comparator(obj1, obj2, 'repertoryName');
        });//区域库;
      var onSiteInventories = $stateParams.data.inventories
        .filter(function (inventory) {
          return inventory.repertoryLevel == 204;
        }).sort(function (obj1, obj2) {
          return comparator(obj1, obj2, 'repertoryName');
        });//区域库;
      $scope.inventories =controlInventories.concat(areaInventories,onSiteInventories);//排序方式总部、区域、现场，然后再按照名字升序排序
      $scope.inventories.forEach(function (inventory) {
        inventory.contactInfo = inventory.repertoryLinkman + " | " + inventory.repertoryContactNum + " | " + inventory.email;
      });
      $scope.transferOrder = $stateParams.data.transferOrder;
      $scope.isCanEdit = function () {//需求改变，不能编辑联系人、地址信息
        return false && $stateParams.data.isCanEdit;
      };
      $scope.gotoEditContent = function (title, editObj, editField) {
        console.log(arguments);
        title = title || '编辑联系人方式';
        $state.go('tab.editBlockText', {
          data: {
            title: title,
            editObj: editObj,
            editField: editField
          }
        });
      };
      $scope.selectInventory = function (inventory) {
        console.log(inventory.contactInfo);
        var temArr = inventory.contactInfo.split("|");
        if (temArr.length !== 3) {//如果用户输入的格式不对
          return Popup.promptMsg("请您重新编辑联系人方式，使用竖线‘|’分隔各个信息部分")
        }
        inventory.repertoryLinkman = temArr[0];
        inventory.repertoryContactNum = temArr[1];
        inventory.email = temArr[2];
        inventory.repertoryLinkman = inventory.repertoryLinkman ? inventory.repertoryLinkman.toString().trim() : inventory.repertoryLinkman;
        inventory.repertoryContactNum = inventory.repertoryContactNum ? inventory.repertoryContactNum.toString().trim() : inventory.repertoryContactNum;
        inventory.email = inventory.email ? inventory.email.toString().trim() : inventory.email;
        if (inventory.repertoryLinkman && inventory.repertoryLinkman.len4FullWidthCharacterNChinese(3) > 50) {
          return Popup.promptMsg("联系人信息太长");
        }
        if (inventory.repertoryContactNum && inventory.repertoryContactNum.toString().len4FullWidthCharacterNChinese(3) > 50) {
          return Popup.promptMsg("联系电话信息太长");
        }
        if (isRequest) {//收货仓库
          $scope.transferOrder.grWhId = inventory.repertoryId;
          $scope.transferOrder.grWhName = inventory.repertoryName;
          $scope.transferOrder.grWhContactName = inventory.repertoryLinkman;
          $scope.transferOrder.grWhContactNum = inventory.repertoryContactNum;
          $scope.transferOrder.grAddress = inventory.repertoryAddress;
        } else {//发货仓库
          $scope.transferOrder.giWhId = inventory.repertoryId;
          $scope.transferOrder.giWhName = inventory.repertoryName;
          $scope.transferOrder.giWhContactName = inventory.repertoryLinkman;
          $scope.transferOrder.giWhContactNum = inventory.repertoryContactNum;
          $scope.transferOrder.giAddress = inventory.repertoryAddress;
        }
        $ionicHistory.goBack();
      }
    })
  /**
   * 修改调拨单
   */
  .controller('SparePartEditDetailCtrl', function ($ionicModal, OrderService, SyncSparepart, modifiedJson, $stateParams, eamFile, $state, $scope, $rootScope, $ionicHistory, Storage, eamSync, Popup, SparepartApi) {
    $scope.detail = angular.copy($stateParams.data) || modifiedJson.getMockTranferOrder();//调试界面使用||后面的对象
    if (isDebug) {
      console.log($scope.detail, $stateParams.data);
    }
    $scope.$on('$ionicView.beforeEnter', function () {
      $scope.transferMaterialsInfo = $scope.detail.tranferOrderItemDtoList ? $scope.detail.tranferOrderItemDtoList
        .slice(0, 4)
        .map(function (m) {
          return m.materialNo
        }).join(",") : "";
    });
    $scope.detail.giWhId = $scope.detail.giWhId ? $scope.detail.giWhId : $scope.detail.giWhIdNum;//后台数据库返回来的数据由原来的giWhId变成了giWhIdNum
    $scope.detail.grWhId = $scope.detail.grWhId ? $scope.detail.grhId : $scope.detail.grWhIdNum;//后台数据库返回来的数据由原来的giWhId变成了giWhIdNum
    OrderService.getDicListByType("transfer_order_type", function (res) {//调拨类型
      $scope.transferOrderTypes = res;
      //判断用户类型
      if (profile.userType != 3) {
        for (var i in $scope.transferOrderTypes) {
          if ($scope.transferOrderTypes[i].detailId == 165) {
            ArrayUitls.remove($scope.transferOrderTypes, $scope.transferOrderTypes[i]);
            break;
          }
        }
      }
      for (var i = 0; i < $scope.transferOrderTypes.length; i++) {
        var type = $scope.transferOrderTypes[i];
        if ($scope.detail.transferTypeId == type.detailId || $scope.detail.transferType == type.detailId) {
          $scope.params.transferOrderType = type;
          break;
        }
      }
    });
    OrderService.getDicListByType("transfer_reason", function (res) {//调拨原因
      $scope.transferReasons = res;
      if (profile.userType != 1) {
        for (var i in $scope.transferReasons) {
          if ($scope.transferReasons[i].detailId == 166) {
            ArrayUitls.remove($scope.transferReasons, $scope.transferReasons[i]);
            break;
          }
        }
      }
      $scope.params.transferReason = $scope.transferReasons.find(function (reason) {
        return reason.detailId == $scope.detail.transferReasonId
      });
    });
    $scope.$watch('params.transferReason', function (newReason, oldReason) {//调拨原因
      if (!angular.equals(newReason, oldReason)) {
        //后台取transferReason当做transferReasonId使用,后台transferReason需要一个Integer类型
        $scope.detail.transferReason = $scope.detail.transferReasonId = newReason ? newReason.detailId : null;
      }
    });
    $scope.$watch('params.transferOrderType', function (newVal, oldVal) {//调拨单类型，字典表37：常规备库164；紧急备库165
      //后台将transferType当做transferTypeId使用
      // $scope.transferOrder.transferType = newVal ? newVal.detailName : null;
      if (!angular.equals(newVal, oldVal)) {
        $scope.detail.transferType = $scope.detail.transferTypeId = newVal ? newVal.detailId : null;
        if (newVal && newVal.detailId == 164) {//常规,工单信息清空
          $scope.detail.workorderCode = null;
          $scope.detail.workOrderId = null;
        } else if (newVal && newVal.detailId == 165) {//紧急，调拨原因信息清空
          $scope.detail.transferReasonId = null;
          $scope.detail.transferReason = null;
        }
      }
    });
    $scope.params = {
      expectReceiveDateTime: new Date($scope.detail.expectReceiveDateTime)
    };
    $scope.gotoHandleRecord = function () {
      $state.go('tab.sparePartHandleRecord', {
        data: $scope.detail
      })
    };
    $scope.requestInventories = [];//收货仓库
    $scope.responseInventories = [];//发货仓库
    var allInventories = Storage.getRepertory();//全部未停用的仓库
    var profile = Storage.getProfile();
    var curProjects = [Storage.getSelectedProject()];//当前用户的项目
    if (profile.userType == 1) {//总部用户
      $scope.requestInventories = allInventories.filter(function (inventory) {//判断仓库级别：项目+204 区域+203 202
        return inventory.repertoryLevel == 202;//总部仓库
      });
      $scope.responseInventories = allInventories;//发货仓库
    }
    if (profile.userType == 2) {//区域用户
      $scope.requestInventories = allInventories.filter(function (inventory) {
        return inventory.repertoryLevel == 203//区域仓库
          && inventory.selProjects && inventory.selProjects.split(',').some(function (selProId) {//当前用户所属库位
            return curProjects.map(function (pro) {
              return pro.projectId;
            }).some(function (curProId) {
              console.log("curProId=", curProId, "selProId=", selProId);
              return curProId == selProId
            })
          })

      });
      $scope.responseInventories = allInventories;//发货仓库
    }
    if (profile.userType == 3) {//现场用户
      $scope.requestInventories = allInventories.filter(function (inventory) {
        return inventory.repertoryLevel == 204//现场仓库
          && inventory.selProjects && inventory.selProjects.split(',').some(function (selProId) {//当前用户所属库位
            return curProjects.map(function (pro) {
              return pro.projectId
            }).some(function (curProId) {
              // console.log("curProId=", curProId, "selProId=", selProId);
              return curProId == selProId
            })
          })
      });
      $scope.responseInventories = allInventories.filter(function (inventory) {//发货仓库
        return inventory.repertoryLevel == 203//区域仓库
          || inventory.repertoryLevel == 204//现场仓库
        // && inventory.belongArea == Storage.getSelectedProject().areaCode//该现场的所属区域
      });
    }
    $scope.selectInventory = function (type) {//仓库选择详细界面
      console.log($scope.requestInventories);
      var data = type === 'request' ?
        {
          inventories: $scope.requestInventories,
          isRequest: true
        } :
        {
          inventories: $scope.responseInventories,
          isRequest: false
        };
      $state.go('tab.selectInventory', {
        data: $.extend(data, {
          transferOrder: $scope.detail,
          isCanEdit: true
        })
      });
    };
    $scope.gotoTransferMaterials = function () {//调拨物料
      $state.go("tab.sparepartdetailEditMateriel", {
        data: $scope.detail
      });
    };
    $scope.selectWorkOrder = function () {
      if (!$scope.detail.grWhId) {
        Popup.loadMsg("请先选择收货仓库");
        return;
      }
      if (isDebug) {
        console.log("收货仓库", $scope.detail.grWhName);
      }
      $state.go("tab.sparepartEditDetailWorkorder", {
        data: {
          detail: $scope.detail,
          repertoryId: $scope.detail.grWhId
        }
      });
    };
    Popup.waitLoad("附件初始化，请稍后...");
    eamFile.retrieveInfoOrInsertFileRecord($scope.detail)
      .then(function () {
        Popup.hideLoading();
      }, function (err) {
        Popup.hideLoading();
        Popup.promptMsg(JSON.stringify(err, undefined, 2), '附件初始化失败')
      });
    $scope.removeAttachment = function (fileItem, index) {
      eamFile.removeAttachedFile(fileItem).then(function () {
        $scope.detail.tOFilemappingDtoList.splice(index, 1);
      }, function (err) {
        Popup.promptMsg('删除附件失败')
      });
    };
    $scope.openEamAttachedFile = function (attachedFile) {
      eamFile.openEamAttachedFile(attachedFile)
        .then(function (fileItem) {
          attachedFile = fileItem;
        }, function (err) {
          Popup.promptMsg(JSON.stringify(err, undefined, 2), "附件打开失败")
        });
    };
    $scope.submitTransferOrder = function (type) {
      console.log($scope.detail);
      var loadMsgDelayTime = 1200;
      if (!$scope.detail.grWhId) {//收货仓库
        return Popup.loadMsg("请选择收货仓库");
      }
      if (!$scope.params.expectReceiveDateTime) {
        return Popup.loadMsg("请输入期望到货时间");
      }
      $scope.detail.expectReceiveDate = $scope.detail.expectReceiveDateTime = $scope.params.expectReceiveDateTime.format('yyyy-MM-dd');
      if (!$scope.detail.transferTypeId) {
        return Popup.loadMsg("请选择调拨类型");
      }
      if ($scope.detail.transferTypeId == 164 && !$scope.detail.transferReasonId) {//常规
        return Popup.loadMsg("请选择调拨原因");
      }
      if ($scope.detail.transferTypeId == 165 && !$scope.detail.workOrderId) {//紧急
        return Popup.loadMsg("请选择关联工单");
      }
      if (!$scope.detail.giWhId) {//发货仓库
        return Popup.loadMsg("请选择发货仓库");
      }
      if ($scope.detail.grWhContactNum && $scope.detail.grWhContactNum.toString().len4FullWidthCharacterNChinese(3) > 50) {
        return Popup.loadMsg("收货仓库的电话号码太长", loadMsgDelayTime);
      }
      if ($scope.detail.grWhContactName && $scope.detail.grWhContactName.len4FullWidthCharacterNChinese(3) > 50) {
        return Popup.loadMsg("收货仓库的联系人名字太长", loadMsgDelayTime);
      }
      if ($scope.detail.grAddress && $scope.detail.grAddress.len4FullWidthCharacterNChinese(3) > 200) {
        return Popup.loadMsg("收货仓库的发货地址太长", loadMsgDelayTime);
      }
      if ($scope.detail.giWhContactNum && $scope.detail.giWhContactNum.toString().len4FullWidthCharacterNChinese(3) > 50) {
        return Popup.loadMsg("发货仓库的电话号码太长", loadMsgDelayTime);
      }
      if ($scope.detail.giWhContactName && $scope.detail.giWhContactName.len4FullWidthCharacterNChinese(3) > 50) {
        return Popup.loadMsg("发货仓库的联系人名字太长", loadMsgDelayTime);
      }
      if ($scope.detail.giAddress && $scope.detail.giAddress.len4FullWidthCharacterNChinese(3) > 200) {
        return Popup.loadMsg("发货仓库的发货地址太长", loadMsgDelayTime);
      }
      if ($scope.inputTextLen > 200) {
        return Popup.loadMsg("备注信息太长", loadMsgDelayTime);

      }
      if ($scope.detail.tranferOrderItemDtoList.length === 0) {
        Popup.loadMsg("没有选择调拨物料", loadMsgDelayTime);
        return;
      }
      //新增 //标识--add:新增保存、addSubmit:新增提交、edit：修改保存、editSubmit:修改提交
      if (type === 'submit') {//提交
        $scope.detail.flag = "editSubmit";
      } else if (type === 'save') {//保存
        $scope.detail.flag = "edit";
      }
      $scope.detail.lastUpdBy = profile.id;//用户
      $scope.detail.lastUpdOn = new Date().getTime();
      Popup.waitLoad("正在提交调拨单...");
      SyncSparepart.syncTransferOrderInfo($scope.detail)
        .then(function (resp) {
          Popup.hideLoading();
          if (isDebug) {
            console.log(JSON.stringify(resp, undefined, 2));
          }
          //跳转回列表页
          $ionicHistory.goBack();
        }, function (err) {
          Popup.hideLoading();
          Popup.promptMsg("提交调拨单失败: " + JSON.stringify(err, undefined, 2));
        });
    };
    $scope.addeditAttachment = function () {
      var item = {
        workorderId: $scope.detail.transferOrderId,
        fileActualName: $scope.detail.transferOrderId && $scope.detail.transferOrderId + "_DB_edit_",
        fileOriginalName: $scope.detail.transferOrderId && $scope.detail.transferOrderId + "_DB_edit_",
        source: AttachedFileSources.transferorder_info_source
      };
      eamFile.getPicture(item).then(function (fileItem) {
        $scope.detail.tOFilemappingDtoList.push(fileItem);
      }, function (err) {
        Popup.promptMsg(JSON.stringify(err), '获取附件失败');
      })
    };

    $scope.showFkjl = function (data) {
      //查看反馈记录信息
      $state.go("tab.sparepartdetailFKJL", {
        data: $scope.detail,
        fkjl: data
      });
    };
    $scope.showReceive = function () {
      //查看发货记录信息
      $state.go("tab.sparepartReceive", {
        transferOrderNo: $scope.detail.transferOrderNo
      });
    };

    /**
     * 撤销调拨单
     */
    $scope.delete = function () {
      Popup.confirm("您确认要取消这条调拨单？", function () {
        Popup.waitLoad();
        SparepartApi.cancelTransferOrder(function () {
          //跳转回首页
          $ionicHistory.goBack(-1);
          Popup.hideLoading();
        }, {
          transferOrderId: $scope.detail.transferOrderId
        });
      });
    };
    $scope.done = function () {//调拨单完成
      Popup.waitLoad();
      SparepartApi.confirmTransferFinish(function () {
        Popup.hideLoading();
        //跳转回首页
        Popup.delayRun(function () {
          $ionicHistory.goBack();
          //$rootScope.flashSparepart();
        }, "调拨单完成");
      }, {
        transferOrderId: $scope.detail.transferOrderId
      });
    };

    //修改调拨单时 是否可以编辑图片（添加删除图片）
    $scope.isCanEditImg = function () {
      //手机端 ，只有区域用户可以编辑
      if (profile.userType == 3) {
        //未提交 未处理 的才能编辑  。区域处理中，总部处理中的不能编辑
        if ($scope.detail.statusId == 171 || $scope.detail.statusId == 172 || $scope.detail.statusId == 175)
          return true;
      }
      return false;
    };

    //调拨单是否可编辑
    $scope.isCanEdit = function () {
      //手机端 ，只有区域用户可以编辑
      if (profile.userType == 3) {
        //未提交 未处理 的才能编辑  。区域处理中，总部处理中的不能编辑
        if ($scope.detail.statusId == 171 || $scope.detail.statusId == 172 || $scope.detail.statusId == 175){
          return true;
        }
      }
      Popup.loadMsg("用户不是现场用户，不能编辑");
      return false;
    };

  })
  /**
   * 查看调拨单
   */
  .controller('SparePartDetailCtrl', function ($rootScope, $ionicModal, $stateParams, $state, $scope,
                                               $ionicActionSheet, $ionicHistory, $cordovaCamera, eamFile, OrderService,
                                               Storage, Popup, modifiedJson) {
    $scope.transferOrder = $stateParams.data || modifiedJson.getMockTranferOrder();//调试界面使用||后面的对象;
    console.log($scope.transferOrder);
    $scope.transferOrder.giWhId = $scope.transferOrder.giWhId ? $scope.transferOrder.giWhId : $scope.transferOrder.giWhIdNum;
    $scope.transferOrder.grWhId = $scope.transferOrder.grWhId ? $scope.transferOrder.grWhId : $scope.transferOrder.grWhIdNum;
    OrderService.getDicListByType("transfer_status", function (res) {//调拨状态
      $scope.transferStatuses = res;
    });
    var profile = Storage.getProfile();
    var allInventories = Storage.getRepertory();//全部未停用的仓库
    var curProjects = [Storage.getSelectedProject()];//当前用户的项目
    $scope.requestInventories = [];//收货仓库
    $scope.responseInventories = [];//发货仓库
    $scope.requestInventories.push(allInventories.find(function (inventory) {//调入仓库
      return inventory.repertoryId == $scope.transferOrder.grWhId
    }));
    $scope.responseInventories.push(allInventories.find(function (inventory) {//调出仓库
      return inventory.repertoryId == $scope.transferOrder.giWhId
    }));
    $scope.selectInventory = function (type) {//仓库选择详细界面
      console.log($scope.requestInventories);
      var data = type === 'request' ?
        {
          inventories: $scope.requestInventories,
          isRequest: true
        } :
        {
          inventories: $scope.responseInventories,
          isRequest: false
        };
      $state.go('tab.selectInventory', {
        data: $.extend(data, {
          transferOrder: $scope.transferOrder,
          isCanEdit: false
        })
      });
    };
    $scope.params = {
      expectReceiveDateTime: new Date($scope.transferOrder.expectReceiveDateTime).getTime()
    };
    // $scope.transferOrder.grWhName = $scope.requestInventories[0] ? $scope.requestInventories[0].repertoryName : null;//收货仓库名
    // $scope.transferOrder.grWhId = $scope.requestInventories[0] ? $scope.requestInventories[0].repertoryId : null;//收货仓库id
    // $scope.transferOrder.giWhId = $scope.responseInventories[0] ? $scope.responseInventories[0].repertoryName : null;//发货仓库名
    // $scope.transferOrder.giWhName = $scope.responseInventories[0] ? $scope.responseInventories[0].repertoryId : null;//发货仓库id
    $scope.gotoTransferMaterialsDetail = function () {//调拨物料
      $state.go("tab.sparePartTransferMaterialsDetail", {
        data: $scope.transferOrder
      });
    };
    $scope.gotoHandleRecord = function () {
      $state.go('tab.sparePartHandleRecord', {
        data: $scope.transferOrder
      })
    };
    $scope.openFile = function (file) {
      eamFile.openEamAttachedFile(file).then()
    };
    $scope.selectWorkOrder = function () {
      if (!$scope.transferOrder.grWhId) {
        Popup.loadMsg("请先选择收货仓库");
        return;
      }
      if (isDebug) {
        console.log("收货仓库", $scope.transferOrder.grWhName);
      }
      $state.go("tab.sparepartEditDetailWorkorder", {
        data: {
          detail: $scope.transferOrder,
          repertoryId: $scope.transferOrder.grWhId
        }
      });
    };
    OrderService.getDicListByType("transfer_order_type", function (res) {//调拨类型
      $scope.transferOrder.transferType = res.find(function (reason) {
        return reason.detailId == $scope.transferOrder.transferTypeId
      })['detailName'];

    });
    OrderService.getDicListByType("transfer_reason", function (res) {//调拨原因
      if (!$scope.transferOrder.transferReasonId) {
        return;//如果是紧急调拨，不存在调拨原因
      }
      $scope.transferOrder.transferReason = res.find(function (reason) {
        return reason.detailId == $scope.transferOrder.transferReasonId
      })['detailName'];

    });
  })
  /**
   * 调拨单转办添加，修改详情
   */
  .controller('sparepartShiftAddeditDetailCtrl', function ($rootScope, $ionicModal, $stateParams, $state, $scope,
                                                           $ionicActionSheet, $ionicHistory, $cordovaCamera, eamFile, OrderService,
                                                           Storage, Popup, SparepartApi, eamSync) {
    /*************初始化查询筛选项参数***************/
    $scope.is_create = false;//是否是新建
    $scope.is_transferReason = false;//是否显示调拨原因
    $scope.is_workorderCode = false;//是否显示工单
    $scope.repertorysi = [];//发货仓库
    $scope.repertorysr = [];//收货仓库
    $scope.change = {};//收货发货库存选择换成
    $scope.title = "转办调拨单";
    var json = JSON.stringify($stateParams.data);
    $scope.detail = JSON.parse(json);
    $scope.detail.expectReceiveDateTime = new Date($scope.detail.expectReceiveDateTime);

    $scope.$watch($scope.detail, function () {
      $rootScope.isEditData = true;
    });

    var initSelect = function () {
      $scope.search = {};
      OrderService.getDicListByType("transfer_order_type", function (res) {
        $scope.transferOrderTypes = res;
        //判断用户类型
        var profile = Storage.getProfile();
        if (profile.userType != 3) {
          for (var i in $scope.transferOrderTypes) {
            if ($scope.transferOrderTypes[i].detailId == 165) {
              ArrayUitls.remove($scope.transferOrderTypes, $scope.transferOrderTypes[i]);
              break;
            }
          }
        }
      });
      OrderService.getDicListByType("transfer_reason", function (res) {
        $scope.transferReasons = res;
      });
      OrderService.getDicListByType("transfer_status", function (res) {
        $scope.transferStatuses = res;
      });
    };
    initSelect();

    /**
     * 选择调拨单状态事件
     */
    $scope.transferTypeIdChange = function () {
      $scope.is_transferReason = false;
      $scope.is_workorderCode = false;
      if ($scope.detail.transferTypeId == 164) {
        $scope.is_transferReason = true;
      }
      if ($scope.detail.transferTypeId == 165) {
        $scope.is_workorderCode = true;
      }
    };
    $scope.transferTypeIdChange();

    //获取收货发货仓库信息
    // 收货
    //判断用户状态，项目用户、区域用户、总部用户userType
    //判断仓库级别：项目+204 区域+203 202

    //发货
    //判断用户状态，项目用户、区域用户、总部用户userType
    //判断仓库级别：区域+203 所有仓库 所有仓库
    var initRepertory = function () {
      var profile = Storage.getProfile();
      var projects = Storage.getProjects();
      var repertorys = Storage.getRepertory();
      var repertorysii = {};
      var repertorysrr = {};
      //初始化仓库信息。
      if (profile.userType == 3) {//现场用户
        for (var i in projects) {
          //var project = projects[i];
          for (var j in repertorys) {//收货仓库
            var repertory = repertorys[j];
            if (repertory.belongArea == profile.areaCode//所属现场
              && repertory.repertoryLevel == 204) {//库位级别,字典表48：总库202，区域203，现场204
              repertorysrr["p" + repertory.repertoryId] = repertory;//如果仓库关联的项目包含用户的项目，这个仓库就是用户可以选择的仓库之一
              break;
            }
          }
        }
        for (var j in repertorys) {//发货仓库
          var repertory = repertorys[j];
          if (repertory.belongArea == profile.areaCode//所属区域
            && repertory.repertoryLevel == 203) {//库位级别,字典表48：总库202，区域203，现场204
            repertorysii["p" + repertory.repertoryId] = repertory;
          }
        }
      } else if (profile.userType == 2) {//区域用户
        for (var j in repertorys) {//收货仓库
          var repertory = repertorys[j];
          if (repertory.belongArea == profile.areaCode
            && repertory.repertoryLevel == 203) {//区域203
            repertorysrr["p" + repertory.repertoryId] = repertory;
            break;
          }
        }
        for (var j in repertorys) {//发货仓库
          var repertory = repertorys[j];
          repertorysii["p" + repertory.repertoryId] = repertory;
        }
      } else if (profile.userType == 1) {//总部用户
        for (var j in repertorys) {
          var repertory = repertorys[j];
          if (repertory.repertoryLevel == 202) {//未停用的总部仓库
            repertorysrr["p" + repertory.repertoryId] = repertory;
            break;
          }
        }
        for (var j in repertorys) {
          var repertory = repertorys[j];
          repertorysii["p" + repertory.repertoryId] = repertory;
        }
      }
      for (var i in repertorysrr) {//收货仓库
        $scope.repertorysr.push(repertorysrr[i]);
        if ($scope.detail.grWhIdNum == repertorysrr[i].repertoryId) {
          $scope.change.repertoryr = repertorysrr[i];
          $scope.detail.grWhId = $scope.detail.grWhIdNum;
        }
      }
      for (var i in repertorysii) {//发货仓库
        $scope.repertorysi.push(repertorysii[i]);
        if ($scope.detail.giWhIdNum == repertorysii[i].repertoryId) {
          $scope.change.repertoryi = repertorysii[i];
          $scope.detail.giWhId = $scope.detail.giWhIdNum;
        }
      }

      $scope.repertoryChange = function (i) {
        if (i == "r") {
          var repertory = $scope.change.repertoryr;
          $scope.detail.grWhId = repertory.repertoryId;
          $scope.detail.grWhIdNum = repertory.repertoryId;
          $scope.detail.grRepertoryNo = repertory.repertoryNo;
          $scope.detail.grWhName = repertory.repertoryName;
          $scope.detail.grWhContactName = repertory.repertoryLinkman;
          $scope.detail.grWhContactNum = repertory.repertoryContactNum;
          $scope.detail.grAddress = repertory.repertoryAddress;
        } else {
          var repertory = $scope.change.repertoryi;
          $scope.detail.giWhId = repertory.repertoryId;
          $scope.detail.giWhIdNum = repertory.repertoryId;
          $scope.detail.giRepertoryNo = repertory.repertoryNo;
          $scope.detail.giWhName = repertory.repertoryName;
          $scope.detail.giWhContactName = repertory.repertoryLinkman;
          $scope.detail.giWhContactNum = repertory.repertoryContactNum;
          $scope.detail.giAddress = repertory.repertoryAddress;
        }
      };
    };
    initRepertory();

    //取消操作，返回上一页。
    $scope.goback = function () {
      if ($rootScope.isEditData) {
        Popup.confirm("您当前操作的数据未保存，您确定要退出？", function () {
          $rootScope.isEditData = false;
          $ionicHistory.goBack(-1);
        });
      } else {
        $ionicHistory.goBack(-1);
      }
    };
    //调用保存接口，保存数据
    $scope.save = function () {
      if (!StringUtils.isNotEmpty($scope.detail.giWhId)) {
        Popup.promptMsg("没有选择发货仓库");
        return;
      }
      for (var i in $scope.detail.tranferOrderItemDtoList) {
        var item = $scope.detail.tranferOrderItemDtoList[i];
        if (!StringUtils.isNotEmpty(item.demandAmount) || item.demandAmount <= 0) {
          Popup.promptMsg("物料需求数量未填写");
          return;
        }
      }

      Popup.waitLoad();
      //调用远程接口，同步数据
      $scope.detail.transferType = $scope.detail.transferTypeId;
      $scope.detail.transferReason = $scope.detail.transferReasonId;
      SparepartApi.saveShiftTransferOrder(function (resp) {
        //保存成功后，同步数据，并返回列表页面。
        Popup.hideLoading();
        if (resp.success) {
          //$rootScope.isEditData = false;
          //跳转回首页
          $ionicHistory.goBack(-3);
          if ($.isFunction($rootScope.flashSparepartDeliveryList)) {
            $rootScope.flashSparepartDeliveryList();
          }
          if ($.isFunction($rootScope.flashSparepart)) {
            $rootScope.flashSparepart();
          }
        }
      }, $scope.detail);
    };
  })
  /**
   * 调拨物料详细
   */
  .controller('SparePartTransferMaterialsDetailCtrl', function ($scope, $state, $stateParams, modifiedJson, Popup, ServiceMaterial) {
    $scope.materielDetails = $stateParams.data && $stateParams.data.tranferOrderItemDtoList || modifiedJson.getMockTranferOrder().tranferOrderItemDtoList;
    $scope.materialDetail = function (materialDetail) {
      Popup.waitLoad();
      ServiceMaterial.findMaterial(materialDetail.materialId, function (material) {
        Popup.hideLoading();
        if (material) {
          $state.go("tab.materialDetail", {
            data: {
              title: '物料详情',
              materialDetail: angular.fromJson(material.json)
            }
          });
        }
      });
    };
  })
  /**
   * 处理过程详细
   */
  .controller('SparePartHandleRecordCtrl', function ($scope, $stateParams, $state, $rootScope, modifiedJson, Popup, eamSync, ServiceSparepart, ServiceSparepartDelivery) {
    $scope.transferOrder = $stateParams.data || modifiedJson.getMockTranferOrder();
    $scope.handleRecords = $scope.transferOrder.handleRecordList;
    console.log("$scope.handleRecords", $scope.handleRecords, $rootScope.auth['auth_310102']);
    $scope.orderDetailInfo = function (record) {
      if (record.orderType == 1) {//转办调拨单
        ServiceSparepart.get(record.orderId, function (res) {
          console.log(res);
          $state.go('tab.sparepartDetail', {
            data: angular.fromJson(res.json)
          })
        });
      } else if (record.orderType == 2) {//发货单
        ServiceSparepartDelivery.findDeliveryOrder(record.orderId, function (shippingOrder, errorMassage) {
          if (!shippingOrder) {
            return Popup.promptMsg(errorMassage || "发货单数据加载失败");
          }
          $state.go("tab.shippingOrderDetail", {
            data: {
              shippingOrder: shippingOrder,
              transferOrder: $scope.transferOrder
            }
          });
        })
      }
    };
    $scope.feedBack = function () {//处理反馈
      $state.go('tab.handleFeedback', {
        data: {
          transferOrder: $scope.transferOrder
        }
      });
    }
  })
  .controller('HandleFeedbackCtrl', function ($scope, $stateParams, $ionicHistory, Popup, Storage, SparepartApi) {
    $scope.transferOrder = $stateParams.data.transferOrder;
    $scope.title = '处理反馈';
    $scope.feedbackObj = {
      "transferOrderId": $scope.transferOrder.transferOrderId,
      "content": null,
      "shiftTransferOrderId": $scope.transferOrder.shiftTransferOrderId,
      "giWhName": $scope.transferOrder.giWhName,
      "createBy": Storage.getProfile().id,
      "createByName": Storage.getProfile().realname,
      "userType": Storage.getProfile().userType
    };
    var userType = {
      "3": "现场",
      "2": "区域",
      "1": "总部"
    };
    var handleRecord = {
      userType: userType[Storage.getProfile().userType + ""],
      userName: Storage.getProfile().realname,
      orderNo: $scope.transferOrder.transferOrderNo,
      orderType: $scope.transferOrder.transferOrderNo.toLowerCase().indexOf("fh") >= 0 ? 2 : 1,//发货单是2,转办调拨单是1,
      content: "",
      handleDate: null
    };
    $scope.submitFeedback = function () {
      if (!StringUtils.isNotEmpty($scope.feedbackObj.content)) {
        return Popup.promptMsg("请输入反馈内容");
      }
      SparepartApi.saveTransferOrderFeedBack(function (res) {
        console.log(res);
        if (res.success) {
          handleRecord.handleDate = new Date().getTime();
          handleRecord.content = "信息反馈：" + $scope.feedbackObj.content;//这里仅在手机上临时展示
          $scope.transferOrder.handleRecordList.unshift(handleRecord);
          $ionicHistory.goBack();
        } else {
          Popup.promptMsg("提交处理反馈失败" + res.retInfo);
        }
      }, $scope.feedbackObj);
    }
  })
  /**
   * 选择工单信息
   */
  .controller('sparepartAddeditDetailWorkorder', function ($ionicModal, $stateParams, $state, $scope, $ionicHistory, eamSync, OrderService, ServiceSparepart, Storage) {
    $scope.detail = $stateParams.data && $stateParams.data.detail;
    $scope.repertoryId = $stateParams.data && $stateParams.data.repertoryId || 241;//仓库关联的项目
    $scope.workorders = [];
    $scope.hasMoreData = false;
    //初始化查询筛选项参数
    var initSelect = function () {
      $scope.search = {
        repertoryId: $scope.repertoryId,
        projectId: Storage.getSelectedProject().projectId,
        workorderTypeId: null,
        page: 1
      };
    };
    OrderService.getDicListByType("workorder_type", function (res) {
      $scope.workorderTypes = res.filter(function (item) {
        return item.detailId != 39;//没有安装调试
      });
    });
    initSelect();
    //初始化过滤器
    $ionicModal.fromTemplateUrl("views/sparepart/addedit_detail_workorder_filter.html", {
      scope: $scope,
      animation: "slide-in-up"
    }).then(function (modal) {
      $scope.filterModal = modal;
      $scope.filterModal.show();
    }, function (err) {
    });

    /**
     * 打开查询过滤器
     */
    $scope.openFilter = function () {
      $scope.filterModal.show();
    };
    $scope.closeFilter = function () {
      $scope.filterModal.hide();
      //$ionicHistory.goBack();
    };
    $scope.doRefresh = function () {
      initSelect();
      $scope.searchFilter();
    };
    //搜索数据
    $scope.searchFilter = function () {
      //查询搜索选项
      $scope.search.repertoryId = $scope.repertoryId;
      $scope.search.page = 1;
      $scope.filterModal.hide();
      //$scope.hasMoreData = true;
      $scope.workorders = [];
      $scope.loadMoreData();
    };

    //上拉加载更多
    $scope.loadMoreData = function () {
      console.log($scope.search.page);
      ServiceSparepart.onlineList($scope.search, function (rows) {
        console.log(rows);
        $scope.$broadcast(SCROLL_REFRESH_COMPLETE);
        if (rows.length > 0) {
          $scope.hasMoreData = true;
          $scope.search.page++;
          $scope.workorders = $scope.workorders.concat(rows);
          $scope.$broadcast(SCROLL_INFINITE_COMPLETE);
        } else {
          $scope.$broadcast(SCROLL_INFINITE_COMPLETE);
          $scope.hasMoreData = false;
        }
      });
    };

    $scope.selectItem = function (data) {
      $scope.detail.workOrderId = data.workorderId;
      $scope.detail.workorderCode = data.workorderCode;
      $scope.detail.workorderTitle = data.workorderTitle;
      $ionicHistory.goBack();
    };
  })
  /**
   * 编辑物料信息   TODO 这里已经有的物料进入详情路由会出错
   */
  .controller('sparepartdetailEditMateriel', function ($stateParams, Params, ServiceMaterial, $ionicHistory, Popup, $scope, $state) {
    $scope.materiels = $stateParams.data.tranferOrderItemDtoList.slice(0);
    $scope.isCanEdit = $stateParams.data.isCanEdit ? $stateParams.data.isCanEdit : true;//是否能编辑物料,默认是true
    /**
     * 添加一行新的数据
     */
    $scope.create = function () {
      //跳转到物料查找页面
      $state.go("tab.sparepartdetailEditMaterielSearch", {
        data: $scope.materiels
      });
    };
    $scope.saveMaterielInfo = function () {
      for (var i = 0; i < $scope.materiels.length; i++) {
        var material = $scope.materiels[i];
        if (!material.totalDemandAmount) {
          return Popup.promptMsg(material.materialNo + "未填写数量或有误");
        }
      }
      $stateParams.data.tranferOrderItemDtoList = $scope.materiels;
      $ionicHistory.goBack();
    };
    $scope.deleteMaterielInfo = function (materiel, index) {
      $scope.materiels.splice(index, 1);
    };
    $scope.materialDetailForEdit = function (materialDetail) {
      // Popup.waitLoad();
      ServiceMaterial.findMaterial(materialDetail.materialId, function (material) {
        // Popup.hideLoading();
        if (material) {
          $state.go("tab.sparepartMaterielDetailInfo", {
            data: {
              title: '物料详情',
              materialDetail: angular.fromJson(material.json)
            }
          });
        }
      });
    };
  })
  /**
   * 查看发货单
   */
  .controller('ShippingOrderDetailCtrl', function ($scope, $state, $stateParams, eamFile, ServiceSparepart, Storage, modifiedJson) {
    $scope.shippingOrder = $stateParams.data && $stateParams.data.shippingOrder || modifiedJson.getMockShippingOrder();
    $scope.transferOrder = $stateParams.data && $stateParams.data.transferOrder || modifiedJson.getMockTranferOrder();
    console.log($scope.shippingOrder);
    var allInventories = Storage.getRepertory();//全部未停用的仓库
    $scope.requestInventories = [];//收货仓库
    $scope.responseInventories = [];//发货仓库
    $scope.requestInventories.push(allInventories.find(function (inventory) {//调入仓库
      return inventory.repertoryId == $scope.shippingOrder.grWhId
    }));
    $scope.responseInventories.push(allInventories.find(function (inventory) {//调出仓库
      return inventory.repertoryId == $scope.shippingOrder.giWhId
    }));
    $scope.selectInventory = function (type) {//仓库选择详细界面
      console.log($scope.requestInventories);
      var data = type === 'request' ?
        {
          inventories: $scope.requestInventories,
          isRequest: true
        } :
        {
          inventories: $scope.responseInventories,
          isRequest: false
        };
      $state.go('tab.selectInventory', {
        data: $.extend(data, {
          transferOrder: $scope.transferOrder,
          isCanEdit: false
        })
      });
    };
    $scope.shippingOrderMaterialsInfo = $scope.shippingOrder.sOrderItemDtoList ?
      $scope.shippingOrder.sOrderItemDtoList
        .slice(0, 4)
        .map(function (m) {
          return m.materialSno
        }).join(",") : "";
    $scope.gotoShippingOrderMaterialsDetail = function () {
      $state.go('tab.shippingOrderMaterialsDetail', {
        data: {
          transferOrder: $scope.transferOrder,
          shippingOrder: $scope.shippingOrder
        }
      })
    };
    $scope.openFile = function (file) {
      eamFile.openEamAttachedFile(file).then();
    };
    $scope.gotoTransferOrderDetail = function () {
      ServiceSparepart.get($scope.shippingOrder.transferOrderId, function (res) {
        console.log(res);
        $state.go('tab.sparepartDetail', {
          data: angular.fromJson(res.json)
        })
      });
    }
  })
  .controller('ShippingOrderMaterialsDetailCtrl', function ($scope, Popup, $state, $stateParams, ServiceMaterial, modifiedJson) {
    $scope.shippingOrderMaterielDetails = $stateParams.data && $stateParams.data.shippingOrder.sOrderItemDtoList || modifiedJson.getMockShippingOrderMaterielDetails();
    $scope.transferOrder = $stateParams.data && $stateParams.data.transferOrder || modifiedJson.getMockTranferOrder();
    $scope.transferOrderMaterials = $scope.transferOrder.tranferOrderItemDtoList;
    $scope.shippingOrderMaterielDetails.forEach(function (sMaterial) {
      $scope.transferOrderMaterials.forEach(function (transMaterial) {
        if (transMaterial.materialId == sMaterial.materialId) {//加一个总需求的字段
          sMaterial.totalDemandAmount = transMaterial.totalDemandAmount
        }
      })
    });
    $scope.materialDetail = function (materialDetail) {
      Popup.waitLoad();
      ServiceMaterial.findMaterial(materialDetail.materialId, function (material) {
        Popup.hideLoading();
        if (material) {
          $state.go("tab.materialDetail", {
            data: {
              title: '物料详情',
              materialDetail: angular.fromJson(material.json)
            }
          });
        }
      });
    };
  })
  /**
   * 调拨物料清单
   */
  .controller('sparepartdetailEditMaterielSearch', function ($stateParams, $state, $ionicModal, $scope, $rootScope, ServiceMaterial, $ionicHistory) {
    $scope.materielsdata = $stateParams.data;
    $scope.excludedMaterielIds = $scope.materielsdata.map(function (m) {//已经有的物料，无需再次添加
      return m.materialId;
    });
    /**
     * 物料调拨详情里，已经存在的物料信息，进入展示详情界面
     */
    $scope.materialDetailSearch = function (materialDetail) {
      $state.go("tab.sparepartMaterielDetailInfo", {
        data: {
          title: '物料详情',
          materialDetail: angular.fromJson(materialDetail.json)
        }
      });
    };
    $scope.webMaterielList = [];
    $ionicModal.fromTemplateUrl("views/workorder/materialQuery.html", {
      scope: $scope,
      animation: "slide-in-up"
    })
      .then(function (modal) {
        $scope.filterModal = modal;
        $scope.filterModal.show();
      });
    $scope.hasMoreData = false;
    $scope.page = 1;
    $scope.closeQuery = function () {
      $scope.filterModal.hide();
    };
    $scope.clear = function () {
      $scope.params = {
        excludedMaterielIds: $scope.excludedMaterielIds,
        materielNo: null,
        materielName: null
      };
      $scope.webMaterielList = [];
    };
    $scope.clear();
    $scope.saveMaterials = function () {
      $scope.webMaterielList.forEach(function (data) {
        if (data.amount) {
          $scope.addItem(data);
        }
      });
      $ionicHistory.goBack();
    };
    $scope.searchFilter = function () {
      $scope.webMaterielList = [];
      $scope.page = 1;
      $scope.hasMoreData = true;
      $scope.loadMoreData();
      $scope.closeQuery();
    };
    $scope.query = function () {
      $scope.searchFilter();
    };
    $scope.doRefresh = function () {
      $scope.clear();
      $scope.searchFilter();
    };
    $scope.openQuery = function () {
      $scope.filterModal.show();
    };
    $scope.loadMoreData = function () {
      ServiceMaterial.list($scope.page, $scope.params, function (rows) {
        $scope.$broadcast('scroll.infiniteScrollComplete');
        $scope.$broadcast(SCROLL_REFRESH_COMPLETE);
        if (rows.length > 0) {
          $scope.page++;
          $scope.webMaterielList = $scope.webMaterielList.concat(rows);
          $scope.hasMoreData = true;
        } else {
          $scope.hasMoreData = false;
        }
      });
    };
    $scope.addItem = function (data) {
      var item = {
        "transferOrderItemId": null,
        "itemId": null,
        "tanferOrderId": null,
        "materialId": data.materialId,
        "materialNo": data.materialSno,
        "materialComment": data.materialName,
        "unit": data.unit,
        "unitName": data.unitText,
        "demandAmount": null,
        "versionNo": "",
        "totalReceiveAmount": 0,
        "totalDemandAmount": data.amount,
        "totalNotShippedAmount": null,
        "totalIssueAmount": 0,
        "shippingOrderItemId": null,
        "shippingOrderId": null,
        "issueAmount": null
      };
      $scope.materielsdata.push(item);
    };
  })
  /**
   * 反馈记录,2017年4月28日14:42:20 变更后的需求仅有反馈记录方能输入提交，转办和驳回仅展示记录
   */
  .controller('sparepartDetailFKJLCtrl', function ($stateParams, $scope, $state, $rootScope, Storage, SparepartApi, Popup) {
    $scope.detail = $stateParams.data.json;
    $scope.fkjl = {};
    $scope.isfkjl = false;
    $scope.iszbjl = false;
    $scope.isbhjl = false;
    $scope.isedit = true;
    $scope.height80 = "height80";


    //驳回看发货方仓库权限
    //转办看发货方仓库权限
    var is_edit = false;//是否允许驳回或者转办
    var repertorys = Storage.getRepertory();
    for (var j in repertorys) {
      var repertory = repertorys[j].repertoryId;
      if ($scope.detail.giWhIdNum == repertory) {
        //有权限
        is_edit = true;
        break;
      }
    }

    //判断订单状态是否是已完成
    if ($scope.detail.statusId == 174 || $scope.detail.statusId == 176) {
      $scope.isedit = false;
      $scope.height80 = "";
    }

    if ($stateParams.fkjl == 'fkjl') {
      $scope.name = "反馈记录";
      $scope.isfkjl = true;
      $scope.fkjls = $scope.detail.feedBackRecordList;
    } else if ($stateParams.fkjl == 'zbjl') {
      $scope.name = "转办记录";
      $scope.iszbjl = true;
      $scope.fkjls = $scope.detail.shiftRecordList;
      //判断是否允许转办(首先是当前数据可以被编辑)
      if (is_edit && $scope.isedit) {
        if ($scope.detail.shiftWarehouseId != 0) {
          $scope.isedit = false;
          $scope.height80 = "";
        } else {
          $scope.height80 = "height";
        }
      }
    } else if ($stateParams.fkjl == 'bhjl') {
      $scope.name = "驳回记录";
      $scope.isbhjl = true;
      $scope.fkjls = $scope.detail.rejectRecordList;
      if (!is_edit) {
        $scope.isedit = false;
        $scope.height80 = "";
      }
    }

    $scope.send = function () {
      Popup.waitLoad();
      if ($scope.fkjl.content == "") {
        Popup.hideLoading();
        Popup.promptMsg("内容不能为空");
        return;
      }

      if ($scope.isfkjl) {//反馈记录
        $scope.fkjl.transferOrderId = $scope.detail.transferOrderId;
        SparepartApi.saveTransferOrderFeedBack(function () {
          //跳转回首页
          var profile = Storage.getProfile();
          if ($.isFunction($rootScope.flashSparepartDeliveryList)) {
            $rootScope.flashSparepartDeliveryList();
          } else if ($.isFunction($rootScope.flashSparepart)) {
            $rootScope.flashSparepart();
          }

          $scope.detail.feedBackRecordList.push({
            userType: profile.typechname,
            createByName: profile.realname,
            createOn: new Date(),
            content: $scope.fkjl.content
          });
          $scope.fkjl.content = "";
        }, $scope.fkjl);
      } else if ($scope.isbhjl) {//驳回记录
        $scope.fkjl.transferOrderId = $scope.detail.transferOrderId;
        SparepartApi.rejectTransferOrder(function () {
          //跳转回首页
          var profile = Storage.getProfile();
          if ($.isFunction($rootScope.flashSparepartDeliveryList)) {
            $rootScope.flashSparepartDeliveryList();
          } else if ($.isFunction($rootScope.flashSparepart)) {
            $rootScope.flashSparepart();
          }
          $scope.detail.rejectRecordList.push({
            userType: profile.typechname,
            createByName: profile.realname,
            giWhName: $scope.detail.giWhName,
            createOn: new Date(),
            content: $scope.fkjl.content
          });
          $scope.fkjl.content = "";
        }, $scope.fkjl);
      } else if ($scope.iszbjl) {
        //跳转转办页面
        $state.go("tab.sparepartShiftAddEditDetail", {
          data: $scope.detail
        });
      }
    };
  });
