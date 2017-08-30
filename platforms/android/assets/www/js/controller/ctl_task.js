starter
  .controller('TaskCtrl', function ($scope, $rootScope, myTaskService, Popup, $state) {
    $scope.mailInfoList = [];
    $scope.doRefresh = function () {
      $scope.getMailList();
    };
    $scope.getMailList = function () {
        myTaskService.getMailList()
        .then(function (res) {
          $scope.$broadcast(SCROLL_REFRESH_COMPLETE);
          $scope.mailInfoList = res;
        }).catch(function (err) {
        Popup.promptMsg(err);
        $scope.$broadcast(SCROLL_REFRESH_COMPLETE);
      });
    };
    $scope.doRefresh();
    $scope.viewMailInfo = function (mailInfo) {
      myTaskService.getMailInfo(mailInfo.id).then(function (res) {
        console.log(res);
        if (res) angular.merge(mailInfo, res);//用新的数据替换旧数据
        $state.go('tab.mailMessage', {
          data: mailInfo
        })
      }).catch(function (err) {
        Popup.promptMsg(err);
        $scope.$broadcast(SCROLL_REFRESH_COMPLETE);
      })
    }
  })
  .controller('MailMessageCtrl', function ($scope, $stateParams) {
    $scope.mailInfo = $stateParams.data;
     $scope.mailTitle ="消息详情"
  });
