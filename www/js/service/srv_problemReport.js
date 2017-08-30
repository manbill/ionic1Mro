starter
  .factory('ProblemReportService',
  function (DataCache, Popup,OrderService, $rootScope, $timeout, eamDB, $ionicActionSheet, $cordovaCamera, eamFile) {
    var getProblemReportList = "select * from eam_sync_problemreport where 1=1 ";

    var getWorkerList = "select * from eam_sync_user where 1=1 ";

    var getWorkOrderList = "select * from eam_sync_workorder where 1=1 ";

    var insertsql = "insert into eam_sync_problemreport (json, workerId, worker, startDate, endDate, workType, " +
      "workOrderId, workOrderNo, projectId, project, content, activeFlag, uploadStatus, downloadStatus, id) " +
      "values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

    var updatesql = "update eam_sync_problemreport set json=?, workerId=?, worker=?, startDate=?, endDate=?, workType=?, " +
      "workOrderId=?, workOrderNo=?, projectId=?, project=?, content=?, activeFlag=?, uploadStatus=?, downloadStatus=? where id=? ";

    var selectsql = "select id from eam_sync_problemreport where id=? ";
    //根据workorderId删除工单(未上传工单)
    var deleteProblemReportTemp = "delete from eam_sync_problemreport where id=? ";
    var selectDicDetailByDetailId = "select * from eam_sync_dictionary_detail where detailId=? ";
    var updateProblemReportStatus = "update eam_sync_problemreport set json=?, activeFlag=1, uploadStatus=1 where id=?";

    var getDicId2NameByDictionaryIdSql = "select * from eam_sync_dictionary_detail where dictionaryId = ?";
    var getDicId2NameByParaTypeSql = "select * from eam_sync_dictionary_detail where paraType = ?";


    //构建数据结构
    function createProblemReport(pr) {
      //如果工单id为空则为新增
      if (!pr.problemId) {
        pr.problemId = new Date().getTime();
      }
      var problemReport = [];
      problemReport.push(pr);
      return problemReport;
    }

    function updateOrInsert(problemReport, callback) {
      var workHour = problemReport.shift();
      if (workHour != undefined) {
        //创建fileidlist
        eamDB.execute(db, selectsql, [workHour["problemId"]]).then(function (res) {

          delete workHour.json;

          var values = [];
          values.push(JSON.stringify(workHour));
          values.push(workHour["workerId"]);
          values.push(workHour["workerName"]);
          values.push(workHour["bDate"]);
          values.push(workHour["eDate"]);
          values.push(workHour["workType"]);
          values.push(workHour["workorderId"]);
          values.push(workHour["workorderCode"]);
          values.push(workHour["projectId"]);
          values.push(workHour["project"]);
          values.push(workHour["content"]);
          values.push((workHour["activeFlag"] != undefined && workHour["activeFlag"] != null) ? workHour["activeFlag"] : 0);
          values.push(1);//uploadStatus，是否需要往服务器同步，1为需求，0为不需要
          values.push(1);//downloadStatus，是否是从服务器下载，默认为1，日常操作不需要修改此字段。

          values.push(workHour["problemId"]);
          if (res.rows.length > 0) {
            //说明有数据，执行update操作
            eamDB.execute(db, updatesql, values).then(function () {
              updateOrInsert(problemReport, callback);
            }, function (err) {
              console.error(err);
            });
          } else {
            //说明没有数据，执行insert操作
            eamDB.execute(db, insertsql, values).then(function () {
              updateOrInsert(problemReport, callback);
            }, function (err) {
              console.error(err);
            });
          }
        }, function (err) {
          console.error(err);
        });
//      updateOrInsert(problemReport, callback);
      } else {
        if ($.isFunction(callback)) {
          callback();
        }
      }
    }

//根据paratype获取字典项
    function getDicListByType(type, callback) {
      var getDicListByTypeSQL = "select * from eam_sync_dictionary_detail where paraType=? ";
      eamDB.execute(db, getDicListByTypeSQL, [type]).then(function (res) {
        callback(ChangeSQLResult2Array(res));
      }, function (err) {
        callback();
      });
    }

//sql结果转array
    function ChangeSQLResult2Array(resp) {
      var array = new Array();
      for (var i = 0, len = resp.rows.length; i < len; i++) {
        array.push(resp.rows.item(i));
      }
      return array;
    }

    //列表查询方法

    function loadMoreProblemReportData(params,callback) {
      var skipR = (params.pageNumber - 1) * 5;
      var SqlFiter = "";//sql条件
      var bindings = [];
      if (StringUtils.isNotEmpty(params.areaCode)) {
        SqlFiter += " and areaCode = ? ";
        bindings.push(params.areaCode)
      }
      if (StringUtils.isNotEmpty(params.projectId)) {
        SqlFiter += " and projectId = ? ";
        bindings.push(params.projectId)
      }
      if (StringUtils.isNotEmpty(params.problemType)) {
        SqlFiter += " and problemType = ? ";
        bindings.push(params.problemType)
      }
      if (StringUtils.isNotEmpty(params.problemSubject)) {
        SqlFiter += " and problemSubject like ? ";
        bindings.push("%" + params.problemSubject + "%")
      }
      if (StringUtils.isNotEmpty(params.submitStartDate)) {
        SqlFiter += " and submitDate >= ? ";
        bindings.push(params.submitStartDate.getTime());
      }
      if (StringUtils.isNotEmpty(params.submitEndDate)) {
        SqlFiter += " and submitDate <= ? ";
        bindings.push(params.submitEndDate.getTime());
      }
      if (StringUtils.isNotEmpty(params.problemStatus)) {
        SqlFiter += " and problemStatus = ? ";
        bindings.push(params.problemStatus);
      }
      SqlFiter += " order by submitDate desc,problemStatus asc limit ?,5 ";
      bindings.push(skipR);
      eamDB.execute(db, getProblemReportList + SqlFiter, bindings).then(function (res) {
        callback(OrderService.ChangeSQLResult2Array(res));
      }, function (err) {
        console.error(err);
      });
    }

    function loadWorkerInfo(params, callback) {

      var SqlFiter = "";//sql条件
      SqlFiter += params.realname ? " and realname like '%" + params.realname + "%'" : "";
      eamDB.execute(db, getWorkerList + SqlFiter).then(function (res) {
        callback(res);
      }, function (err) {
        console.error(err);
      });
    }

    function loadWorkOrderInfo(params, callback) {

      var SqlFiter = "";//sql条件
      SqlFiter += params.orderno ? " and orderno like '%" + params.orderno + "%'" : "";
      eamDB.execute(db, getWorkOrderList + SqlFiter).then(function (res) {
        callback(res);
      }, function (err) {
        console.error(err);
      });
    }

//删除工单数据
    function deleteProblemReportRecord(work, callback) {
      //临时数据直接删除
      if (work.id < 0) {
        eamDB.execute(db, deleteProblemReportTemp, [work.id]).then(function (res) {
          callback(res);
        }, function (err) {
          console.error(err);
        });
      } else {
        //同步数据另行处理
        var json = JSON.parse(work.json);
        json.activeFlag = 1;
        eamDB.execute(db, updateProblemReportStatus, [JSON.stringify(json), work.id]).then(function (res) {
          callback(res)
        }, function (err) {
          console.error(err);
        });
      }
    }



    //根据detailid获取字典项
    function getDicDetailById(DetailId, callback) {
      eamDB.execute(db, selectDicDetailByDetailId, [DetailId]).then(function (res) {
        callback(res);
      }, function (err) {
        console.error(err);
      });

    }


    /****************图片相关处理功能****************/
    /**
     * 图片上传功能不是在这里实现的。
     */
    function addeditAttachment(fileList, item) {

      //camera
      var appendByCamera = function (moveFile) {

        var options = {
          quality: 50,
          destinationType: Camera.DestinationType.FILE_URI,
          sourceType: Camera.PictureSourceType.CAMERA,
          encodingType: Camera.EncodingType.JPEG,
          mediaType: Camera.MediaType.PICTURE,
          targetWidth: 1024,
          targetHeight: 1024,
          popoverOptions: CameraPopoverOptions,
          saveToPhotoAlbum: false,
          correctOrientation: true
        };

        $cordovaCamera.getPicture(options).then(function (imageURI) {
          moveFile(imageURI);
        }, function (err) {
        });
      };
      //image picker
      var pickImage = function (moveFile) {
        var options = {
          destinationType: Camera.DestinationType.FILE_URI,
          sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
          targetWidth: 1024,
          targetHeight: 1024
        };
        $cordovaCamera.getPicture(options).then(function (imageURI) {
          moveFile(imageURI);
        }, function (err) {
        });
      };

      var moveFile = function (imageURL) {
        //将文件移动到指定位置，并将数据添加到对象中
        //同时显示选择的图片信息。
        eamFile.moveFileToUpload(imageURL, function (path) {
          if (!item) {
            item = {};
          }
          item.filePath = path;
          item.fileId = path;
          fileList.push(item);
        });
      };

      $ionicActionSheet.show({
        buttons: [
          {text: '相机'},
          {text: '图库'}
        ],
        titleText: '请选择类别',
        cancelText: '关闭',
        cancel: function () {
          return true;
        },
        buttonClicked: function (index) {
          switch (index) {
            case 0:
              appendByCamera(moveFile);
              break;
            case 1:
              pickImage(moveFile);
              break;
            default:
              break;
          }
          return true;
        }
      });
    };


    //根据detailid获取字典项
    function getDicId2NameByDictionaryId(dictionaryId, callback) {
      eamDB.execute(db, getDicId2NameByDictionaryIdSql, [dictionaryId]).then(function (res) {
        var ids2Names = [];
        if (res.rows.length > 0) {
          for (var i = 0; i < res.rows.length; i++) {
            ids2Names.push({
              detailId: res.rows.item(i)["detailId"],
              detailName: res.rows.item(i)["detailName"]
            });
          }
        }
        callback(ids2Names);
      }, function (err) {
        console.error(err);
      });

    }

    function getDicId2NameByParaType(paraType, callback) {
      eamDB.execute(db, getDicId2NameByParaTypeSql, [paraType]).then(function (res) {
        if (res.rows.length > 0) {
          var results = [];
          for (var i = 0; i < res.rows.length; i++) {
            var result = res.rows.item(i);
            results.push({
              detailId: result.detailId,
              detailName: result.detailName
            });
          }
          if(angular.isFunction(callback))callback(results);
        }else{
          if(angular.isFunction(callback))callback([]);
        }
      }, function (err) {
        console.error(err);
      })
    }

    return {
      //根据dictionaryId获取字典里面的id到名字的映射
      getDicId2NameByDictionaryId: getDicId2NameByDictionaryId,
      getDicId2NameByParaType: getDicId2NameByParaType,
      //选择图片
      addeditAttachment: addeditAttachment,
      //更改工单状态
      //删除工单记录
      deleteProblemReportRecord: deleteProblemReportRecord,
      createProblemReport: createProblemReport,
      loadMoreProblemReportData: loadMoreProblemReportData,
      loadWorkerInfo: loadWorkerInfo,
      loadWorkOrderInfo: loadWorkOrderInfo,
      //sql结果转array
      ChangeSQLResult2Array: ChangeSQLResult2Array,
      //根据type获取字典列表
      getDicListByType: getDicListByType,
      //工单创建或修改方法
      updateOrInsert: updateOrInsert
    }
      ;
  });
