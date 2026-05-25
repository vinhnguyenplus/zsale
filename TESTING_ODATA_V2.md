# Hướng dẫn Kiểm thử OData V2 (CRUD & Validation) - Northwind Ecosystem

Tài liệu này hướng dẫn cách gửi các yêu cầu HTTP (dùng REST Client trong VS Code hoặc Postman) để kiểm thử đầy đủ các quy tắc nghiệp vụ (Business Rules), kiểm tra dữ liệu (Validation) và Xóa mềm (Soft Delete) trên cả hai môi trường:
* **Local Development**: `http://localhost:4004/v2/odata/v2/northwind`
* **Production BTP**: `https://733d95cctrial-dev-zsale-srv.cfapps.ap21.hana.ondemand.com/v2/odata/v2/northwind`

---

## 1. Kiểm thử Sản phẩm (Products)

### 1.1. Lấy danh sách sản phẩm (READ)
```http
GET http://localhost:4004/v2/odata/v2/northwind/Products?$top=5
Accept: application/json
```

### 1.2. Tạo sản phẩm hợp lệ (CREATE - Hợp lệ)
```http
POST http://localhost:4004/v2/odata/v2/northwind/Products
Content-Type: application/json
Accept: application/json

{
  "name": "Tra Xanh Thai Nguyen Premium",
  "unitPrice": 12.50,
  "unitsInStock": 150,
  "unitsOnOrder": 0,
  "reorderLevel": 10,
  "discontinued": false,
  "category_ID": "b0e41300-84a5-48ef-82eb-05886981cfc9" 
}
```
*(Thay thế `category_ID` bằng ID thực tế lấy từ Categories)*

### 1.3. Thử tạo sản phẩm lỗi (Name Validation)
Tên sản phẩm dưới 3 kí tự hoặc chứa ký tự đặc biệt `< > { }` hoặc bị trùng tên:
```http
POST http://localhost:4004/v2/odata/v2/northwind/Products
Content-Type: application/json

{
  "name": "Tr<>",
  "unitPrice": 12.50,
  "unitsInStock": 150,
  "category_ID": "b0e41300-84a5-48ef-82eb-05886981cfc9"
}
```

### 1.4. Thử tạo sản phẩm lỗi (Price/Stock Validation)
Đơn giá <= 0 hoặc có 3 chữ số thập phân hoặc số lượng tồn kho âm:
```http
POST http://localhost:4004/v2/odata/v2/northwind/Products
Content-Type: application/json

{
  "name": "Ca Phe Sua Da",
  "unitPrice": -5.50,
  "unitsInStock": -10,
  "category_ID": "b0e41300-84a5-48ef-82eb-05886981cfc9"
}
```

### 1.5. Xóa sản phẩm (DELETE)
* Nếu sản phẩm đã được sử dụng trong đơn hàng (`OrderItems`), server sẽ chặn và báo lỗi 400.
* Nếu sản phẩm chưa có trong đơn hàng nào, hệ thống thực hiện **Xóa mềm** (trường `isDeleted` cập nhật thành `true` nhưng bản ghi không bị xóa vật lý).
```http
DELETE http://localhost:4004/v2/odata/v2/northwind/Products(guid'YOUR-PRODUCT-UUID')
```

---

## 2. Kiểm thử Khách hàng (Customers)

### 2.1. Tạo Khách hàng hợp lệ (CREATE - Hợp lệ)
```http
POST http://localhost:4004/v2/odata/v2/northwind/Customers
Content-Type: application/json

{
  "customerID": "VNGUY",
  "companyName": "Vinh Nguyen Plus",
  "contactName": "Vinh Nguyen",
  "contactTitle": "CEO",
  "address": "123 Le Loi",
  "city": "Ho Chi Minh",
  "country": "Vietnam",
  "phone": "+84 901234567",
  "email": "vinh.nguyen@example.com"
}
```

### 2.2. Kiểm thử Email Validation
Thử tạo khách hàng trùng email đã tồn tại hoặc email sai định dạng:
```http
POST http://localhost:4004/v2/odata/v2/northwind/Customers
Content-Type: application/json

{
  "customerID": "LADUP",
  "companyName": "Duplicate Email Corp",
  "email": "invalid-email-format"
}
```

### 2.3. Kiểm thử Phone Validation
Số điện thoại chứa chữ cái (chỉ chấp nhận số, khoảng trắng, `-`, `+` và `()`):
```http
POST http://localhost:4004/v2/odata/v2/northwind/Customers
Content-Type: application/json

{
  "customerID": "LAPHN",
  "companyName": "Invalid Phone Corp",
  "email": "phone.test@example.com",
  "phone": "090-PHONE-NUM"
}
```

### 2.4. Kiểm thử Chặn xóa khách hàng có Đơn hàng đang hoạt động (DELETE)
Thử xóa khách hàng đang có đơn hàng ở trạng thái `NEW` hoặc `PROCESSING`:
```http
DELETE http://localhost:4004/v2/odata/v2/northwind/Customers(guid'CUSTOMER-UUID-WITH-ACTIVE-ORDERS')
```

---

