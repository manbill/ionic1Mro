/**
 * 这是数据库脚本更新类，启动时会按照脚本顺序更新到最新版本。
 * 每条是一个执行的sql语句。
 * Created by Star_Jin on 10/14/2016.
 */
/**
 * 哪些版本里面有可执行的脚本信息，在数据库或者在本地文件中记录一个数据库执行版本信息，推荐在数据库表中记录一个版本信息。
 * @type {string[]}
 */
function MroAppSqlVersion() {
  this.sqlVersion = null;
  this.isActive = true;
  this.sqlstatements = [];
}

var sql_versions = ["sql_version_1_0_1", "sql_version_1_0_2", "sql_version_1_0_3",
  "sql_version_1_0_4", "sql_version_1_0_5", 'sql_version_1_0_6', 'sql_version_1_0_7',
  'sql_version_1_0_8', 'sql_version_1_0_9', 'sql_version_1_0_10', 'sql_version_1_0_11',
  'sql_version_1_0_12', 'sql_version_1_0_13', 'sql_version_1_0_14', 'sql_version_1_0_15',
  'sql_version_1_0_16', 'sql_version_1_0_17', 'sql_version_1_0_18', 'sql_version_1_0_19',
  'sql_version_1_0_20', 'sql_version_1_0_21', 'sql_version_1_0_22', 'sql_version_1_0_23',
  'sql_version_1_0_24', 'sql_version_1_0_25', 'sql_version_1_0_26', 'sql_version_1_0_27', 'sql_version_1_0_28',
  'sql_version_1_0_29', 'sql_version_1_0_30', 'sql_version_1_0_31', 'sql_version_1_0_32', 'sql_version_1_0_33',
  'sql_version_1_0_34'
];
/**
 * 改方法是为了将现有的定义的  sql_version_1_x_x 的sqls语句组装成MroAppSqlVersion对象数组，
 * sql_version_1_0_35之后的版本定义按照如下方式进行
 var ver = new MroAppSqlVersion();
 ver.sqlVersion=sqlVer;
 ver.isActive=true;
 ver.sqlstatements=[sql语句]，类似于 sql_version_1_x_x 的那样定义
 sqlVersions.push(ver);
 * @param sqlVerArr
 */
function mroSqlVersions(sqlVerArr) {
  var sqlVers = [];
  sqlVerArr.map(function (sqlVer) {
    var sqls = eval(sqlVer);
    var ver = new MroAppSqlVersion();
    ver.sqlVersion = sqlVer;
    ver.isActive = true;
    ver.sqlstatements = sqls.filter(function (s) {
      return s && s !== "";
    });
    sqlVers.push(ver);
  });
  return sqlVers;
}
var mroSqlTables = {
  eam_sync_file: "eam_sync_file",
  eam_sync_dictionary_detail: "eam_sync_dictionary_detail",
  eam_sync_material: "eam_sync_material",
  eam_sync_sparepart: "eam_sync_sparepart",
  eam_local_notification: "eam_local_notification",
  eam_sync_sparepart_delivery: "eam_sync_sparepart_delivery",
  eam_local_install: "eam_local_install",
  eam_local_tech: "eam_local_tech",
  eam_machine_equipment: "eam_machine_equipment",
  eam_machine_equipment_detail: 'eam_machine_equipment_detail',
  eam_version: "eam_version",
  eam_sync: 'eam_sync',
  eam_sync_workhours: "eam_sync_workhours",
  eam_sync_user: "eam_sync_user",
  eam_sync_problemreport: "eam_sync_problemreport",
  eam_manual: "eam_manual",
  eam_table_faultWorkOrder: "eam_table_faultWorkOrder",
  eam_table_maintainTechInstallWorkOrder: "eam_table_maintainTechInstallWorkOrder",
  eam_accounts_table: "eam_accounts_table"

};
var sql_version_1_0_1 = [
  "CREATE TABLE IF NOT EXISTS 'eam_sync_file' ('fileId' INTEGER,'filePath' TEXT,'originalFilename' TEXT,'contentType' TEXT,'size' integer,'downloadStatus' integer,'lastUpdateDatetimeApi' integer,PRIMARY KEY('fileId'))",
  //创建时间同步表
  "CREATE TABLE IF NOT EXISTS 'eam_sync' ('sync_type'  TEXT, 'sync_func'  TEXT, 'update_time'  INTEGER, PRIMARY KEY ('sync_func'))"
];
var sql_version_1_0_2 = [
  "CREATE TABLE IF NOT EXISTS 'eam_sync_dictionary_detail' ('detailId' INTEGER NOT NULL,'dictionaryId' INTEGER,'paraType' TEXT,'detailCode' TEXT,'detailName' TEXT," +
  "'detailComment' TEXT,'activeFlag' TEXT,'createBy' integer,'createOn' TEXT,'lastUpdBy' integer,'lastUpdOn' TEXT,PRIMARY KEY('detailId'))",
  "", "", "", ""
];
var sql_version_1_0_3 = [
  "CREATE TABLE IF NOT EXISTS 'eam_sync_material' ( 'materialId' INTEGER NOT NULL, 'materialName' TEXT, 'unit' integer, 'materialSno' text," +
  "'materialType' integer, 'materialTypeText' TEXT, 'materialSuite' TEXT, 'machine_model' TEXT," +
  "'materialFileid' INTEGER, 'materialValue' TEXT, 'marterialExpiredate' integer, 'materialComment' TEXT," +
  "'unitText' TEXT,'materialSupplier' TEXT,'materialFilePath' TEXT,'qrcodeFileid' INTEGER," +
  "'materialQrFilePath' TEXT,'material_replace' TEXT,'comment' TEXT,'materialVendor' TEXT," +
  "'machineModel' TEXT,'machineModelId' INTEGER,'materialReplace' TEXT,'activeFlag' integer," +
  "'json' TEXT,PRIMARY KEY('materialId'))"
];

