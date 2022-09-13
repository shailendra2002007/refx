/*global moment,global _*/
sap.ui.define([
    "dewa/refx/accommodation/controller/BaseController",
    "sap/suite/ui/commons/TimelineItem",
    "sap/m/UploadCollectionParameter",
    "sap/m/UploadCollectionItem",
    "sap/m/ObjectAttribute"
], function (BaseController, OTimeLineItem, oUploadCollectionParameter, oUploadCollectionItem, oObjectAttribute) {
    "use strict";
    return BaseController.extend("dewa.refx.accommodation.controller.Worklist", {
        onContractStartDateChange: function (oEvent) {
            //checking if the entered date is lesser than minDate
            if (!oEvent.getParameters().valid) {
                oEvent.getSource().setDateValue();
                return this.oMessage.error(this.getResourceBundle().getText("MSG_INVALID_CONTRACT_START_DATE"), {
                    horizontalScrolling: false,
                    verticalScrolling: true,
                    titleAlignment: "Center",
                });
            }
        },
        onClickOnRequiredFile: function (e) {
            try {
                var encodeUrl = encodeURI("/sap/opu/odata/sap/ZREFX_GD_ACCOMMODATION_SRV/getDMSDocumentSet('" + e.getSource().getCustomData()[0].getValue() +
                    "')/$value");
                window["dewa.refx.accommodation"].downloadFile(encodeUrl, e.getSource().getText());
            } catch (e) {
                jQuery.sap.log.error(e);
            }
        },
        onInit: function () {
            //calling the defaults
            this.baseControlleronInit();
            //initializing the router
            this.getRouter().getRoute("create").attachPatternMatched(this.onCreatePatternMatched, this);
            this.getRouter().getRoute("worklist").attachPatternMatched(this.onViewPatternMatched, this);
            this.getRouter().getRoute("workitem").attachPatternMatched(this.onViewPatternMatchedThroughPortal, this);
        },
        onCreatePatternMatched: function () {
            if (!this.getModel().isMetadataLoadingFailed()) {
                //gets triggered while creating..
                try {
                    window["dewa.refx.accommodation"].currentView = this.getView();
                    this.refreshModelData();
                    //Setting up the view type
                    this.getModel("worklistView").setProperty("/sProcessType", "createRequest");
                    if (this.getOwnerComponent().getModel("routerDetails")) {
                        this.getCreateAccommodationData(this.getOwnerComponent().getModel("routerDetails").getData().selectedItem); // Get Accommodation Data
                    } else {
                        //no model, heading back to main page
                        this.getRouter().navTo("inbox");
                    }
                } catch (e) {
                    this.closeBusyDialog();
                    this.exceptionErrorNavToMainPage(e);
                }
            }
        },
        formatter_returnLowerCaseAgent: function (evt) {
            //used to return to user readable agent name ex: Building Administrator instead of BUILDING ADMNISTRATOR
            if (evt) {
                return this.getResourceBundle().getText(evt.toLowerCase().replace(" ", "_"));
            } else {
                return "";
            }
        },
        onViewPatternMatchedThroughPortal: function (evt) {
            //stopping the routing logic, since this user would have come from portal
            sap.ui.core.UIComponent.getRouterFor(this).stop();
            if (!this.getModel().isMetadataLoadingFailed()) {
                //gets triggered while viewing an existing request
                try {
                    window["dewa.refx.accommodation"].currentView = this.getView();
                    this.refreshModelData();
                    //Making the bAgreement as true, since it has already been approved by the approver
                    this.getView().getModel("worklistView").setProperty("/bAgreement", true);
                    //Setting up the view type
                    this.getView().getModel("worklistView").setProperty("/sProcessType", "viewRequest");
                    //writing this logic to make sure we capture the workitem.
                    if (!evt.getParameter("arguments").WorkItemNo) {
                        if (this.getRouter().getHashChanger().hash.indexOf("myportal/") !== -1) {
                            var getWorkItemNo = this.getRouter().getHashChanger().hash.indexOf("myportal/"); //getting the index of this
                            var start = getWorkItemNo + 9;
                            getWorkItemNo = this.getRouter().getHashChanger().hash.substring(start, start + 12); // 9 is the length for "/myportal" , 11 is the length for 000002641686
                        }
                    } else if (evt.getParameter("arguments").WorkItemNo) {
                        getWorkItemNo = evt.getParameter("arguments").WorkItemNo;
                    }

                    //fetching the paramters from the url
                    this.WorkItemNo = getWorkItemNo;

                    //lets fetch the required values,before calling the user details and accommidation details
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
                        this.getAccommodationDetailsThroughPortal.bind(this),
                        //failure
                        this.errorWhileFetchinUserDetails.bind(this)
                    );
                } catch (e) {
                    return this.oMessage.error(this.getResourceBundle().getText("MSG_FETCHIN_WI"), {
                        horizontalScrolling: false,
                        verticalScrolling: true,
                        titleAlignment: "Center",
                        details: "<p><strong>Solution:</strong></p>\n" +
                            "Please try opening the link again from your portal inbox.." +
                            "<p class='msgSubText'>Please note. This window will be closed after this message..</p>",
                        onClose: function () {
                            location.reload();
                        }.bind(this),
                        actions: sap.m.MessageBox.Action.OK
                    });
                }
            }
        },
        getAccommodationDetailsThroughPortal: function () {
            this.getAccommodationRelatedDetailsThroughPortal(new this.oFilters({
                path: "WorkItemNo",
                value1: this.WorkItemNo,
                operator: this.oFilterOperator.EQ
            })).then(
                //resolve
                function () {
                    this.clearPromises();
                    //once the Accommodation Request details are being fetched then the following operations are done

                    //Fetching the rental unit, if the building is already selected, this scenarion happend on view request for the approvers
                    //Building administrator & Deputy will have an option of changing the rental units
                    if (this.getView().getModel("worklistView").getProperty("/Accommodation/BldngNo") &&
                        this.getView().getModel("worklistView").getProperty("/Accommodation/BusEntityNo")) {
                        this.fetchingFlatType(); // Calling to fill the rental units;
                        this.updateRequiredFile(); //updating the required file
                    }

                    //fetching the rental unit only for these two workflow agents
                    if (
                        (this.getView().getModel("worklistView").getProperty("/Accommodation/BusType") === this.getResourceBundle().getText("GD") &&
                            this.getView().getModel("worklistView").getProperty("/Accommodation/FlatType").charAt(0) === "Z" && this.getView().getModel(
                                "worklistView").getProperty("/Accommodation/Workitem/Agent_dept") === this.getResourceBundle().getText(
                                "BUILDING_ADMINISTRATOR") && this.getView().getModel("worklistView").getProperty("/Accommodation/BldngNo") !== "") ||
                        (this.getView().getModel("worklistView").getProperty("/Accommodation/BusType") === this.getResourceBundle().getText("GD") &&
                            this.getView().getModel("worklistView").getProperty("/Accommodation/FlatType").charAt(0) === "Z" && this.getView().getModel(
                                "worklistView").getProperty("/Accommodation/Workitem/Agent_dept") === this.getResourceBundle().getText("DEPUTY_MANAGER") &&
                            this.getView().getModel("worklistView").getProperty("/Accommodation/BldngNo") !== "") ||
                        (this.getView().getModel("worklistView").getProperty("/Accommodation/BusType") === this.getResourceBundle().getText("GD") &&
                            this.getView().getModel("worklistView").getProperty("/Accommodation/FlatType").charAt(0) === "Y" && this.getView().getModel(
                                "worklistView").getProperty("/Accommodation/Workitem/Agent_dept") === this.getResourceBundle().getText("DEPUTY_MANAGER") &&
                            this.getView().getModel("worklistView").getProperty("/Accommodation/BldngNo") !== "") ||
                        (this.getView().getModel("worklistView").getProperty("/Accommodation/BusType") === this.getResourceBundle().getText("BS") &&
                            this.getView().getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_dept") === this.getResourceBundle().getText(
                                "BUILDING_ADMINISTRATOR") && this.getView().getModel("worklistView").getProperty("/Accommodation/BldngNo") !== "")
                    ) {
                        this.fetchingRentalUnit();

                    }

                }.bind(this), null);
        },
        errorWhileFetchinUserDetails: function () {
            this.closeBusyDialog();
            this.noErrorhandling();
            //let tell the user that there was an error while fetching up his user details
            return this.oMessage.error(this.getResourceBundle().getText("USERDETAILSERROR"), {
                horizontalScrolling: false,
                verticalScrolling: true,
                titleAlignment: "Center",
                details: "<p><strong>Solution:</strong></p>\n" +
                    "Please go to main page and try again.." +
                    "<p class='msgSubText'>Please note. User will be navigated back to the main page after this message.</p>",
                onClose: function () {
                    this.getOwnerComponent().getRouter().navTo("inbox");
                }.bind(this),
                actions: sap.m.MessageBox.Action.OK
            });
        },
        onViewPatternMatched: function () { //gets triggered while viewing an existing request
            if (!this.getModel().isMetadataLoadingFailed()) {
                try {
                    window["dewa.refx.accommodation"].currentView = this.getView();
                    //Refreshing the data
                    this.refreshModelData();
                    //Setting up the view type
                    this.getView().getModel("worklistView").setProperty("/sProcessType", "viewRequest");
                    //Making the bAgreement as true, since it has already been approved by the approver
                    this.getView().getModel("worklistView").setProperty("/bAgreement", true);
                    //Getting the Accommodation details.
                    if (this.getOwnerComponent().getModel("routerDetails")) {
                        //using an promise cause there are details which we will be pulling after the accommodation details
                        this.getAccommodationData(this.getOwnerComponent().getModel("routerDetails").getData().selectedItem).then(
                            //resolve promise
                            function () {
                                this.clearPromises();
                                //once the Accommodation Request details are being fetched then the following operations are done

                                //Fetching the rental unit, if the building is already selected, this scenarion happend on view request for the approvers
                                //Building administrator & Deputy will have an option of changing the rental units
                                if (this.getView().getModel("worklistView").getProperty("/Accommodation/BldngNo") &&
                                    this.getView().getModel("worklistView").getProperty("/Accommodation/BusEntityNo")) {
                                    this.fetchingFlatType(); // Calling to fill the rental units;
                                    this.updateRequiredFile(); //updating the required file
                                }

                                //fetching the rental unit only for these two workflow agents
                                if (
                                    (this.getView().getModel("worklistView").getProperty("/Accommodation/BusType") === this.getResourceBundle().getText("GD") &&
                                        this.getView().getModel("worklistView").getProperty("/Accommodation/FlatType").charAt(0) === "Z" && this.getView().getModel(
                                            "worklistView").getProperty("/Accommodation/Workitem/Agent_dept") === this.getResourceBundle().getText(
                                            "BUILDING_ADMINISTRATOR") && this.getView().getModel("worklistView").getProperty("/Accommodation/BldngNo") !== "") ||
                                    (this.getView().getModel("worklistView").getProperty("/Accommodation/BusType") === this.getResourceBundle().getText("GD") &&
                                        this.getView().getModel("worklistView").getProperty("/Accommodation/FlatType").charAt(0) === "Z" && this.getView().getModel(
                                            "worklistView").getProperty("/Accommodation/Workitem/Agent_dept") === this.getResourceBundle().getText("DEPUTY_MANAGER") &&
                                        this.getView().getModel("worklistView").getProperty("/Accommodation/BldngNo") !== "") ||
                                    (this.getView().getModel("worklistView").getProperty("/Accommodation/BusType") === this.getResourceBundle().getText("GD") &&
                                        this.getView().getModel("worklistView").getProperty("/Accommodation/FlatType").charAt(0) === "Y" && this.getView().getModel(
                                            "worklistView").getProperty("/Accommodation/Workitem/Agent_dept") === this.getResourceBundle().getText("DEPUTY_MANAGER") &&
                                        this.getView().getModel("worklistView").getProperty("/Accommodation/BldngNo") !== "") ||
                                    (this.getView().getModel("worklistView").getProperty("/Accommodation/BusType") === this.getResourceBundle().getText("BS") &&
                                        this.getView().getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_dept") === this.getResourceBundle().getText(
                                            "BUILDING_ADMINISTRATOR") && this.getView().getModel("worklistView").getProperty("/Accommodation/BldngNo") !== "")
                                ) {
                                    this.fetchingRentalUnit();
                                }
                            }.bind(this),
                            //reject promise
                            function () {
                                this.clearPromises();
                            }.bind(this));
                    } else {
                        //no model, heading back to main page
                        this.getRouter().navTo("inbox");
                    }
                } catch (e) {
                    this.closeBusyDialog();
                    this.exceptionErrorNavToMainPage(e);
                }
            }
        },
        fetchingFlatType: function () {
            //fetching the falt type for the selected building
            this.openBusyDialog(this.getResourceBundle().getText("LOADING_FLATTYPE"));
            this.getView().getModel().read("/FlatTypesF4Set", {
                filters: [new this.oFilters({
                        path: 'BusEntityNo',
                        operator: this.oFilterOperator.EQ,
                        value1: this.getView().getModel("worklistView").getProperty("/Accommodation/BusEntityNo")
                    }),
                    new this.oFilters({
                        path: 'BldngNo',
                        operator: this.oFilterOperator.EQ,
                        value1: this.getView().getModel("worklistView").getProperty("/Accommodation/BldngNo")
                    })
                ],
                success: function (evt) {
                    try {
                        if (!evt.results.length) {
                            if (this.getView().getModel("flatType")) {
                                this.getView().getModel("flatType").setData(null);
                                this.getModel("worklistView").setProperty("/Accommodation/FlatTypeText", "");
                                this.getModel("worklistView").setProperty("/Accommodation/FlatType", "");
                            }
                            return this.oMessage.error(this.getResourceBundle().getText("NO_FLAT_TYPE"), {
                                horizontalScrolling: false,
                                verticalScrolling: true,
                                titleAlignment: "Center",
                            });
                        } else {
                            this.getView().setModel(new this.oJson(evt.results), "flatType");
                        }
                    } catch (e) {
                        if (this.getView().getModel("flatType")) {
                            this.getView().getModel("flatType").setData(null);
                            this.getModel("worklistView").setProperty("/Accommodation/FlatTypeText", "");
                            this.getModel("worklistView").setProperty("/Accommodation/FlatType", "");
                        }
                        return this.oMessage.error(this.getResourceBundle().getText("NO_FLAT_TYPE"), {
                            horizontalScrolling: false,
                            verticalScrolling: true,
                            titleAlignment: "Center",
                        });
                    } finally {
                        if (!this.byId("flatTypeCB").getSelectedItem()) {
                            //lets make the first value as selected defaultly;
                            //this is to make sure the rent payable is always updated
                            this.byId("flatTypeCB").fireChange({
                                selectedItem: this.byId("flatTypeCB").getFirstItem()
                            });
                        } else {
                            //based on the selected key, we are updateing the rent payable
                            this.byId("flatTypeCB").fireChange({
                                selectedItem: this.byId("flatTypeCB").getSelectedItem()
                            });
                        }
                        this.closeBusyDialog();
                    }
                }.bind(this),
                error: function () {
                    this.closeBusyDialog();
                    this.noErrorhandling();
                    //let tell the user that there was an error while fetching up his user details
                    return this.oMessage.error(this.getResourceBundle().getText("MSG_FLAT_TYPE"), {
                        horizontalScrolling: false,
                        verticalScrolling: true,
                        titleAlignment: "Center",
                        onClose: function () {
                            //this.getOwnerComponent().getRouter().navTo("inbox");
                        }.bind(this)
                    });
                }.bind(this)
            });
        },
        fetchingRentalUnit: function () {
            //fetching the rental unit for the selected building
            this.openBusyDialog(this.getResourceBundle().getText("LOADING_RENTALUNIT"));
            //fetching the rental unit against to this buldind ID
            this.getView().getModel().read("/RentalUnitSet", {
                filters: [new this.oFilters({
                        path: 'BldngNo',
                        operator: this.oFilterOperator.EQ,
                        value1: this.getView().getModel("worklistView").getProperty("/Accommodation/BldngNo")
                    }),
                    new this.oFilters({
                        path: 'BusEntityNo',
                        operator: this.oFilterOperator.EQ,
                        value1: this.getView().getModel("worklistView").getProperty("/Accommodation/BusEntityNo")
                    }),
                    new this.oFilters({
                        path: 'FlatTypeCode',
                        operator: this.oFilterOperator.EQ,
                        value1: this.getView().getModel("worklistView").getProperty("/Accommodation/FlatType") ? this.getView().getModel(
                            "worklistView").getProperty("/Accommodation/FlatType").toString() : ""
                    })
                ],
                success: function (evt) {
                    try {
                        // filtering the rental unit which are empty and relevant to this current request if any
                        var aRental = evt.results.filter(function (e) {
                            return e.RentalObject === this.getView().getModel("worklistView").getProperty("/Accommodation/RentalObject") || e.AssignedRequest ===
                                "";
                        }.bind(this));
                        var oJsonModel = new this.oJson(aRental);
                        oJsonModel.setSizeLimit(aRental.length);
                        this.getView().setModel(oJsonModel, "rentalUnit");
                    } catch (e) {
                        this.oMessage.error(this.getResourceBundle().getText("NO_RENTAL_UNIT"), {
                            horizontalScrolling: false,
                            verticalScrolling: true,
                            titleAlignment: "Center",
                        });
                    } finally {
                        this.closeBusyDialog();
                    }
                }.bind(this),
                error: function (e) {
                    this.closeBusyDialog();
                    this.noErrorhandling();
                    //let tell the user that there was an error while fetching up his user details
                    this.oMessage.error(this.getResourceBundle().getText("MSG_RENTAL_UNIT"), {
                        horizontalScrolling: false,
                        verticalScrolling: true,
                        titleAlignment: "Center",
                        onClose: function () {
                            // this.getOwnerComponent().getRouter().navTo("inbox");
                        }.bind(this)
                    });
                }.bind(this)
            });
        },
        postingCommentsInModel: function (evt, oModelData) {
            try {
                //helper function to post the entries in the model
                // if (this.getView().getModel("worklistView").getProperty("/Accommodation/Received_Comments") !== "") {
                if (this.getView().getModel("worklistView").getProperty("/Accommodation/Received_Comments") === "") {
                    this.getView().getModel("worklistView").setProperty("/Accommodation/Received_Comments", "No comments were entered.");
                }
                var getData = this.getView().getModel("worklistView").getData();
                if (getData.Accommodation.Comments === undefined) {
                    getData.Accommodation.Comments = {
                        "results": []
                    };
                }
                var getUserDetails = this.getOwnerComponent().getModel("userDetails").getProperty("/loggedInUser/headerDetails");
                var sUserRole;
                if (this.getView().getModel("worklistView").getProperty("/sProcessType") === "createRequest") {
                    sUserRole = this.getResourceBundle().getText("initiator");
                } else if (this.getView().getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_dept") !== undefined) {
                    //pushing it from the workitem
                    sUserRole = this.getView().getModel("worklistView").getProperty(
                        "/Accommodation/Workitem/Agent_dept").toLowerCase();
                }
                getData.Accommodation.Comments.results.push({
                    BusType: getUserDetails.BusType,
                    PayrollNo: getUserDetails.PayrollNo,
                    ReqNo: getUserDetails.ReqNo,
                    TDFORMAT: "cmtsEnteredinApplication", //Should be replaced as : before submit
                    TDLINE: getUserDetails.UserID + "|" + getUserDetails.PayrollFullName + "|" +
                        getUserDetails.PayrollNo + "|" + sUserRole + "|" + new moment().format("HHmmSS") + "|" + new moment()
                        .format("YYYYMMDD") + "|" + oModelData.Status
                });
                //Adding the comments line
                //yet to determine to logic to split if the length is more than 134 char since tdline is 134 :)
                getData.Accommodation.Comments.results.push({
                    BusType: getUserDetails.BusType,
                    PayrollNo: getUserDetails.PayrollNo,
                    ReqNo: getUserDetails.ReqNo,
                    TDFORMAT: "",
                    TDLINE: this.getView().getModel("worklistView").getProperty("/Accommodation/Received_Comments")
                    //TDLINE: "E0099008089|Amit Sharma|00010376|APR|20200102|150500"
                });
                //updating the value in the model
                oModelData.Comments.results = getData.Accommodation.Comments.results;
                return oModelData;
                // } else {
                // 	return oModelData;
                // }	
            } catch (e) {
                return oModelData;
            }
        },
        onChangeComments: function (evt) {
            this.getView().getModel("worklistView").setProperty("/Accommodation/Received_Comments", evt.getSource().getValue());
        },
        factory_constructingCmtsItems2: function (evt1, evt2) { //function to construct the comments items
            var getTdLine = evt2.getModel().getProperty(evt2.getPath()).TDLINE;
            if (evt2.getModel().getProperty(evt2.getPath()).TDLINE.indexOf("|") !== -1 && evt2.getModel().getProperty(evt2.getPath()).TDFORMAT ===
                ":") {
                //this means this is the header
                var getTdLineHeader = getTdLine.split("|");
                var getText;
                //Creating the status
                var eSwitch;
                var sIcon;
                var sTitle;
                sTitle = getTdLineHeader[6];
                // sTitle = this.getResourceBundle().getText(getTdLineHeader[3].toLowerCase().replace(" ", "_"));
                // SUBMIT=Submit
                // APPROVE=Approve
                // REJECT=Reject
                // WAITLIST=WaitList
                // CLARIFY=Clarify
                // CHECK=Check
                // WITHDRAW=Withdraw				
                switch (true) {
                    case getTdLineHeader[6] === "Approved":
                        eSwitch = "Success";
                        sIcon = "sap-icon://hr-approval";
                        // sIcon = "sap-icon://approvals";
                        break;
                    case getTdLineHeader[6] === "Rejected":
                        eSwitch = "Error";
                        // sIcon = "sap-icon://clear-all";
                        sIcon = "sap-icon://employee-rejections";
                        // sIcon = "sap-icon://decline";
                        // sIcon = "sap-icon://message-error";
                        break;
                    case getTdLineHeader[6] === "Waitlisted":
                        eSwitch = "Error";
                        // sTitle = "Information";
                        sIcon = "sap-icon://customer-history";
                        // sIcon = "sap-icon://lateness";
                        break;
                    case getTdLineHeader[6] === "Submitted":
                        eSwitch = "Success";
                        sIcon = "sap-icon://activity-individual";
                        // sIcon = "sap-icon://create-form";
                        break;
                    case getTdLineHeader[6] === "Needs Clarification" || getTdLineHeader[6] === "Clarify":
                        eSwitch = "Warning";
                        sIcon = "sap-icon://employee-lookup";
                        // sIcon = "sap-icon://employee-lookup";
                        // sIcon = "sap-icon://travel-request";
                        // sIcon = "sap-icon://detail-view";
                        break;
                    case getTdLineHeader[6] === "Clarified":
                        eSwitch = "Success";
                        sIcon = "sap-icon://supplier";
                        // sIcon = "sap-icon://activity-individual";
                        // sIcon = "sap-icon://user-edit";
                        // sIcon = "sap-icon://create-form";
                        // sIcon = "sap-icon://travel-request";
                        break;
                    default:
                        eSwitch = "Success";
                        sIcon = "sap-icon://person-placeholder";
                        // sIcon = "sap-icon://form";
                }
                // "E0099008089|Amit Sharma|00010376|APR|20200102|150500|Approved"
                var returnUi = new this.oFeedListItem({
                    customData: new this.oCustomData({
                        key: "userRole",
                        value: getTdLineHeader[3]
                    }),
                    moreLabel: "more",
                    lessLabel: "less",
                    icon: sIcon,
                    info: this.getResourceBundle().getText(getTdLineHeader[3].toLowerCase().replace(" ", "_")),
                    sender: getTdLineHeader[1],
                    senderActive: false,
                    iconActive: false,
                    timestamp: new moment(getTdLineHeader[5] + getTdLineHeader[4], "YYYYMMDDHHmmSS").format("MMM DD, yyyy")
                });
                var getComments = this.getView().getModel("worklistView").getData().Accommodation.Comments.results;

                //checking if this if the last
                if ((Number(evt2.getPath().split("/")[evt2.getPath().split("/").length - 1]) + 1) === getComments.length) {
                    if (getComments[Number(evt2.getPath().split("/")[evt2.getPath().split("/").length - 1])].TDLINE.indexOf("|") !== -1 &&
                        getComments[Number(evt2.getPath().split("/")[evt2.getPath().split("/").length - 1])].TDFORMAT === ":") {
                        //if the last line is the header line, then pushing the no comments were entered comments
                        returnUi.setText("No comments were entered.");
                        return returnUi;
                    }
                }
                //Now since the UI is created we are looping the next entries to find out the comments for it.
                for (var yu = Number(evt2.getPath().split("/")[evt2.getPath().split("/").length - 1]) + 1; yu < getComments.length; yu++) {
                    if (getComments[yu].TDLINE.indexOf("|") !== -1 && getComments[yu].TDFORMAT === ":") {
                        //if this is an header, then pushing the so far collected message to the warlier created UI and returning it
                        if (getText !== undefined) { //getText are the comments
                            if (getText.indexOf("\\n") !== -1) {
                                getText = "\\n" + getText;
                            }
                        } else {
                            getText = "No comments were entered.";
                        }
                        //once the next header is hit, the there is no point in looping here. Since we have alrady got all the data that we need
                        returnUi.setText(getText.replaceAll("\\n", "<br />"));
                        return returnUi;
                    } else {
                        //this is comments for this current header
                        if (getText === undefined) {
                            getText = getComments[yu].TDLINE;
                        } else {
                            getText = getText + " " + getComments[yu].TDLINE;
                        }
                        //if this is the last entry then i would return the UI
                        if (yu === getComments.length - 1) {
                            //sending it to new line if the user has already pressed entered for comments:)
                            if (getText.indexOf("\\n") !== -1) {
                                getText = "\\n" + getText;
                            }
                            returnUi.setText(getText.replaceAll("\\n", "<br />"));
                            return returnUi;
                        }
                        continue;
                    }
                }
                //Gettng the texts in the next entry
            } else {
                //this means this is the comments
                return new this.oFeedListItem({
                    visible: false
                });
            }
        },
        onConfirmUndertaking: function (e) {
            if (this.getModel("worklistView") && this.getModel("worklistView").getProperty("/Accommodation/BusType") === "") {
                //disabling the checkbox
                e.getSource().setSelected(false);
                return this.oMessage.error(this.getResourceBundle().getText("MSG_BUILDING_ERROR"), {
                    horizontalScrolling: false,
                    verticalScrolling: true,
                    titleAlignment: "Center",
                    details: "<p><strong>Solution:</strong></p>\n" +
                        "Please select the building in the request data section." +
                        "<p class='msgSubText'>Please note. User will be navigated back to request data section after this message.</p>",
                    onClose: function () {
                        //Navigating to the request data section
                        this.getView().byId("objectLayout").scrollToSection(this.getView().byId("buildingDetails").getId(), 500);
                    }.bind(this),
                    actions: sap.m.MessageBox.Action.OK
                });
            }
            //navigating it to the the policies tab	
            this.getView().byId("objectLayout").scrollToSection(this.getView().byId("policiesDetails").getId(), 500);
        },
        getAccommodationData: function (evt) {
            //fecthing the details for the request to display
            return new Promise(function (resolve, reject) {
                this.resolve = resolve;
                this.reject = reject;
                this.openBusyDialog(this.getResourceBundle().getText("LOADING_REQUESTDETAILS"));
                try {
                    //Updating the selected values in the model
                    this.getView().getModel("worklistView").setProperty("/Accommodation", evt);
                    //an placeholder for comments
                    this.getView().getModel("worklistView").setProperty("/Accommodation/Received_Comments", "");
                    if (Number(evt.ReqNo) > 0) {
                        this.getAccommodationRelatedDetails(new this.oFilters({
                            path: "ReqNo",
                            value1: evt.ReqNo,
                            operator: this.oFilterOperator.EQ
                        }));
                    } else {
                        this.resolve();
                    }
                } catch (e) {
                    this.reject();
                    this.closeBusyDialog();
                    this.exceptionErrorNavToMainPage(e);
                }
            }.bind(this));
        },
        getCreateAccommodationData: function (evt) { //fetchin in the details for the request to be created
            this.openBusyDialog(this.getResourceBundle().getText("LOADING_REQUESTDETAILS"));
            try {
                //Updating the selected values in the model
                this.getView().getModel("worklistView").setProperty("/Accommodation", evt);
                //an placeholder for comments
                this.getView().getModel("worklistView").setProperty("/Accommodation/Received_Comments", "");
                //setting the flat type as unselected
                // this.getView().getModel("worklistView").setProperty("/Accommodation/FlatType", "");
                // this.getView().getModel("worklistView").setProperty("/Accommodation/FlatTypeText", "");
                this.closeBusyDialog();
            } catch (e) {
                // this.closeBusyDialog();
                this.closeBusyDialog();
                this.exceptionErrorNavToMainPage(e);
            }
        },
        getAccommodationRelatedDetailsThroughPortal: function (oFilters) { //fetching the accommodation details
            return new Promise(function (resolve, reject) {
                this.openBusyDialog(this.getResourceBundle().getText("LOADING_REQUESTDETAILS"));
                this.getView().getModel().read("/AccommodationSet(BusType='',ReqNo='',PayrollNo='')", {
                    filters: [oFilters],
                    urlParameters: {
                        "$expand": "Workitem,Workitem/Activity,Comments,Logs,Attachment"
                    },
                    success: function (evt) {
                        try {
                            this.closeBusyDialog();
                            //lets delete the attachments before displaying it to the user
                            if (evt.Attachment && evt.Attachment.results) {
                                //lets sort the attachment
                                evt.Attachment.results.sort(function (a, b) {
                                    var sBYear = b.Att_txt.split(";")[b.Att_txt.split(";").length - 1]; //Assuming the year is in the second last
                                    var sBTime = b.Att_txt.split(";")[b.Att_txt.split(";").length - 2]; //Assuming the Time is in the last
                                    var sATime = a.Att_txt.split(";")[b.Att_txt.split(";").length - 2]; //Assuming the Time is in the last
                                    var sAYear = b.Att_txt.split(";")[b.Att_txt.split(";").length - 1]; //Assuming the year is in the second last
                                    //in the asssumtion that the year adn time is in the second and the third value
                                    // current value when deriving this logic
                                    //'Department Coordinator(E0023884);20220509;161252'
                                    //backend developer said she need time to check if she can sort before sending the data
                                    return new moment(sBYear + sBTime, "YYYYMMDDHHmmSS").toDate() - new moment(sAYear + sATime, "YYYYMMDDHHmmSS").toDate()
                                });
                                for (var t = evt.Attachment.results.length - 1; t >= 0; t--) {
                                    var fileOwner = evt.Attachment.results[t].Att_txt.split(";")[0].split("(")[1].split(")")[0];
                                    // we will have to figure the logic to remove the attachments other than initiator to the initiator
                                    // this.getView().getModel("worklistView").getProperty("/Accommodation/WorkAgentDept") === "INITIATOR" && 
                                    if (
                                        evt.Workitem.Agent_dept === "" ||
                                        evt.Workitem.Agent_dept === this.getView().getModel("i18n").getProperty("INITIATOR") ||
                                        evt.Workitem.Agent_dept === this.getView().getModel("i18n").getProperty("DEPARTMENT_HEAD")) {
                                        if (fileOwner !== evt.RaisedBy) {
                                            //removing all the files which are not uploaded by the request owner
                                            evt.Attachment.results.splice(t, 1);
                                        }
                                    }
                                }
                            }
                            //Updating the selected values in the model
                            this.getView().getModel("worklistView").setProperty("/Accommodation", evt);
                            //an placeholder for comments
                            this.getView().getModel("worklistView").setProperty("/Accommodation/Received_Comments", "");

                            //checking if the user is authorized to do action on this workitem
                            if (this.getView().getModel("worklistView").getProperty("/sProcessType") === 'viewRequest' &&
                                this.getView().getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_dept") &&
                                this.getView().getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_dept") !== this.getView().getModel("i18n").getProperty("INITIATOR") &&
                                !this.getView().getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_role")
                            ) {
                                //when the current user doesnt have an auth
                                return this.oMessage.error(this.getResourceBundle().getText("NOT_AUTHORIZED_WF"), {
                                    horizontalScrolling: false,
                                    verticalScrolling: true,
                                    titleAlignment: "Center",
                                    onClose: function () {
                                        // this.getOwnerComponent().getRouter().navTo("inbox");
                                    }.bind(this),
                                    actions: sap.m.MessageBox.Action.OK
                                });
                            }
                            resolve();
                        } catch (e) {
                            this.exceptionErrorNavToMainPage(e);
                            reject();
                        }
                    }.bind(this)
                    //commenting it to see what is thrown from the backend
                    //all the error's can be thrown from the backend
                    // error: function() {
                    // 	this.closeBusyDialog();
                    // 	this.noErrorhandling();
                    // 	//let tell the user that there was an error while fetching up his user details
                    // 	this.oMessage.error(this.getResourceBundle().getText("WORKITEM_ERROR"), {
                    // 		onClose: function() {
                    // 			reject();
                    // 			location.reload();
                    // 		}.bind(this)
                    // 	});
                    // }.bind(this)
                });
            }.bind(this));
        },
        getAccommodationRelatedDetails: function (oFilters) { //fetching the accommodation details
            this.openBusyDialog(this.getResourceBundle().getText("LOADING_REQUESTDETAILS"));
            this.getView().getModel().read("/AccommodationSet(BusType='',ReqNo='',PayrollNo='')", {
                filters: [oFilters],
                urlParameters: {
                    "$expand": "Workitem,Workitem/Activity,Comments,Logs,Attachment"
                },
                success: function (evt) {
                    try {
                        this.closeBusyDialog();
                        if (evt.ReqNo === this.getView().getModel("worklistView").getProperty("/Accommodation/ReqNo")) {
                            //lets delete the attachments before displaying it to the user
                            if (evt.Attachment && evt.Attachment.results) {
                                //lets sort the attachment
                                evt.Attachment.results.sort(function (a, b) {
                                    var sBYear = b.Att_txt.split(";")[b.Att_txt.split(";").length - 1]; //Assuming the year is in the second last
                                    var sBTime = b.Att_txt.split(";")[b.Att_txt.split(";").length - 2]; //Assuming the Time is in the last
                                    var sATime = a.Att_txt.split(";")[b.Att_txt.split(";").length - 2]; //Assuming the Time is in the last
                                    var sAYear = b.Att_txt.split(";")[b.Att_txt.split(";").length - 1]; //Assuming the year is in the second last
                                    //in the asssumtion that the year adn time is in the second and the third value
                                    // current value when deriving this logic
                                    //'Department Coordinator(E0023884);20220509;161252'
                                    //backend developer said she need time to check if she can sort before sending the data
                                    return new moment(sBYear + sBTime, "YYYYMMDDHHmmSS").toDate() - new moment(sAYear + sATime, "YYYYMMDDHHmmSS").toDate()
                                });
                                for (var t = evt.Attachment.results.length - 1; t >= 0; t--) {
                                    var fileOwner = evt.Attachment.results[t].Att_txt.split(";")[0].split("(")[1].split(")")[0];
                                    // we will have to figure the logic to remove the attachments other than initiator to the initiator
                                    // this.getView().getModel("worklistView").getProperty("/Accommodation/WorkAgentDept") === "INITIATOR" && 
                                    if (
                                        evt.Workitem.Agent_dept === "" ||
                                        evt.Workitem.Agent_dept === this.getView().getModel("i18n").getProperty("INITIATOR") ||
                                        evt.Workitem.Agent_dept === this.getView().getModel("i18n").getProperty("DEPARTMENT_HEAD")) {
                                        if (fileOwner !== evt.RaisedBy) {
                                            //removing all the files which are not uploaded by the request owner
                                            evt.Attachment.results.splice(t, 1);
                                        }
                                    }
                                }
                            }
                            //Updating the selected values in the model
                            this.getView().getModel("worklistView").setProperty("/Accommodation", evt);

                            //when the user is not authorized to make any changes in the WF                          
                            //an placeholder for comments
                            this.getView().getModel("worklistView").setProperty("/Accommodation/Received_Comments", "");
                            //setting the contract start date as todays date
                            if (this.getView().getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_dept") === this.getResourceBundle().getText(
                                    "RE_PARTNER") || this.getView().getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_dept") === this.getResourceBundle()
                                .getText("RE_PARTNER")) {
                                this.getView().getModel("worklistView").setProperty("/Accommodation/ContractStartD", new Date());
                            } else {
                                this.getView().getModel("worklistView").setProperty("/Accommodation/ContractStartD", null);
                            }
                            this.getView().byId("objectLayout").scrollToSection(this.getView().byId("buildingDetails").getId(), 500);

                            if (this.getView().getModel("worklistView").getProperty("/sProcessType") === 'viewRequest' &&
                                this.getView().getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_dept") &&
                                this.getView().getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_dept") !== this.getView().getModel("i18n").getProperty("INITIATOR") &&
                                !this.getView().getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_role")) {
                                //when the current user doesnt have an auth
                                return this.oMessage.error(this.getResourceBundle().getText("NOT_AUTHORIZED_WF"), {
                                    horizontalScrolling: false,
                                    verticalScrolling: true,
                                    titleAlignment: "Center",
                                    onClose: function () {
                                        this.getOwnerComponent().getRouter().navTo("inbox");
                                    }.bind(this),
                                    actions: sap.m.MessageBox.Action.OK
                                });
                            }
                            //Calling the promise fn when it it successfull
                            this.resolve();
                        } else {
                            //calling the promise fn when it is unsuccessfull
                            this.reject();
                            //when the request is not the one which we requested for..
                            return this.oMessage.error(this.getResourceBundle().getText("MSG_INVALID_REQ_FETCHED"), {
                                horizontalScrolling: false,
                                verticalScrolling: true,
                                titleAlignment: "Center",
                                details: "<p><strong>Solution:</strong></p>\n" +
                                    "Please go to main page and try again.." +
                                    "<p class='msgSubText'>Please note. User will be navigated back to the main page after this message.</p>",
                                onClose: function () {
                                    this.getOwnerComponent().getRouter().navTo("inbox");
                                }.bind(this),
                                actions: sap.m.MessageBox.Action.OK
                            });
                        }
                    } catch (e) {
                        //calling the promise fn when it is unsuccessfull
                        this.reject();
                        this.exceptionErrorNavToMainPage(e);
                    }
                }.bind(this)
            });
        },
        exceptionErrorNavToMainPage: function (e) { //error function for accommodation fetch
            this.oMessage.error(this.getResourceBundle().getText("errorText"), {
                horizontalScrolling: false,
                verticalScrolling: true,
                titleAlignment: "Center",
                details: "<p><strong>Solution:</strong></p>\n" +
                    "Please try again later.." +
                    "<p><strong>Technical Reason:</strong></p>\n" +
                    e.stack.replaceAll(/\n/g, '<br/>') +
                    "<p class='msgSubText'>Please note. User will be navigated back to the main page after this message.</p>",
                // contentWidth: "200px",
                onClose: function () {
                    this.getRouter().navTo("inbox");
                }.bind(this),
                actions: sap.m.MessageBox.Action.OK
            });

        },
        onChangeBuilding: function (evt) { // Update respective Building name & Business Entity values when Building Number is selected
            var oItem, sBuildingName, sBusEntityNo;
            try {
                oItem = evt.getParameter("selectedItem");
                // var sBuildingName = oItem.getModel('buildingType').getProperty(oItem.oBindingContexts.buildingType.getPath()).BldngName;
                // var sBusEntityNo = oItem.getModel('buildingType').getProperty(oItem.oBindingContexts.buildingType.getPath()).BusEntityNo;
                sBuildingName = oItem.getBindingContext().getObject().BldngName;
                sBusEntityNo = oItem.getBindingContext().getObject().BusEntityNo;

            } catch (e) {
                sBuildingName = "";
                sBusEntityNo = "";
            } finally {
                var oViewModel = this.getModel("worklistView");
                switch (Number(sBusEntityNo)) {
                    case 100:
                        oViewModel.setProperty("/Accommodation/BusType", "GD");
                        oViewModel.setProperty("/Accommodation/BldngName", sBuildingName);
                        oViewModel.setProperty("/Accommodation/BusEntityNo", sBusEntityNo);
                        break;
                    case 101:
                        oViewModel.setProperty("/Accommodation/BusType", "BS");
                        oViewModel.setProperty("/Accommodation/BldngName", sBuildingName);
                        oViewModel.setProperty("/Accommodation/BusEntityNo", sBusEntityNo);
                        break;
                    default:
                        //Clearing out if there is an valid entry, cause based on the building only the Business Entity is calculated
                        oViewModel.setProperty("/Accommodation/BldngName", "");
                        oViewModel.setProperty("/Accommodation/BusEntityNo", "");
                        oViewModel.setProperty("/Accommodation/BusType", "");
                        oViewModel.setProperty("/Accommodation/BldngNo", "");
                        break;
                }
                if (sBuildingName && sBusEntityNo) {
                    this.updateRequiredFile();
                    //Fetching up the details for the flats
                    this.fetchingFlatType();
                }
            }
        },
        updateRequiredFile: function () {
            //changing the required document based on the selected building
            var getBindings = this.byId("required_documents_gd").getBinding('items');
            if (getBindings) {
                getBindings.filter([new this.oFilters({
                    path: 'sBuilding',
                    operator: this.oFilterOperator.EQ,
                    value1: this.getModel("worklistView").getProperty("/Accommodation/BldngNo")
                }), new this.oFilters({
                    and: true,
                    path: 'sBusinessEntity',
                    operator: this.oFilterOperator.EQ,
                    value1: this.getModel("worklistView").getProperty("/Accommodation/BusType")
                })]);
            }
            var getBindings = this.byId("required_documents_bs").getBinding('items');
            if (getBindings) {
                getBindings.filter([new this.oFilters({
                    path: 'sBuilding',
                    operator: this.oFilterOperator.EQ,
                    value1: this.getModel("worklistView").getProperty("/Accommodation/BldngNo")
                }), new this.oFilters({
                    and: true,
                    path: 'sBusinessEntity',
                    operator: this.oFilterOperator.EQ,
                    value1: this.getModel("worklistView").getProperty("/Accommodation/BusType")
                })]);
            }
        },
        onChangeRentalUnit: function (evt) { //Updating the rental unit
            var sRentalName = evt.getParameters().selectedItem.getText();
            var oViewModel = this.getModel("worklistView");
            // var sRentPayable = oItem.getModel('rentType').getProperty(oItem.oBindingContexts.buildingType.getPath()).
            oViewModel.setProperty("/Accommodation/RentalObjectText", sRentalName);
        },
        onChangeFlatType: function (evt) { // Update respective Flat Type Text when Flat Type is selected
            var sFlatTypeName, sRentPayable, bVariableRent;
            try {
                sFlatTypeName = evt.getParameters().selectedItem.getText();
                sRentPayable = evt.getParameter("selectedItem").getBindingContext("flatType").getModel().getProperty(evt.getParameter(
                    "selectedItem").getBindingContext("flatType").getPath()).RentPayable;
                bVariableRent = evt.getParameter("selectedItem").getBindingContext("flatType").getModel().getProperty(evt.getParameter(
                    "selectedItem").getBindingContext("flatType").getPath()).VariableRent;
            } catch (e) {
                sFlatTypeName = "";
                sRentPayable = "";
                bVariableRent = "";
            } finally {
                if (evt.getParameters().selectedItem === null) {
                    //This happens when the approvers clears out the flat type, which in turn will make the rest of the fields hidden, cause the visibility and the editablality of the 
                    //rental unit and the flat type depends on this
                    //so when the user clears it. pushing it with the first entry in the item
                    evt.getSource().setSelectedItem(0);
                    sFlatTypeName = evt.getSource().getItemAt(0).getText();
                    sRentPayable = evt.getSource().getItemAt(0).getBindingContext("flatType").getModel().getProperty(evt.getSource().getItemAt(0)
                        .getBindingContext("flatType").getPath()).RentPayable;
                    bVariableRent = evt.getSource().getItemAt(0).getBindingContext("flatType").getModel().getProperty(evt.getSource().getItemAt(0).getBindingContext(
                        "flatType").getPath()).VariableRent;
                    var oViewModel = this.getModel("worklistView");
                    //Pushing the key field as well to make the field stay in the screen, else it will hide and even after setting the selected item will not be visualized
                    oViewModel.setProperty("/Accommodation/FlatType", evt.getSource().getItemAt(0).getKey());
                    oViewModel.setProperty("/Accommodation/FlatTypeText", sFlatTypeName);
                    //Adding the rent payable and variable
                    oViewModel.setProperty("/Accommodation/RentPayable", sRentPayable);
                    oViewModel.setProperty("/Accommodation/VariableRent", bVariableRent);
                } else {
                    var oViewModel = this.getModel("worklistView");
                    oViewModel.setProperty("/Accommodation/FlatTypeText", sFlatTypeName);
                    //Adding the rent payable and variable
                    oViewModel.setProperty("/Accommodation/RentPayable", sRentPayable);
                    oViewModel.setProperty("/Accommodation/VariableRent", bVariableRent);
                    //fethching the rental unit based on new attrib
                    this.fetchingRentalUnit();
                }
            }

        },
        validateAttachment: function () {
            if (this.getModel("worklistView").getProperty("/Accommodation/Attachment").results.length === 0) {
                return false;
                // return this.oMessage.error(this.getResourceBundle().getText("ATTACHMENT_ERROR"));
            } else {
                //checking if the user has uploaded the minimum file requirement, based on the building it is selected
                // var getFilters = this.getModel("worklistView").getProperty("/sAgreementDocument").filter(function(a) {
                // 	return a.sBusinessEntity === this.getModel("worklistView").getProperty("/Accommodation/BusType") &&
                // 		a.sBuilding === this.getModel("worklistView").getProperty("/Accommodation/BldngNo");
                // }.bind(this));
                //checking if the number of attachment is less than minimum requirememt
                //if the number of attachment the user has attached is eq 2 then letting the user to prcess the request
                if (this.getModel("worklistView").getProperty("/Accommodation/Attachment").results.length >= 2) {
                    return true;
                } else {
                    return false;
                }
                // if (this.getModel("worklistView").getProperty("/Accommodation/Attachment").results.length < getFilters.length) {
                // 	return false;
                // }
                // return true;
            }
        },
        onSubmit: function (evt) {

            //only on INITIATOR submit
            // if (this.getModel("Validation").getProperty("/check")) {
            if (this.getModel("Validation").getData().find(function (e) {
                    return e.scenario === "ATTACH" && e.check === true;
                })) {
                //Validate only one attachment
                if (this.validateAttachment() === false) { //ATTACH
                    return this.oMessage.error(this.getResourceBundle().getText("ATTACHMENT_ERROR"), {
                        horizontalScrolling: false,
                        verticalScrolling: true,
                        titleAlignment: "Center",
                    });
                }
            }

            if (this.getModel("Validation").getData().find(function (e) {
                    return e.scenario === "BUILDING" && e.check === true;
                })) {
                // Validate Building Number
                if (this.validateBuilding() === false) { //BUILDING
                    return;
                }
            }

            if (this.getModel("Validation").getData().find(function (e) {
                    return e.scenario === "FLATYPE" && e.check === true;
                })) {
                // Validate Building Number
                if (this.validateFlatType() === false) { //FLATYPE
                    return;
                }
            }
            if (this.getModel("Validation").getData().find(function (e) {
                    return e.scenario === "CONTACT" && e.check === true;
                })) {
                // Validate Mobile and Email
                if (this.validateContacts() === false) { //CONTACT
                    return;
                }
            }
            if (this.getModel("Validation").getData().find(function (e) {
                    return e.scenario === "FAMILY" && e.check === true;
                })) {
                // Validate Dependants only on GD
                // if (this.getView().getModel("worklistView").getProperty("/Accommodation/BusType") !== "BS") { //FAMILY
                if (this.validateDependents() === false) {
                    return;
                }
                // }
            }
            if (this.getModel("Validation").getData().find(function (e) {
                    return e.scenario === "COSTCNTR" && e.check === true;
                })) {
                // Validate Cost Centers
                if (this.validateCostCenters() === false) { //COSTCNTR
                    return;
                }
            }
            if (this.getModel("Validation").getData().find(function (e) {
                    return e.scenario === "VENDOR" && e.check === true;
                })) {
                if (this.getView().getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_dept") === this.getResourceBundle().getText(
                        "RE_PARTNER") ||
                    this.getView().getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_dept") === this.getResourceBundle().getText(
                        "RE_PARTNER")) { //VENDOR
                    //Validate Vendor
                    if (this.validateVendor() === false) {
                        return;
                    }
                }
            }

            // }
            //Sending the button details
            this.currentButton = _.clone(evt);
            // confirming the user
            this.oMessage.confirm(this.formatText(this.getResourceBundle().getText("MSG_MOBEMAIL_INFO", [this.getModel("worklistView").getProperty(
                "/Accommodation/Mobile"), this.getModel("worklistView").getProperty("/Accommodation/Email")])), {
                horizontalScrolling: false,
                verticalScrolling: true,
                titleAlignment: "Center",
                title: "Confirm", // default
                onClose: function (evts) {
                    switch (evts) {
                        case "CANCEL":
                            //heading to that menu
                            this.getView().byId("objectLayout").scrollToSection(this.getView().byId("personalDetails").getId(), 1000);
                            //Highlighting the mobile and email for user navigation
                            // this.getView().byId("emailAddress").setValueState(this.eValueState.Warning);
                            // this.getView().byId("mobilePhone").setValueState(this.eValueState.Warning);
                            //sap.ui.core.ValueState.Warning
                            break;
                        case "OK":
                            try {
                                //somwhow if i bind this fuction with this with the view it replaces the currentButton field :)// 
                                this.proceedSubmit(this.getSubmitData(this.currentButton), this.currentButton); // Proceed to Submit when confirmed by user
                                break;
                            } catch (e) {
                                this.closeBusyDialog();
                                this.exceptionErrorNavToMainPage(e);
                            }
                    }
                }.bind(this), // default
                styleClass: "", // default
                actions: [sap.m.MessageBox.Action.OK,
                    sap.m.MessageBox.Action.CANCEL
                ], // default
                emphasizedAction: sap.m.MessageBox.Action.OK, // default
                initialFocus: null, // default
                textDirection: sap.ui.core.TextDirection.Inherit // default
            });
        },
        validateMobile: function (e) { //used to diable the mobile and email input once the value is being entered!!
            e = this.byId("mobilePhone")._getInputValue()
            e = e.replaceAll("_", "");
            e = e.replaceAll("-", "");
            if (e && (e.startsWith("+971") && e.length === 13 || e.startsWith("971") && e.length === 12 || e.startsWith("05") && e.length === 10 || e.startsWith("5") && e.length === 9)) {
                this.getModel("worklistView").setProperty("/mobileValueState", this.eValueState.None);
            } else {
                this.getModel("worklistView").setProperty("/mobileValueState", this.eValueState.Error);
            }

            // //lets check if the user has entered all the values
            // if (this.byId("mobilePhone")._getInputValue().indexOf("_") === -1 && this.byId("mobilePhone")._getInputValue().indexOf("+971") !==
            //     -1) { //which means the user has not entered the full value
            //     this.getModel("worklistView").setProperty("/mobileValueState", this.eValueState.None);
            //     return false;
            // } else {
            //     this.getModel("worklistView").setProperty("/mobileValueState", this.eValueState.Error);
            //     return true;
            // }
            // this.validator.validate(this.byId("mobilePhone"));
            // this.byId("mobilePhone").getBinding('value').oType.validateValue(this.byId("mobilePhone")._getInputValue());
        },
        validateEmail: function () { //used to diable the mobile and email input once the value is being entered!!
            var mailPattern = "\\S+@\\S+\\.\\S+";
            // lets check if the user has entered all the values
            if (this.byId("emailAddress").getValue().match(mailPattern)) { //which means the user has not entered the full value
                this.getModel("worklistView").setProperty("/emailValueState", this.eValueState.None);
                return false;
            } else {
                this.getModel("worklistView").setProperty("/emailValueState", this.eValueState.Error);
                return true;
            }
        },
        disableValueState: function (evt) { //used to diable the mobile and email input once the value is being entered!!
            evt.getSource().setValueState(this.eValueState.Error);
        },
        validateBuilding: function () { // Error if mandatory Building is not selected
            var oViewModel = this.getModel("worklistView");
            if (oViewModel.getProperty("/Accommodation/BldngNo") === "") {
                this.oMessage.error(this.getResourceBundle().getText("MSG_BUILDING_ERROR"), {
                    horizontalScrolling: false,
                    verticalScrolling: true,
                    titleAlignment: "Center",
                    onClose: function () {
                        this.getView().byId("objectLayout").scrollToSection(this.getView().byId("buildingDetails").getId(), 500);
                        this.getView().byId("buidingNumber").focus();
                    }.bind(this),
                    actions: sap.m.MessageBox.Action.OK
                });
                return false;
            }
            return true;
        },

        validateFlatType: function () { // Error if mandatory Flat Type is not selected
            var oViewModel = this.getModel("worklistView");
            if (oViewModel.getProperty("/Accommodation/FlatType") === "") {
                this.oMessage.error(this.getResourceBundle().getText("MSG_FLATTYPE_ERROR"), {
                    horizontalScrolling: false,
                    verticalScrolling: true,
                    titleAlignment: "Center",
                    onClose: function () {
                        this.getView().byId("objectLayout").scrollToSection(this.getView().byId("buildingDetails").getId(), 500);
                        this.getView().byId("flatTypeCB").focus();
                    }.bind(this),
                    actions: sap.m.MessageBox.Action.OK
                });
                return false;
            }
            return true;
        },

        validateContacts: function () { // Error if mandatory Mobile and Email are not updated
            var oViewModel = this.getModel("worklistView");
            if (this.validateMobile() && this.validateEmail()) {
                this.oMessage.error(this.getResourceBundle().getText("MSG_MOBEMAIL_ERROR"), {
                    horizontalScrolling: false,
                    verticalScrolling: true,
                    titleAlignment: "Center",
                    onClose: function () {
                        this.getView().byId("objectLayout").scrollToSection(this.getView().byId("buildingDetails").getId(), 500);
                        this.getView().byId("emailAddress").focus();
                        this.getView().byId("mobilePhone").focus();
                        // if (oViewModel.getProperty("/Accommodation/Email") === "" || oViewModel.getProperty("/Accommodation/Email").indexOf("@") !==
                        // 	-1) {
                        // 	this.getView().byId("emailAddress").setValueState(this.eValueState.Error);
                        // 	this.getView().byId("emailAddress").focus();
                        // } else {
                        // 	this.getView().byId("mobilePhone").setValueState(this.eValueState.Error);
                        // 	this.getView().byId("mobilePhone").focus();
                        // }
                    }.bind(this),
                    actions: sap.m.MessageBox.Action.OK
                });
                return false;
            }
            return true;
        },

        validateDependents: function () { // Error if Flat Type selected is Family and requestor is bachelor (dependants are zero)
            var oViewModel = this.getModel("worklistView");
            var iDependants = oViewModel.getProperty("/Accommodation/DependentsNo");
            var sFlatType = oViewModel.getProperty("/Accommodation/FlatType");
            if ((Number(iDependants) === 0) && sFlatType.indexOf("Y") !== -1) {
                // if ((Number(iDependants) === 0 || Number(iDependants) === 1) && sFlatType.indexOf("Y") !== -1) {
                this.oMessage.error(this.getResourceBundle().getText("MSG_DEPENDENTS_ERROR"), {
                    horizontalScrolling: false,
                    verticalScrolling: true,
                    titleAlignment: "Center"
                });
                return false;
            }
            return true;
        },

        validateCostCenters: function () { //Error if invaid cc
            var oViewModel = this.getModel("worklistView");
            if (oViewModel.getProperty("/Accommodation/CostCenter") === "") {
                this.oMessage.error(this.getResourceBundle().getText("MSG_COST_CENTER_ERROR"), {
                    horizontalScrolling: false,
                    verticalScrolling: true,
                    titleAlignment: "Center",
                });
                return false;
            }
            return true;
        },

        validateVendor: function () { //Error if invalid vendor
            var oViewModel = this.getModel("worklistView");
            if (oViewModel.getProperty("/Accommodation/VendorNo") === "" || oViewModel.getProperty("/Accommodation/BPNo") === "") {
                this.oMessage.error(this.getResourceBundle().getText("MSG_VENDOR_BP_ERROR"), {
                    horizontalScrolling: false,
                    verticalScrolling: true,
                    titleAlignment: "Center",
                });
                return false;
            }
            return true;
        },
        constructButtons: function (evt1, evt2) { //Construct the buttons in the detailed page based on the work flow activity
            var sType, sEnabled;
            switch (evt2.oModel.getProperty(evt2.getPath()).Activity_desc) {
                case "Approve":
                    sType = "Accept";
                    sEnabled =
                        "{= (( ${worklistView>/sProcessType} === 'viewRequest' && ${worklistView>/Accommodation/BusType} === ${i18n>GD} && ${worklistView>/Accommodation/FlatType}.charAt(0) === 'Z' && ${worklistView>/Accommodation/Workitem/Agent_dept} === ${i18n>BUILDING_ADMINISTRATOR} ) ||( ${worklistView>/sProcessType} === 'viewRequest' && ${worklistView>/Accommodation/BusType} === ${i18n>GD} && ${worklistView>/Accommodation/FlatType}.charAt(0) === 'Z' && ${worklistView>/Accommodation/Workitem/Agent_dept} === ${i18n>DEPUTY_MANAGER} ) ||( ${worklistView>/sProcessType} === 'viewRequest' && ${worklistView>/Accommodation/BusType} === ${i18n>GD} && ${worklistView>/Accommodation/FlatType}.charAt(0) === 'Y' && ${worklistView>/Accommodation/Workitem/Agent_dept} === ${i18n>DEPUTY_MANAGER} ) || ( ${worklistView>/sProcessType} === 'viewRequest' && ${worklistView>/Accommodation/BusType} === ${i18n>GD} && ${worklistView>/Accommodation/FlatType}.charAt(0) === 'Y' && ${worklistView>/Accommodation/Workitem/Agent_dept} === ${i18n>DEPUTY_MANAGER} ) || ( ${worklistView>/sProcessType} === 'viewRequest' && ${worklistView>/Accommodation/BusType} === ${i18n>BS} && ${worklistView>/Accommodation/Workitem/Agent_dept} === ${i18n>BUILDING_ADMINISTRATOR} )) ? ( ${worklistView>/Accommodation/RentalObject} !== '' ? true : false ) : ( ${worklistView>/Accommodation/Workitem/Agent_dept} === ${i18n>RE_PARTNER} || ${worklistView>/Accommodation/Workitem/Agent_dept} === ${i18n>RE_PARTNER} ) ? ( ${worklistView>/Accommodation/ContractStartD} !== null ? true : false ) : (( ${worklistView>/sProcessType} === 'viewRequest' && ${worklistView>/Accommodation/Workitem/Agent_dept} !== ${i18n>INITIATOR} && ${worklistView>/Accommodation/Workitem/Agent_dept} !== '' ) ? true : false)  }";
                    // "{= (( ${worklistView>/sProcessType} === 'viewRequest' && ${worklistView>/Accommodation/BusType} === ${i18n>GD} && ${worklistView>/Accommodation/FlatType}.charAt(0) === 'Z' && ${worklistView>/Accommodation/Workitem/Agent_dept} === ${i18n>BUILDING_ADMINISTRATOR} ) ||( ${worklistView>/sProcessType} === 'viewRequest' && ${worklistView>/Accommodation/BusType} === ${i18n>GD} && ${worklistView>/Accommodation/FlatType}.charAt(0) === 'Z' && ${worklistView>/Accommodation/Workitem/Agent_dept} === ${i18n>DEPUTY_MANAGER} ) ||( ${worklistView>/sProcessType} === 'viewRequest' && ${worklistView>/Accommodation/BusType} === ${i18n>GD} && ${worklistView>/Accommodation/FlatType}.charAt(0) === 'Y' && ${worklistView>/Accommodation/Workitem/Agent_dept} === ${i18n>DEPUTY_MANAGER} ) || ( ${worklistView>/sProcessType} === 'viewRequest' && ${worklistView>/Accommodation/BusType} === ${i18n>GD} && ${worklistView>/Accommodation/FlatType}.charAt(0) === 'Y' && ${worklistView>/Accommodation/Workitem/Agent_dept} === ${i18n>DEPUTY_MANAGER} ) || ( ${worklistView>/sProcessType} === 'viewRequest' && ${worklistView>/Accommodation/BusType} === ${i18n>BS} && ${worklistView>/Accommodation/Workitem/Agent_dept} === ${i18n>BUILDING_ADMINISTRATOR} )) ? ( ${worklistView>/Accommodation/RentalObject} !== '' ? true : false ) : ( ${worklistView>/Accommodation/Workitem/Agent_dept} === ${i18n>RE_PARTNER} || ${worklistView>/Accommodation/Workitem/Agent_dept} === ${i18n>RE_PARTNER} ) ? ( ${worklistView>/Accommodation/ContractStartD} !== null ? true : false ) : false }";
                    break;
                case "Reject":
                    //for reject comments are needed
                    sType = "Reject";
                    sEnabled =
                        "{= ${worklistView>/Accommodation/Workitem} !== undefined && ${worklistView>/Accommodation/Received_Comments} !== ''  ?  true : false }";
                    break;
                case "Waitlist":
                    // for waitlist no comments are needed
                    sType = "Reject";
                    sEnabled = true;
                    // "{= ${worklistView>/Accommodation/Workitem} !== undefined && ${worklistView>/Accommodation/RentalObject} === ''  ?  true : false }";
                    break;
                case "Clarify":
                    //User has to enter comments on clarify
                    sType = "Reject";
                    sEnabled =
                        "{= ${worklistView>/Accommodation/Workitem} !== undefined && ${worklistView>/Accommodation/Received_Comments} !== ''  ?  true : false }";
                    break;
                case "Withdraw":
                    //When a user withdraws no comments is needed.
                    sType = "Reject";
                    //Approver can only do an waitlist if there is no rental assignment.
                    sEnabled = true;
                    // "{= ${worklistView>/Accommodation/Workitem} !== undefined && ${worklistView>/Accommodation/Received_Comments} !== ''  ?  true : false }";
                    break;
                case "Submit":
                    sType = "Accept";
                    sEnabled =
                        "{= ${worklistView>/Accommodation/Workitem} !== undefined && ${worklistView>/Accommodation/Received_Comments} !== ''  ?  true : false }";
                    break;
                default:
                    sEnabled = "{= ${worklistView>/Accommodation/Workitem} !== undefined  ?  true : false }";
                    sType = "Emphasized";
                    break;
            }
            return new this.oButton({
                text: evt2.oModel.getProperty(evt2.getPath()).Activity_desc,
                press: this.onApproveRejectWaitlist.bind(this),
                enabled: sEnabled,
                type: sType
            }).addStyleClass("sapUiTinyMarginBegin");
        },
        proceedSubmit: function (oSendData, oBtn) { //function for submitting the data
            //Adding attachment which was uploaded by this user
            if (oSendData.Attachment.results) {
                for (var i = oSendData.Attachment.results.length; i > 0; i--) {
                    if (oSendData.Attachment.results[i - 1].FileType === "") {
                        oSendData.Attachment.results.splice(i - 1, 1);
                    }
                }
            }
            //sending only the current user comments, no need to send all the comments to the backend
            if (oSendData.Comments.results) {
                for (var i = oSendData.Comments.results.length - 1; i > 0; i--) {
                    if (oSendData.Comments.results[i - 1].TDFORMAT === "cmtsEnteredinApplication") { //Checking for the header
                        oSendData.Comments.results[i - 1].TDFORMAT = ":";
                        oSendData.Comments.results.splice(0, i - 1);
                        break;
                    }
                }
            }
            this.openBusyDialog(this.getResourceBundle().getText("SUBMIT_REQ")); // Submitting Accommodation Request. Please Wait...
            this.getModel().create("/AccommodationSet", oSendData, {
                success: function (data) {
                    try {
                        this.closeBusyDialog();
                        var oBtnText;
                        if (this.getView().getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_dept") === this.getResourceBundle().getText(
                                "INITIATOR") && oBtn.oSource.getText() === this.getResourceBundle().getText("CLARIFY")) {
                            //since both the user button name is clarify, when there is a success in the user then it means the user has responded for the request clarificatoin
                            oBtnText = "Clarified";
                        } else {
                            oBtnText = oBtn.oSource.getText();
                        }
                        try {
                            //pushing the log to the smart office on success
                            var isMob = /Android|iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                            if (isMob === true && window.navigator.notification && window.navigator.notification.sendLog) {
                                window.navigator.notification.sendLog("REFX_UI_ACCOMM::SUCCESS::" + "Accommodation Request '" + data.ReqNo +
                                    "' is created successfully!" + "::" + data.ReqNo, null, "", "");
                            }
                        } catch {}
                        this.oMessage.success(this.getOwnerComponent().getModel('i18n').getResourceBundle()
                            .getText(oBtnText, [data.ReqNo]), {
                                horizontalScrolling: false,
                                verticalScrolling: true,
                                titleAlignment: "Center",
                                onClose: function () {
                                    this.getOwnerComponent().getRouter().navTo("inbox");
                                }.bind(this)
                            });
                    } catch (e) {
                        this.closeBusyDialog();
                        try {
                            //pushing the log to the smart office on success
                            var isMob = /Android|iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                            if (isMob === true && window.navigator.notification && window.navigator.notification.sendLog) {
                                window.navigator.notification.sendLog("REFX_UI_ACCOMM::ERROR::" + e.message + "::" + "", null, "", "");
                            }
                        } catch {}
                        this.exceptionErrorNavToMainPage(e);
                    } finally {
                        this.closeBusyDialog();
                    }
                }.bind(this)
            });
        },
        getSubmitData: function (btnEvt) { //Fetching the final submit data
            //Filling up the activity details
            var getSendData = this.getModel("worklistView").getProperty("/Accommodation");
            //only runs for showrequest
            if (this.getModel("worklistView").getProperty("/sProcessType") !== "createRequest") {
                getSendData.Workitem.Activity.results.filter(function (e) {
                    return e.Activity_desc === btnEvt.oSource.getText();
                })[0].Final_decision_flg = "X";
            }
            //Setting an dummy date for contract start date
            // getSendData.ContractStartD = null;
            //making the contract start date to this to make sure the date dont jump to prev or next date
            // if (getSendData.ContractStartD) {
            // var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
            // 	pattern: "yyyy-MM-dd"
            // });
            // getSendData.ContractStartD = dateFormat.format(new Date(getSendData.ContractStartD), false);
            // getSendData.ContractStartD = new moment(getSendData.ContractStartD,"YYYY/MM/DD").format("YYYYMMDD") + "T00:00:00";
            // getSendData.ContractStartD = new moment(new moment(getSendData.ContractStartD,"YYYY/MM/DD").format("YYYYMMDD") + "T00:00:00" ,"YYYYMMDDTh:mm:ss")._d;
            // getSendData.ContractStartD.setUTCHours("12", "00", "00", "00");
            //setting it as 12 cus we are in the zone with +4 gmt
            // }
            //Changed By
            getSendData.Changed_By = this.getOwnerComponent().getModel("userDetails").getProperty("/loggedInUser/headerDetails/RaisedBy");
            // getSendData.Changed_Dt = new Date();
            // getSendData.Changed_Tm.ms = new Date().getTime();
            if (this.getModel("worklistView").getProperty("/sProcessType") === "createRequest" &&
                btnEvt.oSource.getText() === this.getResourceBundle().getText("SUBMIT")) {
                //setting the submitted date for the request
                // getSendData.SubmittedDate = new Date();
                getSendData.Status = this.getResourceBundle().getText("SUBMITTED");
                getSendData.StatusText = this.getResourceBundle().getText("initiator") + " - " +
                    this.getResourceBundle().getText("SUBMITTED");
                //Created by
                getSendData.Created_By = this.getOwnerComponent().getModel("userDetails").getProperty("/loggedInUser/headerDetails/RaisedBy");
                // getSendData.Created_Dt = new Date();
                // getSendData.Created_Tm.ms = new Date().getTime();
                //raisedFor, since we are saving the current user details in the raisedfor property
                getSendData.RaisedBy = this.getOwnerComponent().getModel("userDetails").getProperty("/loggedInUser/headerDetails/UserID");
                getSendData.RaisedByPayroll = this.getOwnerComponent().getModel("userDetails").getProperty(
                    "/loggedInUser/headerDetails/PayrollNo");
                getSendData.RaisedByName = this.getOwnerComponent().getModel("userDetails").getProperty(
                    "/loggedInUser/headerDetails/PayrollFullName");
                //raisedFor
                if (this.getOwnerComponent().getModel("userDetails").getProperty("/changedUser/headerDetails") !== undefined) {
                    getSendData.RaisedFor = this.getModel("userDetails").getProperty("/changedUser/headerDetails/UserID");
                    getSendData.RaisedForPayroll = this.getModel("userDetails").getProperty("/changedUser/headerDetails/PayrollNo");
                    getSendData.RaisedForName = this.getModel("userDetails").getProperty("/changedUser/headerDetails/PayrollFullName");
                } else {
                    getSendData.RaisedFor = this.getModel("userDetails").getProperty("/loggedInUser/headerDetails/UserID");
                    getSendData.RaisedForPayroll = this.getModel("userDetails").getProperty("/loggedInUser/headerDetails/PayrollNo");
                    getSendData.RaisedForName = this.getModel("userDetails").getProperty("/loggedInUser/headerDetails/PayrollFullName");
                }
            }
            //released from waitlist, user submits again
            else if (this.getModel("worklistView").getProperty("/sProcessType") === "viewRequest" &&
                btnEvt.oSource.getText() === this.getResourceBundle().getText("SUBMIT") &&
                getSendData.Workitem.Agent_dept === this.getResourceBundle().getText("INITIATOR")) {
                //when the user submit's tje request when it sent back to clarification
                getSendData.Status = this.getResourceBundle().getText("CLARIFIED");
                getSendData.StatusText = this.getResourceBundle().getText(getSendData.Workitem.Agent_dept.toLowerCase().replace(" ", "_")) +
                    " - " +
                    this.getResourceBundle().getText("CLARIFIED");

                // //if the request has been sent for clarification and the user has submitted it
                // getSendData.Status = this.getResourceBundle().getText("SUBMITTED");
                // getSendData.StatusText = this.getResourceBundle().getText("initiator") + " - " +
                //     this.getResourceBundle().getText("SUBMITTED");
            } else if (this.getModel("worklistView").getProperty("/sProcessType") === "viewRequest" &&
                btnEvt.oSource.getText() === this.getResourceBundle().getText("CLARIFY") &&
                getSendData.Workitem.Agent_dept === this.getResourceBundle().getText("INITIATOR")) {
                //if the request has been sent for clarification and the user has submitted it
                getSendData.Status = this.getResourceBundle().getText("CLARIFIED");
                getSendData.StatusText = this.getResourceBundle().getText(getSendData.Workitem.Agent_dept.toLowerCase().replace(" ", "_")) +
                    " - " +
                    this.getResourceBundle().getText("CLARIFIED");
            } else if (this.getModel("worklistView").getProperty("/sProcessType") === "viewRequest" &&
                btnEvt.oSource.getText() === this.getResourceBundle().getText("WITHDRAW") &&
                getSendData.Workitem.Agent_dept === this.getResourceBundle().getText("INITIATOR")) {
                //Withdraw will only work for submitter
                getSendData.Status = this.getResourceBundle().getText("WITHDRAW");
                getSendData.StatusText = this.getResourceBundle().getText(getSendData.Workitem.Agent_dept.toLowerCase().replace(" ", "_")) +
                    " - " +
                    this.getResourceBundle().getText("WITHDRAWED");
            } else if (this.getModel("worklistView").getProperty("/sProcessType") === "viewRequest" &&
                btnEvt.oSource.getText() === this.getResourceBundle().getText("APPROVE")) {
                getSendData.Status = this.getResourceBundle().getText("APPROVED");
                getSendData.StatusText = this.getResourceBundle().getText(getSendData.Workitem.Agent_dept.toLowerCase().replace(" ", "_")) +
                    " - " +
                    this.getResourceBundle().getText("APPROVED");
            } else if (this.getModel("worklistView").getProperty("/sProcessType") === "viewRequest" &&
                btnEvt.oSource.getText() === this.getResourceBundle().getText("REJECT")) {
                getSendData.Status = this.getResourceBundle().getText("REJECTED");
                getSendData.StatusText = this.getResourceBundle().getText(getSendData.Workitem.Agent_dept.toLowerCase().replace(" ", "_")) +
                    " - " +
                    this.getResourceBundle().getText("REJECTED");
            } else if (this.getModel("worklistView").getProperty("/sProcessType") === "viewRequest" &&
                btnEvt.oSource.getText() === this.getResourceBundle().getText("WAITLIST")) {
                getSendData.Status = this.getResourceBundle().getText("WAITLISTED");
                getSendData.StatusText = this.getResourceBundle().getText(getSendData.Workitem.Agent_dept.toLowerCase().replace(" ", "_")) +
                    " - " +
                    this.getResourceBundle().getText("WAITLISTED");
            } else if (this.getModel("worklistView").getProperty("/sProcessType") === "viewRequest" &&
                btnEvt.oSource.getText() === this.getResourceBundle().getText("CLARIFY")) {
                getSendData.Status = this.getResourceBundle().getText("CLARIFY");
                getSendData.StatusText = this.getResourceBundle().getText(getSendData.Workitem.Agent_dept.toLowerCase().replace(" ", "_")) +
                    " - " +
                    this.getResourceBundle().getText("NEEDS_CLARIFICATION");
            }
            //Posting the comments
            getSendData = this.postingCommentsInModel(btnEvt, getSendData);
            //deteting the Received_Comments, cus we already have the data in the comments array :)
            delete getSendData.Received_Comments;
            return getSendData;
        },
        onApproveRejectWaitlist: function (evt) { //genric function for action
            this.currentButton = _.clone(evt);
            // confirming the user
            this.oMessage.confirm(this.formatText(
                this.getResourceBundle().getText("MSG_CONFIRMING_BEFORE_ACTION", [evt.oSource.getText() === this.getResourceBundle().getText(
                        "CLARIFY") ? "send" : evt.oSource.getText(),
                    this.getModel("worklistView").getProperty("/Accommodation/ReqNo"),
                    evt.oSource.getText() === this.getResourceBundle().getText("CLARIFY") ? this.getResourceBundle().getText("for_clarification") :
                    ""
                    // this.getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_dept") === this.getResourceBundle().getText("MSG_PLEASE_NOTE") ? "":
                    // this.getResourceBundle().getText("MSG_PLEASE_NOTE")
                ])), {
                horizontalScrolling: false,
                verticalScrolling: true,
                titleAlignment: "Center",
                title: "Confirm", // default
                onClose: function (evts) {
                    switch (evts) {
                        case "CANCEL":
                            //GOTO THE MENU
                            break;
                        case "OK":
                            try {
                                //Checking for validation
                                // if (this.getModel("Validation").getProperty("/check")) {

                                if (this.getModel("Validation").getData().find(function (e) {
                                        return e.scenario === "VENDOR";
                                    })) {
                                    if (this.getView().getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_dept") === this.getResourceBundle()
                                        .getText("RE_PARTNER") ||
                                        this.getView().getModel("worklistView").getProperty("/Accommodation/Workitem/Agent_dept") === this.getResourceBundle().getText(
                                            "RE_PARTNER")) {
                                        //Validate Vendor
                                        if (this.validateVendor() === false) {
                                            return;
                                        }
                                    }
                                }

                                // }
                                //somwhow if i bind this fuction with this with the view it replaces the currentButton field :)// 
                                this.proceedSubmit(this.getSubmitData(this.currentButton), this.currentButton); // Proceed to Submit when confirmed by user
                                break;
                            } catch (e) {
                                this.closeBusyDialog();
                                this.exceptionErrorNavToMainPage(e);
                            }
                    }
                }.bind(this), // default
                styleClass: "", // default
                actions: [sap.m.MessageBox.Action.OK,
                    sap.m.MessageBox.Action.CANCEL
                ], // default
                emphasizedAction: sap.m.MessageBox.Action.OK, // default
                initialFocus: null, // default
                textDirection: sap.ui.core.TextDirection.Inherit // default
            });
        },
        onWithdraw: function () {
            if (!this.WithdrawDialog) {
                this.WithdrawDialog = this.getDialog("WithdrawDialog");
            }
            this.WithdrawDialog.open();
        },

        CancelWithdrawDialog: function () {
            this.WithdrawDialog.close();
        },

        Withdraw: function () {
            if (this.getModel("worklistView").getProperty("/WithdrawComments") === "") {
                this.oMessage.error(this.getResourceBundle().getText("MSG_WITHDRAW_MAND"), {
                    horizontalScrolling: false,
                    verticalScrolling: true,
                    titleAlignment: "Center",
                });
                return;
            }
            this.CancelWithdrawDialog();
            this.oToast.show("Development is in Progress...");
        },

        onNavBack: function () {
            history.go(-1);
        },
        onCountyCodeChange: function (oEvent) { //on change of country code in mobile
            this.getView().getModel("worklistView").setProperty("/Accommodation/Mobile", oEvent.getSource().getSelectedKey());
        },
        refreshModelData: function () { //refreshing the model
            // var getModel = this.getView().getModel('worklistView');
            // var getModelData = getModel.getData();
            // getModelData.bAgreement = false;
            // getModelData.oDate = new Date();
            // getModelData.msg = "";
            // getModelData.WithdrawComments = "";
            // getModelData.sProcessType = "";
            // getModel.setData(getModelData);
            //Creating the view Model
            var oViewModel = new this.oJson({
                bAgreement: false,
                currentDate: new Date(),
                msg: "",
                WithdrawComments: "",
                sProcessType: "",
                mobileValueState: this.eValueState.None,
                emailValueState: this.eValueState.None,
                sAgreementDocument: this.getModel("attachmentBasedOnBuilding") &&
                    this.getModel("attachmentBasedOnBuilding").getData().attachmentBasedonBuilding ?
                    this.getModel("attachmentBasedOnBuilding").getData().attachmentBasedonBuilding : []
            });
            this.setModel(oViewModel, "worklistView");

            //lets clear the flattype, so that while create the flat type will be unselected
            if (this.getModel("flatType")) {
                this.getModel("flatType").setData(null);
            }
        },
        //File upload methods
        onChange: function (oEvent) {
            var oUploadCollection = oEvent.getSource();
            // Header Token
            var oCustomerHeaderToken = new oUploadCollectionParameter({
                name: "x-csrf-token",
                value: "securityTokenFromModel"
            });
            oUploadCollection.addHeaderParameter(oCustomerHeaderToken);
            this.oToast.show("Event change triggered");
        },
        onFileView: function (oEvent) { //on viewing the file
            try {
                var byteCharacters;
                if (oEvent.getSource().getMetadata().getElementName() === "sap.m.UploadCollectionItem") {
                    //on file link
                    byteCharacters = atob(oEvent.getSource().getCustomData().filter(function (a) {
                        return a.mProperties.key === "fileData";
                    })[0].getValue());
                } else if (oEvent.getSource().getMetadata().getElementName() === "sap.m.ObjectAttribute") {
                    //from attribute
                    byteCharacters = atob(oEvent.getSource().getParent().getCustomData().filter(function (a) {
                        return a.mProperties.key === "fileData";
                    })[0].getValue());
                }

                var byteNumbers = new Array(byteCharacters.length);
                for (var i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                var byteArray = new Uint8Array(byteNumbers);
                var file, sFileType;
                if (oEvent.getSource().getMetadata().getElementName() === "sap.m.UploadCollectionItem") {
                    //on file link
                    sFileType = oEvent.getSource().getFileName().split(".")[1];
                } else if (oEvent.getSource().getMetadata().getElementName() === "sap.m.ObjectAttribute") {
                    //from attribute
                    sFileType = oEvent.getSource().getParent().getFileName().split(".")[1];
                }

                if (sFileType === "PDF" || sFileType === "pdf") {
                    file = new Blob([byteArray], {
                        type: 'application/pdf;base64'
                    });
                } else if (sFileType === "PNG" || sFileType === "png") {
                    file = new Blob([byteArray], {
                        type: 'application/pdf;base64'
                    });
                } else if (sFileType === "docx" || sFileType === "DOCX" || sFileType === "doc" || sFileType === "DOC") {
                    file = new Blob([byteArray], {
                        type: 'application/msword;base64'
                    });
                } else if (sFileType === "jpeg" || sFileType === "JPEG" || sFileType === "jpg" || sFileType === "JPG") {
                    file = new Blob([byteArray], {
                        type: 'application/jpeg;base64'
                    });
                } else if (sFileType === "xls" || sFileType === "XLS" || sFileType === "xlsx" || sFileType === "XLSX") {
                    file = new Blob([byteArray], {
                        type: 'application/msexcel'
                    });
                } else if (sFileType === "txt" || sFileType === "TXT") {
                    file = new Blob([byteArray], {
                        type: 'text/plain'
                    });
                }
                var url = URL.createObjectURL(file);
                var link = document.createElement('a');
                link.href = url;
                if (oEvent.getSource().getMetadata().getElementName() === "sap.m.UploadCollectionItem") {
                    //on file link
                    link.setAttribute('download', oEvent.getSource().getFileName());
                } else if (oEvent.getSource().getMetadata().getElementName() === "sap.m.ObjectAttribute") {
                    //from attribute
                    link.setAttribute('download', oEvent.getSource().getParent().getFileName());
                }
                document.body.appendChild(link);
                link.click();
                //getting the current line number and getting its content
                //logic to view the file				
            } catch (e) {
                this.oMessage.error("Error while retriving the file. Please try again later", {
                    horizontalScrolling: false,
                    verticalScrolling: true,
                    titleAlignment: "Center",
                });
            }
        },
        onFileDeleted: function (oEvent) { //on deleting the file
            var getModel = this.getModel("worklistView");
            var getData = getModel.getData();
            try {
                this.currentFileForDelete = oEvent.getSource().getCustomData().filter(function (a) {
                    return a.mProperties.key === "path";
                })[0].getValue();
            } catch (e) {
                jQuery.sap.log.error(e);
                return this.oMessage.error("Error occured, Please try again later..", {
                    horizontalScrolling: false,
                    verticalScrolling: true,
                    titleAlignment: "Center",
                });
            }
            return this.oMessage.confirm(this.getResourceBundle().getText("MSG_CONFIRM_ATTACHMENT_DEL", [
                getData.Accommodation.Attachment.results[this.currentFileForDelete.split("/")[this.currentFileForDelete.split("/").length - 1]]
                .FileName,
                // return this.oMessage.confirm(this.getResourceBundle().getText("MSG_CONFIRM_ATTACHMENT_DEL", [
                // 	getData.Accommodation.Attachment.results[this.currentFileForDelete.split("/")[this.currentFileForDelete.split("/").length - 1]]
                // 	.FileName + '.' + getData.Accommodation.Attachment.results[this.currentFileForDelete.split("/")[this.currentFileForDelete.split(
                // 		"/").length - 1]].FileExt,
                this
                .getModel("worklistView").getProperty("/Accommodation/ReqNo")
            ]), {
                horizontalScrolling: false,
                verticalScrolling: true,
                titleAlignment: "Center",
                title: "Confirm", // default
                onClose: function (sAction) {
                    switch (sAction) {
                        case "OK":
                            try {
                                getData.Accommodation.Attachment.results.splice(this.currentFileForDelete.split("/")[this.currentFileForDelete.split("/").length - 1], 1);
                                getModel.setData(getData);
                                this.oToast.show("Please make sure to save the request to delete the file permanently..");
                            } catch (e) {
                                this.oToast.show("Trouble while deleting the file... Please try again later..");
                            }
                            break;
                        case "CANCEL":
                            break;
                    }
                }.bind(this), // default
                styleClass: "", // default
                actions: [sap.m.MessageBox.Action.OK,
                    sap.m.MessageBox.Action.CANCEL
                ], // default
                emphasizedAction: sap.m.MessageBox.Action.OK, // default
                initialFocus: null, // default
                textDirection: sap.ui.core.TextDirection.Inherit // default
            });
        },

        onFilenameLengthExceed: function () {
            this.oToast.show("Event filenameLengthExceed triggered");
        },

        onFileSizeExceed: function () {
            this.oToast.show("Maximum file size allowed per file is 5 MB.");
        },

        onTypeMissmatch: function () {
            this.oMessage.error(this.getResourceBundle().getText("UPLOAD_MISMATCH"), {
                horizontalScrolling: false,
                verticalScrolling: true,
                titleAlignment: "Center",
            });
        },
        formatter_UploadedOn: function (oVal) {
            return new moment(oVal.split(";")[1] + oVal.split(";")[2], "YYYYMMDDHHmmSS").format("MMM DD, yyyy h:mm:ss a");
        },
        factory_attachments: function (e1, e2) {
            if (e2) {
                if (e2.getModel().getProperty(e2.getPath()).Docid) {
                    var url = "/sap/opu/odata/sap/ZREFX_GD_ACCOMMODATION_SRV/getDocumentsSet(Docid='" + e2.getModel().getProperty(e2.getPath()).Docid + "')/$value";
                }
                return new oUploadCollectionItem({
                    deletePress: this.onFileDeleted.bind(this),
                    url: url,
                    // press: this.onFileView.bind(this),
                    // fileName: e2.getModel().getProperty(e2.getPath()).FileName + "." + e2.getModel().getProperty(e2.getPath()).FileExt,
                    fileName: e2.getModel().getProperty(e2.getPath()).FileName,
                    customData: [
                        new this.oCustomData({
                            key: 'fileData',
                            value: e2.getModel().getProperty(e2.getPath()).Att_bin
                        }),
                        new sap.ui.core.CustomData({
                            key: "path",
                            value: e2.getPath()
                        })
                        // ,
                        // new sap.ui.core.CustomData({
                        // 	key: "fileType",
                        // 	value: e2.getModel().getProperty(e2.getPath()).FileType.toString(),
                        // 	writeToDom: true
                        // })
                    ],
                    attributes: [
                        new oObjectAttribute({
                            title: "Uploaded By",
                            text: e2.getModel().getProperty(e2.getPath()).Att_txt.split(";")[0]
                            // text: "{= ${worklistView>Att_txt}.split(';')[0] }"
                        }),
                        new oObjectAttribute({
                            title: "Uploaded On",
                            text: {
                                path: 'worklistView>Att_txt',
                                formatter: this.formatter_UploadedOn
                            }
                        }),
                        // new oObjectAttribute({
                        // 	title: "",
                        // 	text: "View Document",
                        // 	active: true,
                        // 	visible:false,
                        // 	press: this.onViewDocument.bind(this)
                        // }),
                        new oObjectAttribute({
                            title: "",
                            visible: e2.getModel().getProperty(e2.getPath()).Att_bin !== "",
                            text: "Delete",
                            active: true,
                            customData: new sap.ui.core.CustomData({
                                key: "path",
                                value: e2.getPath()
                            }),
                            press: this.onFileDeleted.bind(this)
                        }).addStyleClass("redFont")
                    ]
                });
            }
        },
        factory_attachments_initiator: function (e1, e2) {
            return new oUploadCollectionItem({
                deletePress: this.onFileDeleted.bind(this),
                press: this.onFileView.bind(this),
                fileName: window.fnArraylastEntry(e2.getModel().getProperty(e2.getPath()).sFilePath.split("/")),
                attributes: [
                    new oObjectAttribute({
                        text: window.fnArraylastEntry(e2.getModel().getProperty(e2.getPath()).sDocumentDetails.split("/"))
                    }),
                    new oObjectAttribute({
                        text: "Upload completed form ⇯",
                        active: true,
                        press: this.onViewDocument.bind(this)
                    }),
                    new oObjectAttribute({
                        text: "Replace completed form ⤮",
                        active: true,
                        press: this.onViewDocument.bind(this)
                    }),
                    new oObjectAttribute({
                        active: true,
                        text: "fileuploaded.pdf ☑"
                    })
                ]
            });
        },
        onViewDocumentClose: function (oEvent) {
            try {
                oEvent.getSource().getParent().close();
            } catch (e) {
                oEvent.getSource().getParent().getParent().close();
            }
        },
        onViewDocument: function (oEvent) {
            //on viewing the file
            try {
                var byteCharacters;
                if (oEvent.getSource().getMetadata().getElementName() === "sap.m.UploadCollectionItem") {
                    //on file link
                    byteCharacters = atob(oEvent.getSource().getCustomData().filter(function (a) {
                        return a.mProperties.key === "fileData";
                    })[0].getValue());
                } else if (oEvent.getSource().getMetadata().getElementName() === "sap.m.ObjectAttribute") {
                    //from attribute
                    byteCharacters = atob(oEvent.getSource().getParent().getCustomData().filter(function (a) {
                        return a.mProperties.key === "fileData";
                    })[0].getValue());
                }

                var byteNumbers = new Array(byteCharacters.length);
                for (var i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                var byteArray = new Uint8Array(byteNumbers);
                var file, sFileType;
                if (oEvent.getSource().getMetadata().getElementName() === "sap.m.UploadCollectionItem") {
                    //on file link
                    sFileType = oEvent.getSource().getFileName().split(".")[1];
                } else if (oEvent.getSource().getMetadata().getElementName() === "sap.m.ObjectAttribute") {
                    //from attribute
                    sFileType = oEvent.getSource().getParent().getFileName().split(".")[1];
                }

                if (sFileType === "PDF" || sFileType === "pdf") {
                    file = new Blob([byteArray], {
                        type: 'application/pdf;base64'
                    });
                } else if (sFileType === "PNG" || sFileType === "png") {
                    file = new Blob([byteArray], {
                        type: 'application/pdf;base64'
                    });
                } else if (sFileType === "docx" || sFileType === "DOCX" || sFileType === "doc" || sFileType === "DOC") {
                    file = new Blob([byteArray], {
                        type: 'application/msword;base64'
                    });
                } else if (sFileType === "jpeg" || sFileType === "JPEG" || sFileType === "jpg" || sFileType === "JPG") {
                    file = new Blob([byteArray], {
                        type: 'application/jpeg;base64'
                    });
                } else if (sFileType === "xls" || sFileType === "XLS" || sFileType === "xlsx" || sFileType === "XLSX") {
                    file = new Blob([byteArray], {
                        type: 'application/msexcel'
                    });
                } else if (sFileType === "txt" || sFileType === "TXT") {
                    file = new Blob([byteArray], {
                        type: 'text/plain'
                    });
                }
                var url = URL.createObjectURL(file);
                var oDialog = this.getDialog("ViewDocument");
                // oDialog.setModel(new this.oJson({
                // 	"fileURL": url
                // }), "viewDocumentModel");
                var printWindow = window.open(url, '', 'width=800,height=500');
                printWindow.print();
                // oDialog.open();
                //getting the current line number and getting its content
                //logic to view the file				
            } catch (e) {
                this.oMessage.error("Error while retriving the file. Please try again later", {
                    horizontalScrolling: false,
                    verticalScrolling: true,
                    titleAlignment: "Center",
                });
            }
        },
        fileURL: function (oEvent) {
            return '<div><iframe title="description" style="height: 100vh;" src="https://docs.google.com/viewer?url=' + oEvent +
                '&embedded=true"></iframe></div>';
        },
        onChangeOnfile: function (e) {
            var fileReaders = new FileReader();
            // fileReaders.readAsText(e.getParameter("files")[0]);
            fileReaders.readAsDataURL(e.getParameter("files")[0]);
            // fileReaders.readAsBinaryString(e.getParameter("files")[0]);
            this._fileReaderHeader = e.getParameter("files")[0];
            fileReaders.onload = function (e) {
                //fillin the details for the model
                var getModel = this.getModel("worklistView");
                var getData = getModel.getData();
                if (getData.Accommodation.Attachment.results === undefined) {
                    getData.Accommodation.Attachment.results = [];
                }
                var fileContent = e.srcElement.result.split(",").pop();
                var iKb = e.total / 1024;
                var iMb = iKb / 1024;
                var sFileSize;
                if (iMb > 1) {
                    sFileSize = iMb + " Mb";
                } else {
                    sFileSize = iKb + " Kb";
                }
                getData.Accommodation.Attachment.results.push({
                    BusType: getData.Accommodation.BusType,
                    ReqNo: getData.Accommodation.ReqNo,
                    PayrollNo: getData.Accommodation.PayrollNo,
                    FileType: this._fileReaderHeader.type,
                    //FileType: this.name.split(".")[1],
                    FileName: this._fileReaderHeader.name,
                    // FileName: this._fileReaderHeader.split(".")[0],
                    FileExt: this._fileReaderHeader.name.split(".")[1],
                    Language: "EN",
                    Att_txt: this.getModel("userDetails").getProperty("/loggedInUser/headerDetails/PayrollFullName") + ";" + new moment().format(
                        "YYYYMMDD") + ";" + new moment().format("HHmmSS"),
                    Att_bin: fileContent
                });
                //Updating the model
                getModel.setData(getData);
                this._fileReaderHeader = undefined;
            }.bind(this);
        }
    });
});