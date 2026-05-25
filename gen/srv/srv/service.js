const cds = require('@sap/cds');

module.exports = cds.service.impl(async function() {
  const { Products, Categories, Customers, Orders, OrderItems } = this.entities;

  // Helper to retrieve existing database records before they are updated or deleted
  async function getAffectedRecords(req) {
    const entity = req.target || req.entity;
    const query = req.query;
    let whereClause = null;
    
    if (query) {
      if (query.DELETE && query.DELETE.where) whereClause = query.DELETE.where;
      else if (query.UPDATE && query.UPDATE.where) whereClause = query.UPDATE.where;
      else if (query.SELECT && query.SELECT.where) whereClause = query.SELECT.where;
    }
    
    // Safety fallback to ensure we filter by ID
    if (!whereClause || (Array.isArray(whereClause) && whereClause.length === 0) || (!Array.isArray(whereClause) && Object.keys(whereClause).length === 0)) {
      if (req.params && req.params.length > 0) {
        whereClause = typeof req.params[0] === 'object' ? req.params[0] : { ID: req.params[0] };
      } else if (req.data && req.data.ID) {
        whereClause = { ID: req.data.ID };
      } else {
        return [];
      }
    }
    
    return await cds.run(SELECT.from(entity).where(whereClause));
  }

  // Helper to prevent duplicate orders
  async function checkDuplicateOrder(req, customer_ID, orderDate, items, orderId = null) {
    if (!customer_ID || !orderDate || !items || items.length === 0) return;
    const dateObj = new Date(orderDate);
    const startOfDay = new Date(dateObj.setHours(0,0,0,0)).toISOString();
    const endOfDay = new Date(dateObj.setHours(23,59,59,999)).toISOString();

    const query = SELECT.from(Orders, o => {
      o.ID, o.items(i => { i.product_ID })
    }).where({
      customer_ID,
      isDeleted: false,
      orderDate: { between: startOfDay, and: endOfDay }
    });

    if (orderId) {
      query.and({ ID: { '!=': orderId } });
    }

    const sameDayOrders = await query;
    const incomingProdIdsStr = items.map(i => i.product_ID).sort().join(',');

    for (const ord of sameDayOrders) {
      if (ord.items && ord.items.length > 0) {
        const existingProdIdsStr = ord.items.map(i => i.product_ID).sort().join(',');
        if (incomingProdIdsStr === existingProdIdsStr) {
          req.error(400, 'Duplicate order detected: An order with the exact same products for this customer already exists today.');
          return;
        }
      }
    }
  }

  // Helper to recalculate order totals
  async function recalculateOrder(orderId) {
    if (!orderId) return;
    const items = await SELECT.from(OrderItems).where({ order_ID: orderId, isDeleted: false });
    const order = await SELECT.one.from(Orders).where({ ID: orderId });
    if (!order) return;

    let subtotal = 0;
    for (const item of items) {
      const qty = parseInt(item.quantity || 0);
      const price = parseFloat(item.unitPrice || 0);
      const disc = parseFloat(item.discount || 0);
      subtotal += qty * price * (1 - disc);
    }

    const sub = parseFloat(subtotal.toFixed(2));
    const tx = parseFloat((sub * 0.10).toFixed(2));
    const freight = parseFloat(order.freight || 0);
    const total = parseFloat((sub + tx + freight).toFixed(2));

    await UPDATE(Orders)
      .set({ subtotal: sub, tax: tx, totalAmount: total })
      .where({ ID: orderId });
  }

  // -----------------------------------------------------------------
  // 1. SOFT DELETE & READ FILTERING
  // -----------------------------------------------------------------
  
  // Intercept reads and automatically filter out soft-deleted items
  this.before('READ', '*', (req) => {
    const entity = req.target;
    if (entity && entity.elements && entity.elements.isDeleted) {
      req.query.where({ isDeleted: false });
    }
  });

  // Helper to extract a safe WHERE clause to prevent full-table operations
  function extractSafeWhereClause(req) {
    let whereClause = null;
    if (req.query) {
      if (req.query.DELETE && req.query.DELETE.where) whereClause = req.query.DELETE.where;
      else if (query.UPDATE && query.UPDATE.where) whereClause = query.UPDATE.where;
      else if (query.SELECT && query.SELECT.where) whereClause = query.SELECT.where;
    }
    
    if (!whereClause || (Array.isArray(whereClause) && whereClause.length === 0) || (!Array.isArray(whereClause) && Object.keys(whereClause).length === 0)) {
      if (req.params && req.params.length > 0 && req.params[0] !== undefined) {
        whereClause = typeof req.params[0] === 'object' ? req.params[0] : { ID: req.params[0] };
      } else if (req.data && req.data.ID) {
        whereClause = { ID: req.data.ID };
      }
    }
    return whereClause;
  }

  // Intercept delete and turn it into an update isDeleted = true
  this.on('DELETE', '*', async (req, next) => {
    const entity = req.target;
    if (entity && entity.elements && entity.elements.isDeleted) {
      const whereClause = extractSafeWhereClause(req);
      if (!whereClause) {
        return req.error(400, 'Delete request must specify a valid ID to prevent mass deletion.');
      }

      const db = await cds.connect.to('db');
      const updateData = { isDeleted: true };
      if (entity.name === 'sap.cap.northwind.Orders') {
        updateData.status = 'DELETED';
      }
      const affectedRows = await db.run(
        UPDATE(entity).set(updateData).where(whereClause)
      );
      return affectedRows;
    }
    return next();
  });

  // Action to restore all dummy data
  this.on('resetDummyData', async () => {
    await UPDATE('sap.cap.northwind.Categories').set({ isDeleted: false });
    await UPDATE('sap.cap.northwind.Products').set({ isDeleted: false });
    await UPDATE('sap.cap.northwind.Customers').set({ isDeleted: false, status: 'active' });
    await UPDATE('sap.cap.northwind.Orders').set({ isDeleted: false, status: 'NEW' });
    await UPDATE('sap.cap.northwind.OrderItems').set({ isDeleted: false });
    return 'All dummy data (Categories, Products, Customers, Orders, OrderItems) have been successfully restored!';
  });

  // -----------------------------------------------------------------
  // 2. PRODUCT VALIDATIONS
  // -----------------------------------------------------------------
  this.before(['CREATE', 'UPDATE'], 'Products', async (req) => {
    const { ID, name, unitPrice, unitsInStock, category_ID } = req.data;

    // Product Name check
    if (name !== undefined) {
      const trimmedName = name.trim();
      req.data.name = trimmedName;

      if (trimmedName.length < 3 || trimmedName.length > 100) {
        req.error(400, 'Product name must be between 3 and 100 characters.', 'name');
      }
      if (/[<>{}]/.test(trimmedName)) {
        req.error(400, 'Product name contains disallowed special characters (< > { }).', 'name');
      }

      // Unique name check
      const existing = await SELECT.one.from(Products)
        .where({ name: trimmedName, isDeleted: false })
        .and(ID ? { ID: { '!=': ID } } : {});
      if (existing) {
        req.error(400, 'Product name must be unique.', 'name');
      }
    } else if (req.event === 'CREATE') {
      req.error(400, 'Product name is mandatory.', 'name');
    }

    // unitPrice validation
    if (unitPrice !== undefined && unitPrice !== null) {
      if (unitPrice <= 0 || unitPrice > 999999) {
        req.error(400, 'Unit Price must be greater than 0 and maximum 999999.', 'unitPrice');
      }
      const priceStr = unitPrice.toString();
      const dotIndex = priceStr.indexOf('.');
      if (dotIndex !== -1 && priceStr.length - dotIndex - 1 > 2) {
        req.error(400, 'Unit Price can only have up to 2 decimal places.', 'unitPrice');
      }
    } else if (req.event === 'CREATE') {
      req.error(400, 'Unit Price is mandatory.', 'unitPrice');
    }

    // unitsInStock validation
    if (unitsInStock !== undefined && unitsInStock !== null) {
      if (unitsInStock < 0 || unitsInStock > 999999) {
        req.error(400, 'Units In Stock cannot be negative and maximum 999999.', 'unitsInStock');
      }
      if (!Number.isInteger(Number(unitsInStock))) {
        req.error(400, 'Units In Stock must be an integer.', 'unitsInStock');
      }
    }

    // Category existence check
    if (category_ID !== undefined && category_ID !== null) {
      const catExists = await SELECT.one.from(Categories).where({ ID: category_ID, isDeleted: false });
      if (!catExists) {
        req.error(400, 'Referenced Category does not exist.', 'category_ID');
      }
    } else if (req.event === 'CREATE') {
      req.error(400, 'Category is mandatory.', 'category_ID');
    }
  });

  // Prevent delete if product is referenced in order items
  this.before('DELETE', 'Products', async (req) => {
    const records = await getAffectedRecords(req);
    for (const record of records) {
      const referenced = await SELECT.one.from(OrderItems).where({ product_ID: record.ID, isDeleted: false });
      if (referenced) {
        req.error(400, `Cannot delete Product '${record.name}' because it is referenced in OrderItems.`);
      }
    }
  });

  // -----------------------------------------------------------------
  // 3. CATEGORY VALIDATIONS
  // -----------------------------------------------------------------
  this.before(['CREATE', 'UPDATE'], 'Categories', async (req) => {
    const { ID, name } = req.data;
    if (name !== undefined) {
      const trimmed = name.trim();
      req.data.name = trimmed;
      if (trimmed.length < 3) {
        req.error(400, 'Category name must be at least 3 characters.', 'name');
      }
      const existing = await SELECT.one.from(Categories)
        .where({ name: trimmed, isDeleted: false })
        .and(ID ? { ID: { '!=': ID } } : {});
      if (existing) {
        req.error(400, 'Category name must be unique.', 'name');
      }
    } else if (req.event === 'CREATE') {
      req.error(400, 'Category name is mandatory.', 'name');
    }
  });

  // Prevent delete of category if products exist
  this.before('DELETE', 'Categories', async (req) => {
    const records = await getAffectedRecords(req);
    for (const record of records) {
      const hasProducts = await SELECT.one.from(Products).where({ category_ID: record.ID, isDeleted: false });
      if (hasProducts) {
        req.error(400, `Cannot delete Category '${record.name}' because it contains active products.`);
      }
    }
  });

  // -----------------------------------------------------------------
  // 4. CUSTOMER VALIDATIONS
  // -----------------------------------------------------------------
  this.before(['CREATE', 'UPDATE'], 'Customers', async (req) => {
    const { ID, companyName, phone, email } = req.data;

    // Company Name check
    if (companyName !== undefined) {
      const trimmed = companyName.trim();
      req.data.companyName = trimmed;
      if (trimmed.length < 3) {
        req.error(400, 'Company Name must be at least 3 characters.', 'companyName');
      }
      if (/^\d+$/.test(trimmed)) {
        req.error(400, 'Company Name cannot be numeric-only.', 'companyName');
      }
    } else if (req.event === 'CREATE') {
      req.error(400, 'Company Name is mandatory.', 'companyName');
    }

    // Email check
    if (email !== undefined) {
      if (!email) {
        req.error(400, 'Email is mandatory.', 'email');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          req.error(400, 'Invalid email format.', 'email');
        }
        const existing = await SELECT.one.from(Customers)
          .where({ email, isDeleted: false })
          .and(ID ? { ID: { '!=': ID } } : {});
        if (existing) {
          req.error(400, 'Email must be unique.', 'email');
        }
      }
    } else if (req.event === 'CREATE') {
      req.error(400, 'Email is mandatory.', 'email');
    }

    // Phone check
    if (phone !== undefined && phone !== null && phone !== '') {
      if (!/^[0-9\s\-+]+$/.test(phone)) {
        req.error(400, 'Phone number must only contain digits, spaces, hyphens, and plus signs.', 'phone');
      }
    }
  });

  // Prevent delete customer if active orders exist
  this.before('DELETE', 'Customers', async (req) => {
    const records = await getAffectedRecords(req);
    for (const record of records) {
      const activeOrders = await SELECT.one.from(Orders)
        .where({ customer_ID: record.ID, isDeleted: false, status: { in: ['NEW', 'PROCESSING'] } });
      if (activeOrders) {
        req.error(400, `Cannot delete Customer '${record.companyName}' because they have active orders.`);
      }
    }
  });

  // -----------------------------------------------------------------
  // 5. ORDERS VALIDATIONS & CALCULATIONS
  // -----------------------------------------------------------------
  this.before('CREATE', 'Orders', async (req) => {
    const { customer_ID, orderDate, items } = req.data;

    // Validate Customer
    if (!customer_ID) {
      req.error(400, 'Customer is mandatory.', 'customer_ID');
    } else {
      const custExists = await SELECT.one.from(Customers).where({ ID: customer_ID, isDeleted: false });
      if (!custExists) {
        req.error(400, 'Referenced Customer does not exist.', 'customer_ID');
      }
    }

    // Validate Order Date
    if (!orderDate) {
      req.data.orderDate = new Date().toISOString();
    } else {
      if (new Date(orderDate) > new Date()) {
        req.error(400, 'Order date cannot be in the future.', 'orderDate');
      }
    }

    // Validate Items count
    if (!items || items.length === 0) {
      req.error(400, 'An order must contain at least one item.', 'items');
      return;
    }

    // Process each item
    let subtotal = 0;
    for (const item of items) {
      if (item.quantity === undefined || item.quantity === null || item.quantity <= 0 || item.quantity > 9999) {
        req.error(400, 'Quantity must be greater than 0 and maximum 9999.', 'items');
        return;
      }
      if (!item.product_ID) {
        req.error(400, 'Product is mandatory for each order item.', 'items');
        return;
      }
      const prod = await SELECT.one.from(Products).where({ ID: item.product_ID, isDeleted: false });
      if (!prod) {
        req.error(400, 'Referenced Product does not exist.', 'items');
        return;
      }

      // Snapshot product unit price
      if (item.unitPrice === undefined || item.unitPrice === null) {
        item.unitPrice = prod.unitPrice;
      }

      // Stock validation
      if (item.quantity > prod.unitsInStock) {
        req.error(400, `Insufficient stock for product '${prod.name}'. Ordered: ${item.quantity}, Available: ${prod.unitsInStock}`, 'items');
        return;
      }

      // Discount check
      if (item.discount === undefined) {
        item.discount = 0;
      } else if (item.discount < 0 || item.discount > 0.50) {
        req.error(400, 'Discount must be between 0 and 0.50 (max 50% discount).', 'items');
        return;
      }

      // Deduct stock
      await UPDATE(Products)
        .set({ unitsInStock: prod.unitsInStock - item.quantity })
        .where({ ID: item.product_ID });

      subtotal += item.quantity * item.unitPrice * (1 - item.discount);
    }

    // Calculations
    req.data.subtotal = parseFloat(subtotal.toFixed(2));
    req.data.tax = parseFloat((subtotal * 0.10).toFixed(2));
    const freight = parseFloat(req.data.freight) || 0;
    req.data.totalAmount = parseFloat((req.data.subtotal + req.data.tax + freight).toFixed(2));

    if (req.data.totalAmount > 999999) {
      req.error(400, 'Total amount cannot exceed 999999.', 'totalAmount');
    }

    // Check duplicate
    await checkDuplicateOrder(req, customer_ID, req.data.orderDate, items);
  });

  this.before('UPDATE', 'Orders', async (req) => {
    const records = await getAffectedRecords(req);
    const incoming = req.data;

    for (const beforeUpdate of records) {
      // Completed/Cancelled/Deleted cannot be edited
      if (beforeUpdate.status === 'COMPLETED' || beforeUpdate.status === 'CANCELLED' || beforeUpdate.status === 'DELETED') {
        req.error(400, `Cannot edit order because it is already ${beforeUpdate.status}.`);
        return;
      }

      // Status transition validation
      if (incoming.status && incoming.status !== beforeUpdate.status) {
        if (incoming.status === 'DELETED' && !incoming.isDeleted) {
          req.error(400, 'To delete an order, please use the HTTP DELETE method instead of updating the status manually.');
          return;
        }

        const allowed = {
          'NEW': ['PROCESSING', 'DELETED'],
          'PROCESSING': ['COMPLETED', 'CANCELLED', 'DELETED'],
          'COMPLETED': [],
          'CANCELLED': [],
          'DELETED': []
        };
        if (!allowed[beforeUpdate.status]?.includes(incoming.status)) {
          req.error(400, `Status transition from ${beforeUpdate.status} to ${incoming.status} is not allowed.`);
          return;
        }
      }

      // If items lists is updated, manage stock deduction & totals recalculation
      if (incoming.items) {
        // Restore old items stock first
        const oldItems = await SELECT.from(OrderItems).where({ order_ID: beforeUpdate.ID, isDeleted: false });
        for (const oldItem of oldItems) {
          const prod = await SELECT.one.from(Products).where({ ID: oldItem.product_ID });
          if (prod) {
            await UPDATE(Products).set({ unitsInStock: prod.unitsInStock + oldItem.quantity }).where({ ID: oldItem.product_ID });
          }
        }

        // Deduct new items stock & validate
        let subtotal = 0;
        for (const item of incoming.items) {
          if (item.quantity === undefined || item.quantity === null || item.quantity <= 0 || item.quantity > 9999) {
            req.error(400, 'Quantity must be greater than 0 and maximum 9999.', 'items');
            return;
          }
          if (!item.product_ID) {
            req.error(400, 'Product is mandatory for each order item.', 'items');
            return;
          }
          const prod = await SELECT.one.from(Products).where({ ID: item.product_ID, isDeleted: false });
          if (!prod) {
            req.error(400, 'Referenced Product does not exist.', 'items');
            return;
          }

          if (item.unitPrice === undefined || item.unitPrice === null) {
            item.unitPrice = prod.unitPrice;
          }

          if (item.quantity > prod.unitsInStock) {
            req.error(400, `Insufficient stock for product '${prod.name}'. Ordered: ${item.quantity}, Available: ${prod.unitsInStock}`, 'items');
            return;
          }

          if (item.discount === undefined) {
            item.discount = 0;
          } else if (item.discount < 0 || item.discount > 0.50) {
            req.error(400, 'Discount must be between 0 and 0.50 (max 50% discount).', 'items');
            return;
          }

          // Deduct
          await UPDATE(Products)
            .set({ unitsInStock: prod.unitsInStock - item.quantity })
            .where({ ID: item.product_ID });

          subtotal += item.quantity * item.unitPrice * (1 - item.discount);
        }

        incoming.subtotal = parseFloat(subtotal.toFixed(2));
        incoming.tax = parseFloat((subtotal * 0.10).toFixed(2));
        const freight = parseFloat(incoming.freight !== undefined ? incoming.freight : beforeUpdate.freight) || 0;
        incoming.totalAmount = parseFloat((incoming.subtotal + incoming.tax + freight).toFixed(2));

        if (incoming.totalAmount > 999999) {
          req.error(400, 'Total amount cannot exceed 999999.', 'totalAmount');
          return;
        }

        // Check duplicate
        await checkDuplicateOrder(req, incoming.customer_ID || beforeUpdate.customer_ID, incoming.orderDate || beforeUpdate.orderDate, incoming.items, beforeUpdate.ID);
      } else {
        // If freight is updated without items
        if (incoming.freight !== undefined) {
          const sub = parseFloat(beforeUpdate.subtotal) || 0;
          const tx = parseFloat(beforeUpdate.tax) || 0;
          const fr = parseFloat(incoming.freight) || 0;
          incoming.totalAmount = parseFloat((sub + tx + fr).toFixed(2));
        }
      }
    }
  });

  // Restore stock when deleting orders, prevent delete if not NEW or PROCESSING
  this.before('DELETE', 'Orders', async (req) => {
    const records = await getAffectedRecords(req);
    for (const record of records) {
      if (record.status !== 'NEW' && record.status !== 'PROCESSING') {
        req.error(400, `Cannot delete Order '${record.orderNumber}' because its status is ${record.status}. Only NEW and PROCESSING orders can be deleted.`);
        return;
      }

      // Restore stock
      const oldItems = await SELECT.from(OrderItems).where({ order_ID: record.ID, isDeleted: false });
      for (const item of oldItems) {
        const prod = await SELECT.one.from(Products).where({ ID: item.product_ID });
        if (prod) {
          await UPDATE(Products)
            .set({ unitsInStock: prod.unitsInStock + item.quantity })
            .where({ ID: item.product_ID });
        }
      }

      // Cascade soft-delete to OrderItems
      await UPDATE(OrderItems).set({ isDeleted: true }).where({ order_ID: record.ID });
    }
  });

  // -----------------------------------------------------------------
  // 6. ORDERITEMS DIRECT VALIDATIONS & OPERATIONS
  // -----------------------------------------------------------------
  // Snapshot price, validate quantity and stock
  this.before(['CREATE', 'UPDATE'], 'OrderItems', async (req) => {
    const { ID, product_ID, quantity, discount, unitPrice } = req.data;
    
    let original = null;
    if (ID) {
      original = await SELECT.one.from(OrderItems).where({ ID });
    }

    const prodId = product_ID || original?.product_ID;
    const qty = quantity !== undefined ? parseInt(quantity) : (original ? parseInt(original.quantity) : 0);
    const disc = discount !== undefined ? parseFloat(discount) : (original ? parseFloat(original.discount) : 0);

    if (req.event === 'CREATE' && !prodId) {
      req.error(400, 'Product is mandatory for each order item.', 'product_ID');
      return;
    }

    let prod = null;
    if (prodId) {
      prod = await SELECT.one.from(Products).where({ ID: prodId, isDeleted: false });
      if (!prod) {
        req.error(400, 'Referenced Product does not exist.', 'product_ID');
        return;
      }
    }

    // Snapshot price
    if (req.event === 'CREATE' && (unitPrice === undefined || unitPrice === null) && prod) {
      req.data.unitPrice = prod.unitPrice;
    }

    // Quantity limit
    if (quantity !== undefined) {
      if (qty <= 0 || qty > 9999) {
        req.error(400, 'Quantity must be greater than 0 and maximum 9999.', 'quantity');
        return;
      }
    }

    // Discount limit
    if (discount !== undefined) {
      if (disc < 0 || disc > 0.50) {
        req.error(400, 'Discount must be between 0 and 0.50 (max 50% discount).', 'discount');
        return;
      }
    }

    // Stock check & deduction
    if (prod) {
      const oldQty = original ? parseInt(original.quantity) : 0;
      const diff = qty - oldQty;
      if (diff > 0) {
        if (diff > prod.unitsInStock) {
          req.error(400, `Insufficient stock for product '${prod.name}'. Ordered extra: ${diff}, Available: ${prod.unitsInStock}`, 'quantity');
          return;
        }
        await UPDATE(Products).set({ unitsInStock: prod.unitsInStock - diff }).where({ ID: prodId });
      } else if (diff < 0) {
        await UPDATE(Products).set({ unitsInStock: prod.unitsInStock - diff }).where({ ID: prodId });
      }
    }
  });

  // Restore stock when deleting OrderItems
  this.before('DELETE', 'OrderItems', async (req) => {
    const records = await getAffectedRecords(req);
    for (const record of records) {
      if (record.product_ID && record.quantity) {
        const prod = await SELECT.one.from(Products).where({ ID: record.product_ID });
        if (prod) {
          await UPDATE(Products)
            .set({ unitsInStock: prod.unitsInStock + parseInt(record.quantity) })
            .where({ ID: record.product_ID });
        }
      }
    }
  });

  // Recalculate parent order totals
  this.after(['CREATE', 'UPDATE', 'DELETE'], 'OrderItems', async (data, req) => {
    let orderId = req.data?.order_ID;
    if (!orderId) {
      const itemId = req.data?.ID || req.params[0]?.ID || req.params[0];
      if (itemId) {
        const item = await SELECT.one.from(OrderItems).where({ ID: itemId });
        if (item) orderId = item.order_ID;
      }
    }
    if (orderId) {
      await recalculateOrder(orderId);
    }
  });

  // -----------------------------------------------------------------
  // 7. AUDIT LOGGING
  // -----------------------------------------------------------------
  this.after(['CREATE', 'UPDATE', 'DELETE'], '*', async (data, req) => {
    const { event, user } = req;
    const timestamp = new Date().toISOString();
    const userId = user.id || 'anonymous';
    const targetName = req.entity || req.target?.name || '';

    if (targetName && targetName.includes('.drafts')) return;

    let targetId = 'n/a';
    if (req.data && req.data.ID) {
      targetId = req.data.ID;
    } else {
      const whereClause = req.query.DELETE?.where || req.query.UPDATE?.where || {};
      targetId = JSON.stringify(whereClause);
    }

    console.log(`[AUDIT LOG] [${timestamp}] User: ${userId} | Event: ${event} | Entity: ${targetName} | Target ID: ${targetId}`);
  });
});