var sql_version_1_0_4 = [
  //调拨单表
  "CREATE TABLE IF NOT EXISTS 'eam_sync_sparepart' ('transferOrderId' INTEGER NOT NULL,'transferOrderNo' text,'transferTypeId' INTEGER,'transferReasonId' INTEGER," +
  " 'workOrderId' INTEGER,'workorderCode' TEXT,'statusId' INTEGER," +
  " 'giWhName' TEXT,'grWhName' TEXT,'createByName' TEXT,'createDate' integer," +
  " 'flag' TEXT, 'materialNo' TEXT, 'materialComment' TEXT,'json' TEXT," +
  " 'lastUpdateDatetimeApi' integer,'createOn' integer,'lastUpdateDatetimeApp' integer,'uploadStatus' integer,'downloadStatus' integer, " +
  " PRIMARY KEY('transferOrderId'))"
];

//定维任务本地缓存表 不需要同步
var sql_version_1_0_5 = [
  "CREATE TABLE IF NOT EXISTS eam_local_notification (notiseId INTEGER NOT NULL, notiseNo TEXT," +
  "projectName TEXT, anchor TEXT, assignTime TEXT, planStartTime TEXT,assignOwner TEXT, " +
  "assignDevieNo TEXT,assignTaskID TEXT,assignStatus TEXT, PRIMARY KEY(notiseId))"
];

var sql_version_1_0_6 = [
  "CREATE TABLE IF NOT EXISTS 'eam_sync_sparepart_delivery' (" +
  " 'shippingOrderId' INTEGER NOT NULL, 'transferOrderId' INTEGER, 'shippingOrderNo' INTEGER, 'shippingMethod' TEXT, " +
  " 'materialNo' text, 'materialComment' TEXT, 'statusId' INTEGER, 'createOn' integer, " +
  " 'json' TEXT, " +
  " 'lastUpdateDatetimeApi' integer, 'lastUpdateDatetimeApp' integer, 'uploadStatus' integer, 'downloadStatus' integer," +
  " PRIMARY KEY('shippingOrderId'))"
];

var sql_version_1_0_7 = [
  "ALTER TABLE 'eam_sync_sparepart_delivery' ADD COLUMN 'giWhName' text",
  "ALTER TABLE 'eam_sync_sparepart_delivery' ADD COLUMN 'grWhName' text"
];
var sql_version_1_0_8 = [
  "ALTER TABLE 'eam_sync_sparepart_delivery' ADD COLUMN 'transferOrderNo' TEXT"
];

