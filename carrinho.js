const CHAVE_CARRINHO = "atelieDoAxeCarrinho";
const CHAVE_ENTREGA = "saravieiEntrega";

const SUPABASE_URL = "https://gmimzvnuvraletepczrp.supabase.co";
const SUPABASE_ANON_KEY =
    "sb_publishable_NtJmSYaKmuQuLY2QvfQKLQ_rFA8Ceqx";

const FUNCAO_FRETE =
    `${SUPABASE_URL}/functions/v1/calcular-frete`;

let carrinho = [];
let entregaAtual = null;
let fretesMelhorEnvio = [];

document.addEventListener("DOMContentLoaded", () => {
    carregarCarrinho();

    const botaoCalcular = document.getElementById(
        "botao-calcular-frete"
    );

    const campoCep = document.getElementById(
        "cep-entrega"
    );

    const botaoFinalizar = document.getElementById(
        "botao-finalizar-compra"
    );

    if (botaoCalcular) {
        botaoCalcular.addEventListener(
            "click",
            calcularEntrega
        );
    }

    if (campoCep) {
        campoCep.addEventListener("input", formatarCep);

        campoCep.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                calcularEntrega();
            }
        });
    }

    if (botaoFinalizar) {
        botaoFinalizar.addEventListener(
            "click",
            finalizarCompra
        );
    }

    const entregaSalva = localStorage.getItem(
        CHAVE_ENTREGA
    );

    if (entregaSalva) {
        try {
            entregaAtual = JSON.parse(entregaSalva);
        } catch {
            entregaAtual = null;
        }
    }
});


/* =========================================================
   CARRINHO
========================================================= */

function carregarCarrinho() {
    try {
        const salvo = localStorage.getItem(
            CHAVE_CARRINHO
        );

        carrinho = salvo
            ? JSON.parse(salvo)
            : [];
    } catch {
        carrinho = [];
    }

    if (!Array.isArray(carrinho)) {
        carrinho = [];
    }

    carrinho = carrinho.map(normalizarProduto);

    renderizarCarrinho();
}


function normalizarProduto(item) {
    const precoPromocional = Number(
        item.precoPromocional
    );

    const precoNormal = Number(
        item.preco
    );

    const preco =
        Number.isFinite(precoPromocional) &&
        precoPromocional > 0
            ? precoPromocional
            : precoNormal;

    return {
        ...item,

        id: item.id,

        variant_id:
            item.variant_id ||
            item.variantId ||
            null,

        cor:
            item.cor ||
            "",

        tamanho:
            item.tamanho ||
            "",

        estoque:
            Number.isFinite(Number(item.estoque))
                ? Number(item.estoque)
                : null,

        esgotado:
            item.esgotado === true ||
            item.esgotado === 1 ||
            item.esgotado === "1" ||
            String(item.esgotado).toLowerCase() === "true",

        nome:
            item.nome ||
            item.name ||
            "Produto",

        colecao:
            item.colecao ||
            item.collection ||
            "",

        preco: Number.isFinite(preco)
            ? preco
            : 0,

        quantidade:
            Math.max(
                1,
                Number(item.quantidade) || 1
            ),

        peso_gramas:
            buscarNumero(
                item.peso_gramas,
                item.pesoGramas,
                item.peso
            ),

        altura_cm:
            buscarNumero(
                item.altura_cm,
                item.alturaCm,
                item.altura
            ),

        largura_cm:
            buscarNumero(
                item.largura_cm,
                item.larguraCm,
                item.largura
            ),

        comprimento_cm:
            buscarNumero(
                item.comprimento_cm,
                item.comprimentoCm,
                item.comprimento
            )
    };
}


function buscarNumero(...valores) {
    for (const valor of valores) {
        const numero = Number(valor);

        if (
            valor !== undefined &&
            valor !== null &&
            valor !== "" &&
            Number.isFinite(numero)
        ) {
            return numero;
        }
    }

    return null;
}


function salvarCarrinho() {
    localStorage.setItem(
        CHAVE_CARRINHO,
        JSON.stringify(carrinho)
    );
}


