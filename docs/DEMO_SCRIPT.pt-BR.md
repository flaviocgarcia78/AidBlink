# AidBlink — Roteiro da demo do produto (≤ 3 minutos)

> 🌐 **English:** [DEMO_SCRIPT.md](./DEMO_SCRIPT.md)

> A Colosseum pede um vídeo de demo do produto de até 3 minutos, separado do
> pitch. Este é um **roteiro plano a plano** para uma única gravação contínua de
> tela. Tudo abaixo é um fluxo real e funcional.

**Duração alvo:** ~2:50 · **Formato:** gravação de tela + narração.
**Resolução:** 1440×900 ou maior, navegador a 100% de zoom.

---

## Checklist pré-gravação

1. `npm run build && npm start` (ou `npm run dev`).
2. `cp .env.example .env` e defina o endereço do tesouro; use **Devnet**. O
   padrão de `AIDBLINK_PROGRAM_ID` é o programa já implantado na Devnet por este
   repositório.
3. Instale a Phantom, mude para **Devnet**, abasteça com SOL de teste
   (https://faucet.solana.com).
4. Faça login em `/login` com o usuário demo da organização
   (`org@aidblink.demo` / `aidblink-org`) e confirme que o painel carrega;
   depois saia.
5. Faça login como parceiro (`parceiro@aidblink.demo` / `aidblink-parceiro`) em
   uma segunda aba e confirme que o terminal carrega; depois saia.
6. Tenha uma segunda aba pronta com o Solana Explorer.
7. Defina seus códigos de beneficiário para a demo (ex.: `BEN-4821`, `BEN-7310`).

> Para reimplantar ou mudar o programa, rode `npm run program:deploy` (build +
> deploy + init do pool). O programa já está no ar na Devnet com id
> `BsNDtwVsmxpMSnnoUiiadhjnRvxJ8huuZWZ5vcrFCrrg`.

> Se a carteira estiver indisponível durante a gravação, use **Registrar
> contribuição simulada** — o resto do fluxo é idêntico. A demo precisa ser
> honesta: diga em voz alta qual etapa é simulada.

---

## 0:00–0:15 — Enquadre o problema (home)

**Tela:** `/`

**Narração:**
> "Este é o AidBlink. Ajuda emergencial em um único link. Uma pessoa precisa de
> uma refeição ou uma passagem. Apoiadores contribuem. Uma organização aprova a
> necessidade. A pessoa recebe um voucher de uso único — sem precisar de
> carteira."

Role lentamente até os cartões *Contribuir · Administrar · Entregar* e depois até
a tabela "real vs simulado".

---

## 0:15–1:00 — Etapa 1: Contribuir (real on-chain)

**Tela:** clique em **Contribuir** (`/contribute`) → clique em **Conectar
carteira** → escolha Phantom.

**Ações:**
1. Selecione **0.1 SOL**.
2. Clique em **Contribuir 0.1 SOL**.
3. Aprove na Phantom.
4. Quando o aviso de sucesso aparecer, abra o link **Ver no Solana Explorer** na
   segunda aba e mostre a transação confirmada: a instrução `donate` registrando
   a conta de doação e movendo o SOL para o tesouro.

**Narração:**
> "A contribuição é uma transação real na Devnet da Solana, assinada pela
> carteira do doador. Nosso programa Anchor a registra on-chain e a lista de
> volta a partir da chain. Esse mesmo fluxo é exposto como um Solana Blink padrão
> — um link compartilhável — então nunca forçamos o doador a aprender um novo
> app."

Depois volte para `/contribute` e mostre as **Contribuições recentes** sendo
atualizadas (a linha fica marcada como on-chain e linka para a transação).

---

## 1:00–1:40 — Etapa 2: Administrar (painel da organização)

**Tela:** clique em **Painel da organização** (`/admin`) → faça login com o
usuário demo da organização se solicitado (`org@aidblink.demo` / `aidblink-org`).

**Ações:**
1. Aponte para as estatísticas: **Arrecadado**, **Disponível**, **Alocado**,
   **Resgatado**.
2. Em **Novo pedido de ajuda**, digite `BEN-9001`, escolha **Ajuda
   alimentar**, valor **$30**, observação *"Cesta básica"*, clique em **Criar
   pedido**.
3. Encontre o novo pedido na lista e clique em **Aprovar**.
4. Mostre a mensagem: *Voucher VCH-… emitido*.

> Se a aprovação for bloqueada, o tesouro ainda não cobre o pedido — mostre a
> mensagem **Orçamento insuficiente do tesouro** e então contribua na etapa 1 ou
> use um valor menor. A trava de orçamento impede que o **Disponível** fique
> negativo, então uma contribuição de **0.1 SOL** já basta para aprovar um pedido
> de $30.

**Narração:**
> "A organização vê um caixa transparente, lê o saldo direto da chain e registra
> apenas uma referência pseudônima. Nenhum dado pessoal vai on-chain. Aprovar o
> pedido emite um voucher de uso único."

---

## 1:40–2:05 — Etapa 3: Entregar (voucher com QR)

**Tela:** clique em **Abrir voucher VCH-…** (`/voucher/[id]`).

**Ações:**
1. Mostre o cartão do voucher: valor, categoria, código do beneficiário,
   validade.
2. Mostre o **QR code** e o código abaixo dele.
3. Note o banner âmbar: *Protótipo — não é um benefício real.*

**Narração:**
> "A pessoa recebe um QR code. Ela pode nem ter um smartphone — a organização
> pode imprimir ou ler o código. O voucher é assinado pelo servidor, então um
> parceiro pode confiar nele; e ele só pode ser usado uma vez."

---

## 2:05–2:35 — Resgate pelo parceiro e a prova anti-reuso

**Tela:** clique em **Abrir no simulador do parceiro** (`/redeem?token=…`) → faça
login com o usuário demo do parceiro se solicitado (`parceiro@aidblink.demo` /
`aidblink-parceiro`).

**Ações:**
1. Defina o nome do parceiro (ex.: **Mercado Central**).
2. Clique em **Verificar e resgatar** → sucesso verde: *Voucher resgatado com
   sucesso*.
3. Clique em **Verificar e resgatar** de novo (mesmo token).
4. Mostre a rejeição vermelha: *Voucher já resgatado — este benefício só pode ser
   usado uma vez.*

**Narração:**
> "O parceiro escaneia o voucher e o benefício é entregue. Agora o mesmo código
> é escaneado de novo — e é rejeitado. A regra de uso único é aplicada de forma
> atômica no servidor, não pela imagem do QR. É isso que faz deste um mecanismo
> real de entrega."

Opcionalmente, role o painel até o log **Resgates e tentativas rejeitadas** para
mostrar a tentativa bloqueada registrada.

---

## 2:35–2:50 — Fechamento

**Tela:** volte para `/` ou para o painel.

**Narração:**
> "O AidBlink não confunde uma doação on-chain com ajuda entregue. As
> contribuições são reais e transparentes; a entrega é controlada pela
> organização; a pessoa em necessidade simplesmente recebe ajuda. Ajuda
> emergencial em um único link."

---

## Regras de honestidade (não pule)

- Deixe claro que **os valores de benefício e o resgate pelo parceiro são
  simulados** e que os vouchers não têm valor monetário.
- Se usar **Registrar contribuição simulada**, diga isso na câmera.
- Nunca afirme uma parceria real com ONG ou um benefício real resgatável.

## Plano B para falha no pop-up da carteira

Se a Phantom falhar no meio da gravação: recarregue, use **Registrar
contribuição simulada** na etapa 1 e continue. O painel, o voucher e o fluxo
anti-reuso não são afetados.
