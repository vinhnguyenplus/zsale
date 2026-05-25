const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function uuid() {
  return crypto.randomUUID();
}

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  let str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }
  return str;
}

// Data components for generation
const categoryPrefixes = ['Premium', 'Organic', 'Gourmet', 'Fresh', 'Selected', 'Signature', 'Artisanal', 'Local', 'Imported', 'Specialty', 'Deluxe', 'Traditional', 'Vintage', 'Eco-Friendly', 'Diet', 'Gluten-Free'];
const categorySuffixes = ['Beverages', 'Condiments', 'Confections', 'Dairy', 'Grains', 'Meats', 'Produce', 'Seafood', 'Snacks', 'Breads', 'Desserts', 'Sauces', 'Beverages', 'Spices', 'Oils', 'Extracts'];

const productPrefixes = ['Uncle Bob\'s', 'Grandma\'s', 'Chef Anton\'s', 'Northwoods', 'Tokyo', 'Cooper\'s', 'Boston', 'Louisiana', 'Outback', 'Singapore', 'Rhönbräu', 'Lakkalikööri', 'Perth', 'New England', 'Scottish', 'Hanoi', 'Mishi', 'Kobe', 'Alice', 'Giovanni', 'Wimmers', 'Laughing Lumberjack'];
const productBases = ['Chai', 'Syrup', 'Cajun Seasoning', 'Gumbo Mix', 'Boysenberry Spread', 'Dried Pears', 'Cranberry Sauce', 'Mishi Kobe Niku', 'Ikura', 'Queso Cabrales', 'Tofu', 'Pavlova', 'Alice Mutton', 'Carnarvon Tigers', 'Chocolate Biscuits', 'Marmalade', 'Scones', 'Knäckebröd', 'Tunnbröd', 'Guaraná', 'Gorgonzola', 'Mascarpone', 'Geitost', 'Sasquatch Ale', 'Steeleye Stout', 'Inlagd Sill', 'Gravad Lax', 'Côte de Blaye', 'Chartreuse', 'Crab Meat', 'Clam Chowder', 'Hokkien Fried Mee', 'Ipoh Coffee', 'Gula Malacca', 'Spegesild', 'Zaanse koeken', 'Chocolade', 'Valkoinen suklaa', 'Dried Apples', 'Filo Mix', 'Pasties', 'Tourtière', 'Pâté', 'Gnocchi', 'Ravioli', 'Escargots', 'Raclette', 'Camembert', 'Sirop', 'Tarte', 'Vegie-spread', 'Semmelknödel', 'Hot Pepper Sauce', 'Hot Spiced Okra', 'Lager', 'Longbreads', 'Gudbrandsdalsost', 'Flotemysost', 'Mozzarella', 'Kaviar', 'Klosterbier', 'Original Frankfurter'];

const companyPrefixes = ['Global', 'Apex', 'Matrix', 'Summit', 'Vortex', 'Zenith', 'Nova', 'Infinity', 'Quantum', 'Omni', 'Dynamic', 'Prime', 'Alpha', 'Beta', 'Delta', 'Sigma', 'Falcon', 'Titan', 'Aero', 'Horizon'];
const companyMiddles = ['Trading', 'Logistics', 'Industries', 'Solutions', 'Foods', 'Group', 'Enterprises', 'Partners', 'Ventures', 'Holdings', 'Systems', 'Technologies', 'Manufacturing', 'Supply', 'Distribution', 'Services'];
const companySuffixes = ['LLC', 'Inc.', 'Corp', 'Ltd', 'GmbH', 'Co.', 'S.A.', 'Partnership'];

const contactFirstNames = ['John', 'Jane', 'Michael', 'Emily', 'William', 'Olivia', 'James', 'Sophia', 'Robert', 'Isabella', 'David', 'Mia', 'Richard', 'Charlotte', 'Joseph', 'Amelia', 'Thomas', 'Evelyn', 'Charles', 'Abigail'];
const contactLastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const contactTitles = ['Owner', 'Sales Representative', 'Purchasing Manager', 'Marketing Manager', 'Order Administrator', 'Accounting Manager', 'Finance Director', 'Purchasing Agent', 'Inventory Manager', 'Logistics Coordinator'];

