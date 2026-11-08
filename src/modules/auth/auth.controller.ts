import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { MemberRole } from "../members/member-role.enum";
import { AuthService, TokenPair } from "./auth.service";
import {
  AuthenticatedUserResponseDto,
  LogoutResponseDto,
  TokenPairResponseDto,
} from "./dto/auth-response.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";
import { AuthenticatedUser } from "./interfaces/authenticated-user.interface";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";
import { Roles } from "./roles.decorator";

@Controller("auth")
@ApiTags("Autenticação")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Cria uma conta pessoal" })
  @ApiCreatedResponse({ type: TokenPairResponseDto })
  @ApiBadRequestResponse({ description: "Dados de cadastro inválidos." })
  @ApiConflictResponse({ description: "Já existe uma conta com este e-mail." })
  register(@Body() dto: RegisterDto): Promise<TokenPair> {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Autentica uma conta" })
  @ApiOkResponse({ type: TokenPairResponseDto })
  @ApiBadRequestResponse({ description: "Dados de autenticação inválidos." })
  @ApiUnauthorizedResponse({ description: "E-mail ou senha inválidos." })
  login(@Body() dto: LoginDto): Promise<TokenPair> {
    return this.authService.login(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Renova os tokens da sessão" })
  @ApiOkResponse({ type: TokenPairResponseDto })
  @ApiBadRequestResponse({ description: "Refresh token ausente ou inválido." })
  @ApiUnauthorizedResponse({
    description: "Refresh token expirado ou revogado.",
  })
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenPair> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Encerra a sessão autenticada" })
  @ApiOkResponse({ type: LogoutResponseDto })
  @ApiBadRequestResponse({ description: "Refresh token ausente ou inválido." })
  @ApiUnauthorizedResponse({ description: "Access token ausente ou inválido." })
  logout(
    @Req() request: Request & { user: AuthenticatedUser },
    @Body() dto: RefreshTokenDto,
  ) {
    return this.authService.logout(request.user.userId, dto.refreshToken);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MemberRole.PERSONAL)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Retorna o perfil autenticado" })
  @ApiOkResponse({ type: AuthenticatedUserResponseDto })
  @ApiUnauthorizedResponse({ description: "Access token ausente ou inválido." })
  @ApiForbiddenResponse({ description: "Perfil sem permissão para acessar." })
  me(@Req() request: Request & { user: AuthenticatedUser }) {
    return request.user;
  }
}
