starter
	.factory('ProblemReportApi', function($resource, Exception, DataCache, $rootScope,eamDB) {

		var Api_createNo = "/api/problemReport/createNo.api";
		var Api_save = "/api/problemReport/save.api"; //保存
		var Api_getProcessRecord = "/api/problemReport/getProcessRecord.api";
		var Api_operate = "/api/problemReport/operate.api";
    var Api_updateUploadFiles = baseUrl + '/api/updateUploadFiles.api';//上传附件接口
		var problemReport = $resource(baseUrl + Api_createNo, {}, {
			createNo: {
				method: 'post',
				url: baseUrl + Api_createNo
			},
			save: {
				method: 'post',
				url: baseUrl + Api_save
			},
			getProcessRecord: {
				method: 'post',
				url: baseUrl + Api_getProcessRecord
			},
			operate: {
				method: 'post',
				url: baseUrl + Api_operate
			},
      updateUploadFiles: {
				method: 'post',
				url: baseUrl + Api_updateUploadFiles
			}
		});

		return {
			createNo: function(callback, params) {
        var model = problemReport.createNo(params).$promise;
        Exception.promise(model, callback, Api_createNo, params);
			},
			save: function(callback, params) {
        var model = problemReport.save(params).$promise;
        Exception.promise(model, callback, Api_save, params,true);
			},
			getProcessRecord: function(callback, params) {
        var model = problemReport.getProcessRecord(params).$promise;
        Exception.promise(model, callback, Api_getProcessRecord, params);
			},
			operate: function(callback, params) {
        var model = problemReport.operate(params).$promise;
        Exception.promise(model, callback, Api_operate, params);
			},
      updateUploadFiles: function(callback, params) {
        var model = problemReport.updateUploadFiles(params).$promise;
        Exception.promise(model, callback, Api_updateUploadFiles, params);
			}
		};
	});
