# AidBlink — Arquitetura

> 🌐 **English:** [ARCHITECTURE.md](./ARCHITECTURE.md)

## Visão geral

O AidBlink é uma única aplicação Next.js. Ela expõe uma interface web para três
papéis (doador, organização, parceiro) e uma pequena API HTTP, incluindo um
endpoint padrão de Solana Action (Blink) para contribuições.

```
                 Solana Devnet
        ┌──────────────────────────────────────────┐
        │  Programa AidBlink                        │
        │    ├─ PDA Pool      (tesouro + totais)    │
        │    └─ PDAs Doação   (um por contribuição) │
        │  Carteira do tesouro (recebe o SOL)       │
        │  Âncora Memo opcional para resgates       │
        └───────────────┬──────────────────────────┘
                        │ RPC
┌───────────────────────┴────────────────────────────────┐
│                     App Next.js                         │
│                                                         │
│  /contribute  ──► /api/actions/donate ──► monta a tx    │
│      │                    ▲                             │
│      │                    │ spec do Blink (GET/POST)    │
│      ▼                    │                             │
│  wallet.assina e envia ───┘                             │
│      │                                                  │
│      ▼                                                  │
│  /api/donations ◄── lê PDAs Doação (chain) ─────────────┤
│                                          │              │
│  /admin ── /api/requests ── aprova ──► Voucher ─────────┤
│                                          │  token HMAC  │
│  /voucher/[id] ◄── token assinado + QR ◄─┘              │
│      │                                                  │
│      ▼                                                  │
│  /redeem ── /api/redeem ── troca de estado atômica ──► âncora (opc.)
│                                                         │
│                  Store JSON em arquivo                  │
│        (pedidos, vouchers, resgates, demo)              │
└─────────────────────────────────────────────────────────┘
```

## Papéis e fluxos

### 1. Contribuir (doador)

1. A página (ou qualquer cliente Blink) chama
   `POST /api/actions/donate?amount=N` com a chave pública do doador.
2. O servidor monta uma instrução `aidblink::donate`: registra a contribuição
   num novo PDA `Donation` *e* transfere o SOL para o tesouro na mesma instrução
   atômica. O doador é o pagador da taxa; um blockhash recente é anexado e a
   transação é retornada em base64.
3. A carteira assina e envia.
4. `GET /api/donations` lê os PDAs `Donation` direto do programa
   (`getProgramAccounts`), então a lista "Contribuições recentes" é a própria
   chain — nada é copiado para um banco de dados para as entradas on-chain.

Entradas `simulated: true` são guardadas localmente e marcadas como
`source: "simulated"`; elas nunca entram no caixa on-chain.

### 2. Administrar (organização)

- `POST /api/requests` cria um pedido contendo apenas uma **referência
  pseudônima** (`beneficiaryRef`), uma categoria e um valor em USD.
- `POST /api/requests/:id/approve` faz uma transição atômica
  `pending → approved` e emite um voucher.
- `GET /api/balance` retorna o resumo do caixa mais o saldo on-chain do tesouro
  ao vivo.

### 3. Entregar (beneficiário + parceiro)

- `GET /api/vouchers/:id` retorna o voucher, um token assinado e um QR code cujo
  conteúdo é a URL de resgate do parceiro (`/redeem?token=...`).
- `POST /api/redeem` verifica o token e faz uma transição atômica
  `issued → redeemed`.

## Modelo de segurança do voucher

Um voucher tem duas partes:

1. **Um registro off-chain** no store (fonte da verdade para o status).
2. **Um token assinado** entregue ao parceiro:

   ```
   token = base64url(payload) + "." + base64url(HMAC_SHA256(payload, secret))
   payload = { v, id, cat, amt, ref, org, iat, exp, nonce }
   ```

Propriedades:

| Propriedade | Como é obtida |
| --- | --- |
| **Autenticidade** | Assinatura HMAC; o parceiro não consegue forjar ou alterar valor/categoria. |
| **Integridade** | Qualquer modificação invalida a assinatura (`timingSafeEqual`). |
| **Validade** | `exp` é conferido contra o horário do servidor antes do resgate. |
| **Uso único** | Transição atômica `issued → redeemed` dentro de um read-modify-write serializado. |
| **Evidência de adulteração** | Tokens inválidos/adulterados são rejeitados e registrados. |
| **Privacidade** | Apenas um `ref` pseudônimo; nenhum dado pessoal no token ou on-chain. |
| **Auditabilidade** | Âncora SPL Memo opcional por resgate. |

### Por que o uso único *não* é propriedade do QR

Um QR code é só uma imagem de um token. Se o uso único dependesse do QR, copiar
a imagem o derrotaria. No AidBlink a regra vive na **máquina de estados do
servidor**:

