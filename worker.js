/**
 * CoupleMed — Cloudflare Worker (AI Tutor backend + Static Assets)
 * Rota POST /tutor → chama OpenAI
 * Todo o restante → serve arquivos de ./public/
 */

const SYSTEM_PROMPTS = {
  socratico: `Você é um tutor socrático de USMLE Step 1, especialista em imunologia, cardiologia, hematologia e clínica médica.
NUNCA revele a resposta completa de imediato. Guie o aluno com perguntas intermediárias e pistas graduais até ele construir o raciocínio.
Só explique o mecanismo completo depois que o aluno tentar responder pelo menos uma vez.
Responda no idioma indicado pelo aluno (padrão: português), mantendo termos técnicos em inglês entre parênteses quando relevante para o vocabulário do exame.`,

  nbme: `Você é um redator de itens do comitê NBME criando questões estilo USMLE Step 1.
Ao gerar uma questão:
1. Escreva um caso clínico em parágrafo único (idade, sexo, queixa, história, exame físico, sinais vitais, exames).
2. Formule a pergunta pedindo o "melhor próximo passo" ou "diagnóstico mais provável".
3. Ofereça 5 alternativas plausíveis (A-E), com pelo menos 1 distratora de alto nível.
4. NÃO revele a resposta imediatamente. Espere a resposta do aluno.
5. Depois da resposta, explique o mecanismo fisiopatológico da correta E por que cada alternativa errada falha.
Priorize conteúdo de alto rendimento: imunologia, cardiologia, hematologia, farmacologia, patologia.
Responda no idioma indicado pelo aluno (padrão: português), termos técnicos em inglês entre parênteses.`,

  caso: `Você conduz uma discussão de caso clínico no estilo PBL (Problem-Based Learning).
Apresente o caso de forma progressiva, faça perguntas sobre hipóteses diagnósticas,
peça justificativa fisiopatológica antes de confirmar ou refutar hipóteses.
Responda no idioma indicado pelo aluno (padrão: português), com profundidade adequada a estudante de medicina do 6º semestre.`,

  erro: `Você ajuda o aluno a entender por que errou uma questão de USMLE.
Peça para o aluno colar a questão e a alternativa que ele escolheu.
Identifique se o erro foi: falha de conceito, erro de leitura da vinheta, confusão entre mecanismos parecidos, ou armadilha de alternativa.
Explique a "regra de prova" (takeaway memorável) ao final.
Responda no idioma indicado pelo aluno (padrão: português).`,

  anki: `Você transforma o conteúdo estudado na conversa em flashcards no formato "pergunta :: resposta"
(frente e verso separados por " :: "; exatamente um card por linha).
Esse formato é importado diretamente pelo módulo Flashcards da plataforma CoupleMed.
Foque em alto rendimento para USMLE Step 1. Não adicione numeração, títulos ou explicações fora do formato pedido.`
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* ---------- rota AI Tutor ---------- */
    if (url.pathname === '/tutor') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
      }
      if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);

      if (!env.OPENAI_API_KEY) return json({ error: 'OPENAI_API_KEY não configurada no Cloudflare' }, 500);

      let body;
      try { body = await request.json(); } catch { return json({ error: 'JSON inválido' }, 400); }

      const { pergunta, historico, modo } = body;
      if (!pergunta || typeof pergunta !== 'string') return json({ error: "Campo 'pergunta' é obrigatório" }, 400);
      if (pergunta.length > 6000) return json({ error: 'Pergunta muito longa (máx. 6000 caracteres)' }, 400);

      const historicoSeguro = (Array.isArray(historico) ? historico : [])
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map(m => ({ role: m.role, content: m.content.slice(0, 6000) }))
        .slice(-16);

      const systemPrompt = SYSTEM_PROMPTS[modo] || SYSTEM_PROMPTS.socratico;

      try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.3,
            max_tokens: 900,
            messages: [
              { role: 'system', content: systemPrompt },
              ...historicoSeguro,
              { role: 'user', content: pergunta }
            ]
          })
        });

        if (!resp.ok) {
          const errText = await resp.text();
          return json({ error: 'Erro na API da OpenAI', detail: errText.slice(0, 500) }, 502);
        }

        const data = await resp.json();
        const resposta = data.choices?.[0]?.message?.content || 'Sem resposta.';
        return json({ resposta });
      } catch (err) {
        return json({ error: 'Erro interno', detail: String(err) }, 500);
      }
    }

    /* ---------- rotas QBank (D1) ---------- */
    if (url.pathname.startsWith('/api/qbank')) {
      return handleQBank(request, env, url);
    }

    /* ---------- arquivos estáticos (public/) ---------- */
    return env.ASSETS.fetch(request);
  }
};

