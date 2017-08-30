/**
 * 定维任务的Api访问接口
 */
starter.factory('SchdleMaintainApi', function ($resource, Exception, DataCache, $rootScope, $state) {
  var Api_checkNetStatus = "/api/maintain/checkNetStatus.api"; //检测网络状态
  var Api_queryNotification = "/api/maintain/queryNotification.api"; //取得定维任务通知单
  var Api_getWorkGuideBookDirectory = "/api/maintain/getWorkGuideBookDirectory.api"; //取得作业指导书目录结构
  var Api_getWorkGuideBookContent = "/api/maintain/getWorkGuideBookContent.api"; //取得作业指导书详细章节内容
  var Api_getTaskDetail = "/api/maintain/getTaskDetail.api"; //取得任务详情
  var Api_saveTaskDetail = "/api/maintain/saveTaskDetail.api"; //保存任务详情
  var Api_getStandardMaterials = "/api/maintain/getStandardMaterials.api"; //取得用料标准
  var Api_createStandardMaterial = "/api/maintain/createStandardMaterial.api"; //新建用料标准
  var Api_deleteStandardMaterial = "/api/maintain/deleteStandardMaterial.api"; //删除用料标准
  var Api_saveStandardMaterial = "/api/maintain/saveStandardMaterial.api"; //保存用料标准
  var Api_updateStandardMaterial = "/api/maintain/updateStandardMaterial.api"; //更新用料标准
  var Api_changeTaskStatus = "/api/maintain/changeTaskStatus.api"; //改变任务状态
  var Api_verifyTask = "/api/maintain/verifyTask.api"; //审核任务
  var Api_getTaskList = "/api/maintain/queryTask.api"; //获取任务列表
  var Api_getAllMaterials = "/api/maintain/getAllMaterials.api"; //取得所有物料
  var Api_getEmployees = "/api/maintain/getEmployees.api"; //取得某个通知单员工列表
  var Api_getMachines = "/api/maintain/getMachines.api"; //取得某个通知单下所有机器号
  var Api_taskAssign = "/api/maintain/assign.api"; //分派任务
  var Api_getInstructorList = "/api/maintain/getWorkGuideFiles.api"; //取得作业指导书
  var Api_uploadPicture = "/api/maintain/uploadCheckListPicture.api"; //上传图片的url
  var Api_downloadFile = "/api/maintain/downloadFile.api"; //下载文件
  var Api_getBatchWorkorderList = "/api/maintain/getBatchWorkorderList.api"; //据时间段批量获取列表数据
  var Api_getWorkorderFullInfoList = "/api/maintain/getWorkorderFullInfoList.api"; //以工单号获取工单所有数据
  var schdleMaintain = $resource(baseUrl + Api_queryNotification, {}, {
    getBatchWorkorderList: {  //据时间段批量获取列表数据
      method: 'post',
      url: baseUrl + Api_getBatchWorkorderList
    },
    getWorkorderFullInfoList: {  //以工单号获取工单所有数据
      method: 'post',
      url: baseUrl + Api_getWorkorderFullInfoList
    },queryNotification: {  //定维任务通知单列表，用于现场经理分派任务
      method: 'post',
      url: baseUrl + Api_queryNotification
    },
    checkNetStatus: {  //检测网络状态
      method: 'get',
      url: baseUrl + Api_checkNetStatus
    },
    getWorkGuideBookDirectory: {
      method: 'post',
      url: baseUrl + Api_getWorkGuideBookDirectory
    },
    getWorkGuideBookContent: {
      method: 'post',
      url: baseUrl + Api_getWorkGuideBookContent
    },
    getTaskDetail: {
      method: 'post',
      url: baseUrl + Api_getTaskDetail
    },
    saveTaskDetail: {
      method: 'post',
      url: baseUrl + Api_saveTaskDetail
    },
    getStandardMaterials: {
      method: 'post',
      url: baseUrl + Api_getStandardMaterials
    },
    createStandardMaterial: {
      method: 'post',
      url: baseUrl + Api_createStandardMaterial
    },
    deleteStandardMaterial: {
      method: 'post',
      url: baseUrl + Api_deleteStandardMaterial
    },
    saveStandardMaterial: {
      method: 'post',
      url: baseUrl + Api_saveStandardMaterial
    },
    updateStandardMaterial: {
      method: 'post',
      url: baseUrl + Api_updateStandardMaterial
    },
    changeTaskStatus: {
      method: 'post',
      url: baseUrl + Api_changeTaskStatus
    },
    verifyTask: {
      method: 'post',
      url: baseUrl + Api_verifyTask
    },
    getTaskList:{
      method: 'post',
      url: baseUrl + Api_getTaskList
    },
    getEmployees:{
      method: 'post',
      url: baseUrl + Api_getEmployees
    },
    getMachines:{
      method: 'post',
      url: baseUrl + Api_getMachines
    },
    taskAssign:{
      method: 'post',
      url: baseUrl + Api_taskAssign
    },
    getAllMaterials: {
      method: 'post',
      url: baseUrl + Api_getAllMaterials
    },
    /**
     * 取得作业指导书
     */
    getInstructorList: {
      method: 'get',
      url: baseUrl + Api_getInstructorList
    },
    /**
     * 上传照片
     */
    uploadPicture: {
      method: 'post',
      url: baseUrl + Api_uploadPicture
    },
    /**
     * 下载文件
     */
    downloadFile: {
      method: 'post',
      url: baseUrl + Api_downloadFile
    }
  });

  return {
    checkNetStatus: function (callback, params) {
      var model = schdleMaintain.checkNetStatus(params).$promise;
      Exception.promise(model, callback, Api_checkNetStatus, params);
    },
    /**
     * 根据时间段，获取所有列表数据，用于缓存本地数据库操作
     */
    getBatchWorkorderList: function (callback, params) {
        var model = schdleMaintain.getBatchWorkorderList(params).$promise;
        Exception.promise(model, callback, Api_getBatchWorkorderList, params);
    },/**
     * 以工单号获取工单所有数据
     */
    getWorkorderFullInfoList: function (callback, params) {
        var model = schdleMaintain.getWorkorderFullInfoList(params).$promise;
        Exception.promise(model, callback, Api_getWorkorderFullInfoList, params);
    },
    /**
     * 取得现场经理的通知单列表
     */
    getSchdleNotificationList: function (callback, params) {
      var model = schdleMaintain.queryNotification(params).$promise;
      Exception.promise(model, callback, Api_queryNotification, params);
    },
    /**
     * 取得作业指导书
     * @param {Object} orderId 工单Id
     */
    getInstructorList: function(callback, params) {
      var model = schdleMaintain.getInstructorList(params).$promise;
      Exception.promise(model, callback, Api_getInstructorList, params);
    },
    getWorkGuideBookDirectory: function (callback, params) {
      var model = schdleMaintain.getWorkGuideBookDirectory(params).$promise;
      Exception.promise(model, callback, Api_getWorkGuideBookDirectory, params);
    },
    getWorkGuideBookContent: function (callback, params) {
      var model = schdleMaintain.getWorkGuideBookContent(params).$promise;
      Exception.promise(model, callback, Api_getWorkGuideBookContent, params);
    },
    getTaskDetail: function (callback, params) {
      var model = schdleMaintain.getTaskDetail(params).$promise;
      Exception.promise(model, callback, Api_getTaskDetail, params);
    },
    saveTaskDetail: function (callback, params) {
      var model = schdleMaintain.saveTaskDetail(params).$promise;
      Exception.promise(model, callback, Api_saveTaskDetail, params);
    },
    getStandardMaterials: function (callback, params) {
      var model = schdleMaintain.getStandardMaterials(params).$promise;
      Exception.promise(model, callback, Api_getStandardMaterials, params);
    },
    createStandardMaterial: function (callback, params) {
      var model = schdleMaintain.createStandardMaterial(params).$promise;
      Exception.promise(model, callback, Api_createStandardMaterial, params);
    },
    deleteStandardMaterial: function (callback, params) {
      var model = schdleMaintain.deleteStandardMaterial(params).$promise;
      Exception.promise(model, callback, Api_deleteStandardMaterial, params);
    },
    saveStandardMaterial: function (callback, params) {
      var model = schdleMaintain.saveStandardMaterial(params).$promise;
      Exception.promise(model, callback, Api_saveStandardMaterial, params);
    },
    updateStandardMaterial: function (callback, params) {
      var model = schdleMaintain.updateStandardMaterial(params).$promise;
      Exception.promise(model, callback, Api_updateStandardMaterial, params);
    },
    /**
     * 0，接受任务；1，开始任务；2暂停任务；3 恢复任务；4 完成任务；5审核
     * @param callback
     * @param params
       */
    changeTaskStatus: function (callback, params) {
      var model = schdleMaintain.changeTaskStatus(params).$promise;
      Exception.promise(model, callback, Api_changeTaskStatus, params);
    },
    verifyTask: function (callback, params) {
      var model = schdleMaintain.verifyTask(params).$promise;
      Exception.promise(model, callback, Api_verifyTask, params);
    },
    getTaskList: function (callback, params) {
      var model = schdleMaintain.getTaskList(params).$promise;
      Exception.promise(model, callback, Api_getTaskList, params);
    },
    getEmployees: function (callback, params) {
      var model = schdleMaintain.getEmployees(params).$promise;
      Exception.promise(model, callback, Api_getEmployees, params);
    },
    getMachines: function (callback, params) {
      var model = schdleMaintain.getMachines(params).$promise;
      Exception.promise(model, callback, Api_getMachines, params);
    },
    taskAssign: function (callback, params) {
      var model = schdleMaintain.taskAssign(params).$promise;
      Exception.promise(model, callback, Api_taskAssign, params);
    },
    getAllMaterials: function (callback, params) {
      var model = schdleMaintain.getAllMaterials(params).$promise;
      Exception.promise(model, callback, Api_getAllMaterials, params);
    },
    uploadPicture: function (callback, params) {
      var model = schdleMaintain.uploadPicture(params).$promise;
      Exception.promise(model, callback, Api_uploadPicture, params);
    },
    downloadFile: function (callback, params) {
      var model = schdleMaintain.downloadFile(params).$promise;
      Exception.promise(model, callback, Api_downloadFile, params);
    }
  };
});
