import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Member } from "../members/member.entity";
import { PersonalClient } from "../personal-clients/personal-client.entity";
import { User } from "../users/user.entity";
import { Invitation } from "./invitation.entity";
import { InvitationEmailService } from "./invitation-email.service";
import { InvitationsController } from "./invitations.controller";
import { InvitationsService } from "./invitations.service";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Invitation, Member, PersonalClient, User]),
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService, InvitationEmailService],
})
export class InvitationsModule {}
