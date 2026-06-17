# CONTEXTO — Acqua Fluxo (Fechamento de Caixa)

> Documento de handoff técnico para continuar o desenvolvimento em outro ambiente.
> App de **fechamento e conferência de caixa** das lojas da rede **ACQUA / Grupo Alcina Maria** (franquia O Boticário, Alagoas).
> Arquivo principal: **`acqua-fluxo-caixa.html`** — single-file, ~1.056 linhas, ~112 KB.

---

## 1. O que é / para quê serve

App web para o fechamento diário de caixa de **6 lojas físicas**, com um fluxo de **conferência** feito pelo setor **financeiro**.

A ideia central:
- A **loja** presta conta do **dinheiro** no fim do dia: o que **restou** no caixa + as **sangrias** (retiradas).
- O **financeiro** já tem a **venda do sistema** (do ERP/PDV). Ele **confere**: a soma `restou + sangria` (o "apurado") tem que bater com a venda. Se bate → OK. Se não → marca **Falta** (apurou menos) ou **Sobra** (apurou mais), com o valor da diferença.

É um protótipo funcional, mas com a lógica de negócio toda implementada e testada.

---

## 2. Stack e restrições (importantes)

- **HTML único, sem build, sem servidor, 100% navegador.** Tudo (HTML + CSS + JS) num arquivo só. Não tem npm, bundler, nem backend. Abrir o arquivo no navegador roda.
- **Persistência: NENHUMA ainda.** Os dados ficam só em memória (um `Map` em JS) e **reiniciam a cada reload**. Toda vez que carrega, ele recria os dados de exemplo (`seedSamples`). Isso é proposital — a camada de dados foi isolada para trocar por **Firebase** depois (ver §11 e §16).
- **Bibliotecas externas:**
  - **Google Fonts (Inter)** via `<link>` — fonte da interface.
  - **SheetJS 0.18.5** (cdnjs) — carregada **sob demanda** só quando exporta pra Excel; se falhar, cai pra **CSV**.
  - Nenhuma outra dependência. Sem framework (é JS puro/vanilla + template strings).

---

## 3. Como abrir / rodar

Abra `acqua-fluxo-caixa.html` direto no navegador (duplo clique ou arraste pra aba). Não precisa de servidor.

> ⚠️ **Dentro de preview embutido (iframe sandbox)** algumas coisas podem não funcionar: download de arquivo (exportação) e o carregamento da lib de Excel podem ser bloqueados pelo sandbox. **Aberto direto no navegador, ou hospedado, funciona normal.**

---

## 4. Acessos de teste

| Papel | Usuário | Senha | Nome exibido |
|---|---|---|---|
| Financeiro (vê e confere todas) | `financeiro` | `fin123` | Equipe Financeira |
| Loja Penedo | `penedo` | `loja123` | Loja Penedo |
| Loja São Sebastião | `sao.sebastiao` | `loja123` | Loja São Sebastião |
| Loja Palmeira dos Índios | `palmeira` | `loja123` | Loja Palmeira dos Índios |
| Loja Palmeira (Sustentável) | `palmeira.sust` | `loja123` | Loja Palmeira (Sustentável) |
| Loja Teotônio Vilela | `teotonio` | `loja123` | Loja Teotônio Vilela |
| Loja Coruripe | `coruripe` | `loja123` | Loja Coruripe |

Usuários são **hardcoded** no objeto `USERS` (gerado a partir de `STORES`). Senha de todas as lojas é `loja123`. **Trocar por Firebase Auth depois.**

---

## 5. Lojas e operadores

Definidos no array **`STORES`** no topo do `<script>`. **É o único lugar pra editar nomes de lojas e de pessoas.** Cada loja: `{ id, name, loc, user, color, operadores[] }`.