var sql_version_1_0_9 = [
  //安装调试表 本地缓存
  "CREATE TABLE IF NOT EXISTS eam_local_install (notiseId INTEGER NOT NULL, notiseNo TEXT," +
  "projectName TEXT, anchor TEXT, assignTime TEXT, planStartTime TEXT,assignOwner TEXT, " +
  "assignDevieNo TEXT,assignTaskID TEXT,assignStatus TEXT, PRIMARY KEY(notiseId))",
  //技改任务表 本地缓存
  "CREATE TABLE IF NOT EXISTS eam_local_tech (notiseId INTEGER NOT NULL, notiseNo TEXT," +
  "projectName TEXT, anchor TEXT, assignTime TEXT, planStartTime TEXT,assignOwner TEXT, " +
  "assignDevieNo TEXT,assignTaskID TEXT,assignStatus TEXT, PRIMARY KEY(notiseId))"
];
var sql_version_1_0_10 = [
  //调拨单增加转办仓库字段。
  "ALTER TABLE 'eam_sync_sparepart' ADD COLUMN 'shiftWarehouseId' INTEGER"
];

var sql_version_1_0_11 = [
  //调拨单增加仓库Id字段。
  "ALTER TABLE 'eam_sync_sparepart' ADD COLUMN 'grWhId' INTEGER",
  "ALTER TABLE 'eam_sync_sparepart' ADD COLUMN 'giWhId' INTEGER",
  "ALTER TABLE 'eam_sync_sparepart_delivery' ADD COLUMN 'grWhId' INTEGER",
  "ALTER TABLE 'eam_sync_sparepart_delivery' ADD COLUMN 'giWhId' INTEGER"
];
var sql_version_1_0_12 = [
  //定维、安装、技改本地缓存表分别增加字段anchorName,statusName.
  "ALTER TABLE 'eam_local_install' ADD COLUMN 'anchorName' TEXT",
  "ALTER TABLE 'eam_local_install' ADD COLUMN 'statusName' TEXT",
  "ALTER TABLE 'eam_local_tech' ADD COLUMN 'anchorName' TEXT",
  "ALTER TABLE 'eam_local_tech' ADD COLUMN 'statusName' TEXT",
  "ALTER TABLE 'eam_local_notification' ADD COLUMN 'anchorName' TEXT",
  "ALTER TABLE 'eam_local_notification' ADD COLUMN 'statusName' TEXT"
];
var sql_version_1_0_13 = [
  //技改整改表增加通知单编号字段
  "ALTER TABLE 'eam_local_tech' ADD COLUMN 'transNoticeNo' TEXT"
];
var sql_version_1_0_14 = [
  //风机设备列表表格
  "CREATE TABLE if not exists eam_machine_equipment( " +
  " 'id' int  not null," +//主键,风机列表中按照此id选中对应的风机
  " 'machine_type_name' text," +//风机类型
  " 'machine_id' int," +//风机ID
  " 'machine_type_id' text," +//风机类型id
  " 'project_id' text," +//项目ID
  " 'project_name' text ," +//项目名称
  " 'position_id' text," +//机位id,后台需要
  "  primary key ('id') " +
  " );"
  ,
  //风机设备树形结构及设备详情信息表
  "CREATE TABLE if not exists eam_machine_equipment_detail( " +
  " 'equipment_id' int  not null," +//设备ID
  " 'machine_id' int," +//风机ID
  " 'parent_id' int ," +//父节点ID
  " 'equipment_level' int," +//设备位置（层级）1.模板下第一层设备，2设备下的第一层设备，以此类推
  " 'equipment_name' text," +//设备名称
  " 'equipment_coding' text," +//设备编码
  " 'equipment_position_coding' text," +//设备位置编码
  " 'vendor_shortname' text," +//设备供应商简称
  " 'equipment_memo' text," +//设备说明
  " 'material_no' text," +//物料号
  " 'series_no' text," +//序列号
  " 'aog_acceptance_date' int," +//到货验收日期
  " 'production_date' int," +//出厂日期
  " 'warranty_supplier_begindate' int," +//质保开始日期
  " 'guarantee_period' int," +//质保期
  " 'qi_vendor_shortname' int," +//质量信息供应商简称
  " 'software_version' int," +//软件版本号
  " 'create_by' int," +//创建用户ID
  " 'create_on' int," +//创建日期
  " 'last_upd_by' int," +//修改用户ID
  " 'last_update_datetime_api' int," +//修改日期
  " 'if_flag' int," +//0:有效  1：无效
  " 'is_flag' int," +//是否必填序列号（0否1是）
  "  primary key ('equipment_id') " +
  " );"
];
var sql_version_1_0_15 = [
  "ALTER TABLE 'eam_machine_equipment' ADD COLUMN 'areaCode' TEXT",//区域码
  "ALTER TABLE 'eam_machine_equipment' ADD COLUMN 'areaName' TEXT",//区域名称
  //重新创建设备详情表只需几个字段
  "drop table if exists eam_machine_equipment_detail;",
  //风机设备树形结构及设备详情信息表
  "CREATE TABLE if not exists eam_machine_equipment_detail( " +
  " 'id' int," +//ID,和风机id一样,唯一
  " 'machineId' int," +//风机ID
  " 'equipmentTreeJson' text," +//设备树json
  " 'equipmentsDetailsJson' text," +//设备详情json
  " 'fanMachineInfo' text" +//风机信息
  " );"
];
var sql_version_1_0_16 = [
  //工单报工信息表
  "CREATE TABLE IF NOT EXISTS 'eam_sync_workhours' (" +
  " 'id' INTEGER NOT NULL,'json' TEXT, 'workerId' TEXT, 'worker' TEXT, 'startDate' integer, 'endDate' integer, " +
  " 'workType' text,'workTypeName' text,'workedTotalHours' text, 'workOrderId' TEXT, 'workOrderNo' TEXT, 'projectId' TEXT, 'project' TEXT, 'content' text, 'activeFlag' integer, 'uploadStatus' integer, 'downloadStatus' integer, " +
  " PRIMARY KEY('id'))"
];
var sql_version_1_0_17 = [
  //问题报告信息表
  "CREATE TABLE IF NOT EXISTS 'eam_sync_problemreport' (" +
  " 'problemId' INTEGER NOT NULL,'json' TEXT, 'problemNo' TEXT, 'workorderId' TEXT, 'workorderCode' TEXT, 'projectId' TEXT, " +
  " 'projectName' TEXT, 'areaCode' text, 'areaDesc' text, 'problemType' text, 'problemTypeDesc' text, 'problemSubject' text," +
  " 'problemDesc' TEXT, 'problemStatus' text, 'problemStatusDesc' text, 'problemCreater' text, 'submitDate' text, " +
  " 'uploadStatus' integer, 'downloadStatus' integer, PRIMARY KEY('problemId'))"
];

