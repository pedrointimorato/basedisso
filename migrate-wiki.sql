-- MOR-46: wiki editável (páginas, revisões e editores autorizados) + importação das páginas atuais.
-- Aplicar uma vez no D1 basedisso-comments. INSERT OR IGNORE: pode rodar de novo sem duplicar.

CREATE TABLE IF NOT EXISTS wiki_paginas (
  slug TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  nav TEXT NOT NULL,
  grupo TEXT NOT NULL,
  resumo TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0,
  corpo TEXT NOT NULL,
  oculta INTEGER NOT NULL DEFAULT 0,
  rev_id TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wiki_revisoes (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  nav TEXT NOT NULL,
  grupo TEXT NOT NULL,
  resumo TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0,
  corpo TEXT NOT NULL,
  autor_id TEXT,
  autor_nome TEXT NOT NULL,
  resumo_edicao TEXT NOT NULL DEFAULT '',
  criado_em TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wiki_rev_slug ON wiki_revisoes(slug, criado_em);

CREATE TABLE IF NOT EXISTS wiki_editores (
  user_id TEXT PRIMARY KEY,
  concedido_por TEXT,
  concedido_por_nome TEXT,
  concedido_em TEXT NOT NULL
);

INSERT OR IGNORE INTO wiki_paginas (slug, titulo, nav, grupo, resumo, ordem, corpo, oculta, rev_id, criado_em, atualizado_em) VALUES ('index', 'Wiki do basedisso', 'Início da wiki', 'Visão geral', 'Regras e informações gerais sobre o basedisso: o que o site é, como cada parte funciona, o que pode e o que não pode, e como pedir ajuda.', 0, 'Esta wiki descreve o basedisso **como ele é hoje**. Ela é o lugar para tirar dúvidas sobre o que existe, quais são os limites de cada recurso e quais regras valem para todo mundo.

::: nota
**Se você tem pressa:** leia [Regras gerais](/wiki/regras/) e, se for postar, [Formatação](/wiki/formatacao/). Quer entender de onde vêm os selos e números ao lado dos nomes? Veja [Contas e privacidade](/wiki/contas/).
:::
[[cartoes]]

## Como esta wiki é mantida

As páginas são escritas pela administração e por contas que ela autoriza (veja [Como editar a wiki](/wiki/editar-a-wiki/)) e mudam quando o site muda. O texto só descreve o que o site realmente faz; quando algo ainda não existe (por exemplo, um botão de denunciar em cada item), a página diz isso com clareza em vez de prometer.

Encontrou uma informação errada, desatualizada ou faltando? Avise pela aba **ADM** da barra lateral ou em [b/adm](/b/adm/), que é o espaço público para queixas, elogios, sugestões e ofertas.', 0, 'd152ffeb-4d3f-5a74-8559-a5b3272b67c3', '2026-11-27T16:00:00.000Z', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em) VALUES ('d152ffeb-4d3f-5a74-8559-a5b3272b67c3', 'index', 'criacao', 'Wiki do basedisso', 'Início da wiki', 'Visão geral', 'Regras e informações gerais sobre o basedisso: o que o site é, como cada parte funciona, o que pode e o que não pode, e como pedir ajuda.', 0, 'Esta wiki descreve o basedisso **como ele é hoje**. Ela é o lugar para tirar dúvidas sobre o que existe, quais são os limites de cada recurso e quais regras valem para todo mundo.

::: nota
**Se você tem pressa:** leia [Regras gerais](/wiki/regras/) e, se for postar, [Formatação](/wiki/formatacao/). Quer entender de onde vêm os selos e números ao lado dos nomes? Veja [Contas e privacidade](/wiki/contas/).
:::
[[cartoes]]

## Como esta wiki é mantida

As páginas são escritas pela administração e por contas que ela autoriza (veja [Como editar a wiki](/wiki/editar-a-wiki/)) e mudam quando o site muda. O texto só descreve o que o site realmente faz; quando algo ainda não existe (por exemplo, um botão de denunciar em cada item), a página diz isso com clareza em vez de prometer.

Encontrou uma informação errada, desatualizada ou faltando? Avise pela aba **ADM** da barra lateral ou em [b/adm](/b/adm/), que é o espaço público para queixas, elogios, sugestões e ofertas.', NULL, 'importação inicial', 'Importação inicial da wiki', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_paginas (slug, titulo, nav, grupo, resumo, ordem, corpo, oculta, rev_id, criado_em, atualizado_em) VALUES ('sobre', 'Sobre o basedisso', 'Sobre o basedisso', 'Visão geral', 'O que é o site, o que você encontra em cada endereço e quem cuida dele.', 10, '## O que é

O basedisso (basedisso.com) é um site de **comunidades**, **comentários**, **perfis com arte ASCII**, **enquetes**, **ferramentas** e **textos da comunidade**. As comunidades se chamam **b/** (lê-se "base"): cada uma é um espaço com tema próprio, postagens e comentários.

É um projeto independente. O fundador, `>>Intimorato`, é o ADM do site e cuida da administração junto com quem ele nomear. O visual é propositalmente simples: texto, listas e poucos enfeites.

## O que tem em cada endereço

| Endereço | O que é |
|---|---|
| `/` | **Feed inicial**: a Bíblia Amarela em destaque, as postagens mais recentes das b/ e as postagens de perfil. |
| `/b/` | **Comunidades**: a lista de todas as b/ e o painel do site. |
| `/b/todas/` | **Todas as postagens**: as postagens de todas as b/ juntas. |
| `/b/adm/` | Espaço público para solicitações, queixas, elogios, sugestões e ofertas à administração. |
| `/l/` | **Literatura da comunidade**: textos longos, como *A Bíblia Amarela*. |
| `/f/` | **Ferramentas**: área de transferência, sorteador de números e editor de arte ASCII. Outras aparecem marcadas como "em breve". |
| `/@Nome` | **Perfil** de uma conta. |
| `/busca` | **Busca** por comunidades, postagens, comentários, perfis, textos e ferramentas. |
| `/cadastro`, `/entrar` | Criar conta e entrar. |
| `/convites/` | Códigos de convite (para quem já tem conta). |
| `/wiki/` | Esta wiki. |

Cada uma dessas partes tem uma página própria aqui na wiki. Comece pelo índice à esquerda (ou pelo botão "Índice da wiki", no celular).

## Quem pode fazer o quê

- **Qualquer pessoa** pode ler tudo e, nas comunidades abertas, **postar e comentar sem conta**, com um nome opcional.
- **Quem tem conta** também pode votar e dar nota, criar enquetes, ter perfil, arte e avatar ASCII, publicar no próprio perfil e excluir o que escreveu. Veja [Contas e privacidade](/wiki/contas/).
- **ADMs** moderam: do site inteiro ou de uma b/ específica. Veja [Moderação e denúncias](/wiki/moderacao/).

## Aparência: temas e modo compacto

Na aba **Ajustes** da barra lateral você escolhe o tema: o padrão é **claro**, e há o **Escuro** e o **Papel** (tons de papel, com letra com serifa). Ali também fica a **Navegação Compacta**, que deixa a lista de postagens das b/ mais densa. A escolha fica guardada só no seu navegador.

## Fale com a administração

Use a aba **ADM** da barra lateral (ela mostra o e-mail de contato e um campo de comentário) ou a página [b/adm](/b/adm/). Qualquer pessoa pode escrever lá, com ou sem conta.', 0, 'd2168e33-6b57-56b2-9a16-b3f65cd96cea', '2026-11-27T16:00:00.000Z', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em) VALUES ('d2168e33-6b57-56b2-9a16-b3f65cd96cea', 'sobre', 'criacao', 'Sobre o basedisso', 'Sobre o basedisso', 'Visão geral', 'O que é o site, o que você encontra em cada endereço e quem cuida dele.', 10, '## O que é

O basedisso (basedisso.com) é um site de **comunidades**, **comentários**, **perfis com arte ASCII**, **enquetes**, **ferramentas** e **textos da comunidade**. As comunidades se chamam **b/** (lê-se "base"): cada uma é um espaço com tema próprio, postagens e comentários.

É um projeto independente. O fundador, `>>Intimorato`, é o ADM do site e cuida da administração junto com quem ele nomear. O visual é propositalmente simples: texto, listas e poucos enfeites.

## O que tem em cada endereço

| Endereço | O que é |
|---|---|
| `/` | **Feed inicial**: a Bíblia Amarela em destaque, as postagens mais recentes das b/ e as postagens de perfil. |
| `/b/` | **Comunidades**: a lista de todas as b/ e o painel do site. |
| `/b/todas/` | **Todas as postagens**: as postagens de todas as b/ juntas. |
| `/b/adm/` | Espaço público para solicitações, queixas, elogios, sugestões e ofertas à administração. |
| `/l/` | **Literatura da comunidade**: textos longos, como *A Bíblia Amarela*. |
| `/f/` | **Ferramentas**: área de transferência, sorteador de números e editor de arte ASCII. Outras aparecem marcadas como "em breve". |
| `/@Nome` | **Perfil** de uma conta. |
| `/busca` | **Busca** por comunidades, postagens, comentários, perfis, textos e ferramentas. |
| `/cadastro`, `/entrar` | Criar conta e entrar. |
| `/convites/` | Códigos de convite (para quem já tem conta). |
| `/wiki/` | Esta wiki. |

Cada uma dessas partes tem uma página própria aqui na wiki. Comece pelo índice à esquerda (ou pelo botão "Índice da wiki", no celular).

## Quem pode fazer o quê

- **Qualquer pessoa** pode ler tudo e, nas comunidades abertas, **postar e comentar sem conta**, com um nome opcional.
- **Quem tem conta** também pode votar e dar nota, criar enquetes, ter perfil, arte e avatar ASCII, publicar no próprio perfil e excluir o que escreveu. Veja [Contas e privacidade](/wiki/contas/).
- **ADMs** moderam: do site inteiro ou de uma b/ específica. Veja [Moderação e denúncias](/wiki/moderacao/).

## Aparência: temas e modo compacto

Na aba **Ajustes** da barra lateral você escolhe o tema: o padrão é **claro**, e há o **Escuro** e o **Papel** (tons de papel, com letra com serifa). Ali também fica a **Navegação Compacta**, que deixa a lista de postagens das b/ mais densa. A escolha fica guardada só no seu navegador.

## Fale com a administração

Use a aba **ADM** da barra lateral (ela mostra o e-mail de contato e um campo de comentário) ou a página [b/adm](/b/adm/). Qualquer pessoa pode escrever lá, com ou sem conta.', NULL, 'importação inicial', 'Importação inicial da wiki', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_paginas (slug, titulo, nav, grupo, resumo, ordem, corpo, oculta, rev_id, criado_em, atualizado_em) VALUES ('regras', 'Regras gerais', 'Regras gerais', 'Visão geral', 'O que vale para todo o site: conduta, conteúdo proibido, spam, conteúdo ilegal e o que acontece quando as regras são quebradas.', 20, 'Estas regras valem em **todo o site**: postagens, comentários, perfis, arte e avatar ASCII, nomes, links e arquivos. Cada b/ pode ter regras próprias no cartão lateral; elas valem **junto** com estas, não no lugar delas.

Quem modera usa bom senso e estas regras. A administração não promete revisar tudo o que é publicado, nem responder a todo aviso, mas lê o que chega.

## Conduta

- Discuta ideias, não ataque pessoas. Crítica dura e humor ácido fazem parte do espírito do site; perseguição não.
- Não se passe por outra pessoa, por um ADM ou pela administração.
- Não use a conta de outra pessoa e não compartilhe a sua senha.
- Respeite as regras próprias de cada b/ (veja o cartão lateral dela).

## Conteúdo proibido

É proibido publicar, em qualquer lugar do site:

- **Conteúdo ilegal no Brasil**, incluindo abuso ou exploração sexual de menores, apologia ou incitação a crime, terrorismo e venda de itens ilegais.
- **Ameaças, assédio direcionado, perseguição** ou incitação à violência contra pessoas ou grupos.
- **Racismo e outras discriminações criminosas** (Lei 7.716/89) e discurso de ódio.
- **Dados pessoais de terceiros sem consentimento**: endereço, telefone, documentos, fotos íntimas. É o que se chama de *doxxing*.
- **Spam, golpes, *phishing*, malware** e links que se passam por outra coisa.
- **Conteúdo que viole direitos autorais ou de marca** de terceiros.
- **Falsa identidade**: fingir ser outra pessoa, um ADM ou a administração.

::: nota
**Nudez e conteúdo sexual explícito.** O site ainda não tem uma regra específica e detalhada sobre esse tipo de material. Na prática, os ADMs removem o que julgarem inadequado ao site ou à b/. Na dúvida, não poste; se quiser perguntar antes, use [b/adm](/b/adm/).
:::
## Spam e abuso do site

- Não faça propaganda repetida, correntes, golpes ou links enganosos.
- Não tente **burlar os limites** do site: criar contas em massa, usar muitas redes para reaproveitar códigos de convite, automatizar postagens ou votos, atacar o serviço.
- Não **venda, alugue, ceda ou transfira** a conta, o nome, o número primordial ou os códigos de convite. Também não reserve nomes para revender ou para se passar por terceiros.
- O site limita a frequência de envios para conter abuso. Hoje, cada conexão pode enviar até 3 postagens ou comentários por minuto e 15 por hora; se passar, o site pede para esperar.

## Conteúdo ilegal

Conteúdo de abuso sexual de menores e outros crimes graves são denunciados às autoridades. Conteúdo ilícito é removido quando há ordem judicial e, nos casos previstos em lei, quando a administração é notificada (Marco Civil da Internet, arts. 19 e 21).

## Sátira e crítica

**Sátira e crítica política são bem-vindas**, como em *A Bíblia Amarela*. Mas sátira não é salvo-conduto: ela não autoriza nada da lista de conteúdo proibido. Os textos marcados como sátira são obras de humor e crítica, não afirmações de fato.

## Anonimato não é impunidade

Nas b/ abertas qualquer pessoa pode postar sem conta. Isso esconde o seu nome dos outros usuários, mas **não o torna anônimo para a lei**. O site guarda uma impressão criptográfica do endereço de rede (não o endereço em si) para limitar spam e abuso, e responde a ordens judiciais. Veja mais em [Contas e privacidade](/wiki/contas/).

## Imagens, links e arquivos

Quem posta um link, uma imagem por link ou um arquivo responde pelo conteúdo. Imagens por link **não são hospedadas** pelo basedisso: o seu navegador as busca direto no site de origem. Detalhes em [Formatação](/wiki/formatacao/) e [Imagens e vídeos](/wiki/arquivos/).

## O que acontece quando as regras são quebradas

Dependendo da gravidade, a moderação pode:

- **ocultar ou apagar** a postagem ou o comentário;
- **bloquear a conexão** de quem posta sem conta (por 24 horas, 7 dias, 30 dias ou sem prazo), no site todo ou só em uma b/;
- **remover** arte ou avatar ASCII impróprios;
- em casos graves, **encerrar a conta**, manualmente e sem aviso prévio.

Contas pagas não têm imunidade às regras. Para contestar uma decisão de moderação ou avisar sobre conteúdo que viola estas regras, fale com a administração pela aba **ADM** ou por [b/adm](/b/adm/). Veja [Moderação e denúncias](/wiki/moderacao/).', 0, '11d0897b-8710-588d-a31f-24fb5c1a9517', '2026-11-27T16:00:00.000Z', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em) VALUES ('11d0897b-8710-588d-a31f-24fb5c1a9517', 'regras', 'criacao', 'Regras gerais', 'Regras gerais', 'Visão geral', 'O que vale para todo o site: conduta, conteúdo proibido, spam, conteúdo ilegal e o que acontece quando as regras são quebradas.', 20, 'Estas regras valem em **todo o site**: postagens, comentários, perfis, arte e avatar ASCII, nomes, links e arquivos. Cada b/ pode ter regras próprias no cartão lateral; elas valem **junto** com estas, não no lugar delas.

Quem modera usa bom senso e estas regras. A administração não promete revisar tudo o que é publicado, nem responder a todo aviso, mas lê o que chega.

## Conduta

- Discuta ideias, não ataque pessoas. Crítica dura e humor ácido fazem parte do espírito do site; perseguição não.
- Não se passe por outra pessoa, por um ADM ou pela administração.
- Não use a conta de outra pessoa e não compartilhe a sua senha.
- Respeite as regras próprias de cada b/ (veja o cartão lateral dela).

## Conteúdo proibido

É proibido publicar, em qualquer lugar do site:

- **Conteúdo ilegal no Brasil**, incluindo abuso ou exploração sexual de menores, apologia ou incitação a crime, terrorismo e venda de itens ilegais.
- **Ameaças, assédio direcionado, perseguição** ou incitação à violência contra pessoas ou grupos.
- **Racismo e outras discriminações criminosas** (Lei 7.716/89) e discurso de ódio.
- **Dados pessoais de terceiros sem consentimento**: endereço, telefone, documentos, fotos íntimas. É o que se chama de *doxxing*.
- **Spam, golpes, *phishing*, malware** e links que se passam por outra coisa.
- **Conteúdo que viole direitos autorais ou de marca** de terceiros.
- **Falsa identidade**: fingir ser outra pessoa, um ADM ou a administração.

::: nota
**Nudez e conteúdo sexual explícito.** O site ainda não tem uma regra específica e detalhada sobre esse tipo de material. Na prática, os ADMs removem o que julgarem inadequado ao site ou à b/. Na dúvida, não poste; se quiser perguntar antes, use [b/adm](/b/adm/).
:::
## Spam e abuso do site

- Não faça propaganda repetida, correntes, golpes ou links enganosos.
- Não tente **burlar os limites** do site: criar contas em massa, usar muitas redes para reaproveitar códigos de convite, automatizar postagens ou votos, atacar o serviço.
- Não **venda, alugue, ceda ou transfira** a conta, o nome, o número primordial ou os códigos de convite. Também não reserve nomes para revender ou para se passar por terceiros.
- O site limita a frequência de envios para conter abuso. Hoje, cada conexão pode enviar até 3 postagens ou comentários por minuto e 15 por hora; se passar, o site pede para esperar.

## Conteúdo ilegal

Conteúdo de abuso sexual de menores e outros crimes graves são denunciados às autoridades. Conteúdo ilícito é removido quando há ordem judicial e, nos casos previstos em lei, quando a administração é notificada (Marco Civil da Internet, arts. 19 e 21).

## Sátira e crítica

**Sátira e crítica política são bem-vindas**, como em *A Bíblia Amarela*. Mas sátira não é salvo-conduto: ela não autoriza nada da lista de conteúdo proibido. Os textos marcados como sátira são obras de humor e crítica, não afirmações de fato.

## Anonimato não é impunidade

Nas b/ abertas qualquer pessoa pode postar sem conta. Isso esconde o seu nome dos outros usuários, mas **não o torna anônimo para a lei**. O site guarda uma impressão criptográfica do endereço de rede (não o endereço em si) para limitar spam e abuso, e responde a ordens judiciais. Veja mais em [Contas e privacidade](/wiki/contas/).

## Imagens, links e arquivos

Quem posta um link, uma imagem por link ou um arquivo responde pelo conteúdo. Imagens por link **não são hospedadas** pelo basedisso: o seu navegador as busca direto no site de origem. Detalhes em [Formatação](/wiki/formatacao/) e [Imagens e vídeos](/wiki/arquivos/).

## O que acontece quando as regras são quebradas

Dependendo da gravidade, a moderação pode:

- **ocultar ou apagar** a postagem ou o comentário;
- **bloquear a conexão** de quem posta sem conta (por 24 horas, 7 dias, 30 dias ou sem prazo), no site todo ou só em uma b/;
- **remover** arte ou avatar ASCII impróprios;
- em casos graves, **encerrar a conta**, manualmente e sem aviso prévio.

Contas pagas não têm imunidade às regras. Para contestar uma decisão de moderação ou avisar sobre conteúdo que viola estas regras, fale com a administração pela aba **ADM** ou por [b/adm](/b/adm/). Veja [Moderação e denúncias](/wiki/moderacao/).', NULL, 'importação inicial', 'Importação inicial da wiki', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_paginas (slug, titulo, nav, grupo, resumo, ordem, corpo, oculta, rev_id, criado_em, atualizado_em) VALUES ('comunidades', 'Comunidades (b/)', 'Comunidades (b/)', 'Como funciona', 'Como ler, postar e comentar nas b/, como entrar em uma, quem modera e como uma nova b/ nasce. Inclui o feed geral /b/todas.', 30, '## O que é uma b/

Uma **b/** é uma comunidade do site, com endereço próprio: `basedisso.com/b/<endereço>`. A lista de todas está em [/b/](/b/). Duas b/ fazem parte do site desde o começo: **b/adm**, para solicitações, queixas, elogios, sugestões e ofertas à administração, e **b/atoa**, uma comunidade livre, sem assunto definido.

Em cada b/ existem a lista de postagens, um **cartão lateral** (descrição e regras próprias daquela b/), o quadro de **moderação** (quem são os ADMs) e o link `>>>` para a lista de membros.

## Lendo as postagens

No topo da b/ há três abas de ordenação:

- **links**: a ordem padrão. Postagens fixadas ficam no topo, e depois vêm as mais recentes.
- **novos**: da mais recente para a mais antiga.
- **melhores**: pela soma dos votos; empates são resolvidos pelo número de comentários e, depois, pela data.

Clicar numa **etiqueta** filtra a lista só com as postagens que a têm. Postagens ocultas pela moderação ou excluídas pelo autor não aparecem. A **Navegação Compacta** (aba Ajustes) deixa a lista mais densa.

## Postando

Clique em **[+] postar**. O formulário tem:

| Campo | Regra |
|---|---|
| Nome | Opcional, até 80 caracteres. Em branco, a postagem sai como "anônimo". |
| Título | Obrigatório, até 200 caracteres. |
| Texto | Até 2.000 caracteres. |
| Link | Opcional, começando com `http://` ou `https://`, até 500 caracteres. |
| Etiquetas | Opcional, até 3, escolhidas entre as que existem para o site e para a b/. |
| Arquivo | Uma imagem ou vídeo, nas b/ em que o envio está liberado. Veja [Imagens e vídeos](/wiki/arquivos/). |
| Enquete | Opcional. Veja [Votos, notas e etiquetas](/wiki/votos/). |

Além do título, é preciso ter pelo menos um entre texto, link, arquivo ou enquete.

**Sem conta**, você posta direto, com nome opcional. Pode aparecer uma verificação anti-robô. **Com conta**, a postagem sai como `>>seunome`, ou como `>>anônimo` se você marcar a caixinha. Cuidado: ser `>>anônimo` esconde seu nome dos outros usuários, mas os ADMs conseguem ver qual conta fez a postagem (veja [Contas e privacidade](/wiki/contas/)).

O formato do texto está em [Formatação](/wiki/formatacao/).

## Comentando

Cada postagem tem uma área de comentários logo abaixo. Dá para responder a um comentário, formando uma conversa em árvore de até **20 níveis**. Comentários têm até 2.000 caracteres, nome opcional, etiquetas e um arquivo, nas mesmas condições das postagens. Quem tem conta também pode votar e dar nota a postagens e comentários.

## Excluindo o que você escreveu

Quem tem conta pode excluir as próprias postagens e comentários (inclusive os que saíram como `>>anônimo`):

- **Sem respostas**, o item é apagado de verdade, e a enquete vai junto.
- **Com respostas**, o texto é apagado e o item fica marcado como "excluído pelo autor", para a conversa continuar fazendo sentido. Seu nome deixa de aparecer nele. Se depois todas as respostas sumirem, a "casca" também é apagada.
- Se a **postagem** foi excluída pelo autor, os comentários dela ficam fechados.

**Quem postou sem conta não consegue excluir**, porque não há como provar a autoria. Peça a um ADM.

## Entrando em uma b/

Quem tem conta pode clicar em **unir-se** no topo da b/ para virar **membro**. A lista de membros e de ADMs de cada b/ é pública e fica em [/b/membros/](/b/membros/). Para postar e comentar nas b/ abertas, não é preciso ser membro.

## Quem modera

- **ADMs do site** moderam todas as b/.
- **ADMs de uma b/** moderam só aquela b/. Eles aparecem no quadro "moderação" da própria b/ e com o selo `[b]` ao lado do nome; ADMs do site têm o selo `[M]`.

Os ADMs de uma b/ podem: ocultar ou apagar postagens e comentários; fixar até 3 postagens na b/ e até 3 comentários por postagem; criar e gerir as etiquetas da b/; bloquear conexões sem conta só naquela b/; liberar o envio de imagens e vídeos para as contas; editar o cartão lateral (título, subtítulo e texto de até 2.000 caracteres); e definir o avatar ASCII da b/. Quem nomeia ou remove ADMs de b/ são os ADMs do site. Veja [Moderação e denúncias](/wiki/moderacao/).

## Criando uma nova b/

Hoje **só ADMs do site criam comunidades**. Quem cria vira ADM da nova b/. O endereço leva de 2 a 24 caracteres (letras minúsculas, números, `-` ou `_`, começando com letra ou número); o nome, de 2 a 60; e a descrição, até 300. Alguns endereços são reservados e não podem ser usados (por exemplo `wiki`, `adm`, `membros`, `todas`, `api`). Quer propor uma b/? Escreva em [b/adm](/b/adm/).

## Avatar ASCII da b/

Cada b/ pode ter um desenho em texto que aparece no cabeçalho dela, na lista de comunidades e no painel lateral: até **8 linhas por 16 colunas**, com cores e até 4 camadas, sem emojis. Sem avatar, aparece o "b" laranja padrão. É o mesmo editor da [arte ASCII](/f/arte.html).

## Todas as postagens: /b/todas

A página [/b/todas/](/b/todas/) é o **feed geral**: junta as postagens de todas as b/ numa lista só, cada uma com o selo da b/ de origem.

- Só há as ordens **novos** (padrão) e **melhores**.
- Não há formulário de postagem: para postar, entre numa b/.
- Fixar uma postagem vale dentro da própria b/ e **não muda a ordem** no feed geral.
- As mesmas regras de visibilidade das b/ valem aqui: o que está oculto ou foi excluído pelo autor não aparece.', 0, '3975627b-5c43-5854-9c06-1bcca3574632', '2026-11-27T16:00:00.000Z', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em) VALUES ('3975627b-5c43-5854-9c06-1bcca3574632', 'comunidades', 'criacao', 'Comunidades (b/)', 'Comunidades (b/)', 'Como funciona', 'Como ler, postar e comentar nas b/, como entrar em uma, quem modera e como uma nova b/ nasce. Inclui o feed geral /b/todas.', 30, '## O que é uma b/

Uma **b/** é uma comunidade do site, com endereço próprio: `basedisso.com/b/<endereço>`. A lista de todas está em [/b/](/b/). Duas b/ fazem parte do site desde o começo: **b/adm**, para solicitações, queixas, elogios, sugestões e ofertas à administração, e **b/atoa**, uma comunidade livre, sem assunto definido.

Em cada b/ existem a lista de postagens, um **cartão lateral** (descrição e regras próprias daquela b/), o quadro de **moderação** (quem são os ADMs) e o link `>>>` para a lista de membros.

## Lendo as postagens

No topo da b/ há três abas de ordenação:

- **links**: a ordem padrão. Postagens fixadas ficam no topo, e depois vêm as mais recentes.
- **novos**: da mais recente para a mais antiga.
- **melhores**: pela soma dos votos; empates são resolvidos pelo número de comentários e, depois, pela data.

Clicar numa **etiqueta** filtra a lista só com as postagens que a têm. Postagens ocultas pela moderação ou excluídas pelo autor não aparecem. A **Navegação Compacta** (aba Ajustes) deixa a lista mais densa.

## Postando

Clique em **[+] postar**. O formulário tem:

| Campo | Regra |
|---|---|
| Nome | Opcional, até 80 caracteres. Em branco, a postagem sai como "anônimo". |
| Título | Obrigatório, até 200 caracteres. |
| Texto | Até 2.000 caracteres. |
| Link | Opcional, começando com `http://` ou `https://`, até 500 caracteres. |
| Etiquetas | Opcional, até 3, escolhidas entre as que existem para o site e para a b/. |
| Arquivo | Uma imagem ou vídeo, nas b/ em que o envio está liberado. Veja [Imagens e vídeos](/wiki/arquivos/). |
| Enquete | Opcional. Veja [Votos, notas e etiquetas](/wiki/votos/). |

Além do título, é preciso ter pelo menos um entre texto, link, arquivo ou enquete.

**Sem conta**, você posta direto, com nome opcional. Pode aparecer uma verificação anti-robô. **Com conta**, a postagem sai como `>>seunome`, ou como `>>anônimo` se você marcar a caixinha. Cuidado: ser `>>anônimo` esconde seu nome dos outros usuários, mas os ADMs conseguem ver qual conta fez a postagem (veja [Contas e privacidade](/wiki/contas/)).

O formato do texto está em [Formatação](/wiki/formatacao/).

## Comentando

Cada postagem tem uma área de comentários logo abaixo. Dá para responder a um comentário, formando uma conversa em árvore de até **20 níveis**. Comentários têm até 2.000 caracteres, nome opcional, etiquetas e um arquivo, nas mesmas condições das postagens. Quem tem conta também pode votar e dar nota a postagens e comentários.

## Excluindo o que você escreveu

Quem tem conta pode excluir as próprias postagens e comentários (inclusive os que saíram como `>>anônimo`):

- **Sem respostas**, o item é apagado de verdade, e a enquete vai junto.
- **Com respostas**, o texto é apagado e o item fica marcado como "excluído pelo autor", para a conversa continuar fazendo sentido. Seu nome deixa de aparecer nele. Se depois todas as respostas sumirem, a "casca" também é apagada.
- Se a **postagem** foi excluída pelo autor, os comentários dela ficam fechados.

**Quem postou sem conta não consegue excluir**, porque não há como provar a autoria. Peça a um ADM.

## Entrando em uma b/

Quem tem conta pode clicar em **unir-se** no topo da b/ para virar **membro**. A lista de membros e de ADMs de cada b/ é pública e fica em [/b/membros/](/b/membros/). Para postar e comentar nas b/ abertas, não é preciso ser membro.

## Quem modera

- **ADMs do site** moderam todas as b/.
- **ADMs de uma b/** moderam só aquela b/. Eles aparecem no quadro "moderação" da própria b/ e com o selo `[b]` ao lado do nome; ADMs do site têm o selo `[M]`.

Os ADMs de uma b/ podem: ocultar ou apagar postagens e comentários; fixar até 3 postagens na b/ e até 3 comentários por postagem; criar e gerir as etiquetas da b/; bloquear conexões sem conta só naquela b/; liberar o envio de imagens e vídeos para as contas; editar o cartão lateral (título, subtítulo e texto de até 2.000 caracteres); e definir o avatar ASCII da b/. Quem nomeia ou remove ADMs de b/ são os ADMs do site. Veja [Moderação e denúncias](/wiki/moderacao/).

## Criando uma nova b/

Hoje **só ADMs do site criam comunidades**. Quem cria vira ADM da nova b/. O endereço leva de 2 a 24 caracteres (letras minúsculas, números, `-` ou `_`, começando com letra ou número); o nome, de 2 a 60; e a descrição, até 300. Alguns endereços são reservados e não podem ser usados (por exemplo `wiki`, `adm`, `membros`, `todas`, `api`). Quer propor uma b/? Escreva em [b/adm](/b/adm/).

## Avatar ASCII da b/

Cada b/ pode ter um desenho em texto que aparece no cabeçalho dela, na lista de comunidades e no painel lateral: até **8 linhas por 16 colunas**, com cores e até 4 camadas, sem emojis. Sem avatar, aparece o "b" laranja padrão. É o mesmo editor da [arte ASCII](/f/arte.html).

## Todas as postagens: /b/todas

A página [/b/todas/](/b/todas/) é o **feed geral**: junta as postagens de todas as b/ numa lista só, cada uma com o selo da b/ de origem.

- Só há as ordens **novos** (padrão) e **melhores**.
- Não há formulário de postagem: para postar, entre numa b/.
- Fixar uma postagem vale dentro da própria b/ e **não muda a ordem** no feed geral.
- As mesmas regras de visibilidade das b/ valem aqui: o que está oculto ou foi excluído pelo autor não aparece.', NULL, 'importação inicial', 'Importação inicial da wiki', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_paginas (slug, titulo, nav, grupo, resumo, ordem, corpo, oculta, rev_id, criado_em, atualizado_em) VALUES ('feed-inicial', 'Feed inicial e busca', 'Feed inicial e busca', 'Como funciona', 'O que aparece na página inicial, de onde vem cada coisa e como usar a busca.', 40, '## A página inicial

A [página inicial](/) é um mural em três partes:

1. **Literatura da comunidade**: a capa do texto em destaque (hoje, *A Bíblia Amarela*), com link para ler e para a [estante completa](/l/).
2. **Postagens das b/**: uma grade com as **postagens mais recentes de todas as b/** (as 12 últimas). Cada cartão mostra o nome da b/, com o avatar ASCII dela, o título, um trecho do texto, a quantidade de comentários e, se houver, uma miniatura de imagem ou vídeo. Linhas do texto que começam com `>` aparecem em verde, como nas postagens.
3. **Postagens de perfil**: o que as pessoas escreveram nos próprios perfis (as 40 mais recentes). Veja [Perfis e arte ASCII](/wiki/perfis/).

O feed inicial é uma **vitrine**: clicar num cartão leva à postagem ou ao perfil de origem. Votar, comentar e postar acontecem lá, não na página inicial. Para ver tudo em ordem, use [/b/todas/](/b/todas/).

O que foi ocultado pela moderação, ou excluído pelo autor, não aparece no feed.

## Busca

A caixa **buscar** no topo de todas as páginas leva à página [/busca](/busca). A busca procura em:

- comunidades, postagens e comentários;
- postagens de perfil;
- textos da literatura e ferramentas do site;
- esta wiki.

Regras: digite pelo menos **2 caracteres**; a busca ignora acentos e maiúsculas; com várias palavras, só aparecem os resultados que tenham **todas** elas (até 5 palavras). Cada resultado mostra o tipo (Comunidade, Postagem, Comentário, Perfil, Wiki...), onde "Perfil" quer dizer uma postagem de perfil e, quando possível, um trecho com as palavras destacadas.

Conteúdo oculto pela moderação ou excluído não entra nos resultados.', 0, 'e86be25f-843e-561d-9de2-bff8fe242951', '2026-11-27T16:00:00.000Z', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em) VALUES ('e86be25f-843e-561d-9de2-bff8fe242951', 'feed-inicial', 'criacao', 'Feed inicial e busca', 'Feed inicial e busca', 'Como funciona', 'O que aparece na página inicial, de onde vem cada coisa e como usar a busca.', 40, '## A página inicial

A [página inicial](/) é um mural em três partes:

1. **Literatura da comunidade**: a capa do texto em destaque (hoje, *A Bíblia Amarela*), com link para ler e para a [estante completa](/l/).
2. **Postagens das b/**: uma grade com as **postagens mais recentes de todas as b/** (as 12 últimas). Cada cartão mostra o nome da b/, com o avatar ASCII dela, o título, um trecho do texto, a quantidade de comentários e, se houver, uma miniatura de imagem ou vídeo. Linhas do texto que começam com `>` aparecem em verde, como nas postagens.
3. **Postagens de perfil**: o que as pessoas escreveram nos próprios perfis (as 40 mais recentes). Veja [Perfis e arte ASCII](/wiki/perfis/).

O feed inicial é uma **vitrine**: clicar num cartão leva à postagem ou ao perfil de origem. Votar, comentar e postar acontecem lá, não na página inicial. Para ver tudo em ordem, use [/b/todas/](/b/todas/).

O que foi ocultado pela moderação, ou excluído pelo autor, não aparece no feed.

## Busca

A caixa **buscar** no topo de todas as páginas leva à página [/busca](/busca). A busca procura em:

- comunidades, postagens e comentários;
- postagens de perfil;
- textos da literatura e ferramentas do site;
- esta wiki.

Regras: digite pelo menos **2 caracteres**; a busca ignora acentos e maiúsculas; com várias palavras, só aparecem os resultados que tenham **todas** elas (até 5 palavras). Cada resultado mostra o tipo (Comunidade, Postagem, Comentário, Perfil, Wiki...), onde "Perfil" quer dizer uma postagem de perfil e, quando possível, um trecho com as palavras destacadas.

Conteúdo oculto pela moderação ou excluído não entra nos resultados.', NULL, 'importação inicial', 'Importação inicial da wiki', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_paginas (slug, titulo, nav, grupo, resumo, ordem, corpo, oculta, rev_id, criado_em, atualizado_em) VALUES ('literatura', 'Literatura (/l)', 'Literatura (/l)', 'Como funciona', 'A estante de textos longos da comunidade, a Bíblia Amarela e como comentar nelas.', 50, '## O que é

A [literatura da comunidade](/l/) é a estante de **textos longos** do site, mantidos de forma coletiva. Ela fica em `/l/` (o endereço antigo `/s/` ainda redireciona para cá).

Hoje o texto publicado é ***A Bíblia Amarela***, uma obra satírica que nasceu na wiki do r/BrasilSocial, com os fundamentos escritos por `>>Intimorato`. Ela é uma série de livros que critica e satiriza o MBL e os seus "livros amarelos" de propostas. Outros volumes aparecem na estante marcados como **"em breve"**.

## Lendo

- Na estante você vê os livros e abre o que já está publicado: **Ler no site**, ou a **wiki original**, no Reddit.
- Cada livro tem **capítulos** com links diretos (âncoras) para você compartilhar um trecho.

## Comentando

A estante (`/l/`) e *A Bíblia Amarela* (`/l/biblia-amarela.html`) têm uma **área de comentários** própria, com as mesmas regras de qualquer comentário do site: [formatação](/wiki/formatacao/), [votos e notas](/wiki/votos/), exclusão pelo autor (se tiver conta) e moderação pelos ADMs do site.

## Quem edita

O texto da Bíblia Amarela é editado pelos **ADMs do site**, pelo botão "Editar Bíblia Amarela" na estante (ele só aparece para eles). Quem quiser **contribuir** com os textos pode combinar com a administração em [b/adm](/b/adm/).

## Sátira

Os textos da literatura marcados como sátira são **obras de humor e crítica**, não afirmações de fato. As [regras gerais](/wiki/regras/) valem também para eles.', 0, 'a5bf696a-f688-5dea-afca-bc125dbb1ed7', '2026-11-27T16:00:00.000Z', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em) VALUES ('a5bf696a-f688-5dea-afca-bc125dbb1ed7', 'literatura', 'criacao', 'Literatura (/l)', 'Literatura (/l)', 'Como funciona', 'A estante de textos longos da comunidade, a Bíblia Amarela e como comentar nelas.', 50, '## O que é

A [literatura da comunidade](/l/) é a estante de **textos longos** do site, mantidos de forma coletiva. Ela fica em `/l/` (o endereço antigo `/s/` ainda redireciona para cá).

Hoje o texto publicado é ***A Bíblia Amarela***, uma obra satírica que nasceu na wiki do r/BrasilSocial, com os fundamentos escritos por `>>Intimorato`. Ela é uma série de livros que critica e satiriza o MBL e os seus "livros amarelos" de propostas. Outros volumes aparecem na estante marcados como **"em breve"**.

## Lendo

- Na estante você vê os livros e abre o que já está publicado: **Ler no site**, ou a **wiki original**, no Reddit.
- Cada livro tem **capítulos** com links diretos (âncoras) para você compartilhar um trecho.

## Comentando

A estante (`/l/`) e *A Bíblia Amarela* (`/l/biblia-amarela.html`) têm uma **área de comentários** própria, com as mesmas regras de qualquer comentário do site: [formatação](/wiki/formatacao/), [votos e notas](/wiki/votos/), exclusão pelo autor (se tiver conta) e moderação pelos ADMs do site.

## Quem edita

O texto da Bíblia Amarela é editado pelos **ADMs do site**, pelo botão "Editar Bíblia Amarela" na estante (ele só aparece para eles). Quem quiser **contribuir** com os textos pode combinar com a administração em [b/adm](/b/adm/).

## Sátira

Os textos da literatura marcados como sátira são **obras de humor e crítica**, não afirmações de fato. As [regras gerais](/wiki/regras/) valem também para eles.', NULL, 'importação inicial', 'Importação inicial da wiki', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_paginas (slug, titulo, nav, grupo, resumo, ordem, corpo, oculta, rev_id, criado_em, atualizado_em) VALUES ('perfis', 'Perfis e arte ASCII', 'Perfis e arte ASCII', 'Como funciona', 'O que tem em um perfil (/@Nome), como publicar nele, a arte e o avatar ASCII e o perfil coletivo do anônimo.', 60, '## O perfil

Toda conta tem uma página pública em `/@Nome`. Nela aparecem:

- o **nome**, o selo de **primordial** (`primordial #N`), se houver, e os selos de ADM (`[M]` para ADM do site, `[b]` para ADM de uma b/);
- "**No basedisso desde**" (a data de criação da conta);
- a **arte ASCII** do topo e o **avatar ASCII**, se a pessoa criou;
- as **postagens do perfil** e os **comentários** que a pessoa escreveu (os que saíram como `>>anônimo` não aparecem aqui).

Perfis de contas que ainda não existem aparecem como "Usuário não encontrado". Nomes reservados pelo sistema (como `wiki`, `adm`, `api`) não podem ser registrados.

## Postagens de perfil

Quem tem conta pode escrever no **próprio perfil**: "Nova postagem", com um texto de até **2.000 caracteres**. A postagem aparece na página do perfil **e no [feed inicial](/wiki/feed-inicial/)**.

- Só o dono do perfil publica nele. Não há comentários nem votos em postagens de perfil.
- O autor pode **excluir** a própria postagem a qualquer momento (não dá para desfazer). ADMs do site também podem ocultar ou excluir.
- Vale o mesmo [formato de texto](/wiki/formatacao/) e as mesmas [regras gerais](/wiki/regras/).
- O limite de envios por minuto e por hora é o mesmo das demais postagens.
- Anexar imagem ou vídeo ao perfil é, por ora, coisa dos ADMs do site.

## Arte ASCII do perfil

É um desenho em **texto puro, em fonte monoespaçada**, que fica no topo do perfil. Limites:

| | Arte do perfil | Avatar |
|---|---|---|
| Tamanho | até **16 linhas × 48 colunas** | até **8 linhas × 16 colunas** |
| Camadas | até 4 | até 4 |
| Cores | paleta fixa de 8: vermelho, laranja, amarelo, verde, ciano, azul, roxo, cinza | a mesma paleta |
| Moldura | simples ou nenhuma | não tem |

Os espaços são mantidos e tabulações viram 4 espaços. O avatar não aceita emojis. O avatar é o desenho pequeno que aparece **ao lado do seu nome** em postagens e comentários.

Para criar, use o editor [Arte ASCII](/f/arte.html), em **Ferramentas**: ele permite desenhar com camadas e cores, copiar, baixar como `.txt` ou imagem, e, com conta, **usar no perfil**. Também dá para editar direto na página do seu perfil ("Adicionar arte ASCII", "Adicionar avatar ASCII"). Você pode remover ou trocar quando quiser. A arte e o avatar seguem as [regras gerais](/wiki/regras/), e ADMs do site podem remover os impróprios (a pessoa pode enviar outros depois).

## O perfil do anônimo

Existe um perfil coletivo, [/@anônimo](/@anônimo), que reúne, em "contribuições", **as postagens e os comentários publicados como `>>anônimo`**: por quem marcou a caixinha e por quem postou sem conta e sem nome. Ele não pertence a ninguém; ADMs do site podem editar a arte e o avatar desse perfil.

## Nome de usuário

O nome tem de **3 a 20** caracteres (letras, números ou `_`) e **não pode ser trocado** depois. Para saber como criar a conta, veja [Contas e privacidade](/wiki/contas/).', 0, 'f12979c1-21a4-5fd8-a076-53064e21d8dd', '2026-11-27T16:00:00.000Z', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em) VALUES ('f12979c1-21a4-5fd8-a076-53064e21d8dd', 'perfis', 'criacao', 'Perfis e arte ASCII', 'Perfis e arte ASCII', 'Como funciona', 'O que tem em um perfil (/@Nome), como publicar nele, a arte e o avatar ASCII e o perfil coletivo do anônimo.', 60, '## O perfil

Toda conta tem uma página pública em `/@Nome`. Nela aparecem:

- o **nome**, o selo de **primordial** (`primordial #N`), se houver, e os selos de ADM (`[M]` para ADM do site, `[b]` para ADM de uma b/);
- "**No basedisso desde**" (a data de criação da conta);
- a **arte ASCII** do topo e o **avatar ASCII**, se a pessoa criou;
- as **postagens do perfil** e os **comentários** que a pessoa escreveu (os que saíram como `>>anônimo` não aparecem aqui).

Perfis de contas que ainda não existem aparecem como "Usuário não encontrado". Nomes reservados pelo sistema (como `wiki`, `adm`, `api`) não podem ser registrados.

## Postagens de perfil

Quem tem conta pode escrever no **próprio perfil**: "Nova postagem", com um texto de até **2.000 caracteres**. A postagem aparece na página do perfil **e no [feed inicial](/wiki/feed-inicial/)**.

- Só o dono do perfil publica nele. Não há comentários nem votos em postagens de perfil.
- O autor pode **excluir** a própria postagem a qualquer momento (não dá para desfazer). ADMs do site também podem ocultar ou excluir.
- Vale o mesmo [formato de texto](/wiki/formatacao/) e as mesmas [regras gerais](/wiki/regras/).
- O limite de envios por minuto e por hora é o mesmo das demais postagens.
- Anexar imagem ou vídeo ao perfil é, por ora, coisa dos ADMs do site.

## Arte ASCII do perfil

É um desenho em **texto puro, em fonte monoespaçada**, que fica no topo do perfil. Limites:

| | Arte do perfil | Avatar |
|---|---|---|
| Tamanho | até **16 linhas × 48 colunas** | até **8 linhas × 16 colunas** |
| Camadas | até 4 | até 4 |
| Cores | paleta fixa de 8: vermelho, laranja, amarelo, verde, ciano, azul, roxo, cinza | a mesma paleta |
| Moldura | simples ou nenhuma | não tem |

Os espaços são mantidos e tabulações viram 4 espaços. O avatar não aceita emojis. O avatar é o desenho pequeno que aparece **ao lado do seu nome** em postagens e comentários.

Para criar, use o editor [Arte ASCII](/f/arte.html), em **Ferramentas**: ele permite desenhar com camadas e cores, copiar, baixar como `.txt` ou imagem, e, com conta, **usar no perfil**. Também dá para editar direto na página do seu perfil ("Adicionar arte ASCII", "Adicionar avatar ASCII"). Você pode remover ou trocar quando quiser. A arte e o avatar seguem as [regras gerais](/wiki/regras/), e ADMs do site podem remover os impróprios (a pessoa pode enviar outros depois).

## O perfil do anônimo

Existe um perfil coletivo, [/@anônimo](/@anônimo), que reúne, em "contribuições", **as postagens e os comentários publicados como `>>anônimo`**: por quem marcou a caixinha e por quem postou sem conta e sem nome. Ele não pertence a ninguém; ADMs do site podem editar a arte e o avatar desse perfil.

## Nome de usuário

O nome tem de **3 a 20** caracteres (letras, números ou `_`) e **não pode ser trocado** depois. Para saber como criar a conta, veja [Contas e privacidade](/wiki/contas/).', NULL, 'importação inicial', 'Importação inicial da wiki', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_paginas (slug, titulo, nav, grupo, resumo, ordem, corpo, oculta, rev_id, criado_em, atualizado_em) VALUES ('formatacao', 'Formatação', 'Formatação', 'Como funciona', 'O texto do basedisso é simples. Aqui está o que muda a aparência: greentext, menções, imagens por link e os limites de tamanho.', 70, '## Texto simples

O basedisso **não usa Markdown nem HTML**. Negrito, itálico, títulos, listas e tabelas não existem: o que você digita é o que aparece. Quebras de linha e espaços são mantidos. Só algumas convenções têm efeito (abaixo) e valem em postagens, comentários e postagens de perfil.

## Greentext

Uma **linha que começa com `>`** (espaços antes dela também valem) aparece em **verde**, como nas imagens de fórum. Serve para citar um trecho ou contar uma história.

::: demo
>estava eu no mercado
>aí acontece isso
e fim da história, sem verde nesta linha.
:::

Só a linha inteira conta: um `>` no meio da frase não faz nada. Cada linha é avaliada separadamente. O texto guardado não muda, a cor é aplicada só na hora de mostrar.

## Menções: `>>Nome` e `@Nome`

Escrever `>>Nome` ou `@Nome`, com o nome de uma conta que existe, vira um **link para o perfil** dela. O nome tem de 3 a 20 caracteres (letras, números ou `_`). Se a conta não existir, o texto fica como você escreveu.

::: demo
oi, concordo com >>Intimorato nisso
valeu, @Intimorato
:::

Importante:

- Como `>>Nome` é menção, essa linha **não** fica verde, mesmo começando com `>>`. Para uma linha verde, comece com um `>` só.
- A menção apenas cria o link. O site **não envia aviso** à pessoa mencionada.

## Links

- Um endereço colado no meio do texto **não vira link clicável**. Para compartilhar um endereço numa postagem, use o campo **Link**: `http://` ou `https://`, até 500 caracteres. Ele abre em outra aba, sem repassar o site de origem.
- Se o link terminar em imagem, ele pode virar uma imagem (próxima seção).

## Imagens por link

Quando um comentário ou texto tem o endereço de uma imagem, ela é mostrada **abaixo do texto**. Vale para endereços que:

- terminam em `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` ou `.avif`; ou
- são de `i.imgur.com`, `i.redd.it` ou `pbs.twimg.com`; ou
- são páginas do Imgur (`imgur.com/código`), que viram a imagem correspondente.

O endereço precisa estar **separado por espaço ou quebra de linha**, começar com `http://` ou `https://`, e o texto mostra no máximo **4 imagens**. Clicar na imagem abre o original em outra aba. Se a imagem quebrar, ela some e o link continua no texto.

A imagem **não é hospedada pelo basedisso**: o seu navegador a carrega direto do site de origem, que pode ver o seu endereço de rede. Quem coloca o link responde pela imagem. Dá para **desligar o carregamento** com o botão "ocultar imagens", e a escolha fica guardada só no seu navegador.

Para enviar uma imagem ou vídeo de verdade, e não um link, veja [Imagens e vídeos](/wiki/arquivos/).

## Limites de tamanho

| Onde | Campo | Limite |
|---|---|---|
| Postagem em b/ | título | 200 caracteres |
| Postagem em b/ | texto | 2.000 caracteres |
| Postagem em b/ | link | 500 caracteres |
| Comentário | texto | 2.000 caracteres |
| Postagem de perfil | texto | 2.000 caracteres |
| Nome opcional (sem conta) | nome | 80 caracteres |
| Enquete | opções | de 2 a 6, até 80 caracteres cada |
| Etiqueta | nome / descrição | 24 / 120 caracteres |

Para desenhos em texto, veja a [arte ASCII do perfil](/wiki/perfis/) (editor em [/f/arte.html](/f/arte.html)).', 0, '9e369d28-1bba-5967-869d-db2883ecd40b', '2026-11-27T16:00:00.000Z', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em) VALUES ('9e369d28-1bba-5967-869d-db2883ecd40b', 'formatacao', 'criacao', 'Formatação', 'Formatação', 'Como funciona', 'O texto do basedisso é simples. Aqui está o que muda a aparência: greentext, menções, imagens por link e os limites de tamanho.', 70, '## Texto simples

O basedisso **não usa Markdown nem HTML**. Negrito, itálico, títulos, listas e tabelas não existem: o que você digita é o que aparece. Quebras de linha e espaços são mantidos. Só algumas convenções têm efeito (abaixo) e valem em postagens, comentários e postagens de perfil.

## Greentext

Uma **linha que começa com `>`** (espaços antes dela também valem) aparece em **verde**, como nas imagens de fórum. Serve para citar um trecho ou contar uma história.

::: demo
>estava eu no mercado
>aí acontece isso
e fim da história, sem verde nesta linha.
:::

Só a linha inteira conta: um `>` no meio da frase não faz nada. Cada linha é avaliada separadamente. O texto guardado não muda, a cor é aplicada só na hora de mostrar.

## Menções: `>>Nome` e `@Nome`

Escrever `>>Nome` ou `@Nome`, com o nome de uma conta que existe, vira um **link para o perfil** dela. O nome tem de 3 a 20 caracteres (letras, números ou `_`). Se a conta não existir, o texto fica como você escreveu.

::: demo
oi, concordo com >>Intimorato nisso
valeu, @Intimorato
:::

Importante:

- Como `>>Nome` é menção, essa linha **não** fica verde, mesmo começando com `>>`. Para uma linha verde, comece com um `>` só.
- A menção apenas cria o link. O site **não envia aviso** à pessoa mencionada.

## Links

- Um endereço colado no meio do texto **não vira link clicável**. Para compartilhar um endereço numa postagem, use o campo **Link**: `http://` ou `https://`, até 500 caracteres. Ele abre em outra aba, sem repassar o site de origem.
- Se o link terminar em imagem, ele pode virar uma imagem (próxima seção).

## Imagens por link

Quando um comentário ou texto tem o endereço de uma imagem, ela é mostrada **abaixo do texto**. Vale para endereços que:

- terminam em `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` ou `.avif`; ou
- são de `i.imgur.com`, `i.redd.it` ou `pbs.twimg.com`; ou
- são páginas do Imgur (`imgur.com/código`), que viram a imagem correspondente.

O endereço precisa estar **separado por espaço ou quebra de linha**, começar com `http://` ou `https://`, e o texto mostra no máximo **4 imagens**. Clicar na imagem abre o original em outra aba. Se a imagem quebrar, ela some e o link continua no texto.

A imagem **não é hospedada pelo basedisso**: o seu navegador a carrega direto do site de origem, que pode ver o seu endereço de rede. Quem coloca o link responde pela imagem. Dá para **desligar o carregamento** com o botão "ocultar imagens", e a escolha fica guardada só no seu navegador.

Para enviar uma imagem ou vídeo de verdade, e não um link, veja [Imagens e vídeos](/wiki/arquivos/).

## Limites de tamanho

| Onde | Campo | Limite |
|---|---|---|
| Postagem em b/ | título | 200 caracteres |
| Postagem em b/ | texto | 2.000 caracteres |
| Postagem em b/ | link | 500 caracteres |
| Comentário | texto | 2.000 caracteres |
| Postagem de perfil | texto | 2.000 caracteres |
| Nome opcional (sem conta) | nome | 80 caracteres |
| Enquete | opções | de 2 a 6, até 80 caracteres cada |
| Etiqueta | nome / descrição | 24 / 120 caracteres |

Para desenhos em texto, veja a [arte ASCII do perfil](/wiki/perfis/) (editor em [/f/arte.html](/f/arte.html)).', NULL, 'importação inicial', 'Importação inicial da wiki', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_paginas (slug, titulo, nav, grupo, resumo, ordem, corpo, oculta, rev_id, criado_em, atualizado_em) VALUES ('votos', 'Votos, notas e etiquetas', 'Votos, notas e etiquetas', 'Como funciona', 'Como funcionam os votos, a nota de relevância e coerência, as etiquetas e as enquetes.', 80, '## Votos (▲ e ▼)

Em postagens e comentários, **quem tem conta** pode dar **▲ +1** ou **▼ −1**. A soma aparece no item e define a ordem **melhores** nas b/. Regras:

- só contas votam: quem está sem conta lê, mas não vota;
- **você não pode votar na sua própria** postagem ou comentário;
- cada conta tem um voto por item, e pode **trocar ou tirar** o voto;
- há um limite de votos por minuto e por hora, contra abuso.

Os votos individuais **não são públicos**: ninguém vê quem votou em quê, exceto os ADMs (veja abaixo).

## Notas (★ 1 a 5)

Além do voto, quem tem conta pode dar uma **nota de 1 a 5 estrelas** para a **relevância e coerência** de uma postagem ou comentário. O item mostra a **média** e quantas notas recebeu. A nota é separada do voto: ela serve para dizer se o texto é pertinente e faz sentido, não se você concorda. As mesmas regras valem: só contas, nunca no próprio item, dá para mudar ou retirar.

## Quem vê quem votou

Os **ADMs** podem ver quem votou e quem deu nota: o ADM do site vê tudo, e o ADM de uma b/ vê só o que é da b/ dele. Em itens anônimos aparece **quem votou**, nunca quem escreveu. Fora isso, os votos e notas de uma pessoa não aparecem para os outros usuários.

## Etiquetas

**Etiquetas** são rótulos curtos, até **3 por item**, que aparecem como chips perto do título. Clicar numa etiqueta filtra o feed da b/ só com os itens que a têm.

- Existem etiquetas **do site** (valem em qualquer lugar e só os ADMs do site criam) e etiquetas **de cada b/** (criadas pelos ADMs dela).
- Ao criar uma postagem ou comentário você pode escolher até 3 das etiquetas disponíveis. Depois, **o autor com conta ou um ADM** pode mudá-las, e ADMs podem acrescentar outras (o total continua em 3).
- O nome de uma etiqueta tem até 24 caracteres, e a descrição, até 120. Os ADMs podem **desativar** uma etiqueta: ela some dos itens e dos seletores, e volta se for reativada.

## Enquetes

Uma postagem pode ter uma **enquete**, marcada com `[enquete]` na lista.

- De **2 a 6 opções**, de até 80 caracteres cada, e um prazo de **1 hora, 24 horas, 3 dias ou 7 dias**.
- **Só vota quem tem conta com pelo menos 3 dias**. Primordiais e ADMs não precisam esperar. Cada conta tem **1 voto**, que **não pode ser trocado**.
- O resultado aparece para quem **já votou**, para todos **depois que a enquete encerra**, e como prévia para o autor da postagem e para ADMs.
- Os votos individuais não são públicos. **Ninguém, nem ADMs, altera votos.**
- Se a postagem for ocultada pela moderação, a enquete some junto. Se o autor excluir a postagem, a enquete é apagada.', 0, '6c1bfe28-b02f-58e8-ba97-def31a824409', '2026-11-27T16:00:00.000Z', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em) VALUES ('6c1bfe28-b02f-58e8-ba97-def31a824409', 'votos', 'criacao', 'Votos, notas e etiquetas', 'Votos, notas e etiquetas', 'Como funciona', 'Como funcionam os votos, a nota de relevância e coerência, as etiquetas e as enquetes.', 80, '## Votos (▲ e ▼)

Em postagens e comentários, **quem tem conta** pode dar **▲ +1** ou **▼ −1**. A soma aparece no item e define a ordem **melhores** nas b/. Regras:

- só contas votam: quem está sem conta lê, mas não vota;
- **você não pode votar na sua própria** postagem ou comentário;
- cada conta tem um voto por item, e pode **trocar ou tirar** o voto;
- há um limite de votos por minuto e por hora, contra abuso.

Os votos individuais **não são públicos**: ninguém vê quem votou em quê, exceto os ADMs (veja abaixo).

## Notas (★ 1 a 5)

Além do voto, quem tem conta pode dar uma **nota de 1 a 5 estrelas** para a **relevância e coerência** de uma postagem ou comentário. O item mostra a **média** e quantas notas recebeu. A nota é separada do voto: ela serve para dizer se o texto é pertinente e faz sentido, não se você concorda. As mesmas regras valem: só contas, nunca no próprio item, dá para mudar ou retirar.

## Quem vê quem votou

Os **ADMs** podem ver quem votou e quem deu nota: o ADM do site vê tudo, e o ADM de uma b/ vê só o que é da b/ dele. Em itens anônimos aparece **quem votou**, nunca quem escreveu. Fora isso, os votos e notas de uma pessoa não aparecem para os outros usuários.

## Etiquetas

**Etiquetas** são rótulos curtos, até **3 por item**, que aparecem como chips perto do título. Clicar numa etiqueta filtra o feed da b/ só com os itens que a têm.

- Existem etiquetas **do site** (valem em qualquer lugar e só os ADMs do site criam) e etiquetas **de cada b/** (criadas pelos ADMs dela).
- Ao criar uma postagem ou comentário você pode escolher até 3 das etiquetas disponíveis. Depois, **o autor com conta ou um ADM** pode mudá-las, e ADMs podem acrescentar outras (o total continua em 3).
- O nome de uma etiqueta tem até 24 caracteres, e a descrição, até 120. Os ADMs podem **desativar** uma etiqueta: ela some dos itens e dos seletores, e volta se for reativada.

## Enquetes

Uma postagem pode ter uma **enquete**, marcada com `[enquete]` na lista.

- De **2 a 6 opções**, de até 80 caracteres cada, e um prazo de **1 hora, 24 horas, 3 dias ou 7 dias**.
- **Só vota quem tem conta com pelo menos 3 dias**. Primordiais e ADMs não precisam esperar. Cada conta tem **1 voto**, que **não pode ser trocado**.
- O resultado aparece para quem **já votou**, para todos **depois que a enquete encerra**, e como prévia para o autor da postagem e para ADMs.
- Os votos individuais não são públicos. **Ninguém, nem ADMs, altera votos.**
- Se a postagem for ocultada pela moderação, a enquete some junto. Se o autor excluir a postagem, a enquete é apagada.', NULL, 'importação inicial', 'Importação inicial da wiki', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_paginas (slug, titulo, nav, grupo, resumo, ordem, corpo, oculta, rev_id, criado_em, atualizado_em) VALUES ('arquivos', 'Imagens e vídeos', 'Imagens e vídeos', 'Como funciona', 'Quem pode enviar arquivos, quais tipos e tamanhos o site aceita e o que muda para itens anônimos.', 90, 'Além de [imagens por link](/wiki/formatacao/), o basedisso permite **enviar um arquivo** (imagem ou vídeo) junto de uma postagem ou comentário. O arquivo fica hospedado no próprio site.

## Quem pode enviar

O envio exige **conta**. Além disso:

| Onde | Quem envia |
|---|---|
| Qualquer lugar | **ADMs do site** |
| Na própria b/ | **ADMs dessa b/** |
| Numa b/ com o envio **liberado** | **Qualquer conta** |
| Fora das b/ (literatura, perfis) | só ADMs do site |

Por padrão o envio **vem desligado** em cada b/: são os ADMs da b/ que decidem liberá-lo para as contas. Quando o envio está disponível, o formulário mostra o botão de anexar arquivo.

## Tipos e tamanhos

| Tipo | Formatos aceitos | Tamanho máximo |
|---|---|---|
| Imagem | JPG, PNG, GIF, WebP | **8 MB** |
| Vídeo | MP4, WebM | **50 MB** |

- É **um arquivo por postagem ou comentário**.
- O site confere o conteúdo real do arquivo, não só o nome ou a extensão: um arquivo de outro tipo, mesmo renomeado, é recusado.
- O navegador gera uma **miniatura** do arquivo no envio; é ela que aparece na lista.

## Limites de envio

Para evitar abuso, cada conta pode enviar até **12 arquivos por hora** e **40 por dia**, e ter no máximo **5 arquivos enviados e ainda não publicados** ao mesmo tempo. Arquivos enviados que ninguém publicou são apagados depois de algumas horas.

## Anonimato

Quem enviou o arquivo **nunca aparece publicamente**. Se a postagem ou o comentário saiu como `>>anônimo`, o arquivo também é anônimo.

## Moderação

Os ADMs podem **ocultar ou remover** arquivos, e o efeito é imediato. Vale a [regra de conteúdo proibido](/wiki/regras/): quem envia responde pelo que envia. Ocultar ou apagar a postagem ou comentário também tira o arquivo do ar.', 0, '4b600ec8-20f8-57b5-b895-f80d116922ce', '2026-11-27T16:00:00.000Z', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em) VALUES ('4b600ec8-20f8-57b5-b895-f80d116922ce', 'arquivos', 'criacao', 'Imagens e vídeos', 'Imagens e vídeos', 'Como funciona', 'Quem pode enviar arquivos, quais tipos e tamanhos o site aceita e o que muda para itens anônimos.', 90, 'Além de [imagens por link](/wiki/formatacao/), o basedisso permite **enviar um arquivo** (imagem ou vídeo) junto de uma postagem ou comentário. O arquivo fica hospedado no próprio site.

## Quem pode enviar

O envio exige **conta**. Além disso:

| Onde | Quem envia |
|---|---|
| Qualquer lugar | **ADMs do site** |
| Na própria b/ | **ADMs dessa b/** |
| Numa b/ com o envio **liberado** | **Qualquer conta** |
| Fora das b/ (literatura, perfis) | só ADMs do site |

Por padrão o envio **vem desligado** em cada b/: são os ADMs da b/ que decidem liberá-lo para as contas. Quando o envio está disponível, o formulário mostra o botão de anexar arquivo.

## Tipos e tamanhos

| Tipo | Formatos aceitos | Tamanho máximo |
|---|---|---|
| Imagem | JPG, PNG, GIF, WebP | **8 MB** |
| Vídeo | MP4, WebM | **50 MB** |

- É **um arquivo por postagem ou comentário**.
- O site confere o conteúdo real do arquivo, não só o nome ou a extensão: um arquivo de outro tipo, mesmo renomeado, é recusado.
- O navegador gera uma **miniatura** do arquivo no envio; é ela que aparece na lista.

## Limites de envio

Para evitar abuso, cada conta pode enviar até **12 arquivos por hora** e **40 por dia**, e ter no máximo **5 arquivos enviados e ainda não publicados** ao mesmo tempo. Arquivos enviados que ninguém publicou são apagados depois de algumas horas.

## Anonimato

Quem enviou o arquivo **nunca aparece publicamente**. Se a postagem ou o comentário saiu como `>>anônimo`, o arquivo também é anônimo.

## Moderação

Os ADMs podem **ocultar ou remover** arquivos, e o efeito é imediato. Vale a [regra de conteúdo proibido](/wiki/regras/): quem envia responde pelo que envia. Ocultar ou apagar a postagem ou comentário também tira o arquivo do ar.', NULL, 'importação inicial', 'Importação inicial da wiki', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_paginas (slug, titulo, nav, grupo, resumo, ordem, corpo, oculta, rev_id, criado_em, atualizado_em) VALUES ('moderacao', 'Moderação e denúncias', 'Moderação e denúncias', 'Conta e site', 'Quem modera, o que os ADMs podem fazer, como avisar sobre um problema e o que o site faz (e ainda não faz) em cada caso.', 100, '## Quem modera

Há dois níveis de ADM:

- **ADMs do site**: o fundador `>>Intimorato` e quem ele nomear. Moderam **todo o site**. Aparecem com o selo `[M]`.
- **ADMs de uma b/**: moderam **só aquela b/**, nomeados pelos ADMs do site. Aparecem com o selo `[b]` dentro da b/.

A lista de ADMs de cada b/ está no quadro "moderação" dela e em [/b/membros/](/b/membros/).

## O que os ADMs podem fazer

| Ferramenta | ADM do site | ADM da b/ |
|---|---|---|
| **Ocultar ou apagar** postagens e comentários | em todo o site | só na b/ |
| **Fixar** postagens (até 3 por b/) e comentários (até 3 por postagem) | sim | só na b/ |
| **Etiquetas** | do site e de qualquer b/ | só as da b/ |
| **Bloquear conexões sem conta** | no site todo ou em uma b/ | só na b/ |
| **Ver quem votou** e quem deu nota | tudo | só na b/ |
| **Ver a conta por trás de um item `>>anônimo`** | tudo | só na b/ |
| **Liberar ou travar o envio de arquivos** | sim | só na b/ |
| **Editar o cartão lateral** e o **avatar ASCII da b/** | sim | só na b/ |
| **Remover arte e avatar ASCII** dos perfis | sim | não |
| **Criar b/**, nomear ou remover ADMs | sim | não |
| **Códigos de convite e caixas de acesso**, confirmar pagamentos manualmente | sim | não |
| **Editar textos coletivos** (como a Bíblia Amarela) | sim | não |

Conteúdo **oculto** some para o público, mas continua guardado no banco de dados: pode ser restaurado ou servir de prova. Postagens ocultas escondem também as enquetes e os arquivos delas.

### Bloqueio de conexão

Quem posta **sem conta** pode ter a **conexão bloqueada** por 24 horas, 7 dias, 30 dias ou sem prazo, com um motivo registrado (até 200 caracteres). O bloqueio impede postar e comentar sem conta; **contas nunca são afetadas por ele**. O ADM pode também ocultar os itens sem conta dessa conexão, e dá para reexibir depois. Cada escopo (o site ou cada b/) tem um rótulo próprio para a mesma conexão, então não dá para cruzar quem posta sem conta entre comunidades.

### Itens anônimos e a moderação

Itens `>>anônimo` de **quem tem conta** continuam anônimos para os outros usuários, mas os ADMs conseguem ver a conta por trás deles (ADMs do site, em qualquer lugar; ADMs de uma b/, só na b/ deles). Itens de **quem postou sem conta** não têm conta por trás; a moderação enxerga só o rótulo da conexão.

## Como avisar sobre um problema

**Hoje não existe um botão "denunciar" em cada postagem ou comentário.** Para avisar a administração, use um destes caminhos:

1. A aba **ADM** da barra lateral: ela tem um campo de comentário e o e-mail de contato.
2. Uma postagem ou comentário em [b/adm](/b/adm/), que é público e aceita posts com ou sem conta.
3. Para um problema numa b/ específica, procure os ADMs dela em [/b/membros/](/b/membros/).

Ao avisar, informe **onde está** o conteúdo (o endereço da postagem) e **qual regra** ele quebra. Conteúdo de abuso sexual de menores e outros crimes graves vão direto para as autoridades.

## O que esperar depois do aviso

Os ADMs avaliam por bom senso, com base nas [regras gerais](/wiki/regras/). Não há prazo garantido de resposta, e nem todo aviso resulta em remoção. A decisão pode ser contestada pelos mesmos canais acima.

## Acesso à moderação

ADMs usam a página [/b/adm/moderar/](/b/adm/moderar/), que mostra as ferramentas de acordo com o nível da conta.', 0, '350647bd-8fa1-5288-a3a8-a2fe038b0caa', '2026-11-27T16:00:00.000Z', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em) VALUES ('350647bd-8fa1-5288-a3a8-a2fe038b0caa', 'moderacao', 'criacao', 'Moderação e denúncias', 'Moderação e denúncias', 'Conta e site', 'Quem modera, o que os ADMs podem fazer, como avisar sobre um problema e o que o site faz (e ainda não faz) em cada caso.', 100, '## Quem modera

Há dois níveis de ADM:

- **ADMs do site**: o fundador `>>Intimorato` e quem ele nomear. Moderam **todo o site**. Aparecem com o selo `[M]`.
- **ADMs de uma b/**: moderam **só aquela b/**, nomeados pelos ADMs do site. Aparecem com o selo `[b]` dentro da b/.

A lista de ADMs de cada b/ está no quadro "moderação" dela e em [/b/membros/](/b/membros/).

## O que os ADMs podem fazer

| Ferramenta | ADM do site | ADM da b/ |
|---|---|---|
| **Ocultar ou apagar** postagens e comentários | em todo o site | só na b/ |
| **Fixar** postagens (até 3 por b/) e comentários (até 3 por postagem) | sim | só na b/ |
| **Etiquetas** | do site e de qualquer b/ | só as da b/ |
| **Bloquear conexões sem conta** | no site todo ou em uma b/ | só na b/ |
| **Ver quem votou** e quem deu nota | tudo | só na b/ |
| **Ver a conta por trás de um item `>>anônimo`** | tudo | só na b/ |
| **Liberar ou travar o envio de arquivos** | sim | só na b/ |
| **Editar o cartão lateral** e o **avatar ASCII da b/** | sim | só na b/ |
| **Remover arte e avatar ASCII** dos perfis | sim | não |
| **Criar b/**, nomear ou remover ADMs | sim | não |
| **Códigos de convite e caixas de acesso**, confirmar pagamentos manualmente | sim | não |
| **Editar textos coletivos** (como a Bíblia Amarela) | sim | não |

Conteúdo **oculto** some para o público, mas continua guardado no banco de dados: pode ser restaurado ou servir de prova. Postagens ocultas escondem também as enquetes e os arquivos delas.

### Bloqueio de conexão

Quem posta **sem conta** pode ter a **conexão bloqueada** por 24 horas, 7 dias, 30 dias ou sem prazo, com um motivo registrado (até 200 caracteres). O bloqueio impede postar e comentar sem conta; **contas nunca são afetadas por ele**. O ADM pode também ocultar os itens sem conta dessa conexão, e dá para reexibir depois. Cada escopo (o site ou cada b/) tem um rótulo próprio para a mesma conexão, então não dá para cruzar quem posta sem conta entre comunidades.

### Itens anônimos e a moderação

Itens `>>anônimo` de **quem tem conta** continuam anônimos para os outros usuários, mas os ADMs conseguem ver a conta por trás deles (ADMs do site, em qualquer lugar; ADMs de uma b/, só na b/ deles). Itens de **quem postou sem conta** não têm conta por trás; a moderação enxerga só o rótulo da conexão.

## Como avisar sobre um problema

**Hoje não existe um botão "denunciar" em cada postagem ou comentário.** Para avisar a administração, use um destes caminhos:

1. A aba **ADM** da barra lateral: ela tem um campo de comentário e o e-mail de contato.
2. Uma postagem ou comentário em [b/adm](/b/adm/), que é público e aceita posts com ou sem conta.
3. Para um problema numa b/ específica, procure os ADMs dela em [/b/membros/](/b/membros/).

Ao avisar, informe **onde está** o conteúdo (o endereço da postagem) e **qual regra** ele quebra. Conteúdo de abuso sexual de menores e outros crimes graves vão direto para as autoridades.

## O que esperar depois do aviso

Os ADMs avaliam por bom senso, com base nas [regras gerais](/wiki/regras/). Não há prazo garantido de resposta, e nem todo aviso resulta em remoção. A decisão pode ser contestada pelos mesmos canais acima.

## Acesso à moderação

ADMs usam a página [/b/adm/moderar/](/b/adm/moderar/), que mostra as ferramentas de acordo com o nível da conta.', NULL, 'importação inicial', 'Importação inicial da wiki', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_paginas (slug, titulo, nav, grupo, resumo, ordem, corpo, oculta, rev_id, criado_em, atualizado_em) VALUES ('contas', 'Contas e privacidade', 'Contas e privacidade', 'Conta e site', 'Como se cria uma conta, o que ela permite, que dados o site guarda e por quê, e o que fazer para sair ou tirar uma dúvida.', 110, '## Sem conta e com conta

Você **não precisa de conta** para ler o site, nem para postar e comentar nas b/ abertas. Uma conta libera:

- **votar** e dar **nota** em postagens e comentários, e **votar em enquetes**;
- postar com o **seu nome** (`>>seunome`) ou, se preferir, como `>>anônimo`;
- **excluir** o que você escreveu;
- ter **perfil**, com arte e avatar ASCII, e publicar nele;
- **unir-se** a b/ e enviar arquivos onde o envio estiver liberado;
- gerar [códigos de convite](/convites/), se for primordial pagante.

## Como criar uma conta

O cadastro livre está fechado por enquanto. A página [/cadastro](/cadastro) oferece a **série primordial**, e hoje há estas formas de entrar:

1. **Inscrição individual paga**: você escolhe o nome, informa um e-mail e paga **R$ 5,00, uma vez só**, por **Pix ou cartão** (via Mercado Pago). Veja [Apoiar](/wiki/apoiar/).
2. **Código de convite ou de acesso**: um código de 6 caracteres, que pode vir de um primordial pagante, de um ADM do site ou de uma caixa de acesso coletivo que bateu a meta. Cada código só pode ser usado uma vez **por rede (conexão de internet)**. Com código, o e-mail é opcional.

Regras da conta:

- **Nome**: de 3 a 20 caracteres (letras, números ou `_`). **Não pode ser trocado** depois. Alguns nomes são reservados (como os do sistema e variações de "anônimo").
- **Senha**: de 8 a 128 caracteres.
- **Número primordial** (`#N`): quem entra pela série, com pagamento ou código, recebe um número na ordem de entrada. É mostrado como selo no nome. Você não escolhe o número.
- **Convites**: só primordiais que **pagaram** a inscrição geram códigos: um a cada 72 horas, válido por 24 horas.

Depois do pagamento confirmado, a página de retorno deixa você **definir a senha** e ativar a conta. **Guarde o link** dessa página: ele serve para definir a senha da reserva, inclusive em outro aparelho. O nome fica reservado por **30 minutos** a partir do início do pagamento; se o pagamento não for confirmado nesse tempo, o nome volta a ficar livre.

## Entrar, sair e senha

Entre em [/entrar](/entrar). A sessão dura **30 dias** neste navegador, ou até você clicar em **Sair**. Se errar a senha várias vezes seguidas, o site pede para esperar um pouco.

**Não existe recuperação automática de senha.** Guarde a sua senha. Se tiver problema com o acesso, fale com a administração pela aba **ADM**.

## Excluir a conta

Não existe um botão para excluir a conta inteira. Para pedir a exclusão, fale com a administração pela aba **ADM** ou por [b/adm](/b/adm/). Você pode **excluir sozinho** as suas postagens e comentários, e remover a sua arte e o seu avatar ASCII.

## Anonimato

Postar **sem conta** ou como `>>anônimo` esconde a sua identidade dos **outros usuários**, mas não do site:

- **Sem conta**: o site guarda um código derivado do seu endereço de rede (uma impressão criptográfica com sal, **não** o endereço em si) para limitar spam e abuso. Os ADMs enxergam só um rótulo da conexão, diferente em cada b/.
- **Com conta, como `>>anônimo`**: o site guarda qual conta fez o item. Os **ADMs** conseguem ver essa conta (ADMs do site, em tudo; ADMs de uma b/, na b/ deles). Os outros usuários, não.
- Itens de quem postou **sem conta** **não podem ser excluídos** pelo autor. Peça a um ADM.
- O site responde a **ordens judiciais**, nos termos do Marco Civil da Internet.

## Que dados o site guarda

| Dado | Quando | Para quê |
|---|---|---|
| Nome, data de criação, número primordial, selos | conta | funcionamento do site; é público no seu perfil |
| E-mail | obrigatório para pagar e nas caixas; opcional com código | pagamento, contato sobre a compra |
| Senha | conta | guardada só como *hash* (PBKDF2 com sal); o site não sabe a sua senha |
| Sessão (cookie `bd_sess`, 30 dias) | ao entrar | manter você conectado |
| Cookie de reserva (`bd_reserva`, 30 dias) | ao iniciar um pagamento | ligar o pagamento à sua reserva |
| Cookie de moderação (`bd_mod`) | só ADMs | acesso à moderação |
| Impressão do endereço de rede (*hash* com sal) | ao postar, comentar, cadastrar, pagar e usar códigos | limitar spam e abuso; aplicar "um código por rede" |
| Postagens, comentários, enquetes, votos, notas, arte e avatar, b/ de que você é membro | uso | o próprio serviço. Votos individuais não são públicos; a lista de membros das b/ é pública |
| Dados do pagamento (ID no Mercado Pago, valor, status) | pagamento | comprovar e conciliar pagamentos |
| Preferências no navegador (tema, modo compacto, imagens ligadas ou não, histórico das ferramentas, painéis recolhidos) | uso | ficam **só no seu aparelho** |

O site **não usa** cookies de publicidade nem ferramentas de rastreamento de terceiros.

## Quem mais recebe dados

- **Cloudflare**: hospeda o site, o banco de dados e os arquivos enviados, e vê o seu endereço de rede ao entregar as páginas. Também fornece a verificação anti-robô mostrada a quem posta sem conta.
- **Mercado Pago**: processa os pagamentos e recebe o seu e-mail e os dados da compra, conforme a política dele. O basedisso **não recebe nem guarda os dados do seu cartão**.
- **Sites de imagens por link** e o serviço que entrega os ícones (cdnjs/Font Awesome): recebem uma requisição do seu navegador.

## Seus direitos

Pela LGPD você pode pedir para **confirmar, acessar, corrigir ou excluir** os seus dados, entre outros direitos. Faça o pedido à administração pela aba **ADM** ou por [b/adm](/b/adm/).', 0, 'b17acbe5-6922-5fd9-b14e-67a9b54d9aa5', '2026-11-27T16:00:00.000Z', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em) VALUES ('b17acbe5-6922-5fd9-b14e-67a9b54d9aa5', 'contas', 'criacao', 'Contas e privacidade', 'Contas e privacidade', 'Conta e site', 'Como se cria uma conta, o que ela permite, que dados o site guarda e por quê, e o que fazer para sair ou tirar uma dúvida.', 110, '## Sem conta e com conta

Você **não precisa de conta** para ler o site, nem para postar e comentar nas b/ abertas. Uma conta libera:

- **votar** e dar **nota** em postagens e comentários, e **votar em enquetes**;
- postar com o **seu nome** (`>>seunome`) ou, se preferir, como `>>anônimo`;
- **excluir** o que você escreveu;
- ter **perfil**, com arte e avatar ASCII, e publicar nele;
- **unir-se** a b/ e enviar arquivos onde o envio estiver liberado;
- gerar [códigos de convite](/convites/), se for primordial pagante.

## Como criar uma conta

O cadastro livre está fechado por enquanto. A página [/cadastro](/cadastro) oferece a **série primordial**, e hoje há estas formas de entrar:

1. **Inscrição individual paga**: você escolhe o nome, informa um e-mail e paga **R$ 5,00, uma vez só**, por **Pix ou cartão** (via Mercado Pago). Veja [Apoiar](/wiki/apoiar/).
2. **Código de convite ou de acesso**: um código de 6 caracteres, que pode vir de um primordial pagante, de um ADM do site ou de uma caixa de acesso coletivo que bateu a meta. Cada código só pode ser usado uma vez **por rede (conexão de internet)**. Com código, o e-mail é opcional.

Regras da conta:

- **Nome**: de 3 a 20 caracteres (letras, números ou `_`). **Não pode ser trocado** depois. Alguns nomes são reservados (como os do sistema e variações de "anônimo").
- **Senha**: de 8 a 128 caracteres.
- **Número primordial** (`#N`): quem entra pela série, com pagamento ou código, recebe um número na ordem de entrada. É mostrado como selo no nome. Você não escolhe o número.
- **Convites**: só primordiais que **pagaram** a inscrição geram códigos: um a cada 72 horas, válido por 24 horas.

Depois do pagamento confirmado, a página de retorno deixa você **definir a senha** e ativar a conta. **Guarde o link** dessa página: ele serve para definir a senha da reserva, inclusive em outro aparelho. O nome fica reservado por **30 minutos** a partir do início do pagamento; se o pagamento não for confirmado nesse tempo, o nome volta a ficar livre.

## Entrar, sair e senha

Entre em [/entrar](/entrar). A sessão dura **30 dias** neste navegador, ou até você clicar em **Sair**. Se errar a senha várias vezes seguidas, o site pede para esperar um pouco.

**Não existe recuperação automática de senha.** Guarde a sua senha. Se tiver problema com o acesso, fale com a administração pela aba **ADM**.

## Excluir a conta

Não existe um botão para excluir a conta inteira. Para pedir a exclusão, fale com a administração pela aba **ADM** ou por [b/adm](/b/adm/). Você pode **excluir sozinho** as suas postagens e comentários, e remover a sua arte e o seu avatar ASCII.

## Anonimato

Postar **sem conta** ou como `>>anônimo` esconde a sua identidade dos **outros usuários**, mas não do site:

- **Sem conta**: o site guarda um código derivado do seu endereço de rede (uma impressão criptográfica com sal, **não** o endereço em si) para limitar spam e abuso. Os ADMs enxergam só um rótulo da conexão, diferente em cada b/.
- **Com conta, como `>>anônimo`**: o site guarda qual conta fez o item. Os **ADMs** conseguem ver essa conta (ADMs do site, em tudo; ADMs de uma b/, na b/ deles). Os outros usuários, não.
- Itens de quem postou **sem conta** **não podem ser excluídos** pelo autor. Peça a um ADM.
- O site responde a **ordens judiciais**, nos termos do Marco Civil da Internet.

## Que dados o site guarda

| Dado | Quando | Para quê |
|---|---|---|
| Nome, data de criação, número primordial, selos | conta | funcionamento do site; é público no seu perfil |
| E-mail | obrigatório para pagar e nas caixas; opcional com código | pagamento, contato sobre a compra |
| Senha | conta | guardada só como *hash* (PBKDF2 com sal); o site não sabe a sua senha |
| Sessão (cookie `bd_sess`, 30 dias) | ao entrar | manter você conectado |
| Cookie de reserva (`bd_reserva`, 30 dias) | ao iniciar um pagamento | ligar o pagamento à sua reserva |
| Cookie de moderação (`bd_mod`) | só ADMs | acesso à moderação |
| Impressão do endereço de rede (*hash* com sal) | ao postar, comentar, cadastrar, pagar e usar códigos | limitar spam e abuso; aplicar "um código por rede" |
| Postagens, comentários, enquetes, votos, notas, arte e avatar, b/ de que você é membro | uso | o próprio serviço. Votos individuais não são públicos; a lista de membros das b/ é pública |
| Dados do pagamento (ID no Mercado Pago, valor, status) | pagamento | comprovar e conciliar pagamentos |
| Preferências no navegador (tema, modo compacto, imagens ligadas ou não, histórico das ferramentas, painéis recolhidos) | uso | ficam **só no seu aparelho** |

O site **não usa** cookies de publicidade nem ferramentas de rastreamento de terceiros.

## Quem mais recebe dados

- **Cloudflare**: hospeda o site, o banco de dados e os arquivos enviados, e vê o seu endereço de rede ao entregar as páginas. Também fornece a verificação anti-robô mostrada a quem posta sem conta.
- **Mercado Pago**: processa os pagamentos e recebe o seu e-mail e os dados da compra, conforme a política dele. O basedisso **não recebe nem guarda os dados do seu cartão**.
- **Sites de imagens por link** e o serviço que entrega os ícones (cdnjs/Font Awesome): recebem uma requisição do seu navegador.

## Seus direitos

Pela LGPD você pode pedir para **confirmar, acessar, corrigir ou excluir** os seus dados, entre outros direitos. Faça o pedido à administração pela aba **ADM** ou por [b/adm](/b/adm/).', NULL, 'importação inicial', 'Importação inicial da wiki', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_paginas (slug, titulo, nav, grupo, resumo, ordem, corpo, oculta, rev_id, criado_em, atualizado_em) VALUES ('apoiar', 'Apoiar', 'Apoiar', 'Conta e site', 'As formas de pagar e contribuir que existem hoje: a inscrição individual e as caixas de acesso coletivo.', 120, 'Hoje há duas formas de colocar dinheiro no basedisso, ambas na página [/cadastro](/cadastro). Nas duas o pagamento é feito por **Pix** (e, na inscrição individual, também por **cartão**), processado pelo **Mercado Pago**. O basedisso não recebe nem guarda os dados do seu cartão.

## Inscrição individual (Usuário primordial)

É a compra de uma **conta** na série **#primordiais**.

- **Preço:** **R$ 5,00**, **pagamento único**. Não é assinatura e não renova.
- **O que você recebe:**
  1. uma conta com o **nome de usuário que você escolheu** (se estiver livre quando o pagamento for confirmado);
  2. um **número primordial** (`#N`), mostrado como selo no seu nome;
  3. o direito de **gerar códigos de convite**: um a cada 72 horas, cada um válido por 24 horas.
- **Como funciona:**
  1. Em [/cadastro](/cadastro), escreva o nome que quer, informe um e-mail e escolha **Pix** ou **cartão**.
  2. O nome fica **reservado por 30 minutos**. Se o pagamento não for confirmado nesse tempo, a reserva expira e o nome volta a ficar livre.
  3. Com o pagamento confirmado, a página de retorno deixa você **definir a senha** e ativar a conta. **Guarde o link** dessa página até ativar: ele funciona também em outro aparelho.
- Um ADM do site pode **confirmar um pagamento manualmente** se houver falha técnica.

A inscrição **não dá imunidade às regras** do site e a conta, o nome, o número e os códigos **não podem ser vendidos nem transferidos**. Veja as [regras gerais](/wiki/regras/).

Dúvidas sobre um pagamento, cobrança em duplicidade ou pedidos de reembolso: fale com a administração pela aba **ADM** ou por [b/adm](/b/adm/), informando o **nome de usuário** e o **e-mail** usado na compra.

## Caixas de acesso coletivo

As **caixas** servem para **abrir vagas para outras pessoas**:

- Qualquer pessoa pode **contribuir via Pix**, a partir de **R$ 1,00** (e até R$ 1.000,00 por contribuição), informando um e-mail.
- Cada caixa tem uma **meta**, mostrada na página. Quando a meta é atingida, a caixa gera um **código de acesso aberto**, visível para todos, válido por um tempo que depende da classe da caixa. Durante esse tempo, quem usar o código cria uma conta (uma por rede). Depois, a caixa espera um intervalo antes de reabrir.
- **Contribuir é uma doação para abrir vagas.** Ela **não compra uma conta** para quem contribuiu, e não garante que a pessoa consiga usar o código.

## Outras formas de ajudar

Nem toda ajuda é dinheiro: escrever bons posts e comentários, avisar sobre conteúdo que quebra as regras, dar sugestões em [b/adm](/b/adm/) e contribuir com os textos da [literatura](/wiki/literatura/) também fazem o site funcionar.', 0, 'd53762bf-843a-5cd1-ad00-fc7b185d9d75', '2026-11-27T16:00:00.000Z', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em) VALUES ('d53762bf-843a-5cd1-ad00-fc7b185d9d75', 'apoiar', 'criacao', 'Apoiar', 'Apoiar', 'Conta e site', 'As formas de pagar e contribuir que existem hoje: a inscrição individual e as caixas de acesso coletivo.', 120, 'Hoje há duas formas de colocar dinheiro no basedisso, ambas na página [/cadastro](/cadastro). Nas duas o pagamento é feito por **Pix** (e, na inscrição individual, também por **cartão**), processado pelo **Mercado Pago**. O basedisso não recebe nem guarda os dados do seu cartão.

## Inscrição individual (Usuário primordial)

É a compra de uma **conta** na série **#primordiais**.

- **Preço:** **R$ 5,00**, **pagamento único**. Não é assinatura e não renova.
- **O que você recebe:**
  1. uma conta com o **nome de usuário que você escolheu** (se estiver livre quando o pagamento for confirmado);
  2. um **número primordial** (`#N`), mostrado como selo no seu nome;
  3. o direito de **gerar códigos de convite**: um a cada 72 horas, cada um válido por 24 horas.
- **Como funciona:**
  1. Em [/cadastro](/cadastro), escreva o nome que quer, informe um e-mail e escolha **Pix** ou **cartão**.
  2. O nome fica **reservado por 30 minutos**. Se o pagamento não for confirmado nesse tempo, a reserva expira e o nome volta a ficar livre.
  3. Com o pagamento confirmado, a página de retorno deixa você **definir a senha** e ativar a conta. **Guarde o link** dessa página até ativar: ele funciona também em outro aparelho.
- Um ADM do site pode **confirmar um pagamento manualmente** se houver falha técnica.

A inscrição **não dá imunidade às regras** do site e a conta, o nome, o número e os códigos **não podem ser vendidos nem transferidos**. Veja as [regras gerais](/wiki/regras/).

Dúvidas sobre um pagamento, cobrança em duplicidade ou pedidos de reembolso: fale com a administração pela aba **ADM** ou por [b/adm](/b/adm/), informando o **nome de usuário** e o **e-mail** usado na compra.

## Caixas de acesso coletivo

As **caixas** servem para **abrir vagas para outras pessoas**:

- Qualquer pessoa pode **contribuir via Pix**, a partir de **R$ 1,00** (e até R$ 1.000,00 por contribuição), informando um e-mail.
- Cada caixa tem uma **meta**, mostrada na página. Quando a meta é atingida, a caixa gera um **código de acesso aberto**, visível para todos, válido por um tempo que depende da classe da caixa. Durante esse tempo, quem usar o código cria uma conta (uma por rede). Depois, a caixa espera um intervalo antes de reabrir.
- **Contribuir é uma doação para abrir vagas.** Ela **não compra uma conta** para quem contribuiu, e não garante que a pessoa consiga usar o código.

## Outras formas de ajudar

Nem toda ajuda é dinheiro: escrever bons posts e comentários, avisar sobre conteúdo que quebra as regras, dar sugestões em [b/adm](/b/adm/) e contribuir com os textos da [literatura](/wiki/literatura/) também fazem o site funcionar.', NULL, 'importação inicial', 'Importação inicial da wiki', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_paginas (slug, titulo, nav, grupo, resumo, ordem, corpo, oculta, rev_id, criado_em, atualizado_em) VALUES ('editar-a-wiki', 'Como editar a wiki', 'Como editar a wiki', 'Conta e site', 'Quem pode editar a wiki, como pedir autorização, como escrever e o que acontece com cada edição.', 125, 'Qualquer pessoa pode **ler** a wiki. Para **editar**, é preciso ter conta e autorização. Esta página explica quem pode, como pedir e como escrever.

## Quem pode editar

- **ADMs do site** editam qualquer página, criam páginas novas, ocultam, apagam, voltam uma página a uma versão antiga e decidem quem mais pode editar.
- **Contas autorizadas por um ADM** editam o texto, o título, o resumo e o nome no menu das páginas que já existem.
- **Todas as outras pessoas** só leem. O botão **Editar** aparece apenas para quem pode, e o servidor confere a permissão de novo a cada salvamento.

## Como pedir autorização

Fale com a administração pela aba **ADM** da barra lateral ou em [b/adm](/b/adm/), dizendo o nome da sua conta. A autorização vale só para a wiki e pode ser retirada a qualquer momento por um ADM.

## Como editar uma página

1. Entre na sua conta e abra a página que quer mudar.
2. Clique em **Editar**.
3. Altere o texto. A aba **Visualizar** mostra como a página vai ficar antes de salvar.
4. Escreva, em **Resumo da edição**, o que mudou e por quê.
5. Clique em **Salvar alterações**.

Se outra pessoa salvar a mesma página enquanto você edita, o site avisa e **não** sobrescreve o trabalho dela: copie o seu texto, abra a versão atual e refaça a alteração.

## Como escrever

A wiki usa uma marcação simples, parecida com Markdown, e **não aceita HTML**: tudo o que for digitado aparece como texto. O editor tem um **Guia de marcação** com os exemplos.

- `## Título` e `### Subtítulo` criam seções (o `##` entra no índice "Nesta página").
- `**negrito**`, `*itálico*` e `` `código` `` marcam trechos.
- `[texto](/wiki/regras/)` cria um link. Links só aceitam `http://`, `https://`, endereços do site, `#âncora` e `mailto:`.
- `- item` e `1. item` criam listas; recue dois espaços para fazer subitens.
- Quadros de aviso e exemplos usam linhas com três dois-pontos:

```
::: nota
**Atenção:** texto do aviso.
:::
```

Use `::: importante` para o aviso em destaque e `::: demo` para mostrar um exemplo com greentext.

## Histórico e reversão

Cada salvamento cria uma **versão**, com o nome de quem editou, a data e o resumo. O histórico de cada página fica em **Histórico** (`/wiki/<página>/historico/`) e as últimas edições de todas as páginas, em [Mudanças recentes](/wiki/recentes/). Quem lê pode ver o que mudou entre uma versão e a anterior. Um ADM pode reverter a página para qualquer versão antiga; isso cria uma nova versão e não apaga o histórico.

## Boas práticas

- Descreva o que o site **realmente faz hoje**; quando algo ainda não existe, diga isso em vez de prometer.
- Não ponha dados pessoais de ninguém, propaganda nem links enganosos.
- Seu nome de usuário aparece em cada versão que você salvar. Edições abusivas podem ser revertidas e a autorização, retirada.', 0, '5bd038ed-d0be-5c60-813d-5e77634e8997', '2026-11-27T16:00:00.000Z', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em) VALUES ('5bd038ed-d0be-5c60-813d-5e77634e8997', 'editar-a-wiki', 'criacao', 'Como editar a wiki', 'Como editar a wiki', 'Conta e site', 'Quem pode editar a wiki, como pedir autorização, como escrever e o que acontece com cada edição.', 125, 'Qualquer pessoa pode **ler** a wiki. Para **editar**, é preciso ter conta e autorização. Esta página explica quem pode, como pedir e como escrever.

## Quem pode editar

- **ADMs do site** editam qualquer página, criam páginas novas, ocultam, apagam, voltam uma página a uma versão antiga e decidem quem mais pode editar.
- **Contas autorizadas por um ADM** editam o texto, o título, o resumo e o nome no menu das páginas que já existem.
- **Todas as outras pessoas** só leem. O botão **Editar** aparece apenas para quem pode, e o servidor confere a permissão de novo a cada salvamento.

## Como pedir autorização

Fale com a administração pela aba **ADM** da barra lateral ou em [b/adm](/b/adm/), dizendo o nome da sua conta. A autorização vale só para a wiki e pode ser retirada a qualquer momento por um ADM.

## Como editar uma página

1. Entre na sua conta e abra a página que quer mudar.
2. Clique em **Editar**.
3. Altere o texto. A aba **Visualizar** mostra como a página vai ficar antes de salvar.
4. Escreva, em **Resumo da edição**, o que mudou e por quê.
5. Clique em **Salvar alterações**.

Se outra pessoa salvar a mesma página enquanto você edita, o site avisa e **não** sobrescreve o trabalho dela: copie o seu texto, abra a versão atual e refaça a alteração.

## Como escrever

A wiki usa uma marcação simples, parecida com Markdown, e **não aceita HTML**: tudo o que for digitado aparece como texto. O editor tem um **Guia de marcação** com os exemplos.

- `## Título` e `### Subtítulo` criam seções (o `##` entra no índice "Nesta página").
- `**negrito**`, `*itálico*` e `` `código` `` marcam trechos.
- `[texto](/wiki/regras/)` cria um link. Links só aceitam `http://`, `https://`, endereços do site, `#âncora` e `mailto:`.
- `- item` e `1. item` criam listas; recue dois espaços para fazer subitens.
- Quadros de aviso e exemplos usam linhas com três dois-pontos:

```
::: nota
**Atenção:** texto do aviso.
:::
```

Use `::: importante` para o aviso em destaque e `::: demo` para mostrar um exemplo com greentext.

## Histórico e reversão

Cada salvamento cria uma **versão**, com o nome de quem editou, a data e o resumo. O histórico de cada página fica em **Histórico** (`/wiki/<página>/historico/`) e as últimas edições de todas as páginas, em [Mudanças recentes](/wiki/recentes/). Quem lê pode ver o que mudou entre uma versão e a anterior. Um ADM pode reverter a página para qualquer versão antiga; isso cria uma nova versão e não apaga o histórico.

## Boas práticas

- Descreva o que o site **realmente faz hoje**; quando algo ainda não existe, diga isso em vez de prometer.
- Não ponha dados pessoais de ninguém, propaganda nem links enganosos.
- Seu nome de usuário aparece em cada versão que você salvar. Edições abusivas podem ser revertidas e a autorização, retirada.', NULL, 'importação inicial', 'Importação inicial da wiki', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_paginas (slug, titulo, nav, grupo, resumo, ordem, corpo, oculta, rev_id, criado_em, atualizado_em) VALUES ('faq', 'Perguntas frequentes', 'Perguntas frequentes', 'Conta e site', 'Respostas curtas para as dúvidas mais comuns, com link para a página que explica cada assunto.', 130, '::: faq

## Preciso de conta para postar ou comentar?

Não. Nas b/ abertas qualquer pessoa pode postar e comentar sem conta, com nome opcional. Votar, dar nota, votar em enquetes, ter perfil e excluir o que escreveu exigem conta. Veja [Contas e privacidade](/wiki/contas/).

## Como crio uma conta?

O cadastro livre está fechado por enquanto. Há a inscrição individual (R$ 5,00, única) e os códigos de convite ou de acesso, em [/cadastro](/cadastro). Veja [Apoiar](/wiki/apoiar/).

## Esqueci minha senha. E agora?

Não existe recuperação automática de senha. Fale com a administração pela aba **ADM** da barra lateral.

## Posso trocar meu nome de usuário?

Não. O nome (de 3 a 20 caracteres) não pode ser trocado depois de criado, e o número primordial também não.

## Como excluo uma postagem ou um comentário meu?

Se você tem conta, use o botão de excluir no próprio item. Se ele tinha respostas, o texto é apagado e fica "excluído pelo autor", para a conversa continuar fazendo sentido. Quem postou **sem conta** não consegue excluir; peça a um ADM. Veja [Comunidades](/wiki/comunidades/).

## Como excluo a minha conta?

Ainda não existe um botão para isso. Peça pela aba **ADM** ou em [b/adm](/b/adm/). Veja [Contas e privacidade](/wiki/contas/).

## Meu comentário (ou postagem) sumiu. Por quê?

Pode ter sido **excluído por você**, **ocultado pela moderação** ou ter ficado dentro de uma postagem que foi apagada. Se acha que foi um engano, fale com a administração pela aba **ADM**.

## Como crio uma b/?

Hoje só os ADMs do site criam comunidades. Proponha a sua em [b/adm](/b/adm/). Veja [Comunidades](/wiki/comunidades/).

## Por que não consigo enviar imagem ou vídeo?

O envio exige conta e, fora dos ADMs, só funciona nas b/ em que os ADMs liberaram. Imagens vão até 8 MB (JPG, PNG, GIF, WebP) e vídeos até 50 MB (MP4, WebM). Você também pode colar o endereço de uma imagem. Veja [Imagens e vídeos](/wiki/arquivos/).

## Por que não consigo votar em uma enquete?

É preciso estar com a conta ativa há pelo menos 3 dias (primordiais e ADMs estão isentos), e cada conta vota uma vez, sem trocar. Veja [Votos, notas e etiquetas](/wiki/votos/).

## Quando posto como `>>anônimo`, alguém sabe quem sou?

Os outros usuários não. Os ADMs conseguem ver a conta por trás do item (os do site, em qualquer lugar; os de uma b/, só na b/ deles). Veja [Contas e privacidade](/wiki/contas/).

## Como denuncio uma postagem?

Ainda não há um botão de denunciar em cada item. Avise pela aba **ADM**, por [b/adm](/b/adm/) ou procure os ADMs da b/ em [/b/membros/](/b/membros/). Veja [Moderação e denúncias](/wiki/moderacao/).

## Por que meu texto não aparece em negrito e os links não são clicáveis?

O basedisso usa texto simples: não há negrito, itálico, listas nem links no meio do texto. Para compartilhar um endereço, use o campo **Link** da postagem. Veja [Formatação](/wiki/formatacao/).

## Como faço uma linha verde?

Comece a linha com um `>`. É o chamado *greentext*. Veja [Formatação](/wiki/formatacao/).

## O que significam `[M]`, `[b]` e `primordial #N` ao lado dos nomes?

`[M]` é ADM do site, `[b]` é ADM da b/ onde você está, e `primordial #N` é quem entrou pela série primordial, com o seu número de ordem. Veja [Perfis](/wiki/perfis/).

## Como mudo o tema ou deixo o site mais compacto?

Na aba **Ajustes** da barra lateral: o tema **Escuro** e o **Papel**, e a **Navegação Compacta**. Sem nenhum tema marcado, vale o claro. A escolha fica guardada no seu navegador.

## O site manda e-mails?

Não manda notificações. O e-mail informado no cadastro serve para o pagamento e para contato sobre a compra. A opção "Notificações por Email", em Ajustes, ainda não tem efeito.

## Como uso a Arte ASCII?

Pelo editor em [/f/arte.html](/f/arte.html), que também está em **Ferramentas**. Com conta, você usa o desenho como arte do perfil ou como avatar. Veja [Perfis e arte ASCII](/wiki/perfis/).

## Como falo com a administração?

Pela aba **ADM** da barra lateral (e-mail de contato e campo de comentário) ou por [b/adm](/b/adm/), onde qualquer pessoa pode escrever, com ou sem conta.

:::', 0, '3f4e5e91-7193-54a5-bebe-225a3545ed5a', '2026-11-27T16:00:00.000Z', '2026-11-27T16:00:00.000Z');
INSERT OR IGNORE INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em) VALUES ('3f4e5e91-7193-54a5-bebe-225a3545ed5a', 'faq', 'criacao', 'Perguntas frequentes', 'Perguntas frequentes', 'Conta e site', 'Respostas curtas para as dúvidas mais comuns, com link para a página que explica cada assunto.', 130, '::: faq

## Preciso de conta para postar ou comentar?

Não. Nas b/ abertas qualquer pessoa pode postar e comentar sem conta, com nome opcional. Votar, dar nota, votar em enquetes, ter perfil e excluir o que escreveu exigem conta. Veja [Contas e privacidade](/wiki/contas/).

## Como crio uma conta?

O cadastro livre está fechado por enquanto. Há a inscrição individual (R$ 5,00, única) e os códigos de convite ou de acesso, em [/cadastro](/cadastro). Veja [Apoiar](/wiki/apoiar/).

## Esqueci minha senha. E agora?

Não existe recuperação automática de senha. Fale com a administração pela aba **ADM** da barra lateral.

## Posso trocar meu nome de usuário?

Não. O nome (de 3 a 20 caracteres) não pode ser trocado depois de criado, e o número primordial também não.

## Como excluo uma postagem ou um comentário meu?

Se você tem conta, use o botão de excluir no próprio item. Se ele tinha respostas, o texto é apagado e fica "excluído pelo autor", para a conversa continuar fazendo sentido. Quem postou **sem conta** não consegue excluir; peça a um ADM. Veja [Comunidades](/wiki/comunidades/).

## Como excluo a minha conta?

Ainda não existe um botão para isso. Peça pela aba **ADM** ou em [b/adm](/b/adm/). Veja [Contas e privacidade](/wiki/contas/).

## Meu comentário (ou postagem) sumiu. Por quê?

Pode ter sido **excluído por você**, **ocultado pela moderação** ou ter ficado dentro de uma postagem que foi apagada. Se acha que foi um engano, fale com a administração pela aba **ADM**.

## Como crio uma b/?

Hoje só os ADMs do site criam comunidades. Proponha a sua em [b/adm](/b/adm/). Veja [Comunidades](/wiki/comunidades/).

## Por que não consigo enviar imagem ou vídeo?

O envio exige conta e, fora dos ADMs, só funciona nas b/ em que os ADMs liberaram. Imagens vão até 8 MB (JPG, PNG, GIF, WebP) e vídeos até 50 MB (MP4, WebM). Você também pode colar o endereço de uma imagem. Veja [Imagens e vídeos](/wiki/arquivos/).

## Por que não consigo votar em uma enquete?

É preciso estar com a conta ativa há pelo menos 3 dias (primordiais e ADMs estão isentos), e cada conta vota uma vez, sem trocar. Veja [Votos, notas e etiquetas](/wiki/votos/).

## Quando posto como `>>anônimo`, alguém sabe quem sou?

Os outros usuários não. Os ADMs conseguem ver a conta por trás do item (os do site, em qualquer lugar; os de uma b/, só na b/ deles). Veja [Contas e privacidade](/wiki/contas/).

## Como denuncio uma postagem?

Ainda não há um botão de denunciar em cada item. Avise pela aba **ADM**, por [b/adm](/b/adm/) ou procure os ADMs da b/ em [/b/membros/](/b/membros/). Veja [Moderação e denúncias](/wiki/moderacao/).

## Por que meu texto não aparece em negrito e os links não são clicáveis?

O basedisso usa texto simples: não há negrito, itálico, listas nem links no meio do texto. Para compartilhar um endereço, use o campo **Link** da postagem. Veja [Formatação](/wiki/formatacao/).

## Como faço uma linha verde?

Comece a linha com um `>`. É o chamado *greentext*. Veja [Formatação](/wiki/formatacao/).

## O que significam `[M]`, `[b]` e `primordial #N` ao lado dos nomes?

`[M]` é ADM do site, `[b]` é ADM da b/ onde você está, e `primordial #N` é quem entrou pela série primordial, com o seu número de ordem. Veja [Perfis](/wiki/perfis/).

## Como mudo o tema ou deixo o site mais compacto?

Na aba **Ajustes** da barra lateral: o tema **Escuro** e o **Papel**, e a **Navegação Compacta**. Sem nenhum tema marcado, vale o claro. A escolha fica guardada no seu navegador.

## O site manda e-mails?

Não manda notificações. O e-mail informado no cadastro serve para o pagamento e para contato sobre a compra. A opção "Notificações por Email", em Ajustes, ainda não tem efeito.

## Como uso a Arte ASCII?

Pelo editor em [/f/arte.html](/f/arte.html), que também está em **Ferramentas**. Com conta, você usa o desenho como arte do perfil ou como avatar. Veja [Perfis e arte ASCII](/wiki/perfis/).

## Como falo com a administração?

Pela aba **ADM** da barra lateral (e-mail de contato e campo de comentário) ou por [b/adm](/b/adm/), onde qualquer pessoa pode escrever, com ou sem conta.

:::', NULL, 'importação inicial', 'Importação inicial da wiki', '2026-11-27T16:00:00.000Z');
