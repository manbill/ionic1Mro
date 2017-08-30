/**
 * 所需物料服务
 */
starter.factory('OrderMaterial', function(WorkOrderApi,DataCache,Popup,$rootScope) {
	return {
		
		/**
		 * 判断有无离线缓存数据 
		 * @param {Object} orderId
		 */
		hasCacheData:function(orderId){
			if($rootScope.isOnline){
				var data = DataCache.getOrderMateriels(orderId);
				if(data == null || data.length == 0){
					return false;
				}else{
					return true;
				}
			}else{
				return false;
			}
		},
		
		getCheckMaterialList:function(callback, params){
			WorkOrderApi.getCheckMaterialList(function(resp){
				var cacheData = DataCache.getOrderMateriels(params.orderId);
				if(resp.success){
					if(!$rootScope.isOnline && cacheData != null){
						resp.data = cacheData;
					}
					callback(resp);
				}
			}, params);
		},
		
		/**
		 * 保存物料在本地缓存
		 * @param {Object} callback 回调函数  
		 * @param {Object} params
		 */
		saveCheckMaterialList:function(callback, params) {
			WorkOrderApi.saveCheckMaterialList(function(resp){
				if(!$rootScope.isOnline){
					var dt ={};
					dt.success = true;
					DataCache.saveOrderMateriels(params.materiels,params.orderId);
					
					Popup.loadMsg("因网络不通，数据暂保存在手机本地。",2000,function(){
						callback(dt);
					});
				}else{
					callback(resp);
				}
			}, params);
		},
		
		/**
		 * 同步指定工单的本地物料数据到服务器
		 * @param {Object} orderId
		 */
		synchronizeMaterialList:function(callback,orderId){
			var cacheData = DataCache.getOrderMateriels(orderId);
			WorkOrderApi.getCheckMaterialList(function(resp){
				callback(resp.success);
			},cacheData);
			
			DataCache.clearOrderMateriels(orderId);
			
		},
		
		/**
		 * 清空指定工单下的所需物料缓存数据 
		 * @param {Object} orderId
		 */
		clearCacheData:function(orderId){
			DataCache.clearOrderMateriels(orderId);
		}
	};
});