const CHAVE_CARRINHO = "atelieDoAxeCarrinho";
const CHAVE_PEDIDO_ATUAL = "saravieiPedidoAtual";
const CHAVE_ENTREGA = "saravieiEntregaSelecionada";

const SUPABASE_URL =
    "https://gmimzvnuvraletepczrp.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_NtJmSYaKmuQuLY2QvfQKLQ_rFA8Ceqx";

const WHATSAPP = "5521994944543";

const URL_CRIAR_PAGAMENTO =
    `${SUPABASE_URL}/functions/v1/criar-pagamento`;

let carrinho = [];
let entregaAtual = null;
let supabaseCliente = null;


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    carrinho = lerCarrinho();
    entregaAtual = lerEntrega();

    renderizarResumo();
    configurarFormulario();
    configurarCEP();
    configurarPagamento();
    configurarBotaoFinalizar();
    carregarDadosSalvos();

    supabaseCliente =
        obterSupabaseCliente();

    await verificarClienteLogado();

});


/* =========================================================
   SUPABASE
   ========================================================= */

function obterSupabaseCliente() {

    if (
        !supabaseCliente &&
        window.supabase
    ) {

        supabaseCliente =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY
            );
    }

    return supabaseCliente;
}


async function verificarClienteLogado() {

    const cliente =
        obterSupabaseCliente();

    if (!cliente) {

        mostrarMensagem(
            "Não foi possível conectar ao sistema. Recarregue a página e tente novamente."
        );

        return null;
    }

    try {

        const resultado =
            await cliente.auth.getSession();

        if (resultado.error) {
            throw resultado.error;
        }

        const sessao =
            resultado.data.session;

        if (!sessao) {

            sessionStorage.setItem(
                "saravieiDestinoDepoisLogin",
                "pagamento.html"
            );

            mostrarMensagem(
                "Você precisa entrar na sua conta antes de finalizar o pedido."
            );

            const botao =
                document.getElementById(
                    "botao-finalizar"
                );

            if (botao) {
                botao.disabled = true;
            }

            setTimeout(() => {

                window.location.href =
                    "cliente-login.html";

            }, 1800);

            return null;
        }

        preencherDadosDaConta(
            sessao.user
        );

        return sessao;

    } catch (erro) {

        console.error(
            "Erro ao verificar sessão:",
            erro
        );

        mostrarMensagem(
            "Não foi possível verificar sua conta. Tente novamente."
        );

        return null;
    }
}


function preencherDadosDaConta(
    usuario
) {

    if (!usuario) {
        return;
    }

    const metadata =
        usuario.user_metadata || {};

    const nome =
        metadata.nome ||
        metadata.name ||
        "";

    preencherSeVazio(
        "nome",
        nome
    );

    preencherSeVazio(
        "email",
        usuario.email || ""
    );
}


function preencherSeVazio(
    id,
    valor
) {

    const campo =
        document.getElementById(id);

    if (
        campo &&
        !campo.value.trim() &&
        valor
    ) {

        campo.value =
            valor;
    }
}


/* =========================================================
   LER CARRINHO
   ========================================================= */

function lerCarrinho() {

    try {

        const bruto =
            localStorage.getItem(
                CHAVE_CARRINHO
            );

        if (!bruto) {
            return [];
        }

        const dados =
            JSON.parse(bruto);

        if (!Array.isArray(dados)) {
            return [];
        }

        return dados
            .map(normalizarItem)
            .filter(
                item => item !== null
            );

    } catch (erro) {

        console.error(
            "Erro ao ler carrinho:",
            erro
        );

        return [];
    }
}


/* =========================================================
   NORMALIZAR PRODUTO
   ========================================================= */

function normalizarItem(item) {

    if (
        !item ||
        typeof item !== "object"
    ) {
        return null;
    }

    const nome =
        item.nome ||
        item.name ||
        item.titulo ||
        "Produto";

    const id =
        item.id ||
        item.produtoId ||
        item.productId ||
        null;

    const precoPromocional =
        converterPreco(
            item.precoPromocional
        );

    const precoOriginal =
        converterPreco(
            item.preco
        );

    const preco =
        precoPromocional > 0
            ? precoPromocional
            : precoOriginal;

    let quantidade =
        parseInt(
            item.quantidade,
            10
        );

    if (
        !Number.isFinite(
            quantidade
        ) ||
        quantidade < 1
    ) {

        quantidade = 1;
    }

    return {

        id: id
            ? String(id)
            : "",

        nome:
            String(nome),

        colecao:
            item.colecao
                ? String(item.colecao)
                : "",

        categoria:
            item.categoria
                ? String(item.categoria)
                : "",

        preco:
            preco,

        precoPromocional:
            precoPromocional,

        cor:
            item.cor
                ? String(item.cor)
                : "",

        tamanho:
            item.tamanho
                ? String(item.tamanho)
                : "",

        quantidade:
            quantidade,

        imagem_url:
            item.imagem_url ||
            item.imagem ||
            item.image_url ||
            ""
    };
}


