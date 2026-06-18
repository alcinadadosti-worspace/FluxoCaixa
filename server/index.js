// =============================================================================
// Acqua Fluxo — backend (alertas Slack + auditoria surpresa) e serve o app.
// DM (nunca canais). Node 18+. Deploy: Render › Web Service › Root Directory: server
// Variáveis de ambiente (no Render, NÃO no código):
//   SLACK_BOT_TOKEN           token do bot (xoxb-...)                      [obrig.]
//   FINANCE_SLACK_IDS         IDs Slack do financeiro (CSV)               [obrig.]
//   FIREBASE_API_KEY          apiKey do projeto (valida quem chama)        [obrig.]
//   FIREBASE_SERVICE_ACCOUNT  JSON da chave de serviço (auditoria/Fase 2)  [Fase 2]
//   ALLOWED_ORIGINS           origens liberadas (CSV) ou "*"              [opcional]
// =============================================================================
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const {
  SLACK_BOT_TOKEN = '',
  FINANCE_SLACK_IDS = '',
  FIREBASE_API_KEY = '',
  FIREBASE_SERVICE_ACCOUNT = '',
  ALLOWED_ORIGINS = '*',
  PORT = 3000,
} = process.env;

const financeIds = FINANCE_SLACK_IDS.split(',').map(s => s.trim()).filter(Boolean);
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brl = n => BRL.format(Number(n) || 0);

// ---- Firebase Admin (auditoria — Fase 2) ----
let db = null;
if(FIREBASE_SERVICE_ACCOUNT){
  try{
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) });
    db = admin.firestore();
    console.log('Firebase Admin OK — auditoria ativa.');
  }catch(e){ console.error('FIREBASE_SERVICE_ACCOUNT inválido:', e.message); }
} else {
  console.log('Sem FIREBASE_SERVICE_ACCOUNT — auditoria (Fase 2) desativada.');
}

const app = express();
app.use(express.json());
const origins = ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.includes('*') ? true : origins }));

// ---- Slack ----
async function slackApi(method, payload){
  const r = await fetch('https://slack.com/api/' + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: 'Bearer ' + SLACK_BOT_TOKEN },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if(!j.ok) throw new Error(method + ': ' + j.error);
  return j;
}
async function slackDM(userId, text){
  if(!SLACK_BOT_TOKEN) throw new Error('SLACK_BOT_TOKEN não configurado');
  const open = await slackApi('conversations.open', { users: userId });
  await slackApi('chat.postMessage', { channel: open.channel.id, text });
}
async function dmFinance(text){
  if(!financeIds.length) throw new Error('FINANCE_SLACK_IDS não configurado');
  for(const id of financeIds) await slackDM(id, text);
}

// ---- valida o login do Firebase (ID token enviado pelo app) ----
async function verifyUser(req){
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if(!token || !FIREBASE_API_KEY) return null;
  try{
    const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }),
    });
    const j = await r.json();
    const u = j.users && j.users[0];
    return u && u.email ? { email: u.email } : null;
  }catch(_){ return null; }
}
async function requireUser(req, res){
  const u = await verifyUser(req);
  if(!u){ res.status(401).json({ ok:false, error:'não autorizado' }); return null; }
  return u;
}

// ---- Rotas: saúde + alertas (Fase 1) ----
app.get('/health', (_req, res) => res.json({ ok:true, service:'acqua-fluxo-bot', auditoria: !!db }));

app.post('/notify/caixa-fechado', async (req, res) => {
  if(!(await requireUser(req, res))) return;
  try{
    const { loja = '—', operador = '—', total = '—', data = '—' } = req.body || {};
    await dmFinance(`🔔 *Caixa fechado* — ${loja}\nOperador(a): *${operador}*  ·  Data: ${data}\nTotal apurado: *${total}*`);
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ ok:false, error:String(e.message || e) }); }
});

app.post('/notify/divergencia', async (req, res) => {
  if(!(await requireUser(req, res))) return;
  try{
    const { loja = '—', data = '—', resultado = '', diferenca = '—', venda = '—', apurado = '—' } = req.body || {};
    const emoji = resultado === 'falta' ? '🔴' : '🟠';
    await dmFinance(`${emoji} *Divergência na conferência* — ${loja}\nData: ${data}  ·  Resultado: *${String(resultado).toUpperCase()} ${diferenca}*\nVenda (sistema): ${venda}  ·  Apurado (loja): ${apurado}`);
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ ok:false, error:String(e.message || e) }); }
});

// ---- Rotas: auditoria surpresa (Fase 2) ----
const isFinance = email => email === 'financeiro@acqua.app';
const storeEmail = sid => sid + '@acqua.app';

