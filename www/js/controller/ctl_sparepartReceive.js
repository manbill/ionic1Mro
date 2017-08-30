/**
 * 备件调拨相关控制器
 */
starter
/**
 * 收货记录列表
 */
    .controller('sparepartReceive', function ($stateParams, $scope, $ionicModal, $state, $rootScope, OrderService, ServiceSparepartReceive, eamSync) {
        $scope.page = 0;
        $scope.hasMoreData = false;
        $scope.receives = [];
        //初始化查询筛选项参数
        var initSelect = function () {
            $scope.search = {transferOrderNo: $stateParams.transferOrderNo};
            OrderService.getDicListByType("shipping_status", function (res) {
                $scope.shippingStatuses = res;
                $scope.shippingStatuses.unshift({detailName: "请选择", detailId: ""});
                $scope.search.statusId = "";
            });
        };
        initSelect();

        //初始化过滤器
        $ionicModal.fromTemplateUrl("views/sparepart/receive/filter.html", {
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
            $scope.page = 0;
            $scope.receives = [];
            $scope.hasMoreData = false;
            $scope.filterModal.hide();
            $scope.loadMoreData();
        };

        //下拉刷新数据
        $scope.refreshData = function () {
            eamSync.sync(['SyncSparepartDelivery.downloadList'], function () {
                $scope.page = 0;
                $scope.hasMoreData = false;
                $scope.receives = [];
                $scope.loadMoreData();
                $scope.$broadcast('scroll.refreshComplete');
            });
        };

        //上拉加载更多
        $scope.loadMoreData = function () {
            $scope.page++;
            ServiceSparepartReceive.list($scope.page, $scope.search, function (rows) {
                $scope.$broadcast('scroll.infiniteScrollComplete');
                if (rows.length > 0) {
                    $scope.receives = $scope.receives.concat(rows);
                    $scope.hasMoreData = true;
                } else {
                    $scope.hasMoreData = false;
                }
            });
        };


        //确认收货
        $scope.confirm = function (data, $event) {
            $event.stopPropagation();
            $state.go("tab.sparepartReceiveConfirmOrUnconfirm", {
                data: data,
                isConfirm: true
            });
        };
        //撤销收货
        $scope.unconfirm = function (data, $event) {
            $event.stopPropagation();
            $state.go("tab.sparepartReceiveConfirmOrUnconfirm", {
                data: data,
                isUnconfirm: true
            });
        };
        //查看详情
        $scope.showDetail = function (data, $event) {
            $event.stopPropagation();
            $state.go("tab.sparepartReceiveConfirmOrUnconfirm", {
                data: data
            });
        };
        $rootScope.refreshSparepartReceive = function () {
            $scope.refreshData();
        };
        $scope.refreshData();
    })
    /**
     * 确认收货或者撤销收货，查看详情
     */
    .controller('sparepartReceiveConfirmOrUnconfirm', function ($stateParams, $scope, $state, $rootScope, $ionicHistory,
                                                                $cordovaCamera, $ionicPopup, $ionicActionSheet, eamSync, eamFile,
                                                                Popup, ServiceSparepart, SparepartApi) {
        $scope.detail = $stateParams.data;//发货单信息
        //获取调拨单信息。
        ServiceSparepart.get($scope.detail.transferOrderId, function (data) {
            $scope.sparepart = JSON.parse(data.json);
        });

        $scope.is_confirm = $stateParams.isConfirm;
        $scope.is_unconfirm = $stateParams.isUnconfirm;
        $scope.height = ($scope.is_confirm || $scope.is_unconfirm) ? "height" : "";
        $scope.title = "查看发货单详情";
        if ($scope.is_confirm)$scope.title = "确认收货";
        if ($scope.is_unconfirm)$scope.title = "撤销收货";

        var downloadImg = function (file) {
            eamSync.downloadFile(file.fileId, function (image) {
                file.filePath = image.filePath;
            });
        };

        for (var i in $scope.detail.sOGIFilemappingList) {
            downloadImg($scope.detail.sOGIFilemappingList[i]);
        }

        for (var i in $scope.detail.sOGRFilemappingList) {
            downloadImg($scope.detail.sOGRFilemappingList[i]);
        }


        /****************图片相关处理功能****************/
        /**
         * 图片上传功能不是在这里实现的。
         */
        $scope.addeditAttachment = function (item) {

            //camera
            var appendByCamera = function (moveFile) {

                var options = {
                    quality: 50,
                    destinationType: Camera.DestinationType.FILE_URI,
                    sourceType: Camera.PictureSourceType.CAMERA,
                    encodingType: Camera.EncodingType.JPEG,
                    mediaType: Camera.MediaType.PICTURE,
                    targetWidth: 1024,
                    targetHeight: 1024,
                    popoverOptions: CameraPopoverOptions,
                    saveToPhotoAlbum: false,
                    correctOrientation: true
                };

                $cordovaCamera.getPicture(options).then(function (imageURI) {
                    moveFile(imageURI);
                }, function (err) {
                });
            };
            //image picker
            var pickImage = function (moveFile) {
                var options = {
                    destinationType: Camera.DestinationType.FILE_URI,
                    sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
                    targetWidth: 1024,
                    targetHeight: 1024
                };
                $cordovaCamera.getPicture(options).then(function (imageURI) {
                    moveFile(imageURI);
                }, function (err) {
                });
            };

            var moveFile = function (imageURL) {
                //将文件移动到指定位置，并将数据添加到对象中
                //同时显示选择的图片信息。
                eamFile.moveFileToUpload(imageURL, function (path) {
                    if (!item) {
                        item = {};
                        $scope.detail.sOGRFilemappingList.push(item);
                    }
                    item.filePath = path;
                    item.fileId = path;
                });
            };

            $ionicActionSheet.show({
                buttons: [
                    {text: '相机'},
                    {text: '图库'}
                ],
                titleText: '请选择类别',
                cancelText: '关闭',
                cancel: function () {
                    return true;
                },
                buttonClicked: function (index) {
                    switch (index) {
                        case 0:
                            appendByCamera(moveFile);
                            break;
                        case 1:
                            pickImage(moveFile);
                            break;
                        default:
                            break;
                    }
                    return true;
                }
            });
        };
        /**
         * 删除图片附件
         * @param item
         */
        $scope.removeAttachment = function (item) {
            ArrayUitls.remove($scope.detail.sOGRFilemappingList, item);
        };

        /**
         * 确认收货
         */
        $scope.confirm = function () {
            var data = {shippingOrderId: $scope.detail.shippingOrderId};
            data["sOGRFilemappingList"] = $scope.detail.sOGRFilemappingList;
            data["sOrderItemDtoList"] = $scope.detail.sOrderItemDtoList;
            Popup.waitLoad();
            eamSync.updateFile(data, function (status) {
                if (status == false) {
                    Popup.hideLoading();
                    Popup.promptMsg("确认收货上传附件失败");
                    return;
                }
                SparepartApi.confirmGoodsReceive(function () {
                    //返回列表
                    $rootScope.refreshSparepartReceive();
                    $ionicHistory.goBack();
                }, data);
            });

        };

        /**
         * 拒绝收货
         */
        $scope.refuse = function () {
            //显示输入框，输入撤销原因。
            $scope.undodata = {shippingOrderId: $scope.detail.shippingOrderId, reasonContent: ""};
            // 自定义弹窗
            var myPopup = $ionicPopup.show({
                template: '<textarea ng-model="undodata.reasonContent">',
                title: '请输入拒绝收货原因',
                // subTitle: '请输入拒绝收货原因',
                scope: $scope,
                buttons: [
                    {
                        text: '确定',
                        type: 'button-positive',
                        onTap: function (e) {
                            if (!StringUtils.isNotEmpty($scope.undodata.reasonContent)) {
                                // 不允许用户关闭，除非输入撤销原因
                                e.preventDefault();
                            } else {
                                return $scope.undodata;
                            }
                        }
                    },
                    {text: '取消'}
                ]
            });
            myPopup.then(function (res) {
                if (res) {
                    Popup.waitLoad();
                    SparepartApi.refuseGoodsReceive(function () {
                        //返回列表
                        $rootScope.refreshSparepartReceive();
                        $ionicHistory.goBack();
                    }, res);
                }
            });
        };

        /**
         * 撤销收货
         */
        $scope.undo = function () {
            var un = function () {
                //显示输入框，输入撤销原因。
                $scope.undodata = {shippingOrderId: $scope.detail.shippingOrderId, reasonContent: ""};
                // 自定义弹窗
                var myPopup = $ionicPopup.show({
                    template: '<textarea ng-model="undodata.reasonContent">',
                    title: '请输入撤销原因',
                    scope: $scope,
                    buttons: [
                        {
                            text: '确定',
                            type: 'button-positive',
                            onTap: function (e) {
                                if (!StringUtils.isNotEmpty($scope.undodata.reasonContent)) {
                                    // 不允许用户关闭，除非输入撤销原因
                                    e.preventDefault();
                                } else {
                                    return $scope.undodata;
                                }
                            }
                        },
                        {text: '取消'}
                    ]
                });
                myPopup.then(function (res) {
                    if (res) {
                        Popup.waitLoad();
                        SparepartApi.undoGoodReceive(function () {
                            //返回列表
                            $rootScope.refreshSparepartReceive();
                            $ionicHistory.goBack();
                        }, res);
                    }
                });
            };

            //当前发货单是已关闭状态，提示调拨单会被打开。
            if ($scope.detail.statusId == 184) {
                Popup.confirm("发货单已关闭，如果撤销收货调拨单也会被打开", function () {
                    un();
                })
            } else {
                un();
            }
        };


    })
;