/* =========================================================
   ENTREGA
   ========================================================= */

function lerEntrega() {

    try {

        const bruto =
            localStorage.getItem(
                CHAVE_ENTREGA
            );

        if (!bruto) {
            return null;
        }

        return JSON.parse(
            bruto
        );

    } catch (erro) {

        console.error(
            "Erro ao ler entrega:",
            erro
        );

        return null;
    }
}


function calcularFrete() {

    if (!entregaAtual) {
        return 0;
    }

    const candidatos = [

        entregaAtual.preco,

        entregaAtual.valor,

        entregaAtual.price,

        entregaAtual.frete,

        entregaAtual.valorFrete

    ];

    for (
        const valor
        of candidatos
    ) {

        const numero =
            converterPreco(valor);

        if (numero > 0) {
            return numero;
        }
    }

    return 0;
}


function obterNomeEntrega() {

    if (!entregaAtual) {
        return "A combinar";
    }

    return (

        entregaAtual.nome ||

        entregaAtual.titulo ||

        entregaAtual.name ||

        entregaAtual.servico ||

        entregaAtual.tipo ||

        "Entrega"

    );
}


/* =========================================================
   PREÇOS
   ========================================================= */

function converterPreco(valor) {

    if (
        typeof valor ===
        "number"
    ) {

        return Number.isFinite(
            valor
        )
            ? valor
            : 0;
    }

    if (
        typeof valor !==
        "string"
    ) {

        return 0;
    }

    let texto =
        valor
            .trim()
            .replace(
                /[^\d,.-]/g,
                ""
            );

    if (!texto) {
        return 0;
    }

    if (
        texto.includes(",") &&
        texto.includes(".")
    ) {

        texto =
            texto
                .replace(
                    /\./g,
                    ""
                )
                .replace(
                    ",",
                    "."
                );

    } else if (
        texto.includes(",")
    ) {

        texto =
            texto.replace(
                ",",
                "."
            );
    }

    const numero =
        Number(texto);

    return Number.isFinite(
        numero
    )
        ? numero
        : 0;
}


function formatarPreco(valor) {

    return new Intl.NumberFormat(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    ).format(
        valor || 0
    );
}


/* =========================================================
   VALORES DO PEDIDO
   ========================================================= */

function calcularSubtotal() {

    return carrinho.reduce(
        (
            total,
            item
        ) => {

            return total +
                (
                    item.preco *
                    item.quantidade
                );

        },
        0
    );
}


function calcularTotal() {

    return (
        calcularSubtotal() +
        calcularFrete()
    );
}


/* =========================================================
   RESUMO
   ========================================================= */

