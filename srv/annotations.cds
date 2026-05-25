using NorthwindService from './service';

// ---------------------------------------------------------
// CATEGORIES ANNOTATIONS
// ---------------------------------------------------------
annotate NorthwindService.Categories with @(
  UI.HeaderInfo: {
    TypeName: 'Category',
    TypeNamePlural: 'Categories',
    Title: { Value: name },
    Description: { Value: description }
  },
  UI.LineItem: [
    { Value: name, Label: 'Category Name' },
    { Value: description, Label: 'Description' }
  ],
  UI.SelectionFields: [ name ],
  UI.Facets: [
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Category Details',
      Target: '@UI.FieldGroup#Details'
    },
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Products in Category',
      Target: 'products/@UI.LineItem'
    }
  ],
  UI.FieldGroup #Details: {
    Data: [
      { Value: name },
      { Value: description }
    ]
  }
);


// ---------------------------------------------------------
// PRODUCTS ANNOTATIONS
// ---------------------------------------------------------
annotate NorthwindService.Products with @(
  UI.HeaderInfo: {
    TypeName: 'Product',
    TypeNamePlural: 'Products',
    Title: { Value: name },
    Description: { Value: category.name }
  },
  UI.SelectionFields: [ category_ID, name, discontinued ],
  UI.LineItem: [
    { Value: name, Label: 'Product Name' },
    { Value: category_ID, Label: 'Category' },
    { Value: unitPrice, Label: 'Unit Price' },
    {
      Value: unitsInStock,
      Label: 'Units In Stock',
      Criticality: criticality
    },
    { Value: unitsOnOrder, Label: 'Units On Order' },
    { Value: reorderLevel, Label: 'Reorder Level' },
    { Value: discontinued, Label: 'Discontinued' }
  ],
  UI.Facets: [
    {
      $Type: 'UI.CollectionFacet',
      Label: 'Product Information',
      ID: 'ProductGeneralInfo',
      Facets: [
        {
          $Type: 'UI.ReferenceFacet',
          Label: 'General Details',
          Target: '@UI.FieldGroup#General'
        },
        {
          $Type: 'UI.ReferenceFacet',
          Label: 'Inventory details',
          Target: '@UI.FieldGroup#Stock'
        }
      ]
    }
  ],
  UI.FieldGroup #General: {
    Data: [
      { Value: name },
      { Value: category_ID },
      { Value: unitPrice },
      { Value: discontinued }
    ]
  },
  UI.FieldGroup #Stock: {
    Data: [
      { Value: unitsInStock },
      { Value: unitsOnOrder },
      { Value: reorderLevel }
    ]
  }
);

// Add virtual criticality field/calculation logic to service or handle it via UI annotations.
// Since CAP supports calculated fields, we can add a criticality field in CDS or service.
// Let's define the criticality field in service.cds or handle it.
// To keep it simple, we can add a virtual field to Products in schema.cds or srv/service.cds.
// Let's add it to srv/service.cds:
// entity Products as select from my.Products { *, case when unitsInStock <= reorderLevel then 1 when unitsInStock > reorderLevel and unitsInStock < 100 then 2 else 3 end as criticality : Integer }
// Let's update the annotations to reflect this.

// Text arrangements and Value Help for Products
annotate NorthwindService.Products with {
  category @(
    Common.Text: category.name,
    Common.TextArrangement: #TextFirst,
    Common.ValueList: {
      $Type: 'Common.ValueListType',
      CollectionPath: 'Categories',
      Parameters: [
        {
          $Type: 'Common.ValueListParameterInOut',
          LocalDataProperty: category_ID,
          ValueListProperty: 'ID'
        },
        {
          $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name'
        }
      ]
    }
  );
}


