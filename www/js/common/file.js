/**
 * 文件管理工具
 */
angular.module('starter.eamFile', [])
  .factory("eamFile",
    function ($q, $cordovaFile, $cordovaDevice, $cordovaFileTransfer, $ionicPlatform, eamDB,
              Popup, Storage, $window, $cordovaCamera, $ionicActionSheet, $http, $state, starterClassFactory) {
      var api_uploadFile = baseUrl + "/api/common/uploadFile.api";
      var api_getFileType = baseUrl + "/api/common/getFileType.api";
      var api_getFile = baseUrl + "/api/common/getFile.api";
      var tableName = "eam_sync_file";
      var insertOneFileSQL = "insert into eam_sync_file(" +
        "fileId," +
        "filePath, " +
        "originalFilename, " +
        "contentType, " +
        "size, " +
        "downloadStatus, " +//1代表已经下载，0代表未下载到本地
        "lastUpdateDatetimeApi, " +
        "fileMappingId, " +//integer
        "workOrderId " +//具体是工单号还是点检项的id会根据拍完照片后得到的fileItem对象中取得
        ")values(?,?,?,?,?,?,?,?,?)";
      var updateOneFileSQL = "update " + tableName + " set " +
        "filePath=?, " +
        "originalFilename=?, " +
        "contentType=?, " +
        "size=?, " +
        "downloadStatus=?, " +
        "lastUpdateDatetimeApi=?, " +
        "fileMappingId=?, " +
        "workOrderId=? " +
        "where fileId=? ";
      var eamFilesParentPath = "";//应用的文件父路径
      /**
       * 下载文件所在的目录名称 downloadFilesDir
       * @type {string}
       */
      var downloadFilesDir = "downloadFilesDir/";
      var downLoadFilesUrl = "";
      /**
       * 上传文件所在的目录名称 uploadFilesDir
       * @type {string}
       */
      var uploadFilesDir = "uploadFilesDir/";
      var uploadFilesUrl = "";
      /**
       * 检查文件夹是否存在，不存在则创建
       */
      var initLocalFileSystem = function () {
        var downLoadDefer = $q.defer();
        var uploadDefer = $q.defer();
        if (window.cordova) {
          document.addEventListener('deviceready', function () {
            if ($cordovaDevice.getPlatform().toLocaleLowerCase() == "ios") {
              eamFilesParentPath = cordova.file.documentsDirectory;
            } else if ($cordovaDevice.getPlatform().toLocaleLowerCase() == "android") {
              eamFilesParentPath = cordova.file.externalDataDirectory;
            }
            $cordovaFile.checkDir(eamFilesParentPath, downloadFilesDir)
              .then(function (success) {
                downLoadFilesUrl = success.nativeURL;
                console.log("检查下载文件夹结果成功：" + JSON.stringify(success));
                downLoadDefer.resolve();
              }, function (error) {
                console.log("检查下载文件夹结果失败：" + JSON.stringify(error));
                $cordovaFile.createDir(eamFilesParentPath, downloadFilesDir, true)
                  .then(function (success) {
                    downLoadFilesUrl = success.nativeURL;
                    downLoadDefer.resolve();
                    console.log("创建下载文件夹成功：" + JSON.stringify(success));
                  }, function (error) {
                    console.log("创建下载文件夹失败：" + JSON.stringify(error));
                    downLoadDefer.reject(error);
                  });
              });
            $cordovaFile.checkDir(eamFilesParentPath, uploadFilesDir)
              .then(function (success) {
                console.log("检查上传文件夹结果成功：" + JSON.stringify(success));
                uploadFilesUrl = success.nativeURL;
                uploadDefer.resolve();
              }, function (error) {
                console.log("检查上传文件夹结果失败：" + JSON.stringify(error));
                $cordovaFile.createDir(eamFilesParentPath, uploadFilesDir, true).then(function (success) {
                  console.log("创建上传文件夹成功：" + JSON.stringify(success));
                  uploadFilesUrl = success.nativeURL;
                  uploadDefer.resolve();
                }, function (error) {
                  console.log("创建上传文件夹失败：" + JSON.stringify(error));
                  uploadDefer.reject(error);
                });
              });
          });
        } else {
          uploadDefer.resolve();
          downLoadDefer.resolve();
        }
        return $q.all(uploadDefer, downLoadDefer);
      };

      /**
       * 清除上传换成文件夹
       * 默认在同步任务全部执行完成后执行清除操作。
       *
       */
      var clearUploadFile = function (callback) {
        $cordovaFile.removeDir(eamFilesParentPath, uploadFilesDir).then(function (success) {
          if ($.isFunction(callback)) {
            callback();
          }
        }, function (error) {
          if ($.isFunction(callback)) {
            callback();
          }
        });
      };

      function fileItemPropertiesOp(newFileEntry, fileItem, newFileName, fileEntry, callback) {
        if (isDebug) {
          console.log("moveOrCopyFileToDirectory,moveTo" + JSON.stringify(newFileEntry, undefined, 2));
        }
        newFileEntry.getMetadata(function (metaData) {
          if (isDebug) {
            console.log("moveOrCopyFileToDirectory,moveTo,metadata:" + JSON.stringify(metaData, undefined, 2));
          }
          if (!$ionicPlatform.isIOS) {
            fileItem.filePath = decodeURI(newFileEntry.nativeURL);
          }
          ;
          // fileItem.filePath = decodeURI(newFileEntry.nativeURL);
          fileItem.fileId = fileItem.filePath;
          fileItem.fileSize = metaData.size;
          fileItem.activeFlag = 1;//默认显示图片
          fileItem.flag = 0;//表示该图片已经不需要再移动到upload目录下面了
          fileItem.fileOriginalName = fileItem.fileActualName = newFileName;
          fileItem.createOn = new Date();
          if (isDebug) {
            console.log("fileItemPropertiesOp,fileItem" + JSON.stringify(fileItem, undefined, 2));
          }
          callback(null);
        }, function (err) {
          callback(err);
        });
      }

      /**
       *  "isFile": true,
       "isDirectory": false,
       "name": "1491834614219.jpg",
       "fullPath": "/1491834614219.jpg",
       "filesystem": "<FileSystem: temporary>",
       "nativeURL": "file:///storage/emulated/0/Android/data/com.sec.eamapp/cache/1491834614219.jpg"
       * @param imageURI
       * @param fileItem
       * @param directory
       * @param callback
       * @param isCopy
       */
      var moveOrCopyFileToDirectory = function (imageURI, fileItem, directory, isCopy, callback) {
        // alert("imageURI, fileItem, directory, isCopy, callback :" + JSON.stringify(imageURI) + JSON.stringify(fileItem) + JSON.stringify(directory) + JSON.stringify(isCopy) + JSON.stringify(callback));
        //   imageURI = "cdvfile://"+ imageURI;
        //   alert("moveOrCopyFileToDirectory imageURI: " +  imageURI + "moveOrCopyFileToDirectory directory: " + directory);
        $window.resolveLocalFileSystemURL(imageURI, function (fileEntry) {
          console.log("fileEntry" + JSON.stringify(fileEntry, undefined, 2));
          fileItem.fileType = fileEntry.name.substring(fileEntry.name.lastIndexOf(".") + 1);
          var newFileName = fileItem.fileOriginalName ? fileItem.fileOriginalName + "_" + fileEntry.name : fileEntry.name;
          $window.resolveLocalFileSystemURL(directory, function (newFileEntry) {
            if (!isCopy) {
              fileEntry.moveTo(newFileEntry, newFileName, function (result) {
                fileItemPropertiesOp(result, fileItem, newFileName, fileEntry, callback);
              });
            } else {//拷贝文件，只有选择图库的附件才使用拷贝做法
              // newFileName = fileItem.fileOriginalName + "." + fileItem.fileType;
              fileEntry.copyTo(newFileEntry, newFileName, function (entry) {
                // alert("copy success " + directory + " / " + newFileName);
                fileItemPropertiesOp(entry, fileItem, newFileName, fileEntry, callback);
              });
            }
          }, function (err) {
            // alert("目标文件目录检测失败 "+ JSON.stringify(err));
            onErrorLoadFs(err);
            callback(err || "打开文件失败");
          });
        }, function (err) {
          // alert("源文件目录检测失败 "+ JSON.stringify(err));
          onErrorLoadFs(err);
          callback(err || "请求文件系统失败");
        });
      };

      /**
       *  获取图片，返回类型promise
       *
       * @param fileItem
       * @param fileItem{
       source：AttachedFileSources 中的类型,
       workorderId:单据的id，
       fileActualName：文件名
      }
       */
      function getPicture(fileItem) {//remark 属性1代表拍照，0代表选取本地图片
        var defer = $q.defer();
        var item = starterClassFactory.attachedFileInstance();
        item.flag = 1;//代表需要将其移动到指定目录，
        item.activeFlag = 1;//默认显示图片
        item.createBy = Storage.getProfile() ? Storage.getProfile()['id'] : null;
        item.createByName = Storage.getProfile() ? Storage.getProfile()['realname'] : null;
        item.workorderId = fileItem.workorderId ? fileItem.workorderId == 'null' ? null : fileItem.workorderId : null;
        item.source = fileItem.source;
        item.fileOriginalName = item.fileActualName = fileItem.fileActualName ? fileItem.fileActualName : '附件';
        item.fileType = 'jpeg';
        item.remark = 1;//默认拍照
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
                appendByCamera();
                break;
              case 1:
                pickImage();
                break;
              default:
                break;
            }
            return true;
          }
        });
        var pickImage = function () {
          var options = {
            destinationType: Camera.DestinationType.FILE_URI,
            sourceType: Camera.PictureSourceType.SAVEDPHOTOALBUM,
            targetWidth: 1024,
            targetHeight: 1024
          };
          onDeviceReady(function () {
            navigator.camera.getPicture(successCallback, errorCallback, options);
            function successCallback(imageURI) {
              //用cdvfile协议， 将file://替换为 cdvfile://
              // imageURI = "cdvfile://" + imageURI.substring(8);
              if (isDebug) {
                console.log("imageURI: 选择照片的处理前url " + imageURI);
              }
              item.filePath = item.fileId = imageURI;
              item.remark = 0;//选取本地照片;
              if (imageURI.lastIndexOf("?") >= 0) {
                var fileType = imageURI.substring(imageURI.lastIndexOf('.') + 1, imageURI.lastIndexOf("?"));
                item.fileType = fileType ? fileType : item.fileType;
                item.filePath = item.fileId = imageURI.substring(0, imageURI.lastIndexOf("?"));
                if (isDebug) {
                  console.log("imageURI: 选择照片的处理后url " + item.filePath);
                }
              }
              defer.resolve(item);
            }

            function errorCallback(err) {
              if (isDebug) {
                console.log("选择照片失败: " + JSON.stringify(err, undefined, 2));
              }
              defer.reject(err);
            }
          });


        };
        var appendByCamera = function () {
          var options = {
            quality: 50,
            destinationType: Camera.DestinationType.FILE_URI,
            sourceType: Camera.PictureSourceType.CAMERA,
            encodingType: Camera.EncodingType.JPEG,
            mediaType: Camera.MediaType.PICTURE,
            targetWidth: 1024,
            targetHeight: 1024,
            popoverOptions: CameraPopoverOptions,
            saveToPhotoAlbum: false
          };
          document.addEventListener("deviceready", function () {
            navigator.camera.getPicture(successCallback, errorCallback, options);
            //$cordovaCamera.getPicture(options).then(successCallback, errorCallback);
            function errorCallback(err) {
              if (isDebug) {
                console.log("拍照失败: " + JSON.stringify(err, undefined, 2));
              }
              defer.reject(err);
            }

            function successCallback(imageURI) {
              if (isDebug) {
                console.log("imageURI: 拍照URl处理前: " + imageURI);
              }
              item.filePath = item.fileId = imageURI;
              item.remark = 1;//代表拍照
              item.fileType = imageURI.substr(imageURI.lastIndexOf(".") + 1);
              defer.resolve(item);
            }
          }, false);

        };
        return defer.promise;
      }

      function onErrorLoadFs(error) {
        console.log(JSON.stringify(error, undefined, 2));
      }

      /**
       * 删除附件，返回类型是promise
       * @param attachedFile
       * @returns promise
       */
      function removeAttachedFile(attachedFile) {
        var defer = $q.defer();
        Popup.confirm("删除附件？", function del() {
          if ($.isNumeric(attachedFile.fileId)) {//需要将数据库中关联的附件删除
            eamDB.execute(db, "delete from eam_sync_file where fileId=?", [+attachedFile.fileId])
              .then(function () {
                if (isDebug) {
                  console.log("从数据库中删除文件成功");
                }
                deleteLocalFiles(attachedFile.filePath)
                  .then(function () {
                    defer.resolve();
                  }, function (e) {
                    Popup.loadMsg('该附件已删除', 500);
                    defer.resolve();
                    // defer.reject(e);
                  });
              }, function (err) {
                defer.reject(err)
              });
          } else {//删除未上传的图片
            if (isDebug) {
              console.log("removeAttachedFile：" + "删除未同步到服务器的图片");
            }
            deleteLocalFiles(attachedFile.filePath)
              .then(function () {
                defer.resolve();
              }, function (e) {
                Popup.loadMsg('该附件已删除', 500);
                defer.resolve();
                // defer.reject(e)
              });
          }
        }, function cancel() {

        }, "确定", "取消");
        return defer.promise;
      }

      /**
       * 新增的照片移动到upload目录,在移动前先判断照片是否还存在本地，不存在则删除
       * @param fileList
       * @param callback
       */
      function moveFileToUpload(fileList, callback) {
        if (!window.cordova && angular.isFunction(callback)) {
          return callback(true);
        }
        Popup.waitLoad("正在处理附件...");
        console.log("附件处理对象：" + JSON.stringify(fileList, undefined, 2));
        var fileItems = [];
        try {
          fileItems = iterateeJsonAction(fileList, true);//找新增的附件;
        } catch (e) {
          fileItems = [];
        }
        if (isDebug) {
          console.log("需要保存的新增附件" + JSON.stringify(fileItems, undefined, 2));
        }
        // alert("fileItems " + JSON.stringify(fileItems));//data ok
        async.eachOf(fileItems, function (fileItem, key, iterateeCallback) {
          if (isDebug) {
            console.log("fileItem.filePath: " + fileItem.filePath);
          }
          if(!fileItem.filePath){
            fileItems.splice(key,1);
            return iterateeCallback(null);//不存在的附件，直接删除
          }
          // fileItem.filePath = "cdvfile://" + fileItem.filePath;
          //   alert("fileItem.filePath: " + fileItem.filePath); //data ok
          $window.resolveLocalFileSystemURL(fileItem.filePath, fileExists, function fail(err) {
            if (isDebug) {
              alert(JSON.stringify(err));
            }
            // fileList.splice(key, 1);//删除该附件
            iterateeCallback({
              errCode: 110,
              errMassage: "系统清除了cache目录下的附件,附件所在工单: " + fileItem.fileOriginalName
            });
          });
          function fileExists(f) {
            /**
             *  "isFile": true,
             "isDirectory": false,
             "name": "IMG_20170717_095140.jpg",
             "fullPath": "/IMG_20170717_095140.jpg",
             "filesystem": "<FileSystem: temporary>",
             "nativeURL": "file:///storage/emulated/0/Android/data/com.sec.eamapp/cache/IMG_20170717_095140.jpg"
             "nativeURL": "file:///storage/emulated/0/Android/data/com.sec.eamapp/files/uploadFilesDir/%E6%95%85%E9%9A%9C%E5%B7%A5%E5%8D%95%E9%99%84%E4%BB%B6_2017-07-27_GZ17070021_IMG_20170726_212319_HHT.jpg"
             */
            console.log("fileExists,f: " + JSON.stringify(f, undefined, 2));
            //   alert("fileItem.filePath: " + fileItem.filePath);
            if (fileItem.flag === 1) {//该附件未被移动到指定目录
              console.log("fileItem" + JSON.stringify(fileItem, undefined, 2));
              moveOrCopyFileToDirectory(fileItem.filePath, fileItem, uploadFilesUrl, false, function (err) {
                if (err) {
                  if (isDebug) {
                    console.log(JSON.stringify(err, undefined, 2));
                  }
                  iterateeCallback(err);
                } else {
                  iterateeCallback();
                }
              });
            } else {//已经不需要将附件移动到指定文件夹
              iterateeCallback();
            }
          }
        }, function (err) {
          Popup.hideLoading();
          if (err) {
            if (err.errCode == 110) {
              var notification = {
                id: 110,
                title: err.errMassage,
                text: JSON.stringify(err),
                badge: 1,
                led: "fff153"
              };
              scheduleNotifications(notification, function () {
                // alert("附件被删除：" + JSON.stringify(err, undefined, 2));
              });
              callback(true);
            } else {
              callback(false, err);
            }
          } else {
            callback(true);
          }
        });//each(coll, iteratee, callbackopt)
      }

      function moveFileToDownload(url, fileItem, callback) {
        // alert("moveFileToDownload " + url +" "+ fileItem+" "+callback);
        moveOrCopyFileToDirectory(url, fileItem, downLoadFilesUrl, callback);
      }

      function uploadAttachedFile(json) {
        var defer = $q.defer();
        var uploadFileItems = [];
        try {
          uploadFileItems = iterateeJsonAction(json, true);//仅查找新增的附件
        } catch (e) {
          uploadFileItems = [];
          alert(JSON.stringify(e));
        }
        if (!window.cordova) {//不再手机上不进行下面的操作
          console.debug("uploadFileItems: 上传前 " + JSON.stringify(uploadFileItems, undefined, 2));
          defer.resolve();
          return defer.promise;
        }
        if (isDebug) {
          console.log("uploadFileItems: 上传前 " + JSON.stringify(uploadFileItems, undefined, 2));
        }
        async.each(uploadFileItems, uploadFileIteratingAction, function (err) {
          if (err) {
            defer.reject(err);
          } else {
            if (isDebug) {
              console.log("成功上传所有照片后,uploadFileItems: " + JSON.stringify(uploadFileItems, undefined, 2));
            }
            defer.resolve();
          }
        });
        return defer.promise;
      }

      function scheduleNotifications(notification, onClick) {
        if (isDebug) {
          console.log(JSON.stringify(notification, undefined, 2));
          onDeviceReady(function () {
            cordova.plugins.notification.local.schedule([notification]);
            if (angular.isFunction(onClick)) {
              cordova.plugins.notification.local.on("click", onClick);
            }
          });
        }
      }

      function uploadFileIteratingAction(fileItem, callback) {
        var uploadFileDefer = $q.defer();
        var dbOperationDefer = $q.defer();
        var options = new FileUploadOptions();
        options.fileKey = "attachFile";
        options.fileName = fileItem.fileOriginalName;
        //options.mimeType="text/plain";
        fileItem.workorderId = fileItem.workorderId == 'null' ? null : fileItem.workorderId;
        options.params = {
          workorderId: fileItem.workorderId,
          source: fileItem.source
        };
        options.requestTimestamp = new Date().getTime();
        options.headers = {tokenId: Storage.getAccessToken()};
        var fileTransfer = new FileTransfer();
        fileTransfer.onprogress = function (progressEvent) {
          if (progressEvent.lengthComputable) {
            Popup.waitLoad("上传进度: " + (progressEvent.loaded / progressEvent.total*100).toFixed(3)+"%");
          } else {
            if (isDebug) {
              console.log("fileTransfer.onprogress: progressEvent " + JSON.stringify(progressEvent));
            }
          }
        };
        var uri = encodeURI(api_uploadFile);
        var fileURL = fileItem.filePath;
        fileTransfer.upload(fileURL, uri, uploadSuccess, uploadFail, options);
        // eamDB.execute(db, "select * from " + tableName + " where filePath=?", [fileURL])//性能慢了许多，但是避免多个工单重复上传相同的附件
        //   .then(function (res) {//如果工单重复选择了同一张图片，这张图片已经上传给了服务器
        //    fileTransfer.upload(fileURL, uri, uploadSuccess, uploadFail, options);
        //   }, function (err) {
        //     callback(err);
        //   });
        function uploadSuccess(fileUploadResult) {
          if (isDebug) {
            console.log("uploadSuccess,req" + JSON.stringify(fileUploadResult, undefined, 2));
          }
          /**
           * eaWoFilemapping.getFilemappingId() + "|" + fileDetailDTO.getOriginalFileName() + "."
           + fileDetailDTO.getFileType() + "|" + eaWoFilemapping.getFileId();
           */
          if (isDebug) {
            console.log(fileUploadResult.response);
          }
          var req = JSON.parse(fileUploadResult.response);
          if (req.retCode == "00000") {
            var results = req.data.split("|");
            if (isDebug) {
              console.log("uploadSuccess,results" + JSON.stringify(results, undefined, 2));
            }
            fileItem.fileId = results[2];
            fileItem.filemappingId = results[0];
            var nameType = results[1];
            if (isDebug) {
              console.log("nameType: " + nameType);
            }
            uploadFileDefer.resolve();
            var values = [];
            values.push(fileItem.fileId);
            values.push(fileItem.filePath);
            values.push(fileItem.fileOriginalName);
            values.push(fileItem.fileType);
            values.push(fileItem.fileSize || 0);
            values.push(1);//1代表已经下载
            values.push(new Date().getTime());
            values.push(+fileItem.filemappingId);//fileMappingId
            values.push(fileItem.workorderId);//workOrderId
            eamDB.execute(db, insertOneFileSQL, values)
              .then(
                function (res) {
                  if (isDebug) {
                    console.log("插入附件成功！fileId:" + fileItem.fileId + "  fileMappingId:" + fileItem.filemappingId);
                  }
                  dbOperationDefer.resolve(fileItem)
                }
                , function (err) {
                  dbOperationDefer.reject(err)
                });
          } else {
            Popup.eamSyncHideLoading();
            uploadFileDefer.reject(req.retInfo || "附件上传失败");
            dbOperationDefer.resolve("不需要执行数据库操作");
          }
        }

        function uploadFail(err) {
          if (isDebug) {
            console.log("uploadFail: " + JSON.stringify(err, undefined, 2));
          }
          uploadFileDefer.reject(err);
          dbOperationDefer.resolve("不需要执行数据库操作");
        }

        $q.all(uploadFileDefer, dbOperationDefer)
          .then(
            function () {
              callback()
            },
            function (err) {
              callback(err);
              var notification = {
                id: fileItem.filePath,
                title: "附件上传或本地数据库操作失败",
                text: JSON.stringify(err),
                badge: 1,
                led: "fff153"
              };
              scheduleNotifications(notification, function onClick() {
                // alert("附件信息：" + JSON.stringify(notification, undefined, 2))
              });
            });
      }

      /**
       * 寻找给定对象内部的所有附件对象
       * @param obj
       * @param isSearchNewFile 是否搜索的是新附件
       * @returns {Array}
       */
      function iterateeJsonAction(obj, isSearchNewFile) {
        var callee = arguments.callee;
        var fileItems = [];
        if (!obj) {//如果
          return fileItems;
        }
        angular.forEach(obj, function (value, key) {
          // console.log(key, value);
          if (angular.isArray(value) || angular.isObject(value)) {//如果是数组、对象，递归遍历
            fileItems = fileItems.concat(callee(value, isSearchNewFile));
          } else {//如果是某个对象的键值对
            // console.log(value,value.hasOwnProperty('filemappingId'),value['filemappingId']);
            if (key.toLowerCase() === 'filemappingid') {//不是数组，也不是对象,包含属性filemappingid的对象
              // if (isDebug) {
              //   console.log("当前附件对象: " + JSON.stringify(this, undefined, 2));
              // }
              if (isSearchNewFile) {//寻找的是新附件
                if (this.fileId&&this.fileId === this.filePath&&!$.isNumeric(this.fileId)) {//新增的附件，filePath和fileId有相等的字符串值
                  fileItems.push(this);//当前正在遍历的fileItem
                }
              } else {//已经上传成功的附件
                if ($.isNumeric(value)) {
                  fileItems.push(this);
                }
              }
            }
          }
        }, obj);
        return fileItems;
      }

      function getMIMEType(attachedFile) {
        var fileMIMEType = "";
        if (attachedFile.fileType.indexOf("doc") !== -1) {
          fileMIMEType = "application/msword";
        }
        if (attachedFile.fileType.indexOf("rtx") !== -1) {
          fileMIMEType = "text/richtext";
        }
        if (attachedFile.fileType.indexOf("jpgv") !== -1) {
          fileMIMEType = "video/jpeg";
        }
        if (attachedFile.fileType.indexOf("pdf") !== -1) {
          fileMIMEType = 'application/pdf';
        }
        if (attachedFile.fileType.indexOf("7z") !== -1) {
          fileMIMEType = 'application/x-7z-compressed';
        }
        if (attachedFile.fileType.indexOf("zip") !== -1) {
          fileMIMEType = 'application/zip';
        }
        if (attachedFile.fileType.indexOf("docx") !== -1) {
          fileMIMEType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
        if (attachedFile.fileType.indexOf("gif") !== -1) {
          fileMIMEType = 'image/gif';
        }
        if ("xls,xlm,xla,xlc,xlt,xlw".split(',').some(function (item) {
            return attachedFile.fileType.indexOf(item) >= 0;
          })) {
          fileMIMEType = 'application/vnd.ms-excel';
        }
        if ("txt,text,conf,def,list,log,in".split(',').some(function (item) {
            return attachedFile.fileType.indexOf(item) >= 0;
          })) {
          fileMIMEType = 'text/plain';
        }
        if ("jpeg,jpg,jpe".split(',').some(function (item) {
            return attachedFile.fileType.indexOf(item) >= 0;
          })) {
          fileMIMEType = 'image/jpeg';
        }
        return fileMIMEType;
      }

      function openMIMETypeFile(attachedFile, defer) {
        console.log("openMIMETypeFile: "+JSON.stringify(attachedFile,undefined,2));
        if(!attachedFile.fileType||"null"===attachedFile.fileType||""===attachedFile.fileType){
          attachedFile.fileType = attachedFile.filePath.substr(attachedFile.fileType.lastIndexOf(".")+1);
        }
        cordova.plugins.fileOpener2.open(
          attachedFile.filePath,
          getMIMEType(attachedFile),
          {
            error: function (openErr) {
              defer.reject(openErr);
            },
            success: function () {
              defer.resolve(attachedFile);
            }
          }
        );
      }

      /**
       *
       * @param attachedFile
       * @returns promise,成功回调返回一个attachedFile对象
       */
      function openEamAttachedFile(attachedFile) {
        // alert("openEamAttachedFile 打开图片" + attachedFile);
        var defer = $q.defer();
        if (!window.cordova) {
          console.log("openEamAttachedFile");
          defer.resolve();
          return defer.promise;
        }
        Popup.loadMsg(null, 500);
        retrieveInfoOrInsertFileRecord(attachedFile)
          .then(function () {
            if (attachedFile.filePath) {
              // Popup.promptMsg(JSON.stringify(attachedFile));
              if (attachedFile.filePath.indexOf("?") >= 0) {
                attachedFile.fileId = attachedFile.filePath = attachedFile.filePath.substr(0, attachedFile.filePath.lastIndexOf("?"));
              }
              // Popup.promptMsg(JSON.stringify(attachedFile));
              $window.resolveLocalFileSystemURL(attachedFile.filePath, winOk, fail);
            } else {
              downloadAttachedFile(attachedFile)
                .then(function (file) {
                  attachedFile = $.extend(attachedFile, file);
                  Popup.delayRun(function () {//延时1100ms后提示用户选择查看附件的应用来打开附件
                    winOk();
                  }, null, 1200);
                }, function (err) {
                  defer.reject(err);
                });
            }
          }, function (err) {
            defer.reject(err);
          });
        function winOk(fileEntry) {//文件存在，打开文件
          openMIMETypeFile(attachedFile, defer);
          // console.log("winOk: "+JSON.stringify(fileEntry,null,2));
          // if(!attachedFile.fileType){
          //   attachedFile.fileType = attachedFile.filePath.substring(attachedFile.fileType.lastIndexOf(".")+1);
          // }
          // Popup.hideLoading();
          // cordova.plugins.fileOpener2.open(
          //   attachedFile.filePath,
          //   getMIMEType(attachedFile),
          //   {
          //     error: function (err) {
          //       defer.reject(err);
          //     },
          //     success: function () {
          //       defer.resolve(attachedFile);
          //     }
          //   }
          // );
        }

        function fail(err) {
          downloadAttachedFile(attachedFile)
            .then(function (item) {
              attachedFile = $.extend(attachedFile, item);
              openMIMETypeFile(attachedFile, defer)
            }, function (err2) {
              Popup.promptMsg("下载附件失败： " + JSON.stringify(err2));
              defer.reject($.extend(err, err2));
            })
        }

        return defer.promise;
      }

      function onDeviceReady(callback) {
        document.addEventListener("deviceready", function () {
          if (angular.isFunction(callback)) {
            callback();
          }
        }, false);
      }

      function downloadAttachedFile(attachedFile) {
        // var fileId = attachedFile.fileId;
        var defer = $q.defer();
        async.autoInject({
          "attachedFile": function (callback) {
            return callback(null, attachedFile);
          },
          "searchLocalDbRecord": ["attachedFile", searchLocalDbRecord],
          "getAttachedFile": ['searchLocalDbRecord', 'attachedFile', getAttachedFile]
        }, function (err, results) {
          if (isDebug) {
            console.log("downloadAttachedFile :" + JSON.stringify(results, undefined, 2));
          }
          if (err) {
            defer.reject(err);
          } else {
            delete results['attachedFile']['searchLocalDbRecord'];
            defer.resolve(results['attachedFile']);
          }
        });
        return defer.promise;
      }

      function getAttachedFile(searchLocalDbRecord, attachedFile, callback) {
        if (!searchLocalDbRecord) {//如果需要下载附件
          if (!window.cordova) {
            getAttacheFileByIdOnPc(attachedFile.fileId, attachedFile)
              .then(function (fileItem) {
                Popup.hideLoading();
                callback(null, fileItem);
              }, function (err) {
                Popup.hideLoading();
                callback(err);
              })
          } else {
            getAttachedFileByFileId(attachedFile.fileId, attachedFile)
              .then(function (fileItem) {
                Popup.hideLoading();
                callback(null, fileItem);
              }, function (err) {
                Popup.hideLoading();
                callback(err);
              })
          }
        } else {//直接返回数据库的附件
          attachedFile.filePath = searchLocalDbRecord['filePath'];
          callback(null, attachedFile);
        }
      }

      function getAttachedFileByFileId(fileId, attachedFile) {
        //var uri = api_getFile + "?fileid=" + attachedFile.fileId;
        // var uri = encodeURI('http://some.server.com/download.php');
        var defer = $q.defer();
        var uri = encodeURI(api_getFile + "?fileid=" + attachedFile.fileId);
        var fileURL = downLoadFilesUrl + attachedFile.workorderId + "_" + attachedFile.fileId + "_" + attachedFile.filemappingId + "." + attachedFile.fileType;
        var fileTransfer = new FileTransfer();
        fileTransfer.onprogress = function (progressEvent) {//进度提示
          if (progressEvent.lengthComputable) {
            Popup.waitLoad("正在下载附件：" + (progressEvent.loaded / progressEvent.total).toFixed(2));
          } else {
            if (isDebug) {
              console.log(JSON.stringify(progressEvent));
            }
          }
        };
        var options = {
          requestTimestamp: new Date().getTime(),
          headers: {tokenId: Storage.getAccessToken()}
        };
        $http.get(api_getFileType + "?fileid=" + fileId)
          .then(function (req) {
            if (req.data.retCode == "00000") {//下载文件成功
              var type = req.data.data;
              fileURL = fileURL.substring(0, fileURL.lastIndexOf(".")) + "." + type;
              fileTransfer.download(uri, fileURL, function (entry) {
                if (isDebug) {
                  console.log("下载成功的文件: " + JSON.stringify(entry, undefined, 2));
                  console.log("download complete: " + entry.toURL());
                  console.log("download complete: fileUrl: " + fileURL);
                }
                attachedFile.filePath = fileURL;
                attachedFile.fileType = type;
                insertOrUpdateOneAttachedFile(attachedFile, 1).then(function (item) {
                  defer.resolve(attachedFile);
                }, function (err) {
                  defer.reject(err)
                });
              }, function (error) {
                console.log("download error source " + error.source);
                console.log("download error target " + error.target);
                console.log("download error code" + error.code);
                defer.reject(error);
              }, false, options);
            } else {
              defer.reject(req.data);
            }
          }, function (err) {
            defer.reject(err);
          });
        return defer.promise;
      }

      /**
       *  pc上测试使用该方法
       * @param fileId
       * @param attachedFile
       */
      function getAttacheFileByIdOnPc(fileId, attachedFile) {
        var defer = $q.defer();
        $http.get(api_getFileType + "?fileid=" + fileId)
          .then(function (req) {
            if (req.data.retCode === "00000") {//下载文件成功
              var type = req.data.data;
              attachedFile.fileType = type;
              $http.get(api_getFile + "?fileid=" + fileId).then(function (res) {
                console.log(res);
                var reader = new window.FileReader();
                // Creating blob from server's data
                var data = new Blob([res.data], {type: 'image/jpeg'});
                // Starting reading data
                reader.readAsDataURL(data);
                // When all data was read
                reader.onloadend = function () {
                  attachedFile.filePath = reader.result;
                  console.log("下载完成，存到本地的路径：" + attachedFile.filePath);
                  insertOrUpdateOneAttachedFile(attachedFile, 1).then(function (item) {
                    console.log("insertOrUpdateOneAttachedFile,item: " + JSON.stringify(item, undefined, 2));
                    defer.resolve(attachedFile);
                  }, function (err) {
                    defer.reject(err)
                  });
                };
                reader.onerror = function (err) {
                  defer.reject(err);
                }
              }, function (err) {
                defer.reject(err);
              });
            } else {
              defer.reject(req.data);
            }
          }, function (err) {
            defer.reject(err);
          });
        return defer.promise;
      }

      function searchLocalDbRecord(attachedFile, callback) {
        eamDB.execute(db, "select * from " + tableName + " where fileId=?", [+attachedFile.fileId])
          .then(
            function (res) {
              if (res.rows.length > 0) {
                if (isDebug) {
                  console.log(JSON.stringify(res.rows.item(0)), undefined, 2)
                }
                if (res.rows.item(0)['downloadStatus'] == 1) {//附件已经下载到本地，已经下载到本地的文件，存在文件夹downloadFileDir下面，只能用户去删除该附件
                  attachedFile.filePath = res.rows.item(0)['filePath'];
                  if (isDebug) {
                    console.log("附件已经下载到本地，已经下载到本地的文件" + JSON.stringify(attachedFile));
                  }
                  if (window.cordova) {
                    $window.resolveLocalFileSystemURL(attachedFile.filePath, function (fileEntry) {
                      callback(null, attachedFile);//路径下的文件存在
                    }, function (err) {//如果是手机本地选择的照片，或许会出现这种情况
                      if (isDebug) {
                        console.log("已经下载到本地的文件,但是路径该路径的文件已经不存在" + JSON.stringify(attachedFile));
                      }
                      callback(null, null);
                    });
                  } else {
                    callback();
                  }
                } else {
                  callback(null, null);
                }
              } else {//数据库没有记录这条数据
                //TODO 需要写完该方法
                var values = [];
                values.push(+attachedFile.fileId);
                values.push(attachedFile.filePath);
                values.push(attachedFile.fileOriginalName);
                values.push(attachedFile.fileType);
                values.push(attachedFile.fileSize);
                values.push(0);//附件未下载
                values.push(new Date().getTime());
                values.push(attachedFile.filemappingId);
                values.push(attachedFile.workorderId);
                eamDB.execute(db, insertOneFileSQL, values)
                  .then(function () {
                    if (isDebug) {
                      console.log("附件未下载，已经成功写入数据库：" + JSON.stringify(attachedFile, undefined, 2));
                    }
                    callback(null, null);//回调传入null说明需要下载该附件
                  }, function (err) {
                    callback(err);
                  });
              }
            }
            , function (err) {
              callback(err);
            });
      }

      /**
       *  插入新附件信息到附件表中或者更新本地数据库附件表中的附件信息
       * @param item
       * @param downloadStatus 0未下载，1下载在本地
       * @returns {*}
       */
      function insertOrUpdateOneAttachedFile(item, downloadStatus) {
        var defer = $q.defer();
        downloadStatus = downloadStatus ? downloadStatus : 0;
        eamDB.execute(db, "select * from " + tableName + " where fileId=?", [+item.fileId])
          .then(function (res) {
            if (res.rows.length > 0) {//存在记录，更新
              eamDB.execute(db, updateOneFileSQL, [
                item.filePath,
                item.fileOriginalName,
                item.fileType,
                item.fileSize,
                downloadStatus,
                new Date().getTime(),
                +item.filemappingId,
                +item.workorderId,
                +item.fileId
              ])
                .then(function (res1) {
                  // if (isDebug) {
                  //   console.log("成功更新附件信息：" + JSON.stringify(item, undefined, 2));
                  //   console.log("成功更新附件信息：dbRes" + JSON.stringify(res1, undefined, 2));
                  // }
                  defer.resolve(item);
                }, function (err) {
                  defer.reject(err);
                });
            } else {//没有记录，插入
              eamDB.execute(db, insertOneFileSQL,
                [
                  +item.fileId,
                  item.filePath,
                  item.fileOriginalName,
                  item.fileType,
                  item.fileSize,
                  downloadStatus,
                  new Date().getTime(),
                  +item.filemappingId,
                  +item.workorderId
                ])
                .then(function (res) {
                  if (isDebug) {
                    console.log("成功插入新附件：" + JSON.stringify(item, undefined, 2));
                    console.log("成功插入新附件：dbres" + JSON.stringify(res, undefined, 2));
                  }
                  defer.resolve(item);
                }, function (err) {
                  defer.reject(err);
                });
            }
          }, function (err) {
            defer.reject(err);
          });

        return defer.promise;
      }

      /**
       * 如果本地数据库存在附件，将对应的附件关联到工单下，如果不存在，则将工单的附件信息写入到本地数据库的附件表
       * @param json
       * @return promise
       */
      function retrieveInfoOrInsertFileRecord(json) {
        if (angular.isString(json)) {
          json = JSON.parse(json);
        }
        var defer = $q.defer();
        var fileItems = iterateeJsonAction(json, false);
        if (isDebug) {
          console.debug("retrieveInfoOrInsertFileRecord,fileItems: " + JSON.stringify(fileItems, undefined, 2));
        }
        async.eachOf(fileItems, function (item, key, callback) {
          if (angular.isNumber(item.fileId)) {
            eamDB.execute(db, "select * from " + tableName + " where fileId=?",
              [+item.fileId])
              .then(function (res) {
                if (res.rows.length > 0) {
                  var record = res.rows.item(0);
                  if (record['downloadStatus'] == 1) {//已经下载在本地了
                    item.filePath = record.filePath;
                    // if (isDebug) {
                    //   console.log("初始化附件路径：" + item.filePath);
                    // }
                  }
                  callback();
                } else {
                  insertOrUpdateOneAttachedFile(item, 0).then(function () {
                    callback();
                  }, function (err) {
                    callback(err);
                  });
                }
              }, function (err) {
                callback(err);
              });
          }
        }, function (err) {
          if (err) {
            defer.reject(err);
          } else {
            defer.resolve(fileItems);
          }
        });
        return defer.promise;
      }

      /**
       * 将json中的所有附件对象按照工单分类，每一种工单下对应一组附件
       * @param json
       * @returns {Array}
       */

      function findUploadFilesParams(json) {
        var fileParams = [];
        var attachedFiles = iterateeJsonAction(json, false);//返回json中所有的附件对象
        // console.log("method,findUploadFilesParams,attachedFiles: " + JSON.stringify(attachedFiles, undefined, 2));
        // var fileParamsItem = {
        //   workOrderId: null,
        //   source: null,
        //   filemappingIdArr: null
        // };
        // fileParams.push(fileParamsItem);
        var temItems = {};
        attachedFiles.forEach(function (item) {
          if (temItems[item.workorderId]) {//如果已经有这个id对应的数组，则这个数组添加这个id下的附件
            temItems[item.workorderId].push({
              workOrderId: item.workorderId,
              source: item.source,
              filemappingId: item.filemappingId
            });
          } else {
            temItems[item.workorderId] = [{
              workOrderId: item.workorderId,
              source: item.source,
              filemappingId: item.filemappingId
            }];
          }
        });
        angular.forEach(temItems, function (value, key) {
          if (angular.isArray(value) && value.length > 0) {
            fileParams.push({
              workOrderId: key,
              source: value[0].source,
              filemappingIdArr: value.map(function (item) {
                return item.filemappingId;
              })
            })
          }
        });
        console.log("findUploadFilesParams " + JSON.stringify(fileParams, undefined, 2));
        return fileParams;
      }

      /**
       *
       * @param attachedFile
       * @param fileList
       */
      function browserEamAttachedFiles(attachedFile, fileList) {
        if (!StringUtils.isImageType(attachedFile)) {//不是图片，利用手机上的应用打开附件
          return openEamAttachedFile(attachedFile);
        }
        ;
        //如果用户点击的附件时图片，先下载附件
        var imageList = StringUtils.getImages(fileList);
        var index = imageList.indexOf(attachedFile);
        $state.go("tab.showImage", {
          data: {
            imgList: imageList,
            index: index
          }
        });
        // downloadAttachedFile(attachedFile).then(function (file) {
        //   attachedFile = angular.merge(attachedFile, file);
        //
        // }, function (err) {
        //   Popup.promptMsg('附件下载失败')
        // });

      }

      function isLocalExist(file) {
        var defer = $q.defer();
        if (window.cordova) {//手机上面
          $window.resolveLocalFileSystemURL(file.filePath, function () {
            defer.resolve(true);
          }, function fail(err) {
            defer.reject(err);
          });
        } else {
          eamDB.execute(db, 'select * from ' + tableName + " where fileId=?", [+file.fileId])
            .then(function (res) {
              console.log(res);
              if (res.rows.length > 0 && res.rows.item(0)['downloadStatus'] == 1) {
                defer.resolve(true);
              } else {
                defer.reject(false);
              }
            }, function (err) {
              defer.reject(err);
            });
        }
        return defer.promise;
      }

      /**
       * 删除多个路下的附件
       * @param filePathList 路径数组或者单个路径
       * @return promise
       */
      var deleteLocalFiles = function (filePathList) {
        var defer = $q.defer();
        if (!window.cordova) {
          defer.resolve();
          return defer.promise;
        }
        if (!filePathList || filePathList.length === 0) {
          defer.resolve();
          return defer.promise;
        }
        if (!angular.isArray(filePathList)) {
          filePathList = [filePathList];
        }
        Popup.waitLoad();
        async.forEach(filePathList, function (filePath, callback) {
          $window.resolveLocalFileSystemURI(filePath, function win(fileEntry) {
            fileEntry.remove(function ok() {
              console.log('删除附件成功 -->' + filePath);
              callback();
            }, function noOk(e) {
              console.log('删除附件失败，原因--> ' + JSON.stringify(e, undefined, 2));
              callback(e)
            });
          }, function onError(error) {
            callback(error);
          })
        }, function (err) {
          Popup.hideLoading();
          if (err) {
            defer.reject(err);
          } else {
            defer.resolve();
          }
        });
        return defer.promise;
      };
      function updateApp4Android(url,platformName,versionId) {
        var defer = $q.defer();
        if(!window.cordova){
          return $http.get(url);
        }
        var fileTransfer = new FileTransfer();
        var opts = new FileUploadOptions();
        opts.headers={
          'Range':'bytes=0-'
        };
        var fileURL = downloadFilesDir+"/"+platformName+"/";
        fileTransfer.download(encodeURI(url),fileURL , function (entry) {
          if (isDebug) {
            console.log("下载成功的文件: " + JSON.stringify(entry, undefined, 2));
            console.log("download complete: " + entry.toURL());
            console.log("download complete: fileUrl: " + fileURL);
          }
          cordova.plugins.fileOpener2.open(
            entry.toURL(),
            'application/vnd.android.package-archive',
            {
              error: function (openErr) {
                defer.reject(openErr);
              },
              success: function () {
                defer.resolve(entry.toURL());
              }
            }
          );
        }, function (error) {
          console.log("download error source " + error.source);
          console.log("download error target " + error.target);
          console.log("download error code" + error.code);
          defer.reject(error);
        }, false);
        fileTransfer.onprogress = function (progressEvent) {//进度提示
          if (progressEvent.lengthComputable) {
            Popup.waitLoad("正在下载App " + (progressEvent.loaded / progressEvent.total).toFixed(2));
          } else {
            if (isDebug) {
              console.log("progressEvent:"+JSON.stringify(progressEvent,null,2));
            }
          }
        };
        return defer.promise;

      }
      return {
        initLocalFileSystem: initLocalFileSystem,
        updateApp:updateApp4Android,
        //systemPath: function () {
        //  return eamFilesParentPath;
        //},
        findUploadFilesParams: findUploadFilesParams,
        downloadPath: function () {
          return downLoadFilesUrl;
        },
        //uploadPath: function () {
        //  return uploadFilesUrl;
        //},
        clearUploadFile: clearUploadFile,
        moveFileToUpload: moveFileToUpload,
        moveFileToDownload: moveFileToDownload,
        getPicture: getPicture,
        removeAttachedFile: removeAttachedFile,
        uploadAttachedFile: uploadAttachedFile,
        iterateeJsonAction: iterateeJsonAction,
        retrieveInfoOrInsertFileRecord: retrieveInfoOrInsertFileRecord,
        openEamAttachedFile: openEamAttachedFile,
        downloadAttachedFile: downloadAttachedFile,
        browserEamAttachedFiles: browserEamAttachedFiles,
        isLocalExist: isLocalExist
      }
      // window.onerror = function(sMessage, sUrl, sLine) {
      //     alert("An error occurred:\n" + sMessage + "\nURL: " + sUrl + "\nLine Number: " + sLine);
      // };
      // return true;//返回true 则浏览器将不会在状态栏中提示错误;默认返回false
    });