function renderizarResumo() {

    const lista =
        document.getElementById(
            "lista-resumo"
        );

    const subtotalElemento =
        document.getElementById(
            "subtotal-pedido"
        );

    const freteElemento =
        document.getElementById(
            "frete-pedido"
        );

    const totalElemento =
        document.getElementById(
            "total-pedido"
        );

    if (!lista) {
        return;
    }


    if (!carrinho.length) {

        lista.innerHTML = `
            <div class="resumo-vazio">
                Seu carrinho está vazio.
                <br><br>
                Volte à loja para escolher suas peças.
            </div>
        `;

        if (subtotalElemento) {
            subtotalElemento.textContent =
                formatarPreco(0);
        }

        if (freteElemento) {
            freteElemento.textContent =
                "A combinar";
        }

        if (totalElemento) {
            totalElemento.textContent =
                formatarPreco(0);
        }

        const botao =
            document.getElementById(
                "botao-finalizar"
            );

        if (botao) {
            botao.disabled = true;
        }

        return;
    }


    lista.innerHTML =
        carrinho
            .map(
                item => {

                    const detalhes = [];

                    if (
                        item.colecao
                    ) {

                        detalhes.push(
                            item.colecao
                        );
                    }

                    if (
                        item.categoria
                    ) {

                        detalhes.push(
                            item.categoria
                        );
                    }

                    if (
                        item.cor
                    ) {

                        detalhes.push(
                            `Cor: ${item.cor}`
                        );
                    }

                    if (
                        item.tamanho
                    ) {

                        detalhes.push(
                            `Tamanho: ${item.tamanho}`
                        );
                    }

                    detalhes.push(
                        `Quantidade: ${item.quantidade}`
                    );


                    return `
                        <article class="item-resumo">

                            <div class="item-resumo-imagem">
                                ✦
                            </div>

                            <div class="item-resumo-info">

                                <h3 class="item-resumo-nome">
                                    ${escaparHTML(item.nome)}
                                </h3>

                                <div class="item-resumo-detalhes">
                                    ${detalhes
                                        .map(
                                            escaparHTML
                                        )
                                        .join(" · ")}
                                </div>

                                <div class="item-resumo-preco">
                                    ${formatarPreco(
                                        item.preco *
                                        item.quantidade
                                    )}
                                </div>

                            </div>

                        </article>
                    `;
                }
            )
            .join("");


    const subtotal =
        calcularSubtotal();

    const frete =
        calcularFrete();

    const total =
        subtotal +
        frete;


    if (subtotalElemento) {

        subtotalElemento.textContent =
            formatarPreco(
                subtotal
            );
    }


    if (freteElemento) {

        freteElemento.textContent =
            frete > 0
                ? formatarPreco(
                    frete
                )
                : (
                    entregaAtual
                        ? obterNomeEntrega()
                        : "A combinar"
                );
    }


    if (totalElemento) {

        totalElemento.textContent =
            formatarPreco(
                total
            );
    }


    const botao =
        document.getElementById(
            "botao-finalizar"
        );

    if (botao) {
        botao.disabled = false;
    }
}


/* =========================================================
   FORMULÁRIO
   ========================================================= */

function configurarFormulario() {

    const formulario =
        document.getElementById(
            "form-pagamento"
        );

    if (!formulario) {
        return;
    }

    formulario.addEventListener(
        "input",
        limparMensagem
    );
}


/* =========================================================
   CARREGAR DADOS SALVOS
   ========================================================= */

function carregarDadosSalvos() {

    try {

        const pedidoAnterior =
            localStorage.getItem(
                CHAVE_PEDIDO_ATUAL
            );

        if (!pedidoAnterior) {
            return;
        }

        const pedido =
            JSON.parse(
                pedidoAnterior
            );

        if (
            !pedido ||
            !pedido.cliente
        ) {
            return;
        }

        preencherCampo(
            "nome",
            pedido.cliente.nome
        );

        preencherCampo(
            "email",
            pedido.cliente.email
        );

        preencherCampo(
            "telefone",
            pedido.cliente.telefone
        );

        preencherCampo(
            "cep",
            pedido.cliente.cep
        );

        preencherCampo(
            "cidade",
            pedido.cliente.cidade
        );

        preencherCampo(
            "endereco",
            pedido.cliente.endereco
        );

        preencherCampo(
            "bairro",
            pedido.cliente.bairro
        );

        preencherCampo(
            "estado",
            pedido.cliente.estado
        );

        preencherCampo(
            "complemento",
            pedido.cliente.complemento
        );

        preencherCampo(
            "observacoes",
            pedido.cliente.observacoes
        );

    } catch (erro) {

        console.error(
            "Erro ao carregar dados salvos:",
            erro
        );
    }
}


function preencherCampo(
    id,
    valor
) {

    const campo =
        document.getElementById(id);

    if (
        campo &&
        valor !== undefined &&
        valor !== null
    ) {

        campo.value =
            String(valor);
    }
}


/* =========================================================
   CEP
   ========================================================= */

function configurarCEP() {

    const campoCEP =
        document.getElementById(
            "cep"
        );

    if (!campoCEP) {
        return;
    }

    campoCEP.addEventListener(
        "input",
        () => {

            let valor =
                campoCEP.value
                    .replace(
                        /\D/g,
                        ""
                    )
                    .slice(
                        0,
                        8
                    );

            if (
                valor.length > 5
            ) {

                valor =
                    valor.slice(
                        0,
                        5
                    ) +
                    "-" +
                    valor.slice(
                        5
                    );
            }

            campoCEP.value =
                valor;
        }
    );
}


