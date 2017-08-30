/**
 * Created by jiangwei.wang on 2016/11/24.
 */
//合并 网络请求  通知单数据和 本地缓存通知单数据 仅限本地的三张表： 定维通知单表，安装调试通知单表，技改任务通知单表
starter.factory("MergeNoticeTable", function (eamDB, Storage) {
  //比较网络返回的 notiseId 是否和 通知单表里的数据 的notiseId 字段相同
  function findNotiseId(array, findElement) {
    if (array != null) {
      for (var i = 0; i < array.length; i++) {
        var obj = array[i];
        if (obj.notiseId == findElement) {
          return true;
        }
      }
      return false;
    } else {
      return false;
    }
  }

  //获取通知单里的所有数据
  function getNotification(tableName, callback) {
    var query = "SELECT notiseId, notiseNo,projectName, anchor, assignTime," +
      " planStartTime,assignOwner, assignDevieNo,assignTaskID,assignStatus " +
      "FROM " + tableName;
    var array = new Array();
    eamDB.execute(db, query, []).then(function (res) {
      for (var i = 0; i < res.rows.length; i++) {
        array.push(res.rows.item(i));
      }
      callback(array);
    });
  }
  //合并 网络请求的通知单到 对应的表里（tableName）
  function mergeNotification(oldData, newData, tableName, callback) {
    if (newData != null) {
      for (var i = 0; i < newData.length; i++) {
        var newDataItem = newData[i];
        if (newDataItem.notiseId != null) {
          if (findNotiseId(oldData, newDataItem.notiseId)) {
            //todo update
            var update = "UPDATE ? set " +
              "notiseNo=?, projectName=?," +
              "anchor=?, assignTime=?, " +
              "planStartTime=?,assignOwner=?, " +
              "assignDevieNo=?,assignTaskID=?, " +
              "assignStatus=? where notiseId=" + newDataItem.notiseId;
            eamDB.execute(db, update, [tableName,
              newDataItem.notiseNo, newDataItem.projectName,
              newDataItem.anchor, newDataItem.assignTime,
              newDataItem.planStartTime, newDataItem.assignOwner,
              newDataItem.assignDevieNo, newDataItem.assignTaskID,
              newDataItem.assignStatus]).then(function (res) {
              // console.log("update: " + res);
            }, function (err) {
              console.error(err);
            });
          } else {
            //insert
            var insert = "INSERT INTO ? (notiseId, " +
              "notiseNo, projectName, " +
              "anchor, assignTime, " +
              "planStartTime,assignOwner, " +
              "assignDevieNo,assignTaskID, " +
              "assignStatus) VALUES (?,?,?,?,?,?,?,?,?,?)";
            eamDB.execute(db, insert, [tableName, newDataItem.notiseId,
              newDataItem.notiseNo, newDataItem.projectName,
              newDataItem.anchor, newDataItem.assignTime,
              newDataItem.planStartTime, newDataItem.assignOwner,
              newDataItem.assignDevieNo, newDataItem.assignTaskID,
              newDataItem.assignStatus]).then(function (res) {
              console.log("insertId: " + res.insertId);
            }, function (err) {
              console.error(err);
            });
          }
        }
      }
    }
    callback();
  }
  return{
    getNotification:getNotification,
    mergeNotification:mergeNotification
  }
});
