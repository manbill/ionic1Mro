/**
 * 存放常量信息
 */
starter.factory('Store', function(OtherApi,Storage) {
  /**
   *  149	pause_reason	现场因素
      150	pause_reason	备件环节
      151	pause_reason	技术环节
      152	pause_reason	业主因素
      153	pause_reason	天气因素
     */
  var pauseReasons =[
    {
      "isChecked":false,
      "resultCode":"149",
      "desc":"现场因素"
    },{
      "isChecked":false,
      "resultCode":"150",
      "desc":"备件环节"
    },{
      "isChecked":false,
      "resultCode":"151",
      "desc":"技术环节"
    },{
      "isChecked":false,
      "resultCode":"152",
      "desc":"业主因素"
    },{
      "isChecked":false,
      "resultCode":"153",
      "desc":"天气因素"
    }
  ];
	//当前工单信息列表
	var currentWorerOrderInfo = [];
  var workAnchors=[
    {
      "anchorId": "88",
      "value": "半年维护"
    } ,
    {
      "anchorId": "89",
      "value": "全年维护"
    }
  ];

  var workAnchorsOfNotification=[
    {
      "anchorId": "88",
      "value": "半年维护"
    } ,
    {
      "anchorId": "89",
      "value": "全年维护"
    }
  ];

	var workOrdertypes = [{
		"key": "1",
		"value": "工程期作业"
	}, {
		"key": "2",
		"value": "服务期作业"
	}, {
		"key": "3",
		"value": "整改/技改"
	}, {
		"key": "4",
		"value": "风机故障"
	}, {
		"key": "5",
		"value": "人工填报故障"
	}];
	var workStatuss = [
		{
			"key": "41",
			"value": "处理中"
		}, {
			"key": "66",
			"value": "待审核"
		}, {
			"key": "42",
			"value": "工单关闭"
		}, {
      "key": "43",
      "value": "已删除"
    }
	];
	var planWorkType = {
		"10": "基础浇灌",
		"11": "到货验收",
		"12": "安装指导",
		"13": "静态调试",
		"14": "送电检查",
		"15": "并网调试",
		"16": "试运行",
		"17": "500小时维护",
		"18": "半年维护",
		"19": "全年维护",
		"20": "最终验收"
	};

	var repairType = {
		"61": "维修设备",
		"60": "更换设备"
	};
	var faultSource = [{
		"key": "37",
		"value": "风云系统"
	}, {
		"key": "38",
		"value": "手工工单"
	}];

	var causeCategories = [{
		"0": "现场"
	}, {
		"1": "业主"
	}, {
		"2": "天气"
	}];
	var areas = []; //区域列表
	var faultCauses = []; //故障原因列表
	var ownerProject = []; //用户所属的项目列表

  var assignStatus = [{
    "key": maintainTask.assignStatus.pendingAssign,
    "value": "待分派"

  }, {
    "key": maintainTask.assignStatus.assigned,
    "value": "已分派"
  }, {
    "key": maintainTask.assignStatus.accepted,
    "value": "已接受"
  }];
  var operateAssignStatus = [{
    "136": "分派"
  }, {
    "137": "修改"
  }, {
    "138": ""
  }, {
    "139": ""
  }];
  var taskStatus = [{
    "key": maintainTask.taskStatus.unreceived,
    "value": "未接受"
  }, {
    "key": maintainTask.taskStatus.received,
    "value": "已接受"
  }, {
    "key": maintainTask.taskStatus.processing,
    "value": "处理中"
  }, {
    "key": maintainTask.taskStatus.finishedUnaudited,
    "value": "已完工待确认"
  }, {
    "key": maintainTask.taskStatus.completed,
    "value": "确认完工"
  }, {
    "key": maintainTask.taskStatus.pause,
    "value": "暂停"
  }];
  var operateTaskStatus = [{
    "139": "接受任务"
  }, {
    "140": "开始任务"
  }, {
    "141": ""
  }, {
    "142": ""
  }];

//定维任务 筛选条件 参数
	var queryParams = {
		"projectName": {
			"key": "projectName",
			"value": "projectNameTask"
		},
		"workorderId": {
			"key" : "workorderId",
			"value" : "taskIdTask"
		},
		"projectId" :{
			"key" :"taskIdTask",
			"value" : "machineIdTask"
		},
		"workTypeId" : {
			"key" : "workTypeId",
			"value" : "anchorTask"
		},
		"positionId" : {
			"key" : "positionId",
			"value" : "statusTask"
		},
		"planBegindate" : {
			"key" : "planBegindate",
			"value" : "planBeginDateTask"
		},
		"planEnddate" : {
			"key" : "planEnddate",
			"value" : "planEndDateTask"
		}
	};
	function delWorkOrderInfo(orderId) {
		for (var i = 0; i < currentWorerOrderInfo.length; i++) {
			if (currentWorerOrderInfo[i].orderId == orderId) {
				currentWorerOrderInfo.splice(i, 1);
				break;
			}
		}
	}

	var service = {};
  service.getPauseReasons=function () {
    return pauseReasons;
  };
	service.getAreas = function() {
			if (areas.length == 0) {
				OtherApi.getAllArea(function(resp) {
					if (resp.success) {
						areas = resp.data;
					}
				});
			}
			return areas;
		},
		service.getcauseCategory = function(key) {
			for (var i = 0; i < causeCategories.length; i++) {
				var causeCategory = causeCategories[i];
				//console.log(causeCategory[key]);
				if (!!causeCategory[key]) {
					return causeCategory[key];
				}
			}
		},
		service.getWorkOrdertypes = function() {
			/*OtherApi.getWorkOrderType(function(resp) {
				console.log(resp);
			}, {});*/
			return workOrdertypes;
		},
		service.getWorkOrderTypeName = function(orderTypeId) {
			for (var i = 0; i < workOrdertypes.length; i++) {
				if (workOrdertypes[i].key == orderTypeId) {
					return workOrdertypes[i].value;
				}
			}
			return "未知";
		},
		/**
		 * 返回工单状态列表
		 */
		service.getWorkStatuss = function() {
			return workStatuss;
		},
		/**
		 * 根据状态key ，取得状态value
		 * @param {Object} status
		 */
		service.getWorkOrderStatus = function(status) {
			for (var i = 0; i < workStatuss.length; i++) {
				if (workStatuss[i].key == status) {
					return workStatuss[i].value;
				}
			}
			return "未知";
		},
		/**
		 * 返回作业类型
		 */
		service.getPlanWorkType = function() {
			return planWorkType;
		},
		/**
		 * 返回维修类型列表
		 */
		service.getRepairType = function() {
			return repairType;
		},
		/**
		 * 设置当前的工单信息
		 * @param {Object} order
		 */
		service.setWorkOrderInfo = function(order) {
			if(order){
				delWorkOrderInfo(order.orderId);
				currentWorerOrderInfo.push(order);
			}
		},
		/**
		 * 删除指定的工单
		 * @param {Object} orderId
		 */
		service.delWorkOrderInfo = function(orderId) {
			delWorkOrderInfo(orderId);
		},
		/**
		 * 取得指定的工单号的工单信息
		 * @param {Object} orderId
		 */
		service.getWorkOrderInfo = function(orderId) {
			for (var i = 0; i < currentWorerOrderInfo.length; i++) {
				if (currentWorerOrderInfo[i].orderId == orderId) {
					return currentWorerOrderInfo[i];
				}
			}
			return null;
		},
		/**
		 * 取得故障原因列表
		 */
		service.getFaultCauses = function() {
			if (faultCauses.length == 0) {
				OtherApi.getFaultCauseList(function(resp) {
					if (resp.success) {
						faultCauses = resp.data;
					}
				}, {});
			} else {
				return faultCauses;
			}
		},

		/**
		 * 根据key取得故障原因
		 */
		service.getFaultCause = function(key) {
			if (faultCauses.length > 0) {
				for(var i =0;i<faultCauses.length;i++){
					if(faultCauses[i].key == key){
						return faultCauses[i].value;
					}
				}
			}
		},
		/**
		 * 取得用户所属的项目列表
		 */
		service.getProjectList = function() {
      ownerProject=Storage.getProjects();
			return ownerProject;

		},
		/**
		 * 取得故障工单列表
		 */
		service.getFaultSources = function() {
			return faultSource;
		},
		/**
		 * 取得故障工单列表
		 */
		service.getFaultSource = function(source) {
			for (var i = 0; i < faultSource.length; i++) {
				if (faultSource[i].key == source) {
					return faultSource[i].value;
				}
			}
		},
    service.getAssignStauts = function(key) {
      if(!key){
        return assignStatus;
      }
      for (var i = 0; i < assignStatus.length; i++) {
        var assignStatusDesc = assignStatus[i].key;
        if (assignStatusDesc == key) {
          return assignStatus[i].value;
        }
      }
    },
      service.getOperateAssignStauts = function(key) {
        for (var i = 0; i < operateAssignStatus.length; i++) {
          var assignStatusOperateDesc = operateAssignStatus[i];
          if (!!assignStatusOperateDesc[key]) {
            return assignStatusOperateDesc[key];
          }
        }
      },
      service.getTaskStatusByStatusCode = function(key) {
        for (var i = 0; i < taskStatus.length; i++) {
          var taskStatusKey = taskStatus[i].key;
          if (taskStatusKey == key) {
            return taskStatus[i].value;
          }else return key;
        }
      };
      service.getAllTaskStatus=function () {
        return taskStatus;
      };
      service.getOperateTaskStatus = function(key) {
        for (var i = 0; i < operateTaskStatus.length; i++) {
          var taskStatusOperateDesc = operateTaskStatus[i];
          if (!!taskStatusOperateDesc[key]) {
            return taskStatusOperateDesc[key];
          }
        }
      };
		/**
		 * 初使化
		 */
	service.init = function() {
		service.getProjectList();
	};
  service.getWorkAnchors=function () {
    return workAnchors;
  };
  service.getWorkAnchorsOfNotification = function () {
    return workAnchorsOfNotification;
  };
	return service;
});
