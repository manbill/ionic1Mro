starter.config(function ($stateProvider, $urlRouterProvider) {
  $stateProvider
		.state('tab.mailMessageList', {
			url: '/mailMessage/index',
			views: {
				'tab-mailMessage': {
					templateUrl: 'views/task/index.html',
					controller: 'TaskCtrl'
				}
			}
		})
    .state('tab.mailMessage', {
			url: '/mailMessage/mailInfo',
			views: {
				'tab-mailMessage': {
					templateUrl: 'views/task/mailMessage.html',
					controller: 'MailMessageCtrl'
				}
			},
      params:{
			  data:null
      }
		})
});
