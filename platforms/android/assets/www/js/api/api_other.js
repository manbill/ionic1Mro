/**
 * 工单相关的Api访问接口
 */
starter.factory('OtherApi', function($resource, Exception, DataCache,$rootScope) {
	var Api_getAllArea = "/api/other/getAllArea.api";
	var Api_getProjectListByAreaId = "/api/other/getProjectListByAreaId.api";
	var Api_getWorkOrderType = "/api/other/getWorkOrderType.api";
	var Api_getWorkCategory = "/api/other/getWorkCategory.api";
	var Api_getWorkStatus = "/api/other/getWorkStatus.api";
	var Api_getFaultCauseList = "/api/other/getFaultCauseList.api";
	var Api_getProjectListByUserId = "/api/other/getProjectListByUserId.api";


	var OtherData = $resource(baseUrl + Api_getAllArea, {}, {
		/**
		 * 取得所有的区域
		 */
		getAllArea: {
			method: 'get',
			url: baseUrl + Api_getAllArea
		},
		/**
		 * 取得指定区域id下的项目信息
		 */
		getProjectListByAreaId: {
			method: 'get',
			url: baseUrl + Api_getProjectListByAreaId
		},
		/**
		 * 取得所有工单类型
		 */
		getWorkOrderType: {
			method: 'get',
			url: baseUrl + Api_getWorkOrderType
		},
		/**
		 * 取得指定工单类型下的作业类型
		 */
		getWorkCategory: {
			method: 'get',
			url: baseUrl + Api_getWorkCategory
		},
		/**
		 * 取得所有的工单状态
		 */
		getWorkStatus: {
			method: 'get',
			url: baseUrl + Api_getWorkStatus
		},
		/**
		 * 取得故障原因列表
		 */
		getFaultCauseList: {
			method: 'get',
			url: baseUrl + Api_getFaultCauseList
		},
		/**
		 * 取得指定用户所属的项目列表
		 */
		getProjectListByUserId: {
			method: 'get',
			url: baseUrl + Api_getProjectListByUserId
		},
	});

	return {
		/**
		 * 取得所有的区域
		 */
		getAllArea: function(callback, params) {
      var model = OtherData.getAllArea(params).$promise;
      Exception.promise(model, callback, Api_getAllArea, params);
		},
		/**
		 * 取得指定区域Id下的项目名
		 * @param {Object} areaId areaId
		 */
		getProjectListByAreaId: function(callback, params) {
      var model = OtherData.getProjectListByAreaId(params).$promise;
      Exception.promise(model, callback, Api_getProjectListByAreaId, params);
		},
		/**
		 * 取得所有的工单类型
		 */
		getWorkOrderType: function(callback, params) {
      var model = OtherData.getWorkOrderType(params).$promise;
      Exception.promise(model, callback, Api_getWorkOrderType, params);
		},
		/**
		 * 取得指定工单类型下的作业类型列表
		 * @param {Object} workOrderTypeId 工单类型Id
		 */
		getWorkCategory: function(callback, params) {
      var model = OtherData.getWorkCategory(params).$promise;
      Exception.promise(model, callback, Api_getWorkCategory, params);
		},
		/**
		 * 取得所有的工单状态
		 */
		getWorkStatus: function(callback, params) {
      var model = OtherData.getWorkStatus(params).$promise;
      Exception.promise(model, callback, Api_getWorkStatus, params);
		},
		/**
		 * 取得故障原因列表
		 * @param {Object} callback
		 * @param {Object} params
		 */
		getFaultCauseList: function(callback, params) {
      var model = OtherData.getFaultCauseList(params).$promise;
      Exception.promise(model, callback, Api_getFaultCauseList, params);
		},
		/**
		 * 取得指定用户所属的项目列表
		 * @param {Object} callback
		 * @param {Object} params
		 */
		getProjectListByUserId: function(callback) {
      var model = OtherData.getProjectListByUserId().$promise;
      Exception.promise(model, callback, Api_getProjectListByUserId, {});
		}
	};
});
