var eamJpush = (function(){
    var onDeviceReady = function() {
        console.log("JPushPlugin:Device ready!");
        initiateUI();
    };

    var getRegistrationID = function() {
        window.plugins.jPushPlugin.getRegistrationID(onGetRegistrationID);
    };

    var onGetRegistrationID = function(data) {
        try {
            console.log("JPushPlugin:registrationID is " + data);

            if (data.length == 0) {
                var t1 = window.setTimeout(getRegistrationID, 1000);
            }
        } catch (exception) {
            console.log(exception);
        }
    };

    var onTagsWithAlias = function(event) {
        try {
            console.log("onTagsWithAlias");
            var result = "result code:" + event.resultCode + " ";
            result += "tags:" + event.tags + " ";
            result += "alias:" + event.alias + " ";
        } catch (exception) {
            console.log(exception)
        }
    };

    var onOpenNotification = function(event) {
        try {
            var alertContent;
            if (device.platform == "Android") {
                alertContent = event.alert;
            } else {
                alertContent = event.aps.alert;
            }
            alert("open Notification:" + alertContent);
        } catch (exception) {
            console.log("JPushPlugin:onOpenNotification" + exception);
        }
    };

    var onReceiveNotification = function(event) {
        try {
            var alertContent;
            if (device.platform == "Android") {
                alertContent = event.alert;
            } else {
                alertContent = event.aps.alert;
            }
        } catch (exception) {
            console.log(exception)
        }
    };

    var onReceiveMessage = function(event) {
        try {
            var message;
            if (device.platform == "Android") {
                message = event.message;
            } else {
                message = event.content;
            }
        } catch (exception) {
            console.log("JPushPlugin:onReceiveMessage-->" + exception);
        }
    };

    var initiateUI = function() {
        try {
            window.plugins.jPushPlugin.init();
            getRegistrationID();
            if (device.platform != "Android") {
                window.plugins.jPushPlugin.setDebugModeFromIos();
                window.plugins.jPushPlugin.setApplicationIconBadgeNumber(0);
            } else {
                window.plugins.jPushPlugin.setDebugMode(true);
                window.plugins.jPushPlugin.setStatisticsOpen(true);
            }
        } catch (exception) {
            console.log(exception);
        }
        // $("#setTagWithAliasButton").click(function(ev) {
        //     try {
        //         var tag1 = $("#tagText1").attr("value");
        //         var tag2 = $("#tagText2").attr("value");
        //         var tag3 = $("#tagText3").attr("value");
        //         var alias = $("#aliasText").attr("value");
        //         var tags = [];
        //
        //         if (tag1 != "") {
        //             tags.push(tag1);
        //         }
        //         if (tag2 != "") {
        //             tags.push(tag2);
        //         }
        //         if (tag3 != "") {
        //             tags.push(tag3);
        //         }
        //         window.plugins.jPushPlugin.setTagsWithAlias(tags, alias);
        //     } catch (exception) {
        //         console.log(exception);
        //     }
        // })
    };

    document.addEventListener("jpush.setTagsWithAlias", onTagsWithAlias, false);
    // document.addEventListener("deviceready", onDeviceReady, false);
    document.addEventListener("jpush.openNotification", onOpenNotification, false);
    document.addEventListener("jpush.receiveNotification", onReceiveNotification, false);
    document.addEventListener("jpush.receiveMessage", onReceiveMessage, false);
})();

