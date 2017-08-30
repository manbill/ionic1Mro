/**
 * Created by kingman_li on 11/21/16.
 */
/*
 * 业务相关通用模块
 * */
starter
    /*
     *　作业指导书列表
     * */
    .controller('InstructionListCtrl', function ($scope, $state) {
        $scope.openInstruction = function () {
            $state.go("tab.instructionCatalogue", {
                data: $scope.taskId
            });
        };
        
        $scope.instructions = [
            {manualName: '维修机箱说明书'},
            {manualName: '扳手说明书'},
            {manualName: '风机清洗说明书'},
        ];
    })
    /*
     *　作业指导书目录
     * */
    .controller('InstructionCatalogueCtrl', function ($scope, $state) {
        $scope.browseDetail = function (item) {
            $state.go("tab.instructionChapterDetail", {params: JSON.stringify(item)});
        };
        
        $scope.instructionTitle = '维修机箱说明书';
        $scope.instructorDirectories = [
            {title: 'xxx'},
            {title: 'yyy'}
        ];
    })
    /*
     *　作业指导书章节详情
     * */
    .controller('InstructionChapterDetailCtrl', function ($scope) {
        $scope.item = {
            title: 'xxx',
            name: '第一章　准备工作',
            content: '注意事项，要带安全帽'
        }
    })
    ;