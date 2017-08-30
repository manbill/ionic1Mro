/**
 * 参数
 */
starter.factory('Params', function () {
  var selectDevice = null;
  var recordRepairDetail = null; //维修记录详情
  var selecting = "选择中";
  var trasnfertedObj = null; //被传递的对象
  var keyValueObj={};
  var consumeMaterielList = [];
  return {
    setTransferredObjByKey: function (key, obj) {
      keyValueObj[key] = obj;
    },
    getTransferredObjByKey: function (key) {
      return keyValueObj[key];
    },
    clearTransferredObjByKey: function (key) {
      keyValueObj[key]=null;
    },
    setTransfertedObj: function (obj) {
      trasnfertedObj = obj;
    },
    clearTransfertedObj: function () {
      trasnfertedObj = null;
    },
    getTransfertedObj: function () {
      return trasnfertedObj;
    },

    setSelectDevice: function (device) {
      selectDevice = device;
    },
    getSelectDevice: function () {
      return selectDevice;
    },
    clearSelectDevice: function () {
      selectDevice = null;
    },
    setRecordRepair: function (recordRepair, select) {
      recordRepairDetail = recordRepair;
      if (select) {
        recordRepairDetail.selectMateriel = select;
      }
    },
    getRecordRepair: function () {
      if (recordRepairDetail != null && recordRepairDetail.selectMateriel != null) {
        delete recordRepairDetail.selectMateriel;
      }
      return recordRepairDetail;
    },
    clearRecordRepair: function () {
      recordRepairDetail = null;
    },
    /**
     * 设置修改维修记录里的物料信息
     * @param {Object} materiel
     */
    setMaterielNo2RecordRepair: function (materiel) {
      if (recordRepairDetail != null && recordRepairDetail.selectMateriel != null) {
        if (recordRepairDetail.selectMateriel == "materielNo") {
          recordRepairDetail.materielNo = materiel.materielNo;
          recordRepairDetail.materielId = materiel.materielId;
        } else if (recordRepairDetail.selectMateriel == "modifyAfterMaterielNo") {
          recordRepairDetail.modifyAfterMaterielNo = materiel.materielNo;
          recordRepairDetail.modifyAfterMaterielId = materiel.materielId;
        } else if (recordRepairDetail.materielConsumes != null) {
          recordRepairDetail.materielConsumes[recordRepairDetail.selectMateriel].materielNo = materiel.materielNo;
          recordRepairDetail.materielConsumes[recordRepairDetail.selectMateriel].unit = materiel.unit;
        }
      }
    },

    setConsumeMaterielList: function (consumeMateriels) {
      if (recordRepairDetail != null) {
        if (recordRepairDetail.materielConsumes == null) {
          recordRepairDetail.materielConsumes = [];
        }
        recordRepairDetail.materielConsumes = recordRepairDetail.materielConsumes.concat(consumeMateriels);
      }
    }
  };
});