function calcularSubtotal() {
    return carrinho.reduce(
        (total, item) => {
            return (
                total +
                Number(item.preco || 0) *
                Number(item.quantidade || 1)
            );
        },
        0
    );
}


function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


/* =========================================================
   RENDERIZAÇÃO
========================================================= */

function renderizarCarrinho() {
    const lista = document.getElementById(
        "lista-carrinho"
    );

    const subtotalElemento =
        document.getElementById(
            "subtotal-carrinho"
        );

    const freteElemento =
        document.getElementById(
            "frete-carrinho"
        );

    const totalElemento =
        document.getElementById(
            "total-carrinho"
        );

    const botaoFinalizar =
        document.getElementById(
            "botao-finalizar-compra"
        );

    if (!lista) {
        return;
    }

    if (carrinho.length === 0) {
        lista.innerHTML = `
            <div class="carrinho-vazio">
                <div class="carrinho-vazio-icone">🛒</div>

                <h2>Seu carrinho está vazio</h2>

                <p>
                    Escolha uma peça para começar seu pedido.
                </p>

                <a href="index.html">
                    Continuar comprando
                </a>
            </div>
        `;

        if (subtotalElemento) {
            subtotalElemento.textContent =
                formatarMoeda(0);
        }

        if (freteElemento) {
            freteElemento.textContent =
                "A calcular";
        }

        if (totalElemento) {
            totalElemento.textContent =
                formatarMoeda(0);
        }

        if (botaoFinalizar) {
            botaoFinalizar.disabled = true;
        }

        return;
    }

    lista.innerHTML = carrinho
        .map((item, indice) => {
            const subtotalItem =
                Number(item.preco || 0) *
                Number(item.quantidade || 1);

            return `
                <article class="item-carrinho">

                    <div class="item-carrinho-info">

                        <div>
                            <span class="item-carrinho-colecao">
                                ${escaparHtml(
                                    item.colecao || "SARAVIEI"
                                )}
                            </span>

                            <h3>
                                ${escaparHtml(
                                    item.nome
                                )}
                            </h3>

                            ${
                                item.cor
                                    ? `
                                        <p>
                                            Cor:
                                            ${escaparHtml(
                                                item.cor
                                            )}
                                        </p>
                                    `
                                    : ""
                            }

                            ${
                                item.tamanho
                                    ? `
                                        <p>
                                            Tamanho:
                                            ${escaparHtml(
                                                item.tamanho
                                            )}
                                        </p>
                                    `
                                    : ""
                            }

                            <strong>
                                ${formatarMoeda(
                                    item.preco
                                )}
                            </strong>
                        </div>

                        <button
                            type="button"
                            class="botao-remover-item"
                            data-indice="${indice}"
                        >
                            Remover
                        </button>

                    </div>

                    <div class="item-carrinho-final">

                        <div class="controle-quantidade">

                            <button
                                type="button"
                                class="botao-quantidade"
                                data-acao="diminuir"
                                data-indice="${indice}"
                            >
                                −
                            </button>

                            <span>
                                ${item.quantidade}
                            </span>

                            <button
                                type="button"
                                class="botao-quantidade"
                                data-acao="aumentar"
                                data-indice="${indice}"
                            >
                                +
                            </button>

                        </div>

                        <strong>
                            ${formatarMoeda(
                                subtotalItem
                            )}
                        </strong>

                    </div>

                </article>
            `;
        })
        .join("");

    lista
        .querySelectorAll(
            ".botao-quantidade"
        )
        .forEach((botao) => {
            botao.addEventListener(
                "click",
                () => {
                    alterarQuantidade(
                        Number(
                            botao.dataset.indice
                        ),
                        botao.dataset.acao
                    );
                }
            );
        });

    lista
        .querySelectorAll(
            ".botao-remover-item"
        )
        .forEach((botao) => {
            botao.addEventListener(
                "click",
                () => {
                    removerItem(
                        Number(
                            botao.dataset.indice
                        )
                    );
                }
            );
        });

    const subtotal =
        calcularSubtotal();

    if (subtotalElemento) {
        subtotalElemento.textContent =
            formatarMoeda(subtotal);
    }

    atualizarResumo();
}


