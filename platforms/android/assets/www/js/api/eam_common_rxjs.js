/**
 * Created by Administrator on 2017/8/24 0024.
 */
angular.module("starter.MroRxModule", [])
  .factory("MroRxHelpers", function () {
    var network$ = new Rx.Subject();
    var onlyWiFi$ = new Rx.Subject();
    var lastUpdateTime$ = new Rx.Subject();
    return {
      network$: function (network) {
        if (network&&!("isOnline" in network && 'isWiFi' in network)) {
          throw  new Error("传入的对象需要属性 isOnline");
        }
        return network$.publishBehavior(network).refCount();
      },
      onlyWiFi$: function (isOnlyWiFi) {
        return onlyWiFi$.publishBehavior(isOnlyWiFi).refCount();
      },
      lastUpdateTime$: function (updateTime) {
        return lastUpdateTime$.publishBehavior(updateTime).refCount();
      }
    }
  });
