import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class InvitationEmailService {
  private readonly logger = new Logger(InvitationEmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendInvitation(
    email: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    const host = this.config.get<string>("SMTP_HOST");
    const from = this.config.get<string>("MAIL_FROM");
    if (!host || !from) {
      throw new ServiceUnavailableException(
        "Invitation email delivery is not configured",
      );
    }

    const user = this.config.get<string>("SMTP_USER");
    const password = this.config.get<string>("SMTP_PASSWORD");
    if (Boolean(user) !== Boolean(password)) {
      throw new ServiceUnavailableException(
        "Invitation email authentication is incompletely configured",
      );
    }
    const transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>("SMTP_PORT", 587),
      secure: this.config.get<boolean>("SMTP_SECURE", false),
      ...(user && password ? { auth: { user, pass: password } } : {}),
    });
    const appUrl = this.config.get<string>("APP_URL", "http://localhost:3001");
    const invitationUrl = `${appUrl.replace(/\/$/, "")}/accept-invitation?token=${encodeURIComponent(token)}`;

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: "Convite para acessar sua conta de aluno",
        text: [
          "Você foi convidado para acessar a plataforma de agendamento.",
          `Aceite o convite: ${invitationUrl}`,
          `Este convite expira em ${expiresAt.toISOString()}.`,
        ].join("\n\n"),
      });
    } catch (error) {
      this.logger.error(
        "Could not deliver invitation email",
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        "The invitation email could not be delivered",
        { cause: error },
      );
    }
  }
}
