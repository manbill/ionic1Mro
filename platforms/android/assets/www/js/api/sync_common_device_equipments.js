/**
 * Created by Manbiao.Huang on 13-Dec-16.
 */
/**
 * 公用基础数据下载。
 */
angular.module('starter.SyncCommonDeviceEquipment', [])
    .factory("SyncCommonDeviceEquipment",
        function ($q, eamDB, Storage, Popup, $injector, $ionicBackdrop, cfpLoadingBar, DeviceTreeApi) {
            var machineTableName = "eam_machine_equipment";
            var equipmentDetailTableName = "eam_machine_equipment_detail";
            var insertMachinesSQL = "insert into " + machineTableName + "(" +
                "id,machine_type_name,machine_id,machine_type_id,project_id,project_name,position_code,position_id," +
                "areaCode,areaName" +
                ") values(?,?,?,?,?,?,?,?,?,?);";
            var updateMachinesSQL = "update " + machineTableName + " set " +
                "machine_type_name=?,machine_type_id=?,project_id=?,project_name=?,position_code=?,position_id=?," +
                "areaCode=?,areaName=? where id=?";
            var insertDeviceEquipmentDetailsSQL = "insert into " + equipmentDetailTableName + "(" +
                "id,machineId,equipmentTreeJson,equipmentsDetailsJson,fanMachineInfo) " +
                "values(?,?,?,?,?);";
            var pageSize = 20;//每次获取风机数量
            var pageNumber = 1;
            var startTime = 0;
            var endTime = 0;
            var totalMachines = [];
            var loadedMachinesNum = 0;//已经下载的风机数量
            var downloadList = function (startDate, endDate, callback) {
                loadedMachinesNum = 0;//已经下载的风机数量
                startTime = startDate;
                endTime = endDate;
                DeviceTreeApi.getMachineList(function (req) {
                    if (req.success) {
                        totalMachines = req.data;
                        console.log("风机总数,totalMachinesNum=" + totalMachines.length);
                        pageNumber = 1;
                        async.doDuring(repeatAction, function (arg, cb) {
                            return cb(null, arg > 0);
                        }, function (err) {
                            Popup.hideLoading();
                            // $ionicBackdrop.release();
                            if (err) {
                                callback(false, err);
                            } else {
                                callback(true);
                            }
                        });//fn, test, callbackopt
                    } else {
                        callback(req.retInfo || "网络连接失败");
                    }
                }, {
                    pageNumber: 1,
                    startDateTime: startDate,
                    endDateTime: endDate,
                    pageSize: 1073741824,//将返回时间段内所有的风机
                    projectId: Storage.getSelectedProject().projectId + ""
                });

            };

            function repeatAction(callback) {
                Popup.waitLoad("正在下载风机...");
                var machines = totalMachines.slice(pageSize * (pageNumber - 1), pageSize * pageNumber);
                console.log("第%d次下载的风机", pageNumber, machines);
                var insertMachinesValues = [];
                // console.log(machines);
                var machineIds = [];
                var deletingDetailIds = [];
                machines.forEach(function (item) {
                    var value = [];
                    machineIds.push(item['id']);
                    value.push(item["id"]);
                    value.push(item["machineTypeName"]);
                    value.push(item["machineId"]);
                    value.push(item["machineTypeId"]);
                    value.push(item["projectId"] + "");
                    value.push(item["projectName"]);
                    value.push(item["positionCode"]);
                    value.push(item["positionId"] + "");
                    value.push(item["areaCode"]);
                    value.join(",");
                    value.push(item["areaName"]);
                    insertMachinesValues.push(value);
                });
                Popup.waitLoad("正在下载设备详情...");
                loadedMachinesNum += machines.length;
                if (totalMachines.length !== 0) {//进度条
                    var progress = (loadedMachinesNum / totalMachines.length).toFixed(3);
                    console.log("风机进度条：",progress,"已经下载的风机数",loadedMachinesNum);
                    cfpLoadingBar.set(progress);
                }
                DeviceTreeApi.getEquipmentsTreeAndDetails(function (req) {
                    if (req.success) {
                        pageNumber++;
                        var deviceTreeAndDetails = req.data;
                        var insertDetailsBindings = [];
                        // console.log(deviceTreeAndDetails);
                        deviceTreeAndDetails.forEach(function (detailItem) {
                            var values = [];
                            deletingDetailIds.push(detailItem["id"]);
                            values.push(detailItem["id"]);
                            values.push(detailItem["machineId"]);
                            values.push(JSON.stringify(detailItem["deviceTree"]));
                            values.push(JSON.stringify(detailItem["equipmentId2EquipmentDetails"]));
                            values.push(JSON.stringify(detailItem["machineDTO"]));
                            insertDetailsBindings.push(values);
                        });
                        // console.log(insertDetailsBindings);
                        var dbPromise = dbActions(machineIds, insertMachinesValues, deletingDetailIds, insertDetailsBindings);
                        dbPromise.then(function () {
                            callback(null, machines.length);
                        }, function (err) {
                            callback(err);
                        });
                    } else {
                        callback(req || "风机详情下载失败,请检查网络");
                    }
                }, {
                    machineIds: machineIds
                });
            }

            function dbActions(machineIds, insertMachinesValues, deletingDetailIds, insertDetailsBindings) {
                Popup.waitLoad("正在更新数据库风机设备信息...");
                var defer = $q.defer();
                var delMachineDefer = $q.defer();
                var insertMachineDefer = $q.defer();
                var delDetailsDefer = $q.defer();
                var insertDetailsDefer = $q.defer();
                eamDB.execute(db, "delete from " + machineTableName + " where id in (" + machineIds + ")")
                    .then(function () {
                        delMachineDefer.resolve("删除旧数据成功");
                    }, function (err) {
                        delMachineDefer.reject(err || "删除旧数据成功");
                    });
                if (insertMachinesValues.length > 0) {
                    eamDB.insertCollection(db, insertMachinesSQL, insertMachinesValues)
                        .then(function () {
                            insertMachineDefer.resolve("插入风机列表成功");
                        }, function (err) {
                            insertMachineDefer.reject(err);
                        });
                } else {
                    insertMachineDefer.resolve("没有新的风机列表数据");
                }
                eamDB.execute(db, "delete from " + equipmentDetailTableName + " where id in (" + deletingDetailIds + ")")
                    .then(function () {
                        delDetailsDefer.resolve("删除旧数据成功");
                    }, function (err) {
                        delDetailsDefer.reject(err || "删除旧数据成功");
                    });
                if (insertDetailsBindings.length > 0) {
                    eamDB.insertCollection(db, insertDeviceEquipmentDetailsSQL, insertDetailsBindings)
                        .then(function () {
                            insertDetailsDefer.resolve("插入风机设备详情成功");
                        }, function (err) {
                            insertDetailsDefer.reject(err);
                        });
                } else {
                    insertDetailsDefer.resolve("没有新的风机设备详情数据");
                }
                $q.all(delMachineDefer, insertMachineDefer, delDetailsDefer, insertDetailsDefer)
                    .then(function () {
                        defer.resolve("风机列表及其设备数据库操作完成");
                    }, function (err) {
                        defer.reject(err);
                    });
                return defer.promise;
            }

            return {
                downloadList: downloadList
            }
        });
