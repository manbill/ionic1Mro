var API_SUCCESS = "00000";

/**
 * baseUrl: Api访问路径
 */

var baseUrl = ""; //本地

var baseUrl = 'http://192.168.1.101:8080/EamApi'; // 上海manbiao url
// var baseUrl = "http://10.158.150.27:8081/EamApi";//tony
// var baseUrl = 'http://10.221.120.43:8100'; // 上海manbiao url

//http://localhost:8080/eam-web/main.htm
// var baseUrl = "http://10.54.14.100:8080/EamApi";//sunbin 机器地址
// var baseUrl = "http://192.168.199.129:8080/EamApi";//sunbin 机器地址 测试库存查询

// var baseUrl = "http://10.54.12.123:8080/EamApi";//青岛 服务器地址

var baseUrl='https://mroqas.shanghai-electric.com/eam-web/EamApi';//公网
// var baseUrl='http://10.158.167.4:8081/EamApi';
// var baseUrl='http://10.54.12.123:8080/EamApi';
// var baseUrl='http://10.54.11.24:8080/eam-web/EamApi';//客户打包地址
// var baseUrl='http://10.54.134.64:8080/EamApi';//sec
// var baseUrl='http://192.168.1.101:8080/EamApi';//笔记本电脑后台
// var baseUrl='http://192.168.199.144:8080/EamApi';//国清笔记本后台
var isDebug = true; //开发过程使用
var DB_NAME = "eam_20161019.db";
var VERSION_ID = "0.0.2";

//constant
var SCROLL_INFINITE_COMPLETE = "scroll.infiniteScrollComplete";
var SCROLL_REFRESH_COMPLETE = "scroll.refreshComplete";
var CFPLOADINGBAR_REFRESHCOMPLETED = "cfpLoadingBar:refreshCompleted";
var SAVE_WORK_TOTAL_HOUR_EVENT = 'saveWorkTotalHourEvent';
var SAVE_WORK_TOTAL_HOUR_EVENT_COMPLETE = 'saveWorkTotalHourEventComplete';
var STOP_RUNNING_SYNC_EVENT = "stopRunningSyncEvent";
var REFRESH_WORK_HOURS_LIST_EVENT = "REFRESH_WORK_HOURS_LIST_EVENT";
var INFINITE_TIME = 500;
var UPLOAD_ORDER_FAIL_ERROR_TYPES={
  MIT_ORDER_UPLOAD_ERROR_TYPE:'mit_order_upload_error_type',
  FAULT_ORDER_UPLOAD_ERROR_TYPE:'fault_order_upload_error_type',
  XIAO_KU_FAIL_ERROR_TYPE:'xiao_ku_fail_error_type',//物料销库失败
  NETWORK_FAIL_ERROR_TYPE:'network_fail_error_type'//网络中断
};
var AttachedFileSources = {
  workorder_detail_source: 1, // 工单详情源
  workorder_checklist_source: 2, // 工单点检表源
  project_info_source: 3, // 项目信息源
  material_info_source: 4, // 物料图片
  manual_info_source: 5, // 作业指导书图片
  maintainplan_info_source: 6, // 定维计划源（安装计划/技改计划共用）
  transferorder_info_source: 8, // 调拨单源
  problem_report_source: 7, // 问题报告上传文件
  constructplan_info_source: 9, // 安装计划源
  transplan_info_source: 10, // 技改计划源
  workhours_info_source: 11, // 工时填报附件
  proj_manual_info_source: 12, //项目作业指导书图片
  shippingorder_info_source: 13, // 发货单
  goods_receipt_info_source: 14, // 收货单
  handledamage_info_source: 17, // 损坏件
  equipment_create_source: 19, // 设备创建
  overhaul_source: 15, // 技改准备附件
  equipmentformachine_info_source: 18, // 设备变更--添加设备
  problem_report_deal_source: 20 // 问题报告处理结果上传文件
};

/**
 * 定维任务的状态呢在此修改即可
 * @type {{taskStatus: {unreceived: number, received: number, processing: number, pause: number, finishedUnaudited: number, completed: number}}}
 */
//本地数据库查询 每页数据有 5 条
var itemsPerPage = "5";
var maintainTask = {
  taskStatus: {
    unreceived: "139", //未接受
    received: "140", //已接受
    processing: "141", //处理中
    finishedUnaudited: "142", //已完工待确认
    completed: "143", //确认完工
    pause: "144" //暂停
  },
  assignStatus: {
    pendingAssign: "136", //待分派
    assigned: "137", //已分派
    accepted: "138" //已接受
  }
};
Date.prototype.format = function(format) {
  var o = {
    "M+": this.getMonth() + 1, //month
    "d+": this.getDate(), //day
    "h+": this.getHours(), //hour
    "m+": this.getMinutes(), //minute
    "s+": this.getSeconds(), //second
    "q+": Math.floor((this.getMonth() + 3) / 3), //quarter
    "S": this.getMilliseconds() //millisecond
  };
  if (/(y+)/.test(format)) format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (var k in o)
    if (new RegExp("(" + k + ")").test(format))
      format = format.replace(RegExp.$1,
        RegExp.$1.length == 1 ? o[k] :
        ("00" + o[k]).substr(("" + o[k]).length));
  return format;
};



// $rootScope.goBack = function () {
//   $rootScope.$ionicGoBack();
// };
