import { existsSync, readFileSync } from 'node:fs';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { parse } from 'dotenv';

import { AppModule } from '@/app/app.module';
import { Env } from '@/libs/configs';
import { resolveUserServiceEnvFilePaths } from '@/libs/configs/env-file-paths';

class BootstrapApplication {
  async run() {
    loadUserServiceEnv();

    const tcpPort = getTcpPort();

    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        transport: Transport.TCP,
        options: { host: '0.0.0.0', port: tcpPort },
      },
    );

    await app.listen();

    Logger.log(
      `User service TCP listening on 0.0.0.0:${tcpPort}`,
      BootstrapApplication.name,
    );
  }
}

function loadUserServiceEnv(): void {
  for (const envFilePath of resolveUserServiceEnvFilePaths()) {
    if (!existsSync(envFilePath)) {
      continue;
    }

    const parsedEnv = parse(readFileSync(envFilePath));
    for (const [key, value] of Object.entries(parsedEnv)) {
      process.env[key] ??= value;
    }
  }
}

function getTcpPort(): number {
  const tcpPort = Number(process.env[Env.TCP_PORT]);

  if (!Number.isInteger(tcpPort) || tcpPort <= 0) {
    throw new Error(`${Env.TCP_PORT} must be a positive integer`);
  }

  return tcpPort;
}

void new BootstrapApplication().run();
