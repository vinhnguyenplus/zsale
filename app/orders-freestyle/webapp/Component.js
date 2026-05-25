sap.ui.define([
  "sap/ui/core/UIComponent"
], function (UIComponent) {
  "use strict";

  return UIComponent.extend("sap.cap.northwind.orders.freestyle.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      // call the base component's init function
      UIComponent.prototype.init.apply(this, arguments);

      // enable routing
      this.getRouter().initialize();
    }
  });
});
