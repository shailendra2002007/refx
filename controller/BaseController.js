sap.ui.define(["sap/ui/core/mvc/Controller","sap/ui/core/CustomData","sap/m/MessageToast","sap/ui/core/ValueState","dewa/refx/accommodation/model/formatter","sap/ui/model/Filter","sap/ui/model/FilterOperator","sap/m/Dialog","sap/m/ObjectStatus","sap/m/Button","sap/m/SelectList","sap/ui/core/ListItem","sap/ui/layout/VerticalLayout","sap/m/Text","sap/m/MessageBox","sap/m/FormattedText","sap/ui/model/json/JSONModel","sap/ui/model/FilterType","sap/m/Popover","sap/ui/core/Item","sap/ui/model/Sorter","sap/m/FeedListItem","dewa/refx/accommodation/util/customType","sap/ui/core/InvisibleText"],function(e,t,o,i,s,n,r,a,u,l,d,c,g,m,h,p,f,D,y,w,B,T,b,x){"use strict";return e.extend("dewa.refx.accommodation.controller.BaseController",{baseControlleronInit:function(){window["dewa.refx.accommodation"].currentView=this.getView();this.getBusyDialog();this.getView().setModel(new this.oJson(this.utility),"utility")},fetchApplicationControlData:function(){this.openBusyDialog(this.getResourceBundle().getText("LOADING_APPDETAILS"));return new Promise(function(e,t){this.getModel().read("/getApplicationControlDataSet",{success:function(t){this.getOwnerComponent().setModel(new this.oJson(t.results),"Validation");e()}.bind(this),error:t})}.bind(this))},fetchRequiredDocumentDetails:function(){this.openBusyDialog(this.getResourceBundle().getText("LOADING_REQUIREDDOCDETAILS"));return new Promise(function(e,t){this.getModel().read("/getBuilding_AttachmentsSet",{success:function(t){this.getOwnerComponent().setModel(new this.oJson({attachmentBasedonBuilding:t.results}),"attachmentBasedOnBuilding");e()}.bind(this),error:t})}.bind(this))},utility:{RemoveZeros:function(e){if(isNaN(e)){return e}else{return Number(e)}},titleCase:function(e){if(e){var t=e.toLowerCase().split(" ");for(var o=0;o<t.length;o++){t[o]=t[o].charAt(0).toUpperCase()+t[o].substring(1)}return t.join(" ")}},Return:function(e){return e},ReverseVisibility:function(e){try{return!window["dewa.refx.accommodation"].currentView.byId(e).getVisible()}catch(e){return false}}},oCustomType:b,oFeedListItem:T,oSorter:B,oListItem:c,oItem:w,oSelectList:d,oPopover:y,oButton:l,oCustomData:t,oToast:o,oJson:f,oInvisibleText:x,eValueState:i,oMessage:h,oFormatter:s,oFilters:n,oFilterOperator:r,oFilterType:D,oFormattedText:p,formatText:function(e){return new p({htmlText:e})},noErrorhandling:function(){this.getOwnerComponent()._bMessageOpen=true},yesErrorhandling:function(){this.getOwnerComponent()._bMessageOpen=false},clearPromises:function(){delete this.reject;delete this.resolve},getUserDetails:function(e){return new Promise(function(t,o){if(e&&e.oValue1!==this.getModel("userDetails").getProperty("/loggedInUser/headerDetails/PayrollNo")){var i=[];i.push(e);this.openBusyDialog(this.getResourceBundle().getText("CHECKING_COORDINATOR"))}else{var i;this.openBusyDialog(this.getResourceBundle().getText("LOADING_USER_DETAILS"))}this.getView().getModel().read("/AccommodationSet(BusType='',ReqNo='',PayrollNo='')",{filters:i,urlParameters:{$expand:"Comments,Workitem,Workitem/Activity,Logs,Attachment"},success:function(i){try{if(i&&i.Coordinator){this.getOwnerComponent().getModel("userDetails").setProperty("/changedUser/headerDetails",i)}else{this.getOwnerComponent().setModel(new f({loggedInUser:{headerDetails:i,accommodationData:undefined},changedUser:{headerDetails:undefined,accommodationData:undefined},tableRowIndex:0,tableNoOfRows:25}),"userDetails")}}catch(e){o();jQuery.sap.log.error(e)}finally{if(e!==undefined){t(e)}else{t(undefined)}}}.bind(this)})}.bind(this))},getRouter:function(){return sap.ui.core.UIComponent.getRouterFor(this)},getModel:function(e){return this.getView().getModel(e)},setModel:function(e,t){return this.getView().setModel(e,t)},getResourceBundle:function(){return this.getOwnerComponent().getModel("i18n").getResourceBundle()},getBusyDialog:function(){if(!this._busyDialog){this._busyDialog=sap.ui.xmlfragment(this.getResourceBundle().getText("FRAG_PATH")+"BusyDialog",this);this.getView().addDependent(this._busyDialog)}},openBusyDialog:function(e){this._busyDialog.close();this._busyDialog.setText(e);this._busyDialog.open()},closeBusyDialog:function(){this._busyDialog.close()},getDialog:function(e){var t=sap.ui.xmlfragment(this.getResourceBundle().getText("FRAG_PATH")+e,this);this.getView().addDependent(t);return t}})});