| id | Loja | user | cor |
|---|---|---|---|
| `sao-sebastiao` | Loja São Sebastião | `sao.sebastiao` | `#23b9cf` |
| `penedo` | Loja Penedo | `penedo` | `#3fa9f5` |
| `palmeira` | Loja Palmeira dos Índios | `palmeira` | `#5ac8e0` |
| `palmeira-sustentavel` | Loja Palmeira dos Índios (Sustentável) | `palmeira.sust` | `#5fbf4a` |
| `teotonio-vilela` | Loja Teotônio Vilela | `teotonio` | `#19c2c2` |
| `coruripe` | Loja Coruripe | `coruripe` | `#2bbf9e` |

**Operadores reais por loja** (campo `operadores`, na ordem: equipe → Gerente → Auditora):
- **São Sebastião:** Maryanna Francielly Trajano da Silva · Nayara Soares Kimura · Kemilly Rafaelly Souza Silva (Gerente) · Amanda (Auditora)
- **Penedo:** Deise Gislaine Silva Vitor · Maria Fernanda Gomes Vieira · Joanna Queiroz · Maria Taciane (Gerente) · Amanda (Auditora)
- **Palmeira:** Maria Cicília Brito Veiga · Yasmin Abília Ferro da Silva · Kemilly Rafaelly Souza Silva (Gerente) · Amanda (Auditora)
- **Palmeira Sustentável:** Eduarda Pereira Costa Silva · Tayná Félix · Kemilly Rafaelly Souza Silva (Gerente) · Amanda (Auditora)
- **Teotônio Vilela:** Eliene Da Silva Santos · Josenildo Alves · Camille Kauane Da Silva Nunes · Shayane Ferreira · Maria Taciane (Gerente) · Amanda (Auditora)
- **Coruripe:** Ana Paula Amaral Santos Ismerim · Bruna Rayane Oliveira dos Santos · Maria Taciane (Gerente) · Amanda (Auditora)

> Maria Taciane gerencia Coruripe/Penedo/Teotônio; Kemilly gerencia Palmeira/São Sebastião/Sustentável; Amanda (auditora) está em todas — por isso repetem.

---

## 6. Modelo de negócio — a conferência (coração do app)

```
Apurado pela loja = Valor que restou + Σ Sangrias
Diferença         = Apurado − Venda do sistema
```

Classificação (`classifica(diferenca)`):
- `|diferença| < 0,005` → **`ok`** ("Bateu")
- `diferença < 0` → **`falta`** (apurou MENOS que vendeu — faltou dinheiro)
- `diferença > 0` → **`sobra`** (apurou MAIS — sobrou dinheiro)

Exemplo: vendeu R$ 1.000, sangrou R$ 200, restou R$ 800 → apurado 800 + 200 = 1.000 = venda → **bate, OK**.

**De onde vem a venda do sistema:** hoje o financeiro **digita** na hora de conferir (decisão confirmada pelo usuário). Futuro possível: importar de CSV/ERP (RetaguardaGB) — ver §16.

**Sangria** = retirada de dinheiro do caixa, itemizada: `{ valor, doc (CPF/CNPJ do destino, com validação de dígito verificador), nota (opcional), data, motivo }`.

> **Fundo de troco — questão de regra em aberto (NÃO é bug):** se a loja deixa um troco fixo no caixa, esse valor entra no "valor que restou", então a conferência vai acusar **sobra todo dia, igual ao troco**. Se as lojas usam fundo, é preciso adicionar um campo "fundo de troco" que o app **desconta do apurado antes de comparar** com a venda: `apurado = (restou − fundo) + sangria`. Aguardando confirmação do usuário se usam fundo.

---

## 7. Ciclo de vida do caixa

```
loja cria/edita ──envia──► [enviado] ──financeiro confere (informa venda)──► [conferido] 🔒
                                ▲                                                  │
                                └──────────── financeiro reabre (c/ motivo) ◄──────┘
                                                                                   │
                                          financeiro exclui (soft-delete, c/ motivo)
```

- **enviado:** criado pela loja, aguardando conferência. Loja ainda pode **editar**.
- **conferido:** financeiro informou a venda; fica **travado** (loja não edita mais). Carrega `vendaSistema`, `diferenca`, `resultado`.
- **reabrir:** financeiro destrava (volta a `enviado`) — **limpa** `vendaSistema`/`diferenca`/`resultado`; a loja corrige e reenvia. Registra motivo na trilha.
- **excluir:** soft-delete (`excluido = true`), com motivo e autor na trilha. Não some do banco, só some da lista.

