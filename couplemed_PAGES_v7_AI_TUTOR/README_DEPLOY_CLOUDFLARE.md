# CoupleMed — Deploy Cloudflare

Este pacote foi preparado para deploy em Cloudflare Pages.

## Domínios
- `couplemed.com`
- `www.couplemed.com`

## Estrutura
- `index.html`: página inicial/login.
- `transition.html`: página de transição de 7 segundos para John e Alysson.
- `app.html`: plataforma de estudos.
- `css/styles.css`: estilos responsivos.
- `js/site.js`: login, transição, idioma, menu e navegação.
- `assets/`: imagens, logos e bandeiras.
- `robots.txt`: bloqueio de indexação.

## Cloudflare
- Pages: publicar este ZIP/estrutura.
- R2: usar para arquivos pesados em `arquivos/couplemed/`.
- Não misturar com `arquivos/medjohn/`.

## Importante
Este pacote é front-end estático. Contagem dinâmica e preferências usam localStorage/sessionStorage até a integração posterior com backend/R2/API.
