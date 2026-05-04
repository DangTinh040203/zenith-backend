import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Env } from '@/libs/configs/env.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.getOrThrow<string>(Env.DATABASE_URL);
        const nodeEnv = config.get<string>(Env.NODE_ENV) ?? 'development';

        return {
          type: 'postgres' as const,
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: false,
          logging: nodeEnv === 'development',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
