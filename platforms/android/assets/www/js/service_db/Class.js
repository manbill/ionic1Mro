/**
 * Created by Manbiao.Huang on 21-Oct-16.
 */

starter.factory("starterClassFactory", function () {
  function FaultOrder() {
    this.workorderChecks = null;
    this.workorderManuals = null;
    this.materialStandarList = {
      eaWoMaterialDemandDtoList: []
    };
    this.repairRecordList = {//维修记录
      workorderFixInfoDtoList: []
    };
    this.workorderDetails = {//工单详情
      eaWoFaultInfoDtoList: [],//故障信息列表
      eaWoFilemappingList: [],//附件
      eaWoPauseDtoList: [],//暂停列表
      eaWoWorkorderAuditingDtoList: [],//审核列表
      eaWoWorkorderinfoDto: {//具体详情信息
        activeFlag: "0",
        areaType: null,
        areaTypeName: null,
        assignPerson: null,
        attrKeyArr: null,
        attrValArr: null,
        attributeGroupid: null,
        createBy: null,
        createOn: null,
        currPage: null,
        dealBegindate: null,
        dealEnddate: null,
        deviceId: null,
        deviceName: null,
        deviceSno: null,
        faultAdvice: null,
        faultBegindate: null,
        faultBegindateFromDate: null,
        faultBegindateToDate: null,
        faultCode: null,
        faultDetailComment: null,
        faultEnddate: null,
        faultEnddateFromDate: null,
        faultEnddateToDate: null,
        faultHandleDesc: null,
        faultName: null,
        faultReason: null,
        faultReasonComment: null,
        faultReasonName: null,
        faultSource: null,
        fileIdArr: null,
        filemappingIdArr: null,
        lastUpdBy: null,
        lastUpdOn: null,
        ncrNum: null,
        ncrTrigger: null,
        otherFactorComment: null,
        otherFactorType: null,
        otherShutdownHour: null,
        pageSize: null,
        planBegindate: null,
        planBegindateFromDate: null,
        planBegindateToDate: null,
        planDetailId: null,
        planEnddate: null,
        planEnddateFromDate: null,
        planEnddateToDate: null,
        planId: null,
        planNoticeId: null,
        positionCode: null,
        positionId: null,
        projectId: null,
        projectName: null,
        remark: null,
        shutdownTotalHour: null,
        siteManager: null,
        transNoticeId: null,
        transNoticeNo: null,
        workTotalHour: null,
        workTypeId: null,
        workTypeName: null,
        workorderCode: null,
        workorderId: null,
        workorderStatus: "41",
        workorderStatusName: "处理中",
        workorderTitle: null,
        workorderType: '38',
        workorderTypeName: "人工填报故障"
      }
    };
    this.apiWorkorderBaseInfoDto = {//基本信息
      activeFlag: null,
      areaType: null,
      areaTypeName: null,
      assignPerson: null,
      assignPersonName: null,
      faultBegindate: null,
      faultCode: null,
      faultName: null,
      lastUpdateDatetimeApi: null,
      planBegindate: null,
      planEnddate: null,
      planNoticeId: null,
      positionCode: null,
      positionId: null,
      projectId: null,
      projectName: null,
      siteManager: null,
      taskAccepted: null,
      transNoticeNo: null,
      workTypeId: null,
      workTypeName: null,
      workorderCode: null,
      workorderId: null,
      workorderStatus: null,
      workorderStatusName: null,
      workorderTitle: null,
      workorderType: null,
      workorderTypeName: null
    };
  }

  FaultOrder.prototype.setFaultOrderInfo = function () {
    // this.workorderDetails = order.workorderDetails;
    // this.materialStandarList = order.materialStandarList;
    // this.repairRecordList = order.repairRecordList;
    // this.workorderChecks = order.workorderChecks;
    // this.workorderManuals = order.workorderManuals;
    // console.log("setFaultOrderInfo",this);
    this.apiWorkorderBaseInfoDto = {//基本信息
      activeFlag: this.workorderDetails.eaWoWorkorderinfoDto.activeFlag,
      areaType: this.workorderDetails.eaWoWorkorderinfoDto.areaType,
      areaTypeName: this.workorderDetails.eaWoWorkorderinfoDto.areaTypeName,
      assignPerson: this.workorderDetails.eaWoWorkorderinfoDto.assignPerson,
      // assignPersonName: this.workorderDetails.eaWoWorkorderinfoDto.assignPersonName,
      faultBegindate: this.workorderDetails.eaWoWorkorderinfoDto.faultBegindate,
      faultCode: this.workorderDetails.eaWoWorkorderinfoDto.faultCode,
      faultName: this.workorderDetails.eaWoWorkorderinfoDto.faultName,
      lastUpdateDatetimeApi: new Date(this.workorderDetails.eaWoWorkorderinfoDto.createOn),//后台需要Date
      planBegindate: this.workorderDetails.eaWoWorkorderinfoDto.planBegindate,
      planEnddate: this.workorderDetails.eaWoWorkorderinfoDto.planEnddate,
      planNoticeId: this.workorderDetails.eaWoWorkorderinfoDto.planNoticeId,
      positionCode: this.workorderDetails.eaWoWorkorderinfoDto.positionCode,
      positionId: this.workorderDetails.eaWoWorkorderinfoDto.positionId,
      projectId: this.workorderDetails.eaWoWorkorderinfoDto.projectId,
      projectName: this.workorderDetails.eaWoWorkorderinfoDto.projectName,
      siteManager: this.workorderDetails.eaWoWorkorderinfoDto.siteManager,
      taskAccepted: false,
      transNoticeNo: this.workorderDetails.eaWoWorkorderinfoDto.transNoticeNo,
      workTypeId: this.workorderDetails.eaWoWorkorderinfoDto.workTypeId ? this.workorderDetails.eaWoWorkorderinfoDto.workTypeId : this.apiWorkorderBaseInfoDto.workTypeId,
      workTypeName: this.workorderDetails.eaWoWorkorderinfoDto.workTypeName ? this.workorderDetails.eaWoWorkorderinfoDto.workTypeName : this.apiWorkorderBaseInfoDto.workorderTypeName,
      workorderCode: this.workorderDetails.eaWoWorkorderinfoDto.workorderCode,
      workorderId: this.workorderDetails.eaWoWorkorderinfoDto.workorderId,
      workorderStatus: this.workorderDetails.eaWoWorkorderinfoDto.workorderStatus,
      workorderStatusName: this.workorderDetails.eaWoWorkorderinfoDto.workorderStatusName,
      workorderTitle: this.workorderDetails.eaWoWorkorderinfoDto.workorderTitle,
      workorderType: this.workorderDetails.eaWoWorkorderinfoDto.workorderType,
      workorderTypeName: this.workorderDetails.eaWoWorkorderinfoDto.workorderTypeName
    }
  };
  /**
   *  Description:维修记录对应的dto
   * @constructor
   */
  function WorkOrderFixInfoDto() {
    /*     String      */
    this.workorderId = null;//工单id
    /*    Integer     */
    this.repairId = null;//维修记录id
    /*Integer*/
    this.fixType = null;//维修类型
    // String
    this.fixTypeText = null;//维修类型名称
    // Integer
    this.deviceId = null;//部件id
    // String
    this.deviceName = null;//部件名称
    // String
    this.serialNum1 = null;//更换前部件序列号
    // String
    this.serialNum2 = null;//更换后部件序列号
    // String
    this.wuliaohao1 = null;//更换前物料号
    // String
    this.wuliaohao2 = null;//更换好物料号
    // String
    this.provider1 = null;//更换前供应商
    // String
    this.provider2 = null;//更换前供应商
    // String
    this.fixBeginDate1 = null;//更换前质保期开始时间
    // String
    this.fixBeginDate2 = null;//更换前质保期结束时间
    // String
    this.fixEndDate1 = null;//更换后质保期开始时间
    // String
    this.fixEndDate2 = null;//更换后质保期结束时间
    // Integer
    this.guaranteePeriod1 = null;//更换前质保期
    // Integer
    this.guaranteePeriod2 = null;//更换后质保期
    // String
    this.functionCode = null;//功能号
    // String
    this.remark = null;//描述
    // String
    this.originalMaterialSno = null;//原始的物料号
    // String
    this.updateMaterialSno = null;//更改后的物料号
    // Integer
    this.activeFlag = null;//有效标志
    // String
    this.createBy = null;//创建人
    /* String */
    this.createOn = null;//创建时间
    // List < RepairMaterialDto >
    this.repairMaterialDtoList = [];//消耗物料列表

  }

  /**
   * Description:维修记录下消耗物料对应的dto
   * @constructor
   */
  function RepairMaterialDto() {
    // Integer
    this.repairMaterialId = null;//维修消耗物料id
    // Integer
    this.repairId = null;//维修记录id
    // Integer
    this.materialId = null;//物料id
    // String
    this.materialName = null;//物料名称
    // String
    this.materialSno = null;//物料编号
    // Double
    this.amount = null;//消耗数量
    // String
    this.unitDes = null;//物料单位名称
    // Integer
    this.unit = null;//物料单位
    // String
    this.workorderCode = null;//工单编号
    // String
    this.repertoryNo = null;//库存地点
    // String
    this.mb1bDocNum = null;//货物移库凭证号
    // String
    this.mb1bDocYear = null;//货物移库凭证年度
    // String
    this.mbstDocNum = null;//冲销凭证号
    // String
    this.mbstDocYear = null;//冲销凭证年度
    // String
    this.wbsNum = null;//WBS编号
    // Integer
    this.sapInventoryFlag = null;//账内库存标识 0：是；1：否；
    // Integer
    this.activeFlag = null;//有效标识 0：有效；1无效；
    // String
    this.positionCode = null;//机位号
    // String
    this.positionTurbine = null;//机位序列号
    // Integer
    this.createBy = null;//创建用户
    // String
    this.createOn = null;//创建时间
    // Integer
    this.lastUpdBy = null;//最后修改人
    // String
    this.lastUpdOn = null;//最后修改时间
  }

  function AttachedFile() {
    this.workorderId = null;
    this.source = null;
    this.fileId = null;
    this.filemappingId = null;
    this.remark = null;
    this.activeFlag = null;
    this.filePath = null;
    this.fileActualName = null;
    this.fileOriginalName = null;
    this.fileType = null;
    this.fileSize = null;
    this.flag = null;
    this.createBy = null;
    this.createOn = null;
    this.createByName = null;
  }

  /*
   *调拨单对象
   */
  function TransferOrder() {
    TransferOrder.prototype.transferOrderId = null;//调拨单Id
    TransferOrder.prototype.transferOrderNo = null;//调拨单号
    TransferOrder.prototype.transferTypeId = null;//调拨单类型，字典表37：常规备库164；紧急备库165
    TransferOrder.prototype.transferReasonId = null;//调拨原因，字典表38：技术改造167；出保整改168；常规备库169；定维补料170；销售备件166（总部1开头，通用0开头）
    TransferOrder.prototype.workOrderId = null;//工单id
    TransferOrder.prototype.workorderCode = null;//工单号
    TransferOrder.prototype.workorderTitle = null;//工单主题
    TransferOrder.prototype.statusId = null;//状态，字典表39：未提交171；未处理172；处理中173；已完成174；被驳回175；已取消176
    TransferOrder.prototype.statusName = null;//状态名称
    TransferOrder.prototype.expectReceiveDate = null;//期望到货时间
    TransferOrder.prototype.commentText = null;//备注
    TransferOrder.prototype.giWhId = null;//调出仓库Id
    TransferOrder.prototype.giWhContactName = null;//调出仓库联系人
    TransferOrder.prototype.giWhContactNum = null;//调出仓库联系方式
    TransferOrder.prototype.giAddress = null;//发货地址
    TransferOrder.prototype.grWhId = null;//调入仓库
    TransferOrder.prototype.grWhContactName = null;//调入仓库联系人
    TransferOrder.prototype.grWhContactNum = null;//调入仓库联系电话
    TransferOrder.prototype.grAddress = null;//收货地址
    TransferOrder.prototype.shiftWarehouseId = null;//转办仓库id,0代表非转办
    TransferOrder.prototype.createOn = null;//创建时间
    TransferOrder.prototype.createBy = null;//创建人
    TransferOrder.prototype.lastUpdOn = null;//修改时间
    TransferOrder.prototype.lastUpdBy = null;//修改人

    TransferOrder.prototype.transferType = null;//调拨单类型名
    TransferOrder.prototype.transferReason = null;//调拨原因（中文）
    TransferOrder.prototype.giWhName = null;//调出仓库名称
    TransferOrder.prototype.grWhName = null;//调入仓库名称
    TransferOrder.prototype.createByName = null;//创建人姓名
    TransferOrder.prototype.transferStatus = null;//调拨单状态
    TransferOrder.prototype.giRepertoryNo = null;//调出仓库编号
    TransferOrder.prototype.grRepertoryNo = null;//调入仓库编号

    TransferOrder.prototype.createDate = null;//创建日期
    TransferOrder.prototype.expectReceiveDateTime = null;//期望到货日期
    TransferOrder.prototype.giWhIdNum = null;//调出仓库Id
    TransferOrder.prototype.grWhIdNum = null;//调入仓库

    TransferOrder.prototype.filemappingIdArr = null;//文件编号数组
    TransferOrder.prototype.flag = null;//标识--add:新增保存、addSubmit:新增提交、edit：修改保存、editSubmit:修改提交

    TransferOrder.prototype.demandAmountArr = null;//文件编号数组

    TransferOrder.prototype.tOFilemappingDtoList = [];//调拨单附件列表
    TransferOrder.prototype.tranferOrderItemDtoList = [];//行项目列表
    TransferOrder.prototype.feedBackRecordList = [];//反馈记录
    TransferOrder.prototype.shiftRecordList = [];//转办记录
    TransferOrder.prototype.rejectRecordList = [];//驳回记录

    TransferOrder.prototype.editRight = null;//是否有修改权限
    TransferOrder.prototype.isShift = null;//是否为转办后产生的调拨单
    TransferOrder.prototype.userType = null;
  }


  return {
    faultOrderInstance: function () {
      var f = new FaultOrder();
      // console.log(f);
      return f;
    },
    /**
     * Description:维修记录对应的dto
     * @returns {WorkOrderFixInfoDto}
     */
    workOrderFixInfoInstance: function () {
      return new WorkOrderFixInfoDto();
    },
    /**
     * Description:维修记录下消耗物料对应的dto
     * @returns {RepairMaterialDto}
     */
    repairMaterialInstance: function () {
      return new RepairMaterialDto();
    },
    attachedFileInstance: function () {
      return new AttachedFile();
    },
    transferOrderInstance:function () {
      return new TransferOrder();
    }

  }
});
