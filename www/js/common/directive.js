starter.directive('formatDate', function () {
  return {
    require: 'ngModel',
    link: function (scope, elem, attr, ngModelCtrl) {
      ngModelCtrl.$formatters.push(function (modelValue) {
        if (modelValue) {
          // console.log(modelValue);
          return new Date(modelValue);
        }
      });

      ngModelCtrl.$parsers.push(function (value) {
        if (value) {
          // console.log(value);
          return $filter('date')(value, 'yyyy-MM-dd');
        }
      });
    }
  };
});
starter.directive('hideTabs', function ($rootScope) {
  return {
    restrict: 'AEC',
    link: function ($scope, element, attributes) {
      $scope.$on('$ionicView.beforeEnter', function () {
        $scope.$watch(attributes.hideTabs, function (value) {
          $rootScope.hideTabs = value ? 'tabs-item-hide' : '';
        });
      });

      $scope.$on('$ionicView.beforeLeave', function () {
        $rootScope.hideTabs = '';
      });
    }
  }
});
starter.directive("eamShowContent", function ($compile) {
  return {
    restrict: "EA",
    replace: true,
    link: function (scope, ele, attrs) {
      var info = attrs.eamShowContent;
      if (!info || info.length == 0) {
        return;
      }
      info="<span>"+info+"</span>";
      var content = $compile(info)(scope);
      ele.replaceWith(content);
    }
  }
});
/**
 * 该指令需要在$scope.data变量中定义要查询的关键字,否则获取不到关键字,将不能突出显示这些关键字
 */
starter.directive("showColoredQueryWords", function ($compile) {
  return {
    restrict: "EA",
    replace: true,
    link: function (scope, ele, attrs) {
      var info = attrs.showColoredQueryWords;
      if (scope.data.filterFlag == false) {
        return;
      }
      // console.log(info);
      if (!info || info.length == 0 || !scope.data) {
        return;
      }
      var queryWords = scope.data.queryMaterialKeyWord;
      // console.log(queryWords);
      if (!StringUtils.isNotEmpty(queryWords)) {
        return;
      }
      var reg = eval("/" + queryWords + "/gi");
      var str = info.replace(reg, "<span style='color: red'>" + queryWords + "</span>");
      str = "<span>" + str + "</span>";//这个是因为compile函数如果str是String类型必须要以“<”开头，所以需要如此处理，否则报错！
      var content = $compile(str)(scope);
      ele.replaceWith(content);
    }
  }
});

/**
 * 用于显示不同类型附件的指令
 */
starter.directive("eamImg", function () {
  return {
    restrict: "EA",
    replace: true,
    transclude: true,
    scope: {
      src: '=',
      downloadImage: '&'

    },
    template: '<img>',
    link: function (scope, elements, attrs) {
      console.log(elements + ' ' + attrs);
      elements.bind('downloadImage', function (image) {

        if (image.fileType == "jpeg" || image.fileType == "png") {
          // var imgTemp = '<img ng-src="../img/uploading.png">';
          eamFile.openEamAttachedFile(image).then();
        } else {
          // var imgTemp = '<img ng-src="../img/uploading.png">';
        }
      })
    }
  }
});
starter.directive('myImg', [
  '$animate',
  '$timeout',
  function ($animate, $timeout) {
    return {
      restrict: 'EA',
      replace: true,
      scope: {
        attacheFile: '=',
        attacheFileList: '=',
        downloadImage: '&',
        deleteAttachedImage: '&',
        isImageType: "&",
        index: '=',
        isCanEditImg: '&'
      },
      templateUrl: 'views/common/myImageView.html',
      controller: ['$scope', '$element', 'eamFile', 'Popup', function ($scope, $element, eamFile, Popup) {
        $scope.image = $scope.attacheFile;
        console.log($scope.isCanEditImg);
        $scope.downloadImage = function (image) {
          console.log(JSON.stringify(image, undefined, 2));
          // eamFile.browserEamAttachedFiles(image,$scope.attacheFileList);
          // Popup.waitLoad('正在下载附件');
          eamFile.openEamAttachedFile(image)
            .then(function () {
              // Popup.hideLoading();
            }, function (e) {
              // alert("打开附件失败 ： " + JSON.stringify(e));
              console.log("打开附件失败" + JSON.stringify(e, undefined, 2));
              // Popup.loadMsg("打开附件失败" + JSON.stringify(e, undefined, 2));
              // Popup.hideLoading();
            });
        };
        $scope.deleteAttachedImage = function (image, index) {
          eamFile.removeAttachedFile(image).then(function () {
            $scope.attacheFileList.splice($scope.index, 1);
          }, function (err) {
            Popup.promptMsg("删除附件失败")
          });
        };

        $scope.isImageType = StringUtils.isImageType;

      }],
      link: function ($scope, $element) {
        // console.log(StringUtils.isImageType($scope.attacheFile));
        StringUtils.isImageType($scope.attacheFile);
        // $scope.$watch("attacheFileList",function(){
        //     $scope.$apply();
        // });
      }
    };
  }]);
