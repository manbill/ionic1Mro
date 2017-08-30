starter.config(function ($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state('tab', {
      url: '/tab',
      abstract: true,
      templateUrl: 'views/common/tabs.html'
    })
    .state('login', {
      url: '/login',
      cache: false,
      templateUrl: 'views/common/login.html',
      controller: 'LoginCtrl'
    })
    .state('tab.home', {
      url: '/home',
      views: {
        'tab-home': {
          templateUrl: 'views/common/home.html',
          controller: 'HomeCtrl'
        }
      },
      params:{
        data:null
      }
    })
    .state('tab.my', {
      url: '/my',
      views: {
        'tab-home': {
          templateUrl: 'views/common/my.html',
          controller: 'MyCtrl'
        }
      },
      params: {
        userId: null
      }
    })

    //刚登陆 选择项目
    .state('tab.selectProjects',{
      url:'selectProjects',
      views:{
        'tab-project':{
          templateUrl:'views/common/selectProjects.html',
          controller:'SelectProjectsCtrl'
        }
      },
      params:{
        data:null
      }
    })
    //登录过后从"我的"模块 选择项目
    .state('tab.selectProjectFromMy',{
        url:'/selectProjectFromMy',
        views:{
            'tab-home': {
                templateUrl:'views/common/selectProjectFromMy.html',
                controller:'SelectProjectsCtrl'
            }
        },
        params:{
            data:null
        }
    })
    .state('tab.editBlockText',{
      url:'/editBlockText',
      cache:false,
      views:{
        'tab-order':{
          templateUrl:'views/common/editBlockText.html',
          controller:'EditBlockTextCtrl'
        }
      },
      params:{
        data:null
      }
    })
    .state('tab.about', {
      url: '/about',
      views: {
        'tab-home': {
          templateUrl: 'views/common/about.html',
          controller: 'AboutCtrl'
        }
      }
    })
    .state('tab.showImage', {
    url: '/common/showImage',
    views: {
      'tab-order': {
        templateUrl: 'views/common/showImage.html',
        controller: 'ShowImageCtrl'
      }
    },
    params: {
      data:null
    }
  })
  ;
  $urlRouterProvider.otherwise(function ($injector, $location) {
    var Storage = $injector.get('Storage');
    var localId = Storage.getProfile() ? Storage.getProfile()['id'] : null;
    if (localId) {//已经登陆过
      return '/tab/home';
    } else {//从未登陆成功过
      return '/login';
    }
  });
});
