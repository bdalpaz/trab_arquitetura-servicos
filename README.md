# comunicação entre microsserviços

## arquitetura

| Serviço | Responsabilidade | Porta |
|---|---|---|
| **Serviço A — Produtos** | Fornece os dados essenciais (catálogo e estoque) | `3000` |
| **Serviço B — Pedidos** | Lógica de negócio: cria pedidos consumindo o Serviço A | `3001` |

### Fluxo de comunicação

```
Cliente
   │  1. Solicitação: POST /pedidos { produtoId, quantidade }
   ▼
Serviço B (Pedidos) ──── 2. Validação: GET /produtos/:id ────▶ Serviço A (Produtos)
   │                ◀─── produto existe? tem estoque? ────────
   │  3. Baixa de estoque: PATCH /produtos/:id/baixar-estoque
   ▼
Pedido criado ✔
```

O Serviço B **nunca acessa os dados do A diretamente** — toda comunicação
acontece via HTTP, como em sistemas distribuídos reais. Cada serviço tem seu
próprio "banco" (em memória) e poderia, inclusive, usar tecnologias diferentes
(poliglotismo).

## Como rodar

Pré-requisito: Node.js 18+ (usa o `fetch` nativo).

Abra **dois terminais**:

**Terminal 1 — Serviço A (Produtos):**
```bash
cd servico-produtos
npm install
npm start
# [Serviço A - Produtos] rodando em http://localhost:3000
```

**Terminal 2 — Serviço B (Pedidos):**
```bash
cd servico-pedidos
npm install
npm start
# [Serviço B - Pedidos] rodando em http://localhost:3001
```

### Serviço A — Produtos (`http://localhost:3000`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/produtos` | Lista o catálogo |
| GET | `/produtos/:id` | Busca um produto (usado pelo Serviço B na validação) |
| PATCH | `/produtos/:id/baixar-estoque` | Dá baixa no estoque `{ "quantidade": n }` |

### Serviço B — Pedidos (`http://localhost:3001`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/pedidos` | Lista os pedidos criados |
| POST | `/pedidos` | Cria um pedido `{ "produtoId": n, "quantidade": n }` |

## Testando (com curl ou Postman/Insomnia)

```bash
# 1. Ver o catálogo
curl http://localhost:3000/produtos

# 2. Criar um pedido válido (B consulta A, valida e dá baixa no estoque)
curl -X POST http://localhost:3001/pedidos \
  -H "Content-Type: application/json" \
  -d '{"produtoId": 1, "quantidade": 2}'

# 3. Produto inexistente → 404
curl -X POST http://localhost:3001/pedidos \
  -H "Content-Type: application/json" \
  -d '{"produtoId": 99, "quantidade": 1}'

# 4. Estoque insuficiente (Headset tem estoque 0) → 409
curl -X POST http://localhost:3001/pedidos \
  -H "Content-Type: application/json" \
  -d '{"produtoId": 4, "quantidade": 1}'

# 5. Conferir que o estoque baixou
curl http://localhost:3000/produtos/1

# 6. Listar os pedidos gravados
curl http://localhost:3001/pedidos
```

### Teste de resiliência

Derrube o Serviço A (Ctrl+C no terminal 1) e tente criar um pedido:
o Serviço B **não quebra** — responde `503` com uma mensagem tratada,
demonstrando que a falha de um serviço não derruba o outro.

```json
{ "erro": "Serviço de produtos indisponível. Tente novamente mais tarde." }
```

## Conceitos demonstrados

- **Serviço**: componente autônomo com responsabilidade única e bem definida.
- **Comunicação via rede**: o Serviço B consome o A por HTTP (fetch), sem
  compartilhar código nem banco de dados.
- **Validação distribuída**: a regra "só vende o que existe e tem estoque"
  exige a colaboração dos dois serviços.
- **Resiliência**: a queda do Serviço A é tratada com erro amigável no B.
- **Escalabilidade independente**: cada serviço pode ser replicado/escalado
  separadamente, pois roda como processo isolado.

## Estrutura do projeto

```
atividade-microsservicos/
├── servico-produtos/      # Serviço A (porta 3000)
│   ├── index.js
│   └── package.json
├── servico-pedidos/       # Serviço B (porta 3001)
│   ├── index.js
│   └── package.json
└── README.md
```
