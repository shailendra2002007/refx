sap.ui.define([
    "dewa/refx/accommodation/controller/BaseController",
    "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
    "use strict";

    return BaseController.extend("dewa.refx.accommodation.controller.App", {

        onInit: function () {
            var oViewModel,
                fnSetAppNotBusy,
                iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

            oViewModel = new JSONModel({
                busy: true,
                delay: 0
            });
            this.setModel(oViewModel, "appView");
            //lets crete an window object to access the current view details in formatter
            window["dewa.refx.accommodation"] = {};
            window["dewa.refx.accommodation"].downloadFile = function (sfilePath, sfileName) {
                // var link = document.createElement('a');
                // link.href = sfilePath;
                // link.download = sfileName;
                // link.click();
                window.open(sfilePath);
            };

            fnSetAppNotBusy = function () {
                oViewModel.setProperty("/busy", false);
                oViewModel.setProperty("/delay", iOriginalBusyDelay);
            };

            this.getOwnerComponent().getModel().metadataLoaded().
            then(fnSetAppNotBusy);

            // apply content density mode to root view
            this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
        }
    });

});