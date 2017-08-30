/**
 * Created by wjw on 16/10/17.
 */
//创建新表 和 初始化数据库表的服务
starter.factory("dbTableService", function (eamDB, SchdleMaintainApi, Popup) {
  //创建定位任务表
  var db = null;
  //打开db  DB的名字要和 db.js 里的名字保持一致  可以在constant.js 里统一定义
  // db = eamDB.openDB("eam_20160929.db", function () {
  //   console.log("数据库创建/打开成功")
  // });

  var rawResource = null;
  //TODO

  // moke data
  var rawResource = {
      notificationObj: {
        endDate: new Date(),
        beginDate: new Date().getTime() - 24 * 60 * 60 * 1000
      },
      status: "0"
    }
    ;



    /*-------------------------------------------------------------------------------*/
    /*-------------------------------创建数据库表--------------------------------------*/
    /*-------------------------------------------------------------------------------*/
    /**
     * @brief  创建定维通知单表
     * @param table_notificationObj 表名
     * @param status 表状态：0 原始数据，1 增加的数据， 2，删除的数据 3，更改的数据
     * @type {string}
     */
    var createNotificationTable = function () {
      var sql_create_notificationObj = "CREATE TABLE IF NOT EXISTS table_notificationReceipt (id integer primary key, " +
        "mainObj text, " +
        "status integer)";
      eamDB.execute(db, sql_create_notificationObj).then(function (res) {
        console.log("定维通知单表创建成功");
      }, function (err) {
        console.error(err);
      });
    }

    /**
     * @brief 创建定维任务表
     * @param table_maintainTaskObj 表名
     * @param status 表状态：0 原始数据，1 增加的数据， 2，删除的数据 3，更改的数据
     */
    var createMaintainTaskTable = function () {
      var sql_create_notificationTable = "CREATE TABLE IF NOT EXISTS table_maintainTaskReceipt (id integer primary key, " +
        "mainObj text, " +
        "status integer)";
      eamDB.execute(db, sql_create_notificationTable).then(function (res) {
        console.log("定维任务表创建成功");
      }, function (err) {
        console.error(err);
      });
    }

    /*-------------------------------------------------------------------------------*/
    /*-------------------------------初始化数据库表------------------------------------*/
    /*-------------------------------------------------------------------------------*/

    /**
     * @des 定维任务表初始化 从API 对从后台请求回来的数据进行持久化操作  批量操作
     * @param row source 原始数据  例如：rawSource.maintainTaskObj
     */
    var initMaintainTaskTable = function () {
      /**
       * @brief  获取到需要解析的原始数据（所有的初始数据）
       * @param callback(res) res 返回的数据
       * @param params 参数列表
       */
      console.log("定维任务表单初始化开始");
      SchdleMaintainApi.getBatchWorkorderList(function (res) {
        if (res.success) {
          var fullInfoParams = [];
          var data = res.data;
          for (var i = 0; i < data.length; i++) {
            console.log("data.length :" + data.length);
            var item = data[i];
            fullInfoParams.push({
              workorderId: item.workorderId,
              workorderType: "67"
            });
          }
          /**
           * 以工单号获取工单所有数据
           */
          SchdleMaintainApi.getWorkorderFullInfoList(function (res) {
              if(res.success){
                console.log("以工单号获取工单所有数据:" + res.data);
              }
          }, {
            apiWorkorderBaseInfoDto: fullInfoParams
          });
          console.log(data);
        }
      }, {
        workorderTypeString: 67,//	工单类型(查询时// :pc端:37-风云工单,38-人工工单,39-工程工单,67-服务工单,68-整改/技改工单;手机端:4-scada工单；返回时，都是按照pc端的)
        startDate: new Date().getTime().toString() - 24 * 60 * 60 * 1000,
        endDate: new Date().getTime().toString()
      });
    }

    /*-------------------------------------------------------------------------------*/
    /*------------------------------查询数据库中指定表的数据-----------------------------*/
    /*-------------------------------------------------------------------------------*/

    /**
     * @brief 查询指定表中的所有数据
     * @param tableName 指定的表名
     */
    var selectTableAllData = function(tableName, resultObj) {
      db.transaction(function(tx) {
        tx.executeSql("SELECT * FROM '"+tableName+"'", [], function (tx, resultSet) {
            console.log("got '" + tableNmae + "'data : " + resultSet);
            resultObj = resultSet;
          },
          function (tx, error) {//sql 日志信息
            console.log('SELECT error: ' + error.message);
          });
      },function(error) {//事务日志信息  事务失败
        console.log('selectTableAllData transaction error: ' + error.message);
      }, function() {//事务日志信息  事务成功
        console.log('selectTableAllData transaction ok');
      });
    }


    /*-------------------------------------------------------------------------------*/
    /*-------------------------------单个数据插入表操作---------------------------------*/
    /*-------------------------------------------------------------------------------*/
    /**
     * @brief 单个数据插入表操作
     * @param tableName 表名
     * @param dataToInsert 要插入的数据（一般是新增的一个表项）
     */
    var insertTableData = function(tableName, dataToInsert) {
      //安全起见 放到一个事务里去执行查询语句
      db.transaction(function(tx) {
        tx.executeSql("INSERT INTO '"+tableName+"' (mainObj, status) VALUES (?,?)", [dataToInsert,1], function (tx, resultSet) {
            console.log("got '" + tableNmae + "' data : " + resultSet);
          },
          function (tx, error) {
            console.log('insertTableData INSERT error: ' + error.message);
          });
      },function(error) {
        console.log('insertTableData transaction error: ' + error.message);
      }, function() {
        console.log('insertTableData transaction ok');
      });
    }

    /*-------------------------------------------------------------------------------*/
    /*-------------------------------删除数据库中某一个表的一个数据项---------------------*/
    /*-------------------------------------------------------------------------------*/
    /**
     * @brief 删除数据库中的一个表 的 指定 条目
     * @param tableName 要从那张表中删除
     * @param deleteID 表中数据条目的id
     */
    var deleteTableItem = function(tableName, deleteID) {
      //安全起见 放到一个事务里去执行删除语句
      db.transaction(function(tx) {
        // eg: Delete FROM CaseTable where id='+ ROW_ID
        tx.executeSql("DELETE FROM '"+tableName+"' WHERE id = ?", [tableName,deleteID], function (tx, resultSet) {
            console.log("got '" + tableNmae + "' data : " + resultSet);
            console.log("表名为:"+ tableName + "id为:" + deleteID +" 的数据已经被删除了");
          },
          function (tx, error) {
            console.log(tableName + 'deleteTableItem INSERT error: ' + error.message);
          });
      },function(error) {
        console.log(tableName + 'deleteTableItem transaction error: ' + error.message);
      }, function() {
        console.log(tableName + 'deleteTableItem transaction ok');
      });
    }


    /*-------------------------------------------------------------------------------*/
    /*-------------------------------更新数据库表操作----------------------------------*/
    /*-------------------------------------------------------------------------------*/
    /**
     * @brief 更新数据库中 指定表中的数据 数据状态分为 源、增、删、改 对应表中status 的值分别为 0、1、2、3
     * @param tablName 表名
     * @param objName 具体数据
     * @param operation 表中某一条数据的状态会随着状态的不同而执行不同的操作  status = 0,原始数据; status = 1,新增数据; stauts = 2,删除数据; status = 3,更新数据
     */
    var updateNotificationTable = function (tableName, objData, updateID) {
      // db.transaction(tx){
      //   tx.executeSql("UPDATE '"+tablName+"' SET mainObj = '"+objName+"',status = '"+operation+"' );", [], updateCB, errorCB);
      // }

      db.transaction(function(tx) {
        // eg: Delete FROM CaseTable where id='+ ROW_ID
        tx.executeSql("UPDATE '"+tableName+"' SET mainObj = ?,status = '3' WHERE id = ? ", [objData,updateID], function (tx,resultSet) {
            console.log("update '" + tableNmae + "' data : " + resultSet);
            console.log("表名为:"+ tableName + "id为:" + updateID +" 的数据已经被跟新了");
          },
          function (tx, error) {
            console.log(tableName + 'deleteTableItem INSERT error: ' + error.message);
          });
      },function(error) {
        console.log(tableName + 'deleteTableItem transaction error: ' + error.message);
      }, function() {
        console.log(tableName + 'deleteTableItem transaction ok');
      });

    }

    // /*-------------------------------------------------------------------------------*/
    // /*----------------------------------表操作----------------------------------------*/
    // /*-------------------------------------------------------------------------------*/
    //
    // tableOperation : function(tablName, objName, operation) {
    //   switch (operation){
    //     case 0:
    //       break;
    //     case 1:
    //       self.insertTableData(tableName, dataToInsert);
    //       break;
    //     case 2:
    //       break;
    //     case 3:
    //       self.updateNotificationTable(tableName, objName, operation);
    //       break;
    //
    //     default:
    //       break;
    //   }
    // }


    /*-------------------------------------------------------------------------------*/
    /*----------------------------------销毁表操作------------------------------------*/
    /*-------------------------------------------------------------------------------*/
    /**
     * @brief 销毁数据库(默认创建的数据库db)表
     * @param tableName 要销毁的表的名字
     */
    var dropTable = function(tableName) {
      var sqlDropStr = 'DROP TABLE IF EXISTS ' + tableName;
      db.transaction(function(tx) {
        tx.executeSql(sqlStr,[],
          function(){
            //sql执行成功
            console.log("DROP SQL deleteTable ：" + tableName + "成功！");
          },
          function(){
            //sql 执行失败
            console.log("DROP SQL deleteTable ：" + tableName + "失败！");
          }
        );
      },function(){
        //事务执行失败
        console.log("tableName : " + tableName + 'deleteTable transaction error: ' + error.message);
        },
      function(error){
        //事务执行成功
        console.log("tableName : " + tableName + "deleteTable transaction ok");
      })
    }

  return {
    //建表操作 srv
    createNotificationTable : createNotificationTable,
    createMaintainTaskTable : createMaintainTaskTable,

    //初始化操作 srv
    initMaintainTaskTable : initMaintainTaskTable,

    //数据库表操作 srv
    selectTableAllData : selectTableAllData,
    insertTableData : insertTableData,
    deleteTableItem : deleteTableItem,
    updateNotificationTable : updateNotificationTable,
    dropTable : dropTable

  }//return factory

});







