import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { MemberRole } from "../members/member-role.enum";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { InvitationsService } from "./invitations.service";

@Controller("invitations")
@ApiTags("Convites")
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MemberRole.PERSONAL)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Envia um convite para um aluno da carteira" })
  @ApiCreatedResponse({ description: "Convite enviado." })
  @ApiForbiddenResponse({ description: "Somente personais podem convidar." })
  create(
    @Req() request: Request & { user: AuthenticatedUser },
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.create(request.user.memberId, dto);
  }

  @Post("accept")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Aceita um convite e ativa a conta do aluno" })
  @ApiOkResponse({ description: "Convite aceito." })
  @ApiBadRequestResponse({ description: "Token de convite inválido." })
  @ApiGoneResponse({ description: "Convite expirado ou já utilizado." })
  accept(@Body() dto: AcceptInvitationDto) {
    return this.invitationsService.accept(dto);
  }

  @Post(":id/resend")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MemberRole.PERSONAL)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Emite e envia um novo convite" })
  @ApiCreatedResponse({ description: "Novo convite enviado." })
  @ApiUnauthorizedResponse({ description: "Autenticação necessária." })
  resend(
    @Req() request: Request & { user: AuthenticatedUser },
    @Param("id", ParseUUIDPipe) invitationId: string,
  ) {
    return this.invitationsService.resend(request.user.memberId, invitationId);
  }

  @Post(":id/revoke")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MemberRole.PERSONAL)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Revoga um convite ainda não aceito" })
  @ApiOkResponse({ description: "Convite revogado." })
  @ApiForbiddenResponse({ description: "Somente personais podem revogar." })
  revoke(
    @Req() request: Request & { user: AuthenticatedUser },
    @Param("id", ParseUUIDPipe) invitationId: string,
  ) {
    return this.invitationsService.revoke(request.user.memberId, invitationId);
  }
}
