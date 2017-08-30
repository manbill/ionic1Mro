/**
 * 故障工单服务
 */
starter.factory('SCADAOrderDetail', function(WorkOrderApi,DataCache,Popup,$rootScope) {
	return {
		/**
		 * 判断有无离线缓存数据
		 * @param {Object} orderId
		 */
		hasCacheData:function(orderId){
			if($rootScope.isOnline){
				var data = DataCache.getSCADAInfo(orderId);
				if(data == null){
					return false;
				}else{
					return true;
				}
			}else{
				return false;
			}
		},

		/**
		 * 保存SCADA工单在本地缓存
		 * @param {Object} callback 回调函数
		 * @param {Object} params
		 */
		saveSCADAWorkOrder:function(callback, params) {
			WorkOrderApi.saveSCADAWorkOrder(function(resp){
				if(!$rootScope.isOnline){
					var dt ={};
					dt.success = true;
					DataCache.saveSCADAInfo(params,params.orderId);

					Popup.loadMsg("因网络不通，数据暂保存在手机本地。",2000,function(){
						callback(dt);
					});
				}else{
					callback(resp);
				}
			}, {
				"ncr": params.ncr,
				"orderId": params.orderId,
				"subject": params.subject,
				"faultDetailDes": params.faultDetailDes,
				"faultCause": params.faultCause,
				"faultProgressDes": params.faultProgressDes,
				"totalStopTime": params.totalStopTime
			});
		}
	};
});
