# Acqua Fluxo — Fechamento de Caixa

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

- **Financeiro:** usuário `financeiro` · senha `fin123` (vê e confere todas as lojas).
- **Loja:** usuário = **nome da loja** (ex.: `Penedo`, `São Sebastião`) · senha = **código da loja**.
  - Também aceita o id curto (`penedo`, `sao.sebastiao`).
  - Enquanto os códigos não forem cadastrados, a senha provisória é `loja123`.

## Configuração (as 2 coisas no topo do `<script>`)

No início do `<script>` há um bloco **">>> CONFIGURE AQUI <<<"** com:

1. `firebaseConfig` — cole a configuração do seu projeto Firebase (deixe vazio para rodar só em memória).
2. `STORE_CODES` — o código (senha) de cada loja.

### Ligar o Firebase (persistência na nuvem)

1. Crie um projeto em <https://console.firebase.google.com> (plano **Spark/grátis** já basta).
2. Ative **Firestore Database** e o método de login **Anônimo** (Authentication › Sign-in method).
3. Em *Configurações do projeto › Seus apps › Web*, copie o objeto de config e cole em `firebaseConfig`.
4. Publique as **regras de segurança** do Firestore (baseline — exige usuário autenticado):

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /closings/{doc} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

   > MVP: o login do app ainda é local (nome + código), então as regras só exigem que o cliente esteja
   > autenticado (anônimo). Regras por loja (uma loja não mexe na outra) virão com Firebase Auth real (fase 2).

Com `firebaseConfig` preenchido, os dados passam a ser salvos na coleção `closings` e **não resetam mais** ao recarregar.

## Pendências / próximos passos

- [ ] Preencher os **códigos das lojas** em `STORE_CODES`.
- [ ] Criar o projeto Firebase e colar o `firebaseConfig`.
- [ ] Fase 2: Firebase Auth por loja + regras por loja.
- [ ] (Opcional) Importar a venda do sistema por CSV em vez de digitar.

Ver `CONTEXTO_ACQUA_FLUXO.md` para o handoff técnico completo.
