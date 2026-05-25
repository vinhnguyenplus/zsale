sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, Filter, FilterOperator, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("sap.cap.northwind.orders.freestyle.controller.List", {
    onInit: function () {
    },

    onSearch: function () {
      var sOrderId = this.getView().byId("filterOrderId").getValue();
      var sCustomerVal = this.getView().byId("filterCustomer").getValue();
      var oDateVal = this.getView().byId("filterOrderDate").getDateValue();
      var aFilters = [];

      // Filter by Order ID
      if (sOrderId) {
        var iOrderNum = parseInt(sOrderId, 10);
        if (!isNaN(iOrderNum)) {
          aFilters.push(new Filter("orderNumber", FilterOperator.EQ, iOrderNum));
        }
      }

      // Filter by Customer Shortcode (e.g. VINET)
      if (sCustomerVal) {
        var sCustomerCode = sCustomerVal.split(" - ")[0].trim();
        aFilters.push(new Filter("customer/customerID", FilterOperator.EQ, sCustomerCode));
      }

      // Filter by Order Date
      if (oDateVal) {
        aFilters.push(new Filter("orderDate", FilterOperator.EQ, oDateVal));
      }

      var oTable = this.getView().byId("ordersTable");
      var oBinding = oTable.getBinding("items");
      if (oBinding) {
        oBinding.filter(aFilters);
      }
    },

    onAdaptFilters: function () {
      MessageToast.show("Adapt Filters clicked. Default filters are active.");
    },

    onTableUpdateFinished: function (oEvent) {
      var iTotal = oEvent.getParameter("total") || 0;
      var oTitle = this.getView().byId("tableTitle");
      oTitle.setText("Orders (" + iTotal.toLocaleString() + ")");
    },

    onRowPress: function (oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      if (oContext) {
        var sOrderId = oContext.getProperty("ID");
        this._navigateToDetail(sOrderId);
      }
    },

    onOrderLinkPress: function (oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      if (oContext) {
        var sOrderId = oContext.getProperty("ID");
        this._navigateToDetail(sOrderId);
      }
    },

    _navigateToDetail: function (sOrderId) {
      this.getOwnerComponent().getRouter().navTo("detail", {
        orderId: sOrderId
      });
    },

    onCreateOrder: function () {
      // Navigate to the create route (separate from detail to avoid guid'new' error)
      this.getOwnerComponent().getRouter().navTo("create");
    },

    onDeleteOrders: function () {
      var oTable = this.getView().byId("ordersTable");
      var aSelectedItems = oTable.getSelectedItems();

      if (aSelectedItems.length === 0) {
        MessageBox.warning("Please select at least one order to delete.");
        return;
      }

      var that = this;
      MessageBox.confirm("Are you sure you want to delete the " + aSelectedItems.length + " selected order(s)?", {
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.YES,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.YES) {
            var oModel = that.getView().getModel();

            aSelectedItems.forEach(function (oItem) {
              var sPath = oItem.getBindingContext().getPath();
              oModel.remove(sPath);
            });

            oTable.removeSelections();
            MessageToast.show("Selected orders deleted.");
          }
        }
      });
    },

    onTableSettings: function () {
      MessageToast.show("Table customization settings opened.");
    }
  });
});
