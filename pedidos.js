/* =========================================================
   PEDIDOS — SARAVIEI
   MODO DE TESTE ATIVADO
   ========================================================= */

(function () {
    "use strict";

    const SUPABASE_URL = "https://gmimzvnuvraletepczrp.supabase.co";
    const SUPABASE_KEY = "sb_publishable_NtJmSYaKmuQuLY2QvfQKLQ_rFA8Ceqx";

    let supabaseClient = null;
    let pedidosCarregados = [];
    let pedidosFiltrados = [];
    let filtroStatusAtual = "todos";
    let pedidoSelecionado = null;
    let pedidosIniciados = false;

    /*
     * =======================================================
     * MODO DE TESTE
     *
     * true  = adiciona um pedido fictício na tela
     * false = mostra somente pedidos reais do Supabase
     *
     * IMPORTANTE:
     * O pedido de teste NÃO é salvo no banco.
     * =======================================================
     */
    const MODO_TESTE_PEDIDOS = true;

    const pedidoTeste = {
        id: "TESTE001",
        order_number: "001",
        status: "novo",
        customer_name: "Cliente Teste",
        customer_email: "cliente.teste@saraviei.com",
        customer_phone: "(21) 99999-9999",

        created_at: new Date().toISOString(),

        subtotal: 89.90,
        shipping: 10.00,
        discount: 0,
        total: 99.90,

        payment_method: "Pix",
        payment_status: "Pendente",

        shipping_method: "Entrega padrão",
        tracking_code: "",

        postal_code: "20000-000",
        state: "RJ",
        city: "Rio de Janeiro",
        neighborhood: "Centro",
        street: "Rua de Teste",
        number: "123",
        complement: "Sala 1",
        reference: "Pedido fictício para teste",

        is_test_order: true
    };

    const itensPedidoTeste = [
        {
            id: "TESTEITEM001",
            order_id: "TESTE001",
            product_id: "TESTEPRODUTO001",

            product_name: "Produto de Teste Saraviei",
            name: "Produto de Teste Saraviei",

            quantity: 2,
            unit_price: 44.95,
            price: 44.95,
            subtotal: 89.90,

            color: "Dourado",
            size: "",
            personalization: "",

            image_url: ""
        }
    ];

    /* =========================================================
       INICIALIZAÇÃO
       ========================================================= */

    document.addEventListener("DOMContentLoaded", function () {
        iniciarPedidos();
    });

    async function iniciarPedidos() {
        if (pedidosIniciados) {
            return;
        }

        pedidosIniciados = true;

        try {
            await aguardarSupabase();

            if (!window.supabase) {
                console.error("Supabase não foi carregado.");
                return;
            }

            supabaseClient = window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_KEY
            );

            configurarEventosPedidos();
            configurarFiltrosPedidos();

            configurarAtalhosPedidos();

            const secaoPedidos = document.getElementById("secao-pedidos");

            if (
                secaoPedidos &&
                (
                    secaoPedidos.classList.contains("ativa") ||
                    secaoPedidos.style.display !== "none"
                )
            ) {
                carregarPedidos();
            }

        } catch (erro) {
            console.error("Erro ao iniciar pedidos:", erro);
        }
    }

    function aguardarSupabase() {
        return new Promise(function (resolve) {
            if (window.supabase) {
                resolve();
                return;
            }

            let tentativas = 0;

            const intervalo = setInterval(function () {
                tentativas++;

                if (window.supabase) {
                    clearInterval(intervalo);
                    resolve();
                    return;
                }

                if (tentativas >= 100) {
                    clearInterval(intervalo);
                    resolve();
                }
            }, 100);
        });
    }

    /* =========================================================
       EVENTOS
       ========================================================= */

    function configurarEventosPedidos() {

        document.addEventListener("click", function (evento) {

            const filtro = evento.target.closest(".filtro-pedido");

            if (filtro) {
                evento.preventDefault();

                const status = obterStatusDoFiltro(filtro);

                /*
                 * Se os detalhes de um pedido estiverem abertos,
                 * qualquer filtro de status deve fechar os detalhes
                 * e devolver a tela para os cards.
                 */
                fecharDetalhesPedido();

                aplicarFiltroPedidos(status);

                return;
            }

            const cardPedido = evento.target.closest(
                "#pedidos-container .card-pedido, " +
                "#pedidos-container [data-pedido-id]"
            );

            if (cardPedido) {
                const pedidoId =
                    cardPedido.dataset.pedidoId ||
                    cardPedido.getAttribute("data-pedido-id");

                if (pedidoId) {
                    abrirPedido(pedidoId);
                }

                return;
            }

            const fechar = evento.target.closest(
                "#botao-fechar-pedido, " +
                "#fechar-detalhes-pedido, " +
                ".fechar-detalhes-pedido"
            );

            if (fechar) {
                evento.preventDefault();
                fecharDetalhesPedido();
                return;
            }

            const voltar = evento.target.closest(
                "#botao-voltar-pedidos, " +
                ".botao-voltar-pedidos"
            );

            if (voltar) {
                evento.preventDefault();
                fecharDetalhesPedido();
                return;
            }

            const atualizar = evento.target.closest(
                "#botao-atualizar-pedidos, " +
                "#botao-recarregar-pedidos, " +
                ".botao-atualizar-pedidos"
            );

            if (atualizar) {
                evento.preventDefault();
                carregarPedidos();
                return;
            }

            const salvarStatus = evento.target.closest(
                "#botao-salvar-status-pedido"
            );

            if (salvarStatus) {
                evento.preventDefault();
                salvarStatusPedido();
                return;
            }
        });
    }

    function configurarFiltrosPedidos() {
        atualizarVisualDosFiltros();
    }

    function configurarAtalhosPedidos() {

        document.addEventListener("click", function (evento) {

            const menu = evento.target.closest(
                '.botao-menu[data-destino="pedidos"]'
            );

            const atalho = evento.target.closest(
                '[data-atalho="pedidos"]'
            );

            if (menu || atalho) {
                setTimeout(function () {
                    carregarPedidos();
                }, 100);
            }
        });
    }

    /* =========================================================
       FILTROS
       ========================================================= */

    function obterStatusDoFiltro(botao) {

        if (!botao) {
            return "todos";
        }

        const valor =
            botao.dataset.status ||
            botao.dataset.filtro ||
            botao.dataset.filtroStatus ||
            botao.getAttribute("data-status") ||
            botao.getAttribute("data-filtro") ||
            botao.getAttribute("data-filtro-status") ||
            botao.textContent ||
            "";

        return normalizarStatusFiltro(valor);
    }

    function normalizarTexto(valor) {

        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
            .replace(/[-\s]+/g, "_");
    }

    function normalizarStatusFiltro(valor) {

        const texto = normalizarTexto(valor);

        if (
            texto === "todos" ||
            texto === "todas" ||
            texto === "todos_os_pedidos"
        ) {
            return "todos";
        }

        if (
            texto === "novo" ||
            texto === "novos" ||
            texto === "novo_pedido"
        ) {
            return "novo";
        }

        if (
            texto === "pagamento_confirmado" ||
            texto === "pagamento" ||
            texto === "pagamento_aprovado" ||
            texto === "pago"
        ) {
            return "pagamento_confirmado";
        }

        if (
            texto === "em_preparacao" ||
            texto === "preparacao" ||
            texto === "preparando"
        ) {
            return "em_preparacao";
        }

        if (
            texto === "enviado" ||
            texto === "envio"
        ) {
            return "enviado";
        }

        if (
            texto === "entregue" ||
            texto === "entrega"
        ) {
            return "entregue";
        }

        return texto;
    }

    function normalizarStatusPedido(pedido) {

        if (!pedido) {
            return "novo";
        }

        const valor =
            pedido.status ||
            pedido.order_status ||
            pedido.status_pedido ||
            pedido.situacao ||
            "novo";

        return normalizarStatusFiltro(valor);
    }

    function aplicarFiltroPedidos(status) {

        filtroStatusAtual = normalizarStatusFiltro(status);

        atualizarVisualDosFiltros();

        if (filtroStatusAtual === "todos") {
            pedidosFiltrados = pedidosCarregados.slice();
        } else {
            pedidosFiltrados = pedidosCarregados.filter(function (pedido) {

                return (
                    normalizarStatusPedido(pedido) ===
                    filtroStatusAtual
                );
            });
        }

        renderizarPedidos();
    }

    function atualizarVisualDosFiltros() {

        const botoes = document.querySelectorAll(".filtro-pedido");

        botoes.forEach(function (botao) {

            const status = obterStatusDoFiltro(botao);

            const ativo = status === filtroStatusAtual;

            botao.classList.toggle("ativo", ativo);
            botao.classList.toggle("active", ativo);

            botao.setAttribute(
                "aria-pressed",
                ativo ? "true" : "false"
            );
        });
    }

    /* =========================================================
       CARREGAR PEDIDOS
       ========================================================= */

    async function carregarPedidos() {

        const container =
            document.getElementById("pedidos-container");

        if (!container) {
            return;
        }

        container.innerHTML = `
            <div class="mensagem-carregando-pedidos">
                Carregando pedidos...
            </div>
        `;

        try {

            if (!supabaseClient) {
                await aguardarSupabase();

                if (!window.supabase) {
                    throw new Error(
                        "Supabase não está disponível."
                    );
                }

                supabaseClient = window.supabase.createClient(
                    SUPABASE_URL,
                    SUPABASE_KEY
                );
            }

            const resultado = await supabaseClient
                .from("orders")
                .select("*")
                .order("created_at", {
                    ascending: false
                });

            if (resultado.error) {
                throw resultado.error;
            }

            let pedidosReais = Array.isArray(resultado.data)
                ? resultado.data
                : [];

            /*
             * ==================================================
             * ADICIONA PEDIDO DE TESTE
             * ==================================================
             */

            if (MODO_TESTE_PEDIDOS) {

                const existePedidoTeste =
                    pedidosReais.some(function (pedido) {

                        return (
                            pedido.id === "TESTE001" ||
                            pedido.order_number === "001" &&
                            pedido.is_test_order === true
                        );
                    });

                if (!existePedidoTeste) {
                    pedidosReais = [
                        pedidoTeste,
                        ...pedidosReais
                    ];
                }
            }

            pedidosCarregados = pedidosReais;

            filtroStatusAtual = "todos";

            aplicarFiltroPedidos("todos");

        } catch (erro) {

            console.error(
                "Erro ao carregar pedidos:",
                erro
            );

            /*
             * Mesmo que o banco dê erro, o pedido fictício
             * continua disponível para testar a interface.
             */

            if (MODO_TESTE_PEDIDOS) {

                pedidosCarregados = [pedidoTeste];

                filtroStatusAtual = "todos";

                aplicarFiltroPedidos("todos");

                mostrarMensagemPedidos(
                    "Modo de teste ativo. Os pedidos reais não puderam ser carregados.",
                    "aviso"
                );

                return;
            }

            container.innerHTML = `
                <div class="mensagem-erro-pedidos">
                    Não foi possível carregar os pedidos.
                </div>
            `;
        }
    }

    /* =========================================================
       RENDERIZAÇÃO DOS PEDIDOS
       ========================================================= */

    function renderizarPedidos() {

        const container =
            document.getElementById("pedidos-container");

        if (!container) {
            return;
        }

        atualizarContadorPedidos();

        if (!pedidosFiltrados.length) {

            container.innerHTML = `
                <div class="mensagem-sem-pedidos">
                    <strong>Nenhum pedido encontrado.</strong>
                    <span>
                        Não existem pedidos neste filtro.
                    </span>
                </div>
            `;

            return;
        }

        container.innerHTML = pedidosFiltrados
            .map(criarCardPedido)
            .join("");
    }

    function criarCardPedido(pedido) {

        const id =
            pedido.id ||
            pedido.order_id ||
            "";

        const numero =
            pedido.order_number ||
            pedido.numero ||
            pedido.number ||
            gerarNumeroPedido(pedido);

        const nome =
            pedido.customer_name ||
            pedido.nome_cliente ||
            pedido.name ||
            pedido.customer ||
            "Cliente não informado";

        const total =
            obterValorPedido(pedido);

        const status =
            normalizarStatusPedido(pedido);

        const data =
            formatarData(pedido.created_at);

        const classeStatus =
            normalizarTexto(status);

        const textoStatus =
            obterTextoStatus(status);

        const teste =
            pedido.is_test_order === true
                ? `
                    <span class="pedido-teste-badge">
                        TESTE
                    </span>
                `
                : "";

        return `
            <article
                class="card-pedido"
                data-pedido-id="${escaparHTML(id)}"
                tabindex="0"
            >

                <div class="card-pedido-cabecalho">

                    <div class="pedido-identificacao">

                        <strong>
                            #${escaparHTML(numero)}
                        </strong>

                        ${teste}

                    </div>

                    <span
                        class="status-pedido status-${classeStatus}"
                    >
                        ${escaparHTML(textoStatus)}
                    </span>

                </div>

                <div class="card-pedido-conteudo">

                    <div class="pedido-produto-preview">

                        <div class="pedido-imagem-placeholder">
                            🛍️
                        </div>

                        <div class="pedido-produto-info">

                            <strong>
                                ${escaparHTML(
                                    obterNomeResumoProduto(pedido)
                                )}
                            </strong>

                            <span>
                                ${escaparHTML(
                                    obterQuantidadeResumo(pedido)
                                )}
                            </span>

                        </div>

                    </div>

                    <div class="pedido-cliente">

                        <span class="label-pedido">
                            Cliente
                        </span>

                        <strong>
                            ${escaparHTML(nome)}
                        </strong>

                    </div>

                    <div class="pedido-data">

                        <span class="label-pedido">
                            Data
                        </span>

                        <strong>
                            ${escaparHTML(data)}
                        </strong>

                    </div>

                    <div class="pedido-valor">

                        <span class="label-pedido">
                            Valor
                        </span>

                        <strong>
                            ${formatarMoeda(total)}
                        </strong>

                    </div>

                </div>

                <div class="card-pedido-rodape">

                    <span>
                        Clique para ver os detalhes
                    </span>

                    <span class="pedido-seta">
                        →
                    </span>

                </div>

            </article>
        `;
    }

    function atualizarContadorPedidos() {

        const possiveis = [
            "#contador-pedidos",
            "#total-pedidos",
            "[data-contador-pedidos]"
        ];

        possiveis.forEach(function (seletor) {

            document
                .querySelectorAll(seletor)
                .forEach(function (elemento) {

                    elemento.textContent =
                        pedidosFiltrados.length;
                });
        });
    }

    /* =========================================================
       ABRIR PEDIDO
       ========================================================= */

    async function abrirPedido(pedidoId) {

        const pedido =
            pedidosCarregados.find(function (item) {

                return String(item.id) ===
                    String(pedidoId);
            });

        if (!pedido) {
            return;
        }

        pedidoSelecionado = pedido;

        const container =
            document.getElementById("pedidos-container");

        const detalhes =
            document.getElementById("pedido-detalhes");

        if (!detalhes) {
            console.warn(
                "Elemento #pedido-detalhes não encontrado."
            );
            return;
        }

        if (container) {
            container.style.display = "none";
        }

        detalhes.style.display = "block";

        renderizarDetalhesPedido(pedido);

        await carregarItensPedido(pedido);
    }

    async function carregarItensPedido(pedido) {

        const container =
            document.getElementById(
                "pedido-itens-container"
            );

        if (!container) {
            return;
        }

        /*
         * Pedido de teste
         */

        if (pedido.is_test_order === true) {

            container.innerHTML =
                renderizarItensPedido(
                    itensPedidoTeste
                );

            return;
        }

        if (!pedido.id) {

            container.innerHTML =
                `<p>Nenhum item encontrado.</p>`;

            return;
        }

        try {

            const resultado =
                await supabaseClient
                    .from("order_items")
                    .select("*")
                    .eq("order_id", pedido.id);

            if (resultado.error) {
                throw resultado.error;
            }

            const itens =
                Array.isArray(resultado.data)
                    ? resultado.data
                    : [];

            if (!itens.length) {

                container.innerHTML =
                    `<p>Nenhum item encontrado.</p>`;

                return;
            }

            container.innerHTML =
                renderizarItensPedido(itens);

        } catch (erro) {

            console.warn(
                "Não foi possível carregar os itens:",
                erro
            );

            container.innerHTML =
                `
                    <p>
                        Não foi possível carregar os itens do pedido.
                    </p>
                `;
        }
    }

    function renderizarItensPedido(itens) {

        return itens
            .map(function (item) {

                const nome =
                    item.product_name ||
                    item.name ||
                    item.nome_produto ||
                    "Produto";

                const quantidade =
                    item.quantity ||
                    item.quantidade ||
                    1;

                const cor =
                    item.color ||
                    item.cor ||
                    "";

                const tamanho =
                    item.size ||
                    item.tamanho ||
                    "";

                const personalizacao =
                    item.personalization ||
                    item.personalizacao ||
                    "";

                const valor =
                    item.unit_price ??
                    item.price ??
                    item.preco_unitario ??
                    0;

                const subtotal =
                    item.subtotal ??
                    (
                        Number(valor) *
                        Number(quantidade)
                    );

                const imagem =
                    item.image_url ||
                    item.product_image ||
                    item.imagem ||
                    "";

                return `
                    <article class="item-pedido-detalhe">

                        <div class="item-pedido-imagem">

                            ${
                                imagem
                                    ? `
                                        <img
                                            src="${escaparHTML(imagem)}"
                                            alt="${escaparHTML(nome)}"
                                        >
                                    `
                                    : `
                                        <div class="pedido-imagem-placeholder">
                                            🛍️
                                        </div>
                                    `
                            }

                        </div>

                        <div class="item-pedido-info">

                            <strong>
                                ${escaparHTML(nome)}
                            </strong>

                            <span>
                                Quantidade:
                                ${escaparHTML(quantidade)}
                            </span>

                            ${
                                cor
                                    ? `
                                        <span>
                                            Cor:
                                            ${escaparHTML(cor)}
                                        </span>
                                    `
                                    : ""
                            }

                            ${
                                tamanho
                                    ? `
                                        <span>
                                            Tamanho:
                                            ${escaparHTML(tamanho)}
                                        </span>
                                    `
                                    : ""
                            }

                            ${
                                personalizacao
                                    ? `
                                        <span>
                                            Personalização:
                                            ${escaparHTML(personalizacao)}
                                        </span>
                                    `
                                    : ""
                            }

                        </div>

                        <div class="item-pedido-valores">

                            <span>
                                Unitário:
                                ${formatarMoeda(valor)}
                            </span>

                            <strong>
                                ${formatarMoeda(subtotal)}
                            </strong>

                        </div>

                    </article>
                `;
            })
            .join("");
    }

    /* =========================================================
       DETALHES DO PEDIDO
       ========================================================= */

    function renderizarDetalhesPedido(pedido) {

        const detalhes =
            document.getElementById(
                "pedido-detalhes"
            );

        if (!detalhes) {
            return;
        }

        const numero =
            pedido.order_number ||
            pedido.numero ||
            pedido.number ||
            gerarNumeroPedido(pedido);

        const nome =
            pedido.customer_name ||
            pedido.nome_cliente ||
            pedido.name ||
            pedido.customer ||
            "Cliente não informado";

        const email =
            pedido.customer_email ||
            pedido.email ||
            pedido.cliente_email ||
            "";

        const telefone =
            pedido.customer_phone ||
            pedido.phone ||
            pedido.telefone ||
            pedido.customer_phone_number ||
            "";

        const cep =
            pedido.postal_code ||
            pedido.cep ||
            pedido.zip_code ||
            "";

        const estado =
            pedido.state ||
            pedido.estado ||
            pedido.uf ||
            "";

        const cidade =
            pedido.city ||
            pedido.cidade ||
            "";

        const bairro =
            pedido.neighborhood ||
            pedido.bairro ||
            "";

        const rua =
            pedido.street ||
            pedido.rua ||
            pedido.address ||
            "";

        const numeroEndereco =
            pedido.number ||
            pedido.numero_endereco ||
            pedido.address_number ||
            "";

        const complemento =
            pedido.complement ||
            pedido.complemento ||
            "";

        const referencia =
            pedido.reference ||
            pedido.referencia ||
            "";

        const metodoEntrega =
            pedido.shipping_method ||
            pedido.delivery_method ||
            pedido.metodo_entrega ||
            "Não informado";

        const subtotal =
            pedido.subtotal ??
            pedido.products_total ??
            pedido.valor_produtos ??
            pedido.items_total ??
            0;

        const frete =
            pedido.shipping ??
            pedido.shipping_cost ??
            pedido.frete ??
            0;

        const desconto =
            pedido.discount ??
            pedido.desconto ??
            0;

        const total =
            obterValorPedido(pedido);

        const metodoPagamento =
            pedido.payment_method ||
            pedido.payment ||
            pedido.metodo_pagamento ||
            "Não informado";

        const statusPagamento =
            pedido.payment_status ||
            pedido.paymentState ||
            pedido.status_pagamento ||
            "Não informado";

        const rastreio =
            pedido.tracking_code ||
            pedido.tracking ||
            pedido.codigo_rastreio ||
            "";

        detalhes.innerHTML = `

            <div class="cabecalho-detalhes-pedido">

                <div>

                    <span class="eyebrow">
                        PEDIDO
                    </span>

                    <h2 id="pedido-detalhes-titulo">
                        #${escaparHTML(numero)}
                    </h2>

                    <span id="pedido-detalhes-data">
                        ${escaparHTML(
                            formatarData(pedido.created_at)
                        )}
                    </span>

                    ${
                        pedido.is_test_order === true
                            ? `
                                <span class="pedido-teste-badge">
                                    PEDIDO DE TESTE
                                </span>
                            `
                            : ""
                    }

                </div>

                <button
                    type="button"
                    id="botao-fechar-pedido"
                    class="botao-fechar-pedido"
                >
                    ×
                </button>

            </div>

            <!-- =============================================
                 1. CLIENTE
                 ============================================= -->

            <section class="bloco-detalhes-pedido">

                <h3>
                    1. Cliente
                </h3>

                <div class="grade-detalhes">

                    <div>
                        <span>Nome</span>
                        <strong>
                            ${escaparHTML(nome)}
                        </strong>
                    </div>

                    <div>
                        <span>E-mail</span>
                        <strong>
                            ${escaparHTML(email || "Não informado")}
                        </strong>
                    </div>

                    <div>
                        <span>Telefone</span>
                        <strong>
                            ${escaparHTML(telefone || "Não informado")}
                        </strong>
                    </div>

                </div>

            </section>

            <!-- =============================================
                 2. ITENS DO PEDIDO
                 ============================================= -->

            <section class="bloco-detalhes-pedido">

                <h3>
                    2. Itens do pedido
                </h3>

                <div id="pedido-itens-container">

                    <div class="mensagem-carregando-pedidos">
                        Carregando itens...
                    </div>

                </div>

            </section>

            <!-- =============================================
                 3. ENTREGA
                 ============================================= -->

            <section class="bloco-detalhes-pedido">

                <h3>
                    3. Entrega
                </h3>

                <div class="grade-detalhes">

                    <div>
                        <span>CEP</span>
                        <strong>
                            ${escaparHTML(cep || "Não informado")}
                        </strong>
                    </div>

                    <div>
                        <span>Estado</span>
                        <strong>
                            ${escaparHTML(estado || "Não informado")}
                        </strong>
                    </div>

                    <div>
                        <span>Cidade</span>
                        <strong>
                            ${escaparHTML(cidade || "Não informado")}
                        </strong>
                    </div>

                    <div>
                        <span>Bairro</span>
                        <strong>
                            ${escaparHTML(bairro || "Não informado")}
                        </strong>
                    </div>

                    <div>
                        <span>Rua</span>
                        <strong>
                            ${escaparHTML(rua || "Não informado")}
                        </strong>
                    </div>

                    <div>
                        <span>Número</span>
                        <strong>
                            ${escaparHTML(
                                numeroEndereco || "Não informado"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Complemento</span>
                        <strong>
                            ${escaparHTML(
                                complemento || "Não informado"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Referência</span>
                        <strong>
                            ${escaparHTML(
                                referencia || "Não informado"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Forma de entrega</span>
                        <strong>
                            ${escaparHTML(metodoEntrega)}
                        </strong>
                    </div>

                </div>

            </section>

            <!-- =============================================
                 4. RESUMO FINANCEIRO
                 ============================================= -->

            <section class="bloco-detalhes-pedido">

                <h3>
                    4. Resumo financeiro
                </h3>

                <div class="resumo-financeiro">

                    <div>
                        <span>Produtos</span>
                        <strong>
                            ${formatarMoeda(subtotal)}
                        </strong>
                    </div>

                    <div>
                        <span>Frete</span>
                        <strong>
                            ${formatarMoeda(frete)}
                        </strong>
                    </div>

                    <div>
                        <span>Desconto</span>
                        <strong>
                            ${formatarMoeda(desconto)}
                        </strong>
                    </div>

                    <div class="total-pedido">

                        <span>
                            Total
                        </span>

                        <strong>
                            ${formatarMoeda(total)}
                        </strong>

                    </div>

                </div>

            </section>

            <!-- =============================================
                 5. PAGAMENTO
                 ============================================= -->

            <section class="bloco-detalhes-pedido">

                <h3>
                    5. Pagamento
                </h3>

                <div class="grade-detalhes">

                    <div>
                        <span>
                            Forma de pagamento
                        </span>

                        <strong>
                            ${escaparHTML(metodoPagamento)}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Status do pagamento
                        </span>

                        <strong>
                            ${escaparHTML(statusPagamento)}
                        </strong>
                    </div>

                </div>

            </section>

            <!-- =============================================
                 6. STATUS E RASTREIO
                 ============================================= -->

            <section class="bloco-detalhes-pedido">

                <h3>
                    6. Status e rastreio
                </h3>

                <div class="form-status-pedido">

                    <label for="pedido-status">
                        Status do pedido
                    </label>

                    <select id="pedido-status">

                        <option value="novo">
                            Novo
                        </option>

                        <option value="pagamento_confirmado">
                            Pagamento confirmado
                        </option>

                        <option value="em_preparacao">
                            Em preparação
                        </option>

                        <option value="enviado">
                            Enviado
                        </option>

                        <option value="entregue">
                            Entregue
                        </option>

                    </select>

                    <label for="pedido-rastreio">
                        Código de rastreio
                    </label>

                    <input
                        type="text"
                        id="pedido-rastreio"
                        value="${escaparHTML(rastreio)}"
                        placeholder="Digite o código de rastreio"
                    >

                    <button
                        type="button"
                        id="botao-salvar-status-pedido"
                        class="botao-salvar-status-pedido"
                    >
                        Salvar status
                    </button>

                    ${
                        pedido.is_test_order === true
                            ? `
                                <p class="aviso-pedido-teste">
                                    Este é um pedido fictício.
                                    Alterações de status neste pedido
                                    são apenas para testar a interface
                                    e não serão salvas no Supabase.
                                </p>
                            `
                            : ""
                    }

                </div>

            </section>

        `;

        renderizarStatus(pedido);
    }

    function renderizarStatus(pedido) {

        const select =
            document.getElementById(
                "pedido-status"
            );

        if (!select) {
            return;
        }

        select.value =
            normalizarStatusPedido(pedido);

        if (!select.value) {
            select.value = "novo";
        }
    }

    /* =========================================================
       SALVAR STATUS
       ========================================================= */

    async function salvarStatusPedido() {

        if (!pedidoSelecionado) {
            return;
        }

        const select =
            document.getElementById(
                "pedido-status"
            );

        const campoRastreio =
            document.getElementById(
                "pedido-rastreio"
            );

        const botao =
            document.getElementById(
                "botao-salvar-status-pedido"
            );

        if (!select) {
            return;
        }

        const novoStatus =
            normalizarStatusFiltro(select.value);

        const rastreio =
            campoRastreio
                ? campoRastreio.value.trim()
                : "";

        /*
         * Pedido fictício:
         * não salva no Supabase.
         */

        if (pedidoSelecionado.is_test_order === true) {

            pedidoSelecionado.status =
                novoStatus;

            pedidoSelecionado.tracking_code =
                rastreio;

            const indice =
                pedidosCarregados.findIndex(
                    function (pedido) {

                        return String(pedido.id) ===
                            String(pedidoSelecionado.id);
                    }
                );

            if (indice !== -1) {

                pedidosCarregados[indice] =
                    pedidoSelecionado;
            }

            aplicarFiltroPedidos(
                filtroStatusAtual
            );

            /*
             * Depois de atualizar o status, a tela volta para os
             * cards. Se o pedido não pertencer mais ao filtro atual,
             * ele desaparece automaticamente daquela lista.
             */
            fecharDetalhesPedido();

            mostrarMensagemPedidos(
                "Status do pedido de teste atualizado somente para o teste.",
                "sucesso"
            );

            return;
        }

        if (!supabaseClient) {
            return;
        }

        if (botao) {
            botao.disabled = true;
            botao.textContent = "Salvando...";
        }

        try {

            const dadosAtualizacao = {
                status: novoStatus
            };

            if (
                campoRastreio &&
                rastreio
            ) {
                dadosAtualizacao.tracking_code =
                    rastreio;
            }

            const resultado =
                await supabaseClient
                    .from("orders")
                    .update(dadosAtualizacao)
                    .eq("id", pedidoSelecionado.id);

            if (resultado.error) {
                throw resultado.error;
            }

            const statusAnterior =
                normalizarStatusPedido(
                    pedidoSelecionado
                );

            pedidoSelecionado.status =
                novoStatus;

            pedidoSelecionado.tracking_code =
                rastreio;

            const indice =
                pedidosCarregados.findIndex(
                    function (pedido) {

                        return String(pedido.id) ===
                            String(pedidoSelecionado.id);
                    }
                );

            if (indice !== -1) {

                pedidosCarregados[indice] =
                    pedidoSelecionado;
            }

            /*
             * Cria notificação apenas quando
             * o status realmente mudou.
             */

            if (
                statusAnterior !== novoStatus
            ) {
                await criarNotificacaoPedido(
                    pedidoSelecionado,
                    novoStatus
                );
            }

            aplicarFiltroPedidos(
                filtroStatusAtual
            );

            /*
             * Depois de salvar o novo status, fecha os detalhes e
             * devolve a tela para os cards do filtro atual.
             */
            fecharDetalhesPedido();

            mostrarMensagemPedidos(
                "Status do pedido atualizado com sucesso.",
                "sucesso"
            );

        } catch (erro) {

            console.error(
                "Erro ao salvar status:",
                erro
            );

            mostrarMensagemPedidos(
                "Não foi possível salvar o status do pedido.",
                "erro"
            );

        } finally {

            if (botao) {
                botao.disabled = false;
                botao.textContent = "Salvar status";
            }
        }
    }

    /* =========================================================
       NOTIFICAÇÕES
       ========================================================= */

    async function criarNotificacaoPedido(
        pedido,
        novoStatus
    ) {

        if (!supabaseClient || !pedido) {
            return;
        }

        /*
         * Tenta localizar o identificador do cliente
         * sem assumir um nome único de coluna.
         */

        const customerId =
            pedido.customer_id ||
            pedido.user_id ||
            pedido.customer_user_id ||
            pedido.userId ||
            null;

        if (!customerId) {
            console.log(
                "Pedido atualizado, mas não foi encontrado customer_id/user_id para notificação."
            );

            return;
        }

        const numero =
            pedido.order_number ||
            pedido.numero ||
            pedido.number ||
            gerarNumeroPedido(pedido);

        const textoStatus =
            obterTextoStatus(novoStatus);

        try {

            await supabaseClient
                .from("notifications")
                .insert([
                    {
                        user_id: customerId,

                        title:
                            `Pedido #${numero} atualizado`,

                        message:
                            `Seu pedido está em ${textoStatus.toLowerCase()}.`,

                        read: false,

                        order_id: pedido.id
                    }
                ]);

        } catch (erro) {

            console.warn(
                "Não foi possível criar a notificação:",
                erro
            );
        }
    }

    /* =========================================================
       FECHAR DETALHES
       ========================================================= */

    function fecharDetalhesPedido() {

        const detalhes =
            document.getElementById(
                "pedido-detalhes"
            );

        const container =
            document.getElementById(
                "pedidos-container"
            );

        if (detalhes) {
            detalhes.style.display = "none";
        }

        if (container) {
            container.style.display = "";
        }

        pedidoSelecionado = null;
    }

    /* =========================================================
       FUNÇÕES AUXILIARES
       ========================================================= */

    function obterValorPedido(pedido) {

        const valor =
            pedido.total ??
            pedido.valor_total ??
            pedido.total_amount ??
            pedido.amount ??
            0;

        const numero =
            Number(valor);

        return Number.isFinite(numero)
            ? numero
            : 0;
    }

    function formatarMoeda(valor) {

        const numero =
            Number(valor);

        return new Intl.NumberFormat(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        ).format(
            Number.isFinite(numero)
                ? numero
                : 0
        );
    }

    function gerarNumeroPedido(pedido) {

        if (!pedido) {
            return "000";
        }

        const valor =
            pedido.id ||
            pedido.order_id ||
            "";

        const texto =
            String(valor);

        const numeros =
            texto.replace(/\D/g, "");

        if (numeros) {
            return numeros
                .slice(-3)
                .padStart(3, "0");
        }

        return "000";
    }

    function obterNomeResumoProduto(pedido) {

        if (!pedido) {
            return "Produto";
        }

        if (
            pedido.product_name ||
            pedido.nome_produto
        ) {
            return (
                pedido.product_name ||
                pedido.nome_produto
            );
        }

        if (
            Array.isArray(pedido.items) &&
            pedido.items.length
        ) {
            const primeiro =
                pedido.items[0];

            return (
                primeiro.product_name ||
                primeiro.name ||
                primeiro.nome_produto ||
                "Produto"
            );
        }

        return "Produto";
    }

    function obterQuantidadeResumo(pedido) {

        if (!pedido) {
            return "Quantidade: 1";
        }

        if (
            pedido.quantity ||
            pedido.quantidade
        ) {
            return `Quantidade: ${
                pedido.quantity ||
                pedido.quantidade
            }`;
        }

        if (
            Array.isArray(pedido.items) &&
            pedido.items.length
        ) {
            const total =
                pedido.items.reduce(
                    function (soma, item) {

                        return (
                            soma +
                            Number(
                                item.quantity ||
                                item.quantidade ||
                                1
                            )
                        );

                    },
                    0
                );

            return `Quantidade: ${total}`;
        }

        return "Quantidade: 1";
    }

    function obterTextoStatus(status) {

        const valor =
            normalizarStatusFiltro(status);

        const mapa = {
            todos: "Todos",
            novo: "Novo",
            pagamento_confirmado:
                "Pagamento confirmado",
            em_preparacao:
                "Em preparação",
            enviado:
                "Enviado",
            entregue:
                "Entregue"
        };

        return (
            mapa[valor] ||
            "Novo"
        );
    }

    function formatarData(valor) {

        if (!valor) {
            return "Não informado";
        }

        const data =
            new Date(valor);

        if (
            Number.isNaN(
                data.getTime()
            )
        ) {
            return String(valor);
        }

        return data.toLocaleString(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }

    function escaparHTML(valor) {

        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function mostrarMensagemPedidos(
        mensagem,
        tipo
    ) {

        const antiga =
            document.querySelector(
                ".mensagem-temporaria-pedidos"
            );

        if (antiga) {
            antiga.remove();
        }

        const elemento =
            document.createElement("div");

        elemento.className =
            "mensagem-temporaria-pedidos " +
            (
                tipo
                    ? `mensagem-${tipo}`
                    : ""
            );

        elemento.textContent =
            mensagem;

        document.body.appendChild(
            elemento
        );

        setTimeout(function () {

            elemento.classList.add(
                "visivel"
            );

        }, 20);

        setTimeout(function () {

            elemento.classList.remove(
                "visivel"
            );

            setTimeout(function () {

                elemento.remove();

            }, 300);

        }, 3500);
    }

})();