// SERVIÇO B — Pedidos
// consultando o Serviço A (Produtos) via HTTP.
// Comunicação entre microsserviços

const express = require("express");

const app = express();
app.use(express.json());

const PORTA = 3001;

const URL_SERVICO_PRODUTOS = "http://localhost:3000";

const pedidos = [];
let proximoId = 1;

// lista os pedidos já criados
app.get("/pedidos", (req, res) => {
  res.json(pedidos);
});

//   1. Cliente faz a solicitação aqui no Serviço B
//   2. O Serviço B consulta o Serviço A via HTTP para validar o produto
//   3. Se tudo ok, dá baixa no estoque e grava o pedido
app.post("/pedidos", async (req, res) => {
  const { produtoId, quantidade } = req.body;

  // Validação local dos dados de entrada
  if (!produtoId || !quantidade || quantidade < 1) {
    return res
      .status(400)
      .json({ erro: "Informe produtoId e quantidade (mínimo 1)" });
  }

  try {
    // Consulta o Serviço A via HTTP ----
    const respostaProduto = await fetch(
      `${URL_SERVICO_PRODUTOS}/produtos/${produtoId}`
    );

    if (respostaProduto.status === 404) {
      return res.status(404).json({ erro: "Produto não existe no catálogo" });
    }
    if (!respostaProduto.ok) {
      return res
        .status(502)
        .json({ erro: "Falha ao consultar o serviço de produtos" });
    }

    const produto = await respostaProduto.json();

    // Regra de negócio: precisa ter estoque suficiente
    if (produto.estoque < quantidade) {
      return res.status(409).json({
        erro: `Estoque insuficiente para "${produto.nome}" (disponível: ${produto.estoque})`,
      });
    }

    // Baixa no estoque, também via Serviço A
    const respostaBaixa = await fetch(
      `${URL_SERVICO_PRODUTOS}/produtos/${produtoId}/baixar-estoque`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantidade }),
      }
    );

    if (!respostaBaixa.ok) {
      const corpo = await respostaBaixa.json().catch(() => ({}));
      return res
        .status(respostaBaixa.status)
        .json({ erro: corpo.erro ?? "Não foi possível dar baixa no estoque" });
    }

    // grava 
    const pedido = {
      id: proximoId++,
      produtoId: produto.id,
      nomeProduto: produto.nome,
      quantidade,
      valorTotal: Number((produto.preco * quantidade).toFixed(2)),
      criadoEm: new Date().toISOString(),
    };
    pedidos.push(pedido);

    res.status(201).json(pedido);
  } catch (erro) {
    console.error("Erro ao comunicar com o Serviço A:", erro.message);
    res.status(503).json({
      erro: "Serviço de produtos indisponível. Tente novamente mais tarde.",
    });
  }
});

app.listen(PORTA, () => {
  console.log(`[Serviço B - Pedidos] rodando em http://localhost:${PORTA}`);
  console.log(`Consumindo o Serviço A em ${URL_SERVICO_PRODUTOS}`);
});
