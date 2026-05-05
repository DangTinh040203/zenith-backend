import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateUserTables1777939200000 implements MigrationInterface {
  name = 'CreateUserTables1777939200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" varchar(100) NOT NULL,
        "name" varchar(255),
        "description" text,
        "permissions" text array NOT NULL DEFAULT '{}',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_roles_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_roles_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" varchar(320) NOT NULL,
        "displayName" varchar(255),
        "avatar" text,
        "externalId" varchar(255),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_externalId" UNIQUE ("externalId"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_user_roles_user_id" ON "user_roles" ("user_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_user_roles_role_id" ON "user_roles" ("role_id")',
    );
    await queryRunner.query(`
      ALTER TABLE "user_roles"
      ADD CONSTRAINT "FK_user_roles_user_id"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "user_roles"
      ADD CONSTRAINT "FK_user_roles_role_id"
      FOREIGN KEY ("role_id") REFERENCES "roles"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user_roles" DROP CONSTRAINT "FK_user_roles_role_id"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_roles" DROP CONSTRAINT "FK_user_roles_user_id"',
    );
    await queryRunner.query('DROP INDEX "IDX_user_roles_role_id"');
    await queryRunner.query('DROP INDEX "IDX_user_roles_user_id"');
    await queryRunner.query('DROP TABLE "user_roles"');
    await queryRunner.query('DROP TABLE "users"');
    await queryRunner.query('DROP TABLE "roles"');
  }
}
