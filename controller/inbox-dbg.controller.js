/*global _*/
sap.ui.define([
    "dewa/refx/accommodation/controller/BaseController"
], function (Controller) {
    "use strict";
    return Controller.extend("dewa.refx.accommodation.controller.inbox", {
        goToInbox: function () {
            this.getRouter().navTo("apporverInbox");
        },
        onInit: function () {
            //calling the defaults
            this.baseControlleronInit();
            //cathing the pattern
            this.getRouter().getRoute("inbox").attachPatternMatched(this.onInboxPatternMatched, this);
            //view Data
            var OJsonData = new this.oJson({
                accommodationData: [],
                tableCount: 0,
                siteVisible: true,
                requestType: "Accommodation Requests"
            });
            this.getView().setModel(OJsonData, "inboxViewModel");
        },
        // formatter: this.oFormatter,
        onCloseCoordinator: function () {
            this.clear_filters();
            this.getUserDetails(undefined).then(this.getOverallAccommodationDetails
                .bind(this), null);
        },
        checkForActiveContract: function () {
            return new Promise(
                function (resolve, reject) {
                    //calling the backend and checking
                    var sPernr = this.getModel("userDetails").getProperty("/changedUser/headerDetails/PayrollNo") ? this.getModel("userDetails").getProperty(
                        "/changedUser/headerDetails/PayrollNo") : this.getModel("userDetails").getProperty("/loggedInUser/headerDetails/PayrollNo");
                    this.getModel().read("/getActiveContractSet('" + sPernr + "')", {
                        success: function () {
                            resolve();
                        },
                        error: reject
                    });
                }.bind(this)
            );
        },
        onCreateAccommodationPress: function () {
            //checking if the user has an existing active contract
            this.checkForActiveContract().then(
                //resolve
                function () {
                    //Checking if there is any other user detaila available
                    if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") !== undefined) {
                        var selectedItem = this.getModel("userDetails").getProperty("/changedUser/headerDetails");
                    } else {
                        var selectedItem = this.getModel("userDetails").getProperty("/loggedInUser/headerDetails");
                    }
                    //going to this approach instead of router cus we are displaying multiple entries based on worklist and wanted to reduce the call to tha backend.
                    this.getView().getController().getOwnerComponent().setModel(new sap.ui.model.json.JSONModel({
                        "selectedItem": selectedItem
                    }), "routerDetails");
                    this.getRouter().navTo("create");
                }.bind(this),
                //reject
                null
                // function(e) {
                // //tell the system that there is no need fr calling errorhandling
                // this.noErrorhandling();
                // //telling the user there is already an request available
                // debugger;
                // //constructing a string based on the table
                // var aErrTable = JSON.parse(e.responseText).error.innererror.errordetails;
                // var sErrMsg;
                // for (var ty = 0; ty < aErrTable.length; ty++) {
                // 	if (sErrMsg) {
                // 		sErrMsg = sErrMsg + "<br/>" + aErrTable[ty].message;
                // 	} else {
                // 		sErrMsg = aErrTable[ty].message;
                // 	}
                // }
                // this.oMessage.error(e.message, {
                // 	details: "<p><strong>Solution:</strong></p>\n" +
                // 		"Please try again later.." +
                // 		"<p><strong>Technical Reason:</strong></p>\n" +
                // 		sErrMsg +
                // 		"<p class='msgSubText'>Please note. User will be navigated back to the main page after this message.</p>",
                // 	onClose: function() {
                // 		this.getRouter().navTo("inbox");
                // 	}.bind(this),
                // 	actions: sap.m.MessageBox.Action.OK
                // });
                // }.bind(this)
            );
        },
        onRequestPress: function (evt) {
            //if there is no changes in user details then fetching
            var selectedItem;
            if (this.getView().getModel("userDetails").getData().changedUser.accommodationData === undefined) {
                //fetching from current user
                // selectedItem = this.getView().getModel("userDetails").getData().loggedInUser.accommodationData[evt.getSource().getSelectedItem()
                // 	.getCells()[0].getBinding("text").getContext().getPath().split("/")[evt.getSource().getSelectedItem().getCells()[0].getBinding(
                // 		"text").getContext().getPath().split("/").length - 1]];
                selectedItem = this.getView().getModel("userDetails").getData().loggedInUser.accommodationData[evt.getParameter("listItem").getBindingContext('userDetails').getPath().split("/")[(evt.getParameter("listItem").getBindingContext('userDetails').getPath().split("/").length - 1)]];
            } else {
                //fetching from the changes in user
                // selectedItem = this.getView().getModel("userDetails").getData().changedUser.accommodationData[evt.getSource().getSelectedItem()
                // 	.getCells()[0].getBinding("text").getContext().getPath().split("/")[evt.getSource().getSelectedItem().getCells()[0].getBinding(
                // 		"text").getContext().getPath().split("/").length - 1]];
                selectedItem = this.getView().getModel("userDetails").getData().changedUser.accommodationData[evt.getParameter("listItem").getBindingContext('userDetails').getPath().split("/")[(evt.getParameter("listItem").getBindingContext('userDetails').getPath().split("/").length - 1)]];
            }
            //going to this approach instead of router cus we are displaying multiple entries based on worklist and wanted to reduce the call to tha backend.
            this.getView().getController().getOwnerComponent().setModel(new sap.ui.model.json.JSONModel({
                "selectedItem": selectedItem
            }), "routerDetails");
            this.getRouter().navTo("worklist");
        },
        onPayrollChange: function (evt) {
            //fetching up the entered users details
            //Since the payroll is only 8 digit adding with the space it will be 15
            // if (evt.getSource().getValue().indexOf("_") !== -1 || evt.getSource().getValue().length === 0) {
            // 	this.oToast.show(this.getResourceBundle().getText("ENTER_FULLPAYROLL"));
            // 	evt.getSource().setValueState(this.eValueState.Error);
            // } else if (evt.getSource().getValue().indexOf("_") === -1) {
            this.byId("filter_payroll_number").setValueState(this.eValueState.None);
            this.getUserDetails(
                new this.oFilters({
                    path: "PayrollNo",
                    operator: this.oFilterOperator.EQ,
                    value1: this.getView().byId("filter_payroll_number").getValue().replaceAll("_", "").replaceAll(" ", "")
                })
            ).then(this.getOverallAccommodationDetails
                .bind(this), null);
            // }
        },
        // onErrorinPayroll: function() {
        // 	this.closeBusyDialog();
        // },
        clear_filters: function () {
            this.getView().byId("filter_search").clear();
            this.getView().byId("filter_submitted_daterange").setDateValue();
        },
        onDateLiveChange: function (oValue) {
            if (this.getModel("device").getProperty("/system/phone")) { //disabling the search on the phone
                return;
            }
            //getting backup
            var backupData, getActualModelData;
            backupData = this.getModel("userDetailsBackup").getData();
            getActualModelData = _.clone(backupData.AccommodationReqListSet_FullData);

            //filtering out the data
            getActualModelData = getActualModelData.filter(function (e) {
                if (oValue.getParameters().newValue !== "") {
                    if (this.getView().byId("filter_search") && this.getView().byId("filter_search").getValue()) {
                        return (e.Created_Dt >= oValue.getParameters().from && e.Created_Dt <= oValue.getParameters().to) && (
                            e.ReqNo.indexOf(this.getView().byId("filter_search").getValue()) !== -1 || e.RaisedForName.indexOf(this.getView().byId(
                                "filter_search").getValue()) !== -1 ||
                            e.RaisedByName.indexOf(this.getView().byId("filter_search").getValue()) !== -1 || e.Status.indexOf(this.getView().byId(
                                "filter_search").getValue()) !==
                            -1 || e.StatusText
                            .indexOf(this.getView().byId("filter_search").getValue()) !== -1);
                    } else {
                        return e.Created_Dt >= oValue.getParameters().from && e.Created_Dt <= oValue.getParameters().to;
                    }
                } else {
                    if (this.getView().byId("filter_search") && this.getView().byId("filter_search").getValue()) {
                        return (
                            e.ReqNo.indexOf(this.getView().byId("filter_search").getValue()) !== -1 || e.RaisedForName.indexOf(this.getView().byId(
                                "filter_search").getValue()) !== -1 ||
                            e.RaisedByName.indexOf(this.getView().byId("filter_search").getValue()) !== -1 || e.Status.indexOf(this.getView().byId(
                                "filter_search").getValue()) !==
                            -1 || e.StatusText
                            .indexOf(this.getView().byId("filter_search").getValue()) !== -1);
                    } else {
                        // if the user clears it
                        return e;
                    }
                }
            }.bind(this));
            //once the data is filtered pushing it into the table.
            if (getActualModelData && getActualModelData.length > this.getModel("userDetails").getProperty("/tableNoOfRows")) {
                //make visible
                this.byId("pagination").setVisible(true);
                this.splittingModelBasedOnTableRow(getActualModelData);
                //setting the records based on the logged in user or changed user
                if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") !== undefined) {
                    //if the coordinator is viewing on behalf
                    this.getModel("userDetails").setProperty("/changedUser/accommodationData",
                        this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[0]);
                } else if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") === undefined &&
                    this.getModel("userDetails").getProperty("/loggedInUser/headerDetails") !== undefined) {
                    //if current user is viewing it
                    this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",
                        this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[0]);
                }
                //Updating the table
                this.getView().getModel("userDetails").setProperty("/tableRowIndex", 0);
            } else {
                this.byId("pagination").setVisible(false);
                //pushing the records lesser than tableNoOfRows
                if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") !== undefined) {
                    //if the coordinator is viewing on behalf
                    this.getModel("userDetails").setProperty("/changedUser/accommodationData", getActualModelData);
                } else if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") === undefined &&
                    this.getModel("userDetails").getProperty("/loggedInUser/headerDetails") !== undefined) {
                    //if current user is viewing it
                    this.getModel("userDetails").setProperty("/loggedInUser/accommodationData", getActualModelData);
                }
            }
        },
        onSearchBtn: function (oValue) {
            //lets fetch the payroll details and then apply the filters
            this.getUserDetails(
                new this.oFilters({
                    path: "PayrollNo",
                    operator: this.oFilterOperator.EQ,
                    value1: this.getView().byId("filter_payroll_number").getValue().replaceAll("_", "").replaceAll(" ", "")
                })
            ).then(this.getOverallAccommodationDetails
                .bind(this), null).then(this.onSearchBtnFilter.bind(this), null);
        },
        onSearchBtnFilter: function () {
            try {
                var sValue = this.getModel("inboxViewModel").getProperty("/filter_search");
            } catch (e) {
                var sValue = "";
            } finally {
                if (!sValue) {
                    sValue = "";
                };
            }
            this.filterTableBasedOnFilter(sValue);
        },
        onSearchLiveChange: function (oValue) {
            if (this.getModel("device").getProperty("/system/phone")) { //disabling the search on the phone
                return;
            }
            try {
                var sValue = this.getModel("inboxViewModel").getProperty("/filter_search");
            } catch (e) {
                var sValue = "";
            } finally {
                if (!sValue) {
                    sValue = "";
                };
            }
            this.filterTableBasedOnFilter(sValue);
        },
        filterTableBasedOnFilter: function (sValue) {
            //getting backup
            var backupData, getActualModelData;
            backupData = this.getModel("userDetailsBackup").getData();
            getActualModelData = _.clone(backupData.AccommodationReqListSet_FullData);
            //filtering out the data
            getActualModelData = getActualModelData.filter(function (e) {
                if (sValue !== "") {
                    if (this.getView().byId("filter_submitted_daterange") && this.getView().byId("filter_submitted_daterange").getDateValue() !==
                        null) {
                        return (e.ReqNo.indexOf(sValue) !== -1 || e.RaisedForName.toLowerCase().indexOf(sValue
                                .toLowerCase()) !== -1 || e.RaisedByName.toLowerCase().indexOf(sValue.toLowerCase()) !== -1 || e.Status
                            .toLowerCase().indexOf(sValue.toLowerCase()) !== -1 || e.StatusText.toLowerCase().indexOf(sValue.toLowerCase()) !== -1) && (e.Created_Dt >= this.getView().byId("filter_submitted_daterange").getFrom() &&
                            e.Created_Dt <=
                            this.getView().byId("filter_submitted_daterange").getTo());

                    } else {
                        return e.ReqNo.indexOf(sValue) !== -1 || e.RaisedForName.toLowerCase().indexOf(sValue
                                .toLowerCase()) !== -1 || e.RaisedByName.toLowerCase().indexOf(sValue.toLowerCase()) !== -1 || e.Status
                            .toLowerCase().indexOf(sValue.toLowerCase()) !== -1 || e.StatusText.toLowerCase().indexOf(sValue.toLowerCase()) !== -1;
                    }
                } else {
                    if (this.getView().byId("filter_submitted_daterange") && this.getView().byId("filter_submitted_daterange").getDateValue() !==
                        null) {
                        return (e.Created_Dt >= this.getView().byId("filter_submitted_daterange").getFrom() &&
                            e.Created_Dt <=
                            this.getView().byId("filter_submitted_daterange").getTo());
                    } else {
                        // if the user clears it
                        return e;
                    }
                }
            }.bind(this));
            //once the data is filtered pushing it into the table.
            if (getActualModelData && getActualModelData.length > this.getModel("userDetails").getProperty("/tableNoOfRows")) {
                //make visible
                this.byId("pagination").setVisible(true);
                this.splittingModelBasedOnTableRow(getActualModelData);
                //setting the records based on the logged in user or changed user
                if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") !== undefined) {
                    //if the coordinator is viewing on behalf
                    this.getModel("userDetails").setProperty("/changedUser/accommodationData",
                        this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[0]);
                } else if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") === undefined &&
                    this.getModel("userDetails").getProperty("/loggedInUser/headerDetails") !== undefined) {
                    //if current user is viewing it
                    this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",
                        this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[0]);
                }
                //Updating the table
                this.getView().getModel("userDetails").setProperty("/tableRowIndex", 0);
            } else {
                this.byId("pagination").setVisible(false);
                //pushing the records lesser than tableNoOfRows
                if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") !== undefined) {
                    //if the coordinator is viewing on behalf
                    this.getModel("userDetails").setProperty("/changedUser/accommodationData", getActualModelData);
                } else if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") === undefined &&
                    this.getModel("userDetails").getProperty("/loggedInUser/headerDetails") !== undefined) {
                    //if current user is viewing it
                    this.getModel("userDetails").setProperty("/loggedInUser/accommodationData", getActualModelData);
                }
            }
        },
        onRequestChange: function (evt) {
            if (evt.getParameter("selectedItem").getText() === "Accommodation Requests") {
                this.getView().getModel("inboxViewModel").setProperty("/requestType", "Accommodation Requests");
            } else {
                this.getView().getModel("inboxViewModel").setProperty("/requestType", "Release Requests");
            }
        },
        onInboxPatternMatched: function () {
            if (!this.getModel().isMetadataLoadingFailed()) {
                try {
                    this.getOwnerComponent().getModel("userDetails").setData(undefined);
                } catch (e) {
                    jQuery.sap.log.error(e);
                } finally {
                    //lets create some promise function
                    //fetching the default values before fetching the user details and accommodationdetails
                    this.fetchApplicationControlData().then(
                        //success
                        this.fetchRequiredDocumentDetails.bind(this),
                        //failure
                        null
                    ).then(
                        //success
                        this.getUserDetails.bind(this),
                        //failure
                        null
                    ).then(
                        //success
                        this.getOverallAccommodationDetails.bind(this),
                        //failure
                        null
                    );

                }
            }
        },
        errorWhileFetchinUserDetails: function () {
            this.closeBusyDialog();
            this.noErrorhandling();
            //let tell the user that there was an error while fetching up his user details
            this.oMessage.error(this.getResourceBundle().getText("USERDETAILSRROR"), {
                horizontalScrolling: false,
                verticalScrolling: true,
                titleAlignment: "Center",
                onClose: function () {
                    this.getOwnerComponent().getRouter().navTo("inbox");
                }.bind(this)
            });
        },
        errorWhileFetchinAccommodationrDetails: function () {
            this.closeBusyDialog();
            this.noErrorhandling();
            //let tell the user that there was an error while fetching up his user details
            //let tell the user that there was an error while fetching up his user details
            this.oMessage.error(this.getResourceBundle().getText("ACCOMMODATIONERROR"), {
                horizontalScrolling: false,
                verticalScrolling: true,
                titleAlignment: "Center",
                onClose: function () {
                    this.getOwnerComponent().getRouter().navTo("inbox");
                }.bind(this)
            });
        },
        statusIcon: function (oValue) {
            // SUBMITTED=Submitted
            // CLARIFIED=Clarified
            // APPROVED=Approved
            // REJECTED=Rejected
            // FAILED=Failed
            // WAITLISTED=Waitlisted
            // CLARIFICATION=Needs Clarification
            // WITHDRAWED=Withdrawed	        
            switch (oValue) {
                case this.getResourceBundle().getText("SUBMITTED"):
                    return "sap-icon://message-success";
                case this.getResourceBundle().getText("APPROVED"):
                    return "sap-icon://accept";
                case this.getResourceBundle().getText("CLARIFICATION"):
                    return "sap-icon://along-stacked-chart";
                case this.getResourceBundle().getText("CLARIFIED"):
                    return "sap-icon://message-success";
                case this.getResourceBundle().getText("WAITLISTED"):
                    return "sap-icon://lateness";
                case this.getResourceBundle().getText("REJECTED"):
                    return "sap-icon://message-errorr";
                case this.getResourceBundle().getText("WITHDRAWED"):
                    return "sap-icon://cancel";
                case this.getResourceBundle().getText("FAILED"):
                    return "sap-icon://status-error";
            }
        },
        statusState: function (oValue) {
            // SUBMITTED=Submitted
            // CLARIFIED=Clarified
            // APPROVED=Approved
            // REJECTED=Rejected
            // FAILED=Failed
            // WAITLISTED=Waitlisted
            // CLARIFICATION=Needs Clarification
            // WITHDRAWED=Withdrawed

            //Information(Blue) , inital and creation process 
            //None(grey) - Initial state
            //Error(red), something is wrong
            //Warning (Orange) Pending status
            //Success(green) - Completed                
            switch (oValue) {
                case this.getResourceBundle().getText("SUBMITTED"):
                    return this.eValueState.Information;
                case this.getResourceBundle().getText("APPROVED"):
                    return this.eValueState.Success;
                case this.getResourceBundle().getText("CLARIFICATION"):
                    return this.eValueState.Warning;
                case this.getResourceBundle().getText("CLARIFIED"):
                    return this.eValueState.Success;
                case this.getResourceBundle().getText("WAITLISTED"):
                    return this.eValueState.Warning;
                case this.getResourceBundle().getText("REJECTED"):
                    return this.eValueState.Error;
                case this.getResourceBundle().getText("WITHDRAWED"):
                    return this.eValueState.Error;
                case this.getResourceBundle().getText("FAILED"):
                    return this.eValueState.Error;
                case oValue.indexOf("Failed") !== -1:
                    return this.eValueState.Error;
                case this.getResourceBundle().getText("RELEASED"):
                    return this.eValueState.Success;
            }
        },
        onAfterRendering: function () {
            //this works whenever the table is written in the DOM
            // this.getView().byId("inboxTable1").addEventDelegate({
            // 	onAfterRendering: function() {
            // 		this.getView().byId("iconTab1").setCount(this.getView().byId("inboxTable1").getItems().length);
            // 		this.getView().byId("iconTab2").setCount(this.getView().byId("inboxTable2").getItems().length);
            // 		// this.clear_filters();
            // 	}.bind(this)
            // });
            // this.getView().byId("inboxTable1").addEventDelegate({
            // 	onAfterRendering: function() {
            // 		this.getView().byId("iconTab1").setCount(this.getView().byId("inboxTable1").getItems().length);
            // 		this.getView().byId("iconTab2").setCount(this.getView().byId("inboxTable2").getItems().length);
            // 		// this.clear_filters();
            // 	}.bind(this)
            // });
        },
        //Start of pagination logic
        onPaginationPrev: function (oEvent) {
            var getRowIndex = this.getView().getModel("userDetails").getProperty("/tableRowIndex");
            var nextRow = getRowIndex - 1;
            //filling the next set of records
            if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") !== undefined) {
                //if the coordinator is viewing on behalf
                this.getModel("userDetails").setProperty("/changedUser/accommodationData",
                    this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[nextRow]);
            } else if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") === undefined &&
                this.getModel("userDetails").getProperty("/loggedInUser/headerDetails") !== undefined) {
                //if current user is viewing it
                this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",
                    this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[nextRow]);
            }
            //Updating the table
            this.getView().getModel("userDetails").setProperty("/tableRowIndex", nextRow);
        },
        onPaginationNext: function (oEvent) {
            var getRowIndex = this.getView().getModel("userDetails").getProperty("/tableRowIndex");
            var nextRow = getRowIndex + 1;
            //filling the next set of records
            if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") !== undefined) {
                //if the coordinator is viewing on behalf
                this.getModel("userDetails").setProperty("/changedUser/accommodationData",
                    this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[nextRow]);
            } else if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") === undefined &&
                this.getModel("userDetails").getProperty("/loggedInUser/headerDetails") !== undefined) {
                //if current user is viewing it
                this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",
                    this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[nextRow]);
            }
            //Updating the table
            this.getView().getModel("userDetails").setProperty("/tableRowIndex", nextRow);
        },
        onPaginationFirst: function (oEvent) {
            var getRowIndex = this.getView().getModel("userDetails").getProperty("/tableRowIndex");
            var nextRow = 0;
            //filling the next set of records
            if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") !== undefined) {
                //if the coordinator is viewing on behalf
                this.getModel("userDetails").setProperty("/changedUser/accommodationData",
                    this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[nextRow]);
            } else if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") === undefined &&
                this.getModel("userDetails").getProperty("/loggedInUser/headerDetails") !== undefined) {
                //if current user is viewing it
                this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",
                    this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[nextRow]);
            }
            //Updating the table
            this.getView().getModel("userDetails").setProperty("/tableRowIndex", nextRow);
        },
        onPaginationLast: function (oEvent) {
            var getRowIndex = this.getView().getModel("userDetails").getProperty("/tableRowIndex");
            var nextRow = this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split/length") - 1;
            //filling the next set of records
            if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") !== undefined) {
                //if the coordinator is viewing on behalf
                this.getModel("userDetails").setProperty("/changedUser/accommodationData",
                    this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[nextRow]);
            } else if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") === undefined &&
                this.getModel("userDetails").getProperty("/loggedInUser/headerDetails") !== undefined) {
                //if current user is viewing it
                this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",
                    this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[nextRow]);
            }
            //Updating the table
            this.getView().getModel("userDetails").setProperty("/tableRowIndex", nextRow);
        },
        onPaginationNoOfRows: function (oEvent) {
            //Clearing the search and date field
            this.clear_filters();
            if (oEvent.getParameters().selectedItem.getText().indexOf("Show All") !== -1) {
                //updating the no of rows
                this.getView().getModel("userDetails").setProperty("/tableNoOfRows",
                    this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_FullData/length")
                );
                //Table row index
                this.getView().getModel("userDetails").setProperty("/tableRowIndex", 0);
                //pushing the full model
                if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") !== undefined) {
                    //if the coordinator is viewing on behalf
                    this.getModel("userDetails").setProperty("/changedUser/accommodationData",
                        this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_FullData"));
                } else if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") === undefined &&
                    this.getModel("userDetails").getProperty("/loggedInUser/headerDetails") !== undefined) {
                    //if current user is viewing it
                    this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",
                        this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_FullData"));
                }
                // this.getModel("userDetails").setProperty("/MaintenanceReqListSet",
                // 	this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_FullData"));
            }
            //updating the no of rows
            this.getView().getModel("userDetails").setProperty("/tableNoOfRows", oEvent.getParameters().selectedItem.getKey());
            //Table row index
            this.getView().getModel("userDetails").setProperty("/tableRowIndex", 0);
            this.splittingModelBasedOnTableRow();

            //filling the next set of records
            if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") !== undefined) {
                //if the coordinator is viewing on behalf
                this.getModel("userDetails").setProperty("/changedUser/accommodationData",
                    this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[0]);
            } else if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") === undefined &&
                this.getModel("userDetails").getProperty("/loggedInUser/headerDetails") !== undefined) {
                //if current user is viewing it
                this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",
                    this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[0]);
            }
        },
        splittingModelBasedOnTableRow: function (aData) {
            //splitting up the records..
            var backupData, getActualModelData;
            backupData = this.getModel("userDetailsBackup").getData();
            if (aData) {
                //if the data is being sent from the filter criteria
                getActualModelData = aData;
            } else {
                //if the data is not being imported then the system assumes that it fetches it from the actual backup
                getActualModelData = _.clone(backupData.AccommodationReqListSet_FullData);
            }
            var tableNoOfRows = this.getModel("userDetails").getProperty("/tableNoOfRows");
            var findNoOfRows = getActualModelData.length / tableNoOfRows;
            var setCount = parseInt(findNoOfRows); // 103 / 10 = 10
            if (getActualModelData.length % tableNoOfRows !== 0) { //which means there is an reminder
                setCount = setCount + 1;
            }
            backupData.AccommodationReqListSet_split = [];
            for (var y = 1; y <= setCount; y++) {
                backupData.AccommodationReqListSet_split.push(getActualModelData.splice(0, tableNoOfRows));
            }

            //pls note if in case the adata is being imported  to this function, only those records has been spitted and then added in backup data
            //keeping an backup of the records
            this.setModel(new this.oJson(backupData), "userDetailsBackup");
        },
        //End of pagination logic
        getOverallAccommodationDetails: function (oFilters) {
            return new Promise(function (resolve, reject) {
                if (oFilters !== undefined) {
                    var filters = [];
                    filters.push(oFilters);
                    // this.openBusyDialog(this.getResourceBundle().getText("COORDINATOR_APPROVED_FETCHING_ACC", [this.getOwnerComponent().getModel(
                    // 	"userDetails").getProperty("/changedUser/headerDetails/PayrollNo")]));
                    if (this.getModel("userDetails").getProperty("/changedUser/headerDetails")) {
                        this.openBusyDialog(this.getResourceBundle().getText("COORDINATOR_APPROVED_FETCHING_USER", [this.getOwnerComponent().getModel(
                            "userDetails").getProperty("/loggedInUser/headerDetails/PayrollFullName"), this.getOwnerComponent().getModel(
                            "userDetails").getProperty("/changedUser/headerDetails/PayrollNo")]));
                    }

                } else {
                    var filters;
                    this.openBusyDialog(this.getResourceBundle().getText("LOADING_ACCOMMODATION"));
                }
                //using this to bypass Maximum cache error in server
                this.getView().getModel().mPathCache = {};
                this.getView().getModel().read("/AccommodationSet", {
                    filters: filters,
                    urlParameters: {
                        "$expand": "Workitem,Workitem/Activity"
                    },
                    success: function (evt) {
                        try {
                            if (this.getModel("userDetails").getProperty("/changedUser/headerDetails")) {
                                // if (filters !== undefined) {
                                //if the case doesnt match then pushing it to the changed user
                                this.getModel("userDetails").setProperty("/changedUser/accommodationData",
                                    evt.results);
                                //setting an backup for the pagination
                                var backupData;
                                var actualModel = evt.results;
                                backupData = {
                                    AccommodationReqListSet_FullData: _.clone(actualModel),
                                    AccommodationReqListSet_split: []
                                };
                                this.setModel(new this.oJson(backupData), "userDetailsBackup");
                                if (evt.results && evt.results.length > this.getModel("userDetails").getProperty("/tableNoOfRows")) {
                                    //make visible
                                    this.byId("pagination").setVisible(true);
                                    this.splittingModelBasedOnTableRow();
                                    //setting the intial set during intial load
                                    this.getModel("userDetails").setProperty("/changedUser/accommodationData", this.getModel("userDetailsBackup").getProperty(
                                        "/AccommodationReqListSet_split")[0]);
                                } else {
                                    this.byId("pagination").setVisible(false);
                                    //pushing the records lesser than tableNoOfRows
                                    if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") !== undefined) {
                                        //if the coordinator is viewing on behalf
                                        this.getModel("userDetails").setProperty("/changedUser/accommodationData", evt.results);
                                    } else if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") === undefined &&
                                        this.getModel("userDetails").getProperty("/loggedInUser/headerDetails") !== undefined) {
                                        //if current user is viewing it
                                        this.getModel("userDetails").setProperty("/loggedInUser/accommodationData", evt.results);
                                    }
                                }
                                //End of pagination logic
                                //Setting the binding for the inbox page
                                this.getView().byId("inboxPage").bindElement("userDetails>/changedUser");
                            } else {
                                //this happens when the user logs in for the first time
                                this.getModel("userDetails").setProperty("/loggedInUser/accommodationData", evt
                                    .results);
                                //setting an backup for the pagination
                                var backupData;
                                var actualModel = evt.results;
                                backupData = {
                                    AccommodationReqListSet_FullData: _.clone(actualModel),
                                    AccommodationReqListSet_split: []
                                };
                                this.setModel(new this.oJson(backupData), "userDetailsBackup");
                                if (evt.results && evt.results.length > this.getModel("userDetails").getProperty("/tableNoOfRows")) {
                                    //make visible
                                    this.byId("pagination").setVisible(true);
                                    this.splittingModelBasedOnTableRow();
                                    //setting the intial set during intial load
                                    this.getModel("userDetails").setProperty("/loggedInUser/accommodationData", this.getModel("userDetailsBackup").getProperty(
                                        "/AccommodationReqListSet_split")[0]);
                                } else {
                                    this.byId("pagination").setVisible(false);
                                    //pushing the records lesser than tableNoOfRows
                                    if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") !== undefined) {
                                        //if the coordinator is viewing on behalf
                                        this.getModel("userDetails").setProperty("/changedUser/accommodationData", evt.results);
                                    } else if (this.getModel("userDetails").getProperty("/changedUser/headerDetails") === undefined &&
                                        this.getModel("userDetails").getProperty("/loggedInUser/headerDetails") !== undefined) {
                                        //if current user is viewing it
                                        this.getModel("userDetails").setProperty("/loggedInUser/accommodationData", evt.results);
                                    }
                                }
                                //End of pagnation logic

                                //Setting the binding for the inbox page
                                this.getView().byId("inboxPage").bindElement("userDetails>/loggedInUser");
                            }
                            resolve();
                        } catch (e) {
                            reject();
                            this.errorWhileFetchinAccommodationrDetails();
                        } finally {
                            this.closeBusyDialog();
                        }
                    }.bind(this),
                    error: function () {
                        this.closeBusyDialog();
                        this.noErrorhandling();
                        //let tell the user that there was an error while fetching up his user details
                        // this.oMessage.error(this.getResourceBundle().getText("ACCOMMODATIONERROR"), {
                        //     actions: this.oMessage.Action.RETRY,
                        //     onClose: function () {
                        //         // this.getOwnerComponent().getRouter().navTo("inbox");
                        //         location.reload();
                        //     }.bind(this)
                        // });
                        this.oMessage.error(this.getResourceBundle().getText("ACCOMMODATIONERROR"), {
                            horizontalScrolling: false,
                            verticalScrolling: true,
                            titleAlignment: "Center",
                            actions: this.oMessage.Action.RETRY,
                            onClose: function () {
                                // this.getOwnerComponent().getRouter().navTo("inbox");
                                location.reload();
                            }.bind(this)
                        });
                        reject();
                    }.bind(this)
                });
            }.bind(this));
        }
    });

});