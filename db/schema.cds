namespace sap.cap.northwind;

using { managed } from '@sap/cds/common';

entity Categories : managed {
  key ID : UUID;
  name : String(100) @title: 'Category Name';
  description : String(500) @title: 'Description';
  isDeleted : Boolean default false @title: 'Is Deleted';
  products : Association to many Products on products.category = $self;
}

entity Products : managed {
  key ID : UUID;
  productNumber : Integer @title: 'Product ID';
  name : String(100) @title: 'Product Name';
  unitPrice : Decimal(10,2) @title: 'Unit Price';
  unitsInStock : Integer @title: 'Units In Stock';
  unitsOnOrder : Integer @title: 'Units On Order';
  reorderLevel : Integer @title: 'Reorder Level';
  discontinued : Boolean @title: 'Discontinued';
  isDeleted : Boolean default false @title: 'Is Deleted';
  category : Association to Categories @title: 'Category';
  orderItems : Association to many OrderItems on orderItems.product = $self;
}

entity Customers : managed {
  key ID : UUID;
  customerID : String(5) @title: 'Customer ID';
  companyName : String(100) @title: 'Company Name';
  contactName : String(100) @title: 'Contact Name';
  contactTitle : String(50) @title: 'Contact Title';
  address : String(200) @title: 'Address';
  city : String(100) @title: 'City';
  postalCode : String(20) @title: 'Postal Code';
  country : String(100) @title: 'Country';
  phone : String(50) @title: 'Phone';
  email : String(100) @title: 'Email';
  status : String(20) default 'active' @title: 'Status';
  isDeleted : Boolean default false @title: 'Is Deleted';
  orders : Association to many Orders on orders.customer = $self;
}

entity Orders : managed {
  key ID : UUID;
  orderNumber : Integer @title: 'Order ID';
  orderDate : DateTime @title: 'Order Date';
  requiredDate : DateTime @title: 'Required Date';
  shippedDate : DateTime @title: 'Shipped Date';
  freight : Decimal(10,2) default 0 @title: 'Freight';
  employeeName : String(100) @title: 'Employee Name';
  shipName : String(100) @title: 'Ship Name';
  shipAddress : String(200) @title: 'Ship Address';
  shipCity : String(100) @title: 'Ship City';
  shipCountry : String(100) @title: 'Ship Country';
  status : String(20) default 'NEW' @title: 'Status';
  subtotal : Decimal(12,2) default 0 @title: 'Subtotal';
  tax : Decimal(12,2) default 0 @title: 'Tax';
  totalAmount : Decimal(12,2) default 0 @title: 'Total Amount';
  isDeleted : Boolean default false @title: 'Is Deleted';
  customer : Association to Customers @title: 'Customer';
  items : Composition of many OrderItems on items.order = $self;
}

entity OrderItems : managed {
  key ID : UUID;
  isDeleted : Boolean default false @title: 'Is Deleted';
  order : Association to Orders @title: 'Order';
  product : Association to Products @title: 'Product';
  quantity : Integer @title: 'Quantity';
  unitPrice : Decimal(10,2) @title: 'Unit Price';
  discount : Decimal(5,2) default 0 @title: 'Discount';
}

// Performance Indexes for Database optimization
annotate Categories with {
  name @index;
};

annotate Products with {
  name @index;
  unitPrice @index;
};

annotate Customers with {
  companyName @index;
  country @index;
  city @index;
};

annotate Orders with {
  orderDate @index;
};
