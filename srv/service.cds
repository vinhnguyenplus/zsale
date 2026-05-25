using { sap.cap.northwind as my } from '../db/schema';

service NorthwindService {
  entity Products as projection on my.Products {
    *,
    case
      when unitsInStock <= reorderLevel then 1
      when unitsInStock > reorderLevel and unitsInStock < (reorderLevel + 10) then 2
      else 3
    end as criticality : Integer
  };

  entity Categories as projection on my.Categories;
  entity Customers as projection on my.Customers;

  entity Orders as projection on my.Orders;

  entity OrderItems as projection on my.OrderItems;
}

// Optimistic Locking support
annotate NorthwindService.Products with { modifiedAt @odata.etag };
annotate NorthwindService.Categories with { modifiedAt @odata.etag };
annotate NorthwindService.Customers with { modifiedAt @odata.etag };
annotate NorthwindService.Orders with { modifiedAt @odata.etag };
annotate NorthwindService.OrderItems with { modifiedAt @odata.etag };
