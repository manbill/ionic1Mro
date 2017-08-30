starter
//问题报告列表
  .controller('ProblemReportCtrl', function (Store, $rootScope, DataCache, $filter, $scope, Popup, $stateParams,
                                             ProblemReportService, $state, $timeout, $ionicModal, ProblemReportApi,
                                             OtherApi, Storage, eamSync, $ionicScrollDelegate) {

    $scope.hasMoreData = false;
    $scope.problemReportList = [];
    $scope.params = {};
    $scope.params.pageNumber = 1;
    $scope.problemStatusList = [];
    $scope.projectList = Storage.getProjects();
    ProblemReportService.getDicId2NameByDictionaryId(44, function (res) {
      $scope.problemStatusList = res;
    });
    ProblemReportService.getDicId2NameByDictionaryId(45, function (res) {
      $scope.problemTypes = res;
    });
    ProblemReportService.getDicId2NameByDictionaryId(1, function (res) {
      $scope.areas = res;
    });
    $scope.problemReportListRefresh = function () {
      $scope.reset();
      eamSync.sync(["SyncWorkHours.uploadList", "SyncProblemReport.downloadList"], function (status) {
        $scope.loadMoreData();
      });
    };
    $scope.$on("$ionicView.beforeEnter", function () {
      $scope.problemReportListRefresh();
    });
    $scope.loadMoreData = function () {
      // 点击查询工单进来后的方法
      ProblemReportService.loadMoreProblemReportData($scope.params, function (resp) {
        //追加结果
        $timeout(function () {
          $scope.$broadcast('scroll.refreshComplete');
          $scope.$broadcast('scroll.infiniteScrollComplete');
        }, 500);
        if (resp.length == 0) {
          $scope.hasMoreData = false;
        } else {
          $scope.params.pageNumber++;
          $scope.hasMoreData = true;
          $scope.$broadcast(SCROLL_INFINITE_COMPLETE);
          $scope.problemReportList = $scope.problemReportList.concat(resp);
        }
      });
    };
    $scope.loadMoreData();
    $scope.reset = function () {
      $scope.params = {};
      $scope.params = {submitEndDate: null, submitStartDate: null};
      $scope.params.pageNumber = 1;
      $scope.problemReportList = [];
    };
    //初始化过滤器
    $ionicModal.fromTemplateUrl("views/problemReport/searchFilter.html", {
      scope: $scope,
      animation: "slide-in-up"
    }).then(function (modal) {
      $scope.filterModal = modal;
    }, function (err) {
    });

    $scope.openFilter = function () {
      $scope.filterModal.show();
    };
    $scope.backButtonAction = function () {
      $scope.filterModal.hide();
    };

    $scope.query = function () {
      $scope.params.pageNumber = 1;
      $scope.hasMoreData = false;
      $scope.problemReportList = [];
      $scope.params.submitEndDate = DateUtil.searchEndDate($scope.params.submitEndDate);
      $scope.params.submitStartDate = DateUtil.searchStartDate($scope.params.submitStartDate);
      $scope.loadMoreData();
      $scope.filterModal.hide();
      Popup.delayRun(function () {//200ms滚动到顶部
        $ionicScrollDelegate.scrollTop();
      }, null, 200);
    };

    $scope.detail = function (data) {
      console.log(data);
      if (data.problemStatus == $rootScope.problemStatus.PROBLEM_STATUS_UNSUBMIT) {//如果是未提交、进入修改界面
        $state.go("tab.problemReportCreate", {
          data: angular.fromJson(data.json)
        });
        return;
      }
      //否则进入查看界面,需要先获取处理记录
      if ($rootScope.isOnline) {
        Popup.waitLoad("正在获取处理记录...");
        ProblemReportApi.getProcessRecord(function (resp) {
          if (resp.success) {
            console.log(resp.data);
            data.processRecord = resp.data;
            $state.go("tab.problemReportDetail", {
              pr: data,
              isConfirm: true
            });
          } else {
            Popup.confirm('联网失败', function () {
            }, null, '确定', '取消');
          }
          Popup.hideLoading();
        }, {
          problemId: data.problemId
        });
      } else {
        Popup.confirm('联网失败', function () {
        }, null, '确定', '取消');
      }
    };
    $scope.problemReportListRefresh();
    $scope.problemReportCreate = function () {
      $state.go('tab.problemReportCreate');
    }
  })
  //新建/编辑问题报告(未提交状态)
  .controller('ProblemReportCreateCtrl', function (Store, $rootScope, DataCache, $filter, $scope, Popup, $stateParams,
                                                   ProblemReportService, $state, $timeout, $ionicModal, $ionicHistory, ProblemReportApi, OtherApi, eamSync,
                                                   Storage, eamFile, Params, modifiedJson) {
    $scope.projectList = [Storage.getSelectedProject()];
    $scope.isCreate = true;
    $scope.userType = Storage.getProfile().userType;
    // $stateParams.data = modifiedJson.getMockProblemObj();//仅用于修改未提交问题报告的ui
    if (isDebug) {
      console.log($stateParams);
    }
    $scope.pr = {};
    $scope.fileList = [];//附件列表
    $scope.areas = [{
      detailId: Storage.getSelectedProject().areaCode,
      detailName: Storage.getSelectedProject().areaCodeName
    }];//区域
    $scope.problemTypes = [];//问题类型
    $scope.webParams = {//页面上的参数
      project: Storage.getSelectedProject(),
      area: $scope.areas[0],
      problemType: null
    };
    if ($stateParams.data) {
      $scope.title = "编辑问题报告";
      $scope.isCreate = false;
      $scope.pr = angular.copy($stateParams.data);
      $scope.webParams.project = $scope.projectList.find(function (item) {
        return item.projectId == $scope.pr.projectId
      });
      // console.log("编辑问题报告: " + JSON.stringify($scope.pr, undefined, 2));
      $scope.fileList = $scope.pr['problemReportFilesMappingDtos'] || [];
      eamFile.retrieveInfoOrInsertFileRecord($scope.fileList);
    } else {
      $scope.title = "创建问题报告";
    }

    // ProblemReportService.getDicId2NameByParaType('area_code', function (namesNIds) {
    //   $scope.areaList = namesNIds.filter(function (item) {
    //     return item.detailId == Storage.getProfile().areaCode
    //   });
    //   if (!$scope.isCreate) {
    //     $scope.webParams.area = $scope.areaList.find(function (item) {
    //       return item.detailId == Storage.getSelectedProject().areaCode
    //     });
    //   }
    // });
    ProblemReportService.getDicId2NameByParaType('problem_type', function (namesNIds) {
      $scope.problemTypes = namesNIds;
      if (!$scope.isCreate) {
        $scope.webParams.problemType = $scope.problemTypes.find(function (item) {
          return item.detailId == $scope.pr.problemType
        });
        // console.log('$scope.webParams.problemType', $scope.webParams.problemType)
      }
    });
    $scope.workOrderSelect = function () {
      if (!StringUtils.isNotEmpty($scope.webParams.project)) {
        return Popup.delayRun(null, '请选择项目');
      }
      $state.go("tab.workOrderSelect", {
        data: {projectId: $scope.webParams.project.projectId}
      });
    };
    $scope.$watch('webParams.project', function (newVal, oldVal) {
      // console.log(newVal, oldVal);
      if (!angular.equals(newVal, oldVal)) {
        $scope.pr.workorderCode = null;
      }
    });
    $scope.$on('$ionicView.beforeEnter', function () {
      var wo = Params.getTransferredObjByKey('selectedOrderNo');
      // console.log(wo);
      if (wo) {//选中的工单编号
        $scope.pr.workorderId = wo.workorderId;
        $scope.pr.workorderCode = wo.workorderCode;
        Params.clearTransferredObjByKey('selectedOrderNo');
      }
    });

    /**
     * 删除图片附件
     * @param item
     */
    $scope.removeAttachment = function (item, index) {
      eamFile.removeAttachedFile(item)
        .then(function () {
          $scope.fileList.splice(index, 1);
        }, function (err) {
          Popup.promptMsg(JSON.stringify(err), '删除附件失败');
        });
    };

    //新增 编辑图片
    $scope.addeditAttachment = function () {
      var item = {
        source: AttachedFileSources.problem_report_source,
        workorderId: !$scope.isCreate ? $scope.pr.problemId : null,
        fileActualName: 'WT_' + $scope.pr.problemNo ? $scope.pr.problemNo : "",
        fileOriginalName: 'WT_' + $scope.pr.problemNo ? $scope.pr.problemNo : ""
      };
      eamFile.getPicture(item)
        .then(function (fileItem) {
          item.filePath = fileItem.filePath;
          $scope.fileList.push(fileItem);
        }, function (err) {
          Popup.promptMsg(JSON.stringify(err), '获取附件失败');
        });
    };
    $scope.isCanEdit = function () {
      return $rootScope.auth["auth_500101"];
    };

    $scope.syncIfOnline = function (callback) {
      if ($rootScope.isOnline) {
        eamSync.sync(["SyncProblemReport.downloadList"], function () {
          callback();
        });
      }
    };
    $scope.$watch('pr.problemSubject', function (newVal, oldVal) {
      if (newVal && newVal.len4FullWidthCharacterNChinese() > 100) {
        Popup.loadMsg('问题主题文字太多');
      }
    });
    $scope.$watch('pr.problemDesc', function (newVal, oldVal) {
      if (newVal && newVal.len4FullWidthCharacterNChinese() > 100) {
        Popup.loadMsg('问题描述文字太多');
      }
    });
    $scope.submitPr = function (pr) {//提交
      $scope.savePr(pr, false);
    };
    $scope.savePr = function (pr, isSave) {//暂存
      // if (!StringUtils.isNotEmpty($scope.webParams.area)) {
      //     $scope.webParams.area=$scope.areas[0];
      // }
      if (!StringUtils.isNotEmpty($scope.webParams.project)) {
        $scope.webParams.project = Storage.getSelectedProject();
      }
      if (!StringUtils.isNotEmpty($scope.webParams.problemType)) {
        return Popup.delayRun(null, '请选择问题类型');
      }
      if (!StringUtils.isNotEmpty(pr.problemSubject)) {
        return Popup.delayRun(null, '请输入问题主题');
      }
      if (!StringUtils.isNotEmpty(pr.problemDesc)) {
        return Popup.delayRun(null, '请输入问题描述');
      }
      if (pr.problemSubject.len4FullWidthCharacterNChinese(3) > 100) {
        return Popup.delayRun(null, '问题主题文字太多');
      }
      if (pr.problemDesc.len4FullWidthCharacterNChinese(3) > 100) {
        return Popup.delayRun(null, '问题描述文字太多');
      }
      if ($scope.isCreate) {
        pr.problemId = 0;//新建问题报告
      }
      pr.projectId = +$scope.webParams.project.projectId;
      pr.projectName = $scope.webParams.project.projectName;
      pr.areaCode = Storage.getSelectedProject().areaCode;
      pr.areaDesc = Storage.getSelectedProject().areaCodeName;
      pr.problemType = $scope.webParams.problemType.detailId;
      pr.problemTypeDesc = $scope.webParams.problemType.detailName;
      pr.problemStatus = isSave ? 1 : null;
      pr.problemCreater = Storage.getProfile()['id'];
      // pr.problemCreaterNo = Storage.getProfile()['name'];
      pr.problemCreaterName = Storage.getProfile()['realname'];

      eamFile.moveFileToUpload($scope.fileList, function () {
        eamFile.uploadAttachedFile($scope.fileList).then(onUploadSuccess, onUploadFail);
      });
      function onUploadFail(err) {
        //暂存或者提交 失败还原原来的状态 新建的问题报告状态置为 null，编辑的问题报告置为 未提交
        pr.problemStatus = !$scope.isCreate ? $rootScope.problemStatus.PROBLEM_STATUS_UNSUBMIT : null;
        Popup.promptMsg(JSON.stringify(err), '上传附件失败');
      }

      function onUploadSuccess() {
        pr.fileList = [];
        console.debug("问题报告上传的附件 " + JSON.stringify($scope.fileList, undefined, 2));
        $scope.fileList.forEach(function (item) {
          if ($.isNumeric(item.filemappingId)) {
            //  alert(item.filemappingId);
            console.log("mappingId: " + item.filemappingId);
          }
          pr.fileList.push(item.filemappingId);
        });
        if (!$scope.isCreate) {//修改
          delete pr.json;
          delete pr.uploadStatus;
          delete pr.downloadStatus;
          delete pr.processRecord;
        }
        Popup.waitLoad();
        ProblemReportApi.save(function (resp) {
          console.log(JSON.stringify(pr,undefined,2));
          Popup.hideLoading();
          if (resp.success) {
            pr.problemStatus = $rootScope.problemStatus.PROBLEM_STATUS_UNSUBMIT;
            pr.problemStatusDesc = '未提交';
            if ($scope.isCreate) {//新建问题报告
              pr.problemId = resp.data;//新建返回的问题报告id
            }
            Popup.delayRun(function () {
              $scope.syncIfOnline(function () {
                Popup.loadMsg("同步数据成功");
                $(".popup").css("border-radius", "5%");
              });
            }, "创建成功", 500);
            $(".popup").css("border-radius", "5%");//弹框圆角化处理
            $ionicHistory.goBack();
          } else {
            Popup.promptMsg(JSON.stringify(resp), '修改问题报告出错');
            pr.problemStatus = $rootScope.problemStatus.PROBLEM_STATUS_UNSUBMIT;
            pr.problemStatusDesc = '未提交';
          }
        }, pr);
      }
    };
    $scope.openFile = function (fileItem) {
      if (!fileItem.isDownloading) {
        fileItem.isDownloading = true;
        return Popup.loadMsg("正在下载图片，请稍后");
      }
      eamFile.openEamAttachedFile(fileItem)
        .then(
          function () {
            fileItem.isDownloading = false
          }, function (err) {
            fileItem.isDownloading = false;
          });
    }
  })
  //问题报告详情
  .controller('ProblemReportDetailCtrl', function (Store, $rootScope, DataCache, $filter, $scope, Popup, $stateParams,
                                                   ProblemReportService, $state, $timeout, $ionicModal, eamSync,
                                                   OtherApi, Storage, $ionicHistory, eamFile, Params, MaintainTaskRW) {

    $scope.pr = $stateParams.pr;
    if (isDebug) console.log($scope.pr);
    $scope.userType = Storage.getProfile().userType;
    eamFile.retrieveInfoOrInsertFileRecord($scope.pr);
    $scope.downloadImage = function (image, index) {
      eamFile.openEamAttachedFile(image);
    };//downloadImage end·······
    $scope.feedBack = function (pr) {
      $state.go("tab.problemReportFeedBack", {
        pr: pr
      });
    };
    $scope.close = function (pr) {//关闭问题报告
      $state.go("tab.problemReportClose", {
        pr: pr
      });
    };
    $scope.goBack = function () {
      $ionicHistory.goBack();
    };
    $scope.isCanEdit = function () {
      return false && $rootScope.auth["auth_500101"] && //添加问题报告的权限，问题报告只有这一个权限
        ($scope.pr.problemStatus == $rootScope.problemStatus.PROBLEM_STATUS_REPLY);
    };
  })
  .controller('ProblemReportFeedBackCtrl', function (Store, $rootScope, DataCache, $filter, $scope, Popup, $stateParams,
                                                     ProblemReportService, $state, $timeout, $ionicModal, ProblemReportApi,
                                                     OtherApi, eamFile, Storage, $ionicHistory, $injector) {

    $scope.pr = $stateParams.pr;
    $scope.fileList = [];
    $scope.openAttachmentFile = function (attachmentFile) {
      eamFile.openEamAttachedFile(attachmentFile);
    };
    /**
     * 删除图片附件
     * @param item
     * @param index
     */
    $scope.removeAttachment = function (item, index) {
      eamFile.removeAttachedFile(item).then(function () {
        $scope.fileList.splice(index, 1);
      }, function (err) {
        Popup.promptMsg(JSON.stringify(err), '删除失败')
      });
    };

    //新增 编辑图片
    $scope.addeditAttachment = function () {
      eamFile.getPicture({
        source: AttachedFileSources.problem_report_deal_source,
        fileActualName: "WT_Feedback_",
        fileOriginalName: "WT_Feedback_"
      }).then(function (fileItem) {
        //item.filePath = fileItem.filePath;
        $scope.fileList.push(fileItem);
      }, function (err) {
        console.error(err);
      });
    };

    $scope.feedBack = function (pr) {
      eamFile.moveFileToUpload($scope.fileList, function () {
        eamFile.uploadAttachedFile($scope.fileList).then(win, fail);
      });
      function fail(err) {
        Popup.promptMsg(JSON.stringify(err), '上传附件失败');
      }

      function win() {
        pr.problemReportFiles = $scope.fileList.map(function (f) {
          return f.filemappingId;
        });
        pr.pdPeople = Storage.getProfile()['id'];
        pr.userType = Storage.getProfile().userType;
        pr.pdType = 1;	//1:回复 2：转办 3：关闭
        ProblemReportApi.operate(function (resp) {
          if (resp.success) {
            // pr = {};
            pr.problemStatus = $rootScope.problemStatus.PROBLEM_STATUS_AREA_PROCESSING;
            pr.problemStatusDesc = '区域处理中';
            Popup.loadMsg("反馈成功", 800);
            $(".popup").css("border-radius", "5%");//弹框圆角化处理
            if ($rootScope.isOnline) {
              Popup.waitLoad("正在同步数据···");
              ProblemReportApi.getProcessRecord(function (resp) {
                if (resp.success) {
                  pr.processRecord = resp.data;
                }
                Popup.hideLoading();
                $ionicHistory.goBack();
              }, {
                problemId: pr.problemId
              });
            } else {
              Popup.loadMsg("同步数据失败!", 300);
              $ionicHistory.goBack();
            }
          }
        }, {
          pdId: null,
          areaDesc: pr.areaDesc,
          userName: Storage.getProfile()['realname'],
          userType: pr['userType'],
          pdTypeDesc: "反馈",
          pdDate: new Date().format("yyyy-MM-dd hh:mm:ss"),
          pdReplydesc: pr['pdReplydesc'],
          problemReportFiles: pr.problemReportFiles,
          dtos: null,
          problemStatus: +pr.problemStatus,
          pdPeople: pr['pdPeople'] ? pr['pdPeople'] : Storage.getProfile()['id'],
          pdType: pr.pdType,// 处理类型    1:回复  2：转办
          pdDepartment: Storage.getProfile()['departmentName'],
          problemId: pr.problemId
        });
      }
    }
  })
  .controller('ProblemReportCloseCtrl', function (Store, $rootScope, DataCache, $filter, $scope, Popup, $stateParams,
                                                  ProblemReportService, $state, $timeout, $ionicModal, ProblemReportApi,
                                                  OtherApi, Storage, eamFile, $ionicHistory, Params) {

    $scope.pr = $stateParams.pr;
    console.log($scope.pr);
    $scope.fileList = [];
    $scope.removeAttachment = function (item, index) {
      eamFile.removeAttachedFile(item).then(function () {
        $scope.fileList.splice(index, 1);
      }, function (err) {
        Popup.promptMsg(JSON.stringify(err))
      });
    };
    $scope.openFile = function (file) {
      eamFile.openEamAttachedFile(file);
    };
    //新增 编辑图片
    $scope.addeditAttachment = function () {
     var  item =  {
          source: AttachedFileSources.problem_report_deal_source,
          fileActualName: 'WT_close_',
          fileOriginalName: 'WT_close_'
        };
      eamFile.getPicture(item)
        .then(function (fileItem) {
          $scope.fileList.push(fileItem);
        }, function (err) {
          console.error(err)
        });
    };

    $scope.close = function (pr) {
      eamFile.moveFileToUpload($scope.fileList,function () {
        eamFile.uploadAttachedFile($scope.fileList).then(onUploadSuccess, onUploadFail);
      });
      function onUploadFail(err) {
        Popup.promptMsg(JSON.stringify(err), '上传附件失败');

      }

      function onUploadSuccess() {
        pr.fileList = [];
        //$scope.fileList.forEach(function (item) {
        //  if (angular.isNumber(item.fileId)) {
        //    pr.fileList.push(item.fileId);
        //  }
        //});
        pr.problemReportFiles = $scope.fileList.map(function (f) {
          return f.filemappingId;
        });
        pr.problemCreater = Storage.getProfile()['id'];
        pr.pdPeople = Storage.getProfile()['id'];
        pr.userType = Storage.getProfile().userType;
        pr.pdType = 3;	//1:回复 2：转办 3：关闭
        Popup.waitLoad();
        ProblemReportApi.operate(function (resp) {
          if (resp.success) {
            Popup.hideLoading();
            pr.problemStatus = $rootScope.problemStatus.PROBLEM_STATUS_CLOSED;
            pr.problemStatusDesc = '已关闭';
            Popup.loadMsg("关闭成功", 500);
            $(".popup").css("border-radius", "5%");//弹框圆角化处理
            if ($rootScope.isOnline) {
              Popup.waitLoad("正在同步数据...");
              ProblemReportApi.getProcessRecord(function (resp) {
                Popup.hideLoading();
                if (resp.success) {
                  pr.processRecord = resp.data;
                }
                $ionicHistory.goBack(-2);
              }, {
                problemId: pr.problemId
              });
            } else {
              Popup.loadMsg("同步数据失败!", 300);
              $ionicHistory.goBack();
            }
          }
        }, {
          pdId: null,
          areaDesc: pr.areaDesc,
          userName: Storage.getProfile()['realname'],
          userType: pr['userType'],
          pdTypeDesc: "关闭",
          pdDate: new Date().format("yyyy-MM-dd hh:mm:ss"),
          pdReplydesc: pr['pdReplydesc'],
          problemReportFiles: pr.problemReportFiles,
          dtos: null,
          problemStatus: parseInt(pr.problemStatus),
          pdPeople: pr.problemCreater,//关闭问题的用户id
          pdType: pr.pdType,// 处理类型    1:回复  2：转办
          pdDepartment: Storage.getProfile()['departmentName'],
          problemId: pr.problemId
        });
      }
    }
  });
