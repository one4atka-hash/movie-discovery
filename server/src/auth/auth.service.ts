import * as bcrypt from 'bcrypt';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';

import { DbService } from '../db/db.service';

const CredentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(6).max(200)
});

type UserRow = { id: string; email: string; password_hash: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwt: JwtService
  ) {}

  async register(body: unknown): Promise<{ token: string; user: { id: string; email: string } }> {
    const creds = CredentialsSchema.safeParse(body);
    if (!creds.success) {
      throw new BadRequestException('Invalid payload');
    }

    const email = creds.data.email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(creds.data.password, 12);

    let rows: { id: string; email: string }[];
    try {
      rows = await this.db.query<{ id: string; email: string }>(
        `insert into users(email, password_hash)
         values ($1, $2)
         returning id, email`,
        [email, passwordHash]
      );
    } catch (e: unknown) {
      const code = (e as { code?: string } | null)?.code;
      if (code === '23505') {
        throw new ConflictException('Email already registered');
      }
      throw e;
    }

    const user = rows[0];
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { token, user };
  }

  async login(body: unknown): Promise<{ token: string; user: { id: string; email: string } } | null> {
    const creds = CredentialsSchema.safeParse(body);
    if (!creds.success) return null;

    const email = creds.data.email.toLowerCase().trim();
    const rows = await this.db.query<UserRow>(
      `select id, email, password_hash
       from users
       where email = $1
       limit 1`,
      [email]
    );
    const u = rows[0];
    if (!u) return null;

    const ok = await bcrypt.compare(creds.data.password, u.password_hash);
    if (!ok) return null;

    const token = await this.jwt.signAsync({ sub: u.id, email: u.email });
    return { token, user: { id: u.id, email: u.email } };
  }
}

