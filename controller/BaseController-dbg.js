/*global moment */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/CustomData",
    "sap/m/MessageToast",
    "sap/ui/core/ValueState",
    "dewa/refx/accommodation/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Dialog",
    "sap/m/ObjectStatus",
    "sap/m/Button",
    "sap/m/SelectList",
    "sap/ui/core/ListItem",
    "sap/ui/layout/VerticalLayout",
    "sap/m/Text",
    "sap/m/MessageBox",
    "sap/m/FormattedText",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/FilterType",
    "sap/m/Popover",
    "sap/ui/core/Item",
    "sap/ui/model/Sorter",
    "sap/m/FeedListItem",
    "dewa/refx/accommodation/util/customType",
    "sap/ui/core/InvisibleText"
], function (Controller, oCustomData, oToast, eValueState, oFormatter, oFilters, oFilterOperator, ODialog, OBjectStatus, oButton,
    oSelectList,
    oListItem,
    OVerticalLayout, OText, oMessageBox, OFormattedText, oJson, oFilterType, oPopover, oItem, oSorter, oFeedListItem, oCustomType, oInvisibleText) {
    "use strict";
    return Controller.extend("dewa.refx.accommodation.controller.BaseController", {
        baseControlleronInit: function () {
            //some default action which i want in all the view;
            window["dewa.refx.accommodation"].currentView = this.getView(); //saving it for some binding related functions
            //initializind busy dialog
            this.getBusyDialog();
            //Pulling in the utility
            this.getView().setModel(new this.oJson(this.utility), "utility");
        },
        fetchApplicationControlData: function () {
            this.openBusyDialog(this.getResourceBundle().getText("LOADING_APPDETAILS"));
            return new Promise(function (resolve, reject) {
                //fetching application Validataion
                this.getModel().read("/getApplicationControlDataSet", {
                    success: function (e) {
                        this.getOwnerComponent().setModel(new this.oJson(e.results), "Validation");
                        resolve();
                    }.bind(this),
                    error: reject
                });
            }.bind(this));
        },
        fetchRequiredDocumentDetails: function () {
            this.openBusyDialog(this.getResourceBundle().getText("LOADING_REQUIREDDOCDETAILS"));
            return new Promise(function (resolve, reject) { //fetching the attachments details
                this.getModel().read("/getBuilding_AttachmentsSet", {
                    success: function (e) {
                        this.getOwnerComponent().setModel(new this.oJson({
                            attachmentBasedonBuilding: e.results
                        }), "attachmentBasedOnBuilding");
                        resolve();
                    }.bind(this),
                    error: reject
                });
            }.bind(this));
        },
        utility: {
            RemoveZeros: function (e) {
                if (isNaN(e)) {
                    return e;
                } else {
                    return Number(e);
                    // if (Number(e) === 0) {
                    // 	return "";
                    // } else {

                    // }
                }
            },
            titleCase: function (str) {
                if (str) {
                    var splitStr = str.toLowerCase().split(' ');
                    for (var i = 0; i < splitStr.length; i++) {
                        // You do not need to check if i is larger than splitStr length, as your for does that for you
                        // Assign it back to the array
                        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
                    }
                    // Directly return the joined string
                    return splitStr.join(' ');
                }
            },
            Return: function (bReturn) {
                return bReturn;
            },
            ReverseVisibility: function (sId) {
                try {
                    //ok, this function is used to check the visibility of the inputted UI and then will return the !value of it
                    return !window["dewa.refx.accommodation"].currentView.byId(sId).getVisible();
                } catch (e) {
                    return false;
                }
            }
        },
        oCustomType: oCustomType,
        oFeedListItem: oFeedListItem,
        oSorter: oSorter,
        oListItem: oListItem,
        oItem: oItem,
        oSelectList: oSelectList,
        oPopover: oPopover,
        oButton: oButton,
        oCustomData: oCustomData,
        oToast: oToast,
        oJson: oJson,
        oInvisibleText: oInvisibleText,
        eValueState: eValueState,
        oMessage: oMessageBox,
        oFormatter: oFormatter,
        oFilters: oFilters,
        oFilterOperator: oFilterOperator,
        oFilterType: oFilterType,
        oFormattedText: OFormattedText,
        formatText: function (sText) {
            return new OFormattedText({
                htmlText: sText
            });
        },
        noErrorhandling: function () {
            this.getOwnerComponent()._bMessageOpen = true;
        },
        yesErrorhandling: function () {
            this.getOwnerComponent()._bMessageOpen = false;
        },
        clearPromises: function () {
            //clearing out the promises
            delete this.reject;
            delete this.resolve;
        },
        getUserDetails: function (oFilters) {
            //this function gets called during intial logon to get user details. 
            //the reason for pushing the expand is to get the template of the odata deep entity set
            return new Promise(function (resolve, reject) {
                if (oFilters && (oFilters.oValue1 !== this.getModel("userDetails").getProperty("/loggedInUser/headerDetails/PayrollNo"))) {
                    var filters = [];
                    filters.push(oFilters);
                    this.openBusyDialog(this.getResourceBundle().getText("CHECKING_COORDINATOR")); // CHECKING_COORDINATOR
                } else {
                    var filters;
                    this.openBusyDialog(this.getResourceBundle().getText("LOADING_USER_DETAILS")); // Getting Accommodation Details. please Wait...
                }
                // this.getView().getModel().read("/userDetailsSet('')", { "Not using this cus the logic for the other set has already been derived and it would be wasteful of time to rederive the logic again in a different way
                this.getView().getModel().read("/AccommodationSet(BusType='',ReqNo='',PayrollNo='')", {
                    filters: filters,
                    urlParameters: {
                        "$expand": "Comments,Workitem,Workitem/Activity,Logs,Attachment"
                    },
                    success: function (evts) {
                        try {
                            if (evts && evts.Coordinator) {
                                // if (filters !== undefined) {
                                this.getOwnerComponent().getModel("userDetails").setProperty("/changedUser/headerDetails", evts);
                            } else {
                                this.getOwnerComponent().setModel(new oJson({
                                    loggedInUser: {
                                        headerDetails: evts,
                                        accommodationData: undefined
                                    },
                                    changedUser: {
                                        headerDetails: undefined,
                                        accommodationData: undefined
                                    },
                                    //default table index
                                    tableRowIndex: 0,
                                    //default row count
                                    //setting the default rows
                                    tableNoOfRows: 25
                                }), "userDetails");
                            }
                        } catch (e) {
                            reject();
                            jQuery.sap.log.error(e);
                        } finally {
                            if (oFilters !== undefined) {
                                resolve(oFilters);
                            } else {
                                resolve(undefined);
                            }
                        }
                    }.bind(this)
                    // error: function() {
                    // 	reject();
                    // 	this.closeBusyDialog();
                    // 	this.noErrorhandling();
                    // 	//let tell the user that there was an error while fetching up his user details
                    // 	this.oMessage.error(this.getResourceBundle().getText("USERDETAILSERROR"), {
                    // 		actions: this.oMessage.Action.RETRY,
                    // 		onClose: function() {
                    // 			location.reload();
                    // 		}.bind(this)
                    // 	});
                    // }.bind(this)
                });
            }.bind(this));
        },
        getRouter: function () {
            return sap.ui.core.UIComponent.getRouterFor(this);
        },
        getModel: function (sName) {
            return this.getView().getModel(sName);
        },
        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        getBusyDialog: function () {
            if (!this._busyDialog) {
                this._busyDialog = sap.ui.xmlfragment(this.getResourceBundle().getText("FRAG_PATH") + "BusyDialog", this); // dewa/refx/accommodation/fragments/
                this.getView().addDependent(this._busyDialog);
            }
        },

        openBusyDialog: function (msg) {
            this._busyDialog.close();
            this._busyDialog.setText(msg);
            this._busyDialog.open();
        },
        closeBusyDialog: function () {
            this._busyDialog.close();
        },

        getDialog: function (sName) {
            var valueHelpDialog = sap.ui.xmlfragment(this.getResourceBundle().getText("FRAG_PATH") + sName, this); // dewa/refx/accommodation/fragments/
            this.getView().addDependent(valueHelpDialog);
            return valueHelpDialog;
        }
    });

});