import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialUsersMembers1700000000000 implements MigrationInterface {
  name = "InitialUsersMembers1700000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "email_verified_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_users_email_lower" ON "users" (lower("email"))',
    );
    await queryRunner.query(`
      CREATE TABLE "members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid,
        "name" varchar(150) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "role" varchar(20) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_members_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_members_user_id" UNIQUE ("user_id"),
        CONSTRAINT "CHK_members_role" CHECK ("role" IN ('PERSONAL', 'CLIENT')),
        CONSTRAINT "CHK_members_personal_requires_user"
          CHECK ("role" <> 'PERSONAL' OR "user_id" IS NOT NULL),
        CONSTRAINT "FK_members_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refresh_tokens_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "refresh_tokens"');
    await queryRunner.query('DROP TABLE "members"');
    await queryRunner.query('DROP INDEX "UQ_users_email_lower"');
    await queryRunner.query('DROP TABLE "users"');
  }
}