## 3. Kiểm thử Đơn hàng & Tính toán tài chính (Orders & Calculations)

### 3.1. Tạo Đơn hàng mới (Deep Insert - CREATE)
Bao gồm tính năng tự động snapshot đơn giá, khấu trừ số lượng tồn kho của sản phẩm, tự động tính toán `subtotal`, `tax` (10%), và `totalAmount`.
```http
POST http://localhost:4004/v2/odata/v2/northwind/Orders
Content-Type: application/json

{
  "employeeName": "Nancy Davolio",
  "shipName": "Vinh Nguyen Plus",
  "shipAddress": "123 Le Loi",
  "shipCity": "Ho Chi Minh",
  "shipCountry": "Vietnam",
  "freight": 15.00,
  "customer_ID": "6fcf551e-e818-472e-8be6-a19f20e4a7b5",
  "items": [
    {
      "product_ID": "8ca0cf00-b3e1-4c12-881c-cb8d13264ba2",
      "quantity": 5,
      "discount": 0.10
    },
    {
      "product_ID": "9da0cf00-b3e1-4c12-881c-cb8d13264ba3",
      "quantity": 2,
      "discount": 0.00
    }
  ]
}
```

### 3.2. Kiểm thử Chặn Trùng đơn hàng (Prevent duplicate orders)
Gửi lại request phía trên một lần nữa trong cùng ngày cho cùng một khách hàng và cùng các sản phẩm. Server sẽ lập tức trả về lỗi:
`400 Bad Request: Duplicate order detected...`

### 3.3. Kiểm thử Chặn Vượt mức tồn kho (Stock Validation)
Thử đặt mua số lượng vượt quá `unitsInStock` hiện tại của sản phẩm:
```http
POST http://localhost:4004/v2/odata/v2/northwind/Orders
Content-Type: application/json

{
  "customer_ID": "6fcf551e-e818-472e-8be6-a19f20e4a7b5",
  "items": [
    {
      "product_ID": "8ca0cf00-b3e1-4c12-881c-cb8d13264ba2",
      "quantity": 999999
    }
  ]
}
```

### 3.4. Kiểm thử Chuyển đổi Trạng thái Đơn hàng (Status Transitions)
* Cho phép chuyển đổi hợp lệ: `NEW` -> `PROCESSING` -> `COMPLETED` hoặc `CANCELLED`.
* Chặn chuyển đổi sai quy trình: ví dụ chuyển trực tiếp từ `NEW` sang `COMPLETED` không qua `PROCESSING`.
```http
MERGE http://localhost:4004/v2/odata/v2/northwind/Orders(guid'ORDER-UUID')
Content-Type: application/json

{
  "status": "COMPLETED"
}
```
*(Kiểm tra log phản hồi để xem thông báo chặn lỗi chuyển đổi trạng thái)*

### 3.5. Kiểm thử Chặn sửa đổi/Xóa đơn hàng đã COMPLETED
* Không cho phép chỉnh sửa bất kỳ trường nào của đơn hàng đã COMPLETED hoặc CANCELLED.
* Chặn xóa đơn hàng đã COMPLETED:
```http
DELETE http://localhost:4004/v2/odata/v2/northwind/Orders(guid'COMPLETED-ORDER-UUID')
```

---

## 4. Kiểm thử Mặt hàng đơn lẻ (OrderItems Direct CRUD)

### 4.1. Thêm mặt hàng trực tiếp (CREATE)
Tự động trừ tồn kho sản phẩm tương ứng và tính toán lại các chỉ số tài chính (`subtotal`, `tax`, `totalAmount`) của đơn hàng cha:
```http
POST http://localhost:4004/v2/odata/v2/northwind/OrderItems
Content-Type: application/json

{
  "order_ID": "ORDER-UUID",
  "product_ID": "PRODUCT-UUID",
  "quantity": 3,
  "discount": 0.05
}
```

### 4.2. Cập nhật số lượng mặt hàng (UPDATE)
Tự động tính độ chênh lệch số lượng để cập nhật kho của sản phẩm và tính lại tiền đơn hàng cha:
```http
MERGE http://localhost:4004/v2/odata/v2/northwind/OrderItems(guid'ORDER-ITEM-UUID')
Content-Type: application/json

{
  "quantity": 10
}
```

### 4.3. Xóa mặt hàng trực tiếp (DELETE)
Tự động hoàn lại số lượng tồn kho sản phẩm và tính toán lại tổng tiền của đơn hàng cha:
```http
DELETE http://localhost:4004/v2/odata/v2/northwind/OrderItems(guid'ORDER-ITEM-UUID')
```

---

## 5. Xem log Kiểm toán (Audit Logs)
Mỗi khi thực hiện bất kỳ thao tác CREATE, UPDATE, DELETE thành công nào, kiểm tra terminal hoặc logs của Cloud Foundry (`cf logs zsale-srv --recent`), bạn sẽ thấy các dòng log được định dạng như sau:
```text
[AUDIT LOG] [2026-05-25T01:15:39.123Z] User: anonymous | Event: CREATE | Entity: sap.cap.northwind.Orders | Target ID: 6fcf551e-e818-472e-8be6-a19f20e4a7b5
```
