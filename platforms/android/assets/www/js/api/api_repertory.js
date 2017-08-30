/**
 * 库存查询
 */
starter.factory('RepertoryApi', function ($resource, Exception) {
    var Api_getMaterialRepertory = "/api/common/getMaterialRepertory.api";

    var RepertoryApis = $resource(baseUrl, {}, {
        /**
         * 根据物料号查询库存
         */
        getMaterialRepertory: {
            method: 'post',
            url: baseUrl + Api_getMaterialRepertory
        }
    });

    return {
        /**
         * 取得所有的区域
         */
        getMaterialRepertory: function (callback, params) {
            var model = RepertoryApis.getMaterialRepertory(params).$promise;
            Exception.promise(model, callback, Api_getMaterialRepertory, params);
        }
    };
});