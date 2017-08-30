/**
 * 人员报工服务
 */
starter.factory('EmpTimeSheet', function(WorkOrderApi, DataCache, Popup, $rootScope) {
	return {
		/**
		 * 判断有无离线缓存数据
		 * @param {Object} orderId
		 */
		hasCacheData: function(orderId) {
			if ($rootScope.isOnline) {
				var data = DataCache.getEmpTimeSheetList(orderId);
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
		 * 取得人员报工列表
		 * @param {Object} callback
		 * @param {Object} params
		 */
		getEmpTimeSheetList: function(callback, params) {
			WorkOrderApi.getEmpTimeSheetList(function(resp) {
				var cacheData = DataCache.getEmpTimeSheetList(params.orderId);
				if (resp.success) {
					if (!$rootScope.isOnline && cacheData != null && resp.data != null) {
						var deleteArr = [];
						for (var i = 0; i < cacheData.length; i++) {
							for (var j = 0; j < resp.data.length; j++) {
								if (resp.data[j].timeSheetId == cacheData[i].timeSheetId) {
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
		 * 保存人员报工
		 * @param {Object} callback
		 * @param {Object} params
		 * @param {Object} orderId
		 */
		saveEmpTimeSheetList: function(callback, params, orderId) {
			//var pms = params;
			//console.log(pms);
			if (params.endTime instanceof Date && params.beginTime instanceof Date) {
				//params.endTime = params.endTime.format('yyyyMMdd');
				//params.beginTime = params.beginTime.format('yyyyMMdd');
				//console.log(params.endTime);
				//console.log(params.endTime.format("yyyyMMdd"));

			}
			var pms = {};
			pms.timeSheetId = params.timeSheetId;
			pms.objectName = params.objectName;
			pms.empName = params.objectName;
			pms.type = params.type;
			pms.beginTime = params.beginTime.getTime();
			pms.endTime = params.endTime.getTime();
			pms.description = params.description;
			pms.empId = params.empId;
			var timeSheepModel = {};
			timeSheepModel.timeSheet = pms;
			timeSheepModel.orderId = params.orderId;
			WorkOrderApi.saveEmpTimeSheetList(function(resp) {
				if (!$rootScope.isOnline) {
					var dt = {};
					dt.success = true;
          params.beginTime=new Date(Date.parse(params.beginTime)).format("yyyy-MM-dd hh:mm:ss");
          params.endTime=new Date(Date.parse(params.endTime)).format("yyyy-MM-dd hh:mm:ss");
					DataCache.saveEmpTimeSheet(params, orderId);

					Popup.loadMsg("因网络不通，数据暂保存在手机本地。", 2000, function() {
						callback(dt);
					});
				} else {
					callback(resp);
				}
			}, timeSheepModel);
		},

		/**
		 * 删除人员报工
		 * @param {Object} callback
		 * @param {Object} item
		 * @param {Object} orderId
		 */
		deleteEmpTimeSheetList: function(callback, item, orderId) {
			if (item.cacheId && !item.timeSheetId) {
				DataCache.removeEmpTimeSheet(item, orderId);
				var ret = {};
				ret.success = true;
				callback(ret);
			} else {
				WorkOrderApi.deleteEmpTimeSheet(function(resp) {
					if (!$rootScope.isOnline) {
						var dt = {};
						dt.success = true;
						DataCache.removeEmpTimeSheet(item, orderId);

						Popup.loadMsg("因网络不通，数据暂保存在手机本地。", 2000, function() {
							callback(dt);
						});
					} else {
						callback(resp);
					}
				}, item);
			}
		},

		/**
		 * 同步指定工单下的人员报工数据到服务器
		 * @param {Object} callback
		 * @param {Object} orderId
		 */
		synchronizeEmpTimeSheet: function(callback, orderId) {
			var data = DataCache.getEmpTimeSheetList(orderId);

			//增加的数据
			var addEmpSheet = [];
			//需修改的数据
			var updateEmpSheet = [];
			//要删除的数据
			var deleteEmpSheet = [];
			if (data != null) {
				for (var i = 0; i < data.length; i++) {
					if (data[i].delete) {
						deleteEmpSheet.push(data[i]);
					} else if (data[i].timeSheetId) {
						updateEmpSheet.push(data[i]);
					} else {
						addEmpSheet.push(data[i]);
					}
				}
			}

			//同步到服务器
			/*WorkOrderApi.synchronizeTimeSheetInfo(function(resp){
				DataCache.clearEmpTimeSheet(orderId);
				callback(resp.success);
			},{
				addDatas:addEmpSheet,
				updateDatas:updateEmpSheet,
				deleteDatas:deleteEmpSheet
			});*/

			DataCache.clearEmpTimeSheet(orderId);
			callback(true);
		},

		/**
		 * 清空指定工单下的人员报工缓存数据
		 * @param {Object} orderId
		 */
		clearCacheData: function(callback, orderId) {
			DataCache.clearEmpTimeSheet();
			callback(true);
		}
	};
});
