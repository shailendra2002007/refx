sap.ui.define([
    "dewa/refx/accommodation/controller/BaseController"
], function (BaseController) {
    "use strict";

    return BaseController.extend("dewa.refx.accommodation.controller.NotFound", {

        /**
         * Navigates to the worklist when the link is pressed
         * @public
         */
        onInit: function () {
            //calling the defaults
            this.baseControlleronInit();
        },
        onLinkPressed: function () {
            this.getRouter().navTo("worklist");
        },
        onAfterRendering: function () {
            //checking the url with this pattern if yes then moving to the worklist page.
            //	this.getRouter("workitem").navTo({WorkItemNo:"000002641686"});	
            if (this.getRouter().getHashChanger().hash.indexOf("myportal/") !== -1) {
                var getWorkItemNo = this.getRouter().getHashChanger().hash.indexOf("myportal/"); //getting the index of this
                var start = getWorkItemNo + 9;
                getWorkItemNo = this.getRouter().getHashChanger().hash.substring(start, start + 12); // 9 is the length for "/myportal" , 11 is the length for 000002641686
                this.getRouter().navTo("workitem", {
                    WorkItemNo: getWorkItemNo
                });
            } else {
                this.getView().setBusy(false);
                this.getView().byId("notFoundMessage").setVisible(true);
            }
        }
    });

});