import "dotenv/config";
import { DataSource } from "typeorm";
import { Member } from "../modules/members/member.entity";
import { RefreshToken } from "../modules/auth/refresh-token.entity";
import { User } from "../modules/users/user.entity";
import { PersonalClient } from "../modules/personal-clients/personal-client.entity";
import { Invitation } from "../modules/invitations/invitation.entity";

export default new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [User, Member, RefreshToken, PersonalClient, Invitation],
  migrations: [__dirname + "/migrations/*{.ts,.js}"],
  synchronize: false,
});
