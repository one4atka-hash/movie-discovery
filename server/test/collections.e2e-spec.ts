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

describe('Collections (e2e)', () => {
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
    await request(app.getHttpServer()).get('/api/collections').expect(401);
  });

  it('CRUD collections + items', async () => {
    const token = await registerAndGetToken(app);

    const created = await request(app.getHttpServer())
      .post('/api/collections')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My list', description: 'desc', visibility: 'private' })
      .expect(201);

    const id = (created.body as { id: string }).id;
    expect(typeof id).toBe('string');

    const addItem = await request(app.getHttpServer())
      .post(`/api/collections/${id}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbId: 550, title: 'Fight Club', note: 'n' })
      .expect(201);

    const itemId = (addItem.body as { id: string }).id;
    expect(typeof itemId).toBe('string');

    const list = await request(app.getHttpServer())
      .get('/api/collections')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const items = (list.body as { items: unknown[] }).items;
    const col = items.find((x) => (x as { id?: string }).id === id) as
      | { items?: unknown[] }
      | undefined;
    const colItems = col?.items ?? [];
    expect(colItems.some((x) => (x as { id?: string }).id === itemId)).toBe(
      true,
    );

    await request(app.getHttpServer())
      .delete(`/api/collections/${id}/items/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ ok: true });

    await request(app.getHttpServer())
      .delete(`/api/collections/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ ok: true });
  });

  afterEach(async () => {
    await app.close();
  });
});
