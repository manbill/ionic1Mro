workorderModel
  .controller('WorkListCtrl', function (Store, DataCache, eamFile, eamFaultWorkOrderFactory,
                                        $filter, $ionicListDelegate, $scope, Params, Popup, $ionicScrollDelegate, $stateParams, OrderService, $state, WorkOrderApi, $timeout, $rootScope, $ionicModal, eamSync, modifiedJson) { //工单列表
    OrderService.getDicListByType("workorder_status", function (res) {
      $scope.workStatuss = res;
    });
    $scope.hasMoreData = true;
    $scope.workList = [];
    $scope.params = {};
    $scope.params.pageNumber = 1;
    $rootScope.$on("cfpLoadingBar:refreshCompleted", cfpLoadingBarCompleted);
    function cfpLoadingBarCompleted() {//进度条
      console.log("cfpLoadingBar:refreshCompleted");
      $scope.$broadcast(SCROLL_REFRESH_COMPLETE);
    }

    OrderService.getDicListByType("workorder_type", function (faultSources) {//获取来源
      $scope.faultSources = faultSources;
      console.log("faultSources", faultSources)
    });
    $scope.faultOrderCreate = function () {
      $state.go('tab.faultOrderCreate', {
        data: {workList: $scope.workList}//需要将最新创建的记录追加在列表第一项
      });
    };
    $scope.goDetail = function (workOrder) {
      console.log(workOrder);
      var json = workOrder.json;
      $state.go("tab.SCADAWorkDetail", {
        data: {
          baseFaultOrder: workOrder,//主体
          detailFaultOrder: json//工单详情
        }
      });
    };
    $scope.loadMoreWork = function () {
      // 点击查询工单进来后的方法
      eamFaultWorkOrderFactory.getFaultOrders($scope.params, function (resp) {
        //追加结果
        if (resp.length == 0) {
          $scope.hasMoreData = false;
        } else {
          $scope.workList = $scope.workList.concat(resp);
          console.log("workList ", $scope.workList);
          $scope.params.pageNumber++;
          $scope.hasMoreData = true;
        }
        $scope.$broadcast(SCROLL_INFINITE_COMPLETE);
        $scope.$broadcast(SCROLL_REFRESH_COMPLETE);
      });
    };
    $ionicModal.fromTemplateUrl("views/workorder/workFilt.html", {
      scope: $scope,
      animation: "slide-in-up"
    }).then(function (modal) {
      $scope.filterModal = modal;
    });

    $scope.openFilter = function () {
      $scope.filterModal.show();
    };
    $scope.backButtonAction = function () {
      $scope.filterModal.hide();
    };
    $scope.query = function () {
      $scope.params.pageNumber = 1;
      // $scope.hasMoreData = true;
      $scope.workList = [];
      $scope.params.faultBeginFromTime = DateUtil.searchStartDate($scope.params.faultBeginFromTime);
      $scope.params.faultBeginToTime = DateUtil.searchEndDate($scope.params.faultBeginToTime);
      $scope.loadMoreWork();
      if ($scope.filterModal) $scope.filterModal.hide();
      Popup.delayRun(function () {//200ms滚动到顶部
        $ionicScrollDelegate.scrollTop();
      }, null, 200);
    };


    /**
     * 删除工单
     */
    $scope.delete = function (work, index, e) {
      //取出维修记录
      var repairList = JSON.parse(work.json).repairRecordList.workorderFixInfoDtoList;
      var materialConsume = 0;
      repairList.forEach(function (value, index, array) {
        if (value.repairMaterialDtoList.length > 0) {
          materialConsume += value.repairMaterialDtoList.length;
        }

        // forEach(function(valueIn, indexIn, arrayIn){
        //     repairMaterialDtoList.length > 0;
        // })
      });
      if (materialConsume > 0) {
        Popup.loadMsg("该工单有物料消耗，不能删除", 1000);
        return;
      }
      ;

      e.stopPropagation();
      Popup.confirm("确认删除该工单吗？", function () {
        eamFaultWorkOrderFactory.deleteWorkOrderRecord(work, function () {
          Popup.loadMsg("删除成功", 500);
          $scope.workList.splice(index, 1);
          $ionicListDelegate.closeOptionButtons();
        });
      });
    };

    $scope.$on("$ionicView.beforeEnter", function () {
      $scope.hasMoreData = false;
      $scope.query();
    });
    //下拉同步事件
    function refleshData() {
      if (isDebug) console.debug("刷新故障工单列表");
      $scope.params = {};
      $scope.query();
    }

    $scope.syncSchdlemaintail = function () {
      //从服务端刷新最新的数据下来。
      eamSync.sync(["eamFaultWorkOrderFactory.uploadFaultOrders", "eamFaultWorkOrderFactory.downloadFaultOrders"],
        function (res) {
          console.log(res);
          if (res) {
            Popup.loadMsg("同步成功", 500)
          } else {
            Popup.loadMsg("同步失败", 500);
          }
          Popup.delayRun(function () {
            refleshData();
          }, "", 1200);
        })
    };
    $rootScope.$on("createAndSyncOrder", function (e) {
      e.stopPropagation();
      console.log("createAndSyncOrder");
      refleshData();
    });
    $rootScope.$on(SAVE_WORK_TOTAL_HOUR_EVENT_COMPLETE, function (e) {
      e.stopPropagation();
      //if(isDebug)console.debug("刷新故障工单列表",e);
      refleshData();
    });
  })
  .controller('SCADAWorkDetailCtrl',
    function ($scope, $rootScope, $ionicSlideBoxDelegate, eamFile, $ionicBackdrop, eamFaultWorkOrderFactory, $ionicModal, Popup, Params, MaintainTaskRW, OrderService, $state, $ionicHistory, SCADAOrderDetail, $stateParams, eamSync, Storage, SchdleMaintainApi, modifiedJson) { //SCADA工单详情
      var faultWorkOrderStatus = {
        processing: 41,//处理中
        closed: 42,//工单关闭
        deleted: 43,//已删除
        toBeAuditing: 66//待审核
      };
      $scope.title = "故障工单维护";
      $scope.isShowAuditList = false;
      $scope.isShowPauseList = false;
      $scope.baseFaultOrder = $stateParams.data ? $stateParams.data.baseFaultOrder : null;
      $scope.detailFaultOrder = angular.fromJson($stateParams.data.detailFaultOrder);
      $scope.faultOrderDetailInfo = $scope.detailFaultOrder['workorderDetails']['eaWoWorkorderinfoDto'];
      $scope.fileList = $scope.detailFaultOrder['workorderDetails']['eaWoFilemappingList'];
      var detailShowParams = {
        baseFaultOrder: $scope.baseFaultOrder,
        detailFaultOrder: $scope.detailFaultOrder
      };
      $scope.$on('$ionicView.beforeEnter', function () {
        // setTimeout(function () {  $scope.$digest(); });
        console.log("工单维护界面对象",$scope.detailFaultOrder);
      });
      if (!$scope.detailFaultOrder.workorderDetails.eaWoWorkorderAuditingDtoList) {
        $scope.detailFaultOrder.workorderDetails.eaWoWorkorderAuditingDtoList = [];
      }
      if (!$scope.detailFaultOrder.workorderDetails.eaWoPauseDtoList) {
        $scope.detailFaultOrder.workorderDetails.eaWoPauseDtoList = [];

      }
      //暂停列表
      var suspendListData = $scope.detailFaultOrder.workorderDetails.eaWoPauseDtoList;

      //暂停原因待选项 初始化  "isChecked":false,"resultCode":"149","desc":"现场因素"

      var initStatusPauseReason = function (callback) {
        OrderService.getDicListByType("pause_reason", function (res) {
          //暂停原因 列表
          $scope.pauseReasons = [];
          //暂停描述 初始化为 ''
          $scope.pauseInfoFromModal.remark = "";
          angular.forEach(res, function (data) {
            $scope.pauseReasons.push({
              "isChecked": false,
              "resultCode": data.detailId,
              "desc": data.detailName
            });
            if ($.isFunction(callback)) {
              callback();
            }
          });
          // $scope.pauseReasons.push({
          //     "isChecked" : false,
          //     "resultCode" : res.detailId,
          //     "desc" : res.detailName
          //   });
        });
      };

      //暂停modal收集的信息
      $scope.pauseInfoFromModal = {
        "remark": "",
        "pauseReasons": []
      };
      // function initAttachments () {
      //   Popup.waitLoad('正在加载图片，请稍后');
      //   eamFile.retrieveInfoOrInsertFileRecord($scope.fileList)
      //     .then(function () {
      //       Popup.hideLoading();
      //     }, function (err) {
      //       Popup.hideLoading();
      //       Popup.promptMsg(JSON.stringify(err, undefined, 2), "图片加载失败");
      //     });
      // };
      $scope.downloadImage = function (image, index) {
        eamFile.openEamAttachedFile(image)
          .then(
            function (fileItem) {
              image.filePath = fileItem.filePath;
            }, function (err) {
              Popup.promptMsg(JSON.stringify(err, undefined, 2), "打开附件失败");
            });
      };//downloadImage end·······
      $scope.deleteAttachedImage = function (item, index, task) {
        if (task.workorderStatus != faultWorkOrderStatus.processing) {//不是处理中就不进行操作
          return;
        }
        $scope.fileList.splice(index, 1);
      };


      //暂停操作弹出/隐藏modal
      $ionicModal.fromTemplateUrl("views/schdlemaintain/maintainTaskPause.html", {
        scope: $scope,
        animation: 'slide-in-up'
      }).then(function (modal) {
        $scope.modal = modal;
      });
      var openModal = function () {
        initStatusPauseReason(function () {
          $scope.modal.show();
        });

      };
      var closeModal = function () {
        initStatusPauseReason(function () {
          $scope.modal.hide();
        });
      };

      $scope.pauseBackBtnAction = function () {
        closeModal();
      };

      //暂停处理状态 --- 无暂停原因
      $scope.pauseOrder = function (order) {
        openModal();
      };

      //暂停 原因处理 todo
      $scope.pauseInfoConfirmed = function (tempPauseOrder) {//确定“暂停信息采集”,暂停任务后，状态为暂停
        var pauseIds = [];
        for (var i = 0; i < $scope.pauseReasons.length; i++) {
          var pauseReason = $scope.pauseReasons[i];//"isChecked":false "resultCode":"149","desc":"现场因素"
          if (pauseReason.isChecked) {
            $scope.pauseInfoFromModal.pauseReasons.push(pauseReason.desc);
            pauseIds.push(pauseReason.resultCode);
          }
        }
        if ($scope.pauseInfoFromModal.pauseReasons.length == 0) {
          Popup.promptMsg("请选择原因");
          $("div.popup-container>div.popup").css("border-radius", "5%");
          return;
        }
        var nowDate = new Date();
        suspendListData = $scope.detailFaultOrder.workorderDetails.eaWoPauseDtoList || [];
        suspendListData.unshift({
          pauseId: "",//暂停编号
          workorderId: $scope.taskId,//工单Id
          pausereasonId: pauseIds.join(","),//暂停原因id
          pausereasonName: $scope.pauseInfoFromModal.pauseReasons.join(","),//暂停原因名称
          pauseRemark: $scope.pauseInfoFromModal.remark,//暂停描述
          status: 154,//暂停/开启状态
          statusName: "暂停",//暂停/开启状态名称
          activeFlag: 0,//有效标志
          createBy: Storage.getProfile()['id'],//暂停人
          createOn: nowDate.format("yyyy-MM-dd hh:mm")//暂停时间
        });
        //故障工单  --  暂停列表
        $scope.detailFaultOrder.workorderDetails.eaWoPauseDtoList = suspendListData;
        console.log("pauselist ", $scope.detailFaultOrder.workorderDetails.eaWoPauseDtoList);

        //暂停一个工单之后 需要更新
        // satusChangeHandeler(301);
        $scope.faultOrderDetailInfo.workorderStatus = 301;
        $scope.faultOrderDetailInfo.workorderStatusName = "暂停";
        eamFaultWorkOrderFactory.changeWorkOrderStatus($scope.faultOrderDetailInfo.workorderStatus, $scope.detailFaultOrder, function (savedOrder) {
          angular.copy(savedOrder, $scope.detailFaultOrder);
          savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
          angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.baseFaultOrder);//目的是同步改变故障工单列表的信息
          console.log("pauselist ", $scope.detailFaultOrder.workorderDetails.eaWoPauseDtoList);
          closeModal();
        });
      };

      //恢复处理
      $scope.recoveryOrder = function (order) {
        // $scope.faultOrderDetailInfo.workorderStatus = 41;
        // $scope.faultOrderDetailInfo.workorderStatusName = "处理中";
        Popup.confirm("您确定要恢复么？", function () {
          // console.log($scope.faultOrderDetailInfo);
          // console.log(order);

          suspendListData = $scope.detailFaultOrder.workorderDetails.eaWoPauseDtoList || [];
          var nowDate = new Date();
          suspendListData.unshift({
            pauseId: "",//暂停编号
            workorderId: $scope.taskId,//工单Id
            pausereasonId: "",//暂停原因id
            pausereasonName: "恢复",//恢复
            pauseRemark: "恢复",//暂停描述
            status: 155,//暂停/开启状态
            statusName: "恢复",//暂停/开启状态名称
            activeFlag: 0,//有效标志
            createBy: Storage.getProfile()['id'],//暂停人
            createOn: nowDate.format("yyyy-MM-dd hh:mm")//暂停时间
          });
          $scope.detailFaultOrder.workorderDetails.eaWoPauseDtoList = suspendListData;

          order.workorderStatus = 41;
          order.workorderStatusName = "处理中";
          satusChangeHandeler(41);
          // eamFaultWorkOrderFactory.changeWorkOrderStatus(order.workorderStatus, $scope.detailFaultOrder, function (savedOrder) {
          //     angular.copy(savedOrder, $scope.detailFaultOrder);
          //     savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
          //     angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.baseFaultOrder);//目的是同步改变故障工单列表的信息
          // });
        });
      };

      //审核处理
      $scope.verifyOrder = function (order) {
        // detailFaultOrder.workorderDetails.eaWoWorkorderAuditingDtoList
        console.log($scope.detailFaultOrder.workorderDetails.eaWoWorkorderAuditingDtoList);
        Popup.popVerify(function (res) {
          console.log(res);
          if (res == "") {
            return;
          }
          var nowDate = new Date();
          if (res.status == 1) {
            // console.log(res);
            $scope.detailFaultOrder.workorderDetails.eaWoWorkorderAuditingDtoList.unshift({
              activeFlag: 0,//有效标志
              auditingDate: nowDate.format("yyyy-MM-dd hh:mm"),
              auditingId: null,
              auditingOpinion: $rootScope.verifyReasonData.verifyReason,
              auditingResult: 91,
              auditingUser: Storage.getProfile()['id'],
              auditiogResultName: "通过",
              workorderId: $scope.baseFaultOrder.workOrderCode
            });
            order.workorderStatus = 42;
            order.workorderStatusName = "工单关闭";
            satusChangeHandeler(order.workorderStatus);
            // eamFaultWorkOrderFactory.changeWorkOrderStatus(order.workorderStatus, $scope.detailFaultOrder, function (savedOrder) {
            //     savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
            //     angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.baseFaultOrder);//目的是同步改变故障工单列表的信息
            // });
          } else {
            $scope.detailFaultOrder.workorderDetails.eaWoWorkorderAuditingDtoList.unshift({
              activeFlag: 0,//有效标志
              auditingDate: nowDate.format("yyyy-MM-dd hh:mm"),
              auditingId: null,
              auditingOpinion: $rootScope.verifyReasonData.verifyReason,
              auditingResult: 92,
              auditingUser: Storage.getProfile()['id'],
              auditiogResultName: "不通过",
              workorderId: $scope.baseFaultOrder.workOrderCode
            });
            order.workorderStatus = 41;
            order.workorderStatusName = "处理中";
            satusChangeHandeler(order.workorderStatus);
            // eamFaultWorkOrderFactory.changeWorkOrderStatus(order.workorderStatus, $scope.detailFaultOrder, function (savedOrder) {
            //   savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
            //   angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.baseFaultOrder);//目的是同步改变故障工单列表的信息，已经不需要
            // });
          }
          //审核过后，清空pop中的 使用过的全局缓存
          $rootScope.verifyReasonData.status = null;
          $rootScope.verifyReasonData.verifyReason = null;
        });

      };
      //更新 $scope.detailFaultOrder 和   $scope.baseFaultOrder 否则显示信息不能及时更新
      var satusChangeHandeler = function (status) {
        // Popup.confirm("您确定要操作么？", function () {
          eamFaultWorkOrderFactory.changeWorkOrderStatus(status, $scope.detailFaultOrder, function (savedOrder) {
            angular.copy(savedOrder, $scope.detailFaultOrder);
            savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
            angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.baseFaultOrder);//目的是同步改变故障工单列表的信息
            if (status == 301) {
              closeModal();
            }
          });
        // }, function () {
          //if no ,do something here
        // });
      };

      /**
       * 工单提交
       * @param order
       */
      $scope.submitSCADAWorkOrder = function (order) {
        Popup.confirm("您确定要提交么？", function () {
          var workorderStatus;
          if (order.workorderStatus == faultWorkOrderStatus.processing) {//处理中
            workorderStatus = faultWorkOrderStatus.toBeAuditing;//待审核
          } else if (order.workorderStatus == faultWorkOrderStatus.toBeAuditing) {
            workorderStatus = faultWorkOrderStatus.closed;
          }
          eamFaultWorkOrderFactory.changeWorkOrderStatus(workorderStatus, $scope.detailFaultOrder, function (savedOrder) {
            angular.copy(savedOrder, $scope.detailFaultOrder);
            savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
            angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.baseFaultOrder);//目的是同步改变故障工单列表的信息
            // $scope.saveSCADAWorkOrder();
          });
        }, function () {
          //if no ,do something here
        });
      };

      /**
       * 工单保存
       * @param work
       */
      $scope.saveSCADAWorkOrder = function () {
        Popup.confirm("您确定要保存工单么？", function () {
          var infos=[];

          if(!$scope.detailFaultOrder.apiWorkorderBaseInfoDto.positionId){
            infos.push("机位号不能为空");
          }
          if(!$scope.detailFaultOrder.workorderDetails.eaWoWorkorderinfoDto.deviceId){
            infos.push("部件名称不能为空");
          }
          if(!$scope.detailFaultOrder.apiWorkorderBaseInfoDto.workorderTitle){
            infos.push("工单主题不能为空");
          }
          if(!StringUtils.isNotEmpty($scope.detailFaultOrder.workorderDetails.eaWoWorkorderinfoDto.faultDetailComment)){
            infos.push("故障现象描述不能为空");
          }
          if(infos.length>0){
            Popup.promptMsg(infos.join("<br/>"));
            return ;
          }
          eamFaultWorkOrderFactory.saveFaultOrder($scope.detailFaultOrder, function (savedOrder) {
            console.log(savedOrder);
            angular.merge($scope.baseFaultOrder, savedOrder['apiWorkorderBaseInfoDto']);//目的是同步改变故障工单列表的信息
            $rootScope.$emit("createAndSyncOrder");
            Popup.delayRun(function () {
              $ionicHistory.goBack();
            }, "", 1200);
            // eamSync.sync(["eamFaultWorkOrderFactory.uploadFaultOrders", "eamFaultWorkOrderFactory.downloadFaultOrders"], function (res) {
            //   console.log(res);
            //   if (res) {
            //     Popup.loadMsg("同步成功!", 800);
            //     $rootScope.$emit("createAndSyncOrder");
            //       Popup.delayRun(function () {
            //         $ionicHistory.goBack();
            //       }, "", 1200);
            //   } else {
            //     Popup.loadMsg("同步未成功!", 800);
            //     Popup.delayRun(function () {
            //       $ionicHistory.goBack();
            //     }, "", 1200);
            //   }
            // })

          });
        }, function () {
          //if no ,do something here

        });
      };

      //跳转至维修记录列表
      $scope.recordRepair = function () {
        $state.go("tab.recordRepairList", {
          work: $scope.detailFaultOrder
        });
      };
      //跳转至故障信息列表页
      $scope.currentFaultList = function (work) {
        $state.go("tab.currentFaultList", {
          work: $scope.detailFaultOrder
        });
      };
