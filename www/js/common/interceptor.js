/**
 * 请求拦截器
 */
starter.factory('LoadingInterceptor', ['$rootScope','Storage',
	function($rootScope,Storage) {
		return {
			request: function(config) {
				//为api请求加上accessToken令牌
				if(config.url.indexOf(".api") != -1){
					config.headers['tokenId'] = Storage.getAccessToken();
					config.requestTimestamp = new Date().getTime();
          console.log("请求拦截器：");
          console.debug(config);
				}
				return config;
			},
			response: function(response) {
				if(response.data.retCode){
					response.config.responseTime = (new Date().getTime()) - response.config.requestTimestamp;
					if(response.data.retCode == API_SUCCESS){
						response.data.success = true;
					}else{
						response.data.success = false;
					}
					console.log("接收拦截：");
					console.debug(response.data);
				}
				return response;
			}
		};
	}
]);