function alterarQuantidade(
    indice,
    acao
) {
    const item = carrinho[indice];

    if (!item) {
        return;
    }

    if (acao === "aumentar") {
        const estoque =
            Number(item.estoque);

        if (
            Number.isFinite(estoque) &&
            estoque > 0 &&
            item.quantidade >= estoque
        ) {
            return;
        }

        item.quantidade += 1;
    }

    if (
        acao === "diminuir" &&
        item.quantidade > 1
    ) {
        item.quantidade -= 1;
    }

    salvarCarrinho();

    entregaAtual = null;
    fretesMelhorEnvio = [];

    localStorage.removeItem(
        CHAVE_ENTREGA
    );

    limparResultadoFrete();

    renderizarCarrinho();
}


function removerItem(indice) {
    carrinho.splice(indice, 1);

    salvarCarrinho();

    entregaAtual = null;
    fretesMelhorEnvio = [];

    localStorage.removeItem(
        CHAVE_ENTREGA
    );

    limparResultadoFrete();

    renderizarCarrinho();
}


/* =========================================================
   CEP
========================================================= */

function formatarCep(event) {
    let valor = event.target.value
        .replace(/\D/g, "")
        .slice(0, 8);

    if (valor.length > 5) {
        valor =
            valor.slice(0, 5) +
            "-" +
            valor.slice(5);
    }

    event.target.value = valor;
}


function obterCep() {
    const campo = document.getElementById(
        "cep-entrega"
    );

    if (!campo) {
        return "";
    }

    return campo.value.replace(
        /\D/g,
        ""
    );
}


/* =========================================================
   ENDEREÇO
========================================================= */

async function buscarEndereco(cep) {
    const resposta = await fetch(
        `https://viacep.com.br/ws/${cep}/json/`
    );

    if (!resposta.ok) {
        throw new Error(
            "Não foi possível consultar o CEP."
        );
    }

    const endereco =
        await resposta.json();

    if (endereco.erro) {
        throw new Error(
            "CEP não encontrado."
        );
    }

    return endereco;
}


/* =========================================================
   ZONA OESTE
========================================================= */

const BAIRROS_ZONA_OESTE = [
    "Bangu",
    "Barra da Tijuca",
    "Barra Olímpica",
    "Camorim",
    "Campo Grande",
    "Cosmos",
    "Deodoro",
    "Gericinó",
    "Guaratiba",
    "Inhoaíba",
    "Itanhangá",
    "Jacarepaguá",
    "Jardim Sulacap",
    "Joá",
    "Magalhães Bastos",
    "Paciência",
    "Padre Miguel",
    "Pedra de Guaratiba",
    "Realengo",
    "Recreio dos Bandeirantes",
    "Santa Cruz",
    "Santíssimo",
    "Senador Camará",
    "Senador Vasconcelos",
    "Sepetiba",
    "Tanque",
    "Taquara",
    "Vargem Grande",
    "Vargem Pequena",
    "Vila Kennedy",
    "Vila Militar"
];


function ehZonaOeste(endereco) {
    const bairro = (
        endereco.bairro || ""
    )
        .trim()
        .toLowerCase();

    return BAIRROS_ZONA_OESTE.some(
        (nome) =>
            nome.toLowerCase() === bairro
    );
}


/* =========================================================
   PRODUTOS PARA MELHOR ENVIO
========================================================= */

async function prepararProdutosParaFrete() {
    const produtos = [];

    for (const item of carrinho) {
        const produto = {
            id: String(
                item.id || "saraviei-produto"
            ),

            width: Number(
                item.largura_cm
            ),

            height: Number(
                item.altura_cm
            ),

            length: Number(
                item.comprimento_cm
            ),

            weight:
                Number(
                    item.peso_gramas
                ) / 1000,

            insurance_value:
                Number(
                    item.preco || 0
                ) *
                Number(
                    item.quantidade || 1
                ),

            quantity:
                Number(
                    item.quantidade || 1
                )
        };

        if (
            !Number.isFinite(produto.width) ||
            produto.width <= 0 ||
            !Number.isFinite(produto.height) ||
            produto.height <= 0 ||
            !Number.isFinite(produto.length) ||
            produto.length <= 0 ||
            !Number.isFinite(produto.weight) ||
            produto.weight <= 0
        ) {
            throw new Error(
                `O produto "${item.nome}" está sem peso ou dimensões de envio cadastrados.`
            );
        }

        produtos.push(produto);
    }

    return produtos;
}