/* =========================================================
   MÉTODO DE PAGAMENTO
   ========================================================= */

function configurarPagamento() {

    const opcoes =
        document.querySelectorAll(
            'input[name="metodo"]'
        );

    opcoes.forEach(
        opcao => {

            opcao.addEventListener(
                "change",
                atualizarMetodoPagamento
            );

        }
    );

    atualizarMetodoPagamento();
}


function atualizarMetodoPagamento() {

    const selecionado =
        document.querySelector(
            'input[name="metodo"]:checked'
        );

    const informacaoCartao =
        document.getElementById(
            "informacao-cartao"
        );

    if (
        !selecionado ||
        !informacaoCartao
    ) {
        return;
    }

    if (
        selecionado.value ===
        "cartao"
    ) {

        informacaoCartao.classList.add(
            "visivel"
        );

    } else {

        informacaoCartao.classList.remove(
            "visivel"
        );
    }
}


/* =========================================================
   BOTÃO FINALIZAR
   ========================================================= */

function configurarBotaoFinalizar() {

    const botao =
        document.getElementById(
            "botao-finalizar"
        );

    if (!botao) {
        return;
    }

    botao.addEventListener(
        "click",
        finalizarPedido
    );
}


/* =========================================================
   FINALIZAR PEDIDO
   ========================================================= */

async function finalizarPedido() {

    if (!carrinho.length) {

        mostrarMensagem(
            "Seu carrinho está vazio. Volte à loja para adicionar produtos."
        );

        return;
    }


    const formulario =
        document.getElementById(
            "form-pagamento"
        );

    if (!formulario) {
        return;
    }


    if (!formulario.checkValidity()) {

        formulario.reportValidity();

        mostrarMensagem(
            "Preencha todos os campos obrigatórios antes de continuar."
        );

        return;
    }


    const cliente =
        obterSupabaseCliente();

    if (!cliente) {

        mostrarMensagem(
            "Não foi possível conectar ao sistema de pedidos."
        );

        return;
    }


    const resultadoSessao =
        await cliente.auth.getSession();


    if (resultadoSessao.error) {

        console.error(
            resultadoSessao.error
        );

        mostrarMensagem(
            "Não foi possível verificar sua conta."
        );

        return;
    }


    const sessao =
        resultadoSessao.data.session;


    if (!sessao) {

        sessionStorage.setItem(
            "saravieiDestinoDepoisLogin",
            "pagamento.html"
        );

        mostrarMensagem(
            "Você precisa entrar na sua conta antes de finalizar o pedido."
        );

        setTimeout(
            () => {
                window.location.href =
                    "cliente-login.html";
            },
            1200
        );

        return;
    }


    const botao =
        document.getElementById(
            "botao-finalizar"
        );


    if (botao) {

        botao.disabled = true;

        botao.textContent =
            "Criando pagamento...";
    }


    const dados =
        coletarDadosFormulario();


    const metodoElemento =
        document.querySelector(
            'input[name="metodo"]:checked'
        );


    const metodo =
        metodoElemento
            ? metodoElemento.value
            : "pix";


    try {

        const pedido =
            await criarPedidoNoSupabase(
                sessao.user,
                dados,
                metodo
            );


        if (botao) {
            botao.textContent =
                "Abrindo Mercado Pago...";
        }


        const pagamento =
            await criarPreferenciaMercadoPago(
                pedido,
                dados,
                metodo
            );


        salvarPedidoLocal(
            pedido,
            metodo,
            pagamento
        );


        const linkPagamento =
            pagamento.sandbox_init_point ||
            pagamento.init_point;


        if (!linkPagamento) {
            throw new Error(
                "O Mercado Pago não retornou o link de pagamento."
            );
        }


        window.location.href =
            linkPagamento;


    } catch (erro) {

        console.error(
            "Erro ao finalizar pedido:",
            erro
        );

        if (botao) {

            botao.disabled = false;

            botao.textContent =
                "Continuar para pagamento";
        }

        mostrarMensagem(
            obterMensagemErro(
                erro
            )
        );
    }
}


/* =========================================================
   DADOS DO CLIENTE
   ========================================================= */

