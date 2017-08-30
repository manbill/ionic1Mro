/**
 * Created by Manbiao.Huang on 16-Jun-16.
 */
starter.filter("userTypeFilter", function() {
  return function(userType) {
    return userType==1?"否":userType==2?"是":"其他人员";
  }
});
