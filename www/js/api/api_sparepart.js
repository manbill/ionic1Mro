/**
 * 调拨单相关
 */
starter.factory('SparepartApi', function ($resource, Exception) {
    var Api_sparepartSave = "/api/sparepart/save.api";
    var Api_cancelTransferOrder = "/api/sparepart/cancelTransferOrder.api";
    var Api_saveTransferOrderFeedBack = "/api/sparepart/saveTransferOrderFeedBack.api";
    var Api_saveShippingOrder = "/api/sparepart/saveShippingOrder.api";
    var Api_rejectTransferOrder = "/api/sparepart/rejectTransferOrder.api";
    var Api_confirmTransferFinish = "/api/sparepart/confirmTransferFinish.api";
    var Api_confirmGoodsReceive = "/api/sparepart/confirmGoodsReceive.api";
    var Api_refuseGoodsReceive = "/api/sparepart/refuseGoodsReceive.api";
    var Api_undoGoodReceive = "/api/sparepart/undoGoodReceive.api";
    var Api_saveShiftTransferOrder = "/api/sparepart/saveShiftTransferOrder.api";
    var Api_getMaterialRepertory = "/api/common/getMaterialRepertory.api";

    var SparepartApis = $resource(baseUrl, {}, {
        /**
         * 保存调拨单
         */
        sparepartSave: {
            method: 'post',
            url: baseUrl + Api_sparepartSave
        },
        /**
         * 取消调拨单
         */
        cancelTransferOrder: {
            method: 'post',
            url: baseUrl + Api_cancelTransferOrder
        },
        /**
         * 保存反馈记录
         */
        saveTransferOrderFeedBack: {
            method: 'post',
            url: baseUrl + Api_saveTransferOrderFeedBack
        },
        /**
         * 保存驳回记录
         */
        rejectTransferOrder: {
            method: 'post',
            url: baseUrl + Api_rejectTransferOrder
        },
        /**
         * 保存发货单
         */
        saveShippingOrder: {
            method: 'post',
            url: baseUrl + Api_saveShippingOrder
        },
        /**
         * 完成调拨单
         */
        confirmTransferFinish: {
            method: 'post',
            url: baseUrl + Api_confirmTransferFinish
        },
        /**
         * 确认收货
         */
        confirmGoodsReceive: {
            method: 'post',
            url: baseUrl + Api_confirmGoodsReceive
        },
        /**
         * 拒绝收货
         */
        refuseGoodsReceive: {
            method: 'post',
            url: baseUrl + Api_refuseGoodsReceive
        },
        /**
         * 撤销收货
         */
        undoGoodReceive: {
            method: 'post',
            url: baseUrl + Api_undoGoodReceive
        },
        /**
         * 转办调拨单
         */
        saveShiftTransferOrder: {
            method: 'post',
            url: baseUrl + Api_saveShiftTransferOrder
        }
    });

    return {
        /**
         * 取得所有的区域
         */
        save: function (callback, params) {
            var model = SparepartApis.sparepartSave(params).$promise;
            Exception.promise(model, callback, Api_sparepartSave, params);
        },
        /**
         * 取消调拨单
         */
        cancelTransferOrder: function (callback, params) {
            var model = SparepartApis.cancelTransferOrder(params).$promise;
            Exception.promise(model, callback, Api_cancelTransferOrder, params);
        },
        /**
         * 保存反馈记录
         */
        saveTransferOrderFeedBack: function (callback, params) {
            var model = SparepartApis.saveTransferOrderFeedBack(params).$promise;
            Exception.promise(model, callback, Api_saveTransferOrderFeedBack, params);
        },
        /**
         * 保存驳回
         */
        rejectTransferOrder: function (callback, params) {
            var model = SparepartApis.rejectTransferOrder(params).$promise;
            Exception.promise(model, callback, Api_rejectTransferOrder, params);
        },
        /**
         * 保存发货单
         */
        saveShippingOrder: function (callback, params) {
            var model = SparepartApis.saveShippingOrder(params).$promise;
            Exception.promise(model, callback, Api_saveShippingOrder, params);
        },
        /**
         * 完成调拨单
         */
        confirmTransferFinish: function (callback, params) {
            var model = SparepartApis.confirmTransferFinish(params).$promise;
            Exception.promise(model, callback, Api_confirmTransferFinish, params);
        },
        /**
         * 完成收货
         */
        confirmGoodsReceive: function (callback, params) {
            var model = SparepartApis.confirmGoodsReceive(params).$promise;
            Exception.promise(model, callback, Api_confirmGoodsReceive, params);
        },
        /**
         * 拒绝收货
         */
        refuseGoodsReceive: function (callback, params) {
            var model = SparepartApis.refuseGoodsReceive(params).$promise;
            Exception.promise(model, callback, Api_refuseGoodsReceive, params);
        },
        /**
         * 撤销收货
         */
        undoGoodReceive: function (callback, params) {
            var model = SparepartApis.undoGoodReceive(params).$promise;
            Exception.promise(model, callback, Api_undoGoodReceive, params);
        },
        /**
         * 转办调拨单
         */
        saveShiftTransferOrder: function (callback, params) {
            var model = SparepartApis.saveShiftTransferOrder(params).$promise;
            Exception.promise(model, callback, Api_saveShiftTransferOrder, params);
        }
    };
});