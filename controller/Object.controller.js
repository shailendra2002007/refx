sap.ui.define(["dewa/refx/accommodation/controller/BaseController","sap/ui/model/json/JSONModel","sap/ui/core/routing/History","dewa/refx/accommodation/model/formatter"],function(e,t,o,n){"use strict";return e.extend("dewa.refx.accommodation.controller.Object",{formatter:n,onInit:function(){var e,o=new t({busy:true,delay:0});this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched,this);e=this.getView().getBusyIndicatorDelay();this.setModel(o,"objectView");this.getOwnerComponent().getModel().metadataLoaded().then(function(){o.setProperty("/delay",e)})},onNavBack:function(){var e=o.getInstance().getPreviousHash();if(e!==undefined){history.go(-1)}else{this.getRouter().navTo("worklist",{},true)}},_onObjectMatched:function(e){var t=e.getParameter("arguments").objectId;this.getModel().metadataLoaded().then(function(){var e=this.getModel().createKey("GetDocApproverLogCollection",{DocuNo:t});this._bindView("/"+e)}.bind(this))},_bindView:function(e){var t=this.getModel("objectView"),o=this.getModel();this.getView().bindElement({path:e,events:{change:this._onBindingChange.bind(this),dataRequested:function(){o.metadataLoaded().then(function(){t.setProperty("/busy",true)})},dataReceived:function(){t.setProperty("/busy",false)}}})},_onBindingChange:function(){var e=this.getView(),t=this.getModel("objectView"),o=e.getElementBinding();if(!o.getBoundContext()){this.getRouter().getTargets().display("objectNotFound");return}var n=this.getResourceBundle(),i=e.getBindingContext().getObject(),a=i.DocuNo,r=i.ApproverName;t.setProperty("/busy",false);t.setProperty("/shareSendEmailSubject",n.getText("shareSendEmailObjectSubject",[a]));t.setProperty("/shareSendEmailMessage",n.getText("shareSendEmailObjectMessage",[r,a,location.href]))}})});