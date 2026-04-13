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

describe('Exports (e2e)', () => {
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
      .get('/api/exports?kind=diary&format=json')
      .expect(401);
  });

  it('exports diary/watch_state/favorites as json (MVP)', async () => {
    const token = await registerAndGetToken(app);

    // Seed a bit of data.
    await request(app.getHttpServer())
      .post('/api/diary')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tmdbId: 550,
        title: 'Fight Club',
        watchedAt: '2026-01-10',
        location: 'home',
        rating: 9,
        tags: ['classic'],
        note: null,
      })
      .expect(201);

    await request(app.getHttpServer())
      .put('/api/watch-state/550')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'want', progress: { minutes: 10 } })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbId: 550 })
      .expect(201);

    const diary = await request(app.getHttpServer())
      .get('/api/exports?kind=diary&format=json&year=2026')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((diary.body as { filename: string }).filename).toContain(
      'diary_2026',
    );

    const ws = await request(app.getHttpServer())
      .get('/api/exports?kind=watch_state&format=json')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((ws.body as { filename: string }).filename).toContain('watch_state');

    const fav = await request(app.getHttpServer())
      .get('/api/exports?kind=favorites&format=json')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((fav.body as { filename: string }).filename).toContain('favorites');
  });

  afterEach(async () => {
    await app.close();
  });
});