const locationData = [
  {
    country: 'USA',
    cities: ['New York', 'Chicago', 'San Francisco', 'Seattle', 'Boston', 'Los Angeles', 'Miami', 'Houston'],
    postals: ['10001', '60601', '94101', '98101', '02101', '90001', '33101', '77001'],
    phones: ['(555) 019-2834', '(555) 014-3829', '(555) 012-9847', '(555) 015-8473', '(555) 011-3829', '(555) 013-4827']
  },
  {
    country: 'Germany',
    cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Stuttgart', 'Cologne'],
    postals: ['10115', '80331', '20095', '60311', '70173', '50667'],
    phones: ['030-0074321', '089-0874321', '040-0274321', '069-0974321', '0711-0374321', '0221-0474321']
  },
  {
    country: 'UK',
    cities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Glasgow'],
    postals: ['EC1A 1BB', 'M1 1AE', 'B1 1AY', 'LS1 1UR', 'L1 1JR', 'G1 1QX'],
    phones: ['(0171) 555-2282', '(0161) 555-1212', '(0121) 555-3434', '(0113) 555-7878', '(0151) 555-9898', '(0141) 555-7777']
  },
  {
    country: 'Vietnam',
    cities: ['Hanoi', 'Ho Chi Minh City', 'Da Nang', 'Can Tho', 'Hai Phong', 'Nha Trang'],
    postals: ['100000', '700000', '550000', '900000', '180000', '650000'],
    phones: ['024-34567890', '028-38765432', '0236-3987654', '0292-3487569', '0225-3987123', '0258-3567890']
  },
  {
    country: 'Singapore',
    cities: ['Singapore'],
    postals: ['018981', '038986', '048624', '189720', '238881', '098585'],
    phones: ['6555-1234', '6555-5678', '6555-8765', '6555-4321', '6555-9988', '6555-7766']
  }
];

const streetNames = ['Main St', 'Broadway', 'Oak Ave', 'Pine St', 'Maple Dr', 'Cedar Rd', 'Elm St', 'View Rd', 'Sunset Blvd', 'Lake St', 'High St', 'Park Ln'];

