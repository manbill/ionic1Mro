Date.prototype.Format = function (fmt) { //author: meizz
  var o = {
    "M+": this.getMonth() + 1, //月份
    "d+": this.getDate(), //日
    "H+": this.getHours(), //小时
    "m+": this.getMinutes(), //分
    "s+": this.getSeconds(), //秒
    "q+": Math.floor((this.getMonth() + 3) / 3), //季度
    "S": this.getMilliseconds() //毫秒
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  return fmt;
};
var DateUtil = {};
DateUtil.searchStartDate=function (date) {
  if(angular.isDate(date)){
    return new Date(date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate());
  }
  if($.isNumeric(date)){
    var temDate = new Date(date);
    var m=temDate.getMonth();
    var d=temDate.getDate();
    var y = temDate.getFullYear();
    return new Date(y+"-"+(m+1)+"-"+d);
  }
};
DateUtil.searchEndDate=function (date) {
  var y;
  var m;
  var d;
  if(angular.isDate(date)){
    y = date.getFullYear();
    m =date.getMonth()+1;
    d = date.getDate();
    var format = y+"-"+m+"-"+d+" 23:59:59.999";
    return new Date(format);
  }
  if($.isNumeric(date)){
    var temDate = new Date(date);
     m=temDate.getMonth()+1;
     d=temDate.getDate();
     y = temDate.getFullYear();
    var format = y+"-"+m+"-"+d+" 23:59:59.999";
    return new Date(format);
  }
};