function coletarDadosFormulario() {

    const enderecoCompleto =
        valorCampo("endereco");

    return {

        nome:
            valorCampo("nome"),

        email:
            valorCampo("email"),

        telefone:
            valorCampo("telefone"),

        cep:
            valorCampo("cep"),

        cidade:
            valorCampo("cidade"),

        endereco:
            enderecoCompleto,

        bairro:
            valorCampo("bairro"),

        estado:
            valorCampo("estado"),

        complemento:
            valorCampo("complemento"),

        observacoes:
            valorCampo("observacoes")
    };
}


function valorCampo(id) {

    const campo =
        document.getElementById(
            id
        );

    return campo
        ? campo.value.trim()
        : "";
}


/* =========================================================
   CRIAR PEDIDO NO SUPABASE
   ========================================================= */

async function criarPedidoNoSupabase(
    usuario,
    dados,
    metodo
) {

    const cliente =
        obterSupabaseCliente();

    if (!cliente) {

        throw new Error(
            "Supabase não está disponível."
        );
    }


    if (!usuario?.id) {

        throw new Error(
            "Sua sessão de cliente não foi encontrada. Entre novamente na sua conta."
        );
    }


    const subtotal =
        calcularSubtotal();

    const frete =
        calcularFrete();

    const total =
        subtotal +
        frete;


    const shippingAddress = {

        cep:
            dados.cep,

        estado:
            dados.estado,

        cidade:
            dados.cidade,

        bairro:
            dados.bairro,

        rua:
            dados.endereco,

        numero:
            "",

        complemento:
            dados.complemento || "",

        referencia:
            dados.observacoes || ""
    };


    const pedidoData = {

        user_id:
            usuario.id,

        customer_id:
            usuario.id,

        status:
            "pending",

        payment_status:
            "pending",

        shipping_status:
            "pending",

        subtotal:
            subtotal,

        discount:
            0,

        shipping_cost:
            frete,

        total:
            total,

        shipping_address:
            shippingAddress,

        notes:
            dados.observacoes || null,

        customer_name:
            dados.nome,

        customer_email:
            dados.email,

        customer_phone:
            dados.telefone,

        cep:
            dados.cep,

        estado:
            dados.estado,

        cidade:
            dados.cidade,

        bairro:
            dados.bairro,

        rua:
            dados.endereco,

        numero:
            "",

        complemento:
            dados.complemento || null,

        referencia:
            dados.observacoes || null,

        frete:
            frete,

        desconto:
            0,

        payment_method:
            metodo === "pix"
                ? "PIX"
                : "Cartão de crédito",

        shipping_method:
            obterNomeEntrega(),

        tracking_code:
            null
    };


    const resultado =
        await cliente
            .from("orders")
            .insert(
                pedidoData
            )
            .select("*")
            .single();


    if (resultado.error) {

        throw resultado.error;
    }


    const pedidoCriado =
        resultado.data;


    if (!pedidoCriado?.id) {

        throw new Error(
            "O pedido foi criado, mas o banco não retornou o identificador."
        );
    }


    await inserirItensPedido(
        pedidoCriado.id
    );


    // A coluna numero_pedido é GENERATED ALWAYS AS IDENTITY.
    // O Supabase já gerou esse número automaticamente.
    // Mantemos order_number sincronizado apenas por compatibilidade
    // com as telas antigas do painel.
    if (pedidoCriado.numero_pedido !== null &&
        pedidoCriado.numero_pedido !== undefined) {

        const sincronizacao =
            await cliente
                .from("orders")
                .update({
                    order_number:
                        pedidoCriado.numero_pedido
                })
                .eq(
                    "id",
                    pedidoCriado.id
                )
                .select("*")
                .single();

        if (!sincronizacao.error) {
            return sincronizacao.data;
        }

        console.warn(
            "Não foi possível sincronizar order_number. O pedido continua válido.",
            sincronizacao.error
        );
    }


    return pedidoCriado;
}


/* =========================================================
   INSERIR ITENS DO PEDIDO
   ========================================================= */

async function inserirItensPedido(
    orderId
) {

    const cliente =
        obterSupabaseCliente();

    if (!cliente) {

        throw new Error(
            "Supabase não está disponível."
        );
    }


    const itens =
        carrinho.map(
            item => {

                const precoUnitario =
                    Number(
                        item.preco || 0
                    );

                const quantidade =
                    Number(
                        item.quantidade || 1
                    );

                const total =
                    precoUnitario *
                    quantidade;


                return {

                    order_id:
                        orderId,

                    product_id:
                        obterUUIDProduto(
                            item.id
                        ),

                    product_name:
                        item.nome,

                    quantidade:
                        quantidade,

                    unit_price:
                        precoUnitario,

                    discount:
                        0,

                    total:
                        total
                };
            }
        );


    const resultado =
        await cliente
            .from("order_items")
            .insert(
                itens
            );


    if (resultado.error) {

        console.error(
            "Erro ao inserir itens:",
            resultado.error
        );

        await cliente
            .from("orders")
            .delete()
            .eq(
                "id",
                orderId
            );

        throw resultado.error;
    }
}


