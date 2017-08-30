/**
 * 所需物料服务
 */
starter.factory('MaterialRequest', function(WorkOrderApi, DataCache, Popup, $rootScope) {
	return {

		/**
		 * 判断有无离线缓存数据
		 * @param {Object} orderId
		 */
		hasCacheData: function(orderId) {
			if ($rootScope.isOnline) {
				var data = DataCache.getMaterielRequest(orderId);
				if (data == null || data.length == 0) {
					return false;
				} else {
					return true;
				}
			} else {
				return false;
			}
		},

		/**
		 * 取得物料请求数据
		 * @param {Object} callback
		 * @param {Object} params
		 */
		getMaterialRequest: function(callback, params) {
			WorkOrderApi.getMaterielRequest(function(resp) {
				var cacheData = DataCache.getMaterielRequest(params.orderId);
				if (resp.success) {
					if (!$rootScope.isOnline && cacheData != null && resp.data != null) {
						var deleteArr = [];
						for (var i = 0; i < cacheData.length; i++) {
							for (var j = 0; j < resp.data.length; j++) {
								if (resp.data[j].materielRqstId == cacheData[i].materielRqstId) {
									deleteArr.push(j);
								}
							}
						}
						for (var i = 0; i < deleteArr.length; i++) {
							resp.data.splice(deleteArr[i], 1);
						}
					}
				} else {
					resp.success = true;
					resp.data = [];
				}
				if (cacheData != null) {
					for (var i = 0; i < cacheData.length; i++) {
						if (!cacheData[i].delete) {
							resp.data.unshift(cacheData[i]);
						}
					}
				}
				if ($.isFunction(callback)) {
					callback(resp);
				}
			}, params);
		},

		/**
		 * 保存物料请求在本地缓存
		 * @param {Object} callback 回调函数
		 * @param {Object} params
		 */
		saveMaterialRequest: function(callback, params, orderId) {
			WorkOrderApi.saveMaterielRequest(function(resp) {
				if (!$rootScope.isOnline) {
					var dt = {};
					dt.success = true;
					if(params.materielRqsts && params.materielRqsts.length >0){
						for(var i=0;i<params.materielRqsts.length;i++){
							DataCache.saveMaterielRequest(params.materielRqsts[i], orderId);
						}
					}
					Popup.loadMsg("因网络不通，数据暂保存在手机本地。", 2000, function() {
						callback(dt);
					});
				} else {
					callback(resp);
				}
			}, params);
		},
		updateMaterielRequest: function(callback, params, orderId) {
			WorkOrderApi.updateMaterielRequest(function(resp) {
				if (!$rootScope.isOnline) {
					var dt = {};
					dt.success = true;
					DataCache.saveMaterielRequest(params, orderId);
					Popup.loadMsg("因网络不通，数据暂保存在手机本地。", 2000, function() {
						callback(dt);
					});
				} else {
					callback(resp);
				}
			}, {
             	"materielRqstId":params.materielRqstId,
             	"materielId":params.materielId,
             	"count":params.count,
             	"unitId":params.unitId
             });
		},

		/**
		 * 删除物料请求
		 * @param {Object} callback
		 * @param {Object} item
		 * @param {Object} orderId
		 */
		deleteMaterialRequest: function(callback, item, orderId) {
			if (item.cacheId && !item.materielRqstId) {
				DataCache.removeMaterielRequest(item, orderId);
				var ret = {};
				ret.success = true;
				callback(ret);
			} else {
				WorkOrderApi.delMaterielRqst(function(resp) {
					if (!$rootScope.isOnline) {
						var dt = {};
						dt.success = true;
						DataCache.removeMaterielRequest(item, orderId);

						Popup.loadMsg("因网络不通，数据暂保存在手机本地。", 2000, function() {
							callback(dt);
						});
					} else {
						callback(resp);
					}
				}, item.materielRqstId);
			}
		},


		/**
		 * 清除指定工单的本地物料请求缓存
		 * @param {Object} callback 回调函数
		 * @param {Object} orderId 工单Id
		 */
		clearCacheData: function(callback, orderId) {
			DataCache.clearMaterielRequest(orderId);
			callback(true);
		},

		/**
		 * 同步指定工单的物料请求数据到服务器
		 * @param {Object} orderId
		 */
		synchronizeMaterielRequest: function(callback, orderId) {
			var data = DataCache.getMaterielRequest(orderId);
			
			//增加的数据
			var addDatas = [];
			//需修改的数据
			var updateDatas = [];
			//要删除的数据
			var deleteDatas = [];
			if(data != null){
				for(var i=0;i<data.length;i++){
					if(data[i].delete){
						deleteDatas.push(data[i]);
					}else if(data[i].timeSheetId){
						updateDatas.push(data[i]);
					}else{
						addDatas.push(data[i]);
					}
				}
			}
			
			//同步到服务器
			/*WorkOrderApi.synchronizeMeterielRqst(function(resp){
				DataCache.clearMaterielRequest(orderId);
				callback(resp.success);
			},{
				addDatas:addDatas,
				updateDatas:updateDatas,
				deleteDatas:deleteDatas
			});*/
			
			
			DataCache.clearMaterielRequest(orderId);
			callback(true);
		}
	};
});