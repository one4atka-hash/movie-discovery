import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';

async function registerAndGetToken(app: INestApplication<App>) {
  const email = `e2e_${Date.now()}_${Math.random().toString(16).slice(2)}@example.com`;
  const password = 'passw0rd!';
  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, password })
    .expect(201);
  return (res.body as { token: string }).token;
}

describe('Imports (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('requires auth', async () => {
    await request(app.getHttpServer()).post('/api/imports').expect(401);
    await request(app.getHttpServer())
      .get('/api/imports/00000000-0000-0000-0000-000000000000')
      .expect(401);
  });

  it('POST then GET returns job status (MVP)', async () => {
    const token = await registerAndGetToken(app);

    const created = await request(app.getHttpServer())
      .post('/api/imports')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'diary', format: 'json', payload: '{"items":[]}' })
      .expect(201);

    const id = (created.body as { id: string }).id;
    expect(typeof id).toBe('string');

    const got = await request(app.getHttpServer())
      .get(`/api/imports/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(got.body).toMatchObject({
      id,
      kind: 'diary',
      format: 'json',
      status: 'uploaded',
    });
  });

  it('apply marks job as applied (MVP)', async () => {
    const token = await registerAndGetToken(app);

    const created = await request(app.getHttpServer())
      .post('/api/imports')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'diary', format: 'json', payload: '{"items":[]}' })
      .expect(201);
    const id = (created.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/imports/${id}/apply`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect({ ok: true });

    const got = await request(app.getHttpServer())
      .get(`/api/imports/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(got.body).toMatchObject({ id, status: 'applied' });
  });

  afterEach(async () => {
    await app.close();
  });
});
