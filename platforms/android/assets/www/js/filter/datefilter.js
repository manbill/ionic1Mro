starter.filter("Infydate", function () {
  return function (data) {
    if (!data) {
      return null;
    }
    if (isNaN(data)) {
      return data.substring(0, 10);
    }
    if (angular.isDate(data)) {
      return data.format("yyyy-MM-dd");
    }
    return new Date(parseInt(data)).format("yyyy-MM-dd");
  }
});
starter.filter("removeFloat", function () {
  return function (data) {
    return parseFloat(data);
  }
});
starter.filter("WorkHoursInfydate", function () {
  return function (data) {
    if (!data) {
      return null;
    }
    if (typeof data === 'string' && data.indexOf('-') >= 0) {
      return data.substring(0, 16);
    }
    if (angular.isDate(data)) {
      return data.format("yyyy-MM-dd hh:mm");
    }
    return new Date(data).format("yyyy-MM-dd hh:mm");
  };
});

starter.filter("FaultBeginInfydate", function () {
    return function (data) {
        if (!data) {
            return null;
        }
        if (typeof data === 'string' && data.indexOf('-') >= 0) {
            return data.substring(0, 16);
        }
        if (angular.isDate(data)) {
            return data.format("yyyy-MM-dd");
        }
        return new Date(data).format("yyyy-MM-dd");
    };
});

starter.filter("formatPlanWorkType", function (Store) {
  return function (planWorkType) {
    if (Store.getPlanWorkType()[planWorkType] == undefined) {
      return "基础浇灌";
    }
    return Store.getPlanWorkType()[planWorkType];
  }
});
starter.filter("formatRepairType", function (Store) {
  return function (repairType) {
    return Store.getRepairType()[repairType];
  }
});
starter.filter("formatOrderType", function () {
  return function (key) {
  }
}).filter("formatOrderStatus", function (Store) {
  return function (orderType) {
    return Store.getWorkOrderStatus(orderType);
  }
}).filter("formatFaultSource", function (Store) {
  return function (faultSource) {
    return Store.getFaultSource(faultSource);
  }
}).filter("formatFaultCause", function (Store) {
  return function (key) {
    return Store.getFaultCause(key);
  }
}).filter("formatAssignStatus", function () {
  return function (key) {
  }
}).filter("formatOperateAssignStatus", function (Store) {
  return function (key) {
    return Store.getOperateAssignStauts(key);
  }
}).filter("formatTaskStatus", function () {
  return function (key) {
    return key;
  }
}).filter("formatOperateTaskStatus", function () {
  return function (key) {
    if (key == 139) return "接受任务";
    if (key == 140) return "开始任务";
    return key;
  }
}).filter("filterWorkAnchor", function () {
  return function (key) {
    if (Number.isNaN(key)) {
      return key;
    }
    return key;
  }
}).filter("formatVerifyResult", function () {
  return function (key) {
    return 1 == key ? "通过" : "未通过";
  }
}).filter("formatGuaranteePeriod", function () {
  return function (guaranteePeriod) {
    if (!guaranteePeriod || isNaN(guaranteePeriod)) {
      return;
    }
    return parseFloat(guaranteePeriod) / 2;
  }
}).filter("faultSourceFilter", function () {
  return function (key) {
    return 1 == key || 37 == key ? "风云故障" : (key == 2 || 38 == key) ? "人工填报故障" : null;
  }
});

