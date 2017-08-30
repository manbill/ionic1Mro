starter
	.factory('WorkHoursApi', function($resource, Exception, DataCache, $rootScope,eamDB) {

		var Api_getWorkHoursList = "/api/workHours/list.api";
		var workHours = $resource(baseUrl + Api_getWorkHoursList, {}, {
			getWorkHoursList: {
				method: 'post',
				url: baseUrl + Api_getWorkHoursList
			}
		});

		return {
			getWorkHoursList: function(callback, params) {
        var model = workHours.getWorkHoursList(params).$promise;
        Exception.promise(model, callback, Api_getWorkHoursList, params);
			}
		};
	});