Toda ação entra na **trilha de auditoria** (`audit[]`): `{ acao, por, papel, em, obs }`.

---

## 8. Papéis e permissões

| Ação | Loja | Financeiro |
|---|:---:|:---:|
| Criar caixa | ✅ (só a sua) | ❌ |
| Editar caixa (enquanto enviado) | ✅ (só a sua) | ❌ |
| Conferir (informar venda) | ❌ | ✅ |
| Reabrir | ❌ | ✅ |
| Excluir | ❌ | ✅ |
| Ver todas as lojas | ❌ (só a sua) | ✅ |

Funções: `canEdit(rec)` (loja, e não conferido), `canConferir()` / `canReabrir()` / `canDelete()` (financeiro).

**O financeiro não lança nem edita nada — só confere/reabre/exclui.** A tela do financeiro é **coluna única** (`.detail-grid.single`), **sem** o formulário de lançar caixa.

---

## 9. Modelo de dados

**Closing (caixa)** — criado por `makeClosing()`:
```js
{
  id: 'c_<createdAt>',
  createdAt,            // id único (uid())
  storeId,             // ex.: 'penedo'
  date,                // 'YYYY-MM-DD'
  sobra,               // valor que restou (número)
  sangrias: [ {valor, doc, nota, data, motivo}, ... ],
  totalSangria,        // Σ sangrias
  totalDia,            // sobra + totalSangria  (= "apurado")
  status,              // 'enviado' | 'conferido'
  operador,            // nome de quem fechou (carimbado na "porta do operador")
  excluido,            // bool (soft-delete)
  audit: [ {acao, por, papel, em, obs?}, ... ],

  // adicionados na conferência:
  vendaSistema,        // número (venda informada pelo financeiro)
  diferenca,           // totalDia − vendaSistema
  resultado,           // 'ok' | 'falta' | 'sobra'

  // adicionados na exclusão:
  excluidoPor, excluidoMotivo, excluidoEm
}
```

**Chave no "banco":** `closing:<storeId>:<createdAt>` (constante `keyFor`).

---

## 10. Arquitetura do código (mapa por função)

Tudo dentro de um único `<script>`. Ordem aproximada:

- **`STORES`, `storeById`** — lojas/operadores.
- **`Store`** — camada de dados (Map em memória): `get/set/del/list`. **← ponto de troca pra Firebase.**
- **`USERS`, `login`, `logout`** — autenticação (hardcoded).
- **Helpers:** `uid`, `money` (Intl BRL), `fmtDate`, `fmtDateTime`, `todayISO`, `parseNum` (string "1.234,56" → número), `esc` (XSS), `onlyDigits`, `formatDoc`, `docKind`, `sumSangria`.
- **Validação:** `isValidCPF`, `isValidCNPJ`, `isValidDoc` (dígitos verificadores reais).
- **Período:** `PERIOD_LABEL`, `periodMatch` (mes / mes-1 / 90d / tudo).
- **`maskMoneyInput`** — máscara de centavos ("64000" → "640,00").
- **Estado:** `session`, `state` (`{period:'90d', operator}`), `editing`, `route`.
- **Modelo/ciclo:** `mapSangrias`, `makeClosing`, `getClosings`, `getAllClosings`, `findClosing`, `dateClashes`, `saveNewClosing`, `updateClosing`, `classifica`, `resultadoTexto`, `conferirClosing`, `reabrirClosing`, `excluirClosing`.
- **`seedSamples`** — dados de exemplo (roda no boot; cada loja tem ≥1 caixa Enviado + demos de OK/Falta/Sobra).
- **`toast`, `modal`** — UI utilitária. `modal({title, message, input?, onConfirm})`; `input.money:true` aplica máscara.
- **Exportação:** `ensureXLSX`, `gatherExport`, `toCSV`, `downloadText`, `runExport`. Exporta 2 abas (Fechamentos + Sangrias); Fechamentos inclui Venda (sistema)/Diferença/Resultado.
- **Componentes:** `topbar`, `metricCard`, `periodSelect`, `statusChip`, `bindHeaderControls`.
- **Telas:** `viewLogin`, `viewDashboard`, `viewStore`. Roteamento em `render()` (login → dashboard/store). Boot: `seedSamples()` então `render()`.