/* =========================================================
   CALCULAR FRETE MELHOR ENVIO
========================================================= */

async function calcularFreteMelhorEnvio(
    cepDestino
) {
    const produtos =
        await prepararProdutosParaFrete();

    const valorTotalProdutos =
        calcularSubtotal();

    const resposta = await fetch(
        FUNCAO_FRETE,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json",

                apikey:
                    SUPABASE_ANON_KEY
            },

            body: JSON.stringify({
                cep_destino:
                    cepDestino,

                produtos:
                    produtos,

                valor_seguro:
                    valorTotalProdutos
            })
        }
    );

    const dados =
        await resposta.json();

    if (!resposta.ok) {
        throw new Error(
            dados?.detalhes?.message ||
            dados?.erro ||
            "Não foi possível calcular o frete."
        );
    }

    if (!Array.isArray(dados)) {
        throw new Error(
            "O Melhor Envio não retornou opções de frete."
        );
    }

    return dados;
}


/* =========================================================
   CALCULAR ENTREGA
========================================================= */

async function calcularEntrega() {
    const cep = obterCep();

    const mensagem =
        document.getElementById(
            "mensagem-frete"
        );

    const resultado =
        document.getElementById(
            "resultado-entrega"
        );

    const opcoes =
        document.getElementById(
            "opcoes-entrega"
        );

    const enderecoResumo =
        document.getElementById(
            "endereco-resumo"
        );

    if (cep.length !== 8) {
        mostrarMensagem(
            mensagem,
            "Digite um CEP válido.",
            "erro"
        );

        return;
    }

    if (carrinho.length === 0) {
        mostrarMensagem(
            mensagem,
            "Seu carrinho está vazio.",
            "erro"
        );

        return;
    }

    mostrarMensagem(
        mensagem,
        "Consultando opções de entrega...",
        "carregando"
    );

    if (opcoes) {
        opcoes.innerHTML = "";
    }

    if (resultado) {
        resultado.hidden = false;
    }

    try {
        const endereco =
            await buscarEndereco(cep);

        if (enderecoResumo) {
            enderecoResumo.innerHTML = `
                <strong>
                    ${escaparHtml(
                        endereco.logradouro ||
                        ""
                    )}
                </strong>

                <span>
                    ${escaparHtml(
                        endereco.bairro ||
                        ""
                    )}
                    ·
                    ${escaparHtml(
                        endereco.localidade ||
                        ""
                    )}
                    -
                    ${escaparHtml(
                        endereco.uf ||
                        ""
                    )}
                </span>
            `;
        }

        const zonaOeste =
            ehZonaOeste(endereco);

        fretesMelhorEnvio =
            await calcularFreteMelhorEnvio(
                cep
            );

        renderizarOpcoesEntrega(
            fretesMelhorEnvio,
            zonaOeste
        );

        mostrarMensagem(
            mensagem,
            "Escolha uma opção de entrega.",
            "sucesso"
        );

    } catch (erro) {
        console.error(
            "Erro ao calcular entrega:",
            erro
        );

        fretesMelhorEnvio = [];

        mostrarMensagem(
            mensagem,
            erro.message ||
            "Não foi possível calcular o frete.",
            "erro"
        );

        if (opcoes) {
            opcoes.innerHTML = "";
        }
    }
}


/* =========================================================
   OPÇÕES DE ENTREGA
========================================================= */

