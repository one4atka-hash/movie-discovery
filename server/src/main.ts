import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { truthy } from './config/env.schema';
import { HttpException, HttpStatus, ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  app.use(
    helmet({
      // Allow TMDB images and youtube embeds on the frontend; backend itself is API-only.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Basic payload validation (DTO-based endpoints can opt in later).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: () =>
        new HttpException('Invalid payload', HttpStatus.BAD_REQUEST),
    }),
  );

  // Normalize common exceptions into a stable JSON shape.
  app.useGlobalFilters(new GlobalExceptionFilter());

  const config = app.get(ConfigService);

  if (truthy(config.get<string>('SWAGGER_ENABLED'))) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Movie Discovery API')
      .setDescription('Backend API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        'bearer',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const rawOrigins = (config.get<string>('CORS_ORIGINS') ?? '').trim();
  const allowOrigins = rawOrigins
    ? rawOrigins
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const corsCredentials = truthy(config.get<string>('CORS_CREDENTIALS'));

  app.enableCors({
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return cb(null, true); // same-origin / curl
      if (allowOrigins.length === 0)
        return cb(new Error('CORS blocked'), false);
      return cb(null, allowOrigins.includes(origin));
    },
    credentials: corsCredentials,
  });

  await app.listen(Number(config.get<string>('PORT') ?? 3001));
}
void bootstrap();
