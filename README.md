# Personal Agendamento API

Backend REST independente para a plataforma de agendamento. O frontend permanece em um projeto separado.

## Requisitos

- Node.js 22+
- Docker com Docker Compose, ou PostgreSQL 13+

## Desenvolvimento local

1. Copie `.env.example` para `.env` e defina uma senha local para o banco e um `JWT_SECRET` aleatório com pelo menos 32 caracteres.
2. Inicie o PostgreSQL com `docker compose up -d db`.
3. Execute `npm ci`, `npm run migration:run` e `npm run start:dev`.

A API escuta em `http://localhost:3000`. `GET /api` responde com o estado do serviço.

Para executar API e banco em containers, configure as mesmas variáveis no ambiente e execute `docker compose up --build`.

### SMTP local com MailHog

O Compose de desenvolvimento inicia a API e o MailHog na mesma rede Docker. A configuração sobrescreve o SMTP da API para usar o nome do serviço `mailhog` na porta `1025`, sem TLS nem autenticação:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

A API deve usar `mailhog` como host SMTP; dentro do container, `localhost` apontaria para o próprio container da API. A porta SMTP não é publicada no host: somente a interface de captura é disponibilizada, em `http://localhost:8025`, vinculada a `127.0.0.1`. Os e-mails ficam no MailHog e não são encaminhados aos destinatários reais.

Esse Compose é para desenvolvimento com a API em container. Se executar a API diretamente no host com `npm run start:dev`, configure no `.env` um servidor SMTP acessível pelo host. O `.env.example` deixa os valores SMTP vazios; nesse estado, o envio de convites responde com indisponibilidade até que `SMTP_HOST` e `MAIL_FROM` sejam definidos. Para outro servidor SMTP, use `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` e `MAIL_FROM`; configure `SMTP_USER` e `SMTP_PASSWORD` somente quando o servidor exigir autenticação.

Para encerrar os containers de desenvolvimento, use:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

## Autenticação inicial

- `POST /api/auth/register`: cria um personal, seu usuário e perfil em uma transação.
- `POST /api/auth/login`: autentica por e-mail e senha.
- `POST /api/auth/refresh`: rotaciona o refresh token de uso único.
- `POST /api/auth/logout`: revoga o refresh token associado ao usuário autenticado.
- `GET /api/auth/me`: exemplo de rota protegida por JWT e papel.

O token de acesso é JWT; o refresh token é aleatório, armazenado somente como hash SHA-256 e revogado/rotacionado no banco. Como o refresh token é opaco, ele não exige um segundo segredo JWT.

## Carteira e convites

Com o SMTP de desenvolvimento ou outro servidor configurado, aplique as migrations e use os endpoints:

- `POST /api/members`, `GET /api/members`, `GET /api/members/:id`, `PATCH /api/members/:id` e `PATCH /api/members/:id/deactivate` para gerenciar a carteira do personal autenticado.
- `POST /api/invitations` com `{ "memberId": "<uuid>", "email": "aluno@example.com" }` para enviar um convite. O link de aceite usa `APP_URL`.
- `POST /api/invitations/:id/resend` para emitir um token novo e invalidar convites pendentes anteriores; `POST /api/invitations/:id/revoke` para revogar um convite.
- `POST /api/invitations/accept` com `{ "token": "<token recebido por e-mail>", "email": "aluno@example.com", "password": "<senha>" }` para ativar a conta do aluno. O e-mail deve corresponder ao convite. Depois, o aluno pode autenticar em `/api/auth/login`.

Os endpoints da carteira e de envio/reenvio/revogação exigem JWT de personal. O aceite é público, valida expiração e uso único, e cria o usuário e associa o perfil em uma transação. Tokens de convite são armazenados somente como hash. Sem SMTP configurado, o envio responde com indisponibilidade explícita; defina também `APP_URL` para a aplicação frontend.

## Banco e migrations

O TypeORM usa `synchronize: false`. Mudanças de schema devem ser feitas por migrations versionadas. Para gerar uma migration, use `npm run migration:generate -- src/database/migrations/NomeDaMigration`; para aplicar ou reverter, use `npm run migration:run` ou `npm run migration:revert`.

As variáveis usam os nomes `DATABASE_*` da seção de infraestrutura do planejamento. Os segredos JWT são obrigatórios e não devem ser versionados.