// financeiro abre uma auditoria e o bot avisa a colaboradora
app.post('/audit/start', async (req, res) => {
  const u = await requireUser(req, res); if(!u) return;
  if(!isFinance(u.email)) return res.status(403).json({ ok:false, error:'apenas o financeiro' });
  if(!db) return res.status(503).json({ ok:false, error:'auditoria não configurada (FIREBASE_SERVICE_ACCOUNT ausente)' });
  try{
    const { storeId, loja = '—', colaborador, slackId, valorEsperado } = req.body || {};
    if(!storeId || !colaborador || !slackId || !(Number(valorEsperado) >= 0))
      return res.status(400).json({ ok:false, error:'dados incompletos' });
    const ref = await db.collection('auditorias').add({
      storeId, loja, colaborador, slackId,
      valorEsperado: Number(valorEsperado),
      status: 'pendente', criadoPor: u.email, criadoEm: Date.now(),
    });
    await slackDM(slackId, `🕵️ *Auditoria surpresa* — ${loja}\nOlá, ${colaborador}! Conte o dinheiro do caixa *agora* e *declare o valor no app* (abra o Acqua Fluxo na sua loja).`);
    res.json({ ok:true, auditId: ref.id });
  }catch(e){ res.status(500).json({ ok:false, error:String(e.message || e) }); }
});

// app da loja pergunta se há auditoria pendente para a colaboradora (NÃO devolve o valor esperado)
app.post('/audit/pending', async (req, res) => {
  const u = await requireUser(req, res); if(!u) return;
  if(!db) return res.json({ pendente: null });
  try{
    const { storeId, colaborador } = req.body || {};
    if(!storeId || !colaborador) return res.json({ pendente: null });
    if(u.email !== storeEmail(storeId)) return res.status(403).json({ ok:false, error:'loja diferente' });
    // consulta só por loja (índice automático) e filtra o resto no código — sem índice composto
    const snap = await db.collection('auditorias').where('storeId', '==', storeId).get();
    const d = snap.docs.find(x => x.get('colaborador') === colaborador && x.get('status') === 'pendente');
    if(!d) return res.json({ pendente: null });
    res.json({ pendente: { auditId: d.id, loja: d.get('loja') } });
  }catch(e){ res.status(500).json({ ok:false, error:String(e.message || e) }); }
});

// colaboradora declara o valor contado; backend compara às cegas e avisa o financeiro
app.post('/audit/declare', async (req, res) => {
  const u = await requireUser(req, res); if(!u) return;
  if(!db) return res.status(503).json({ ok:false, error:'auditoria não configurada' });
  try{
    const { auditId, valorDeclarado } = req.body || {};
    if(!auditId || !(Number(valorDeclarado) >= 0)) return res.status(400).json({ ok:false, error:'dados incompletos' });
    const ref = db.collection('auditorias').doc(auditId);
    const snap = await ref.get();
    if(!snap.exists) return res.status(404).json({ ok:false, error:'auditoria não encontrada' });
    const a = snap.data();
    if(u.email !== storeEmail(a.storeId)) return res.status(403).json({ ok:false, error:'loja diferente' });
    if(a.status !== 'pendente') return res.status(409).json({ ok:false, error:'auditoria já declarada' });
    const declarado = Number(valorDeclarado);
    const diferenca = +(declarado - a.valorEsperado).toFixed(2);
    const resultado = Math.abs(diferenca) < 0.005 ? 'ok' : (diferenca < 0 ? 'falta' : 'sobra');
    await ref.update({ valorDeclarado: declarado, diferenca, resultado, status: 'declarado', declaradoEm: Date.now() });
    const txt = resultado === 'ok'
      ? `✅ *Auditoria declarada* — ${a.loja}\n${a.colaborador} declarou *${brl(declarado)}* — *bateu* com o esperado.`
      : `${resultado === 'falta' ? '🔴' : '🟠'} *Auditoria declarada* — ${a.loja}\n${a.colaborador} declarou *${brl(declarado)}*. Esperado: ${brl(a.valorEsperado)} · *${resultado.toUpperCase()} ${brl(Math.abs(diferenca))}*`;
    try{ await dmFinance(txt); }catch(_){}
    res.json({ ok:true, diferenca, resultado });   // o app mostra o aviso na tela dela
  }catch(e){ res.status(500).json({ ok:false, error:String(e.message || e) }); }
});

// ---- Serve o app (front-end), na raiz do repositório (um deploy só) ----
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '..')));

app.listen(PORT, () => console.log('Acqua Fluxo bot ouvindo na porta ' + PORT));
