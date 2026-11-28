---
titulo: Formatação
nav: Formatação
grupo: Como funciona
resumo: O texto do basedisso é simples. Aqui está o que muda a aparência: greentext, menções, imagens por link e os limites de tamanho.
---

## Texto simples

O basedisso **não usa Markdown nem HTML**. Negrito, itálico, títulos, listas e tabelas não existem: o que você digita é o que aparece. Quebras de linha e espaços são mantidos. Só algumas convenções têm efeito (abaixo) e valem em postagens, comentários e postagens de perfil.

## Greentext

Uma **linha que começa com `>`** (espaços antes dela também valem) aparece em **verde**, como nas imagens de fórum. Serve para citar um trecho ou contar uma história.

<pre class="wiki-demo"><span class="bd-green">&gt;estava eu no mercado</span>
<span class="bd-green">&gt;aí acontece isso</span>
e fim da história, sem verde nesta linha.</pre>

Só a linha inteira conta: um `>` no meio da frase não faz nada. Cada linha é avaliada separadamente. O texto guardado não muda, a cor é aplicada só na hora de mostrar.

## Menções: `>>Nome` e `@Nome`

Escrever `>>Nome` ou `@Nome`, com o nome de uma conta que existe, vira um **link para o perfil** dela. O nome tem de 3 a 20 caracteres (letras, números ou `_`). Se a conta não existir, o texto fica como você escreveu.

<pre class="wiki-demo">oi, concordo com &gt;&gt;Intimorato nisso
valeu, @Intimorato</pre>

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

Para desenhos em texto, veja a [arte ASCII do perfil](/wiki/perfis/) (editor em [/f/arte.html](/f/arte.html)).
