import { MigrationInterface, QueryRunner } from "typeorm";

export class PersonalClientsInvitations1700000000001 implements MigrationInterface {
  name = "PersonalClientsInvitations1700000000001";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "personal_clients" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "personal_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "status" varchar(20) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_personal_clients_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_personal_clients_personal_client"
          UNIQUE ("personal_id", "client_id"),
        CONSTRAINT "CHK_personal_clients_status"
          CHECK ("status" IN ('ACTIVE', 'INACTIVE')),
        CONSTRAINT "FK_personal_clients_personal_id" FOREIGN KEY ("personal_id")
          REFERENCES "members"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_personal_clients_client_id" FOREIGN KEY ("client_id")
          REFERENCES "members"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_personal_clients_active_client"
      ON "personal_clients" ("client_id")
      WHERE "status" = 'ACTIVE'
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_personal_clients_personal_status"
      ON "personal_clients" ("personal_id", "status")
    `);
    await queryRunner.query(`
      CREATE TABLE "invitations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "member_id" uuid NOT NULL,
        "invited_email" varchar(255) NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "accepted_at" timestamptz,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invitations_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_invitations_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_invitations_member_id" FOREIGN KEY ("member_id")
          REFERENCES "members"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_invitations_member_id" ON "invitations" ("member_id")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "invitations"');
    await queryRunner.query(
      'DROP INDEX "IDX_personal_clients_personal_status"',
    );
    await queryRunner.query('DROP INDEX "UQ_personal_clients_active_client"');
    await queryRunner.query('DROP TABLE "personal_clients"');
  }
}
