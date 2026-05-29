const cds = require('@sap/cds');

async function test() {
  const srv = await cds.load(['srv/service.cds', 'db/schema.cds']);
  const cs = cds.compile(srv).for('nodejs');
  
  const Orders = cs.definitions['NorthwindService.Orders'];
  console.log('Orders has isDeleted:', !!(Orders.elements && Orders.elements.isDeleted));
}

test().catch(console.error);
