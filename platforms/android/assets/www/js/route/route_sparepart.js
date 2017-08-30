starter.config(function ($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state('tab.sparepart', {
      url: '/sparepart/index',
      cache: false,
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/index.html',
          controller: 'SparepartCtrl'
        }
      }
    })
    .state('tab.sparePartEditDetail', {//修改调拨单
      url: '/sparepart/sparePartEditDetail',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/sparePartEditDetail.html',
          controller: 'SparePartEditDetailCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.sparepartShiftAddEditDetail', {
      url: '/sparepart/addEditDetail',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/shift_addedit_detail.html',
          controller: 'sparepartShiftAddeditDetailCtrl'
        }
      },
      params: {
        data: null,
        is_create: true
      }
    })
    .state('tab.sparepartDetail', {//查看调拨单
      url: '/sparepart/sparepart_detail',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/sparepart_detail.html',
          controller: 'SparePartDetailCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.sparePartHandleRecord', {//处理过程详细
      url: '/sparepart/sparePartHandleRecord',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/sparePartHandleRecord.html',
          controller: 'SparePartHandleRecordCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.handleFeedback', {//处理反馈
      url: '/sparepart/handleFeedback',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/handleFeedback.html',
          controller: 'HandleFeedbackCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.sparePartTransferMaterialsDetail', {//调拨物料详细
      url: '/sparepart/sparePartTransferMaterialsDetail',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/sparePartTransferMaterialsDetail.html',
          controller: 'SparePartTransferMaterialsDetailCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.createSparePartOrder', {//创建调拨单
      url: '/sparepart/createSparePartOrder',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/createSparePartOrder.html',
          controller: 'CreateSparePartOrderCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.shippingOrderDetail', {//查看发货单
      url: '/sparepart/delivery/shippingOrderDetail',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/delivery/shippingOrderDetail.html',
          controller: 'ShippingOrderDetailCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.shippingOrderMaterialsDetail', {//查看发货单
      url: '/sparepart/delivery/ShippingOrderMaterialsDetail',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/delivery/ShippingOrderMaterialsDetail.html',
          controller: 'ShippingOrderMaterialsDetailCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.selectInventory', {//选择仓库
      url: '/sparepart/selectInventory',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/selectInventory.html',
          controller: 'SelectInventoryCtrl'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.sparepartdetailEditMateriel', {
      url: '/sparepart/detailEditMateriel',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/addedit_detail_materiel.html',
          controller: 'sparepartdetailEditMateriel'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.sparepartdetailEditMaterielSearch', {
      url: '/sparepart/detailEditMaterielSearch',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/addedit_detail_materiel_search.html',
          controller: 'sparepartdetailEditMaterielSearch'
        }
      },
      params: {
        data: null
      }
    })

      //已经有的物料进入详情
      .state('tab.sparepartMaterielDetailInfo', {
          url: '/sparepart/sparepartdetailEditMateriel/sparepartMaterielDetailInfo',
          views: {
              'tab-sparepart': {
                  templateUrl: 'views/workorder/materialDetail.html',
                  controller: 'MaterialDetailCtrl'
              }
          },
          params: {
              data: null
          }
      })

    .state('tab.sparepartEditDetailWorkorder', {
      url: '/sparepart/addEditDetailWorkorder',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/addedit_detail_workorder.html',
          controller: 'sparepartAddeditDetailWorkorder'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.sparepartdetailFKJL', {
      url: '/sparepart/detailFKJL',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/detail_fankuijilu.html',
          controller: 'sparepartDetailFKJLCtrl'
        }
      },
      params: {
        data: null,
        fkjl: 'fkjl'
      }
    })
    .state('tab.sparepartReceive', {
      url: '/sparepart/receive',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/receive/list.html',
          controller: 'sparepartReceive'
        }
      },
      params: {
        data: null,
        transferOrderNo: ""
      }
    })
    .state('tab.sparepartReceiveConfirmOrUnconfirm', {
      url: '/sparepart/receive/confirm',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/receive/confirmOrUnconfirm.html',
          controller: 'sparepartReceiveConfirmOrUnconfirm'
        }
      },
      params: {
        data: null,
        isConfirm: false,
        isUnconfirm: false
      }
    })
    .state('tab.sparepartDelivery', {
      url: '/sparepart/delivery',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/delivery/list.html',
          controller: 'sparepartDelivery'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.sparepartDeliveryDetail', {
      url: '/sparepart/deliveryDetail',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/delivery/sparePartEditDetail.html',
          controller: 'sparepartDeliveryDetail'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.sparepartDeliveryList', {
      url: '/sparepart/deliveryList',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/delivery/delivery_list.html',
          controller: 'sparepartDeliveryList'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.sparepartDeliveryListDetail', {
      url: '/sparepart/deliveryListDetail',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/delivery/delivery_detail.html',
          controller: 'sparepartDeliveryListDetail'
        }
      },
      params: {
        data: null
      }
    })
    .state('tab.sparepartDeliveryDetailAddOrEdit', {
      url: '/sparepart/deliveryDetailAddOrEdit',
      views: {
        'tab-sparepart': {
          templateUrl: 'views/sparepart/delivery/sparepart_detail.html',
          controller: 'sparepartDeliveryDetailAddOrEdit'
        }
      },
      params: {
        data: null,
        is_edit: false
      }
    });
});
