# Configurar o Firebase (persistência + login por código)

Este guia liga o Acqua Fluxo ao Firebase. Depois disso:
- os dados ficam **salvos na nuvem** (não resetam mais ao recarregar);
- o **código** de cada loja e do financeiro vira a **senha de verdade** (Firebase Authentication) — o código **não fica no app**.

Você faz tudo uma vez, pelo navegador. O **plano grátis (Spark)** basta para esse uso.

---

## 1. Criar o projeto
1. Acesse <https://console.firebase.google.com> e clique em **Adicionar projeto**.
2. Dê um nome (ex.: `acqua-fluxo`). Pode desativar o Google Analytics. Clique em **Criar projeto**.

## 2. Pegar a configuração (firebaseConfig)
1. Na tela inicial do projeto, clique no ícone **`</>`** (app **Web**) para registrar um app. Dê um apelido (ex.: `acqua`). **Registrar app**.
2. Vai aparecer um trecho com `const firebaseConfig = { ... }`. **Copie esse objeto inteiro.**
3. Cole no arquivo `acqua-fluxo-caixa.html`, no bloco **">>> CONFIGURE AQUI <<<"**, substituindo o `firebaseConfig` que está vazio.

## 3. Ativar o login por código (Authentication)
1. Menu lateral › **Authentication** › **Começar**.
2. Em **Sign-in method**, ative **E-mail/senha** e **Salvar**.
3. Vá na aba **Users** › **Adicionar usuário** e crie **um usuário para cada acesso**, com o **e-mail exato** abaixo e a **senha = o código** correspondente:

   | Acesso | E-mail (exato) | Senha |
   |---|---|---|
   | Financeiro | `financeiro@acqua.app` | _o código do financeiro_ |
   | São Sebastião | `sao-sebastiao@acqua.app` | _o código da loja_ |
   | Penedo | `penedo@acqua.app` | _o código da loja_ |
   | Palmeira dos Índios | `palmeira@acqua.app` | _o código da loja_ |
   | Palmeira (Sustentável) | `palmeira-sustentavel@acqua.app` | _o código da loja_ |
   | Teotônio Vilela | `teotonio-vilela@acqua.app` | _o código da loja_ |
   | Coruripe | `coruripe@acqua.app` | _o código da loja_ |

   > Os e-mails são **internos** — não precisam existir de verdade nem receber nada. O que importa é o e-mail **exatamente** como está na tabela.
   >
   > ⚠️ **Senha:** o Firebase exige no mínimo **6 caracteres**, e os códigos têm 5 dígitos. Por isso a senha de cada usuário é **o código + um zero no FINAL** (ex.: código `24669` → senha `246690`). A pessoa da loja continua digitando só o código de 5 dígitos; o app acrescenta o zero sozinho.

## 4. Criar o banco (Firestore) e publicar as regras
1. Menu lateral › **Firestore Database** › **Criar banco de dados** › comece em **modo de produção** › escolha a região (ex.: `southamerica-east1` / São Paulo).
2. Abra a aba **Regras**, apague o que estiver lá, cole o conteúdo abaixo e clique em **Publicar**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       function isFin(){ return request.auth != null && request.auth.token.email == 'financeiro@acqua.app'; }
       function ownsStore(sid){ return request.auth != null && request.auth.token.email == sid + '@acqua.app'; }
       match /closings/{docId} {
         allow read:   if isFin() || (resource != null && ownsStore(resource.data.storeId));
         allow create: if isFin() || ownsStore(request.resource.data.storeId);
         allow update, delete: if isFin() || ownsStore(resource.data.storeId);
       }
       match /auditorias/{docId} {
         allow read:  if isFin();   // só o financeiro lê os resultados
         allow write: if false;     // ninguém escreve pelo navegador — só o backend (Admin)
       }
     }
   }
   ```

## 5. Pronto ✅
Abra o app: cada loja entra no **card dela + código**; o financeiro no **card Financeiro + código**. Os dados ficam salvos na nuvem e cada um só enxerga o que pode.

---

## Hospedar (recomendado)
O login do Firebase funciona melhor com o app **hospedado** (não aberto como arquivo local). Opções grátis: **Firebase Hosting**, **GitHub Pages**, **Netlify**. Dá pra fazer em poucos minutos — posso te guiar.

## Segurança (como fica)
- O código **nunca** fica no código do app — é a senha verificada pelo Firebase.
- As regras garantem que **cada loja só lê/escreve os próprios caixas** e que o **financeiro** vê e confere todas.
- Para trocar o código de uma loja: Authentication › Users › (o usuário) › **Redefinir senha**.