function renderizarOpcoesEntrega(
    fretes,
    zonaOeste
) {
    const opcoes =
        document.getElementById(
            "opcoes-entrega"
        );

    if (!opcoes) {
        return;
    }

    const opcoesHtml = [];

    fretes.forEach(
        (frete, indice) => {
            const preco = Number(
                frete.custom_price ??
                frete.price ??
                0
            );

            const prazoMin =
                frete.custom_delivery_range
                    ?.min ??
                frete.delivery_range
                    ?.min ??
                frete.custom_delivery_time ??
                frete.delivery_time ??
                null;

            const prazoMax =
                frete.custom_delivery_range
                    ?.max ??
                frete.delivery_range
                    ?.max ??
                frete.custom_delivery_time ??
                frete.delivery_time ??
                null;

            const empresa =
                frete.company?.name ||
                "Transportadora";

            const servico =
                frete.name ||
                "Frete";

            let prazoTexto =
                "Prazo informado no checkout";

            if (
                prazoMin !== null &&
                prazoMax !== null
            ) {
                if (
                    Number(prazoMin) ===
                    Number(prazoMax)
                ) {
                    prazoTexto =
                        `${prazoMin} dias úteis`;
                } else {
                    prazoTexto =
                        `${prazoMin}–${prazoMax} dias úteis`;
                }
            }

            opcoesHtml.push(`
                <label
                    class="opcao-entrega"
                    data-tipo="melhor-envio"
                >
                    <input
                        type="radio"
                        name="opcao-entrega"
                        value="melhor-envio-${indice}"
                        data-tipo="melhor-envio"
                        data-indice="${indice}"
                    >

                    <span class="opcao-entrega-conteudo">

                        <span class="opcao-entrega-topo">

                            <strong>
                                ${escaparHtml(
                                    empresa
                                )}
                            </strong>

                            <strong>
                                ${formatarMoeda(
                                    preco
                                )}
                            </strong>

                        </span>

                        <span class="opcao-entrega-servico">
                            ${escaparHtml(
                                servico
                            )}
                        </span>

                        <span class="opcao-entrega-prazo">
                            ${prazoTexto}
                        </span>

                    </span>
                </label>
            `);
        }
    );

    if (zonaOeste) {
        opcoesHtml.push(`
            <label
                class="opcao-entrega"
                data-tipo="retirada"
            >
                <input
                    type="radio"
                    name="opcao-entrega"
                    value="retirada"
                    data-tipo="retirada"
                >

                <span class="opcao-entrega-conteudo">

                    <span class="opcao-entrega-topo">
                        <strong>
                            Retirada
                        </strong>

                        <strong>
                            Grátis
                        </strong>
                    </span>

                    <span class="opcao-entrega-servico">
                        Retirada na Zona Oeste
                    </span>

                    <span class="opcao-entrega-prazo">
                        Combine pelo WhatsApp
                    </span>

                </span>
            </label>
        `);

        opcoesHtml.push(`
            <label
                class="opcao-entrega"
                data-tipo="uber"
            >
                <input
                    type="radio"
                    name="opcao-entrega"
                    value="uber"
                    data-tipo="uber"
                >

                <span class="opcao-entrega-conteudo">

                    <span class="opcao-entrega-topo">
                        <strong>
                            Uber Moto
                        </strong>

                        <strong>
                            A combinar
                        </strong>
                    </span>

                    <span class="opcao-entrega-servico">
                        Entrega por Uber Moto
                    </span>

                    <span class="opcao-entrega-prazo">
                        Combine pelo WhatsApp
                    </span>

                </span>
            </label>
        `);
    }

    opcoes.innerHTML =
        opcoesHtml.join("");

    opcoes
        .querySelectorAll(
            'input[name="opcao-entrega"]'
        )
        .forEach((radio) => {
            radio.addEventListener(
                "change",
                selecionarEntrega
            );
        });
}


/* =========================================================
   SELEÇÃO DA ENTREGA
========================================================= */

function selecionarEntrega(event) {
    const radio =
        event.target;

    const tipo =
        radio.dataset.tipo;

    if (tipo === "melhor-envio") {
        const indice =
            Number(
                radio.dataset.indice
            );

        const frete =
            fretesMelhorEnvio[
                indice
            ];

        if (!frete) {
            return;
        }

        const preco = Number(
            frete.custom_price ??
            frete.price ??
            0
        );

        entregaAtual = {
            tipo:
                "melhor-envio",

            servico:
                frete.name ||
                "Frete",

            transportadora:
                frete.company?.name ||
                "",

            valor:
                preco,

            prazo:
                frete.custom_delivery_time ??
                frete.delivery_time ??
                null,

            cep:
                obterCep()
        };
    }

    if (tipo === "retirada") {
        entregaAtual = {
            tipo:
                "retirada",

            servico:
                "Retirada",

            valor:
                0,

            prazo:
                null,

            cep:
                obterCep()
        };
    }

    if (tipo === "uber") {
        entregaAtual = {
            tipo:
                "uber",

            servico:
                "Uber Moto",

            valor:
                null,

            prazo:
                null,

            cep:
                obterCep()
        };
    }

    if (entregaAtual) {
        localStorage.setItem(
            CHAVE_ENTREGA,
            JSON.stringify(
                entregaAtual
            )
        );
    }

    atualizarResumo();
}


