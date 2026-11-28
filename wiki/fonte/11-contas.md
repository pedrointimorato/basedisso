---
titulo: Contas e privacidade
nav: Contas e privacidade
grupo: Conta e site
resumo: Como se cria uma conta, o que ela permite, que dados o site guarda e por quê, e o que fazer para sair ou tirar uma dúvida.
---

## Sem conta e com conta

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

Pela LGPD você pode pedir para **confirmar, acessar, corrigir ou excluir** os seus dados, entre outros direitos. Faça o pedido à administração pela aba **ADM** ou por [b/adm](/b/adm/).
