import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import * as Joi from "joi";
import { AuthModule } from "./modules/auth/auth.module";
import { Member } from "./modules/members/member.entity";
import { User } from "./modules/users/user.entity";
import { RefreshToken } from "./modules/auth/refresh-token.entity";
import { AppController } from "./app.controller";
import { PersonalClient } from "./modules/personal-clients/personal-client.entity";
import { Invitation } from "./modules/invitations/invitation.entity";
import { PersonalClientsModule } from "./modules/personal-clients/personal-clients.module";
import { InvitationsModule } from "./modules/invitations/invitations.module";

const durationPattern = /^[1-9]\d*[smhd]$/;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid("development", "test", "production")
          .default("development"),
        PORT: Joi.number().port().default(3000),
        DATABASE_HOST: Joi.string().required(),
        DATABASE_PORT: Joi.number().port().default(5432),
        DATABASE_NAME: Joi.string().required(),
        DATABASE_USER: Joi.string().required(),
        DATABASE_PASSWORD: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().pattern(durationPattern).default("15m"),
        JWT_REFRESH_EXPIRES_IN: Joi.string()
          .pattern(durationPattern)
          .default("7d"),
        SMTP_HOST: Joi.string().allow("").default(""),
        SMTP_PORT: Joi.number().port().default(587),
        SMTP_SECURE: Joi.boolean().default(false),
        SMTP_USER: Joi.string().allow("").default(""),
        SMTP_PASSWORD: Joi.string().allow("").default(""),
        MAIL_FROM: Joi.string().email().allow("").default(""),
        APP_URL: Joi.string()
          .uri({ scheme: ["http", "https"] })
          .default("http://localhost:3001"),
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres" as const,
        host: config.getOrThrow<string>("DATABASE_HOST"),
        port: config.getOrThrow<number>("DATABASE_PORT"),
        username: config.getOrThrow<string>("DATABASE_USER"),
        password: config.getOrThrow<string>("DATABASE_PASSWORD"),
        database: config.getOrThrow<string>("DATABASE_NAME"),
        entities: [User, Member, RefreshToken, PersonalClient, Invitation],
        migrations: [__dirname + "/database/migrations/*{.ts,.js}"],
        migrationsRun: false,
        synchronize: false,
      }),
    }),
    AuthModule,
    PersonalClientsModule,
    InvitationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
