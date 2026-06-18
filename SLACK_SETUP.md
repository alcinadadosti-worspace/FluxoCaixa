# Bot do Slack — alertas do Acqua Fluxo

Backend em `server/` (Node) que recebe os eventos do app e posta no Slack.
Roda no **Render (Web Service grátis)** + **UptimeRobot** (ping de 5 min) pra não dormir.

**Fase 1 (este guia):** alertas de **caixa fechado** e **divergência na conferência**.
**Fase 2 (depois):** **auditoria surpresa** interativa (precisa de mais permissões e da URL de interatividade — faço junto com você).

---

## A) Criar o app no Slack
1. Acesse <https://api.slack.com/apps> → **Create New App** → **From scratch**.
2. Nome: `Acqua Fluxo`; escolha o **workspace** → **Create App**.
3. Menu lateral **OAuth & Permissions** → role até **Scopes** → **Bot Token Scopes** → **Add an OAuth Scope** → adicione:
   - `chat:write` — mandar mensagens
   - `im:write` — abrir conversa privada (DM) com a pessoa
4. Suba até o topo → **Install to Workspace** → **Allow**.
5. Copie o **Bot User OAuth Token** (começa com `xoxb-...`). **É secreto** — vai só nas variáveis do Render.
6. Os alertas vão por **mensagem direta (DM)** para pessoas — **nunca** para canais/grupos. Pegue o **Slack ID** de cada pessoa do **financeiro** que deve receber os alertas:
   - No Slack, clique na **foto/nome da pessoa** → **Ver perfil** → botão **⋮ (Mais)** → **Copiar ID do membro** (*Copy member ID*). É algo como `U01ABCD23`.
   - Se for mais de uma pessoa, junte os IDs separados por vírgula.

## B) Publicar o backend no Render
1. Render → **New +** → **Web Service** → conectar o repositório **FluxoCaixa**.
2. Configurações:
   | Campo | Valor |
   |---|---|
   | **Name** | `acqua-fluxo-bot` |
   | **Branch** | `main` |
   | **Root Directory** | `server` |
   | **Runtime / Language** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Instance Type** | `Free` |
3. Em **Environment** → **Add Environment Variable**, adicione (os valores ficam só aqui, nunca no código):
   | Key | Value |
   |---|---|
   | `SLACK_BOT_TOKEN` | o `xoxb-...` do passo A5 |
   | `FINANCE_SLACK_IDS` | IDs do financeiro separados por vírgula (ex.: `U01ABCD23,U04EFGH56`) |
   | `FIREBASE_API_KEY` | `AIzaSyBDvpsFyyTKUbKnUxCPa4G4Gh-987fsZRA` |
   | `ALLOWED_ORIGINS` | o link do app (ex.: `https://acqua-fluxo.onrender.com`) — ou `*` por enquanto |
4. **Create Web Service**. Espere ficar **Live** e copie a URL (ex.: `https://acqua-fluxo-bot.onrender.com`).
5. **Me mande essa URL** — eu coloco no app (`const BACKEND_URL` no topo do `acqua-fluxo-caixa.html`) e faço o commit.

## C) Manter acordado (UptimeRobot)
1. <https://uptimerobot.com> → **New Monitor** → tipo **HTTP(s)**.
2. **URL:** `https://acqua-fluxo-bot.onrender.com/health`
3. **Monitoring interval:** 5 minutos → **Create Monitor**.

## D) Testar
- Entrar no app como **uma loja** e lançar um caixa → chega uma **DM "Caixa fechado"** pra(s) pessoa(s) do financeiro.
- Entrar como **financeiro** e conferir com **falta/sobra** → chega uma **DM "Divergência"**.

---

## Segurança
- O `SLACK_BOT_TOKEN` **nunca** vai pro repositório — só nas variáveis de ambiente do Render.
- O backend só aceita chamadas de quem está **logado no app** (valida o token do Firebase).

## O que o backend expõe
- `GET /health` — usado pelo UptimeRobot.
- `POST /notify/caixa-fechado` — chamado pelo app quando uma loja fecha o caixa.
- `POST /notify/divergencia` — chamado quando o financeiro confere e dá falta/sobra.
