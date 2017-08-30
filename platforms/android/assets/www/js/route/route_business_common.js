/**
 * Created by kingman_li on 11/21/16.
 */
starter
    .config(function ($stateProvider) {
        $stateProvider
            .state("tab.instruction", { //作业指导书列表
                url:'/common/instruction',
                views: {
                    'tab-order': {
                        templateUrl: 'views/businessCommon/instruction.html',
                        controller: 'InstructionListCtrl'
                    }
                }
            })
            .state('tab.instructionCatalogue', { //作业指导书目录
                url: '/common/instructionCatalogue',
                views: {
                    'tab-order': {
                        templateUrl: 'views/businessCommon/instructionTreeView.html',
                        controller: 'InstructionCatalogueCtrl'
                    }
                },
                params: {
                    data: null
                }
            }).state("tab.instructionChapterDetail", {//作业指导书章节详情
            url: "/common/instructionChapterDetail",
            views: {
                "tab-order": {
                    templateUrl: "views/businessCommon/instructionChapterDetailView.html",
                    controller: "InstructionChapterDetailCtrl"
                }
            },
            params: {
                taskId: null
            }
        });
        
    });
