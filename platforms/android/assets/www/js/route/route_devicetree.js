starter.config(function($stateProvider, $urlRouterProvider) {
	$stateProvider
		.state('tab.fanEquipments', { //风机设备
			url: '/fanEquipments',
			views: {
				'tab-devicetree': {
					templateUrl: 'views/devicetree/fanEquipments.html',
					controller: 'FanEquipmentsCtrl'
				}
			}
		})
    .state('tab.deviceTree', { //设备树
			url: '/deviceTree',
      views: {
				'tab-devicetree': {
					templateUrl: 'views/devicetree/deviceTree.html',
					controller: 'DeviceTreeCtrl'
				}
			},
      params:{
			  data:null
      }
		})
    .state('tab.selectedEquipment', { //展示设备树信息并专用于选择设备
			url: '/deviceTree/selectedEquipment',
      cache:false,
      views: {
				'tab-devicetree-selectedEquipment': {
					templateUrl: 'views/devicetree/selectedEquipment.html',
					controller: 'SelectedEquipmentCtrl'
				}
			},
      params:{
			  data:null
      }
		})
    .state('tab.equipmentDetail', { //设备详情
			url: '/equipmentDetail',
      views: {
				'tab-devicetree': {
					templateUrl: 'views/devicetree/equipmentDetail.html',
					controller: 'EquipmentDetailCtrl'
				}
			},
      params:{
        data:null
      }
		})
});
