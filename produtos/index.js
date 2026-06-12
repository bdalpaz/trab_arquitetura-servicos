// SERVIÇO A — Produtos
// Fornece os dados essenciais 
// Expõe sua API.

const express = require("express");

const app = express();
app.use(express.json());

const PORTA = 3000;

const produtos = [
  { id: 1, nome: "Teclado Mecânico", preco: 250.0, estoque: 10 },
  { id: 2, nome: "Mouse Gamer", preco: 120.0, estoque: 5 },
  { id: 3, nome: "Monitor 24''", preco: 899.9, estoque: 3 },
  { id: 4, nome: "Headset", preco: 199.9, estoque: 0 },
];

// GET /produtos — lista o catálogo completo
app.get("/produtos", (req, res) => {
  res.json(produtos);
});

// Busca um produto específico
// Endpoint que o Serviço B consulta para validar pedidos.
app.get("/produtos/:id", (req, res) => {
  const id = Number(req.params.id);
  const produto = produtos.find((p) => p.id === id);

  if (!produto) {
    return res.status(404).json({ erro: "Produto não encontrado" });
  }

  res.json(produto);
});

// Dá baixa no estoque após um pedido
app.patch("/produtos/:id/baixar-estoque", (req, res) => {
  const id = Number(req.params.id);
  const quantidade = Number(req.body.quantidade);
  const produto = produtos.find((p) => p.id === id);

  if (!produto) {
    return res.status(404).json({ erro: "Produto não encontrado" });
  }
  if (!quantidade || quantidade < 1) {
    return res.status(400).json({ erro: "Quantidade inválida" });
  }
  if (produto.estoque < quantidade) {
    return res.status(409).json({ erro: "Estoque insuficiente" });
  }

  produto.estoque -= quantidade;
  res.json({ ok: true, produto });
});

app.listen(PORTA, () => {
  console.log(`[Serviço A - Produtos] rodando em http://localhost:${PORTA}`);
});
