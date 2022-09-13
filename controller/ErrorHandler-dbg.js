sap.ui.define([
    "sap/ui/base/Object",
    "sap/m/MessageBox",
    "sap/m/FormattedText",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/ObjectStatus",
    "sap/m/VBox",
    "sap/m/SelectList",
    "sap/ui/core/ListItem"
], function (UI5Object, MessageBox, FormattedText, oDialog, oButton, oObjectStatus, oVBox, oSelectList, oListitem) {
    "use strict";

    return UI5Object.extend("dewa.refx.accommodation.controller.ErrorHandler", {

        /**
         * Handles application errors by automatically attaching to the model events and displaying errors when needed.
         * @class
         * @param {sap.ui.core.UIComponent} oComponent reference to the app's component
         * @public
         * @alias dewa.refx.accommodation.controller.ErrorHandler
         */
        constructor: function (oComponent) {
            this._oResourceBundle = oComponent.getModel("i18n").getResourceBundle();
            this._oComponent = oComponent;
            this._oModel = oComponent.getModel();
            this._bMessageOpen = false;
            this._sErrorText = this._oResourceBundle.getText("errorText");

            this._oModel.attachMetadataFailed(function (oEvent) {
                var oParams = oEvent.getParameters();
                this._showServiceError(oParams.response);
            }, this);

            // //setting the busy for sending the request
            // this._oModel.attachRequestSent(function(oEvent) {
            // 	this._oComponent.byId("app").setBusy(true);
            // }, this);
            // //setting off the busy indicator after the request
            // this._oModel.attachRequestFailed(function(oEvent) {
            // 	this._oComponent.byId("app").setBusy(true);
            // }, this);
            // this._oModel.attachRequestCompleted(function(oEvent) {
            // 	this._oComponent.byId("app").setBusy(false);
            // }, this);

            this._oModel.attachRequestFailed(function (oEvent) {
                var oParams = oEvent.getParameters();
                // An entity that was not found in the service is also throwing a 404 error in oData.
                // We already cover this case with a notFound target so we skip it here.
                // A request that cannot be sent to the server is a technical error that we have to handle though
                if (oParams.response.statusCode !== "404" || (oParams.response.statusCode === 404 && oParams.response.responseText.indexOf(
                        "Cannot POST") === 0)) {
                    this._showServiceError(oParams.response);
                }
            }, this);
        },

        /**
         * Shows a {@link sap.m.MessageBox} when a service call has failed.
         * Only the first error message will be display.
         * @param {string} sDetails a technical error to be displayed on request
         * @private
         */
        _showServiceError: function (sDetails) {
            //Closing the busy
            try {
                sap.ui.getCore().byId(this._oComponent.getId() + "---worklist").getController().closeBusyDialog();
            } catch (e) {
                jQuery.sap.log.error(e);
            }
            try {
                sap.ui.getCore().byId(this._oComponent.getId() + "---inboxView").getController().closeBusyDialog();
            } catch (e) {
                jQuery.sap.log.error(e);
            }
            //passing it to bypass the error thrown which was already thrown
            if (typeof (this._oComponent._bMessageOpen) === "boolean") {
                this._bMessageOpen = this._oComponent._bMessageOpen;
            }
            //somtimes the errors are handled in the backend thru exceptions for those we are bypasssing the standard error
            if (this._bMessageOpen) {
                return;
            }
            this._bMessageOpen = true;
            this._oComponent._bMessageOpen = this._bMessageOpen;

            try {
                // this.closeBusyDialog();
                if (JSON.parse(sDetails.responseText).error.innererror.errordetails.length > 0) {
                    var oDialogs = new oDialog({
                        state: "Error",
                        type: "Message",
                        // title: "Error",
                        // title: this._sErrorText,
                        title: "Sorry, An error occured.",
                        icon: "sap-icon://error",
                        beforeClose: function (evt) {
                            this._bMessageOpen = false;
                            this._oComponent._bMessageOpen = false;
                            //Disabling the esc
                            if (evt.getParameters().origin === null) {
                                //not suppose to user private properties, but cant help here cus of the version
                                evt.getSource(0)._bOpenAfterClose = true;
                            }
                        }.bind(this),
                        content: new oVBox({
                            items: [
                                new oSelectList({
                                    showSecondaryValues: true,
                                    items: {
                                        path: "errorModel>/errordetails",
                                        template: new oListitem({
                                            key: "{errorModel>code}",
                                            text: "{errorModel>message}",
                                            icon: "sap-icon://add-product"
                                        })
                                    }
                                })
                            ]
                        }),
                        endButton: new oButton({
                            text: "Ok",
                            press: function (evt) {
                                this._bMessageOpen = false;
                                evt.getSource().getParent().close();
                                try {
                                    sap.ui.getCore().byId(this._oComponent.getId() + "---worklist").getController().closeBusyDialog();
                                } catch (e) {
                                    jQuery.sap.log.error(e);
                                }
                                try {
                                    sap.ui.getCore().byId(this._oComponent.getId() + "---inboxView").getController().closeBusyDialog();
                                } catch (e) {
                                    jQuery.sap.log.error(e);
                                }
                                try {
                                    this._oComponent._oViews._oComponent._oViews._oComponent.getRouter().navTo('inbox');
                                } catch (e) {
                                    jQuery.sap.log.error(e);
                                }
                                try {
                                    sap.ui.getCore().byId(this._oComponent.getId() + "---inboxView").getController().onInboxPatternMatched();
                                } catch (e) {
                                    jQuery.sap.log.error(e);
                                }

                            }.bind(this)
                        })
                    }).setModel(new sap.ui.model.json.JSONModel(JSON.parse(sDetails.responseText).error.innererror), "errorModel");
                    try {
                        //pushing the log to the smart office on success
                        var isMob = /Android|iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                        if (isMob === true && window.navigator.notification && window.navigator.notification.sendLog) {
                            window.navigator.notification.sendLog("REFX_UI_ACCOMM::ERROR::" + sDetails.responseText + "::" + "", null, "", "");
                        }
                    } catch {}
                    oDialogs.open();
                } else {
                    throw "Exception";
                }
            } catch (evt) {
                try {
                    sap.ui.getCore().byId(this._oComponent.getId() + "---worklist").getController().closeBusyDialog();
                } catch (e) {
                    jQuery.sap.log.error(e);
                }
                try {
                    sap.ui.getCore().byId(this._oComponent.getId() + "---inboxView").getController().closeBusyDialog();
                } catch (e) {
                    jQuery.sap.log.error(e);
                }
                MessageBox.error(
                    this._sErrorText, {
                        id: "serviceErrorMessageBox",
                        details: sDetails,
                        styleClass: this._oComponent.getContentDensityClass(),
                        actions: [MessageBox.Action.CLOSE],
                        onClose: function () {
                            try {
                                this._oComponent._oViews._oComponent._oViews._oComponent.getRouter().navTo('inbox');
                            } catch (e) {
                                jQuery.sap.log.error(e);
                            }
                            try {
                                sap.ui.getCore().byId(this._oComponent.getId() + "---inbox").getController().onInboxPatternMatched();
                            } catch (e) {
                                jQuery.sap.log.error(e);
                            }
                            this._bMessageOpen = false;
                            this._oComponent._bMessageOpen = false;
                        }.bind(this)
                    }
                );
            }
        }
    });
});