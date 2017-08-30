/**
 * 缓存应用数据
 * {
 *   "USER_TOKEN":***,//访问令牌
 * 	 "data_cache":{//存放服务器取到的数据
 * 		key:apiUrl + params
 *		value:data
 *   }
 * 	 "data_local_cache":{//存放临时保存的数据（之后用户可选择与服务器同步）
 * 	    "order":[
 *			{
 *				orderId:1,//如果是"T"开始的表示是创建在缓存的工单
 *				data:{
 *					EmpTimeSheetList:[//人员报工数据缓存
 *						{
 *							cacheId:125421551,//缓存Id
 *  						delete:true,//删除标记
 * 							timeSheetId:10,//主键
 * 							...
 *						}
 *					],
 *					WokerOrderMateriel:[],//所需物料数据缓存
 *					CheckList:[],//点检表数据缓存
 *					ScadaInfo:[],//scadsa信息详情
 *					MaterielRequest:[],//物料请求信息缓存
 * 					RecordRepair:[],//维修记录
 * 					handOrder:{}//手工工单
 *				}
 *			}
 *		]
 *   }
 * }
 */
starter.factory('DataCache', function(Storage,$rootScope) {
  var api_request_time_key = "api_request_time_cache";
	var data_key = "data_cache";
	var data_local_key = "data_local_cache";

	var cache_empTimeSheetList = "EmpTimeSheetList"; //人员报工
	var cache_orderMateriel = "WokerOrderMateriel"; //所需物料
	var cache_checkList = "CheckList"; //点检表
	var cache_scadaInfo = "ScadaInfo"; //SCADA工单详情信息
	var cache_handOrder = "HandOrder"; //SCADA工单详情信息
	var cache_materielRequest = "MaterielRequest"; //物料请求信息
	var cache_repairRecord = "RepairRecord"; //设备维修

	function set(key, data) {
		var dt = Storage.get(data_key);
		if (dt != null && dt != '') {
			dt[key] = data;
			Storage.set(data_key, dt);
		} else {
			Storage.set(data_key, {
				key: data
			});
		}
	}

	function get(key) {
		var data = Storage.get(data_key);
		if (data != null && data != '') {
			return data[key];
		}
		return null;
	}

	function setLocalCache(key, data, orderId) {
		var dt = Storage.get(data_local_key);
		if (dt == null || dt == '') {
			dt = {};
			dt.order = [];
		}

		var index = -1;
		for (var i = 0; i < dt.order.length; i++) {
			if (dt.order[i].orderId == orderId) {
				index = i;
				break;
			}
		}

		if (index == -1) {
			dt.order.push({
				"orderId": orderId,
				"data":{}
			});
			index = dt.order.length - 1;
		}

		if(dt.order[index].data[key] == null){
			dt.order[index].data[key]=[];
		}

		if (data instanceof Array) {
			for (var i = 0; i < data.length; i++) {
				data[i].cacheId = (new Date()).getTime();
			}
			dt.order[index].data[key] = dt.order[index].data[key].concat(data);
		} else {
			data.cacheId = (new Date()).getTime();
			dt.order[index].data[key].push(data);
		}

		Storage.set(data_local_key, dt);
	}

	/**
	 * 清空指定Key的缓存
	 * @param {Object} key
	 */
	function clearLocalCaches(key, orderId) {
		var cacheData = Storage.get(data_local_key);
		var index = -1;
		if (cacheData != null && cacheData.order != null) {
			for (var i = 0; i < cacheData.order.length; i++) {
				if (cacheData.order[i].orderId == orderId) {
					index = i;
					break;
				}
			}
			if(index != -1){
				cacheData.order[index].data[key] = [];
				Storage.set(data_local_key, cacheData);
			}
		}
	}

	function updateLocalCache(key, cacheId, obj, orderId) {
		var data = getLocalCache(key, orderId);
		if (data != null) {
			var index = 0;
			for (var i = 0; i < data.length; i++) {
				if (data[i].cacheId == cacheId) {
					data[i] = obj;
					break;
				}
			}

			var cacheData = Storage.get(data_local_key);
			for (var i = 0; i < cacheData.order.length; i++) {
				if (cacheData.order[i].orderId == orderId) {
					cacheData.order[i].data[key] = data;
				}
			}
			Storage.set(data_local_key, cacheData);
		}
	}

	function getLocalCache(key, orderId) {
		var data = Storage.get(data_local_key);

		if (data != null && data.order != null) {
			for (var i = 0; i < data.order.length; i++) {
				if (data.order[i].orderId == orderId) {
					return data.order[i].data[key];
				}
			}
		}

		return null;
	}

	function reomveLocalCache(key, cacheId, orderId) {
		var data = getLocalCache(key, orderId);
		if (data != null) {
			var index = 0;
			for (var i = 0; i < data.length; i++) {
				if (data[i].cacheId == cacheId) {
					index = i;
					break;
				}
			}
			data.splice(index, 1);

			var cacheData = Storage.get(data_local_key);

			for (var i = 0; i < cacheData.order.length; i++) {
				if (cacheData.order[i].orderId == orderId) {
					cacheData.order[i].data[key] = data;
				}
			}

			Storage.set(data_local_key, cacheData);
		}
	}

	return {
		set: function(key, option, data) {
			if (!!option) {
				key += window.JSON.stringify(option);
			}
			return set(key, data);
		},
		get: function(key, option) {
			if (!!option) {
				key += window.JSON.stringify(option);
			}
			return get(key);
		},
		/**
		 * 清空全部缓存
		 */
		clearCache : function(){
			Storage.remove(data_key,null);
			Storage.remove(data_local_key,null);
		},
		//保存人员报工信息在本地
		saveEmpTimeSheet: function(params, orderId) {
			if (params.cacheId) {
				//本地修改
				updateLocalCache(cache_empTimeSheetList, params.cacheId, params, orderId);
			} else {
				setLocalCache(cache_empTimeSheetList, params, orderId);
			}
		},

		/**
		 * 取得本地缓存的人员报工信息
		 */
		getEmpTimeSheetList: function(orderId) {
			return getLocalCache(cache_empTimeSheetList, orderId);
		},

		/**
		 * 移除本地缓存中指定的人员信息
		 * @param {Object} index
		 */
		removeEmpTimeSheet: function(emp, orderId) {
			if (emp.timeSheetId) {
				emp.delete = true;
				if (emp.cacheId) {
					//变更
					updateLocalCache(cache_empTimeSheetList, emp.cacheId, emp, orderId);
				} else {
					//加
					setLocalCache(cache_empTimeSheetList, emp, orderId);
				}
			} else {
				//删除
				reomveLocalCache(cache_empTimeSheetList, emp.cacheId, orderId);
			}
		},

		/**
		 * 清除物料的本地缓存
		 */
		clearEmpTimeSheet: function(orderId) {
			clearLocalCaches(cache_empTimeSheetList, orderId);
		},

		/**
		 * 取得本地缓存的物料信息
		 * @param {Object} orderId 工单Id
		 */
		getOrderMateriels: function(orderId) {
			return getLocalCache(cache_orderMateriel, orderId);
		},

		/**
		 * 保存物料信息到本地
		 * @param {Object} materiels 物料List
		 * @param {Object} orderId 工单Id
		 */
		saveOrderMateriels: function(materiels, orderId) {
			clearLocalCaches(cache_orderMateriel, orderId);
			setLocalCache(cache_orderMateriel, materiels, orderId);
		},

		/**
		 * 清除指定工单的本地物料缓存
		 * @param {Object} orderId 工单Id
		 */
		clearOrderMateriels: function(orderId) {
			clearLocalCaches(cache_orderMateriel, orderId);
		},

		/**
		 * 保存SCADA工单信息到本地缓存
		 * @param {Object} params
		 * @param {Object} orderId
		 */
		saveSCADAInfo: function(params, orderId) {
			clearLocalCaches(cache_scadaInfo, orderId);
			setLocalCache(cache_scadaInfo, params, orderId);
		},

		/**
		 * 从本地缓存下取得指定orderId下的SCADA工单信息
		 * @param {Object} orderId
		 */
		getSCADAInfo: function(orderId) {
			var data = getLocalCache(cache_scadaInfo, orderId);
			if (data != null && data.length ==1) {
				return data[0];
			}
			return null;
		},

		/**
		 * 清空本地缓存下的SCADA信息
		 * @param {Object} orderId
		 */
		clearSCADAInfo: function(orderId) {
			clearLocalCaches(cache_scadaInfo, orderId);
		},

		//-------------------------物料请求缓存-------------------------------

		/**
		 * 保存物料请求信息
		 * @param {Object} params
		 * @param {Object} orderId
		 */
		saveMaterielRequest: function(params, orderId) {
			if (params.cacheId) {
				//本地修改
				updateLocalCache(cache_materielRequest, params.cacheId, params, orderId);
			} else {
				setLocalCache(cache_materielRequest, params, orderId);
			}
		},

		/**
		 * 取得本地缓存的物料请求信息
		 */
		getMaterielRequest: function(orderId) {
			return getLocalCache(cache_materielRequest, orderId);
		},

		/**
		 * 移除本地缓存中指定的物料请求信息
		 * @param {Object} index
		 */
		removeMaterielRequest: function(materiel, orderId) {
			if (materiel.materielRqstId) {
				materiel.delete = true;
				if (materiel.cacheId) {
					//变更
					updateLocalCache(cache_materielRequest, materiel.cacheId, materiel, orderId);
				} else {
					//加
					setLocalCache(cache_materielRequest, materiel, orderId);
				}
			} else {
				//删除
				reomveLocalCache(cache_materielRequest, materiel.cacheId, orderId);
			}
		},

		/**
		 * 清除物料的本地缓存
		 */
		clearMaterielRequest: function(orderId) {
			clearLocalCaches(cache_materielRequest, orderId);
		},

		/**
		 * 判断在指定的工单下是否缓存
		 * @param {Object} orderId
		 */
		hasOrderCache : function(orderId){
			if ($rootScope.isOnline) {
				var dt = Storage.get(data_local_key);
				if(dt != null && dt.order !=null && dt.order.length >0){
					var index = -1;
					for(var i = 0;i<dt.order.length;i++){
						if(dt.order[i].orderId == orderId){
							index = i;
							break;
						}
					}
					if(index != -1){
						var data = dt.order[index].data;
						for(var i in data){
							if (data.hasOwnProperty(i)) { //filter,只输出man的私有属性
						    	if(data[i] != null){
						    		return true;
						    	}
						    };
						}
						return false;
					}else{
						return false;
					}
				}
			}else{
				return false;
			}
		},

		/**
		 * 清楚指定工单的缓存
		 * @param {Object} orderId
		 */
		clearOrderCache:function(callback,orderId){
			var dt = Storage.get(data_local_key);
			if(dt != null && dt.order !=null && dt.order.length >0){
				var index = -1;
				for(var i = 0;i<dt.order.length;i++){
					if(dt.order[i].orderId == orderId){
						index = i;
						break;
					}
				}
				if(index != -1){
					dt.order.splice(index, 1);
					Storage.set(data_local_key, dt);
				}
			}
			if(callback != null){
				callback(true);
			}
		},

		//-------------------------设备维修缓存-------------------------------

		//设备维修信息在本地
		saveRepairRecord: function(params, orderId) {
			if (params.cacheId) {
				//本地修改
				updateLocalCache(cache_repairRecord, params.cacheId, params, orderId);
			} else {
				setLocalCache(cache_repairRecord, params, orderId);
			}
		},

		/**
		 * 取得本地缓存的设备维修信息
		 */
		getRepairRecordList: function(orderId) {
			return getLocalCache(cache_repairRecord, orderId);
		},

		/**
		 * 移除本地缓存中指定的设备维修信息
		 * @param {Object} index
		 */
		removeRepairRecord: function(repair, orderId) {
			if (repair.repairRecordId) {
				repair.delete = true;
				if (repair.cacheId) {
					//变更
					updateLocalCache(cache_repairRecord, repair.cacheId, repair, orderId);
				} else {
					//加
					setLocalCache(cache_repairRecord, repair, orderId);
				}
			} else {
				//删除
				reomveLocalCache(cache_repairRecord, repair.cacheId, orderId);
			}
		},

		/**
		 * 保存手工工单信息到本地缓存
		 * @param {Object} params
		 * @param {Object} orderId
		 */
		saveHandOrder: function(params, orderId) {
			if(!orderId){
				//创建临时orderId
				orderId = "T" + (new Date()).getTime();
				params.orderId = orderId;
			}
			clearLocalCaches(cache_handOrder, orderId);
			setLocalCache(cache_handOrder, params, orderId);
		},

		/**
		 * 从本地缓存下取得指定orderId下的手工工单信息
		 * @param {Object} orderId
		 */
		getHandOrder: function(orderId) {
			var data = getLocalCache(cache_handOrder, orderId);
			if (data != null && data.length ==1) {
				return data[0];
			}
			return null;
		},

		/**
		 * 取得本地缓存中创建的故障工单
		 * @param {Object} orderId
		 */
		getFaultOrderList:function(){
			var orders = [];
			var data = Storage.get(data_local_key);
			if (data != null && data.order != null) {
				for (var i = 0; i < data.order.length; i++) {

					if(isNaN(data.order[i].orderId) && data.order[i].orderId.indexOf("T") != -1){
						var handOrder = getLocalCache(cache_handOrder, data.order[i].orderId);
						if (handOrder != null && handOrder.length ==1) {
							orders.push(handOrder[0]);
						}
					}
				}
			}
			return orders;
		},

		/**
		 * 从缓存中移除故障工单
		 */
		removeFaultOrder:function(){
			var data = Storage.get(data_local_key);
			if (data != null && data.order != null) {
				for (var i = 0; i < data.order.length; i++) {
					if(isNaN(data.order[i].orderId) && data.order[i].orderId.indexOf("T") != -1){
						data.order.splice(i,1);
					}
				}
			}
			Storage.set(data_local_key, data);
		},

		/**
		 * 删除故障工单
		 * @param {Object} orderId
		 */
		deleteOrder:function(orderId){
			var data = Storage.get(data_local_key);
			if (data != null && data.order != null) {
				for (var i = 0; i < data.order.length; i++) {
					if(data.order[i].orderId == orderId){
						data.order.splice(i,1);
						break;
					}
				}
			}
			Storage.set(data_local_key, data);
		},
    setApiRequestTime:function(key, data) {
    var dt = Storage.get(api_request_time_key);
    if (dt != null && dt != '') {
      dt[key] = data;
      Storage.set(api_request_time_key, dt);
    } else {
      Storage.set(api_request_time_key, {
        key: data
      });
    }
  },
  getApiRequestTime: function (key) {
    var data = Storage.get(api_request_time_key);
    if (data != null && data != '') {
      return data[key];
    }
    return null;
  }
	};
});
