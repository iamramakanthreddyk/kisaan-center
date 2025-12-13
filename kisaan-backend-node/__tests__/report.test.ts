import request from 'supertest';

const BASE = process.env.API_BASE || 'http://localhost:8000/api';

describe('Report API', () => {
  test('generate report without shop_id should infer from token or fail auth', async () => {
    const res = await request(BASE).get('/reports/generate');
    expect([200,401,400]).toContain(res.status);
  });
});
