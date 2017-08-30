var ArrayUitls = {};
var StringUtils = {};
ArrayUitls.indexObject = function (array, val) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] == val) return i;
  }
  return -1;
};

ArrayUitls.remove = function (array, val) {
  var index = ArrayUitls.indexObject(array, val);
  if (index > -1) {
    array.splice(index, 1);
  }
};
/**
 * 返回一个只包含图片类型的附件列表
 * @param fileList
 */
StringUtils.getImages=function (fileList) {
  var image_formats = ['data', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'ai', 'cdr', 'eps'];
  return fileList.filter(function (file) {
    if(!file){
      return false;
    }
    return image_formats.some(function (imgType) {
      return angular.equals(imgType,file.fileType);
    })
  });
};
/**
 * 是否是图片类型
 * @param file
 */
StringUtils.isImageType=function (file) {
  var image_formats = ['data', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'ai', 'cdr', 'eps'];
  return !!file&&image_formats.some(function (type) {
      return angular.equals(type,file.fileType);
    })
};


StringUtils.isNotEmpty = function (val) {
  return val != undefined && val != "" && val != null;
};
StringUtils.isEmpty = function (value) {
  return value && ((Array.isArray(value) && value.length === 0)
    || (Object.prototype.isPrototypeOf(value) && Object.keys(value).length === 0));
};
/**
 *
 * @param fwcNChineseCalcRule 每一个中文和全角字符算几个字符
 * @returns {number}
 */
String.prototype.len4FullWidthCharacterNChinese=function(fwcNChineseCalcRule){
  fwcNChineseCalcRule=fwcNChineseCalcRule?fwcNChineseCalcRule:3;
  var count = 0;
  angular.forEach(this, function (val, key) {
    if (val.match(/[\u4E00-\u9FA5]/)//汉字
      || val.match(/[\uFF00-\uFFFF]/)//全角符号
    ) {
      count += fwcNChineseCalcRule;
    } else {
      count++;
    }
  });
  return count;
};
var Utils={};
Utils.calculateTime=function (startT,endT) {
  var result = 0;
  // console.log(startT,endT);
  if (startT) {
    if(!endT){
      return result;
    }
  // console.log(-startT+endT);
    var endTime = parseFloat(endT);
    var startTime = parseFloat(startT);
    if (endTime >= startTime) {
      var delta = (endTime - startTime) / 1000; //秒
      if (delta % 3600 === 0) { //正好是整小时数
        result = delta / 3600;
      } else { //含有小数
        result = delta / 3600.0; //小时
        result = result.toFixed(2);
        var str = result + "";
        var str2 = str.substr(str.indexOf("."), 2); //小数部分
        str = str.substr(0, str.indexOf(".")); //整数部分
        //console.log("str2:bef: " + str2);
        str2 = str2 < 0.5 ? 0.5 : 1;
        //console.log("str2:aft: " + str2);
        result = parseInt(str) + parseFloat(str2);
      }
    }
  }
  // console.log("计算时间： ",result);
  return result;
};
