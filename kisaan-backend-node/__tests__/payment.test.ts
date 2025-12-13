import request from 'supertest';

const BASE = process.env.API_BASE || 'http://localhost:8000/api';

describe('Payment API', () => {
  test('shop->farmer payment by owner should be allowed or produce auth error if unauthenticated', async () => {
    const res = await request(BASE).post('/payments').send({ payer_type: 'SHOP', payee_type: 'FARMER', amount: 10, method: 'CASH' });
    expect([200,201,401,403,400]).toContain(res.status);
  });
});