/* =========================================================
   VALIDAR UUID DO PRODUTO
   ========================================================= */

function obterUUIDProduto(
    valor
) {

    const texto =
        String(
            valor || ""
        ).trim();


    const regexUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


    if (
        regexUUID.test(texto)
    ) {

        return texto;
    }


    return null;
}


/* =========================================================
   CRIAR PREFERÊNCIA NO MERCADO PAGO
   ========================================================= */

async function criarPreferenciaMercadoPago(
    pedido,
    dados,
    metodo
) {

    if (!pedido?.id) {

        throw new Error(
            "Não foi possível identificar o pedido para criar o pagamento."
        );
    }


    const itens =
        carrinho.map(
            item => ({

                id:
                    item.id || undefined,

                title:
                    item.tamanho
                        ? `${item.nome} - Tamanho ${item.tamanho}${item.cor ? ` - ${item.cor}` : ""}`
                        : `${item.nome}${item.cor ? ` - ${item.cor}` : ""}`,

                quantity:
                    Number(item.quantidade || 1),

                unit_price:
                    Number(item.preco || 0),

                currency_id:
                    "BRL"
            })
        );


    if (calcularFrete() > 0) {

        itens.push({

            id:
                "frete",

            title:
                "Frete",

            quantity:
                1,

            unit_price:
                Number(calcularFrete()),

            currency_id:
                "BRL"
        });
    }


    const cliente =
        obterSupabaseCliente();

    if (!cliente) {

        throw new Error(
            "Supabase não está disponível."
        );
    }

    const resultadoSessao =
        await cliente.auth.getSession();

    if (resultadoSessao.error) {

        throw resultadoSessao.error;
    }

    const sessao =
        resultadoSessao.data.session;

    if (!sessao?.access_token) {

        throw new Error(
            "Sua sessão expirou. Entre novamente na sua conta."
        );
    }

    const resposta =
        await fetch(
            URL_CRIAR_PAGAMENTO,
            {

                method:
                    "POST",

                headers: {

                    "Authorization":
                        `Bearer ${sessao.access_token}`,

                    "apikey":
                        SUPABASE_ANON_KEY,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({

                        order_id:
                            pedido.id,

                        external_reference:
                            String(pedido.id),

                        numero_pedido:
                            pedido.numero_pedido,

                        payment_method:
                            metodo,

                        payer: {

                            name:
                                dados.nome,

                            email:
                                dados.email,

                            phone: {
                                number:
                                    dados.telefone
                            }
                        },

                        items:
                            itens,

                        total:
                            Number(pedido.total || 0)
                    })
            }
        );


    let respostaJson = null;

    try {
        respostaJson =
            await resposta.json();
    } catch (erro) {
        respostaJson = null;
    }


    if (!resposta.ok) {

        const mensagem =
            respostaJson?.error ||
            respostaJson?.message ||
            `Erro ao criar pagamento. Código ${resposta.status}.`;

        throw new Error(
            mensagem
        );
    }


    if (!respostaJson) {

        throw new Error(
            "O servidor de pagamento não retornou uma resposta válida."
        );
    }


    return respostaJson;
}


/* =========================================================
   SALVAR PEDIDO LOCALMENTE
   ========================================================= */

function salvarPedidoLocal(
    pedido,
    metodo,
    pagamento = null
) {

    try {

        const dados = {

            id:
                pedido.id,

            numero_pedido:
                pedido.numero_pedido,

            order_number:
                pedido.order_number ||
                pedido.numero_pedido,

            criadoEm:
                pedido.created_at,

            status:
                pedido.status,

            pagamento: {

                metodo:
                    metodo,

                status:
                    pedido.payment_status,

                ambiente:
                    "teste",

                preference_id:
                    pagamento?.preference_id ||
                    pagamento?.id ||
                    null,

                init_point:
                    pagamento?.init_point ||
                    pagamento?.sandbox_init_point ||
                    null
            },

            cliente: {

                nome:
                    pedido.customer_name || "",

                email:
                    pedido.customer_email || "",

                telefone:
                    pedido.customer_phone || "",

                cep:
                    pedido.cep || "",

                cidade:
                    pedido.cidade || "",

                endereco:
                    pedido.rua || "",

                bairro:
                    pedido.bairro || "",

                estado:
                    pedido.estado || "",

                complemento:
                    pedido.complemento || "",

                observacoes:
                    pedido.notes || ""
            },

            subtotal:
                Number(
                    pedido.subtotal || 0
                ),

            frete:
                Number(
                    pedido.frete ||
                    pedido.shipping_cost ||
                    0
                ),

            total:
                Number(
                    pedido.total || 0
                )

        };


        localStorage.setItem(
            CHAVE_PEDIDO_ATUAL,
            JSON.stringify(
                dados
            )
        );

    } catch (erro) {

        console.error(
            "Erro ao salvar pedido local:",
            erro
        );
    }
}


/* =========================================================
   LIMPAR CARRINHO
   ========================================================= */

function limparCarrinhoDepoisDaCompra() {

    try {

        localStorage.removeItem(
            CHAVE_CARRINHO
        );

        localStorage.removeItem(
            CHAVE_ENTREGA
        );

        carrinho = [];

    } catch (erro) {

        console.error(
            "Erro ao limpar carrinho:",
            erro
        );
    }
}


/* =========================================================
   FINALIZAR INTERFACE
   ========================================================= */

function finalizarInterfacePagamento(
    textoBotao
) {

    const botao =
        document.getElementById(
            "botao-finalizar"
        );

    if (!botao) {
        return;
    }

    botao.disabled = true;

    botao.textContent =
        textoBotao;


    const link =
        document.querySelector(
            ".link-voltar"
        );

    if (link) {

        link.textContent =
            "✓ Pedido confirmado";

        link.href =
            "meus-pedidos.html";

        link.style.pointerEvents =
            "auto";

        link.style.opacity =
            "1";
    }
}


/* =========================================================
   MENSAGEM DE ERRO
   ========================================================= */

function obterMensagemErro(
    erro
) {

    if (!erro) {

        return (
            "Não foi possível finalizar o pedido."
        );
    }


    const mensagem =
        String(
            erro.message ||
            erro.error_description ||
            erro
        );


    if (
        mensagem.includes(
            "row-level security"
        ) ||
        mensagem.includes(
            "RLS"
        )
    ) {

        return (
            "O pedido foi bloqueado pelas regras de segurança do banco. Precisamos ajustar a permissão da tabela de pedidos."
        );
    }


    if (
        mensagem.includes(
            "orders"
        )
    ) {

        return (
            "Não foi possível salvar o pedido. Verifique as permissões da tabela de pedidos no Supabase."
        );
    }


    if (
        mensagem.includes(
            "Mercado Pago"
        ) ||
        mensagem.includes(
            "pagamento"
        ) ||
        mensagem.includes(
            "preference"
        )
    ) {

        return (
            `Não foi possível criar o pagamento: ${mensagem}`
        );
    }


    if (
        mensagem.includes(
            "order_items"
        )
    ) {

        return (
            "O pedido foi criado, mas não foi possível salvar os produtos. A operação foi cancelada para evitar pedido incompleto."
        );
    }


    return (
        "Não foi possível finalizar o pedido. Tente novamente."
    );
}


/* =========================================================
   PREENCHER CAMPO
   ========================================================= */

function preencherCampo(
    id,
    valor
) {

    const campo =
        document.getElementById(
            id
        );

    if (
        campo &&
        valor !== undefined &&
        valor !== null
    ) {

        campo.value =
            String(valor);
    }
}


/* =========================================================
   MENSAGEM
   ========================================================= */

function mostrarMensagem(
    texto
) {

    const elemento =
        document.getElementById(
            "mensagem-formulario"
        );

    if (!elemento) {
        return;
    }

    elemento.textContent =
        texto;

    elemento.classList.add(
        "visivel"
    );

    elemento.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


function limparMensagem() {

    const elemento =
        document.getElementById(
            "mensagem-formulario"
        );

    if (!elemento) {
        return;
    }

    elemento.textContent =
        "";

    elemento.classList.remove(
        "visivel"
    );
}


/* =========================================================
   SEGURANÇA HTML
   ========================================================= */

function escaparHTML(
    valor
) {

    return String(valor)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}