/**
 * Router do QBank sobre Cloudflare D1 (binding esperado: env.QBANK_DB).
 * Enquanto o D1 não estiver ligado no wrangler.toml, todas as rotas respondem
 * 503 com dbReady:false — o frontend detecta isso e continua em localStorage.
 * Isso deixa o backend "preparado" sem quebrar o site atual.
 *
 * Endpoints implementados (referência às Partes do prompt mestre):
 *   GET  /api/qbank/health                       → status do banco
 *   GET  /api/qbank/questions?system=&...         → Parte 2 (pool p/ Create Test)
 *   GET  /api/qbank/questions/:id/history?user=   → Parte 4.5 (indicador colorido)
 *   POST /api/qbank/attempts                       → Parte 3/4 (registra tentativa, imutável)
 *   GET  /api/qbank/analytics/pass-comparison?user=       → Parte 4.4
 *   GET  /api/qbank/analytics/root-cause-breakdown?user=  → Parte 5.3
 */
async function handleQBank(request, env, url) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });
  const path = url.pathname.replace(/^\/api\/qbank/, '') || '/';
  const db = env.QBANK_DB; // binding D1

  if (path === '/health' || path === '/') {
    return reply({ ok: true, dbReady: !!db, mode: db ? 'd1' : 'localStorage-fallback' });
  }
  if (!db) {
    // Backend preparado, mas D1 ainda não vinculado → frontend usa localStorage.
    return reply({ error: 'D1 not bound', dbReady: false, hint: 'Configure [[d1_databases]] no wrangler.toml e rode wrangler d1 execute com schema.sql' }, 503);
  }

  try {
    // ---- Parte 2: pool de questões para Create Test ----
    if (path === '/questions' && request.method === 'GET') {
      const p = url.searchParams;
      const where = [], bind = [];
      if (p.get('system'))     { where.push('system_id = ?');     bind.push(p.get('system')); }
      if (p.get('discipline')) { where.push('discipline_id = ?'); bind.push(p.get('discipline')); }
      if (p.get('category'))   { where.push('category_id = ?');   bind.push(p.get('category')); }
      if (p.get('difficulty')) { where.push('difficulty_level = ?'); bind.push(p.get('difficulty')); }
      const sql = 'SELECT * FROM questions' + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' LIMIT 500';
      const { results } = await db.prepare(sql).bind(...bind).all();
      return reply({ questions: results });
    }

    // ---- Parte 4.5: histórico de uma questão (indicador colorido) ----
    let m = path.match(/^\/questions\/([^/]+)\/history$/);
    if (m && request.method === 'GET') {
      const user = url.searchParams.get('user');
      const { results } = await db.prepare(
        'SELECT status, is_correct, pass_number, created_at FROM attempts WHERE user_id=? AND question_id=? ORDER BY created_at ASC'
      ).bind(user, m[1]).all();
      return reply({ history: results });
    }

    // ---- Parte 3/4: registrar tentativa (INSERT-only, nunca sobrescreve) ----
    if (path === '/attempts' && request.method === 'POST') {
      const b = await request.json();
      // Parte 4.1: pass_number calculado por attempts anteriores.
      const prior = await db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE user_id=? AND question_id=?')
        .bind(b.user_id, b.question_id).first();
      const n = (prior?.n ?? 0);
      const pass_number = n === 0 ? 1 : n === 1 ? 2 : n === 2 ? 3 : 99;
      const id = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO attempts (id,user_id,question_id,test_id,pass_number,selected_option,is_correct,status,time_spent_seconds,mode,flagged,strikethrough_options,root_cause_tag)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(id, b.user_id, b.question_id, b.test_id ?? null, pass_number, b.selected_option ?? null,
             b.is_correct ?? null, b.status, b.time_spent_seconds ?? 0, b.mode, b.flagged ? 1 : 0,
             JSON.stringify(b.strikethrough_options ?? []), b.root_cause_tag ?? null).run();
      return reply({ id, pass_number });
    }

    // ---- Parte 4.4: comparação por pass_number × system ----
    if (path === '/analytics/pass-comparison' && request.method === 'GET') {
      const user = url.searchParams.get('user');
      const { results } = await db.prepare(
        `SELECT pass_number, system_id,
                ROUND(100.0*SUM(is_correct)/COUNT(*),1) AS pct, COUNT(*) AS total
         FROM attempts WHERE user_id=? AND status!='omitted'
         GROUP BY pass_number, system_id`
      ).bind(user).all();
      return reply({ passComparison: results });
    }

    // ---- Parte 5.3: distribuição de causa-raiz ----
    if (path === '/analytics/root-cause-breakdown' && request.method === 'GET') {
      const user = url.searchParams.get('user');
      const { results } = await db.prepare(
        `SELECT root_cause_tag AS tag, COUNT(*) AS n FROM attempts
         WHERE user_id=? AND root_cause_tag IS NOT NULL GROUP BY root_cause_tag ORDER BY n DESC`
      ).bind(user).all();
      return reply({ rootCause: results });
    }

    return reply({ error: 'Not found' }, 404);
  } catch (err) {
    return reply({ error: 'D1 error', detail: String(err) }, 500);
  }
}
