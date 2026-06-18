# Fechamento de Caixa — Grupo Alcina Maria

App web de **fechamento e conferência de caixa** das 6 lojas O Boticário do Grupo Alcina Maria (AL).
Arquivo único `acqua-fluxo-caixa.html` (HTML + CSS + JS puro, **sem build, sem servidor**) — é só abrir no navegador.

## Como funciona (resumo)

- A **loja** presta conta do dinheiro no fim do dia: o **valor que restou** no caixa + as **sangrias** (retiradas).
- O **financeiro** informa a **venda do sistema** e o app concilia:
  - `Apurado = restou + sangrias` · `Diferença = Apurado − Venda`
  - Bateu (`|dif|≈0`) · **Falta** (apurou menos) · **Sobra** (apurou mais).
- **Acumulado por loja:** o app soma e **mostra sempre** o histórico de **dívida (faltas)** e **sobra** de cada loja.

## Como abrir

Abra `acqua-fluxo-caixa.html` direto no navegador (duplo clique). Para usar em celular/equipe, vale hospedar
(ex.: GitHub Pages) — e é obrigatório hospedar para o Firebase funcionar bem.

## Login

A tela inicial mostra um **card para cada acesso** (Financeiro + cada loja). Toque no card e digite o **código**:

- **Financeiro** — vê e confere todas as lojas.
- **Cada loja** — dá acesso só àquela loja.

Com o **Firebase ligado**, o código é a senha real no Firebase Authentication (ver `FIREBASE_SETUP.md`) — não fica no app.
Sem Firebase, o app roda em **modo demonstração** (códigos de teste: lojas `loja123`, financeiro `fin123`).

## Configuração

No início do `<script>` há um bloco **">>> CONFIGURE AQUI <<<"** com o `firebaseConfig`
(cole a configuração do seu projeto Firebase; vazio = roda em memória/demonstração).

### Ligar o Firebase (persistência + login por código)

Passo a passo completo em **[`FIREBASE_SETUP.md`](FIREBASE_SETUP.md)**. Em resumo:

1. Criar o projeto e colar o `firebaseConfig`.
2. Ativar **Authentication › E-mail/senha** e criar um usuário por acesso (e-mail `<id>@acqua.app`, senha = o código).
3. Criar o **Firestore** e publicar as regras (cada loja só mexe nos próprios caixas; financeiro em todas).

Com isso, os dados ficam na coleção `closings` e **não resetam mais**.

## Pendências / próximos passos

- [x] Login por card + código; acumulado de falta/sobra por loja.
- [ ] Criar o projeto Firebase e seguir o `FIREBASE_SETUP.md` (persistência + login por código).
- [ ] Hospedar (GitHub Pages / Firebase Hosting / Netlify) para uso da equipe no celular.
- [ ] (Opcional) Importar a venda do sistema por CSV em vez de digitar.

> 🔒 **Segurança:** com o Firebase ligado, os códigos viram senhas no Firebase Authentication
> (não ficam no código) e as regras isolam cada loja. Em modo demonstração (sem Firebase) valem só os códigos de teste.

Ver `CONTEXTO_ACQUA_FLUXO.md` para o handoff técnico completo.
