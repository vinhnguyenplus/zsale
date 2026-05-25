sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/routing/History",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/Label",
  "sap/m/Input",
  "sap/m/VBox",
  "sap/m/Table",
  "sap/m/Column",
  "sap/m/ColumnListItem",
  "sap/m/Text",
  "sap/m/SearchField",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
], function (Controller, History, JSONModel, MessageToast, MessageBox,
  Dialog, Button, Label, Input, VBox, Table, Column, ColumnListItem, Text, SearchField,
  Filter, FilterOperator) {
  "use strict";

  return Controller.extend("sap.cap.northwind.orders.freestyle.controller.Detail", {

    onInit: function () {
      // State model for edit/display toggle
      var oStateModel = new JSONModel({
        editMode: false,
        isNew: false
      });
      this.getView().setModel(oStateModel, "stateModel");

      // Attach route handlers
      var oRouter = this.getOwnerComponent().getRouter();
      oRouter.getRoute("detail").attachPatternMatched(this._onDetailMatched, this);
      oRouter.getRoute("create").attachPatternMatched(this._onCreateMatched, this);
    },

    /* ============================================
       ROUTE HANDLERS
       ============================================ */

    _onDetailMatched: function (oEvent) {
      var sOrderId = oEvent.getParameter("arguments").orderId;
      var oView = this.getView();
      var oStateModel = oView.getModel("stateModel");

      oStateModel.setProperty("/editMode", false);
      oStateModel.setProperty("/isNew", false);

      // Bind to existing order using OData V2 guid key format
      oView.bindElement({
        path: "/Orders(guid'" + sOrderId + "')",
        parameters: {
          expand: "customer,items,items/product"
        },
        events: {
          change: this._onBindingChange.bind(this),
          dataRequested: function () {
            oView.setBusy(true);
          },
          dataReceived: function () {
            oView.setBusy(false);
          }
        }
      });
    },

    _onCreateMatched: function () {
      var oView = this.getView();
      var oModel = oView.getModel();
      var oStateModel = oView.getModel("stateModel");

      oStateModel.setProperty("/editMode", true);
      oStateModel.setProperty("/isNew", true);

      // Generate a sequential order number
      var iNewOrderNumber = Math.floor(Math.random() * 90000) + 10000;

      // Create a new OData entry for Orders
      var oContext = oModel.createEntry("/Orders", {
        properties: {
          orderNumber: iNewOrderNumber,
          employeeName: "",
          orderDate: new Date().toISOString(),
          requiredDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          freight: "0.00",
          shipName: "",
          shipAddress: "",
          shipCity: "",
          shipCountry: ""
        }
      });

      // Bind the view to the new transient context
      oView.bindElement({
        path: oContext.getPath(),
        parameters: {
          expand: "customer,items,items/product"
        }
      });
    },

    _onBindingChange: function () {
      var oView = this.getView();
      var oElementBinding = oView.getElementBinding();

      if (!oElementBinding || !oElementBinding.getBoundContext()) {
        // Invalid order ID - navigate back
        this.getOwnerComponent().getRouter().navTo("list", {}, true);
        return;
      }

      // Update items tab count
      this._updateItemsTabCount();
    },

    _updateItemsTabCount: function () {
      var oItemsTable = this.getView().byId("itemsTable");
      var oTabFilter = this.getView().byId("orderItemsTab");

      if (oItemsTable && oTabFilter) {
        var oBinding = oItemsTable.getBinding("items");
        if (oBinding) {
          var iCount = oBinding.getLength();
          oTabFilter.setText("Order Items (" + iCount + ")");
        }
      }
    },

    onItemsTableUpdateFinished: function (oEvent) {
      var iTotal = oEvent.getParameter("total") || 0;
      var oTabFilter = this.getView().byId("orderItemsTab");
      if (oTabFilter) {
        oTabFilter.setText("Order Items (" + iTotal + ")");
      }
    },

    /* ============================================
       EDIT / DISPLAY MODE
       ============================================ */

    onEdit: function () {
      this.getView().getModel("stateModel").setProperty("/editMode", true);
    },

    onCancel: function () {
      var oModel = this.getView().getModel();
      var oStateModel = this.getView().getModel("stateModel");

      if (oStateModel.getProperty("/isNew")) {
        // Discard the new entry and go back
        oModel.resetChanges();
        this.onNavBack();
      } else {
        // Reset any pending changes and switch to display mode
        oModel.resetChanges();
        oStateModel.setProperty("/editMode", false);
      }
    },

    onSave: function () {
      var oView = this.getView();
      var oModel = oView.getModel();
      var oStateModel = oView.getModel("stateModel");
      var bIsNew = oStateModel.getProperty("/isNew");
      var that = this;

      if (!oModel.hasPendingChanges()) {
        MessageToast.show("No changes to save.");
        oStateModel.setProperty("/editMode", false);
        return;
      }

      oView.setBusy(true);

      oModel.submitChanges({
        success: function (oData) {
          oView.setBusy(false);
          var bHasError = false;
          var sErrorMessage = "";
          
          if (oData && oData.__batchResponses) {
            oData.__batchResponses.forEach(function(oResponse) {
              if (oResponse.response && oResponse.response.statusCode >= 400) {
                bHasError = true;
                try {
                  var oResponseBody = JSON.parse(oResponse.response.body);
                  sErrorMessage = oResponseBody.error.message.value;
                } catch(e) {
                  sErrorMessage = oResponse.response.statusText;
                }
              }
            });
          }

          if (bHasError) {
            MessageBox.error(sErrorMessage || "Failed to save order.");
            return;
          }

          MessageToast.show("Order saved successfully.");
          oStateModel.setProperty("/editMode", false);
          oStateModel.setProperty("/isNew", false);

          if (bIsNew) {
            // After creating, navigate to list to see the new order
            that.getOwnerComponent().getRouter().navTo("list", {}, true);
          }
        },
        error: function (oError) {
          oView.setBusy(false);
          var sErrorMessage = "Failed to save order.";
          try {
            var oResponseBody = JSON.parse(oError.responseText);
            sErrorMessage = oResponseBody.error.message.value;
          } catch(e) {
            if (oError.message) {
              sErrorMessage = oError.message;
            }
          }
          MessageBox.error(sErrorMessage);
        }
      });
    },

    /* ============================================
       DELETE ORDER
       ============================================ */

    onDelete: function () {
      var that = this;
      var oContext = this.getView().getBindingContext();

      if (!oContext) {
        MessageBox.warning("No order selected to delete.");
        return;
      }

      var sPath = oContext.getPath();

      MessageBox.confirm("Are you sure you want to delete this order?", {
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.YES,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.YES) {
            var oModel = that.getView().getModel();
            that.getView().setBusy(true);

            oModel.remove(sPath, {
              success: function () {
                that.getView().setBusy(false);
                MessageToast.show("Order deleted successfully.");
                that.onNavBack();
              },
              error: function () {
                that.getView().setBusy(false);
                MessageBox.error("Failed to delete order.");
              }
            });
          }
        }
      });
    },

    /* ============================================
       ITEM OPERATIONS
       ============================================ */

    onAddItem: function () {
      var that = this;
      var oView = this.getView();

      // Create a product selection dialog
      if (!this._oAddItemDialog) {
        var oProductTable = new Table({
          id: oView.createId("productSelectTable"),
          mode: "SingleSelectLeft",
          growing: true,
          growingThreshold: 20,
          columns: [
            new Column({ header: new Text({ text: "Product ID" }), width: "20%" }),
            new Column({ header: new Text({ text: "Product Name" }), width: "50%" }),
            new Column({ header: new Text({ text: "Unit Price" }), hAlign: "Right", width: "30%" })
          ]
        });

        oProductTable.bindItems({
          path: "/Products",
          sorter: { path: "productNumber", descending: false },
          template: new ColumnListItem({
            cells: [
              new Text({ text: "{productNumber}" }),
              new Text({ text: "{name}" }),
              new Text({ text: "{unitPrice} USD" })
            ]
          })
        });

        var oQuantityInput = new Input(oView.createId("addItemQty"), {
          type: "Number",
          value: "1",
          width: "100%"
        });

        this._oAddItemDialog = new Dialog({
          title: "Add Item to Order",
          contentWidth: "600px",
          contentHeight: "400px",
          content: [
            new VBox({
              items: [
                new SearchField({
                  placeholder: "Search products...",
                  liveChange: function (oEvt) {
                    var sQuery = oEvt.getParameter("newValue");
                    var aFilters = [];
                    if (sQuery) {
                      aFilters.push(new Filter("name", FilterOperator.Contains, sQuery));
                    }
                    oProductTable.getBinding("items").filter(aFilters);
                  }
                }),
                oProductTable,
                new Label({ text: "Quantity:", class: "sapUiSmallMarginTop" }),
                oQuantityInput
              ]
            })
          ],
          beginButton: new Button({
            text: "Add",
            type: "Emphasized",
            press: function () {
              that._addSelectedItem();
            }
          }),
          endButton: new Button({
            text: "Cancel",
            press: function () {
              that._oAddItemDialog.close();
            }
          })
        });

        oView.addDependent(this._oAddItemDialog);
      }

      // Reset quantity
      oView.byId("addItemQty").setValue("1");
      this._oAddItemDialog.open();
    },

    _addSelectedItem: function () {
      var oView = this.getView();
      var oProductTable = oView.byId("productSelectTable");
      var aSelectedItems = oProductTable.getSelectedItems();

      if (aSelectedItems.length === 0) {
        MessageBox.warning("Please select a product.");
        return;
      }

      var oSelectedContext = aSelectedItems[0].getBindingContext();
      var sProductId = oSelectedContext.getProperty("ID");
      var fUnitPrice = parseFloat(oSelectedContext.getProperty("unitPrice")) || 0;
      var iQuantity = parseInt(oView.byId("addItemQty").getValue(), 10) || 1;

      // Get the current order path
      var oOrderContext = oView.getBindingContext();
      if (!oOrderContext) {
        MessageBox.error("No order context found.");
        return;
      }

      var oModel = oView.getModel();
      var sOrderItemsPath = oOrderContext.getPath() + "/items";

      // Create a new OrderItem entry
      oModel.createEntry(sOrderItemsPath, {
        properties: {
          product_ID: sProductId,
          unitPrice: fUnitPrice.toFixed(2),
          quantity: iQuantity,
          discount: "0.00"
        }
      });

      this._oAddItemDialog.close();
      oProductTable.removeSelections();
      MessageToast.show("Item added. Click Save to persist.");
    },

    onDeleteItems: function () {
      var oTable = this.getView().byId("itemsTable");
      var aSelectedItems = oTable.getSelectedItems();

      if (aSelectedItems.length === 0) {
        MessageBox.warning("Please select at least one item to delete.");
        return;
      }

      var oModel = this.getView().getModel();
      aSelectedItems.forEach(function (oItem) {
        var sPath = oItem.getBindingContext().getPath();
        oModel.remove(sPath);
      });

      oTable.removeSelections();
      MessageToast.show("Selected items removed. Click Save to persist.");
    },

    /* ============================================
       NAVIGATION
       ============================================ */

    onNavBack: function () {
      var oHistory = History.getInstance();
      var sPreviousHash = oHistory.getPreviousHash();

      // Reset any pending changes before navigating
      var oModel = this.getView().getModel();
      if (oModel.hasPendingChanges()) {
        oModel.resetChanges();
      }

      if (sPreviousHash !== undefined) {
        window.history.go(-1);
      } else {
        this.getOwnerComponent().getRouter().navTo("list", {}, true);
      }
    }
  });
});