var sql_version_1_0_18 = [
  //问题报告信息表
  "delete from eam_sync_material"
];
var sql_version_1_0_19=[
  //人员信息表
  "CREATE TABLE IF NOT EXISTS 'eam_sync_user' (" +
  " 'id' INTEGER NOT NULL,'json' TEXT, 'realname' TEXT, 'typechname' TEXT, 'name' TEXT, 'companyName' TEXT, 'roleNames' TEXT, " +
  " 'selProjects' text, 'departmentName' text, 'jobTypeName' text, 'jobName' text, 'uploadStatus' integer,'downloadStatus' integer, " +
  " PRIMARY KEY('id'))"
];
var sql_version_1_0_20 = [
  //添加sapInventoryFlag
  "ALTER TABLE 'eam_sync_material' ADD COLUMN 'sapInventoryFlag' INTEGER"
];
var sql_version_1_0_21 = [
  //调拨单增加仓库expectReceiveDateTime字段。
  "ALTER TABLE 'eam_sync_sparepart' ADD COLUMN 'expectReceiveDateTime' INTEGER",
  "ALTER TABLE 'eam_sync_sparepart_delivery' ADD COLUMN 'receivingTime' INTEGER"
];
var sql_version_1_0_22 = [
  //增加用户手册的表
  'create table if not exists "eam_manual" ("manualId" int,"manualJson" text,primary key("manualId"))'
];
var sql_version_1_0_23 = [
  //将故障工单从一个大表中独立出来
  " create table if not exists 'eam_table_faultWorkOrder'(" +//故障工单
  "'activeFlag' text ," +
  "'areaType' text ," +
  "'areaTypeName' text ," +
  "'assignPerson' text ," +
  "'faultBegindate' integer ," +
  "'faultCode' text ," +
  "'faultName' text ," +
  "'lastUpdateDatetimeApi' integer ," +
  "'createOn' integer ," +
  "'planBegindate' integer ," +
  "'planEnddate' integer ," +
  "'planNoticeId' text ," +
  "'positionCode' text ," +
  "'positionId' text ," +
  "'projectId' text ," +
  "'projectName' text ," +
  "'siteManager' text ," +
  "'taskAccepted' text ," +
  "'transNoticeNo' text ," +
  "'workTypeId' text ," +
  "'workTypeName' text ," +
  "'workorderCode' text ," +
  "'workorderId' text not null," +
  "'workorderStatus' text ," +
  "'workorderStatusName' text ," +
  "'workorderTitle' text ," +
  "'workorderType' text ," +
  "'workorderTypeName' text ," +
  "'json' text ," +
  "PRIMARY KEY('workorderId')" +
  ")",
  ""
];
var sql_version_1_0_24 = [
  "ALTER TABLE 'eam_machine_equipment' ADD COLUMN 'position_code' TEXT"//风机号，用户查看
];
var sql_version_1_0_25 = [
  "ALTER TABLE 'eam_sync_workhours' ADD COLUMN 'isVendor' TEXT"//是否是现场值守人员,1是，0否
];
var sql_version_1_0_26 = [
  "ALTER TABLE 'eam_sync_user' ADD COLUMN 'selProjectIds' TEXT"//是多个项目，某个人员属于多个项目
];
var sql_version_1_0_27 = [
  //定位、技改、安装调试
  " create table if not exists 'eam_table_maintainTechInstallWorkOrder'(" +
  "'activeFlag' text ," +//有效标志
  "'areaType' text ," +// 所属区域
  "'areaTypeName' text ," +// 所属区域名称
  "'assignPerson' text ," +//计划通知单指派人员
  //故障工单：	=========================
  // "'faultBegindate' integer ," +//故障开始日期
  // "'faultCode' text ," +//故障码
  // "'faultName' text ," +//故障名称
  //故障工单：	《=========================
  "'lastUpdateDatetimeApi' integer ," +
  // "'createOn' integer ," +
  "'planBegindate' integer ," +// 计划开始时间
  "'planEnddate' integer ," + // 计划结束时间
  "'planNoticeId' text ," +//计划通知单编号
  "'positionCode' text ," +// 机位号，用户使用
  "'positionId' text ," +// 机位号，后台需要
  "'projectId' text ," +// 项目编号
  "'projectName' text ," +// 项目名称
  "'siteManager' text ," +// 现场经理
  "'taskAccepted' text ," +//数据下载时通知单是否已经接受任务	，为true时表示此任务已在服务端被删除
  "'transNoticeNo' text ," +  //技改通知单编号
  "'uploadStatus' integer ," +//是否需要往服务器同步，1为需求，0为不需要
  "'downloadStatus' integer ," +//是否是从服务器下载，默认为1，日常操作不需要修改此字段。
  "'workTypeId' text ," +// 作业类型id
  "'workTypeName' text ," +// 作业类型名称
  "'workorderCode' text ," +// 工单号
  "'workorderId' text not null," +// 工单id
  "'workorderStatus' text ," +// 状态 Id
  "'workorderStatusName' text ," +// 状态
  "'workorderTitle' text ," +// 工单主题
  "'workorderType' text ," +// 工单类型(查询时 :pc端:37-风云工单,38-人工工单,39-工程工单,67-服务工单,68-整改/技改工单;手机端:4-scada工单；返回时，都是按照pc端的)
  "'workorderTypeName' text ," +// 工单类型名称
  "'json' text ," +
  "PRIMARY KEY('workorderId')" +
  ")",
  ""
];
var sql_version_1_0_28 = [
  "ALTER TABLE 'eam_sync_file' ADD COLUMN 'fileMappingId' integer",//后台将fileId和工单号映射的id
  "ALTER TABLE 'eam_sync_file' ADD COLUMN 'workOrderId' integer"//具体是工单号还是点检项的id会根据拍完照片后得到的fileItem对象中取得
];
var sql_version_1_0_29 = [
  "ALTER TABLE 'eam_sync_workhours' ADD COLUMN 'elseReason' text"
];
var sql_version_1_0_30 = [
  "ALTER TABLE 'eam_table_maintainTechInstallWorkOrder' ADD COLUMN  'createOn' integer"
];
var sql_version_1_0_31 = [
  "ALTER TABLE 'eam_sync_sparepart' ADD COLUMN 'editRight' text"
];
//本地通知单  添加 负责人id 和 机位号 id
var sql_version_1_0_32 = [
  "ALTER TABLE 'eam_local_notification' ADD COLUMN 'assignOwnerId' text",
  "ALTER TABLE 'eam_local_notification' ADD COLUMN 'assignDeviceNoId' text",

  "ALTER TABLE 'eam_local_install' ADD COLUMN 'assignOwnerId' text",
  "ALTER TABLE 'eam_local_install' ADD COLUMN 'assignDeviceNoId' text",

  "ALTER TABLE 'eam_local_tech' ADD COLUMN 'assignOwnerId' text",
  "ALTER TABLE 'eam_local_tech' ADD COLUMN 'assignDeviceNoId' text"

];
var sql_version_1_0_33 = [
  "ALTER TABLE 'eam_table_maintainTechInstallWorkOrder' ADD COLUMN 'assignPersonName' text"
];
var sql_version_1_0_34 = [
  "create table if not exists 'eam_accounts_table'( " +
  "account text," +
  'password text ,' +
  "PRIMARY KEY('account')" +
  ")"
];
var sqlVersions = [];
sqlVersions = mroSqlVersions(sql_versions);
//sql_version_1_0_35 之后的sql定义在这之后,版本号一定要按照小到大的顺序
angular.module('starter.SQLVersion', [])
  .factory("SQLVersion", function ($q, eamDB, Popup, $cordovaSQLite, Storage,eamSync) {
    /**
     * 检查当前数据库脚本情况。
     */
    var checkVersion = function (callback) {
      //检查数据库表是有sqlversion表格
      var checksql = "SELECT * FROM sqlite_master where type='table' and name='eam_version'";
      eamDB.execute(db, checksql)
        .then(function (res) {
          var updatesqls = [];
          var updateSqlVers = sqlVersions.filter(function (sqlVer) {
            return sqlVer.isActive
          });
          var latestSqlVer = updateSqlVers[updateSqlVers.length - 1].sqlVersion;
          if (res.rows.length <= 0) {//首次安装应用
            //说明数据库表不存在，执行数据库脚本创建操作
            updatesqls = updateSqlVers.reduce(function (sqls, sqlVer) {
              return sqls.concat(sqlVer.sqlstatements.filter(function (sql) {
                return sql && sql.length > 0;
              }))
            }, []);
            updatesqls.push('create table if not exists eam_version(version text)');
            updatesqls.push(['insert into eam_version (version) values (?)', [latestSqlVer]]);
            // console.log("首次安装应用, 建表语句:", updatesqls);
            eamDB.sqlBatch(updatesqls)
              .then(function () {
                if(!window.cordova){
                  console.log("当前App版本：" + VERSION_ID);
                  Storage.setCurrentAppVersion(VERSION_ID);
                  callback();//回调;
                  return ;
                }
                cordova.getAppVersion.getVersionNumber().then(function (version) {
                  console.log("当前App版本：" + version);
                  Storage.setCurrentAppVersion(version);
                  callback();//回调;
                })
              })
              .catch(function (e) {
                callback(e);
              });
          } else {
            checksql = "select * from eam_version";
            if(!window.cordova){
              updateAppSqls(checksql,updateSqlVers,latestSqlVer,VERSION_ID,callback);
            }else{
              cordova.getAppVersion.getVersionNumber()
                .then(function (appVersion) {
                  console.log("当前App版本：" + appVersion);
                  updateAppSqls(checksql,updateSqlVers,latestSqlVer,appVersion,callback);
                });
            }
          }
        }, function () {
          callback(err);
          console.error(err);
        });
    };
    function generateVersionNum(versionName) {
      return +(versionName.match(/\d+/g)+"").replace(/,/g,'');
    }
    function updateAppSqls(checksql,updateSqlVers,latestSqlVer,appVersion,callback) {
      eamDB.execute(db, checksql)
        .then(function (res) {
          if (res.rows.length > 0) {
            // +("sql_version_1_0_15".match(/\d+/g)+"").replace(/,/g,'')===>1015
            var version = generateVersionNum(res.rows.item(0)["version"]);
            var newSqlVers = updateSqlVers.filter(function (sqlVer) {
              console.log(generateVersionNum(sqlVer.sqlVersion),">",version,generateVersionNum(sqlVer.sqlVersion)>version);
              return generateVersionNum(sqlVer.sqlVersion) > version;
            });
            var newSqls = newSqlVers.reduce(function (sqls, sqlVer) {
              return sqls.concat(sqlVer.sqlstatements.filter(function (sql) {
                return sql && sql.length > 0
              }));
            }, []);
            console.log("newSqls",newSqls);
            newSqls.push(['update ' + mroSqlTables.eam_version + " set version=? ", [latestSqlVer]]);
            if(Storage.getCurrentAppVersion()!==appVersion){//如果app版本更新
              console.log("App更新了版本，需要清空数据");
              (function () {
                for(var tableName in mroSqlTables){
                  newSqls.push('delete from '+tableName);
                }
              })()
            }
            eamDB.sqlBatch(newSqls)
              .then(function () {
                callback();
                Storage.setCurrentAppVersion(appVersion);
              }).catch(function (e) {
              callback(e);
            })
          }
        }, function (err) {
          callback(err);
          console.error(err);
        });
    }
    var tables = [
      'eam_local_install',
      'eam_local_notification',
      'eam_local_tech',
      'eam_table_maintainTechInstallWorkOrder',//安装、定维、技改任务单
      'eam_machine_equipment',//风机列表
      'eam_machine_equipment_detail',//设备树
      'eam_sync_problemreport',
      'eam_sync_sparepart',
      'eam_sync_sparepart_delivery',
      'eam_sync_user',
      'eam_sync_workhours',
      'eam_table_maintainTechInstallWorkOrder',
      "eam_table_faultWorkOrder"//故障工单
    ];


    //第二次之后登陆，不删除已经下载过的表，并且将这些表中的已同步字段改为1
    var statusToChangeFuncs = [
      //基础数据
      // 'SyncCommonManual.getCommonManual',//指导书
      // "SyncCommonMaterial.downloadList",//物料
      "SyncCommonProject.downloadList",//项目信息
      //"SyncCommonDictionary.downloadList",//字典信息
      'SyncCommonDeviceEquipment.downloadList',//风机设备
      "SyncUsers.downloadList", //可选用户
      "SyncRepertory.downloadList",//仓库信息
      //作业数据
      // "SyncSchdlemaintain.downloadList",//工单数据 --废弃
      "eamMTInstallWorkOrderFactory.downLoadWorkOrders",//定维、安装、调试 工单数据
      "eamFaultWorkOrderFactory.downloadFaultOrders",//故障工单数据
      "SyncSparepart.downloadList",//备品备件
      "SyncSparepartDelivery.downloadList",//备件发货
      "SyncWorkorder.downloadList",//人员报工
      "SyncWorkHours.downloadList" //工时填报
    ];
    //更新eam_sync 中 需要重新执行的同步方法所对应的更新标志:eam_type == 0:0未更新，1：已更新
    var ckeckSyncStatus = function () {
      var defer0 = $q.defer();
      var deleteSqls = [];
      for (var i = 0; i < tables.length; i++) {
        //deleteSqls.push("drop table if exists " + tables[i]);
        deleteSqls.push("delete from " + tables[i]);
        //for (var j = 0; j < temSqlVersions.length; j++) {
        //  var temSqls = eval(temSqlVersions[j])
        //    .filter(function (sql) {
        //      var reg = "/\\b"+tables[i]+"\\b/";
        //      console.log(eval(reg));
        //      return StringUtils.isNotEmpty(sql)
        //        && sql.match(eval(reg));
        //    });
        //    temSqls.forEach(function(sql){
        //      createSqls.push(sql);
        //    });
        //  if (temSqls.length > 0) {
        //    console.log(createSqls);
        //    console.log("需要新建的表格："+tables[i], temSqls);
        //  }
        //}
      }
      var updateSqls = [];
      for (var i = 0; i < statusToChangeFuncs.length; i++) {
        var values = [];
        values.push(statusToChangeFuncs[i]);
        updateSqls.push(values);
      }
      async.autoInject({
        "deleteSqls": function (callback) {
          return callback(null, deleteSqls);
        },
        "updateSqls": function (callback) {
          return callback(null, updateSqls);
        },
        "deleteTablesActions": ['deleteSqls', deleteTablesActions],
        "updateSyncTypeActions": ['deleteTablesActions', 'updateSqls', updateSyncTypeActions]
      }, function (err) {
        if (err) {
          defer0.reject(err);
        } else {
          defer0.resolve(true);
        }
      });
      return defer0.promise;
    };

    function deleteTablesActions(deleteSqls, callback) {
      eamDB.executeBatchSqls(db, deleteSqls)
        .then(function () {
          callback()
        }, function (err) {
          callback(err)
        });

    }

    function updateSyncTypeActions(deleteTablesActions, updateSqls, callback) {
      var start = new Date;
      eamDB.insertCollection(db, "update eam_sync set sync_type = '0', update_time = 0 where sync_type = '1'  and sync_func = ? ", updateSqls)
        .then(function () {
          console.log("更新同步函数状态耗时：" + (new Date - start) + " ms");
          callback()
        }, function (err) {
          callback(err)
        });
    }

    var selectNotSyncFunc = function (callback) {
      eamDB.execute(db, 'select * from eam_sync')
        .then(function (res) {
          if (res.rows.length > 0) {//不是第一次使用
            var syncFuncs = [];
            var sql = "select sync_func from eam_sync where sync_type = '0' ";
            eamDB.execute(db, sql).then(function (res) {
              //console.log(res.rows);
              for (var i = 0; i < res.rows.length; i++) {
                syncFuncs.push(res.rows.item(i)['sync_func']);
              }
              callback(syncFuncs);
            }, function (err) {
              console.log("err" + err);
              callback(false);
            })
          } else {//第一次使用该应用
            if (isDebug) {
              console.log("//第一次使用该应用,初始化需要下载的函数");
            }
            var sql0 = " insert into eam_sync (sync_type,sync_func)values(0,?)";
            var syncBaseFunctions = eamSync.getDownSyncBaseFunctions();
            var syncBusinessFunctions = eamSync.getDownSyncBusinessFunctions();
            var bindings = [];
            var cbFuncs = [];
            syncBaseFunctions.concat(syncBusinessFunctions).forEach(function (item) {
              var values = [];
              cbFuncs.push(item);
              values.push(item);
              bindings.push(values);
            });
            eamDB.insertCollection(db, sql0, bindings)
              .then(function (res) {
                callback(cbFuncs);
              }, function (err) {
                console.error(err)
              });
          }

        }, function (err) {
          console.error(err);
        });

    };

    // window.onerror = function (msg, url, line) {
    //     var idx = url.lastIndexOf("/");
    //     if (idx > -1) {
    //         url = url.substring(idx + 1);
    //     }
    //     alert("ERROR in " + url + " (line #" + line + "): " + msg);
    //     return false;
    // };
    function notExistCreateAccountsTable(callback) {
      var createAccountsTableSql = sql_version_1_0_34;
      if (!db) {
        eamDB.openDB(DB_NAME);
      }
      var checkTableSql = "SELECT * FROM sqlite_master where type=? and name=? ";
      eamDB.execute(db, checkTableSql, ['table', 'eam_accounts_table'])
        .then(function (res) {
          if (res.rows.length > 0) {
            callback();
          } else {
            eamDB.execute(db, createAccountsTableSql).then(function () {
              callback()
            }, function (err) {
              callback(err);
            });
          }
        }, function (err) {
          Popup.promptMsg("查找数据库主表失败");
        });
    }

    return {
      checkVersion: checkVersion,
      ckeckSyncStatus: ckeckSyncStatus,//修改同步表 中 是否同步的标志位
      selectNotSyncFunc: selectNotSyncFunc,
      notExistCreateAccountsTable: notExistCreateAccountsTable
    };
  });