// ---------------------------------------------------------
// CUSTOMERS ANNOTATIONS
// ---------------------------------------------------------
annotate NorthwindService.Customers with @(
  UI.HeaderInfo: {
    TypeName: 'Customer',
    TypeNamePlural: 'Customers',
    Title: { Value: companyName },
    Description: { Value: contactName }
  },
  UI.LineItem: [
    { Value: companyName, Label: 'Company Name' },
    { Value: contactName, Label: 'Contact Name' },
    { Value: email, Label: 'Email' },
    { Value: status, Label: 'Status' },
    { Value: phone, Label: 'Phone' },
    { Value: city, Label: 'City' },
    { Value: country, Label: 'Country' }
  ],
  UI.SelectionFields: [ companyName, country, city, status ],
  UI.Facets: [
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Contact Information',
      Target: '@UI.FieldGroup#Contact'
    },
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Address Details',
      Target: '@UI.FieldGroup#Address'
    }
  ],
  UI.FieldGroup #Contact: {
    Data: [
      { Value: contactName },
      { Value: contactTitle },
      { Value: phone },
      { Value: email },
      { Value: status }
    ]
  },
  UI.FieldGroup #Address: {
    Data: [
      { Value: companyName },
      { Value: address },
      { Value: city },
      { Value: postalCode },
      { Value: country }
    ]
  }
);


// ---------------------------------------------------------
// ORDERS ANNOTATIONS
// ---------------------------------------------------------
annotate NorthwindService.Orders with @(
  UI.HeaderInfo: {
    TypeName: 'Order',
    TypeNamePlural: 'Orders',
    Title: { Value: shipName },
    Description: { Value: orderDate }
  },
  UI.SelectionFields: [ customer_ID, orderDate, shipCountry, status ],
  UI.LineItem: [
    { Value: customer_ID, Label: 'Customer' },
    { Value: orderDate, Label: 'Order Date' },
    { Value: status, Label: 'Status' },
    { Value: totalAmount, Label: 'Total Amount' },
    { Value: shippedDate, Label: 'Shipped Date' },
    { Value: freight, Label: 'Freight Charge' },
    { Value: shipName, Label: 'Ship Name' }
  ],
  UI.Facets: [
    {
      $Type: 'UI.CollectionFacet',
      Label: 'Order Details',
      ID: 'OrderDetailsCollection',
      Facets: [
        {
          $Type: 'UI.ReferenceFacet',
          Label: 'Order Information',
          Target: '@UI.FieldGroup#OrderGeneral'
        },
        {
          $Type: 'UI.ReferenceFacet',
          Label: 'Shipping Address',
          Target: '@UI.FieldGroup#OrderShipping'
        }
      ]
    },
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Order Line Items',
      Target: 'items/@UI.LineItem'
    }
  ],
  UI.FieldGroup #OrderGeneral: {
    Data: [
      { Value: customer_ID },
      { Value: orderDate },
      { Value: status },
      { Value: subtotal },
      { Value: tax },
      { Value: freight },
      { Value: totalAmount }
    ]
  },
  UI.FieldGroup #OrderShipping: {
    Data: [
      { Value: shipName },
      { Value: shipAddress },
      { Value: shipCity },
      { Value: shipCountry }
    ]
  }
);

annotate NorthwindService.Orders with {
  customer @(
    Common.Text: customer.companyName,
    Common.TextArrangement: #TextFirst,
    Common.ValueList: {
      $Type: 'Common.ValueListType',
      CollectionPath: 'Customers',
      Parameters: [
        {
          $Type: 'Common.ValueListParameterInOut',
          LocalDataProperty: customer_ID,
          ValueListProperty: 'ID'
        },
        {
          $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'companyName'
        }
      ]
    }
  );
}


// ---------------------------------------------------------
// ORDER ITEMS ANNOTATIONS
// ---------------------------------------------------------
annotate NorthwindService.OrderItems with @(
  UI.HeaderInfo: {
    TypeName: 'Item',
    TypeNamePlural: 'Items',
    Title: { Value: product.name }
  },
  UI.LineItem: [
    { Value: product_ID, Label: 'Product' },
    { Value: quantity, Label: 'Quantity' },
    { Value: unitPrice, Label: 'Unit Price' },
    { Value: discount, Label: 'Discount' }
  ]
);

annotate NorthwindService.OrderItems with {
  product @(
    Common.Text: product.name,
    Common.TextArrangement: #TextFirst,
    Common.ValueList: {
      $Type: 'Common.ValueListType',
      CollectionPath: 'Products',
      Parameters: [
        {
          $Type: 'Common.ValueListParameterInOut',
          LocalDataProperty: product_ID,
          ValueListProperty: 'ID'
        },
        {
          $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name'
        },
        {
          $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'unitPrice'
        }
      ]
    }
  );
}
