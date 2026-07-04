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

    /* ---------- arquivos estáticos (public/) ---------- */
    return env.ASSETS.fetch(request);
  }
};