---

## 11. Camada de dados (`Store`) — a "costura" pro Firebase

```js
const Store = (() => {
  const mem = new Map();
  async function get(key){ ... }
  async function set(key, value){ ... }
  async function del(key){ ... }
  async function list(prefix){ ... }   // filtra chaves por prefixo
  return { get, set, del, list };
})();
```

**Já é assíncrono** (todas retornam Promise) justamente pra trocar por Firestore sem mexer no resto. Todo acesso a dados passa por `getClosings`/`getAllClosings`/`findClosing`/`Store.set`/`Store.del` — que por baixo usam só esses 4 métodos. Trocar o miolo do `Store` ≈ portar o app inteiro. Ver §16.

---

## 12. Design / UI

- **Estilo:** dark "tipo Raycast" com toques **Frutiger Aero** — aurora de fundo (`.bg`, 4 blobs radiais animados em CSS, `pointer-events:none`, `z-index:0`; conteúdo em `#app`, `z-index:1`).
- **Logo:** monograma dourado **"AM"** (Alcina Maria) embutido em base64 na CSS var **`--logo`** (usada em `.orb-logo` e `.login-orb`). *Obs.: o app se chama "Acqua Fluxo" mas a logo é "AM" — o usuário pode querer alinhar.*
- **Fontes:** Inter (interface) + monospace pra códigos.
- **Cores:** `--bg:#090d12`; cada loja tem sua `color` (usada nos orbs dos cards).
- **Elementos no body:** `<div id="app"></div>` + `<div class="toast" id="toast"></div>`.
- **Máscara de dinheiro** em todos os inputs de valor; **chips** de status (Enviado / Conferido / Falta R$X / Sobra R$X); bloco **`.cc-recon`** mostra Venda × Apurado × Diferença nos caixas conferidos.

---

## 13. Regras críticas / armadilhas (LEIA antes de mexer)

1. **NUNCA usar `<form>` / submit.** Login e formulários usam `<button type="button">` + listener de `click`. O sandbox de iframe **bloqueia** submit de form. Reintroduzir `<form>`/submit quebra login e envio. Já levou um tempo pra descobrir — não regredir.
2. **Dados em memória resetam no reload.** Qualquer teste de "salvou?" precisa ser na mesma sessão. (Resolve com Firebase.)
3. **Scroll do financeiro:** a lista de caixas (`.history`) tinha `max-height:600px; overflow:auto`, o que travava o scroll na tela de coluna única (financeiro) no celular. **Corrigido:** em `.detail-grid.single .history` e no `@media (max-width:880px)`, a lista usa `max-height:none; overflow:visible` (a página inteira rola). Não reintroduzir o scroll interno aninhado nessas situações.
4. **Porta do operador (só loja):** ao logar como loja, cai direto em "Quem está fechando o caixa?" com os nomes reais da loja + "Outro…". O nome escolhido (`state.operator`) é carimbado no caixa e na trilha. Financeiro não passa por isso.
5. **Período padrão = `90d`** (Últimos 90 dias). Foi escolhido pra os caixas recentes **sempre aparecerem** (com "Mês atual", perto da virada do mês, caixas de dias anteriores sumiam). Os contadores do painel ("A conferir", "Divergências", selos por loja) são **filtrados pelo período** pra baterem com a lista que aparece ao abrir a loja.

---

## 14. Funcionalidades já implementadas (checklist)

