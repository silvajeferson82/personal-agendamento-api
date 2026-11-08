import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { MemberRole } from "../members/member-role.enum";
import { CreateMemberDto } from "./dto/create-member.dto";
import { ListMembersDto } from "./dto/list-members.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { PersonalClientsService } from "./personal-clients.service";

@Controller("members")
@ApiTags("Alunos")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(MemberRole.PERSONAL)
export class PersonalClientsController {
  constructor(
    private readonly personalClientsService: PersonalClientsService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Adiciona um aluno à carteira" })
  @ApiCreatedResponse({ description: "Aluno cadastrado." })
  create(
    @Req() request: Request & { user: AuthenticatedUser },
    @Body() dto: CreateMemberDto,
  ) {
    return this.personalClientsService.create(request.user.memberId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Lista alunos da carteira" })
  @ApiOkResponse({ description: "Alunos da carteira." })
  findAll(
    @Req() request: Request & { user: AuthenticatedUser },
    @Query() query: ListMembersDto,
  ) {
    return this.personalClientsService.findAll(request.user.memberId, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Consulta um aluno da carteira" })
  @ApiOkResponse({ description: "Dados do aluno." })
  findOne(
    @Req() request: Request & { user: AuthenticatedUser },
    @Param("id", ParseUUIDPipe) clientId: string,
  ) {
    return this.personalClientsService.findOne(request.user.memberId, clientId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza os dados de um aluno" })
  @ApiOkResponse({ description: "Aluno atualizado." })
  update(
    @Req() request: Request & { user: AuthenticatedUser },
    @Param("id", ParseUUIDPipe) clientId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.personalClientsService.update(
      request.user.memberId,
      clientId,
      dto,
    );
  }

  @Patch(":id/deactivate")
  @ApiOperation({ summary: "Desativa o vínculo de um aluno" })
  @ApiOkResponse({ description: "Vínculo desativado." })
  deactivate(
    @Req() request: Request & { user: AuthenticatedUser },
    @Param("id", ParseUUIDPipe) clientId: string,
  ) {
    return this.personalClientsService.deactivate(
      request.user.memberId,
      clientId,
    );
  }
}
