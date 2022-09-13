sap.ui.define(["dewa/refx/accommodation/controller/BaseController"],function(e){"use strict";return e.extend("dewa.refx.accommodation.controller.inbox",{goToInbox:function(){this.getRouter().navTo("apporverInbox")},onInit:function(){this.baseControlleronInit();this.getRouter().getRoute("inbox").attachPatternMatched(this.onInboxPatternMatched,this);var e=new this.oJson({accommodationData:[],tableCount:0,siteVisible:true,requestType:"Accommodation Requests"});this.getView().setModel(e,"inboxViewModel")},onCloseCoordinator:function(){this.clear_filters();this.getUserDetails(undefined).then(this.getOverallAccommodationDetails.bind(this),null)},checkForActiveContract:function(){return new Promise(function(e,t){var s=this.getModel("userDetails").getProperty("/changedUser/headerDetails/PayrollNo")?this.getModel("userDetails").getProperty("/changedUser/headerDetails/PayrollNo"):this.getModel("userDetails").getProperty("/loggedInUser/headerDetails/PayrollNo");this.getModel().read("/getActiveContractSet('"+s+"')",{success:function(){e()},error:t})}.bind(this))},onCreateAccommodationPress:function(){this.checkForActiveContract().then(function(){if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")!==undefined){var e=this.getModel("userDetails").getProperty("/changedUser/headerDetails")}else{var e=this.getModel("userDetails").getProperty("/loggedInUser/headerDetails")}this.getView().getController().getOwnerComponent().setModel(new sap.ui.model.json.JSONModel({selectedItem:e}),"routerDetails");this.getRouter().navTo("create")}.bind(this),null)},onRequestPress:function(e){var t;if(this.getView().getModel("userDetails").getData().changedUser.accommodationData===undefined){t=this.getView().getModel("userDetails").getData().loggedInUser.accommodationData[e.getParameter("listItem").getBindingContext("userDetails").getPath().split("/")[e.getParameter("listItem").getBindingContext("userDetails").getPath().split("/").length-1]]}else{t=this.getView().getModel("userDetails").getData().changedUser.accommodationData[e.getParameter("listItem").getBindingContext("userDetails").getPath().split("/")[e.getParameter("listItem").getBindingContext("userDetails").getPath().split("/").length-1]]}this.getView().getController().getOwnerComponent().setModel(new sap.ui.model.json.JSONModel({selectedItem:t}),"routerDetails");this.getRouter().navTo("worklist")},onPayrollChange:function(e){this.byId("filter_payroll_number").setValueState(this.eValueState.None);this.getUserDetails(new this.oFilters({path:"PayrollNo",operator:this.oFilterOperator.EQ,value1:this.getView().byId("filter_payroll_number").getValue().replaceAll("_","").replaceAll(" ","")})).then(this.getOverallAccommodationDetails.bind(this),null)},clear_filters:function(){this.getView().byId("filter_search").clear();this.getView().byId("filter_submitted_daterange").setDateValue()},onDateLiveChange:function(e){if(this.getModel("device").getProperty("/system/phone")){return}var t,s;t=this.getModel("userDetailsBackup").getData();s=_.clone(t.AccommodationReqListSet_FullData);s=s.filter(function(t){if(e.getParameters().newValue!==""){if(this.getView().byId("filter_search")&&this.getView().byId("filter_search").getValue()){return t.Created_Dt>=e.getParameters().from&&t.Created_Dt<=e.getParameters().to&&(t.ReqNo.indexOf(this.getView().byId("filter_search").getValue())!==-1||t.RaisedForName.indexOf(this.getView().byId("filter_search").getValue())!==-1||t.RaisedByName.indexOf(this.getView().byId("filter_search").getValue())!==-1||t.Status.indexOf(this.getView().byId("filter_search").getValue())!==-1||t.StatusText.indexOf(this.getView().byId("filter_search").getValue())!==-1)}else{return t.Created_Dt>=e.getParameters().from&&t.Created_Dt<=e.getParameters().to}}else{if(this.getView().byId("filter_search")&&this.getView().byId("filter_search").getValue()){return t.ReqNo.indexOf(this.getView().byId("filter_search").getValue())!==-1||t.RaisedForName.indexOf(this.getView().byId("filter_search").getValue())!==-1||t.RaisedByName.indexOf(this.getView().byId("filter_search").getValue())!==-1||t.Status.indexOf(this.getView().byId("filter_search").getValue())!==-1||t.StatusText.indexOf(this.getView().byId("filter_search").getValue())!==-1}else{return t}}}.bind(this));if(s&&s.length>this.getModel("userDetails").getProperty("/tableNoOfRows")){this.byId("pagination").setVisible(true);this.splittingModelBasedOnTableRow(s);if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/changedUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[0])}else if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")===undefined&&this.getModel("userDetails").getProperty("/loggedInUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[0])}this.getView().getModel("userDetails").setProperty("/tableRowIndex",0)}else{this.byId("pagination").setVisible(false);if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/changedUser/accommodationData",s)}else if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")===undefined&&this.getModel("userDetails").getProperty("/loggedInUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",s)}}},onSearchBtn:function(e){this.getUserDetails(new this.oFilters({path:"PayrollNo",operator:this.oFilterOperator.EQ,value1:this.getView().byId("filter_payroll_number").getValue().replaceAll("_","").replaceAll(" ","")})).then(this.getOverallAccommodationDetails.bind(this),null).then(this.onSearchBtnFilter.bind(this),null)},onSearchBtnFilter:function(){try{var e=this.getModel("inboxViewModel").getProperty("/filter_search")}catch(t){var e=""}finally{if(!e){e=""}}this.filterTableBasedOnFilter(e)},onSearchLiveChange:function(e){if(this.getModel("device").getProperty("/system/phone")){return}try{var t=this.getModel("inboxViewModel").getProperty("/filter_search")}catch(e){var t=""}finally{if(!t){t=""}}this.filterTableBasedOnFilter(t)},filterTableBasedOnFilter:function(e){var t,s;t=this.getModel("userDetailsBackup").getData();s=_.clone(t.AccommodationReqListSet_FullData);s=s.filter(function(t){if(e!==""){if(this.getView().byId("filter_submitted_daterange")&&this.getView().byId("filter_submitted_daterange").getDateValue()!==null){return(t.ReqNo.indexOf(e)!==-1||t.RaisedForName.toLowerCase().indexOf(e.toLowerCase())!==-1||t.RaisedByName.toLowerCase().indexOf(e.toLowerCase())!==-1||t.Status.toLowerCase().indexOf(e.toLowerCase())!==-1||t.StatusText.toLowerCase().indexOf(e.toLowerCase())!==-1)&&(t.Created_Dt>=this.getView().byId("filter_submitted_daterange").getFrom()&&t.Created_Dt<=this.getView().byId("filter_submitted_daterange").getTo())}else{return t.ReqNo.indexOf(e)!==-1||t.RaisedForName.toLowerCase().indexOf(e.toLowerCase())!==-1||t.RaisedByName.toLowerCase().indexOf(e.toLowerCase())!==-1||t.Status.toLowerCase().indexOf(e.toLowerCase())!==-1||t.StatusText.toLowerCase().indexOf(e.toLowerCase())!==-1}}else{if(this.getView().byId("filter_submitted_daterange")&&this.getView().byId("filter_submitted_daterange").getDateValue()!==null){return t.Created_Dt>=this.getView().byId("filter_submitted_daterange").getFrom()&&t.Created_Dt<=this.getView().byId("filter_submitted_daterange").getTo()}else{return t}}}.bind(this));if(s&&s.length>this.getModel("userDetails").getProperty("/tableNoOfRows")){this.byId("pagination").setVisible(true);this.splittingModelBasedOnTableRow(s);if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/changedUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[0])}else if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")===undefined&&this.getModel("userDetails").getProperty("/loggedInUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[0])}this.getView().getModel("userDetails").setProperty("/tableRowIndex",0)}else{this.byId("pagination").setVisible(false);if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/changedUser/accommodationData",s)}else if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")===undefined&&this.getModel("userDetails").getProperty("/loggedInUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",s)}}},onRequestChange:function(e){if(e.getParameter("selectedItem").getText()==="Accommodation Requests"){this.getView().getModel("inboxViewModel").setProperty("/requestType","Accommodation Requests")}else{this.getView().getModel("inboxViewModel").setProperty("/requestType","Release Requests")}},onInboxPatternMatched:function(){if(!this.getModel().isMetadataLoadingFailed()){try{this.getOwnerComponent().getModel("userDetails").setData(undefined)}catch(e){jQuery.sap.log.error(e)}finally{this.fetchApplicationControlData().then(this.fetchRequiredDocumentDetails.bind(this),null).then(this.getUserDetails.bind(this),null).then(this.getOverallAccommodationDetails.bind(this),null)}}},errorWhileFetchinUserDetails:function(){this.closeBusyDialog();this.noErrorhandling();this.oMessage.error(this.getResourceBundle().getText("USERDETAILSRROR"),{horizontalScrolling:false,verticalScrolling:true,titleAlignment:"Center",onClose:function(){this.getOwnerComponent().getRouter().navTo("inbox")}.bind(this)})},errorWhileFetchinAccommodationrDetails:function(){this.closeBusyDialog();this.noErrorhandling();this.oMessage.error(this.getResourceBundle().getText("ACCOMMODATIONERROR"),{horizontalScrolling:false,verticalScrolling:true,titleAlignment:"Center",onClose:function(){this.getOwnerComponent().getRouter().navTo("inbox")}.bind(this)})},statusIcon:function(e){switch(e){case this.getResourceBundle().getText("SUBMITTED"):return"sap-icon://message-success";case this.getResourceBundle().getText("APPROVED"):return"sap-icon://accept";case this.getResourceBundle().getText("CLARIFICATION"):return"sap-icon://along-stacked-chart";case this.getResourceBundle().getText("CLARIFIED"):return"sap-icon://message-success";case this.getResourceBundle().getText("WAITLISTED"):return"sap-icon://lateness";case this.getResourceBundle().getText("REJECTED"):return"sap-icon://message-errorr";case this.getResourceBundle().getText("WITHDRAWED"):return"sap-icon://cancel";case this.getResourceBundle().getText("FAILED"):return"sap-icon://status-error"}},statusState:function(e){switch(e){case this.getResourceBundle().getText("SUBMITTED"):return this.eValueState.Information;case this.getResourceBundle().getText("APPROVED"):return this.eValueState.Success;case this.getResourceBundle().getText("CLARIFICATION"):return this.eValueState.Warning;case this.getResourceBundle().getText("CLARIFIED"):return this.eValueState.Success;case this.getResourceBundle().getText("WAITLISTED"):return this.eValueState.Warning;case this.getResourceBundle().getText("REJECTED"):return this.eValueState.Error;case this.getResourceBundle().getText("WITHDRAWED"):return this.eValueState.Error;case this.getResourceBundle().getText("FAILED"):return this.eValueState.Error;case e.indexOf("Failed")!==-1:return this.eValueState.Error;case this.getResourceBundle().getText("RELEASED"):return this.eValueState.Success}},onAfterRendering:function(){},onPaginationPrev:function(e){var t=this.getView().getModel("userDetails").getProperty("/tableRowIndex");var s=t-1;if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/changedUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[s])}else if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")===undefined&&this.getModel("userDetails").getProperty("/loggedInUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[s])}this.getView().getModel("userDetails").setProperty("/tableRowIndex",s)},onPaginationNext:function(e){var t=this.getView().getModel("userDetails").getProperty("/tableRowIndex");var s=t+1;if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/changedUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[s])}else if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")===undefined&&this.getModel("userDetails").getProperty("/loggedInUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[s])}this.getView().getModel("userDetails").setProperty("/tableRowIndex",s)},onPaginationFirst:function(e){var t=this.getView().getModel("userDetails").getProperty("/tableRowIndex");var s=0;if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/changedUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[s])}else if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")===undefined&&this.getModel("userDetails").getProperty("/loggedInUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[s])}this.getView().getModel("userDetails").setProperty("/tableRowIndex",s)},onPaginationLast:function(e){var t=this.getView().getModel("userDetails").getProperty("/tableRowIndex");var s=this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split/length")-1;if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/changedUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[s])}else if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")===undefined&&this.getModel("userDetails").getProperty("/loggedInUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[s])}this.getView().getModel("userDetails").setProperty("/tableRowIndex",s)},onPaginationNoOfRows:function(e){this.clear_filters();if(e.getParameters().selectedItem.getText().indexOf("Show All")!==-1){this.getView().getModel("userDetails").setProperty("/tableNoOfRows",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_FullData/length"));this.getView().getModel("userDetails").setProperty("/tableRowIndex",0);if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/changedUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_FullData"))}else if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")===undefined&&this.getModel("userDetails").getProperty("/loggedInUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_FullData"))}}this.getView().getModel("userDetails").setProperty("/tableNoOfRows",e.getParameters().selectedItem.getKey());this.getView().getModel("userDetails").setProperty("/tableRowIndex",0);this.splittingModelBasedOnTableRow();if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/changedUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[0])}else if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")===undefined&&this.getModel("userDetails").getProperty("/loggedInUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[0])}},splittingModelBasedOnTableRow:function(e){var t,s;t=this.getModel("userDetailsBackup").getData();if(e){s=e}else{s=_.clone(t.AccommodationReqListSet_FullData)}var i=this.getModel("userDetails").getProperty("/tableNoOfRows");var r=s.length/i;var a=parseInt(r);if(s.length%i!==0){a=a+1}t.AccommodationReqListSet_split=[];for(var o=1;o<=a;o++){t.AccommodationReqListSet_split.push(s.splice(0,i))}this.setModel(new this.oJson(t),"userDetailsBackup")},getOverallAccommodationDetails:function(e){return new Promise(function(t,s){if(e!==undefined){var i=[];i.push(e);if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")){this.openBusyDialog(this.getResourceBundle().getText("COORDINATOR_APPROVED_FETCHING_USER",[this.getOwnerComponent().getModel("userDetails").getProperty("/loggedInUser/headerDetails/PayrollFullName"),this.getOwnerComponent().getModel("userDetails").getProperty("/changedUser/headerDetails/PayrollNo")]))}}else{var i;this.openBusyDialog(this.getResourceBundle().getText("LOADING_ACCOMMODATION"))}this.getView().getModel().mPathCache={};this.getView().getModel().read("/AccommodationSet",{filters:i,urlParameters:{$expand:"Workitem,Workitem/Activity"},success:function(e){try{if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")){this.getModel("userDetails").setProperty("/changedUser/accommodationData",e.results);var i;var r=e.results;i={AccommodationReqListSet_FullData:_.clone(r),AccommodationReqListSet_split:[]};this.setModel(new this.oJson(i),"userDetailsBackup");if(e.results&&e.results.length>this.getModel("userDetails").getProperty("/tableNoOfRows")){this.byId("pagination").setVisible(true);this.splittingModelBasedOnTableRow();this.getModel("userDetails").setProperty("/changedUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[0])}else{this.byId("pagination").setVisible(false);if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/changedUser/accommodationData",e.results)}else if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")===undefined&&this.getModel("userDetails").getProperty("/loggedInUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",e.results)}}this.getView().byId("inboxPage").bindElement("userDetails>/changedUser")}else{this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",e.results);var i;var r=e.results;i={AccommodationReqListSet_FullData:_.clone(r),AccommodationReqListSet_split:[]};this.setModel(new this.oJson(i),"userDetailsBackup");if(e.results&&e.results.length>this.getModel("userDetails").getProperty("/tableNoOfRows")){this.byId("pagination").setVisible(true);this.splittingModelBasedOnTableRow();this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",this.getModel("userDetailsBackup").getProperty("/AccommodationReqListSet_split")[0])}else{this.byId("pagination").setVisible(false);if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/changedUser/accommodationData",e.results)}else if(this.getModel("userDetails").getProperty("/changedUser/headerDetails")===undefined&&this.getModel("userDetails").getProperty("/loggedInUser/headerDetails")!==undefined){this.getModel("userDetails").setProperty("/loggedInUser/accommodationData",e.results)}}this.getView().byId("inboxPage").bindElement("userDetails>/loggedInUser")}t()}catch(e){s();this.errorWhileFetchinAccommodationrDetails()}finally{this.closeBusyDialog()}}.bind(this),error:function(){this.closeBusyDialog();this.noErrorhandling();this.oMessage.error(this.getResourceBundle().getText("ACCOMMODATIONERROR"),{horizontalScrolling:false,verticalScrolling:true,titleAlignment:"Center",actions:this.oMessage.Action.RETRY,onClose:function(){location.reload()}.bind(this)});s()}.bind(this)})}.bind(this))}})});