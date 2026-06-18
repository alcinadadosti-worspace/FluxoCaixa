// =============================================================================
// Acqua Fluxo — backend de alertas no Slack (Fase 1: caixa fechado + divergência)
// Node 18+ (fetch nativo). Deploy: Render › Web Service › Root Directory: server
// Variáveis de ambiente (no Render, NÃO no código):
//   SLACK_BOT_TOKEN   token do bot do Slack (xoxb-...)            [obrigatório]
//   SLACK_CHANNEL     canal do financeiro (ID "C0..." ou "#nome") [obrigatório]
//   FIREBASE_API_KEY  apiKey do projeto (valida quem chama)       [obrigatório]
//   ALLOWED_ORIGINS   origens liberadas (CSV) ou "*"              [opcional]
// =============================================================================
import express from 'express';
import cors from 'cors';

const {
  SLACK_BOT_TOKEN = '',
  SLACK_CHANNEL = '',
  FIREBASE_API_KEY = '',
  ALLOWED_ORIGINS = '*',
  PORT = 3000,
} = process.env;

const app = express();
app.use(express.json());
const origins = ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.includes('*') ? true : origins }));

// ---- Slack ----
async function slackPost(text){
  if(!SLACK_BOT_TOKEN || !SLACK_CHANNEL) throw new Error('Slack não configurado (SLACK_BOT_TOKEN / SLACK_CHANNEL)');
  const r = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: 'Bearer ' + SLACK_BOT_TOKEN },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text }),
  });
  const j = await r.json();
  if(!j.ok) throw new Error('Slack: ' + j.error);
  return j;
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

// ---- Rotas ----
app.get('/health', (_req, res) => res.json({ ok:true, service:'acqua-fluxo-bot' }));

app.post('/notify/caixa-fechado', async (req, res) => {
  if(!(await requireUser(req, res))) return;
  try{
    const { loja = '—', operador = '—', total = '—', data = '—' } = req.body || {};
    await slackPost(`🔔 *Caixa fechado* — ${loja}\nOperador(a): *${operador}*  ·  Data: ${data}\nTotal apurado: *${total}*`);
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ ok:false, error:String(e.message || e) }); }
});

app.post('/notify/divergencia', async (req, res) => {
  if(!(await requireUser(req, res))) return;
  try{
    const { loja = '—', data = '—', resultado = '', diferenca = '—', venda = '—', apurado = '—' } = req.body || {};
    const emoji = resultado === 'falta' ? '🔴' : '🟠';
    await slackPost(`${emoji} *Divergência na conferência* — ${loja}\nData: ${data}  ·  Resultado: *${String(resultado).toUpperCase()} ${diferenca}*\nVenda (sistema): ${venda}  ·  Apurado (loja): ${apurado}`);
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ ok:false, error:String(e.message || e) }); }
});

app.listen(PORT, () => console.log('Acqua Fluxo bot ouvindo na porta ' + PORT));