```
redeem(token):
  verifica assinatura ──► rejeita se inválida
  confere validade    ──► rejeita se expirada
  atomicamente:
     se status == 'issued'  -> status = 'redeemed'; registra o resgate
     senão                  -> rejeita e registra a tentativa
```

O ciclo read-modify-write é serializado por um mutex em processo
(`src/lib/store.ts`), então dois scans simultâneos não podem ter sucesso. Para
uma implantação multi-instância, isso viraria uma transação de banco de dados ou
um `UPDATE ... WHERE status = 'issued'` condicional.

## Integração com a Solana

- **Cluster:** Devnet por padrão (`NEXT_PUBLIC_SOLANA_NETWORK`).
- **Programa:** `programs/aidblink` — um programa Anchor cujo id é
  `AIDBLINK_PROGRAM_ID` (veja o README para os passos de build/deploy).
- **Tesouro:** um endereço público; a app não precisa de chave privada para
  receber fundos.
- **Spec do Blink:** `public/actions.json` roteia `/contribute` para
  `/api/actions/donate`; o endpoint define os cabeçalhos CORS, `X-Action-Version`
  e `X-Blockchain-Ids`.
- **Âncora opcional:** se `AIDBLINK_ANCHOR_SECRET_KEY` estiver configurada *e
  com fundos*, cada resgate envia uma transação SPL Memo. Falhas nunca bloqueiam
  um resgate.

### O programa AidBlink

| Item | Valor |
| --- | --- |
| Instruções | `initialize_pool(treasury)`, `donate(lamports, memo, nonce)` |
| PDA do Pool | seeds `[b"pool"]` — guarda autoridade, tesouro, totais |
| PDA de Doação | seeds `[b"donation", donor, nonce]` — guarda doador, lamports, índice, timestamp, memo |
| Fundos | movidos para a carteira do tesouro por uma CPI ao programa System, dentro de `donate` |

O cliente codifica as instruções e decodifica as contas por conta própria
(`src/lib/program.ts`) usando as convenções do Anchor: discriminador
`sha256("global:<ix>")[0..8]`, argumentos serializados em Borsh na ordem de
declaração, e layout das contas na ordem da struct. Isso mantém a app enxuta em
dependências enquanto o layout das contas permanece explícito.

## Persistência

`src/lib/store.ts` é um store JSON mínimo em arquivo (`.data/store.json`) com um
mutex de serialização em processo. Ele semeia dados de demonstração na primeira
execução. A interface (`snapshot`, `update`) é intencionalmente pequena para
poder ser trocada por Postgres/SQLite sem tocar nas rotas.

## Configuração

Veja a tabela no `README.pt-BR.md`. Pontos-chave:

- Variáveis de ambiente não públicas nunca são expostas ao bundle do navegador.
- O segredo do voucher é apenas do servidor.
- Uma taxa fixa `NEXT_PUBLIC_SOL_USD_RATE` torna a demo determinística; produção
  usaria um feed de preço ao vivo.

## Modelo de ameaças (escopo deste protótipo)

| Ameaça | Mitigação aqui | Próximo passo em produção |
| --- | --- | --- |
| Voucher forjado | Assinatura HMAC | O mesmo, com rotação de chave / KMS |
| Voucher reutilizado | Transição de status atômica | Transação de BD / PDA on-chain |
| Valor adulterado | Assinatura sobre valor+categoria | Garantia realmente on-chain |
| Doação falsa registrada | `donate` grava o registro e move os fundos numa instrução | Indexador / webhook |
| Doação contada em dobro | Um PDA `Donation` por tx; a listagem lê contas, não a entrada do cliente | Restrição de unicidade |
| Dados pessoais vazados | Apenas refs pseudônimos | Política de minimização de dados |
| Aprovação anônima de equipe | Nenhuma | AuthN/AuthZ + log de auditoria |

## Não-objetivos deliberados (para o hackathon)

- Sem token proprietário, sem integração com WhatsApp/LLM, sem multi-inquilinato
  de organizações, sem desembolso automático, sem cartão pré-pago real.
- A entrega do benefício fica sob **controle da organização** por design; o
  protótipo prova o mecanismo, não uma trilha de pagamento regulada.

## Evoluindo para produção

1. Trocar o store JSON por Postgres e restrições de unicidade.
2. Adicionar autenticação e papéis para o painel da organização.
3. Mover o estado do voucher para um programa Solana (PDA por voucher) para uso
   único on-chain, mantendo a mesma interface de token.
4. Integrar parceiros reais e um fluxo de liquidação de reembolso.
5. Adicionar um oráculo de preço ao vivo e uma página pública de transparência
   respaldada pela chain.
