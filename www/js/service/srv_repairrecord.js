/**
 * 设备维修服务
 */
starter.factory('RepairRecordService', function(WorkOrderApi, DataCache, Popup, $rootScope) {
	return {
		/**
		 * 判断有无离线缓存数据
		 * @param {Object} orderId
		 */
		hasCacheData: function(orderId) {
			if ($rootScope.isOnline) {
				var data = DataCache.getRepairRecordList(orderId);
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
		 * 取得设备维修列表
		 * @param {Object} callback
		 * @param {Object} params
		 */
		getRepairRecordList: function(callback, params) {
			WorkOrderApi.getRepairRecord(function(resp) {
				var cacheData = DataCache.getRepairRecordList(params.orderId);
				if (resp.success) {
					if (!$rootScope.isOnline && cacheData != null && resp.data != null) {
						var deleteArr = [];
						for (var i = 0; i < cacheData.length; i++) {
							for (var j = 0; j < resp.data.length; j++) {
								if (resp.data[j].repairRecordId == cacheData[i].repairRecordId) {
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
		 * 保存设备维修
		 * @param {Object} callback
		 * @param {Object} params
		 * @param {Object} orderId
		 */
		saveRepairRecord: function(callback, params, orderId) {
			WorkOrderApi.saveRepairRecord(function(resp) {
				if (!$rootScope.isOnline) {
					var dt = {};
					dt.success = true;
					DataCache.saveRepairRecord(params, orderId);

					Popup.loadMsg("因网络不通，数据暂保存在手机本地。", 2000, function() {
						callback(dt);
					});
				} else {
					callback(resp);
				}
			}, params);
		},

		/**
		 * 删除设备维修
		 * @param {Object} callback
		 * @param {Object} item
		 * @param {Object} orderId
		 */
		deleteRepairRecord: function(callback, item, orderId) {
			if (item.cacheId && !item.repairRecordId) {
				DataCache.removeRepairRecord(item, orderId);
				var ret = {};
				ret.success = true;
				callback(ret);
			} else {
				WorkOrderApi.deleteRepairRecord(function(resp) {
					if (!$rootScope.isOnline) {
						var dt = {};
						dt.success = true;
						DataCache.removeRepairRecord(item, orderId);

						Popup.loadMsg("因网络不通，数据暂保存在手机本地。", 2000, function() {
							callback(dt);
						});
					} else {
						callback(resp);
					}
				}, item.repairRecordId);
			}
		}
	};
});