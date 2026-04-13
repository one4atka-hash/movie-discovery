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

describe('Email dev (e2e)', () => {
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
    await request(app.getHttpServer())
      .post('/api/email/dev/send-test')
      .expect(401);
  });

  it('send-test returns disabled when DEV_EMAIL_SEND_ENABLED is off', async () => {
    const token = await registerAndGetToken(app);
    const res = await request(app.getHttpServer())
      .post('/api/email/dev/send-test')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(res.body).toEqual({ ok: false, error: 'Disabled' });
  });

  afterEach(async () => {
    await app.close();
  });
});
