/**
 *设备树相关的Api访问接口
 */
starter.factory('DeviceTreeApi', function($resource, Exception,$rootScope) {
	var Api_getMachineList = "/api/device/getMachineList.api";
	var Api_getEquipmentsTreeAndDetails = "/api/device/getEquipmentsTreeAndDetails.api";//获取风机设备树以及设备详细信息
	var deviceTree = $resource(baseUrl + Api_getMachineList, {}, {
		getMachineList: { //获取风机列表接口
			method: 'post',
			url: baseUrl + Api_getMachineList
		},
		getEquipmentsTreeAndDetails: {//获取风机设备树以及设备详细信息
			method: 'post',
			url: baseUrl + Api_getEquipmentsTreeAndDetails
		}
	});

	return {
		/**
		 * 获取风机列表
		 * @param {Object} projectId 项目Id
		 * @param {Object} pageNumber 分页数
		 */
		getMachineList: function(callback,params) {
      var model = deviceTree.getMachineList(params).$promise;
      Exception.promise(model,callback, Api_getMachineList,params);
		},
		/**
		 * 获取风机设备树以及设备详细信息
		 * @param callback
		 * @param params
		 */
		getEquipmentsTreeAndDetails: function (callback, params) {
			var model = deviceTree.getEquipmentsTreeAndDetails(params).$promise;
			Exception.promise(model, callback, Api_getEquipmentsTreeAndDetails, params);
		}
	};
});