function runSeeding(force = false) {
  const dataDir = path.join(__dirname, '../db/data');
  const catFile = path.join(dataDir, 'sap.cap.northwind-Categories.csv');
  const prodFile = path.join(dataDir, 'sap.cap.northwind-Products.csv');
  const custFile = path.join(dataDir, 'sap.cap.northwind-Customers.csv');
  const orderFile = path.join(dataDir, 'sap.cap.northwind-Orders.csv');
  const itemFile = path.join(dataDir, 'sap.cap.northwind-OrderItems.csv');

  if (!force && fs.existsSync(prodFile)) {
    console.log('[Seed] Seed data CSV files already exist. Skipping seeding. Use npm run seed to force regeneration.');
    return;
  }

  console.log('[Seed] Starting large-scale dummy data generation (10,000 records per entity)...');
  fs.mkdirSync(dataDir, { recursive: true });

  const recordCount = 10000;
  const defaultDate = '2026-05-23T15:00:00Z';
  const defaultUser = 'anonymous';

  // 1. Generate Categories
  console.log('[Seed] Generating Categories...');
  const categories = [];
  const catIds = [];
  const catStream = fs.createWriteStream(catFile, { encoding: 'utf8' });
  catStream.write('ID,createdAt,createdBy,modifiedAt,modifiedBy,name,description,isDeleted\n');

  for (let i = 0; i < recordCount; i++) {
    const id = uuid();
    const prefix = categoryPrefixes[i % categoryPrefixes.length];
    const suffix = categorySuffixes[(i + Math.floor(i / categoryPrefixes.length)) % categorySuffixes.length];
    const indexStr = i >= categoryPrefixes.length * categorySuffixes.length ? ` #${Math.floor(i / (categoryPrefixes.length * categorySuffixes.length))}` : '';
    const name = `${prefix} ${suffix}${indexStr}`;
    const description = `High quality, select items in the ${name} department.`;

    catIds.push(id);
    catStream.write(`${id},${defaultDate},${defaultUser},${defaultDate},${defaultUser},${escapeCSV(name)},${escapeCSV(description)},false\n`);
  }
  catStream.end();

  // 2. Generate Products
  console.log('[Seed] Generating Products...');
  const productsList = []; // stores {ID, unitPrice}
  const prodStream = fs.createWriteStream(prodFile, { encoding: 'utf8' });
  prodStream.write('ID,createdAt,createdBy,modifiedAt,modifiedBy,productNumber,name,unitPrice,unitsInStock,unitsOnOrder,reorderLevel,discontinued,isDeleted,category_ID\n');

  for (let i = 0; i < recordCount; i++) {
    const id = uuid();
    const productNumber = 11 + i;
    const prefix = productPrefixes[i % productPrefixes.length];
    const base = productBases[(i + Math.floor(i / productPrefixes.length)) % productBases.length];
    const indexStr = i >= productPrefixes.length * productBases.length ? ` - Code:${i}` : '';
    const name = `${prefix} ${base}${indexStr}`;

    const unitPrice = parseFloat((5.00 + (i % 250) * 1.85).toFixed(2));
    const unitsInStock = (i % 5) === 0 ? Math.floor(Math.random() * 10) : Math.floor(Math.random() * 500) + 10; // make some low-stock products to show criticality
    const unitsOnOrder = (i % 7) === 0 ? Math.floor(Math.random() * 100) : 0;
    const reorderLevel = 10 + (i % 4) * 5;
    const discontinued = (i % 25) === 0; // 4% discontinued
    const category_ID = catIds[i % recordCount]; // 1:1 mapping or random from list

    productsList.push({ ID: id, name, unitPrice });
    prodStream.write(`${id},${defaultDate},${defaultUser},${defaultDate},${defaultUser},${productNumber},${escapeCSV(name)},${unitPrice},${unitsInStock},${unitsOnOrder},${reorderLevel},${discontinued},false,${category_ID}\n`);
  }
  prodStream.end();

  // 3. Generate Customers
  console.log('[Seed] Generating Customers...');
  const customerIds = [];
  const customersData = []; // stores city, country, address, companyName, customerID
  const custStream = fs.createWriteStream(custFile, { encoding: 'utf8' });
  custStream.write('ID,createdAt,createdBy,modifiedAt,modifiedBy,customerID,companyName,contactName,contactTitle,address,city,postalCode,country,phone,email,status,isDeleted\n');

  for (let i = 0; i < recordCount; i++) {
    const id = uuid();
    const prefix = companyPrefixes[i % companyPrefixes.length];
    const middle = companyMiddles[(i + Math.floor(i / companyPrefixes.length)) % companyMiddles.length];
    const suffix = companySuffixes[(i + Math.floor(i / (companyPrefixes.length * companyMiddles.length))) % companySuffixes.length];
    const indexStr = i >= companyPrefixes.length * companyMiddles.length * companySuffixes.length ? ` - Div ${Math.floor(i / (companyPrefixes.length * companyMiddles.length * companySuffixes.length))}` : '';
    const companyName = `${prefix} ${middle} ${suffix}${indexStr}`;
    const customerID = (companyName.replace(/[^a-zA-Z]/g, '').substring(0, 5)).toUpperCase();

    const contactName = `${contactFirstNames[i % contactFirstNames.length]} ${contactLastNames[(i + 3) % contactLastNames.length]}`;
    const contactTitle = contactTitles[i % contactTitles.length];

    const loc = locationData[i % locationData.length];
    const city = loc.cities[Math.floor(Math.random() * loc.cities.length)];
    const postalCode = loc.postals[loc.cities.indexOf(city) % loc.postals.length];
    const country = loc.country;
    const phone = loc.phones[i % loc.phones.length];
    const streetNum = 10 + (i % 990);
    const street = streetNames[i % streetNames.length];
    const address = `${streetNum} ${street}`;

    const email = `${contactName.toLowerCase().replace(/\s+/g, '.')}@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'example'}.com`;
    const status = 'active';

    customerIds.push(id);
    customersData.push({ companyName, address, city, country, customerID });
    custStream.write(`${id},${defaultDate},${defaultUser},${defaultDate},${defaultUser},${customerID},${escapeCSV(companyName)},${escapeCSV(contactName)},${escapeCSV(contactTitle)},${escapeCSV(address)},${escapeCSV(city)},${escapeCSV(postalCode)},${escapeCSV(country)},${escapeCSV(phone)},${escapeCSV(email)},${status},false\n`);
  }
  custStream.end();

  // 4. Generate Orders (and OrderItems later)
  console.log('[Seed] Generating Orders and OrderItems...');
  const employeeNames = ['Nancy Davolio', 'Andrew Fuller', 'Janet Leverling', 'Margaret Peacock', 'Steven Buchanan', 'Michael Suyama', 'Robert King', 'Laura Callahan', 'Anne Dodsworth'];
  const orderIds = [];
  const ordersList = [];
  
  // Let's create realistic dates in the last 2 years
  const nowMs = new Date('2026-05-23T15:00:00Z').getTime();

  for (let i = 0; i < recordCount; i++) {
    const id = uuid();
    const orderNumber = 10248 + i;
    const custIdx = i % recordCount;
    const customer_ID = customerIds[custIdx];
    const custInfo = customersData[custIdx];

    // orderDate spread over last 730 days
    const daysAgo = (i % 730);
    const orderDateMs = nowMs - (daysAgo * 24 * 60 * 60 * 1000) - (Math.random() * 12 * 60 * 60 * 1000);
    const orderDate = new Date(orderDateMs).toISOString();
    const requiredDate = new Date(orderDateMs + (15 + (i % 15)) * 24 * 60 * 60 * 1000).toISOString();

    // shippedDate 2 to 7 days later (or null for 5% of recent orders)
    const isShipped = i % 20 !== 0; // 95% shipped
    const shippedDateVal = isShipped
      ? new Date(orderDateMs + (2 + (i % 5)) * 24 * 60 * 60 * 1000).toISOString()
      : '';

    const freight = parseFloat((10.00 + (i % 150) * 1.25).toFixed(2));
    const employeeName = employeeNames[i % employeeNames.length];
    const shipName = custInfo.companyName;
    const shipAddress = custInfo.address;
    const shipCity = custInfo.city;
    const shipCountry = custInfo.country;

    // Financial calculation for seed orders
    const productIdx = i % recordCount;
    const prod = productsList[productIdx];
    const quantity = 1 + (i % 50); // quantity 1 to 50
    const hasDiscount = (i % 10) === 0;
    const discount = hasDiscount ? 0.1 : 0.0; // 10% discount max (under 50%)
    
    const itemUnitPrice = prod.unitPrice;
    const itemSubtotal = parseFloat((quantity * itemUnitPrice * (1 - discount)).toFixed(2));
    const orderSubtotal = itemSubtotal;
    const tax = parseFloat((orderSubtotal * 0.10).toFixed(2));
    const totalAmount = parseFloat((orderSubtotal + tax + freight).toFixed(2));
    const status = daysAgo > 30 ? 'COMPLETED' : 'NEW';

    orderIds.push(id);
    ordersList.push({
      id, orderNumber, orderDate, requiredDate, shippedDateVal, freight, employeeName, shipName, shipAddress, shipCity, shipCountry, customer_ID,
      status, subtotal: orderSubtotal, tax, totalAmount,
      item: {
        product_ID: prod.ID,
        quantity,
        unitPrice: itemUnitPrice,
        discount
      }
    });
  }

  // Write Orders
  const orderStream = fs.createWriteStream(orderFile, { encoding: 'utf8' });
  orderStream.write('ID,createdAt,createdBy,modifiedAt,modifiedBy,orderNumber,orderDate,requiredDate,shippedDate,freight,employeeName,shipName,shipAddress,shipCity,shipCountry,status,subtotal,tax,totalAmount,isDeleted,customer_ID\n');
  for (const o of ordersList) {
    orderStream.write(`${o.id},${defaultDate},${defaultUser},${defaultDate},${defaultUser},${o.orderNumber},${o.orderDate},${o.requiredDate},${o.shippedDateVal},${o.freight},${escapeCSV(o.employeeName)},${escapeCSV(o.shipName)},${escapeCSV(o.shipAddress)},${escapeCSV(o.shipCity)},${escapeCSV(o.shipCountry)},${o.status},${o.subtotal},${o.tax},${o.totalAmount},false,${o.customer_ID}\n`);
  }
  orderStream.end();

  // Write OrderItems
  const itemStream = fs.createWriteStream(itemFile, { encoding: 'utf8' });
  itemStream.write('ID,createdAt,createdBy,modifiedAt,modifiedBy,isDeleted,order_ID,product_ID,quantity,unitPrice,discount\n');
  for (let i = 0; i < recordCount; i++) {
    const o = ordersList[i];
    const itemId = uuid();
    itemStream.write(`${itemId},${defaultDate},${defaultUser},${defaultDate},${defaultUser},false,${o.id},${o.item.product_ID},${o.item.quantity},${o.item.unitPrice},${o.item.discount}\n`);
  }
  itemStream.end();

  console.log(`[Seed] Successfully generated 50,000 records across 5 CSV files in db/data/!`);
}

// If run directly via node scripts/seed.js
if (require.main === module) {
  // Support --force argument
  const force = process.argv.includes('--force');
  runSeeding(force);
}

module.exports = runSeeding;
