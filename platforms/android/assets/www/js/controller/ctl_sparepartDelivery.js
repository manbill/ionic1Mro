/**
 * 备件调拨相关控制器
 */
starter
/**
 * 发货记录列表
 */
    .controller('sparepartDelivery', function ($stateParams, $scope, $rootScope, $state, $ionicModal, Popup, eamSync, OrderService, ServiceSparepartDelivery) {
        $scope.spareparts = [];
        $scope.hasMoreData = false;
        $scope.page = 0;
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
        $ionicModal.fromTemplateUrl("views/sparepart/delivery/filter.html", {
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
            $scope.hasMoreData = false;
            $scope.filterModal.hide();
            $scope.spareparts = [];
            $scope.loadMoreData();
        };


        //下拉刷新数据
        $scope.refreshData = function () {
            eamSync.sync(['SyncSparepartDelivery.downloadList'], function () {
                $scope.hasMoreData = false;
                $scope.page = 0;
                $scope.spareparts = [];
                $scope.loadMoreData();
                $scope.$broadcast('scroll.refreshComplete');
            });
        };

        //上拉加载更多
        $scope.loadMoreData = function () {
            $scope.page++;
            ServiceSparepartDelivery.listSparepart($scope.page, $scope.search, function (rows) {
                $scope.$broadcast('scroll.infiniteScrollComplete');
                if (rows.length > 0) {
                    $scope.spareparts = $scope.spareparts.concat(rows);
                    $scope.hasMoreData = true;
                } else {
                    $scope.hasMoreData = false;
                }
            });
        };

        $scope.showDetail = function (data) {
            $state.go("tab.sparepartDeliveryDetail", {data: data});
        };
        $scope.refreshData();

        /**
         * 刷新发货单信息。
         */
        $rootScope.flashSparepartDeliveryList = function(){
            $scope.refreshData();
        };
    })
    /**
     * 调拨单详情
     */
    .controller('sparepartDeliveryDetail', function ($stateParams, $scope, $state, eamSync) {
        $scope.detail = $stateParams.data.json;
        var detail = $stateParams.data;
        var downloadImg = function (file) {
            eamSync.downloadFile(file.fileId, function (image) {
                file.filePath = image.filePath;
            });
        };

        for (var i in $scope.detail.tOFilemappingDtoList) {
            downloadImg($scope.detail.tOFilemappingDtoList[i]);
        }

        $scope.showDeliveryList = function () {
            $state.go("tab.sparepartDeliveryList", {data: $scope.detail});
        };

        $scope.showFkjl = function (data) {
            //查看反馈记录信息
            $state.go("tab.sparepartdetailFKJL", {
                data: detail,
                fkjl: data
            });
        };
    })
    /**
     * 发货单列表信息
     */
    .controller('sparepartDeliveryList', function ($stateParams, $scope, $rootScope, $state, eamSync, ServiceSparepartDelivery) {
        $scope.detail = $stateParams.data;
        $scope.isCanCreate = false;
        $scope.deliverylist = [];
        $scope.hasMoreData = true;
        $scope.page = 0;
        $scope.search = {transferOrderId:$scope.detail.transferOrderId};

        //判断是否允许发货
        if($scope.detail.statusId==172 || $scope.detail.statusId==173){
            $scope.isCanCreate = true;
        }

        //上拉加载更多
        $scope.loadMoreData = function () {
            $scope.page++;
            ServiceSparepartDelivery.list($scope.page, $scope.search, function (rows) {
                $scope.$broadcast('scroll.infiniteScrollComplete');
                if (rows.length > 0) {
                    $scope.deliverylist = $scope.deliverylist.concat(rows);
                } else {
                    $scope.hasMoreData = false;
                }
            });
        };

        $scope.create = function () {
            $state.go("tab.sparepartDeliveryDetailAddOrEdit", {data:$scope.detail, is_edit:false});
        };

        $scope.showDetail = function (data) {
            $state.go("tab.sparepartDeliveryListDetail", {
                data: data
            });
        };

    })
    /**
     * 发货单详情
     */
    .controller('sparepartDeliveryListDetail', function ($stateParams, $scope, $state, eamSync) {
        $scope.detail = $stateParams.data;
        //如果可以编辑
        if ($scope.detail.statusId == 182 || $scope.detail.statusId == 185) {
            $scope.height = "height";
            $scope.is_edit = true;
        }


        var downloadImg = function (file) {
            eamSync.downloadFile(file.fileId, function (image) {
                file.filePath = image.filePath;
            });
        };
        for (var i in $scope.detail.sOGIFilemappingList) {
            downloadImg($scope.detail.sOGIFilemappingList[i]);
        }

        $scope.edit = function () {
            $state.go("tab.sparepartDeliveryDetailAddOrEdit", {data: $scope.detail, is_edit:true});
        };
    })
    /**
     * 发货
     */
    .controller('sparepartDeliveryDetailAddOrEdit', function ($stateParams, $scope, $cordovaCamera, $ionicActionSheet, $ionicHistory, $rootScope, Popup, eamFile, eamSync, OrderService, SparepartApi) {
        $scope.title = "新建发货单";
        if ($stateParams.is_edit) {
            $scope.title = "修改发货单";
            $scope.detail = $stateParams.data;
        }else{
            //在这里拼装发货单信息
            $scope.detail = {transferOrderId:$stateParams.data.transferOrderId};
            $scope.detail.sOrderItemDtoList = [];
            $scope.detail.sOGIFilemappingList = [];
            for(var i in $stateParams.data.tranferOrderItemDtoList){
                var item = $stateParams.data.tranferOrderItemDtoList[i];
                var shippingtem = {
                    itemId:item.itemId,
                    materialId:item.materialId,
                    materialName:item.materialComment,
                    materialSno:item.materialNo,
                    unitName:item.unitName,
                    versionNo:item.versionNo,
                    totalDemandAmount:item.totalDemandAmount,
                    demandAmount:item.demandAmount,
                    totalIssueAmount:item.totalIssueAmount,
                    issueAmount:null,
                    transferOrderItemId:item.itemId
                };
                $scope.detail.sOrderItemDtoList.push(shippingtem);
            }
        }
        //初始化下拉菜单
        var initSelect = function () {
            $scope.search = {};
            OrderService.getDicListByType("shipping_method", function (res) {
                $scope.shippingMethods = res;
            });
        };
        initSelect();

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
                        $scope.detail.sOGIFilemappingList.push(item);
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
            ArrayUitls.remove($scope.detail.sOGIFilemappingList, item);
        };


        /**
         * 保存发货单
         */
        $scope.save = function(){
            //检查数据。
            //检查发货数据量，如果未填写则传0到后台。
            for(var i in $scope.detail.sOrderItemDtoList){
                var item = $scope.detail.sOrderItemDtoList[i];
                if(!StringUtils.isNotEmpty(item.issueAmount)){
                    item.issueAmount = 0;
                }
                if(item.demandAmount-item.totalIssueAmount-item.issueAmount<0){
                    Popup.promptMsg("["+ item.materialName +"]发货数量超过最大可发货数量");
                    return;
                }
            }
            //检查发货方式
            if(!StringUtils.isNotEmpty($scope.detail.shippingMethodId)){
                Popup.promptMsg("未选择发货方式");
                return;
            }
            //检查发运公司
            if(!StringUtils.isNotEmpty($scope.detail.shippingCompany)){
                Popup.promptMsg("未填写发运公司");
                return;
            }
            //检查发运单号
            if(!StringUtils.isNotEmpty($scope.detail.shipmentTrackingNo)){
                Popup.promptMsg("未填写发运单号");
                return;
            }

            Popup.waitLoad();
            eamSync.updateFile($scope.detail, function (status) {
                if (status == false) {
                    Popup.hideLoading();
                    Popup.promptMsg("保存发货单失败");
                    return;
                }
                SparepartApi.saveShippingOrder(function(){
                    Popup.hideLoading();
                    if ($.isFunction($rootScope.flashSparepartDeliveryList)) {
                        $rootScope.flashSparepartDeliveryList();
                    } else if ($.isFunction($rootScope.flashSparepart)) {
                        $rootScope.flashSparepart();
                    }
                    //刷新发货单列表
                    if($stateParams.is_edit){
                        $ionicHistory.goBack(-2);
                    }else{
                        $ionicHistory.goBack(-1);
                    }
                }, $scope.detail);
            });


        }

    });