//搜索历史故障
      $scope.searchHistoryFaultCode = function (workorderFaultCode) {
        $state.go("tab.historyFaultList", {
          workorderFaultCode: workorderFaultCode
        });
      };
//跳转到编辑页
      $scope.goSCADAEdit = function (faultOrderDetailInfo) {
        // console.log(faultOrderDetailInfo);
        // if (faultOrderDetailInfo.workorderType == "38") {//人工工单

        $state.go("tab.faultOrderDetailShowNModify", {//跳转故障工单详情页面,该页面可以修改信息
          data: {
            faultOrder: $scope.detailFaultOrder
          }
        });
        // } else {//故障工单,风云

        //   $state.go("tab.SCADAEdit", {
        //     data: {
        //       faultOrderDetailInfo: faultOrderDetailInfo,
        //       fileList: $scope.fileList
        //     }
        //   });
        // }
      };

      //跳转人员报工界面
      $scope.goToPeopleReport = function () {
        $state.go("tab.workHours", {
          data: $scope.detailFaultOrder
        });
      };

      //跳转到 暂停记录界面
      $scope.goToPauseList = function () {
        console.log("status go pauseList", $scope.detailFaultOrder.workorderDetails.eaWoPauseDtoList);
        // var pauseList = JSON.stringify($scope.detailFaultOrder.workorderDetails.eaWoPauseDtoList);
        $state.go("tab.faultOrderPauseList", {
          data: $scope.detailFaultOrder.workorderDetails.eaWoPauseDtoList
        });
      };

      //跳转到 审核记录界面
      $scope.goToVerifyList = function () {
        console.log("status go verifyList", $scope.detailFaultOrder.workorderDetails.eaWoWorkorderAuditingDtoList);
        $state.go("tab.faultOrderVerifyList", {
          data: $scope.detailFaultOrder.workorderDetails.eaWoWorkorderAuditingDtoList
        });
      };

      //跳转到 审核界面 共用
      $scope.goToVerifyOrder = function () {
        $state.go('tab.verifyOrder', {
          data: {
            detailFaultOrder: $scope.detailFaultOrder, //工单里的详情新信息
            baseFaultOrder: $scope.baseFaultOrder, //整个工单的信心
            workOrderCode: $scope.baseFaultOrder.workorderCode, //工单号
            workOrderType: $scope.baseFaultOrder.workorderType  //工单类型  代表故障工单
          }
        })
      }
      //跳转到故障工单详情
      $scope.goToFaultOrderDetail = function () {
        // console.log($scope.stateParams);
        // var data = $scope.stateParams.data;
        $state.go("tab.faultOrderCreate", {
          data: detailShowParams
        });
      };

      //是否可以编辑故障工单 //todo
      $scope.isCanEditFaultOrder = function () {

      }

    })
  //风机故障修改
  .controller('SCADAEditCtrl', function ($scope, starterClassFactory, $stateParams, SCADAOrderDetail, $ionicHistory, Popup, OrderService, Storage) { //描述信息编辑

    $scope.work = $stateParams.data.faultOrderDetailInfo;
    $scope.projectList = Storage.getProjects();
    $scope.fileList = $stateParams.data.fileList;
    OrderService.getDicListByType("workorder_faults", function (res) {
      $scope.faultCauses = res;
      //给工单故障下拉赋值
      for (var i = 0; i < $scope.faultCauses.length; i++) {
        if ($scope.work.faultReason = $scope.faultCauses[i].detailId) {
          $scope.work.faultCause = $scope.faultCauses[i];
        }
      }
      for (var i = 0; i < $scope.projectList.length; i++) {
        if ($scope.work.projectId = $scope.projectList[i].projectId) {
          $scope.work.project = $scope.projectList[i];
        }
      }
    });

    $scope.downloadImage = function (image, index) {
      var filePath = image.filePath;
      var fileId = image.fileId;
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
          $scope.options = {
            loop: false,
            effect: 'fade',
            speed: 500
          };
          $scope.showImage = function (images, selectImage) {
            $scope.images = images;
            $ionicModal.fromTemplateUrl("views/common/showImgModal.html", {
              animation: "slide-in-up",
              scope: $scope
            }).then(function (modal) {
              $scope.showImgModal = modal;
              $ionicSlideBoxDelegate.slide(images.indexOf(selectImage), 100);
              $scope.showImgModal.show();
              $ionicBackdrop.retain();
            });
            $scope.closeModal = function () {
              $scope.showImgModal.hide();
              $ionicBackdrop.release();
            };
            $scope.onSlideChange = function (index) {
              $ionicSlideBoxDelegate.slide(index, 100);
              console.log(index);
            };
          };
          var info = {};
          //info.type = {};
          info.images = [];
          for (i = 0; i < $scope.fileList.length; i++) {
            var img = $scope.fileList[i];
            if (!!img.filePath && img.filePath.indexOf("file://") >= 0) {
              info.images.push(img);
            }
          }
          if (info.images.length > 0) {
            info.curImgIndex = !!index ? index : 0;
            $scope.showImage(info.images, index);
          } else {
            for (var i = 0; i < $scope.fileList.length; i++) {
              info.images.push({
                filePath: 'img/uploadimg.png'
              });
            }
            $scope.showImage(info.images, index);
          }
          $scope.$on("$ionicSlides.sliderInitialized", function (event, data) {
            // data.slider is the instance of Swiper
            $scope.slider = data.slider;
          });
          $scope.$on("$ionicSlides.slideChangeStart", function (event, data) {
            console.log('Slide change is beginning');
          });

          $scope.$on("$ionicSlides.slideChangeEnd", function (event, data) {
            // note: the indexes are 0-based
            $scope.activeIndex = data.slider.activeIndex;
            $scope.previousIndex = data.slider.previousIndex;
          });

        }
      });
    };//downloadImage end·······


    /**
     * 删除图片附件
     * @param item
     */
    $scope.removeAttachment = function (item) {
      ArrayUitls.remove($scope.fileList, item);
    };
    //新增 编辑图片
    $scope.addeditAttachment = function () {
      var attachedFileInstance = starterClassFactory.attachedFileInstance();
      console.log("attachedFileInstance", attachedFileInstance);
      OrderService.addeditAttachment($scope.fileList, !item ? {filemappingId: null} : item);
    };

    //保存
    $scope.save = function (order) {
      if (!order.positionCode) {
        Popup.delayRun(function () {
        }, "机位号必填");
        return;
      }
      order.faultBeginTime = new Date(order.faultBeginTime).getTime();
      order.faultEndTime = new Date(order.faultEndTime).getTime();
      order.fileList = $scope.fileList;

      OrderService.updateOrInsert(OrderService.createWorkorders(order), function () {
        Popup.delayRun(function () {
          //$state.go("tab.workList");
          $ionicHistory.goBack();
        }, "保存成功");
      });
    }
  })
  .controller("ManualEidtCtrl", function ($scope, Popup, $stateParams, WorkOrderApi, $ionicHistory) {
    //console.log($stateParams);
    $scope.work = JSON.parse($stateParams.work);
    $scope.manualWorkSave = function () {
      console.log($scope.work);
      WorkOrderApi.saveSCADAWorkOrder(function (resp) {
        if (resp.success) {
          console.log(resp);
          Popup.delayRun(function () {
            $ionicHistory.goBack();
            $scope.$broadcast("onManualWorkSaveSuccess", $scope.work.orderId);
          }, "保存成功")
        }
      }, {
        "ncr": $scope.work.ncr,
        "orderId": $scope.work.orderId,
        "materiels": $scope.work.otherCauseCategory,
        "otherCauseStopTime": $scope.work.otherCauseStopTime,
        "currentCauseDes": $scope.work.currentCauseDes,
        "faultSuggest": $scope.work.faultSuggest,
        "faultDetailDes": $scope.work.faultDetailDes,
        "faultCause": $scope.work.faultCause,
        "faultCauseDes": $scope.work.faultCauseDes
      });
    };
  })
  .controller('ManualWorkDetailCtrl', function ($scope, Popup, $stateParams, $ionicHistory, $state, WorkOrderApi, Store) { //手工工单详情
    Popup.waitLoad();
    $scope.title = $stateParams.title;
    if (!!$stateParams.work) {
      var work = JSON.parse($stateParams.work);
      $scope.taskId = work.orderId;
    } else {
      $scope.taskId = $stateParams.taskId;
    }
    $scope.isShowManualWorkDetail = false;
    $scope.showManualWorkDetail = function () {
      $scope.isShowManualWorkDetail = !$scope.isShowManualWorkDetail;
      var divDetailItems = $('#id-showing-detail').children();
      var divTopItems = $('.click-hide-item-action').children();
      if ($scope.isShowManualWorkDetail) {
        $('.div-buttons-items-action').hide();
        $.each(divTopItems, function (i, ele) {
          $(ele).slideUp(100);
          $.each(divDetailItems, function (i, ele) {
            $(ele).hide();
          });
          $.each(divDetailItems, function (i, ele) {
            $(ele).fadeIn(100 + 50 * i);
          });
        });
      } else {
        $.each(divTopItems, function (i, ele) {
          $(ele).fadeIn(100 * i);
        });
        $('.div-buttons-items-action').fadeIn(200);
      }
    };
    $scope.goManualEdit = function (work) {
      var workStr = JSON.stringify(work);
      $state.go("tab.manualEdit", {
        work: workStr
      });
    };
    $scope.$on("onManualWorkSaveSuccess", function (event, workOrderId) {
      WorkOrderApi.getOrderDetail(function (resp) {
        if (resp.success) {
          $scope.work = resp.data;
          $scope.work.status = resp.data.status;
          console.log($scope.work);

        }
      }, {
        "orderId": taskId
      });
    });

    $scope.params = {
      "orderId": $scope.taskId,
      "ncr": null,
      "remark": null
    };


    /**
     * 提交手工工单
     */
    $scope.submitManualWorkOrder = function (order) {
      var params = {
        "orderId": order.orderId
      };
      if (order.status == '2' || order.status == '1') {
        Popup.confirm("您确定要提交工单吗？", function () {
          WorkOrderApi.submitOrder(function (submitResp) {
            console.log(submitResp);
            //order.status = '3';//待审核
            WorkOrderApi.getOrderDetail(function (resp) {
              if (resp.success) {
                $scope.work = resp.data;
                Popup.loadMsg("提交完毕");
                $ionicHistory.clearCache();
              }
            }, {
              "orderId": order.orderId
            });
          }, params);

        }, function () {
          //if no ,do something here
        });
      }
      if ($scope.work.status == '3') {
        Popup.confirm("是否通过审核？", function () {

        }, function () {
          //no pass TODO
        }, "是", "否");
      }
    };

  })
  //物料请求控制器
  .controller('MaterialRequestCtrl', function ($scope, MaterialRequest, $stateParams, WorkOrderApi, Popup, $state, $ionicPopup) { //SCADA工单-物料请求
    $scope.taskId = $stateParams.taskId;
    $scope.materielRequestList = [];

    getMaterialRequest();

    function getMaterialRequest() {
      Popup.waitLoad();
      MaterialRequest.getMaterialRequest(function (resp) {
        if (resp.success) {
          console.log(resp.data);
          $scope.materielRequestList = resp.data;
        }
      }, {
        "orderId": $scope.taskId
      });
    }

    $scope.addMaterielRequest = function () {
      $state.go("tab.materialRequestEdit", {
        "orderId": $scope.taskId
      })
    };

    $scope.updateCount = function (item) {
      $scope.data = {
        "count": parseInt(item.count)
      };
      var myPopup = $ionicPopup.show({
        template: '<input type="number" ng-model="data.count"/>',
        title: '请输入数量',
        subTitle: '只能输入数字',
        scope: $scope,
        buttons: [{
          text: '取消'
        }, {
          text: '<b>确定</b>',
          type: 'button-positive',
          onTap: function (e) {

            if ($scope.data.count && $scope.data.count < 0 || $scope.data.count == "-") {
              Popup.loadMsg("数量不能为负");
              e.preventDefault();
              return;
            }
            if (!$scope.data.count) {
              Popup.loadMsg("请输入数量");
              e.preventDefault();
            } else {
              item.count = $scope.data.count;
              MaterialRequest.updateMaterielRequest(function (resp) {
                if (resp.success) {
                  //item.count = $scope.data.count;
                }
              }, item);
            }
          }
        }]
      });
      myPopup.then(function (res) {
        console.log('Tapped!', res);
      });
    }

    $scope.delete = function (materielRequest) {
      Popup.confirm("您确定要删除该物料请求吗？", function () {
        $scope.materielRequestList.splice($scope.materielRequestList.indexOf(materielRequest), 1);
        MaterialRequest.deleteMaterialRequest(function (resp) {
          if (resp.success) {
            //console.log(resp.data);
            //
            //getMaterialRequest();
          }
        }, materielRequest, $scope.taskId);
      });
    }
  })
  .controller('MaterialRequestEditCtrl', function ($ionicHistory, $scope, MaterialRequest, Popup, $stateParams, $state, WorkOrderApi, $timeout, $ionicModal) { //计划工单-编辑物料请求
    /**
     * 保存物料请求
     */
    $scope.save = function () {

      var selectMateriels = [];
      for (var i = 0; i < $scope.materielList.length; i++) {
        if ($scope.materielList[i].count != null && $scope.materielList[i].count != "") {
          if ($scope.materielList[i].count < 0) {
            Popup.delayRun(function () {

            }, "数量不能为负数");
            return;
          }
          selectMateriels.push({
            "count": $scope.materielList[i].count,
            "materielNo": $scope.materielList[i].materielNo,
            "materielId": $scope.materielList[i].materielId,
            "unitId": $scope.materielList[i].unitId,
            "unit": $scope.materielList[i].unit
          });
        }
      }
      console.debug(selectMateriels);
      MaterialRequest.saveMaterialRequest(function (resp) {
        if (resp.success) {
          Popup.delayRun(function () {
            $ionicHistory.goBack();
          }, "保存成功");
        }
      }, {
        "materielRqsts": selectMateriels,
        "orderId": $stateParams.orderId
      }, $stateParams.orderId);
    };
    $scope.pageNumber = 1;
    $scope.noMoreData = true;
    $scope.materielList = []; //物料列表
    $scope.params = {
      materielNo: null,
      name: null
    };
    $scope.isFilterOpen = false; //
    $scope.loadMore = function () {
      WorkOrderApi.getMaterielList(function (resp) {
        if (resp.success) {
          $scope.materielList = $scope.materielList.concat(resp.data);
          if (resp.data == null || resp.data.length == 0) {
            $scope.noMoreData = true;
          } else {
            $scope.pageNumber++;
            $timeout(function () {
              $scope.noMoreData = false;
              $scope.$broadcast(SCROLL_INFINITE_COMPLETE);
            }, INFINITE_TIME);
          }
        }
      }, {
        materielNo: $scope.params.materielNo,
        name: $scope.params.name,
        pageNumber: $scope.pageNumber
      });
    };

    // 点击查询工单进来后的方法
    $scope.loadMore();

    //筛选物料模板定义
    $ionicModal.fromTemplateUrl("views/workorder/materialQuery.html", {
      scope: $scope,
      animation: "slide-in-up"
    }).then(function (modal) {
      $scope.filterModal = modal;
      //$timeout(function() {
      $scope.filterModal.show();
      //}, 500);
    });

    /**
     * 打开筛选界面
     */
    $scope.openQuery = function () {
      $scope.filterModal.show();
    };
    /**
     * 关闭筛选界面
     */
    $scope.closeQuery = function () {
      $scope.filterModal.hide();
    };
    /**
     * 查询物料
     */
    $scope.query = function () {
      $scope.pageNumber = 1;
      $scope.materielList = [];
      Popup.waitLoad();
      $scope.loadMore();
      $scope.filterModal.hide();
    };
  })
  .controller('planMaterialSelectCtrl', function ($scope, Params, Popup, $ionicHistory, $ionicScrollDelegate, $stateParams, $state, WorkOrderApi, $timeout, $ionicModal, OrderService) { //SCADA工单-选择物料
    $scope.pageNumber = 1;
    $scope.hasMoreData = false;
    $scope.materielList = [];
    $scope.params = {
      materielNo: null,
      sn: null,
      name: null,
      pageNumber: $scope.pageNumber
    };
    $scope.loadMore = function () {
      OrderService.getMaterialPageList(function (resp) {
        //追加结果
        if (resp.rows.length === 0) {
          $scope.hasMoreData = false;
        } else {
          $scope.params.pageNumber++;
          $scope.hasMoreData = true;
          $scope.materielList = $scope.materielList.concat(OrderService.ChangeSQLResult2Array(resp));
        }
      }, $scope.params);
      $scope.$broadcast(SCROLL_INFINITE_COMPLETE);
    };
    $scope.select = function (materiel) {
      Params.setTransferredObjByKey("selectedMaterial", materiel);
      $ionicHistory.goBack();
    };
    // 点击查询工单进来后的方法
    $scope.loadMore();

    $ionicModal.fromTemplateUrl("views/workorder/PlanMaterialFilt.html", {
      scope: $scope,
      animation: "slide-in-up"
    }).then(function (modal) {
      $scope.filterModal = modal;
    });

    $scope.openFilter = function () {
      $scope.filterModal.show();
    };
    $scope.backButtonAction = function () {
      $scope.filterModal.hide();
    };
    $scope.closeFilter = function () {
      $scope.hasMoreData = false;
      $scope.materielList = [];
      $scope.params.pageNumber = 1;
      $scope.loadMore();
      $scope.filterModal.hide();
      Popup.delayRun(function () {//200ms滚动到顶部
        $ionicScrollDelegate.scrollTop();
      }, null, 200);
    };
  })
  .controller('HistoryFaultListCtrl', function ($scope, $stateParams, WorkOrderApi, $timeout, $ionicModal, Popup, $state, OrderService) {
    console.log($stateParams);
    $scope.hasMoreData = false;
    $scope.params = {};
    $scope.params.pageNumber = 1;
    $scope.faultLists = [];
    $scope.params.faultCode = $stateParams.workorderFaultCode;

    //Popup.waitLoad();
    $scope.loadMoreWorkHistory = function () {  // 点击查询工单进来后的方法
      OrderService.loadMore($scope.params, function (resp) {
        //追加结果
        if (resp.rows.length == 0) {
          $scope.hasMoreData = false;
        } else {
          $scope.params.pageNumber++;
          $timeout(function () {
            $scope.hasMoreData = true;
            $scope.$broadcast(SCROLL_INFINITE_COMPLETE);
          }, INFINITE_TIME);
          $scope.faultLists = $scope.faultLists.concat(OrderService.ChangeSQLResult2Array(resp));
        }
      });

    };
    $scope.loadMoreWorkHistory();
    $scope.goDetail = function (faultList) {
      $state.go("tab.historyFaultDetail", {
        "workOrderInfo": faultList
      })
      return false;
    };
    $ionicModal.fromTemplateUrl("views/workorder/historyFaultFilt.html", {
      scope: $scope,
      animation: "slide-in-up"
    }).then(function (modal) {
      $scope.filterModal = modal;
    });

    $scope.openFilter = function () {
      $scope.filterModal.show();
    };
    $scope.closeFilter = function () {
      $scope.hasMoreData = false;
      $scope.faultLists = [];
      $scope.params.pageNumber = 1;
      $scope.loadMoreWorkHistory();
      $scope.filterModal.hide();
    };
  })
  .controller('HistoryFaultDetailCtrl', function ($scope, $stateParams) {
    console.log("HistoryFaultDetailCtrl");
    $scope.faultDetail = $stateParams.workOrderInfo;
  })
  //  故障工单--设备维修，控制器
  .controller('RecordRepairCtrl', function ($rootScope, $timeout, WorkOrderApi, $ionicListDelegate, RepairRecordService, $scope, Popup, $stateParams, $state, OrderService) { //维修记录
    $scope.work = $stateParams.work;
    console.log($scope.work);
    if (!$scope.work.repairRecordList.workorderFixInfoDtoList) {
      $scope.work.repairRecordList.workorderFixInfoDtoList = [];
    }
    $scope.recordRepairList = $scope.work.repairRecordList.workorderFixInfoDtoList ? $scope.work.repairRecordList.workorderFixInfoDtoList : [];
    $scope.newRecordRepairList = function () {
      $state.go("tab.createRecordRepair", {
        data: {
          "work": $scope.work,
          "recordRepairList": $scope.recordRepairList
        }
      });
    };
    $scope.editRecordRepair = function (recordRepair, index) {
      $state.go("tab.recordRepairEdit", {
        "work": $scope.work,//整个工单对象
        // "recordRepairList": $scope.recordRepairList,//维修列表
        "recordRepairIndex": index//选中列表中某一项的索引
      });
    };

    //工单的任何状态，都可以查看 设备维修记录详情
    $scope.isCanWatchInfo = function (workOrderStatus) {
      return true;
    };

    // 只有处理中的故障工单 才能添加设备维修记录
    $scope.isCanEditRecord = function (workOrderStatus) {
      return workOrderStatus == $rootScope.faultStatus.FAULT_STATUS_PROCESSING;
    };

    //删除维修记录,不能删,只能查看和编辑
    $scope.delete = function (index) {
      Popup.confirm("确认删除维修记录吗？", function () {
        $scope.recordRepairList.splice(index, 1);
        // var jsonObject = JSON.parse($scope.work.json);
        // jsonObject.repairRecordList.workorderFixInfoDtoList = $scope.recordRepairList;
        // $scope.work.json = JSON.stringify(jsonObject);
        // OrderService.changeWorkOrderJson($scope.work, function () {
        //   Popup.loadMsg("删除成功", 300);
        //   $ionicListDelegate.closeOptionButtons();
        // })
      });
    }
  })
  //新建维修记录
  .controller("CreateRecordRepairCtrl",
    function ($scope, DeviceTreeService, starterClassFactory, Popup, eamFaultWorkOrderFactory, $ionicListDelegate, OrderService, $stateParams, Storage, $ionicHistory, $state, Params) {
      $scope.work = $stateParams.data.work;//整个工单对象
      $scope.recordRepairList = $stateParams.data.recordRepairList;//维修记录列表
      $scope.params = {
        fixBeginDate1: null
      };
      var fixType = {//维修类型
        'isChange': 60,//更换设备
        'repair': 61// 维修设备
      };
      $scope.title = '新建维修记录';
      $scope.params = {isChange: false};//维修设备
      $scope.recordRepair = starterClassFactory.workOrderFixInfoInstance();//新建设备维修
      $scope.recordRepair.deviceId = $scope.work.workorderDetails.eaWoWorkorderinfoDto.deviceId;
      $scope.recordRepair.deviceName = $scope.work.workorderDetails.eaWoWorkorderinfoDto.deviceName;//设备名称,默认带出工单内部的设备
      $scope.recordRepair.repairMaterialDtoList = [];//物料消耗列表
      $scope.selectFanEquipment = function (work) {
        $state.go("tab.selectedEquipment", {
          data: work
        });
      };
      $scope.$on('$ionicView.beforeEnter', function () {
        $scope.equipmentDetail = Params.getTransferredObjByKey("selectedEquipment");
        $scope.selectedMaterial = Params.getTransferredObjByKey("selectedMaterial");
        if ($scope.equipmentDetail) {
          $scope.recordRepair.serialNum1 = $scope.equipmentDetail["seriesNo"] + "";
          $scope.recordRepair.deviceName = $scope.equipmentDetail["equipmentName"];
          $scope.recordRepair.deviceId = $scope.equipmentDetail["equipmentId"];
          $scope.recordRepair.originalMaterialSno = $scope.equipmentDetail["materialNo"];
          $scope.recordRepair.wuliaohao1 = $scope.equipmentDetail["materialId"];
          $scope.recordRepair.provider1 = $scope.equipmentDetail["vendorShortname"];
          $scope.recordRepair.guaranteePeriod1 = $scope.equipmentDetail["guaranteePeriod"];
          $scope.params.fixBeginDate1 = $scope.equipmentDetail["warrantySupplierBegindate"];//数据库中的数据是时间戳
          Params.clearTransferredObjByKey("selectedEquipment");
        }
        if ($scope.selectedMaterial) {
          if ($scope.params.isChange) {//设备更换
            $scope.recordRepair.wuliaohao2 = $scope.selectedMaterial["materialId"];
            $scope.recordRepair.updateMaterialSno = $scope.selectedMaterial["materialName"];
          }
          Params.clearTransferredObjByKey("selectedMaterial");
        }
      });
      $scope.switchFixType = function () {
        $scope.recordRepair.fixType = $scope.params.isChange ? fixType.isChange : fixType.repair;
      };
      $scope.goToChangedEquipmentDetail = function () {
        $state.go('tab.changeEquipmentDetail', {
          data: {
            recordRepair: $scope.recordRepair,
            isCanEditDetail:true
          }
        });
      };
      /**
       * 增加物料消耗
       */
      $scope.addConsume = function () {
        $state.go("tab.consumeMaterielAdd", {
            data:{
                selectMateriels: $scope.recordRepair.repairMaterialDtoList
            }
        });
      };
      $scope.saveRecordRepair = function () {
        console.log("$scope.recordRepair" + JSON.stringify($scope.recordRepair, undefined, 2));
        if (!StringUtils.isNotEmpty($scope.recordRepair.fixType)) {
          Popup.promptMsg("请确认维修类型");
          return;
        }
        if (angular.isDate($scope.params.fixBeginDate1)) {
          $scope.recordRepair.fixBeginDate1 = new Date(parseInt($scope.params.fixBeginDate1)).format("yyyy-MM-dd");//后台需要的是这种格式
        }
        if (!$scope.params.isChange) {//维修设备
          if (!StringUtils.isNotEmpty($scope.recordRepair.deviceName)) {
            Popup.loadMsg("部件名称不能为空");
            return false;
          }
        }
        if ($scope.params.isChange) {//变更设备
          if (!StringUtils.isNotEmpty($scope.recordRepair.deviceName)) {
            Popup.loadMsg("部件名称不能为空");
            return;
          }
          if (!$scope.recordRepair.serialNum2) {
            Popup.loadMsg("请输入部件序列号");
            return;
          }
          // if (!$scope.recordRepair.wuliaohao2) {
          //   Popup.loadMsg("请选择物料");
          //   return;
          // }
          if (!$scope.recordRepair.provider2) {
            Popup.loadMsg("请输入供应商");
            return;
          }
          // if (!$scope.params.fixBeginDate2) {
          //   Popup.loadMsg("请输入质保开始日期");
          //   return;
          // }
          if (angular.isDate($scope.params.fixBeginDate2)) {
            $scope.recordRepair.fixBeginDate2 = $scope.params.fixBeginDate2.format("yyyy-MM-dd");
          }
          // if (!$scope.params.guaranteePeriod2) {
          //   Popup.loadMsg("请输入质保期");
          //   return;
          // }
          if ($scope.params.guaranteePeriod2) {
            $scope.recordRepair.guaranteePeriod2 = 2 * $scope.params.guaranteePeriod2;//后台需要存储0.5年的倍数
          }
        }
        //修改json信息
        OrderService.getDicDetailById($scope.recordRepair.fixType, function (res) {
          // console.log("getDicDetailById: " + JSON.stringify(res.rows[0], undefined, 2));
          $scope.recordRepair.fixTypeText = res.rows[0] ? res.rows[0].detailName :
            $scope.recordRepair.fixType == fixType.isChange ? '更换设备' : "维修设备";
          if (!$scope.recordRepair.workorderId) {//新建,没有id
            $scope.recordRepair.workorderId = $scope.work.apiWorkorderBaseInfoDto.workorderId;
          }
          $scope.recordRepair.createOn = new Date().format('yyyy-MM-dd hh:mm:ss');
          $scope.recordRepairList.unshift($scope.recordRepair);
          eamFaultWorkOrderFactory.saveFaultOrder($scope.work, function () {
            // Popup.loadMsg("保存成功", 800);
            Popup.delayRun(function () {
              $ionicHistory.goBack();
            }, "创建成功", 1200)
          });
        });
      };
      $scope.deleteRepairMaterialDto = function (index) {//新建的情况下增加的物料消耗直接删除
        $scope.recordRepair.repairMaterialDtoList.splice(index, 1);
        $ionicListDelegate.closeOptionButtons();
      };
    })
  //维修记录详情和编辑
  .controller('RecordRepairEditCtrl', function ($rootScope, WorkOrderApi, modifiedJson, eamFaultWorkOrderFactory, RepairRecordService, $ionicListDelegate, Store, $scope, $ionicScrollDelegate, $stateParams, $state, $ionicHistory, Params, Popup, OrderService) { //编辑维修记录
    $scope.recordRepair = {};
    //TODO 调试完页面后可以将||modifiedJson.getMockFaultOrder()删除
    $scope.work = $stateParams.work || modifiedJson.getMockFaultOrder();//整个工单对象
    $scope.title = "维修记录";
    var fixType = {//维修类型
      'isChange': 60,//更换设备
      'repair': 61// 维修设备
    };
    console.log($stateParams);
    //TODO 可以删除||"0"
    $scope.recordRepairIndex = $stateParams.recordRepairIndex || "0";
    console.log($scope.work);
    $scope.originalRecordRepair = $scope.work.repairRecordList.workorderFixInfoDtoList[+$stateParams.recordRepairIndex];
    console.log($scope.originalRecordRepair);
    angular.copy($scope.originalRecordRepair, $scope.recordRepair);//防止原对象被直接修改
    $scope.params = {
      fixBeginDate2: $scope.recordRepair && $scope.recordRepair.fixBeginDate2 ? new Date($scope.recordRepair.fixBeginDate2) : null,
      fixBeginDate1: $scope.recordRepair ? $scope.recordRepair.fixBeginDate1 : null,
      guaranteePeriod2: $scope.recordRepair ? $scope.recordRepair.guaranteePeriod2 / 2 : null,
      isChange: $scope.recordRepair.fixType == fixType.isChange
    };
    $scope.selectFanEquipment = function (work) {
      console.log(work);
      $state.go("tab.selectedEquipment", {
        data: work
      });
    };
    $scope.selectMateriel = function () {
      $state.go("tab.planMaterialSelect");
    };
    $scope.goToChangedEquipmentDetail = function () {
      $state.go('tab.changeEquipmentDetail', {
        data: {
          recordRepair: $scope.recordRepair,
          isCanEditDetail:$scope.isCanEditRepairDetail()&&!$scope.recordRepair.repairId//根据权限和是否是未同步到服务器的数据判断
        }
      });
    };
    // 当前工单状态 是处理中  41 且有权限 才能修改编辑
    $scope.isCanEditRepairDetail = function () {
      // console.log($scope.work.apiWorkorderBaseInfoDto.workorderStatus, "-", $rootScope.auth['auth_110103']);
      return ($scope.work.apiWorkorderBaseInfoDto.workorderStatus == $rootScope.faultStatus.FAULT_STATUS_PROCESSING) && $rootScope.auth['auth_110103'];
    };
    $scope.$on('$ionicView.beforeEnter', function () {
      $scope.equipmentDetail = Params.getTransferredObjByKey("selectedEquipment");
      $scope.selectedMaterial = Params.getTransferredObjByKey("selectedMaterial");
      if ($scope.equipmentDetail) {
        $scope.recordRepair.serialNum1 = $scope.equipmentDetail["seriesNo"] + "";
        $scope.recordRepair.deviceName = $scope.equipmentDetail["equipmentName"];
        $scope.recordRepair.deviceId = $scope.equipmentDetail["equipmentId"];
        $scope.recordRepair.provider1 = $scope.equipmentDetail["vendorShortname"];
        $scope.params.fixBeginDate1 = $scope.equipmentDetail["warrantySupplierBegindate"];
        $scope.recordRepair.originalMaterialSno = $scope.equipmentDetail["materialNo"];
        $scope.recordRepair.wuliaohao1 = $scope.equipmentDetail["materialId"];
        $scope.recordRepair.guaranteePeriod1 = $scope.equipmentDetail["guaranteePeriod"];
        Params.clearTransferredObjByKey('selectedEquipment');
      }
      if ($scope.selectedMaterial) {
        if ($scope.params.isChange) {
          $scope.recordRepair.wuliaohao2 = $scope.selectedMaterial["materialId"];
          $scope.recordRepair.updateMaterialSno = $scope.selectedMaterial["materialName"];
        }
        Params.clearTransferredObjByKey('selectedMaterial');
      }

    });
    /**
     * 改变维修类型
     */
    $scope.switchFixType = function () {
      $scope.recordRepair.fixType = $scope.params.isChange ? fixType.isChange : fixType.repair;
      console.log("维修类型:", $scope.recordRepair.fixType, $scope.recordRepair.fixType == 60 ? "更换" : '维修')
    };
    $scope.recordRepair.repairMaterialDtoList.map(function (item) {
      if(item['repairMaterialId']){//后台返回的数据，默认都是需要显示的
        item.activeFlag = 0;
      }
    });

    /**
     * 保存维修记录
     */
    $scope.save = function () {
      if (!$scope.params.isChange && $scope.recordRepair.deviceName == null || $scope.recordRepair.deviceName == "") {
        Popup.loadMsg("部件名称不能为空");
        return false;
      }
      if ($scope.params.isChange) {//如果是更换设备
        if (!StringUtils.isNotEmpty($scope.recordRepair.deviceName)) {
          Popup.loadMsg("部件名称不能为空");
          return;
        }
        if (!$scope.recordRepair.serialNum2) {
          Popup.loadMsg("请输入部件序列号");
          return;
        }
        // if (!$scope.recordRepair.wuliaohao2) {
        //   Popup.loadMsg("请选择物料");
        //   return;
        // }
        if (!$scope.recordRepair.provider2) {
          Popup.loadMsg("请输入供应商");
          return;
        }
        // if (!$scope.params.fixBeginDate2) {
        //   Popup.loadMsg("请输入质保开始日期");
        //   return;
        // }
        if (angular.isDate($scope.params.fixBeginDate2)) {
          $scope.recordRepair.fixBeginDate2 = $scope.params.fixBeginDate2.format("yyyy-MM-dd");
        }
        // if (!$scope.params.guaranteePeriod2) {
        //   Popup.loadMsg("请输入质保期");
        //   return;
        // }
        if ($scope.params.guaranteePeriod2) {
          $scope.recordRepair.guaranteePeriod2 = $scope.params.guaranteePeriod2 * 2;
        }
      }
      if (!$scope.recordRepair.fixType) {
        return Popup.loadMsg("请选择维修类型");
      }
      //修改json信息
      OrderService.getDicDetailById($scope.recordRepair.fixType, function (res) {
        $scope.recordRepair.fixTypeText = res.rows.item(0) ? res.rows.item(0)["detailName"] : $scope.params.isChange ? "更换设备" : "维修设备";//更换、维修
        if (!$scope.recordRepair.workorderId) {
          $scope.recordRepair.workorderId = $scope.work['apiWorkorderBaseInfoDto'].workorderId;
        }
        // $scope.work.repairRecordList.workorderFixInfoDtoList[$scope.recordRepairIndex]["repairMaterialDtoList"] = $scope.recordRepair.repairMaterialDtoList;
        $scope.work.repairRecordList.workorderFixInfoDtoList[$scope.recordRepairIndex] = $scope.recordRepair;
        console.log($scope.work);
        eamFaultWorkOrderFactory.saveFaultOrder($scope.work, function () {
          Popup.loadMsg("保存成功");
          // angular.copy($scope.work, $stateParams.work);
          // angular.copy($scope.recordRepairList, $stateParams.recordRepairList);
          $ionicHistory.goBack();
        });
      });

    };
    /**
     * 增加物料消耗
     */
    $scope.addConsume = function () {
      $state.go("tab.consumeMaterielAdd", {
          data:{
              selectMateriels: $scope.recordRepair.repairMaterialDtoList
          }
      });
    };
    /**
     * 删除消耗物料
     */
    $scope.delete = function (consume, index) {
      console.log(consume);
      if (!consume['repairMaterialId']) {//新建的消耗物料
        $scope.recordRepair.repairMaterialDtoList.splice(index, 1);//新建的消耗物料,物理删除
      } else {
        consume['activeFlag'] = 1;//已存在的消耗物料,逻辑删除
      }
      $ionicListDelegate.closeOptionButtons();
    $scope.work.repairRecordList.workorderFixInfoDtoList[$scope.recordRepairIndex] = $scope.recordRepair;
    eamFaultWorkOrderFactory.saveFaultOrder($scope.work, function () {
        Popup.loadMsg("删除物料成功",500);
    });
    }
  })
  //更换设备详情
  .controller('ChangeEquipmentDetailCtrl', function ($scope, Popup, $ionicHistory, $stateParams, $state, Params) {
    var mockData = {
      "workorderId": "101",
      "repairId": 100,
      "fixType": 60,
      "fixTypeText": "更换设备",
      "deviceId": 123611,
      "deviceName": "偏航制动器1",
      "serialNum1": "111",
      "serialNum2": "222",
      "wuliaohao1": "57890",
      "wuliaohao2": "48906",
      "provider1": "222",
      "provider2": "2223",
      "fixBeginDate1": "2017-02-25 00:00:00",
      "fixBeginDate2": null,
      "fixEndDate1": null,
      "fixEndDate2": null,
      "guaranteePeriod1": 0,
      "guaranteePeriod2": 0,
      "functionCode": "",
      "remark": "TEST1",
      "originalMaterialSno": "DFB00000290- 套装表棒 Test cable set for multi",
      "updateMaterialSno": "B1000151-  熔丝_NH-Si 00 125A gL/gG",
      "activeFlag": null,
      "createBy": null,
      "createOn": null,
      "repairMaterialDtoList": []
    };
    $scope.recordRepair = $stateParams.data ? $stateParams.data.recordRepair : mockData;
    $scope.params = {
      fixBeginDate2: $scope.recordRepair && $scope.recordRepair.fixBeginDate2 ? new Date($scope.recordRepair.fixBeginDate2) : null,
      // fixBeginDate1: $scope.recordRepair ? $scope.recordRepair.fixBeginDate1 : null,
      guaranteePeriod2: $scope.recordRepair ? $scope.recordRepair.guaranteePeriod2 / 2 : null
      // isChange: $scope.recordRepair.fixType == fixType.isChange
    };
    $scope.isCanEdit=function () {
      return $stateParams.data.isCanEditDetail;
    };
    $scope.selectMateriel = function () {
      if(!$scope.isCanEdit()){
        return;
      }
      $state.go("tab.planMaterialSelect");
    };
    $scope.$on('$ionicView.beforeEnter', function () {
      $scope.selectedMaterial = Params.getTransferredObjByKey('selectedMaterial');
      if ($scope.selectedMaterial) {
        $scope.recordRepair.wuliaohao2 = $scope.selectedMaterial["materialId"];
        $scope.recordRepair.updateMaterialSno = $scope.selectedMaterial["materialName"];
        Params.clearTransferredObjByKey('selectedMaterial');
      }
    });
    $scope.saveChangedInfo = function (recordRepair) {
      if(!$scope.recordRepair.serialNum2){
        return Popup.loadMsg("请输入序列号");
      }
      if(!$scope.recordRepair.provider2){
        return Popup.loadMsg("供应商");
      }
      // if (!$scope.recordRepair.wuliaohao2) {
      //   Popup.loadMsg("请选择物料");
      //   return;
      // }
      // if(!$scope.params.fixBeginDate2){
      //   return Popup.loadMsg("质保开始日期");
      // }
      if (angular.isDate($scope.params.fixBeginDate2)) {
        $scope.recordRepair.fixBeginDate2 = $scope.params.fixBeginDate2.format("yyyy-MM-dd");
      }
      // if (!$scope.params.guaranteePeriod2) {
      //   Popup.loadMsg("请输入质保期");
      //   return;
      // }
      if ($scope.params.guaranteePeriod2) {
        $scope.recordRepair.guaranteePeriod2 = $scope.params.guaranteePeriod2 * 2;//后台该字段是个整数
      }
      $ionicHistory.goBack();
    }
  })
  .controller('DeviceSelectCtrl', function ($scope, $stateParams, $state, $ionicScrollDelegate, DeviceTreeApi, Store, Popup) { //设备选择

    var deviceInfo = Store.getWorkOrderInfo($stateParams.taskId);
    $scope.nodeList = [];

    $scope.showNodeDevices = function (params) {
      var options = {};
      for (var i = 0; i < $scope.nodeList.length; i++) {
        $scope.nodeList[i].action = "";
      }
      params.action = "action";
      $scope.nodeList.push(params);
      options.deviceId = params.deviceId;
      options.machineId = params.machineId;
      //让滚到最底部
      $ionicScrollDelegate.scrollBottom();
      $scope.deviceList = [];
      Popup.waitLoad();
      DeviceTreeApi.getChildrenDevices(function (resp) {
        if (resp.success) {
          $scope.deviceList = resp.data;
        }
      }, options);
    };

    $scope.showNodeDevices({
      "deviceId": "0",
      "deviceName": "风机" + deviceInfo.machineNo,
      "action": "action",
      "machineId": deviceInfo.machineId
    });

    $scope.selectNode = function (node) {
      for (var i = 0; i < $scope.nodeList.length; i++) {
        if ($scope.nodeList[i].deviceId == node.deviceId) {
          $scope.nodeList.splice(i, $scope.nodeList.length - i);
          $scope.showNodeDevices(node);
          break;
        }
      }
    };

    $scope.deviceDetail = function (device) {
      $state.go("tab.deviceDetail", {
        "device": window.JSON.stringify(device)
      });
    }
  })
  //故障信息，风云系统返回的信息
  .controller('SCADACurrentFaultList', function ($scope, $stateParams, modifiedJson, $state, $timeout) { //故障信息
    $scope.work = $stateParams.data;
    // $scope.faultListALL = (JSON.parse($scope.work.json)).workorderDetails.eaWoFaultInfoDtoList;
    $scope.pageNumber = 1;
    $scope.faultList = $scope.work ? $scope.work.workorderDetails.eaWoFaultInfoDtoList : modifiedJson.getMockFaultInfoDtoList();
    $scope.goToFaultAdviceDetail = function (obj, field, title) {
      $state.go('tab.faultAdviceDetail', {
        data: {
          obj: obj,
          field: field,
          title: obj.fault_comment || "故障建议详情"
        }
      });
    }
    /*   $scope.loadMore = function () {
     var resp = OrderService.getListFormAllList($scope.faultListALL, $scope.pageNumber);
     $scope.faultList = $scope.faultList.concat(resp);
     if (resp.length == 0) {
     $scope.noMoreData = true;
     } else {
     $scope.pageNumber++;
     $timeout(function () {
     $scope.noMoreData = false;
     $scope.$broadcast(SCROLL_INFINITE_COMPLETE);
     }, INFINITE_TIME);
     }
     };
     $scope.loadMore();*/
  })
  //故障建议详细信息
  .controller("SCADAFaultAdviceDetailCtrl", ["$scope", '$stateParams', '$ionicHistory', '$state',
    function ($scope, $stateParams, $ionicHistory, $state) {
      $scope.faultAdviceDetail = $stateParams.data.obj[$stateParams.data.field];
      $scope.title = $stateParams.data.title;
    }])
  .controller('DeviceDetailCtrl', function ($scope, $stateParams, $ionicHistory, Params) { //设备详情
    $scope.device = window.JSON.parse($stateParams.device);
    $scope.viewId = $stateParams.viewId;
    console.log($scope.viewId);
    $scope.selectDevice = function (device) {
      Params.setSelectDevice(device);
      $ionicHistory.goBack(-2);
    }
  })
  //人工工单创建
  .controller('FaultOrderCreateCtrl', function ($scope, eamFile, starterClassFactory, eamFaultWorkOrderFactory, SCADAOrderDetail, $injector, Popup, $stateParams, Params, Storage, WorkOrderApi, $ionicHistory, eamDB, $state, OrderService) { //故障工单创建
    $scope.faultOrder = eamFaultWorkOrderFactory.creatingFaultOrder();//新建
    // console.log($scope.faultOrder);
    OrderService.getDicListByType("workorder_faults", function (res) {
      $scope.faultCauses = res;
      if (!$scope.isCreate) {//修改
        for (var i = 0; i < res.length; i++) {//显示所显示的故障原因
          var f = res[i];
          if (f['detailId'] == $scope.order.faultReason) {
            $scope.order.faultCause = f;
            break;
          }
        }
      }
    });
    $scope.selectedProject = Storage.getSelectedProject();//用户选择的项目
    // $scope.projectList = Storage.getProjects();
    $scope.projSpecialWbsList = [];
    $scope.title = "创建";
    $scope.isCreate = true;
    $scope.fileList = $scope.faultOrder.workorderDetails.eaWoFilemappingList || [];//附件列表
    $scope.machines = [];
    $scope.params = {
      ncrTrigger: false,
      machine: {position_id: null},
      faultBeginTime: null,
      faultEndTime: null,
      faultCause: null
    };
    $scope.gotoEditContent = function (title, editObj, editField) {
      $state.go('tab.editBlockText', {
        data: {
          title: title,
          editObj: editObj,
          editField: editField
        }
      });
    };
    // if ($stateParams.data && $stateParams.data.faultOrderDetailInfo) {//修改
    //   console.log($stateParams.data.faultOrderDetailInfo);
    //   $scope.title = "修改";
    //   $scope.isCreate = false;
    //   angular.copy($stateParams.data.faultOrderDetailInfo, $scope.order);
    //   console.log($scope.order);
    //   $scope.isFirstChanged = true;
    //   $scope.fileList = $stateParams.data.fileList;
    //   // for (var i in $scope.fileList) {
    //   //   OrderService.downloadImg($scope.fileList[i]);
    //   // }
    //   //项目信息
    //   if ($scope.projectList) {
    //     for (var i = 0; i < $scope.projectList.length; i++) {
    //       if ($scope.selectedProjectId == $scope.projectList[i].projectId) {
    //         $scope.selectedProject = $scope.projectList[i];
    //         break;
    //       }
    //     }
    //   }
    //   $scope.params.faultBeginTime = $scope.order["faultBegindate"] ? new Date($scope.order["faultBegindate"]) : $scope.order["faultBegindate"];
    //   $scope.params.faultEndTime = $scope.order["faultEnddate"] ? new Date($scope.order["faultEnddate"]) : $scope.order["faultEnddate"];
    //   $scope.params.ncrTrigger = $scope.order.ncrTrigger == 1;
    //   // console.log($scope.params);
    // }

    Popup.waitLoad();
    $scope.$on("$ionicView.beforeEnter",function () {
      OrderService.queryMachinesByProjectId($scope.selectedProject.projectId, function (machines) {//数据库中查找该项目下的风机
        Popup.hideLoading();
        $scope.machines = machines.sort(function (m1,m2) {
          // console.log(m1,m2);
          return +m1.position_code-m2.position_code;//小到大排序
        });
        // console.log($scope.machines);
        if (machines.length === 0) {
          Popup.loadMsg("暂无风机可选,请到风机设备界面下拉刷新同步风机设备", 2000);
        }
      });
      angular.forEach($scope.selectedProject['projSpecialWbsDtoList'], function (value, key) {//初始化项目下的webs下拉列表
        if (value['typeId'] == 1) {
          this.push(value);
        }
      }, $scope.projSpecialWbsList);
    });
    // $scope.$watch(function () {
    //   return $scope.selectedProject;
    // }, function () {
    //   if ($scope.selectedProject && $scope.selectedProject.projectId) {
    //     OrderService.queryMachinesByProjectId($scope.selectedProject.projectId, function (machines) {
    //       $scope.machines = machines;
    //       // console.log($scope.machines);
    //       if (machines.length == 0) {
    //         Popup.loadMsg("该项目没有风机可选", 800);
    //       } else {
    //         angular.forEach($scope.machines, function (value, key) {
    //           if ($stateParams.data && $stateParams.data.faultOrderDetailInfo && $stateParams.data.faultOrderDetailInfo['positionCode'] == value['position_code']) {
    //             $scope.params.machine = this[key];
    //           }
    //         }, $scope.machines);
    //       }
    //     });
    //     $scope.projSpecialWbsList = [];
    //     angular.forEach($scope.selectedProject['projSpecialWbsDtoList'], function (value, key) {
    //       if (value['typeId'] == 1) {
    //         this.push(value);
    //       }
    //     }, $scope.projSpecialWbsList);
    //   }
    // });
    $scope.$watch(function () {
      return $scope.params["machine"] /*? $scope.params["machine"] : null*/;
    }, function (newVal, oldVal) {
      // if (!$scope.isCreate) {//修改
      //   console.log($scope.params["machine"]);
      //   if ($scope.params["machine"]) {
      //     $scope.order.positionCode = $scope.params["machine"]["position_code"];//风机号
      //     $scope.order.positionId = +$scope.params["machine"]["position_id"];//后台用于关联风机的id
      //   }
      // }
      if (newVal) {
        console.log(newVal);
        $scope.faultOrder['apiWorkorderBaseInfoDto']['positionCode'] = $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.positionCode = newVal["position_code"];//风机号
        $scope.faultOrder['apiWorkorderBaseInfoDto']['positionId'] = $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.positionId = +newVal["position_id"];//后台用于关联风机的id
        $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.deviceName = null;//选择某部风机后,设备名称置空
      }
      // console.log($scope.params["machine"]);
    });
      $scope.$on("$ionicView.beforeEnter", function () {
      $scope.equipmentDetail = Params.getTransferredObjByKey("selectedEquipment");
      if ($scope.equipmentDetail) {
        $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.deviceId = $scope.equipmentDetail["equipmentId"];
        $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.deviceName = $scope.equipmentDetail["equipmentName"];//设备名称
        Params.clearTransferredObjByKey("selectedEquipment");
      }
    });
    $scope.selectFanEquipment = function () {
      if (!$scope.params["machine"]["position_id"]) {
        Popup.loadMsg("请先选择机位号");
        return;
      }
      // $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.positionId = $scope.params["machine"]["position_id"];
      // $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.positionCode = $scope.params["machine"]["position_code"];
      $scope.faultOrder.apiWorkorderBaseInfoDto.projectId = $scope.selectedProject.projectId;
      $state.go("tab.selectedEquipment", {
        data: $scope.faultOrder
      });
    };
    $scope.calculateStopTime = function () { //计算累计停机时间,<.5是0.5,>0.5&&<1是1
      if (!$scope.params.faultEndTime || !$scope.params.faultBeginTime) {
        return;
      }
      $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.shutdownTotalHour = Utils.calculateTime($scope.params.faultBeginTime.getTime(), $scope.params.faultEndTime.getTime());
    };
    $scope.$watch(function () {
      return $scope.params.faultEndTime;
    }, function () {
      if (!$scope.params.faultEndTime || $scope.params.faultEndTime < $scope.params.faultBeginTime) {
        $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.shutdownTotalHour = 0;
      } else if (!$scope.params.faultBeginTime) {
        Popup.delayRun(function () {
        }, "请输入故障激活时间");
      } else {
        $scope.calculateStopTime($scope.params.faultBeginTime.getTime(), $scope.params.faultBeginTime.getTime());
      }
    });
    $scope.$watch('params.faultBeginTime', function (newVal, oldVal) {
      if ($scope.params.faultBeginTime && !angular.equals(oldVal, newVal)) {
        var date = new Date();
        if (!(date.getFullYear() == $scope.params.faultBeginTime.getFullYear() && date.getMonth() == $scope.params.faultBeginTime.getMonth())) {
          Popup.delayRun(function () {
          }, '请输入当前月的日期', 1000);
        }
      }
    });
    /**
     * 删除图片附件
     * @param index
     * @param attachment
     */
    $scope.removeAttachment = function (index, attachment) {
      eamFile.removeAttachedFile(attachment)
        .then(function () {
          $scope.fileList.splice(index, 1);
        }, function (error) {
          Popup.promptMsg(JSON.stringify(error, undefined, 2), "附件删除失败!");
        });
    };
    //新增 编辑图片
    $scope.addAttachment = function (task) {
      var fileItem = starterClassFactory.attachedFileInstance();
      var date = new Date().format('yyyy-MM-dd');
      fileItem.workorderId = task.workorderId;
      fileItem.fileActualName = "GZIMG_" + date + "_" + (task.workorderCode || "");
      fileItem.fileOriginalName = "GZIMG_" + date + "_" + (task.workorderCode || "");
      fileItem.source = AttachedFileSources.workorder_detail_source;
      eamFile.getPicture(fileItem).then(
        function (item) {
          if (item && angular.isObject(item)) {
            $scope.fileList.push(item);
          }
        }, function (err) {
          Popup.loadMsg(JSON.stringify(err, undefined, 2));
        });
    };  //end addAttachment();
    $scope.save = function (order) {
      if (!order.positionCode) {//机位号
        return Popup.delayRun(function () {
        }, "机位号必填");
      }
      if (!order.deviceName || order.deviceName == "undefined") {//用户没做任何改变就保存会出现后一种情况
        Popup.delayRun(null, "部件名称必填");
        return;
      }
      if (!order.faultCode) {
        return Popup.delayRun(function () {
        }, "故障代码必填");
      }
      if (!order.faultName) {
        return Popup.delayRun(function () {
        }, "故障名称必填");
      }
      if (!$scope.params.ncrTrigger) {
        order.ncrNum = "";
      }
      if ($scope.params.ncrTrigger) {
        if (!order.ncrNum) {
          order.ncrNum = "";
        }
        order.ncrTrigger = "1";
      } else {
        order.ncrTrigger = "0";
      }
      $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.projectId = $scope.selectedProject.projectId;
      $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.projectName = $scope.selectedProject.projectName;
      if (!$scope.params.faultBeginTime) {
        Popup.delayRun(function () {
        }, "故障激活时间必填");
        return;
      }
      var faultBeginTime = $scope.params.faultBeginTime.getTime();
      if ($scope.params.faultEndTime) {
        var faultEndTime = $scope.params.faultEndTime.getTime();
        if (faultEndTime < faultBeginTime) {
          Popup.delayRun(function () {
          }, "故障解决时间必须在故障激活时间之后");
          return;
        }
        order.faultEnddate = $scope.params.faultEndTime.getTime();
      }
      var date = new Date();
      if (!(date.getFullYear() == $scope.params.faultBeginTime.getFullYear() && date.getMonth() == $scope.params.faultBeginTime.getMonth())) {
        Popup.delayRun(function () {
        }, '请输入当前月的日期', 1000);
        return;
      }
      order.faultBegindate = $scope.params.faultBeginTime.getTime();
      if (!$scope.params.faultCause) {
        return Popup.delayRun(function () {
        }, "故障原因必填");
      }
      $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.faultReason = $scope.params.faultCause.detailId;
      $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.faultReasonName = $scope.params.faultCause.detailName;
      if (!order.workorderTitle) {
        return Popup.delayRun(function () {
        }, "工单主题必填");
      }
      if (!order.faultDetailComment) {
        return Popup.delayRun(function () {
        }, "现象描述必填");
      }
      if (!order.faultHandleDesc) {
        return Popup.delayRun(function () {
        }, "过程描述必填");
      }
      order.shutdownTotalHour = Utils.calculateTime(order.faultBegindate, order.faultEnddate);
      $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.areaType = $scope.selectedProject.areaCode;
      $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.areaTypeName = $scope.selectedProject.areaCodeName;
      $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.siteManager = $scope.selectedProject.siteManager;
      var temId = new Date().getTime().toString();//临时故障工单id
      $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.workorderId = -temId.substr(temId.length - 8, 8);//负数代表新建
      $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.workorderCode = "TempGZCode" + $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.workorderId;//负数代表新建
      $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.createOn = new Date().getTime();
      $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.createBy = Storage.getProfile() ? Storage.getProfile()["id"] : null;
      $scope.faultOrder.workorderDetails.eaWoFilemappingList = $scope.fileList;//附件
      console.log("$scope.faultOrder: ", $scope.faultOrder);
      eamFaultWorkOrderFactory.saveFaultOrder($scope.faultOrder, function (savedOrder) {
        Popup.loadMsg("创建成功", 500);
        if ($scope.isCreate && $stateParams.data && $stateParams.data.workList && $.isArray($stateParams.data.workList)) {
          $stateParams.data.workList.unshift(savedOrder['apiWorkorderBaseInfoDto']);
        }
        Popup.delayRun(function () {
          $ionicHistory.goBack();
        }, "", 800);
      });

    }
  })
  /**
   * 查看故障工单详情及修改内容
   */
  .controller('FaultOrderDetailShowNModifyCtrl', function ($scope, $rootScope, eamFile, $stateParams, $state, Params, modifiedJson, Popup, $ionicHistory, starterClassFactory, eamFaultWorkOrderFactory, Storage, OrderService) {
    $scope.selectedProject = Storage.getSelectedProject();//当前用户选择的项目
    $scope.faultOrder = angular.copy($stateParams.data ?
      $stateParams.data.faultOrder :
      modifiedJson.getMockFaultOrder());//用户不保存也不会修改原对象,达到只有点击保存才应用修改和保存修改到数据库,其中的modifiedJson.getMockFaultOrder()是用来调整界面用的
    console.log($scope.faultOrder);
    $scope.isCanModifyMachineNum=!$scope.faultOrder.apiWorkorderBaseInfoDto.positionId;//是否能继续修改风机号，风云工单返回的工单，或许没有机位号
    $scope.machines = [];
    $scope.params={};
    if($scope.isCanModifyMachineNum){//需要选择机位号
      Popup.waitLoad('');
      OrderService.queryMachinesByProjectId($scope.selectedProject.projectId, function (machines) {//数据库中查找该项目下的风机
        Popup.hideLoading();
        $scope.machines = machines.sort(function (machine1,machine2) {
          return +machine1.position_code-machine2.position_code;//从小到大
        });
        // console.log($scope.machines);
        if (machines.length === 0) {
          Popup.loadMsg("暂无风机可选,请到风机设备界面下拉刷新同步风机设备", 2000);
        }
      });
    }
    $scope.$watch(function () {
      return $scope.params["machine"] /*? $scope.params["machine"] : null*/;
    }, function (newVal, oldVal) {
      if (newVal) {
        console.log(newVal);
        $scope.faultOrder['apiWorkorderBaseInfoDto']['positionCode'] = $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.positionCode = newVal["position_code"];//风机号
        $scope.faultOrder['apiWorkorderBaseInfoDto']['positionId'] = $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.positionId = +newVal["position_id"];//后台用于关联风机的id
        $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.deviceName = null;//选择某部风机后,设备名称置空
      }
      // console.log($scope.params["machine"]);
    });
    $scope.projSpecialWbsList = $scope.selectedProject.projSpecialWbsDtoList;

    $scope.faultOrder.workorderDetails.eaWoFilemappingList = $scope.faultOrder.workorderDetails.eaWoFilemappingList ?
      $scope.faultOrder.workorderDetails.eaWoFilemappingList : [];
    $scope.fileList = $scope.faultOrder.workorderDetails.eaWoFilemappingList;
    /**
     * 初始化本地附件,打开详情能看到上次添加的附件
     */
    function initAttachments() {
      Popup.waitLoad();
      Popup.delayRun(function () {
        Popup.hideLoading();
      }, '', 500);
      eamFile.retrieveInfoOrInsertFileRecord($scope.faultOrder)
        .then(function () {
          Popup.hideLoading();
        }, function (err) {
          Popup.hideLoading();
        })
    }

    initAttachments();

    //故障代码查看风云系统的信息
    $scope.gotoSCADAFaultCodeInfo = function () {
      $state.go("tab.currentFaultList", {
        data: $scope.faultOrder
      });
    };
    $scope.addAttachment = function (faultOrder) {
      if (!$scope.isCanModify()) {//没有修改权限
        return;
      }
      var date = new Date().format("yyyy-MM-dd");
      var fileItem = {};
      fileItem.workorderId = faultOrder.workorderId;
      fileItem.fileActualName = "GZIMG_" + date + "_" + (faultOrder.workorderCode || "");
      fileItem.fileOriginalName = "GZIMG_" + date + "_" + (faultOrder.workorderCode || "");
      fileItem.source = AttachedFileSources.workorder_detail_source;
      eamFile.getPicture(fileItem).then(
        function (item) {
          if (item && angular.isObject(item)) {
            $scope.fileList.push(item);
          }
        }, function (err) {
          Popup.loadMsg(JSON.stringify(err, undefined, 2));
        });
    };  //end addAttachment();
    /**
     * 删除图片附件
     * @param index
     * @param attachment
     */
    $scope.removeAttachment = function (index, attachment) {
      if (!$scope.isCanModify()) {
        return;
      }
      eamFile.removeAttachedFile(attachment)
        .then(function () {
          $scope.fileList.splice(index, 1);
        }, function (error) {
          Popup.promptMsg(JSON.stringify(error, undefined, 2), "附件删除失败!");
        });
    };
    $scope.browserImages = function (attachment, index, fileList) {
      eamFile.openEamAttachedFile(attachment);
    };
    $scope.selectFanEquipment = function () {
      if (!$scope.isCanModify()) {
        return;//没有编辑权限
      }
      $state.go("tab.selectedEquipment", {
        data: $scope.faultOrder
      });
    };
    $scope.isCanModify = function () {//处理中方能修改
      return $scope.faultOrder.apiWorkorderBaseInfoDto.workorderStatus == 41 && $rootScope.auth['auth_110103'];//处理中
        //编辑修改的权限 ;
    };
    // $scope.faultOrder.apiWorkorderBaseInfoDto.workorderType == 37才是 scada工单
    $scope.isScadaOrder = function (workOrderType) {
      return workOrderType == "37";
    };

    $scope.$on('$ionicView.beforeEnter', function () {
      $scope.equipmentDetail = Params.getTransferredObjByKey("selectedEquipment");
      $scope.selectedMaterial = Params.getTransferredObjByKey("selectedMaterial");
      if ($scope.equipmentDetail) {
        $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.deviceName = $scope.equipmentDetail["equipmentName"];
        $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.deviceId = $scope.equipmentDetail["equipmentId"];
        // $scope.faultOrder.apiWorkorderBaseInfoDto.deviceName = $scope.equipmentDetail["equipmentName"];
        console.log($scope.equipmentDetail);
        Params.clearTransferredObjByKey('selectedEquipment');
      }
      if ($scope.selectedMaterial) {

      }

    });
    $scope.gotoEditContent = function (title, editObj, editField) {
      if (!$scope.isCanModify()) {
        return;
      }
      $state.go('tab.editBlockText', {
        data: {
          title: title,
          editObj: editObj,
          editField: editField
        }
      });
    };
    OrderService.getDicListByType("workorder_faults", function (res) {
      $scope.faultCauses = res;
      for (var i = 0; i < res.length; i++) {//显示所显示的故障原因
        var f = res[i];
        if (f['detailId'] == $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.faultReason) {
          $scope.params.faultCause = f;
          break;
        }
      }
    });
    $scope.params = {
      ncrTrigger: $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.ncrTrigger == 1,//触发ncr
      faultCause: null,
      faultBeginTime: new Date($scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.faultBegindate),
      faultEndTime: $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.faultEnddate ?
        new Date($scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.faultEnddate) : null
    };
    $scope.$watch('params.faultCause', function (newVal, oldVal) {
      if (newVal && !angular.equals(newVal, oldVal)) {
        // console.log(newVal);
        $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.faultReason = newVal['detailId'];
        $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.faultReasonName = newVal['detailName'];
      }
    });
    $scope.calculateStopTime = function () {
      if (!$scope.params.faultEndTime)return;
      // console.log('calculateStopTime');
      $scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.shutdownTotalHour = Utils.calculateTime($scope.params.faultBeginTime.getTime(), $scope.params.faultEndTime.getTime());
      // console.log('calculateStopTime',$scope.faultOrder.workorderDetails.eaWoWorkorderinfoDto.shutdownTotalHour);
    };
    $scope.$watch('params.faultEndTime', function (newVal, oldVal) {
      if (newVal && newVal.getTime() < $scope.params.faultBeginTime.getTime()) {
        return Popup.loadMsg("故障解决时间不应早于激活时间!");
      }
    });

    $scope.isCanEditImg = function () {
      return $scope.isCanModify();
    };
    $scope.saveModifiedFaultOrder = function (faultOrder) {
      if (!$scope.isCanModify()) {
        return;//没有编辑权限
      }
      if ($scope.params.faultEndTime) {
        if ($scope.params.faultEndTime.getTime() < $scope.params.faultBeginTime.getTime()) {
          return Popup.loadMsg("故障解决时间不应早于激活时间!");
        }
        $scope.calculateStopTime();
        faultOrder.workorderDetails.eaWoWorkorderinfoDto.faultEnddate = $scope.params.faultEndTime.getTime();//如果用户输入了故障解决时间
      }
      if (!$scope.params.ncrTrigger) {//不触发ncr
        faultOrder.workorderDetails.eaWoWorkorderinfoDto.ncrNum = "";//ncrnum 不填
      }
      if (!$scope.params.faultCause) {
        return Popup.delayRun(function () {
        }, "故障原因必填");
      }
      if (!StringUtils.isNotEmpty(faultOrder.workorderDetails.eaWoWorkorderinfoDto.workorderTitle)) {
        return Popup.delayRun(function () {
        }, "工单主题必填");
      }
      if (!StringUtils.isNotEmpty(faultOrder.workorderDetails.eaWoWorkorderinfoDto.faultDetailComment)) {
        return Popup.delayRun(function () {
        }, "现象描述必填");
      }
      if (!StringUtils.isNotEmpty(faultOrder.workorderDetails.eaWoWorkorderinfoDto.faultHandleDesc)) {
        return Popup.delayRun(function () {
        }, "过程描述必填");
      }
      if ($scope.params.ncrTrigger) {//触发ncr
        if (!faultOrder.workorderDetails.eaWoWorkorderinfoDto.ncrNum) {//可选填ncrnum
          faultOrder.workorderDetails.eaWoWorkorderinfoDto.ncrNum = "";
        }
        faultOrder.workorderDetails.eaWoWorkorderinfoDto.ncrTrigger = "1";//触发ncr
      } else {
        faultOrder.workorderDetails.eaWoWorkorderinfoDto.ncrTrigger = "0";//不触发ncr
      }
      $scope.faultOrder.workorderDetails.eaWoFilemappingList = $scope.fileList;
      eamFaultWorkOrderFactory.saveFaultOrder(faultOrder, function (savedFaultOrder) {
        delete savedFaultOrder['apiWorkorderBaseInfoDto'].json;
        // console.log("保存后的工单对象", savedFaultOrder);
        angular.copy(savedFaultOrder, $stateParams.data.faultOrder);//将修改覆盖原对象,这样能达到返回到上一个界面看到修改过后的信息
        $ionicHistory.goBack();
      })
    }
  })
  .controller('ConsumeMaterielAddCtrl', function ($scope, starterClassFactory, $stateParams, WorkOrderApi, Storage, $timeout, $ionicModal, Popup, Params, $state, $ionicHistory, OrderService) {
    //  新增物料消耗，故障工单 和 技改工单 共用控制器
    $scope.selectMateriels = $stateParams.data.selectMateriels;
    // if(!$scope.selectMateriels || $scope.selectMateriels.length == 0){
    //     $scope.selectMateriels = [];
    // }
    $scope.pageNumber = 1;
    $scope.params = {
      materielNo: null,
      name: null,
      pageNumber: 1
    };
    $scope.materielList = [];
    $scope.isMoreData = true;
    $scope.loadMore = function () {
      Popup.waitLoad();
      OrderService.getMaterialList(function (resp) {
        Popup.hideLoading();
        $scope.$broadcast(SCROLL_INFINITE_COMPLETE);
        var data = OrderService.ChangeSQLResult2Array(resp);
        if (data.length > 0) {
          for (var j = 0; j < data.length; j++) {
            data[j]['sapInventoryFlag'] = true;//用于在创建时候,默认显示是账内库存
          }
          $scope.materielList = $scope.materielList.concat(data);
          $scope.isMoreData = true;
          $scope.params.pageNumber++;
        } else {
          $scope.isMoreData = false;
        }
      }, $scope.params);
      //$scope.$broadcast(SCROLL_REFRESH_COMPLETE);
    };
    $scope.doRefresh = function () {
      $scope.params = {
        materielNo: null,
        name: null,
        pageNumber: 1
      };
      $scope.loadMore();
      $scope.$broadcast('scroll.refreshComplete');
    };
    //筛选物料模板定义
    $ionicModal.fromTemplateUrl("views/workorder/materialQuery.html", {
      scope: $scope,
      animation: "slide-in-up"
    })
      .then(function (modal) {
        $scope.filterModal = modal;
        $scope.filterModal.show();
        // $scope.query();
      });
    /**
     * 打开筛选界面
     */
    $scope.openQuery = function () {
      $scope.filterModal.show();
    };
    /**
     * 关闭筛选界面
     */
    $scope.closeQuery = function () {
      $scope.filterModal.hide();
    };
    /**
     * 查询物料
     */
    $scope.query = function () {
      $scope.materielList = [];
      $scope.params.pageNumber = 1;
      $scope.loadMore();
      $scope.filterModal.hide();
    };
    /**
     * 保存所选的消耗物料
     *
     */
    $scope.save = function () {
      for (var i = 0; i < $scope.materielList.length; i++) {
        if ($scope.materielList[i].amount != null && $scope.materielList[i].amount != "") {
          if ($scope.materielList[i].amount < 0) {
            Popup.loadMsg("数量不能是负数");
            return;
          }
          var sapInventoryFlag = 0;
          if ($scope.materielList[i]['sapInventoryFlag']) {//是账内库存
            sapInventoryFlag = 0;
          } else {
            sapInventoryFlag = 1;//否
          }
          var repairMaterial = {
            "amount": $scope.materielList[i].amount,
            "materialSno": $scope.materielList[i].materialSno,
            "materialId": $scope.materielList[i].materialId,
            "unitDes": $scope.materielList[i].unit,
            "materialName": $scope.materielList[i]['materialName'],
            "createBy": Storage.getProfile() ? Storage.getProfile()["id"] : null,
            "activeFlag": 0,//新建的用料是有效的
            "createOn": new Date().format("yyyy-MM-dd hh:mm:ss"),
            "sapInventoryFlag": sapInventoryFlag
          };
          $scope.selectMateriels.push(repairMaterial);
        }
      }
      $ionicHistory.goBack();
    };
    $scope.isAccount = function (e) {
      // console.log("event",e);
      e.stopPropagation();
      return false;
    };
    /**
     * 查看物料详情
     */
    $scope.materialDetail = function (materialDetail) {
      $state.go("tab.materialDetail", {
        data: {
          title: '物料详情',
          materialDetail: angular.fromJson(materialDetail.json)
        }
      });
    }
  })
  .controller('MaterialDetailCtrl', function ($scope, $stateParams, $ionicHistory, eamFile) {
    // console.log($stateParams);
    $scope.title = $stateParams.data.title;
    $scope.materialDetail = $stateParams.data.materialDetail;
    // console.debug("$scope.materialDetail: ", $scope.materialDetail);
    $scope.imgFiles = $scope.materialDetail.materialPicList;
    $scope.downloadImage = function () {
      eamFile.openEamAttachedFile();
    };
    $scope.goBack = function () {
      $ionicHistory.goBack();
    }
  })
  .controller('FaultWorkOrderPauseListCtrl', function ($scope, $stateParams, $state, $ionicHistory) {
    // angular.fromJson($stateParams.data.detailFaultOrder)
    console.log("pauseList", $stateParams.data);

    $scope.PauseList = $stateParams.data || [];
    console.log("pauseList", $scope.PauseList);

  })
  .controller('FaultWorkOrderVerifyListCtrl', function ($scope, $stateParams, $state, $ionicHistory) {

    $scope.verifyList = $stateParams.data || [];
    console.log("verifyList ", $scope.verifyList);
  })

  // 审核
  .controller('VerifyOrder', function ($scope, $stateParams, $state, eamFaultWorkOrderFactory, eamMTInstallWorkOrderFactory, Popup, Storage, $ionicHistory) {
    console.log("VerifyOrder,$stateParams: ", $stateParams);
    $scope.verifyData = $stateParams.data;
    $scope.detailFaultOrder = $scope.verifyData.detailFaultOrder;
    $scope.baseFaultOrder = $scope.verifyData.baseFaultOrder;
    $scope.workOrderCode = $scope.verifyData.workOrderCode;

    $scope.workorderType = $stateParams.data.workOrderType;
    var auditingResult = null;

    $scope.verifyInfo = {
      verifyFlag: true,
      verifyReason: "",
      verifyResult: "通过"
    };
    // $scope.verifyFlag = true;
    // $scope.verifyReason = "";
    var tempVerifyList = $scope.verifyData.detailFaultOrder.workorderDetails.eaWoWorkorderAuditingDtoList || [];

    $scope.changeToggle = function () {
      // $scope.verifyInfo.verifyFlag = !$scope.verifyInfo.verifyFlag;
      if ($scope.verifyInfo.verifyFlag) {
        $scope.verifyInfo.verifyResult = "通过";
        $scope.verifyInfo.verifyFlag = true;
      } else {
        $scope.verifyInfo.verifyResult = "不通过";
        $scope.verifyInfo.verifyFlag = false;
      }
    };
    $scope.verifyConfirmClick = function () {
      console.log($scope.verifyInfo.verifyFlag, "  ", $scope.verifyInfo.verifyReason, " ", $scope.verifyInfo.verifyResult);
      if ($scope.verifyInfo.verifyReason == "") {
        Popup.loadMsg("请输入审核说明", 700);
        return;
      }
      var msg = "您确定要【" + $scope.verifyInfo.verifyResult + "】么？";
      Popup.confirm(msg, function () {
        var nowDate = new Date();

        if ($scope.verifyInfo.verifyFlag) {
          var verifyItem = {
            activeFlag: 0,//有效标志
            auditingDate: nowDate.format("yyyy-MM-dd hh:mm"),
            auditingId: null,
            auditingOpinion: $scope.verifyInfo.verifyReason,
            auditingResult: 91,
            auditingUser: Storage.getProfile()['id'],
            auditiogResultName: "通过",
            workorderId: $scope.workOrderCode
          };
          //42 审核通过 工单关闭

          if ($scope.workorderType == 38 || $scope.workorderType == 37) {
            var auditingResult = 42; //故障工单审核通过 状态为 已关闭  代码 42
            console.log($scope.verifyData);
            $scope.verifyData.detailFaultOrder.workorderDetails.eaWoWorkorderAuditingDtoList.unshift(verifyItem);
            // $scope.baseFaultOrder.
            // $scope.verifyData.detailFaultOrder.workorderDetails.
            $scope.baseFaultOrder.workorderStatus = 42;
            $scope.baseFaultOrder.workorderStatusName = "工单关闭";
            eamFaultWorkOrderFactory.changeWorkOrderStatus(auditingResult, $scope.detailFaultOrder, function (savedOrder) {
              angular.copy(savedOrder, $scope.detailFaultOrder);
              savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
              angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.baseFaultOrder);//目的是同步改变故障工单列表的信息
              $ionicHistory.goBack();
            });
          } else {
            var auditingResult = 143; //三工单 审核通过 状态为 确认完工 代码 143
            $scope.verifyData.detailFaultOrder.workorderDetails.eaWoWorkorderAuditingDtoList.unshift(verifyItem);
            $scope.baseFaultOrder.workorderStatus = 143;
            $scope.baseFaultOrder.workorderStatusName = "确认完工";
            eamMTInstallWorkOrderFactory.changeWorkOrderStatusThreeOrder(auditingResult, $scope.detailFaultOrder, function (savedOrder) {
              angular.copy(savedOrder, $scope.detailFaultOrder);
              savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
              angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.baseFaultOrder);//目的是同步改变故障工单列表的信息
              $ionicHistory.goBack();
            });

          }
        } else {
          var tempVerifyItem = {
            activeFlag: 0,//有效标志
            auditingDate: nowDate.format("yyyy-MM-dd hh:mm"),
            auditingId: null,
            auditingOpinion: $scope.verifyInfo.verifyReason,
            auditingResult: 92,
            auditingUser: Storage.getProfile()['id'],
            auditiogResultName: "不通过",
            workorderId: $scope.workOrderCode
          };

          if ($scope.workorderType == 38 || $scope.workorderType == 37) {
            var auditingResult = 41; //故障工单 审核不通过 状态为 处理中  代码 41
            $scope.verifyData.detailFaultOrder.workorderDetails.eaWoWorkorderAuditingDtoList.unshift(tempVerifyItem);
            //审核不通过 工单处理中
            $scope.baseFaultOrder.workorderStatus = 41;
            $scope.baseFaultOrder.workorderStatusName = "处理中";
            eamFaultWorkOrderFactory.changeWorkOrderStatus(auditingResult, $scope.detailFaultOrder, function (savedOrder) {
              angular.copy(savedOrder, $scope.detailFaultOrder);
              savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
              angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.baseFaultOrder);//目的是同步改变故障工单列表的信息
              $ionicHistory.goBack();
            });
          } else {
            var auditingResult = 141; //三工单 审核不通过 状态为 处理中 代码 141
            $scope.verifyData.detailFaultOrder.workorderDetails.eaWoWorkorderAuditingDtoList.unshift(tempVerifyItem);
            $scope.baseFaultOrder.workorderStatus = 141;
            $scope.baseFaultOrder.workorderStatusName = "处理中";
            eamMTInstallWorkOrderFactory.changeWorkOrderStatusThreeOrder(auditingResult, $scope.detailFaultOrder, function (savedOrder) {
              // console.log("copy 前 ");
              angular.copy(savedOrder, $scope.detailFaultOrder);
              savedOrder['apiWorkorderBaseInfoDto'].json = JSON.stringify(savedOrder);
              angular.copy(savedOrder['apiWorkorderBaseInfoDto'], $scope.baseFaultOrder);//目的是同步改变故障工单列表的信息
              $ionicHistory.goBack();
            });

          }
        }
      }, function () {
        //if no ,do something here
        // console.log("点击了取消！");
      }, "确定", "取消");

    }//click

  });