/* =========================================================
   RESUMO
========================================================= */

function atualizarResumo() {
    const subtotal =
        calcularSubtotal();

    const freteElemento =
        document.getElementById(
            "frete-carrinho"
        );

    const totalElemento =
        document.getElementById(
            "total-carrinho"
        );

    const botaoFinalizar =
        document.getElementById(
            "botao-finalizar-compra"
        );

    let valorFrete = 0;

    if (
        entregaAtual &&
        entregaAtual.tipo ===
            "melhor-envio"
    ) {
        valorFrete =
            Number(
                entregaAtual.valor || 0
            );

        if (freteElemento) {
            freteElemento.textContent =
                formatarMoeda(
                    valorFrete
                );
        }
    } else if (
        entregaAtual &&
        entregaAtual.tipo ===
            "retirada"
    ) {
        valorFrete = 0;

        if (freteElemento) {
            freteElemento.textContent =
                "Grátis";
        }
    } else if (
        entregaAtual &&
        entregaAtual.tipo ===
            "uber"
    ) {
        if (freteElemento) {
            freteElemento.textContent =
                "A combinar";
        }
    } else {
        if (freteElemento) {
            freteElemento.textContent =
                "A calcular";
        }
    }

    if (totalElemento) {
        if (
            entregaAtual &&
            entregaAtual.tipo ===
                "uber"
        ) {
            totalElemento.textContent =
                "A combinar";
        } else {
            totalElemento.textContent =
                formatarMoeda(
                    subtotal +
                    valorFrete
                );
        }
    }

    if (botaoFinalizar) {
        botaoFinalizar.disabled =
            !entregaAtual;
    }
}


/* =========================================================
   FINALIZAR COMPRA
========================================================= */

function finalizarCompra() {
    if (!entregaAtual) {
        const mensagem =
            document.getElementById(
                "mensagem-frete"
            );

        mostrarMensagem(
            mensagem,
            "Escolha uma opção de entrega antes de continuar.",
            "erro"
        );

        return;
    }

    localStorage.setItem(
        CHAVE_ENTREGA,
        JSON.stringify(
            entregaAtual
        )
    );

    if (
        entregaAtual.tipo ===
            "retirada" ||
        entregaAtual.tipo ===
            "uber"
    ) {
        const mensagem =
            document.getElementById(
                "mensagem-frete"
            );

        mostrarMensagem(
            mensagem,
            "Para essa opção de entrega, fale conosco pelo WhatsApp.",
            "sucesso"
        );

        return;
    }

    window.location.href =
        "pagamento.html";
}


/* =========================================================
   UTILITÁRIOS
========================================================= */

function limparResultadoFrete() {
    const mensagem =
        document.getElementById(
            "mensagem-frete"
        );

    const resultado =
        document.getElementById(
            "resultado-entrega"
        );

    const opcoes =
        document.getElementById(
            "opcoes-entrega"
        );

    const endereco =
        document.getElementById(
            "endereco-resumo"
        );

    if (mensagem) {
        mensagem.textContent = "";
        mensagem.className =
            "mensagem-frete";
    }

    if (resultado) {
        resultado.hidden = true;
    }

    if (opcoes) {
        opcoes.innerHTML = "";
    }

    if (endereco) {
        endereco.innerHTML = "";
    }

    atualizarResumo();
}


function mostrarMensagem(
    elemento,
    texto,
    tipo
) {
    if (!elemento) {
        return;
    }

    elemento.textContent =
        texto;

    elemento.className =
        `mensagem-frete ${tipo}`;
}


function escaparHtml(valor) {
    return String(
        valor ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}