// ---------------------------------------------------------------------------
// Edge Function "tafelrush-signup" – account maken met gebruikersnaam + wachtwoord.
//
// Waarom een functie (en niet gewoon signUp in de game)?
//   • Spelers hebben geen e-mailadres. Supabase Auth werkt met e-mail; de game
//     gebruikt daarom een vast nep-adres per gebruikersnaam. Zo'n account moet
//     meteen actief zijn ("bevestigd"), zonder bevestigingsmail.
//   • Dat kan alleen met de geheime service_role-sleutel, en die hoort NOOIT in
//     de game. Deze functie draait bij Supabase; daar is de sleutel automatisch
//     beschikbaar (SUPABASE_SERVICE_ROLE_KEY).
//   • Zo hoef je de instelling "Confirm email" van je project NIET uit te zetten
//     (je andere apps blijven dus precies zoals ze zijn).
//
// Wat hij doet: gebruikersnaam/wachtwoord controleren → account maken in
// Supabase Auth (bevestigd) → spelerrij in tafelrush.players. Inloggen doet de
// game daarna zelf.
// ---------------------------------------------------------------------------
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

// Alleen vanaf deze websites mag een account gemaakt worden
const ALLOWED_ORIGINS = [
  'https://tafelrush.meesterdanny.com',
  'https://raizy93.github.io',
  'http://localhost:8080',
];
const EMAIL_DOMAIN = 'spelers.meesterdanny.com';   // moet gelijk zijn aan CONFIG.accounts.emailDomain in de game

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = { ...cors(origin), 'Content-Type': 'application/json' };
  const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply(405, { error: 'Alleen POST.' });
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return reply(403, { error: 'Account maken kan alleen vanuit Tafel Rush.' });

  let body: { username?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return reply(400, { error: 'Ongeldig verzoek.' }); }

  const username = String(body.username ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return reply(400, { error: 'Gebruik 3 tot 20 tekens: letters, cijfers en _.' });
  if (password.length < 6 || password.length > 72) return reply(400, { error: 'Kies een wachtwoord van minstens 6 tekens.' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. account in Supabase Auth (meteen bevestigd; er wordt niets gemaild)
  const { data, error } = await admin.auth.admin.createUser({
    email: `${username}@${EMAIL_DOMAIN}`,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error || !data.user) {
    const taken = error && (error.status === 422 || /already|exists|registered/i.test(error.message));
    if (taken) return reply(409, { error: 'Deze gebruikersnaam is al bezet. Kies een andere.' });
    if (error && /password/i.test(error.message)) return reply(400, { error: 'Dit wachtwoord is te makkelijk. Kies een ander.' });
    console.error('createUser mislukt:', error && error.status, error && (error.code || ''), error && error.message);
    return reply(500, { error: 'Account maken lukte niet. Probeer het later nog eens.', detail: 'A' + ((error && error.status) || '') + ' ' + ((error && (error.code || error.message)) || '') });
  }

  // 2. spelerrij in Tafel Rush (lukt dat niet, dan het account weer opruimen)
  const { error: playerError } = await admin.schema('tafelrush').from('players')
    .insert({ user_id: data.user.id, username, display_name: username });
  if (playerError) {
    console.error('players-insert mislukt:', playerError.code, playerError.message);
    await admin.auth.admin.deleteUser(data.user.id);
    return reply(500, { error: 'Account maken lukte niet. Probeer het later nog eens.', detail: 'P ' + (playerError.code || playerError.message) });
  }

  return reply(200, { ok: true, username });
});
