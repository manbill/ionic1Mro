starter.config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
        //备件查询列表路由
        .state('tab.repertory', {
            url: '/repertory/index',
            views: {
                'tab-repertory': {
                    templateUrl: 'views/repertory/index.html',
                    controller: 'RepertoryCtrl'
                }
            }
        })
        //备件详情路由
        .state('tab.repertoryDetail', {
            url: '/repertory/detail',
            views: {
                'tab-repertory': {
                    templateUrl: 'views/repertory/detail.html',
                    controller: 'RepertoryDetailCtrl'
                }
            },
            params: {
                data: null
            }
        })
        //库存列表路由
        .state('tab.storeList',{
            url: '/repertory/detail/storeList',
            views: {
                'tab-repertory': {
                    templateUrl: 'views/repertory/storeList.html',
                    controller: 'StoreListCtrl'
                }
            },
            params:{
                data: null
            },
            cache:false//不缓存 每次进到页面 默认显示所在项目对应区域内的库存信息
        })
        //库存详情路由
        .state('tab.storeDetail',{
            url:'/repertory/detail/storeList/storeDetail',
            views: {
                'tab-repertory': {
                    templateUrl: 'views/repertory/storeListDetail.html',
                    controller: 'StoreDetailCtrl'
                }
            },
            params: {
                data : null
            }
        })

    ;
});
