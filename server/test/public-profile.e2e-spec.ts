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

describe('Public profile (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('GET/PUT /me/public-profile and public GET /u/:slug', async () => {
    const token = await registerAndGetToken(app);
    const slug = `pf-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;

    const g0 = await request(app.getHttpServer())
      .get('/api/me/public-profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect((g0.body as { enabled: boolean }).enabled).toBe(false);

    await request(app.getHttpServer())
      .put('/api/me/public-profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        slug,
        enabled: true,
        visibility: 'unlisted',
        sections: { favorites: true, diary: false, watchlist: false },
      })
      .expect(200)
      .expect({ ok: true });

    await request(app.getHttpServer())
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbId: 424242 })
      .expect(201);

    const pub = await request(app.getHttpServer())
      .get(`/api/u/${slug}`)
      .expect(200);

    const body = pub.body as {
      slug: string;
      favorites?: { tmdbIds: number[] };
    };
    expect(body.slug).toBe(slug);
    expect(body.favorites?.tmdbIds).toContain(424242);

    await request(app.getHttpServer())
      .put('/api/me/public-profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        slug: null,
        enabled: true,
        visibility: 'private',
        sections: { favorites: false, diary: false, watchlist: false },
      })
      .expect(200);

    await request(app.getHttpServer()).get(`/api/u/${slug}`).expect(404);
  });

  it('rejects duplicate slug', async () => {
    const tokenA = await registerAndGetToken(app);
    const tokenB = await registerAndGetToken(app);
    const slug = `dup-${Date.now().toString(36)}`;

    await request(app.getHttpServer())
      .put('/api/me/public-profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        slug,
        enabled: true,
        visibility: 'public',
        sections: { favorites: true, diary: false, watchlist: false },
      })
      .expect(200);

    await request(app.getHttpServer())
      .put('/api/me/public-profile')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        slug,
        enabled: true,
        visibility: 'public',
        sections: { favorites: false, diary: false, watchlist: false },
      })
      .expect(409);
  });

  afterEach(async () => {
    await app.close();
  });
});
