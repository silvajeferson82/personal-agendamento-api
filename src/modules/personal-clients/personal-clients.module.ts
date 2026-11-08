import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Member } from "../members/member.entity";
import { PersonalClient } from "./personal-client.entity";
import { PersonalClientsController } from "./personal-clients.controller";
import { PersonalClientsService } from "./personal-clients.service";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Member, PersonalClient])],
  controllers: [PersonalClientsController],
  providers: [PersonalClientsService],
  exports: [PersonalClientsService],
})
export class PersonalClientsModule {}
