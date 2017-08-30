/**
 * 工单相关的Api访问接口
 */
starter.factory('WorkOrderApi', function ($resource, Exception) {
  var Api_getBatchWorkorderList = "/api/maintain/getBatchWorkorderList.api"; //据时间段批量获取列表数据
  var Api_getWorkorderFullInfoList ="/api/maintain/getWorkorderFullInfoList.api"; //以工单号获取工单所有数据
  var workOrder = $resource(baseUrl + Api_getBatchWorkorderList, {}, {
    /**
     * 获取我的工单列表请求
     */
    getBatchWorkorderList: {
      method: 'post',
      url: baseUrl + Api_getBatchWorkorderList
    },
    /**
     * 获取我的工单详情
     */
    getWorkorderFullInfoList: {
      method: 'post',
      url: baseUrl + Api_getWorkorderFullInfoList,
      timeout:5 * 60 * 1000
    }
  });

  return {
    /**
     * 根据工单类型，返回某段时间内该类型的所有工单id
     * @param  callback
     * @param  params
     */
    getBatchWorkorderList: function (callback, params) {
      var model = workOrder.getBatchWorkorderList(params).$promise;
      Exception.promise(model, callback, Api_getBatchWorkorderList, params);
    },
    /**
     * 返回某类工单多个工单id制定的工单详情
     * @param {Object} params
     * @param callback
     */
    getWorkorderFullInfoList: function (callback, params) {
      var model = workOrder.getWorkorderFullInfoList(params).$promise;
      Exception.promise(model, callback, Api_getWorkorderFullInfoList, params);
    }
  };
});
