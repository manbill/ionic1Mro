/**
 * 点检表详情服务
 */
starter.factory('CheckDetail', function () {
  var checkDetailListjson = {};
  return {
    setCheckDetailList: function (checkDetailListparam) {
      if (!checkDetailListparam)return;
      checkDetailListjson = {};
      for (var i = 0; i < checkDetailListparam.length; i++) {
        var item = checkDetailListparam[i];
        checkDetailListjson[item.checkCatalog] = item;
      }
    },
    getCheckDetailKeyList: function () {
      var checkDetailList = [];
      for (var key in checkDetailListjson) {
        checkDetailList.push(key);
      }
      return checkDetailList;
    },
    getCheckDetailList: function () {
      var checkDetailList = [];
      for (var key in checkDetailListjson) {
        checkDetailList.push(checkDetailListjson[key]);
      }
      return checkDetailList;
    },
    getCheckDetailItemByKey: function (key) {
      var item = checkDetailListjson[key];
      var arrItem = item.checkListItems;
      // for (var i = 0; i < arrItem.length; i++) {
      //   if (arrItem[i].fieldType == "26") {
      //       arrItem[i].fieldValue = false;
      //   }
      // }
      return item;
    },
    updateCheckDetailItemByKey: function (key, checkDetailItemList) {
      var item = checkDetailListjson[key];
      console.log(item);
      var arrItem = item.checkListItems;
      for (var i = 0; i < arrItem.length; i++) {
        console.log(arrItem[i]);
        if (arrItem[i].fieldType == "26") {//26确认型
          if (arrItem[i].fieldValue == true) {
            arrItem[i].fieldValue = "1";
          } else {
            arrItem[i].fieldValue = "";
          }
        }
      }
      checkDetailListjson[key] = checkDetailItemList;
    }
  };
});
