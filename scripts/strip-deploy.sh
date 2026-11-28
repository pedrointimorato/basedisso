#!/bin/sh
# Cloudflare Pages: corre como build_command antes de publicar.
# Tira do diretório publicado os arquivos internos do repositório.
# Eles continuam no git; só não sobem como asset estático.
# O middleware (functions/_lib/privado.js) devolve 404 para estes caminhos,
# para não caírem no fallback da página inicial.
set -e
cd "${1:-.}"

rm -f \
  schema.sql \
  wrangler.toml wrangler.json wrangler.jsonc \
  .gitignore .gitattributes .gitmodules \
  package.json package-lock.json yarn.lock pnpm-lock.yaml \
  tsconfig.json jsconfig.json \
  README README.md LICENSE LICENCE CHANGELOG.md CHANGELOG \
  Makefile dockerfile Dockerfile docker-compose.yml docker-compose.yaml \
  wiki/build.py

# Qualquer .sql no topo (migrate-*.sql e futuros)
rm -f ./*.sql migrate-*.sql

rm -rf wiki/fonte scripts docs test tests .github

# Rede de segurança: extensões e nomes que não devem ir para o ar,
# fora de functions/ e .git (as Functions não são publicadas como asset).
# -path (em vez de -prune): -delete ativa -depth, que anula o -prune.
find . -type f \
  ! -path './.git/*' ! -path './functions/*' \
  \(     -name '*.sql' -o -name '*.toml' -o -name '*.md' -o -name '*.py' -o -name '*.sh' \
    -o -name '.env' -o -name '.env.*' -o -name '.dev.vars' -o -name '.npmrc' \
    -o -name 'Dockerfile' -o -name 'docker-compose.yml' -o -name 'Makefile' \
    -o -name '*.test.js' -o -name '*.spec.js' \
    -o -name 'wrangler.toml' -o -name 'package.json' -o -name '.gitignore' \
  \) -print -delete
