workorderModel
  .controller('PlanWorkDetailCtrl', function ($scope, Popup, $ionicHistory, DataCache, $stateParams, $state, Store, WorkOrderApi) { //计划工单详情
    $scope.taskId = $stateParams.taskId;
    $scope.work = {};
    $scope.title = $stateParams.title;
    $scope.buttonText = {};

    function getOrderDetail() {
      Popup.waitLoad();
      WorkOrderApi.getOrderDetail(function (resp) {
        if (resp.success) {
          Store.setWorkOrderInfo(resp.data);
          $scope.work = resp.data;
          $scope.params.ncr = $scope.work.ncr;
          $scope.params.remark = $scope.work.remark;
        }
      }, {
        "orderId": $scope.taskId
      });
    }

    $scope.isShowPlanWorkDetail = false; //是否显示工单详情
    $scope.showPlanWorkDetail = function () {
      var divTopItems = $('.click-hide-item-action').children();
      var divItems = $('#id-plan-detail').children();
      $scope.isShowPlanWorkDetail = !$scope.isShowPlanWorkDetail;
      if ($scope.isShowPlanWorkDetail) {
        $('.div-buttons-items-action').hide();
        $.each(divTopItems, function (i, ele) {
          $(ele).slideUp(100);
        });
        $.each(divItems, function (i, ele) {
          $(ele).hide();
        });
        $.each(divItems, function (i, ele) {
          $(ele).fadeIn(100 + i * 100);
        });

      } else {
        $('.div-buttons-items-action').fadeIn(300);
        $.each(divTopItems, function (i, ele) {
          $(ele).fadeIn(100 + 100 * i);
        });
        $.each(divItems, function (i, ele) {
          $(ele).fadeOut(100 + i * 100, function () {
            $scope.isbuttonsShow = !$scope.isbuttonsShow;
          });
        });
      }
    };
    $scope.NRCShow = {
      checked: true
    };
    $scope.params = {
      "orderId": $scope.taskId,
      "ncr": $scope.work.ncr,
      "remark": null
    };

    $scope.submitOrder = function (order) {
      var params = {"orderId": order.orderId};
      if ($scope.work.status == '2' || $scope.work.status == '1'/*$scope.buttonText.text == BUTTON_ORDER_STATUS_SUBMIT_TEXT*/) {
        Popup.confirm("您确定要提交工单吗？", function () {
          WorkOrderApi.submitOrder(function (submitResp) {
            console.log(submitResp);
            //order.status = '3';//待审核
            WorkOrderApi.getOrderDetail(function (resp) {
              if (resp.success) {
                //console.log(resp.data);
                Store.setWorkOrderInfo(resp.data);
                $scope.work = resp.data;
                console.log("submitOrder,status: " + $scope.work.status);
                Popup.loadMsg("提交完毕");
                $ionicHistory.clearCache();
              }
            }, {
              "orderId": order.orderId
            });
            //$scope.buttonText.text = BUTTON_ORDER_STATUS_FINISH_TEXT;
          }, params);

        }, function () {
          //if no ,do something here
        });
      }
      if ($scope.work.status == '3'/*$scope.buttonText.text == BUTTON_ORDER_STATUS_FINISH_TEXT*/) {
        Popup.confirm("是否通过审核？", function () {
          WorkOrderApi.finishOrder(function (finisedResp) {
            console.log(finisedResp);
            //$scope.work.status = '4';
            if (finisedResp.success) {
              WorkOrderApi.getOrderDetail(function (resp) {
                if (resp.success) {
                  //console.log(resp.data);
                  $scope.work = resp.data;
                  console.log("submitOrder,status: " + $scope.work.status);
                }
              }, {
                "orderId": order.orderId
              });
              Popup.loadMsg("已通过审核！", null, null);
            }
          }, params);
        }, function () {
          //no pass TODO
        }, "是", "否");
      }
    };
    $scope.planWorkSave = function () {
      WorkOrderApi.savePlanWorkOrder(function (resp) {
        if (resp.success) {
          $scope.work.status = '2';
          Popup.delayRun(function () {
            //console.log("success");
            //$ionicHistory.goBack();
          }, "保存成功");
        }
      }, $scope.params);
    };
  })
  .controller('PlanWorkDetailShowCtrl', ['$scope', '$stateParams', function ($scope, $stateParams) { //工单详情
    $scope.work = {};
    $scope.work = window.JSON.parse($stateParams.work || {});
    //console.log($scope.work);
  }])
  .controller('CheckListCtrl', function (WorkOrderApi, $rootScope, $scope, Popup,eamFile, $stateParams, $state, Storage) { //点检表
    $scope.workOrderDetail = $stateParams.data;
    $scope.webParams = [];
    console.log($scope.workOrderDetail);
    $scope.checkList = $scope.workOrderDetail.workorderChecks;
    for (var i = 0; i < $scope.checkList.length; i++) {
      var checkItem = $scope.checkList[i];
      checkItem.eaWoManualDTO.iseSelectName = checkItem.eaWoManualDTO.isSelect == 156 ? "已选用" : "未选用";
      $scope.webParams.push(checkItem.eaWoManualDTO.isSelect == 156);
    }
    //是否能 点击启用点检表
    $scope.isCanEdit = function () {
      //能否编辑 点检项详情
      $scope.isCanEditFlag = true;
      //该工单的负责人 是否是当前登录人
      if (Storage.getProfile()['id'] == $scope.workOrderDetail.apiWorkorderBaseInfoDto.assignPerson) {
        //三工单 有修改权限 且是处理中的状态
        $scope.isCanEditFlag = ($rootScope.auth['auth_410105'] || $rootScope.auth['auth_430105'] || $rootScope.auth['auth_460105']) && $scope.workOrderDetail.apiWorkorderBaseInfoDto.workorderStatus == maintainTask.taskStatus.processing;

        return $scope.isCanEditFlag;
      }
      $scope.isCanEditFlag = false;
      return $scope.isCanEditFlag;
    };
    $scope.switchChange = function (checkItem, $event) {//"已选用"   157:未选用
      $event.stopPropagation(); //在函数体内加上这句代码就好
      checkItem.eaWoManualDTO.isSelect = checkItem.eaWoManualDTO.isSelect == 156 ? 157 : 156;
      checkItem.eaWoManualDTO.iseSelectName = checkItem.eaWoManualDTO.isSelect == 156 ? "已选用" : "未选用";

      //启用 是返回
      // if(checkItem.eaWoManualDTO.isSelect == 156){
      //     $scope.isCheckOpenFlag = true;
      // }else {
      //     $scope.isCheckOpenFlag = false;
      // }
      // $scope.isCanEdit();
      // console.log("checkItem.eaWoManualDTO.isSelect "+ checkItem.eaWoManualDTO.isSelect);
      // console.log("410105 "+ $rootScope.auth['auth_410105']);
      // console.log("430105 "+ $rootScope.auth['auth_410105']);
      // console.log("460105 "+ $rootScope.auth['auth_410105']);
      // console.log("maintainTask.taskStatus.processing "+ maintainTask.taskStatus.processing);
      // console.log("$scope.workOrderDetail.apiWorkorderBaseInfoDto.workorderStatus "+ $scope.workOrderDetail.apiWorkorderBaseInfoDto.workorderStatus);
      // console.log("$scope.isCanEditFlag "+ $scope.isCanEditFlag);

    };
    $scope.openFile=function (checkItem) {
      checkItem.checkFileDto.fileType=checkItem.eaWoManualDTO.fileType;
      checkItem.checkFileDto.fileId=checkItem.eaWoManualDTO.fileId;
      eamFile.openEamAttachedFile(checkItem.checkFileDto);
    };
    $scope.goCheckDetail = function (checkItem, checkListSelectedItemIndex, isSelect) {
      $state.go("tab.checkDetail", {
        data: {
          checkItem: checkItem,
          workOrderDetail: $scope.workOrderDetail,
          isCanEdit: $scope.isCanEditFlag,//是否可编辑
          isSelect: isSelect //选用1  未选用0
        }
      });
    };
  })
  .controller('checkDetailCtrl', function (WorkOrderApi, $ionicHistory, $scope, Popup, $stateParams, $state, Storage, modifiedJson, CheckDetail) { //点检表详情
    var checkItem = $stateParams.data.checkItem;
    $scope.workOrderDetail = $stateParams.data.workOrderDetail;
    console.log("params ", $stateParams.data);
    //点检表里的一个点检项 再进入点检项详情 要用以下两个 标志位综合判断
    $scope.isSelect = $stateParams.data.isSelect;//该点表 是否被启用 1 启用 0 未启用
    // $scope.isCanEditOfFlagCheckDetail = $stateParams.isCanEdit;

    $scope.isCanEdit = $stateParams.data.isCanEdit;


    // $scope.isCanEdit = function () {//该点击表是否可以编辑
    //     //当前登录人 是 当前工单的处理人
    //     if (Storage.getProfile()['id'] == $scope.workOrderDetail.apiWorkorderBaseInfoDto.assignPerson){
    //         //三工单 有 的权限 且是处理中状态
    //         return $scope.isSelect &&  ($scope.workOrderDetail.apiWorkorderBaseInfoDto.workorderStatus == maintainTask.taskStatus.processing) && (auth['auth_410105'] || auth['auth_430105'] || auth['auth_460105']);
    //         // return (auth['auth_410105'] || auth['auth_430105'] || auth['auth_460105']) && ($scope.workOrderDetail.apiWorkorderBaseInfoDto.workorderStatus == maintainTask.taskStatus.processing) && $scope.isCanEditLastPage;
    //     }
    //     return false;
    //   // return  $scope.isSelect && $scope.isCanEditOfFlagCheckDetail;
    // };
    $scope.checkListId = checkItem.eaWoManualDTO.woManualId;
    $scope.checkDetailCheckCataloglList = checkItem.eaWoCheckListCatDtoList;
    $scope.goCheckDetailItem = function (checkCatalog) {
      $state.go("tab.checkDetailItem", {
        data: {
          checkCatalog: checkCatalog,
          workOrderDetail: $scope.workOrderDetail,
          isCanEdit: $scope.isCanEdit,
          isSelect: $scope.isSelect
        }
      });
    };
    $scope.back = function () {
      $ionicHistory.goBack();
    };
  })
  .controller('checkDetailItemCtrl', function (WorkOrderApi, eamSync, OrderService,
                                               Storage, $scope, $rootScope, Popup, $stateParams,
                                               $state, CheckDetail, SchdleMaintainApi,
                                               $ionicActionSheet, $cordovaCamera, $ionicHistory,
                                               eamMTInstallWorkOrderFactory, eamFile,
                                               MaintainTaskRW) { //点检表详情项
    $scope.checkCatalog = $stateParams.data.checkCatalog;
    $scope.workOrderDetail = $stateParams.data.workOrderDetail;
    $scope.checkDetailItemList = $scope.checkCatalog.eaWoCheckListDtoList;
    //上个页面传递的 是否 可以编辑点检表
    $scope.isCanEditCkeckTable = $stateParams.data.isCanEdit;
    //是否启用了点检表
    // $scope.isSelect = $stateParams.isSelect;

    console.log("checkCatalog", $scope.checkCatalog);
    console.log("checkDetail", $stateParams.data);
    $scope.title = $scope.checkCatalog.checklistCat;
    $scope.isCanEdit = $stateParams.data.isCanEdit && $stateParams.data.isSelect;
    // $scope.isCanEdit = function () {
    //     //当前登录人 是 当前工单的处理人
    //     if (Storage.getProfile()['id'] == $scope.workOrderDetail.apiWorkorderBaseInfoDto.assignPerson){
    //         //三工单 有 的权限 且是处理中状态
    //         return $scope.isSelect &&  ($scope.workOrderDetail.apiWorkorderBaseInfoDto.workorderStatus == maintainTask.taskStatus.processing) && (auth['auth_410105'] || auth['auth_430105'] || auth['auth_460105']);
    //         // return (auth['auth_410105'] || auth['auth_430105'] || auth['auth_460105']) && ($scope.workOrderDetail.apiWorkorderBaseInfoDto.workorderStatus == maintainTask.taskStatus.processing) && $scope.isCanEditLastPage;
    //     }
    //     return false;
    // };
    $scope.webParamsForType28 = [];
    $scope.webParamsForType26 = [];
    for (var i = 0; i < $scope.checkDetailItemList.length; i++) {
      var checkDetailItem = $scope.checkDetailItemList[i];
      checkDetailItem.lastUpdBy = Storage.getProfile().id;
      if (checkDetailItem.checklistType == 28) {
        $scope.webParamsForType28.push(checkDetailItem.checklistValue.split(";"));
      }
      if (checkDetailItem.checklistType == 26) {//toggle类型
        if (checkDetailItem.checklistUserInput == 1) {//
          $scope.webParamsForType26.push(true);
          $scope.checkDetailItemList[i].checklistUserInput = true;
        } else {
          $scope.webParamsForType26.push(false);
          $scope.checkDetailItemList[i].checklistUserInput = false;
        }
      }
    }
    $scope.isCanEditImg = function () {
      return $stateParams.data.isCanEdit;
    };
    $scope.saveCheckListCatalogItems = function () {
      if (!($rootScope.auth['auth_410105'] || $rootScope.auth['auth_430105'] || $rootScope.auth['auth_460105']) || $scope.workOrderDetail['apiWorkorderBaseInfoDto'].workorderStatus != 141) {
        Popup.loadMsg("不能保存，权限不足或者该工单状态导致不能保存", 1500);
        return;
      }
      //验证所有 输入结果，如果每个 item 都 正确才返回 true;才可以保存，如果有一个item 中信息不正确 则 不能保存，并弹出提示
      var isReturn = false;
      for (var j = 0; j < $scope.checkDetailItemList.length; j++) {
        var checkDetailItem = $scope.checkDetailItemList[j];
        if (isDebug) {
          console.log(JSON.stringify(checkDetailItem, undefined, 2))
        }


        //判断备注信息的长度，如果填写了备注不超过 100个字符，中文字符按 3个算
        if (checkDetailItem.remark) {
          if (checkDetailItem.remark.len4FullWidthCharacterNChinese(3) > 100) {
            Popup.promptMsg("第" + (j + 1) + "项点检项【" + checkDetailItem.item + "】的备注信息太长，请输入小于100个字符的备注，中文按3个字符计算");
            isReturn = true;
          } else {
            $scope.checkDetailItemList[j].remark = checkDetailItem.remark;
            isReturn = false;
          }
        }

        //判断用户输入结果  符合条件 保存信心，不符合结果提示
        if (checkDetailItem.checklistType == 28) {
          if (!StringUtils.isNotEmpty(checkDetailItem.checklistUserInput)) {
            Popup.promptMsg("请给第" + (j + 1) + "项点检项【" + checkDetailItem.item + "】选择类型");
            isReturn = true;
          } else {
            $scope.checkDetailItemList[j].checklistUserInput = checkDetailItem.checklistUserInput;
            isReturn = false;
          }

        } else if (checkDetailItem.checklistType == 27) {
          if (StringUtils.isNotEmpty(checkDetailItem.checklistUserInput) && checkDetailItem.remark.len4FullWidthCharacterNChinese(3) > 100) {
            Popup.promptMsg("第" + (j + 1) + "项点检项【" + checkDetailItem.item + "】的结果信息太长，请输入小于100个字符的备注，中文按3个字符计算");
            isReturn = true;
          } else {
            $scope.checkDetailItemList[j].checklistUserInput = checkDetailItem.checklistUserInput;
            isReturn = false;
          }
        } else if (checkDetailItem.checklistType == 26) {
          if (checkDetailItem.checklistUserInput == true) {
            $scope.checkDetailItemList[j].checklistUserInput = 1;
          } else {
            $scope.checkDetailItemList[j].checklistUserInput = 0;
          }
        }

        // if ((checkDetailItem.checklistType == 28)&&!StringUtils.isNotEmpty(checkDetailItem.checklistUserInput)) {
        //   Popup.promptMsg("请给第"+(j+1)+"项点检项【"+checkDetailItem.item+"】选择类型");
        //   // Popup.loadMsg("", 900);
        //   isReturn = true;
        // }else if((checkDetailItem.checklistType == 28) ){
        //
        // }


        //判断结果信息的长度，如果填写了结果不超过 100个字符，中文字符按 3个算
        // if((checkDetailItem.checklistType == 27) && checkDetailItem.checklistUserInput.len4FullWidthCharacterNChinese(3) > 100){
        //     if(checkDetailItem.checklistUserInput.len4FullWidthCharacterNChinese(3) > 100 ){
        //         Popup.promptMsg("第"+(j+1)+"项点检项【"+checkDetailItem.item+"】的结果信息太长，请输入小于100个字符的备注，中文按3个字符计算");
        //         isReturn = true;
        //     }
        // }

        // 27 类型的用户输入， 展示和用户点选时 用bool值，保存时， 用0和1  1代表用户选择OK  0 代表用户选择 N OK
        // if((checkDetailItem.checklistType == 26) && checkDetailItem.checklistUserInput == true){
        //     $scope.checkDetailItemList[j].checklistUserInput = 1;
        // }else if ((checkDetailItem.checklistType == 26) && checkDetailItem.checklistUserInput == false){
        //     $scope.checkDetailItemList[j].checklistUserInput = 0;
        // }

        if (checkDetailItem.isUploadPic == 1) {//必须全部添加附件
          if (checkDetailItem.eaWoFilemappingDtoList.length == 0) {
            isReturn = true;
            Popup.promptMsg("请给第" + (j + 1) + "项点检项【" + checkDetailItem.item + "】添加附件");
            break;
          }
        }
      }
      if (isReturn) {
        return;
      }
      eamMTInstallWorkOrderFactory.saveWorkOrder($scope.workOrderDetail, function () {
        Popup.delayRun(function () {
          $ionicHistory.goBack();
        }, "保存成功", 1000)
      })
    };
    $scope.downloadCheckItemImg = function (checkDetailItem, image, index) {
      eamFile.openEamAttachedFile(image)
    };
    $scope.uploadFile = "";
    $scope.deleteAttachedImage = function (checkDetailItem, index) {
      var eaWoFilemappingDtoList = checkDetailItem.eaWoFilemappingDtoList;
      var removeItem = eaWoFilemappingDtoList[index];
      eamFile.removeAttachedFile(removeItem)
        .then(function () {
          eaWoFilemappingDtoList.splice(index, 1);
        }, function (err) {
          Popup.promptMsg(JSON.stringify(err), "删除点检表检查项附件失败")
        });
    };
    $scope.addAttachment = function (checkDetailItem, fileList) {
      if (isDebug) console.log(JSON.stringify(checkDetailItem, undefined, 2));
      var task = $scope.workOrderDetail["apiWorkorderBaseInfoDto"];
      if (task.workorderStatus != maintainTask.taskStatus.processing) {//不是处理中就不进行操作
        Popup.loadMsg(task.workorderStatusName + " 不能添加图片", 800);
        return;
      }
      eamFile.getPicture({
        source: AttachedFileSources.workorder_checklist_source,
        workorderId: checkDetailItem.checklistId,
        fileActualName: "点检表附件"
      }).then(function (fileItem) {
        if (isDebug) {
          console.log("点检表添加的附件对象：" + JSON.stringify(fileItem, undefined, 2));
        }
        fileList.push(fileItem);
      }, function (err) {
        Popup.promptMsg(JSON.stringify(err), "获取点检表检查项附件失败")
      })
    };

  })
  .controller('CheckListImageCtrl', function ($scope, $cordovaImagePicker, $state, $cordovaFileTransfer, $ionicLoading, $timeout) {
    $scope.images = [];

    $scope.selectImage = function () {
      var options = {
        maximumImagesCount: 3,
        width: 800,
        height: 800,
        quality: 80
      };
      $cordovaImagePicker.getPictures(options).then(function (imageData) {
        for (var i = 0; i < imageData.length; i++) {
          $scope.images.push({
            "imageUrl": imageData[i]
          });
        }
      }, function (error) {
        console.log(error);
      });
    };

    $scope.save = function () {
      var fileIds = [];

      /**
       * 上传文件
       * @param {Object} count
       * @param {Object} serviceUrl
       * @param {Object} options
       */
      function uploadImage(count, serviceUrl, options) {
        var fileUrl = $scope.images[count].imageUrl;
        var ft = new FileTransfer();
        ft.onprogress = function (progress) {
          //进度，这里使用文字显示下载百分比
          $timeout(function () {
            var downloadProgress = (progress.loaded / progress.total) * 100;
            $ionicLoading.show({
              template: "已经上传了：" + Math.floor(downloadProgress) + "%"
            });
            if (downloadProgress > 99) {
              $ionicLoading.hide();
            }
          });
        };
        ft.upload(fileUrl, serviceUrl, function (result) {
          var req = result.response;
          if (req.retCode == API_SUCCESS) {
            fileIds.push(result.data.fileId);
            alert("upload" + window.JSON.stringify(result));
            count++;
            if ($scope.images.length > count) {
              uploadImage(count, serviceUrl, options);
            } else {
              submitImages();
            }
          } else {
            alert("上传图片过程中发生异常。");
          }
        }, function (result) {
          //终止
          alert("上传图片过程中发生错误。");
        }, options);
      }

      function submitImages() {
        alert("提交 ：" + window.JSON.stringify(fileIds));
      }

      var options = {
        fileKey: "image",
        headers: {
          "tokenId": "111"
        }
      };
      var serviceUrl = encodeURI(baseUrl + "/api/order/uploadImage.api");
      //var fileUrl = $scope.images[0].imageUrl;
      try {
        uploadImage(0, serviceUrl, options);
      } catch (e) {
        alert("error" + window.JSON.stringify(e));
      }
    };

    $scope.detail = function (img) {
      var info = {};
      info.curImgIndex = $scope.images.indexOf(img);
      //info.type = {};
      info.images = $scope.images;
      $state.go("tab.showImage", {
        imageInfo: JSON.stringify(info)
      })
    }
  })
  .controller('CheckMaterialCtrl', function (WorkOrderApi, $ionicHistory, $scope, Popup, $stateParams, $state, Storage, OrderMaterial) { //所需物料
    $scope.taskId = $stateParams.taskId;
    $scope.orderMateriels = [];

    if (OrderMaterial.hasCacheData($scope.taskId)) {
      Popup.popupConfirm(function (result) {
        if (result) {
          //同步数据到服务器
          OrderMaterial.synchronizeMaterialList(function (result) {
            if (result) {
              //同步到服务器成功
              Popup.loadMsg("数据同步成功");
            } else {
              Popup.loadMsg("同步失败");
              //同步到服务器失败
            }
            getCheckMaterialList();
          }, $scope.taskId);
        } else {
          //清空缓存数据
          OrderMaterial.clearCacheData(function () {
            Popup.loadMsg("对应的缓存数据已清空");
            getCheckMaterialList();
          }, $scope.taskId);
        }
      });
    } else {
      getCheckMaterialList();
    }

    function getCheckMaterialList() {

      Popup.waitLoad();
      OrderMaterial.getCheckMaterialList(function (resp) {
        if (resp.success) {
          $scope.orderMateriels = resp.data;
          for (var i = 0; i < $scope.orderMateriels.length; i++) {
            var item = $scope.orderMateriels[i];
            console.log(item);
            $scope.$watch(item.realCount, function (newVal, oldVal) {
              console.log(newVal);
              console.log(oldVal);
              //if (parseInt(newVal.realCount) < 0) {
              //  newVal.realCount = 0;
              //}
            });
            item.realCount = parseInt(item.realCount);
          }
        }
      }, {
        "orderId": $scope.taskId
      });
    }

    $scope.save = function () {
      OrderMaterial.saveCheckMaterialList(function (resp) {
        if (resp.success) {
          Popup.delayRun(function () {
            //$ionicHistory.goBack();
            console.log(resp);
          }, "保存成功");
        }
      }, {
        "orderId": $scope.taskId,
        "materiels": $scope.orderMateriels
      });
    }
  })
  .controller('OrderArrivalDetailCtrl', function ($scope, $stateParams, WorkOrderApi, Popup, $state) { //计划工单-到货验收详情
    $scope.isShowOrderArrivalDetail = false;
    $scope.title = $stateParams.title;
    $scope.showOrderArrivalDetail = function () {
      var divTopItems = $('.click-hide-item-action').children();
      var divItems = $('#id-showing-detail').children();
      $scope.isShowOrderArrivalDetail = !$scope.isShowOrderArrivalDetail;
      if ($scope.isShowOrderArrivalDetail) {
        $('.div-buttons-items-action').hide();
        $.each(divTopItems, function (i, ele) {
          $(ele).slideUp(100);
        });
        $.each(divItems, function (i, ele) {
          $(ele).hide();
        });
        $.each(divItems, function (i, ele) {
          $(ele).fadeIn(100 + i * 100);
        });
      } else {
        $('.div-buttons-items-action').fadeIn(300);
        $.each(divTopItems, function (i, ele) {
          $(ele).fadeIn(100 + 100 * i);
        });
        $.each(divItems, function (i, ele) {
          $(ele).fadeOut(100 + i * 100);
        });
      }
    };
    //$scope.orderArrivalSave= function () {
    //
    //};
    $scope.taskId = $stateParams.taskId;
    $scope.work = {};
    Popup.waitLoad();
    WorkOrderApi.getOrderArrivalDetail(function (resp) {
      if (resp.success) {
        console.log(resp.data);
        $scope.work = resp.data;
      }
    }, {
      "orderId": $scope.taskId
    });
  })
  .controller('ReviceOrderInfosCtrl', function ($rootScope, $scope, $stateParams, WorkOrderApi, Popup, $state) { //计划工单-收货信息
    $scope.taskId = $stateParams.taskId;
    $scope.orderReviceInfos = {};
    $scope.images = [{
      url: "res/machine.jpg"
    }, {
      url: "res/machine.jpg"
    }, {
      url: "res/machine.jpg"
    }];
    Popup.waitLoad();
    WorkOrderApi.getOrderReviceInfos(function (resp) {
      if (resp.success) {
        console.log(resp.data);
        $scope.orderReviceInfos = resp.data;
      }
    }, {
      "orderId": $scope.taskId
    });
    $scope.edit = function (orderReviceInfo) {
      $state.go("tab.ReviceOrderInfosEdit", {
        orderId: $scope.taskId,
        orderReviceInfo: JSON.stringify(orderReviceInfo)
      });
    };
    $scope.save = function () {
      OrderMaterial.saveCheckMaterialList(function (resp) {
        if (resp.success) {
          console.log(resp.data);
        }
      }, {
        "orderId": $scope.taskId,
        "materiels": $scope.orderMateriels
      });
    }
  })
  .controller("PdfDetailViewCtrl", function ($scope, $stateParams, MaintainTaskRW, Popup, eamSync) {//pdf详情页面
    $scope.pdfDetailObj = JSON.parse($stateParams.params);
    console.log($scope.pdfDetailObj);
    $scope.node = $scope.pdfDetailObj.node;//章节某个节点
    $scope.title = $scope.node.text;//节点名称
    $scope.instructorId = $scope.node['manualId'];//指导书id
    $scope.contentDto = $scope.node['manual_content'];
    $scope.downloadWoManualImg = function (image) {
      var filePath = image.filePath;
      var fileId = image.fileId;
      for (var i in imgFormat) {
        if (imgFormat[i].indexOf(filePath) > 0) {
          Popup.loadMsg("无需下载图片");
          return;
        }
      }
      MaintainTaskRW.queryFileByFileId(fileId, function (res) {
        if (res["downloadStatus"] == 0) {
          Popup.confirm("下载图片?", function () {
            eamSync.downloadFile(fileId, function (res) {
              Popup.loadMsg("下载图片成功");
              image.filePath = res.filePath;
            });
          }, null, "确定", "取消");
        } else {
          image.filePath = res.filePath;
        }
      });
    };
  })
  .controller("PdfTreeViewCtrl", ["$scope","$ionicScrollDelegate", "$stateParams", '$state', "Popup", "SchdleMaintainApi", function ($scope,$ionicScrollDelegate, $stateParams, $state, Popup, SchdleMaintainApi) {
    if (!$stateParams.params) {
      return;
    }
    var instructorInfo = JSON.parse($stateParams.params);
    console.log(instructorInfo);
    $scope.instructorTitle = instructorInfo.instructorTitle;
    $scope.directories = angular.copy(instructorInfo["manualCataContnList"]);//所有章节及某个章节的内容
    var directories = $scope.directories;
    directories.sort(function (node1,node2) {
      return +node1.manualdetail_id-node2.manualdetail_id;
    });
    // directories.sort(function (node1, node2) {
    //   return node2.manual_catalog.localeCompare(node1.manual_catalog);
    // });
    var pNodes = {
      text: $scope.instructorTitle,
      children: [],
      type: 'root',
      pId: 0
    };
    var nodes = [];
    for (var i = 0; i < directories.length; i++) {
      var node = directories[i];
      node['children'] = [];//假定每个节点都有子节点
      node['text'] = node['manual_catalog'];//章节标题
      delete node['manual_catalog'];
      node.pId = node['manualdetail_parentid'];//父节点
      delete node['manualdetail_parentid'];
      node.id = node['manualdetail_id'];//章节id
      delete node['manualdetail_id'];
      if (node['pId'] == 0) {
        node['type'] = 'root';//用于显示不同的图标等功能
        pNodes.children.push(node);
      } else {
        node['type'] = 'child';
        nodes.push(node);
      }
    }
    function generateDirs(root, children) {//思路是用父节点去循环遍历找子节点
      if (root.children.length == 0) {//寻找该节点下面的所有子节点
        for (var i = 0; i < children.length; i++) {
          var n = children[i];
          if (n.pId == root.id) {
            root.children.push(n);
            children.splice(i--, 1);
          }
        }
        if (children.length > 0) {//如果还有子节点，这些子节点一定不属于当前root,即，其父节点只能是root子节点
          root.children.forEach(function (item) {//遍历每一个root的子节点，寻找其子节点
            generateDirs(item, children);
          });
        }
      } else {
        root.children.forEach(function (item) {
          generateDirs(item, children);
        });
      }
    }

    function iconStyle(children) {//改变不同节点的图片类型
      if ($.isArray(children) && children.length > 0) {
        children.forEach(function (item) {
          if (item.children.length == 0) {
            item.type = "default";
          } else {
            iconStyle(item.children);
          }
        });
      }
    }

    console.log("tree: ", pNodes);
    generateDirs(pNodes, nodes);
    iconStyle(pNodes.children);
    $('#manualDirectories')
      .on("select_node.jstree", function (e, data) {
       if(isDebug){
         console.log("changed.jstree: ", data);
       }
        $scope.browseDetail(data.node['original']);
      })
      .on("after_open.jstree", function (e, data) {
        $ionicScrollDelegate.resize();
      })
      .on("close_node.jstree", function (e, data) {
        $ionicScrollDelegate.resize();
      })
      .jstree({
        "types": {
          "child": {
            "icon": "icon ion-ios-folder"
          },
          "root": {
            "icon": "icon ion-ios-bookmarks"
          },
          "default": {
            "icon": "icon ion-document-text"
          }
        },
        "plugins": ["types"],
        'core': {
          'data': pNodes,
          "themes": {
            "variant": "large",
            'stripes': true,
            'icons': true,
            'check_callback': false
          },
          "multiple": false,
          "animation": 100
        }
      });
    $scope.browseDetail = function (item) {
      $state.go("tab.pdfDetailView", {
        params: JSON.stringify({
          instructorId: instructorInfo.instructorId,//指导书id
          node: item
        })
      });
    };
  }])
  .controller("PdfDetailCtrl", function ($scope, $stateParams, $location, $anchorScroll, $ionicScrollDelegate) {
    $scope.url = $stateParams.url;
    $scope.title = $stateParams.title;
    $scope.pageNums = [];
    $scope.pdfShow = {};
    $scope.pdfShow.pageIndex = 1;
    $scope.showPageNav = false;
    $scope.pdfWidth = window.innerWidth;

    $scope.showPage = function () {
      $scope.showPageNav = !$scope.showPageNav;
    };

    $scope.hidePage = function () {
      //$scope.showPageNav = false;
    };

    $scope.together = function () {

      alert("together" + window.JSON.stringify($ionicScrollDelegate.getScrollPosition()));
    };

    $scope.$watch('pdfShow.pageIndex', function (newValue, oldValue) {
      $scope.goto("page" + newValue);
    });

    $scope.goto = function (id) {
      $location.hash(id);
      $anchorScroll();
    };

    //$ionicLoading.show("正在加载PDF");
    PDFJS.getDocument($scope.url).then(function (pdf) {
      for (var j = 1; j <= pdf.numPages; j++) {
        $scope.pageNums.push(j);
      }
      //$scope.pageCnt = pdf.numPages;
      $scope.$apply();

      showPDF(pdf, pdf.numPages, 1);
    });

    /**
     * 递归加载PDF
     * @param {Object} pdf
     * @param {Object} numPages
     * @param {Object} page_index
     */
    function showPDF(pdf, numPages, page_index) {
      pdf.getPage(page_index).then(function getPageHelloWorld(page) {
        var scale = 2; //window.innerWidth/600;
        var viewport = page.getViewport(scale);
        var canvas = document.getElementById("the-canvas" + page.pageNumber);
        var context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        $scope.pdfWidth = canvas.width;
        $(".pdf-line").width = canvas.width;
        var renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        $scope.pageCnt = page.pageNumber;
        $scope.$apply();
        var r = page.render(renderContext).then(function (result) {
          console.log(page.pageNumber);
          if (page.pageNumber < numPages) {
            showPDF(pdf, numPages, ++page_index);
          }
        }, function (err) {
          Popup.loadMsg("加载PDF失败:" + window.JSON.stringify(err));
        });
      });
    }
  })
  .controller('OrderArrivalDetailCtrl', function ($scope, $stateParams, WorkOrderApi, Popup, $state) { //计划工单-到货验收详情
    $scope.isShowOrderArrivalDetail = false;
    $scope.showOrderArrivalDetail = function () {
      var divTopItems = $('.click-hide-item-action').children();
      var divItems = $('#id-showing-detail').children();
      $scope.isShowOrderArrivalDetail = !$scope.isShowOrderArrivalDetail;
      if ($scope.isShowOrderArrivalDetail) {
        $('.div-buttons-items-action').hide();
        $.each(divTopItems, function (i, ele) {
          $(ele).slideUp(100);
        });
        $.each(divItems, function (i, ele) {
          $(ele).hide();
        });
        $.each(divItems, function (i, ele) {
          $(ele).fadeIn(100 + i * 100);
        });
      } else {
        $('.div-buttons-items-action').fadeIn(300);
        $.each(divTopItems, function (i, ele) {
          $(ele).fadeIn(100 + 100 * i);
        });
        $.each(divItems, function (i, ele) {
          $(ele).fadeOut(100 + i * 100);
        });
      }
    };
    $scope.taskId = $stateParams.taskId;
    $scope.work = {};
    Popup.waitLoad();
    WorkOrderApi.getOrderArrivalDetail(function (resp) {
      if (resp.success) {
        console.log(resp.data);
        $scope.work = resp.data;
      }
    }, {
      "orderId": $scope.taskId
    });
  })
  .controller('ReviceOrderInfosCtrl', function ($rootScope, $ionicModal, $ionicSlideBoxDelegate, $scope, $stateParams, WorkOrderApi, Popup, $state) { //计划工单-收货信息
    var vm = this;
    $scope.taskId = $stateParams.taskId;
    $scope.orderReviceInfos = {};
    $scope.images = [{
      url: "res/machine.jpg"
    }, {
      url: "res/machine.jpg"
    }, {
      url: "res/machine.jpg"
    }];
    Popup.waitLoad();
    WorkOrderApi.getOrderReviceInfos(function (resp) {
      if (resp.success) {
        console.log(resp.data);
        $scope.orderReviceInfos = resp.data;
      }
    }, {
      "orderId": $scope.taskId
    });
    $scope.edit = function (orderReviceInfo) {
      $state.go("tab.ReviceOrderInfosEdit", {
        orderId: $scope.taskId,
        orderReviceInfo: JSON.stringify(orderReviceInfo)
      });
    };

    $scope.newOrderReviceInfo = function () {
      WorkOrderApi.getMachineBigParts(function (resp) {
        if (resp.success) {
          var bigMachinePartObj = resp.data;
          console.log(JSON.stringify(bigMachinePartObj));
          $state.go("tab.ReviceOrderInfosEdit", {
            orderId: $scope.taskId,
            bigMachinePartsData: JSON.stringify(bigMachinePartObj)
          });
        }
      }, null);

    };

    $scope.delete = function (orderReviceInfo) {
      Popup.confirm("您确定要删除该收货信息吗？", function () {
        WorkOrderApi.deleteOrderReviceInfo(function (resp) {
          if (resp.success) {
            console.log(resp.data);
            $scope.orderReviceInfos.splice($scope.orderReviceInfos.indexOf(orderReviceInfo), 1);
          }
        }, {
          "reviceInfoId": orderReviceInfo.reveivingInfoId
        });
      });
    };
  })

  .controller('ReviceOrderInfosEditCtrl', function (Utils, $filter, $timeout, $ionicHistory, $ionicLoading, $cordovaFileTransfer, $cordovaImagePicker, $state, $rootScope, $scope, $stateParams, WorkOrderApi, Popup) { //计划工单-新增/编辑收货信息
    $scope.taskId = $stateParams.orderId;
    $scope.orderReviceInfo = JSON.parse($stateParams.orderReviceInfo);
    $scope.receivingInfoItems = {};
    if (!!$scope.orderReviceInfo) {//编辑某一个收货信息
      $scope.receivingInfoItems = $scope.orderReviceInfo.receivingInfoItems;
      $scope.reviceDate = $scope.orderReviceInfo.reviceDate;
      $scope.reviceDate = new Date($filter('Infydate')($scope.reviceDate));
    } else {//新建某个收货信息
      var testData = JSON.parse($stateParams.bigMachinePartsData);
      console.log(testData.length);
      var items = [];
      for (var i = 0; i < testData.length; i++) {
        items.push({
          "orderId": $scope.taskId,
          "goodsName": testData[i].value,
          "goodsCount": 0
        });
      }
      $scope.receivingInfoItems = items;
      var date = new Date();
      var YYYY = "" + date.getFullYear();
      var MM = date.getMonth() < 10 ? "0" + date.getMonth() : date.getMonth();
      var DD = date.getDay() < 10 ? "0" + date.getDay() : date.getDay();
      console.log(YYYY + MM + DD);
      $scope.reviceDate = new Date($filter("Infydate")(YYYY + MM + DD));
      console.log($scope.reviceDate);
    }
    $scope.save = function () {
      WorkOrderApi.saveOrderReviceInfo(function (resp) {
        if (resp.success) {
          Popup.delayRun(function () {
            console.log(resp.data);
            $ionicHistory.goBack();
          }, "保存成功！", 600);
        }
      }, {
        "receivingInfo": {
          "orderId": $scope.taskId,
          "reviceDate": $scope.reviceDate,
          "receivingInfoItems": $scope.receivingInfoItems,
          "fileList": $scope.images
        }
      });
    };
    $scope.addCount = function (item) { //增加
      item.goodsCount++;
    };
    $scope.subCount = function (item) { //减少
      if (item.goodsCount > 0) {
        item.goodsCount--;
      }
    };

    $scope.images = [];
    $scope.selectImage = function () { //点击添加图片对应的方法
      var options = {
        maximumImagesCount: 10,
        width: 800,
        height: 800,
        quality: 80
      };
      $cordovaImagePicker.getPictures(options)
        .then(function (imageData) {
          var imageCnt = imageData.length;
          if (imageCnt == 0) {
            return false;
          }
          $scope.successUploadCnt = 0;
          $ionicLoading.show({"template": "正在上传" + imageCnt + "张图片，已成功0张。"});
          for (var i = 0; i < imageCnt; i++) {
            var imageUrl = imageData[i];
            //ops.params.filePath = imageUrl;
            var ops = {
              fileKey: "image",
              headers: {"tokenId": "111"},
              params: {"originFileName": imageUrl}
            };
            var ft = new FileTransfer();
            ft.upload(imageUrl, encodeURI(baseUrl + "/api/other/uploadImage.api"), function (resp) {
              var result = window.JSON.parse(resp.response);
              $scope.successUploadCnt++;
              $ionicLoading.show({"template": "正在上传" + imageCnt + "张图片，已成功上传" + $scope.successUploadCnt + "张。"});

              if ($scope.successUploadCnt == imageCnt) {
                $ionicLoading.hide();
              }
              if (result.retCode == API_SUCCESS) {
                $scope.images.push({"imageUrl": result.data.originFileName, "fileId": result.data.fileId});
                $scope.$apply();
              } else {
                Popup.loadMsg(result.retInfo);
              }
            }, function (err) {
              Popup.loadMsg("上传图片过程中发生错误。");
              alert("err:" + window.JSON.stringify(err));
            }, ops);
          }
        }, function (error) {
          alert("result:" + window.JSON.stringify(error));
        });
    };
    $scope.detail = function (img) { //查看图片详情
      var info = {};
      info.curImgIndex = $scope.images.indexOf(img);
      //info.type = {};
      info.images = $scope.images;
      $state.go("tab.showImage", {
        imageInfo: JSON.stringify(info)
      })
    }
  });
