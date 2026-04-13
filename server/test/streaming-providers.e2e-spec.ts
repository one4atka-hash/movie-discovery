import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';

describe('Streaming providers catalog (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('returns providers list for region', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              provider_id: 8,
              provider_name: 'Netflix',
              logo_path: '/n.png',
              display_priority: 1,
            },
            {
              provider_id: 9,
              provider_name: 'Amazon Prime Video',
              logo_path: '/p.png',
              display_priority: 2,
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const res = await request(app.getHttpServer())
      .get('/api/streaming/providers?region=US')
      .expect(200);

    expect(res.body).toMatchObject({
      region: 'US',
    });
    expect(Array.isArray((res.body as { items: unknown[] }).items)).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fetchSpy.mockRestore();
  });

  it('validates region', async () => {
    await request(app.getHttpServer())
      .get('/api/streaming/providers?region=USA')
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
