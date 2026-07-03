# AI Tutor — Deploy no CoupleMed (Cloudflare Pages)

O AI Tutor **já está integrado** neste pacote. Você não precisa copiar nenhum arquivo manualmente — tudo já está no lugar certo:

```
functions/tutor.js            ← backend serverless (responde em /tutor)
css/ai-tutor-widget.css       ← já linkado no app.html
js/ai-tutor-widget.js         ← já incluído no app.html
```

O widget aparece em toda a plataforma (`app.html`) através do botão flutuante 🎓 no canto inferior direito. Na página **AI Tutor** do menu lateral, o painel abre automaticamente.

## Único passo obrigatório: a chave da OpenAI

Sem isso o chat responde com "Erro na API da OpenAI".

1. Painel Cloudflare → **Workers & Pages** → projeto **sweet-butterfly-3411**.
2. **Settings** → **Environment variables** → **Add variable**.
3. Nome exatamente: `OPENAI_API_KEY`
4. Valor: sua chave (`sk-...`).
5. Marque **Encrypt** (vira Secret).
6. Aplique em **Production** e **Preview**.
7. Salve e faça um novo deploy (ou `git push`) para a função subir.

> Não tem chave? platform.openai.com → API keys → Create new secret key. Configure um limite em Billing → Usage limits para evitar surpresas. O modelo usado é o `gpt-4o-mini` (barato).

## Como testar depois do deploy

1. Faça login, entre na plataforma.
2. Clique no 🎓 (ou no item **AI Tutor** do menu).
3. Escolha um modo e digite um tema (ex.: "hipersensibilidade tipo III").
4. Resposta guiada por perguntas = modo Socrático ativo e chave funcionando.

## Integração com os Flashcards (exclusiva desta versão)

No modo **Gerador de Flashcards**, peça cards sobre um tema. A resposta vem no formato `frente :: verso`, e aparece um botão **"⇄ Importar nos Flashcards"**. Ao clicar, os cards entram automaticamente num deck chamado **"AI Tutor"** dentro do módulo Flashcards daquele usuário, já prontos para revisão espaçada.

## Sincronização com a plataforma

- **Bilíngue**: o widget acompanha a bandeira EN/PT do site em tempo real.
- **Temas**: segue o modo claro/escuro da página.
- **Por usuário**: cada usuário (John, Alysson, guests) tem sua própria conversa, salva durante a sessão. Trocar de modo limpa a conversa; o botão ⟲ também limpa.
- **Privacidade**: a chave da OpenAI fica só no servidor (Cloudflare), nunca no navegador.

## Solução de problemas

| Sintoma | Causa | Solução |
|---|---|---|
| "Erro: Erro na API da OpenAI" | Chave ausente/inválida/sem crédito | Confira o nome `OPENAI_API_KEY` e o saldo |
| Botão 🎓 não aparece | Cache antigo | Cmd+Shift+R para recarregar |
| "Erro de conexão" | Função `/tutor` não publicada | Confirme que `functions/` está na raiz do deploy |
| 401/403 em /tutor | Variável só num ambiente | Aplique em Production **e** Preview |