- [x] Login por papel (loja / financeiro), com contas de teste no rodapé.
- [x] Porta do operador (loja escolhe quem está fechando).
- [x] Lançar caixa: sangrias itemizadas (valor, CPF/CNPJ validado, nota, data, motivo) + valor que restou; total calculado ao vivo.
- [x] Bloqueio de **caixa duplicado** no mesmo dia (exclui o próprio registro ao editar).
- [x] Editar caixa (loja, enquanto enviado).
- [x] **Conferência (reconciliação)**: financeiro informa a venda → Bateu / Falta R$X / Sobra R$X.
- [x] Reabrir (com motivo) e Excluir (soft-delete, com motivo).
- [x] Trilha de auditoria por caixa.
- [x] Painel do financeiro: A conferir, Divergências, Pendentes hoje, Total do período; selos por loja (a conferir / divergência).
- [x] Filtro de período (Mês atual / Mês passado / 90 dias / Tudo).
- [x] Exportação Excel (SheetJS, fallback CSV) com Fechamentos (inclui Venda/Diferença/Resultado) + Sangrias.
- [x] Máscara de dinheiro; modal de confirmação/motivo.

---

## 15. Testes

Validação foi feita com **jsdom** (Node) carregando o arquivo real e simulando cliques — login, lançar, conferir, reabrir, editar, duplicado, permissões, filtros, exportação. Última rodada: ~38 asserções passando, 0 erro de runtime.

> O jsdom **não renderiza CSS/layout**, então bugs visuais (ex.: scroll, corte de conteúdo) **não** são pegos por ele — precisam de verificação no navegador de verdade. As suítes (`harnessN.js`) eram temporárias; ao recriar o ambiente, vale refazer o harness carregando o HTML e disparando os fluxos acima.

**Padrão de smoke test (se for recriar):** abrir como `financeiro`/`fin123`, entrar numa loja, conferir um caixa "Enviado" (digitar a venda), conferir que aparece Bateu/Falta/Sobra e o bloco de conferência; depois abrir como loja, lançar um caixa e ver entrar como "Enviado".

---

## 16. Pendências e próximos passos

**A) Firebase (próximo passo principal — "depois implemento").** Tirar o reset a cada reload. Plano:
- Trocar o miolo do objeto **`Store`** (4 métodos) por **Firestore** (coleção de closings; chave `closing:<storeId>:<createdAt>` vira doc id ou campos). Manter as funções `getClosings/getAllClosings/findClosing` por cima.
- Trocar **`USERS`** por **Firebase Auth**.
- Manter **single-file**: importar o SDK do Firebase via CDN (cdnjs/gstatic) — sem build.
- Entregar **Security Rules** (loja só lê/escreve a própria loja; financeiro lê todas e só altera status/conferência).
- **Otimizar leitura** pra economizar cota: consultar **só o período atual** (não `getAll` geral). Tratar erro de rede (toast/retry).
- Pesquisa anterior confirmou: o **plano gratuito (Spark)** sobra pra esse volume (Firestore grátis: ~1 GiB, 50k leituras/dia, 20k escritas/dia; Auth grátis até 50k MAU). Regras de segurança são obrigatórias. (SMS auth **não** é grátis — usar e-mail/senha ou similar.)

**B) Fundo de troco** (§6) — se as lojas usam, adicionar campo e descontar do apurado antes de comparar. **Aguardando confirmação do usuário.**

**C) Importar a venda do sistema** automaticamente (do ERP/RetaguardaGB, provavelmente via CSV — o usuário já processa CSVs tipo GerencialVendas em outras ferramentas dele), em vez de o financeiro digitar. Bom de fazer junto com o Firebase.

**D) Exportação no navegador real** — confirmar que o download (.xlsx/.csv) funciona fora de sandbox (dentro de preview embutido pode ser bloqueado).

**E) Cosmético** — nome "Acqua Fluxo" × logo "AM": decidir se alinha.

---

## 17. Resumo de uma linha

App single-file (HTML/CSS/JS, sem build) de fechamento de caixa de 6 lojas O Boticário, com conferência financeira (apurado = restou + sangria, comparado com a venda do sistema → Bateu/Falta/Sobra), dados em memória prontos pra virar Firebase, e a regra do **fundo de troco** ainda a confirmar.
