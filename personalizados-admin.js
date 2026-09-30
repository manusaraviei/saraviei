/* =========================================================
   SARAVIEI — PERSONALIZADOS DO PAINEL ADMINISTRATIVO
   ========================================================= */

(function () {

    "use strict";


    /* =========================================================
       CONFIGURAÇÃO
       ========================================================= */

    const SUPABASE_URL =
        "https://gmimzvnuvraletepczrp.supabase.co";

    const SUPABASE_ANON_KEY =
        "sb_publishable_NtJmSYaKmuQuLY2QvfQKLQ_rFA8Ceqx";


    const STATUS_PERSONALIZADOS = [
        {
            valor: "novo",
            texto: "Novos"
        },
        {
            valor: "em_analise",
            texto: "Em análise"
        },
        {
            valor: "aguardando_informacoes",
            texto: "Aguardando informações"
        },
        {
            valor: "orcamento_enviado",
            texto: "Orçamento enviado"
        },
        {
            valor: "aprovado",
            texto: "Aprovados"
        },
        {
            valor: "em_producao",
            texto: "Em produção"
        },
        {
            valor: "finalizado",
            texto: "Finalizados"
        },
        {
            valor: "cancelado",
            texto: "Cancelados"
        }
    ];


    let supabaseClient = null;

    let personalizadosCarregados = [];

    let personalizadosFiltrados = [];

    let personalizadoSelecionado = null;

    let filtroAtual = "novo";

    let eventosConfigurados = false;

    let inicializado = false;


    /* =========================================================
       UTILITÁRIOS
       ========================================================= */

    function escaparHTML(valor) {

        if (
            valor === null ||
            valor === undefined
        ) {
            return "";
        }

        return String(valor)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function normalizarTexto(valor) {

        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }


    function formatarData(valor) {

        if (!valor) {
            return "Data não informada";
        }

        const data =
            new Date(valor);

        if (
            Number.isNaN(
                data.getTime()
            )
        ) {
            return "Data não informada";
        }

        return data.toLocaleDateString(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );
    }


    function obterTextoStatus(status) {

        const encontrado =
            STATUS_PERSONALIZADOS.find(
                function (item) {

                    return (
                        item.valor ===
                        status
                    );

                }
            );

        if (encontrado) {
            return encontrado.texto;
        }

        return "Novo";
    }


    function normalizarStatusPersonalizado(
        personalizado
    ) {

        const status =
            personalizado &&
            (
                personalizado.status ||
                ""
            );

        const normalizado =
            normalizarTexto(status);

        const encontrado =
            STATUS_PERSONALIZADOS.find(
                function (item) {

                    return (
                        item.valor ===
                        normalizado
                    );

                }
            );

        if (encontrado) {
            return encontrado.valor;
        }

        return "novo";
    }


    function obterNumeroPersonalizado(
        personalizado
    ) {

        const numero =
            personalizado &&
            (
                personalizado.request_number ||
                personalizado.numero ||
                personalizado.number
            );

        if (
            numero !== null &&
            numero !== undefined &&
            numero !== ""
        ) {

            return String(
                numero
            ).padStart(
                3,
                "0"
            );

        }

        const indice =
            personalizadosCarregados.indexOf(
                personalizado
            );

        if (indice >= 0) {

            return String(
                personalizadosCarregados.length -
                indice
            ).padStart(
                3,
                "0"
            );

        }

        return "000";
    }


    function obterNomeCliente(
        personalizado
    ) {

        return (
            personalizado.customer_name ||
            personalizado.nome_cliente ||
            personalizado.name ||
            "Cliente não informado"
        );
    }


    function obterWhatsapp(
        personalizado
    ) {

        return (
            personalizado.customer_whatsapp ||
            personalizado.whatsapp ||
            personalizado.customer_phone ||
            personalizado.phone ||
            "Não informado"
        );
    }


    function obterTitulo(
        personalizado
    ) {

        return (
            personalizado.title ||
            personalizado.titulo ||
            "Pedido personalizado"
        );
    }


    function obterDescricao(
        personalizado
    ) {

        return (
            personalizado.description ||
            personalizado.descricao ||
            "Nenhuma descrição informada."
        );
    }


    function obterTamanho(
        personalizado
    ) {

        const tamanho =
            String(
                personalizado.size ||
                personalizado.tamanho ||
                ""
            ).toLowerCase();

        if (tamanho === "pequeno") {
            return "Pequeno";
        }

        if (
            tamanho === "medio" ||
            tamanho === "médio"
        ) {
            return "Médio";
        }

        if (tamanho === "grande") {
            return "Grande";
        }

        return "Não informado";
    }


    function obterDetalhe(
        personalizado
    ) {

        return (
            personalizado.missing_detail ||
            personalizado.detalhe ||
            personalizado.detalhe_que_nao_pode_faltar ||
            "Nenhum detalhe adicional informado."
        );
    }


    function obterObservacoesInternas(
        personalizado
    ) {

        return (
            personalizado.internal_notes ||
            personalizado.observacoes_internas ||
            ""
        );
    }


    function obterReferencias(
        personalizado
    ) {

        const referencias =
            personalizado.reference_images;

        if (
            Array.isArray(
                referencias
            )
        ) {
            return referencias;
        }

        if (
            typeof referencias ===
            "string"
        ) {

            try {

                const convertidas =
                    JSON.parse(
                        referencias
                    );

                if (
                    Array.isArray(
                        convertidas
                    )
                ) {
                    return convertidas;
                }

            } catch (erro) {

                console.warn(
                    "Não foi possível interpretar as referências:",
                    erro
                );

            }

        }

        return [];
    }


    /* =========================================================
       SUPABASE
       ========================================================= */

    function aguardarSupabase() {

        return new Promise(
            function (resolve) {

                if (
                    window.supabase
                ) {

                    resolve();

                    return;
                }

                let tentativas = 0;

                const intervalo =
                    setInterval(
                        function () {

                            tentativas++;

                            if (
                                window.supabase
                            ) {

                                clearInterval(
                                    intervalo
                                );

                                resolve();

                                return;
                            }

                            if (
                                tentativas >= 100
                            ) {

                                clearInterval(
                                    intervalo
                                );

                                resolve();

                            }

                        },
                        100
                    );

            }
        );

    }


    /* =========================================================
       GARANTIR ÁREA
       ========================================================= */

    function obterSecao() {

        let secao =
            document.getElementById(
                "secao-personalizados"
            );

        if (secao) {
            return secao;
        }

        const conteudo =
            document.querySelector(
                ".conteudo-painel, .conteudo-admin"
            );

        if (!conteudo) {
            return null;
        }

        secao =
            document.createElement(
                "section"
            );

        secao.id =
            "secao-personalizados";

        secao.className =
            "secao-painel";

        secao.style.display =
            "none";

        conteudo.appendChild(
            secao
        );

        return secao;
    }


    function montarEstrutura() {

        const secao =
            obterSecao();

        if (!secao) {
            return null;
        }

        if (
            secao.dataset.personalizadosMontado ===
            "true"
        ) {
            return secao;
        }

        secao.dataset.personalizadosMontado =
            "true";

        secao.innerHTML = `

            <div class="cabecalho-pagina">

                <div>

                    <span class="eyebrow">
                        PERSONALIZADOS
                    </span>

                    <h1>
                        Ideias dos clientes
                    </h1>

                    <p>
                        Acompanhe e gerencie os projetos personalizados enviados pela loja.
                    </p>

                </div>

                <button
                    type="button"
                    class="botao-principal"
                    id="botao-atualizar-personalizados"
                >
                    Atualizar
                </button>

            </div>


            <div
                class="filtros-pedidos filtros-personalizados"
                id="filtros-personalizados"
            >

                ${STATUS_PERSONALIZADOS.map(
                    function (status) {

                        return `
                            <button
                                type="button"
                                class="filtro-pedido filtro-personalizado"
                                data-status="${escaparHTML(status.valor)}"
                            >
                                ${escaparHTML(status.texto)}
                            </button>
                        `;

                    }
                ).join("")}

            </div>


            <div
                class="contador-pedidos contador-personalizados"
                id="contador-personalizados"
            >
                Carregando solicitações...
            </div>


            <div
                id="personalizados-container"
                class="grade-pedidos grade-personalizados"
            >
                <div class="estado-carregando">
                    Carregando solicitações personalizadas...
                </div>
            </div>


            <div
                id="personalizado-detalhes"
                class="pedido-detalhes personalizado-detalhes"
                style="display: none;"
            ></div>

        `;

        return secao;
    }


    /* =========================================================
       CARREGAR PERSONALIZADOS
       ========================================================= */

    async function carregarPersonalizados() {

        const container =
            document.getElementById(
                "personalizados-container"
            );

        if (!container) {
            return;
        }

        container.innerHTML = `
            <div class="estado-carregando">
                Carregando solicitações personalizadas...
            </div>
        `;

        try {

            const resultado =
                await supabaseClient
                    .from(
                        "personalized_requests"
                    )
                    .select("*")
                    .order(
                        "request_number",
                        {
                            ascending: false
                        }
                    );

            if (
                resultado.error
            ) {
                throw resultado.error;
            }

            personalizadosCarregados =
                resultado.data || [];

            aplicarFiltroPersonalizados(
                filtroAtual
            );

        } catch (erro) {

            console.error(
                "Erro ao carregar personalizados:",
                erro
            );

            container.innerHTML = `
                <div class="estado-vazio">
                    <div class="estado-vazio-icone">
                        ⚠
                    </div>

                    <strong>
                        Não foi possível carregar os personalizados.
                    </strong>

                    <span>
                        ${escaparHTML(
                            erro.message ||
                            "Verifique a conexão com o Supabase."
                        )}
                    </span>
                </div>
            `;

            atualizarContadorPersonalizados(
                0
            );

        }

    }


    /* =========================================================
       FILTROS
       ========================================================= */

    function aplicarFiltroPersonalizados(
        status
    ) {

        filtroAtual =
            status || "novo";

        const detalhes =
            document.getElementById(
                "personalizado-detalhes"
            );

        const container =
            document.getElementById(
                "personalizados-container"
            );

        if (detalhes) {
            detalhes.style.display =
                "none";
        }

        if (container) {
            container.style.display =
                "grid";
        }

        personalizadosFiltrados =
            personalizadosCarregados.filter(
                function (personalizado) {

                    return (
                        normalizarStatusPersonalizado(
                            personalizado
                        ) ===
                        filtroAtual
                    );

                }
            );

        atualizarVisualDosFiltros();

        renderizarPersonalizados();

    }


    function atualizarVisualDosFiltros() {

        document
            .querySelectorAll(
                ".filtro-personalizado"
            )
            .forEach(
                function (botao) {

                    const status =
                        botao.dataset.status;

                    botao.classList.toggle(
                        "ativo",
                        status ===
                        filtroAtual
                    );

                }
            );

    }


    function atualizarContadorPersonalizados(
        quantidade
    ) {

        const contador =
            document.getElementById(
                "contador-personalizados"
            );

        if (!contador) {
            return;
        }

        contador.innerHTML = `
            <strong>
                ${quantidade}
            </strong>
            ${
                quantidade === 1
                    ? "solicitação encontrada"
                    : "solicitações encontradas"
            }
        `;

    }


    /* =========================================================
       RENDERIZAR CARDS
       ========================================================= */

    function renderizarPersonalizados() {

        const container =
            document.getElementById(
                "personalizados-container"
            );

        if (!container) {
            return;
        }

        atualizarContadorPersonalizados(
            personalizadosFiltrados.length
        );

        if (
            !personalizadosFiltrados.length
        ) {

            container.innerHTML = `
                <div class="estado-vazio">
                    <div class="estado-vazio-icone">
                        ✦
                    </div>

                    <strong>
                        Nenhuma solicitação neste status.
                    </strong>

                    <span>
                        Quando um cliente enviar uma nova ideia, ela aparecerá aqui.
                    </span>
                </div>
            `;

            return;
        }

        container.innerHTML =
            personalizadosFiltrados
                .map(
                    criarCardPersonalizado
                )
                .join("");

    }


    function criarCardPersonalizado(
        personalizado
    ) {

        const numero =
            obterNumeroPersonalizado(
                personalizado
            );

        const titulo =
            obterTitulo(
                personalizado
            );

        const nome =
            obterNomeCliente(
                personalizado
            );

        const status =
            normalizarStatusPersonalizado(
                personalizado
            );

        const textoStatus =
            obterTextoStatus(
                status
            );

        const data =
            formatarData(
                personalizado.created_at
            );

        const referencias =
            obterReferencias(
                personalizado
            );

        const primeiraReferencia =
            referencias.length
                ? (
                    referencias[0].url ||
                    referencias[0].publicUrl ||
                    ""
                )
                : "";

        const imagem =
            primeiraReferencia
                ? `
                    <img
                        src="${escaparHTML(primeiraReferencia)}"
                        alt="Referência do pedido personalizado"
                        class="personalizado-card-imagem"
                    >
                `
                : `
                    <div class="personalizado-card-placeholder">
                        ✦
                    </div>
                `;

        return `
            <article
                class="card-pedido card-personalizado"
                data-personalizado-id="${escaparHTML(
                    personalizado.id
                )}"
                tabindex="0"
            >

                <div class="card-pedido-cabecalho">

                    <div class="pedido-identificacao">

                        <strong>
                            #${escaparHTML(numero)}
                        </strong>

                    </div>

                    <span
                        class="status-pedido status-${escaparHTML(
                            normalizarTexto(status)
                        )}"
                    >
                        ${escaparHTML(textoStatus)}
                    </span>

                </div>


                <div class="personalizado-card-corpo">

                    <div class="personalizado-card-imagem-wrap">

                        ${imagem}

                    </div>


                    <div class="personalizado-card-info">

                        <strong>
                            ${escaparHTML(titulo)}
                        </strong>

                        <span>
                            ${escaparHTML(nome)}
                        </span>

                        <small>
                            ${escaparHTML(data)}
                        </small>

                    </div>

                </div>


                <div class="personalizado-card-rodape">

                    <span>
                        ${referencias.length}
                        ${
                            referencias.length === 1
                                ? "referência"
                                : "referências"
                        }
                    </span>

                    <span>
                        Ver detalhes →
                    </span>

                </div>

            </article>
        `;

    }


    /* =========================================================
       ABRIR DETALHES
       ========================================================= */

    function abrirPersonalizado(
        personalizadoId
    ) {

        const personalizado =
            personalizadosCarregados.find(
                function (item) {

                    return (
                        String(item.id) ===
                        String(personalizadoId)
                    );

                }
            );

        if (!personalizado) {
            return;
        }

        personalizadoSelecionado =
            personalizado;

        const container =
            document.getElementById(
                "personalizados-container"
            );

        const detalhes =
            document.getElementById(
                "personalizado-detalhes"
            );

        if (!detalhes) {
            return;
        }

        if (container) {
            container.style.display =
                "none";
        }

        detalhes.style.display =
            "block";

        renderizarDetalhesPersonalizado(
            personalizado
        );

    }


    /* =========================================================
       DETALHES
       ========================================================= */

    function renderizarDetalhesPersonalizado(
        personalizado
    ) {

        const numero =
            obterNumeroPersonalizado(
                personalizado
            );

        const nome =
            obterNomeCliente(
                personalizado
            );

        const whatsapp =
            obterWhatsapp(
                personalizado
            );

        const titulo =
            obterTitulo(
                personalizado
            );

        const descricao =
            obterDescricao(
                personalizado
            );

        const tamanho =
            obterTamanho(
                personalizado
            );

        const detalhe =
            obterDetalhe(
                personalizado
            );

        const observacoes =
            obterObservacoesInternas(
                personalizado
            );

        const status =
            normalizarStatusPersonalizado(
                personalizado
            );

        const referencias =
            obterReferencias(
                personalizado
            );

        const detalhes =
            document.getElementById(
                "personalizado-detalhes"
            );

        if (!detalhes) {
            return;
        }

        const referenciasHTML =
            referencias.length
                ? `
                    <div class="personalizado-referencias">

                        ${referencias.map(
                            function (referencia, indice) {

                                const url =
                                    referencia.url ||
                                    referencia.publicUrl ||
                                    "";

                                const nomeArquivo =
                                    referencia.nome ||
                                    referencia.name ||
                                    `Referência ${indice + 1}`;

                                if (!url) {
                                    return `
                                        <div class="personalizado-referencia-sem-url">
                                            ${escaparHTML(
                                                nomeArquivo
                                            )}
                                        </div>
                                    `;
                                }

                                return `
                                    <a
                                        href="${escaparHTML(url)}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="personalizado-referencia"
                                    >
                                        <img
                                            src="${escaparHTML(url)}"
                                            alt="${escaparHTML(
                                                nomeArquivo
                                            )}"
                                        >

                                        <span>
                                            Abrir imagem
                                        </span>
                                    </a>
                                `;

                            }
                        ).join("")}

                    </div>
                `
                : `
                    <div class="personalizado-sem-referencias">
                        O cliente não enviou imagens de referência.
                    </div>
                `;


        detalhes.innerHTML = `

            <div class="pedido-detalhes-cabecalho">

                <div>

                    <span class="label-pedido">
                        Personalizado
                    </span>

                    <h2>
                        #${escaparHTML(numero)}
                    </h2>

                </div>


                <button
                    type="button"
                    id="botao-fechar-personalizado"
                    class="botao-fechar-pedido"
                >
                    ×
                </button>

            </div>


            <div class="personalizado-status-topo">

                <span>
                    Status atual
                </span>

                <strong>
                    ${escaparHTML(
                        obterTextoStatus(status)
                    )}
                </strong>

            </div>


            <!-- CLIENTE -->

            <section class="pedido-bloco">

                <div class="pedido-bloco-titulo">
                    Cliente
                </div>

                <div class="pedido-dados-grid">

                    <div class="pedido-dado">

                        <span>
                            Nome
                        </span>

                        <strong>
                            ${escaparHTML(nome)}
                        </strong>

                    </div>


                    <div class="pedido-dado">

                        <span>
                            WhatsApp
                        </span>

                        <strong>
                            ${escaparHTML(whatsapp)}
                        </strong>

                    </div>

                </div>

            </section>


            <!-- PEDIDO -->

            <section class="pedido-bloco">

                <div class="pedido-bloco-titulo">
                    Pedido
                </div>

                <div class="personalizado-titulo-pedido">

                    ${escaparHTML(titulo)}

                </div>

            </section>


            <!-- DESCRIÇÃO -->

            <section class="pedido-bloco">

                <div class="pedido-bloco-titulo">
                    Descrição
                </div>

                <div class="personalizado-texto-longo">
                    ${escaparHTML(descricao)}
                </div>

            </section>


            <!-- REFERÊNCIAS -->

            <section class="pedido-bloco">

                <div class="pedido-bloco-titulo">
                    Referências
                </div>

                ${referenciasHTML}

            </section>


            <!-- TAMANHO -->

            <section class="pedido-bloco">

                <div class="pedido-bloco-titulo">
                    Tamanho
                </div>

                <div class="personalizado-tamanho">
                    ${escaparHTML(tamanho)}
                </div>

            </section>


            <!-- DETALHE -->

            <section class="pedido-bloco">

                <div class="pedido-bloco-titulo">
                    Detalhe que não pode faltar
                </div>

                <div class="personalizado-texto-longo">
                    ${escaparHTML(detalhe)}
                </div>

            </section>


            <!-- OBSERVAÇÕES INTERNAS -->

            <section class="pedido-bloco personalizado-bloco-interno">

                <div class="pedido-bloco-titulo">
                    Observações internas
                </div>

                <textarea
                    id="personalizado-observacoes"
                    class="personalizado-observacoes"
                    placeholder="Anotações internas sobre este projeto..."
                >${escaparHTML(observacoes)}</textarea>

            </section>


            <!-- STATUS -->

            <section class="pedido-bloco personalizado-bloco-status">

                <div class="pedido-bloco-titulo">
                    Atualizar status
                </div>

                <select
                    id="personalizado-status"
                    class="select-principal"
                >

                    ${STATUS_PERSONALIZADOS.map(
                        function (item) {

                            return `
                                <option
                                    value="${escaparHTML(
                                        item.valor
                                    )}"
                                    ${
                                        item.valor === status
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ${escaparHTML(
                                        item.texto
                                    )}
                                </option>
                            `;

                        }
                    ).join("")}

                </select>


                <div class="acoes-formulario personalizado-acoes">

                    <button
                        type="button"
                        class="botao-secundario"
                        id="botao-voltar-personalizados"
                    >
                        Voltar
                    </button>

                    <button
                        type="button"
                        class="botao-principal"
                        id="botao-salvar-status-personalizado"
                    >
                        Salvar alterações
                    </button>

                </div>


                <p
                    id="mensagem-personalizado"
                    class="mensagem-produto"
                ></p>

            </section>

        `;

    }


    /* =========================================================
       FECHAR DETALHES
       ========================================================= */

    function fecharDetalhesPersonalizado() {

        personalizadoSelecionado =
            null;

        const detalhes =
            document.getElementById(
                "personalizado-detalhes"
            );

        const container =
            document.getElementById(
                "personalizados-container"
            );

        if (detalhes) {
            detalhes.style.display =
                "none";
        }

        if (container) {
            container.style.display =
                "grid";
        }

        renderizarPersonalizados();

    }


    /* =========================================================
       SALVAR STATUS
       ========================================================= */

    async function salvarStatusPersonalizado() {

        if (
            !personalizadoSelecionado
        ) {
            return;
        }

        const select =
            document.getElementById(
                "personalizado-status"
            );

        const observacoes =
            document.getElementById(
                "personalizado-observacoes"
            );

        const mensagem =
            document.getElementById(
                "mensagem-personalizado"
            );

        const botao =
            document.getElementById(
                "botao-salvar-status-personalizado"
            );

        if (!select) {
            return;
        }

        const novoStatus =
            select.value;

        const novasObservacoes =
            observacoes
                ? observacoes.value.trim()
                : "";

        if (mensagem) {

            mensagem.textContent =
                "Salvando...";

        }

        if (botao) {
            botao.disabled = true;
        }

        try {

            const resultado =
                await supabaseClient
                    .from(
                        "personalized_requests"
                    )
                    .update({
                        status:
                            novoStatus,

                        internal_notes:
                            novasObservacoes,

                        updated_at:
                            new Date().toISOString()
                    })
                    .eq(
                        "id",
                        personalizadoSelecionado.id
                    );

            if (
                resultado.error
            ) {
                throw resultado.error;
            }

            personalizadoSelecionado.status =
                novoStatus;

            personalizadoSelecionado.internal_notes =
                novasObservacoes;

            const indice =
                personalizadosCarregados.findIndex(
                    function (item) {

                        return (
                            String(item.id) ===
                            String(
                                personalizadoSelecionado.id
                            )
                        );

                    }
                );

            if (indice >= 0) {

                personalizadosCarregados[
                    indice
                ] =
                    personalizadoSelecionado;

            }

            fecharDetalhesPersonalizado();

        } catch (erro) {

            console.error(
                "Erro ao salvar personalizado:",
                erro
            );

            if (mensagem) {

                mensagem.textContent =
                    erro.message ||
                    "Não foi possível salvar as alterações.";

            }

        } finally {

            if (botao) {
                botao.disabled = false;
            }

        }

    }


    /* =========================================================
       EVENTOS
       ========================================================= */

    function configurarEventos() {

        if (eventosConfigurados) {
            return;
        }

        eventosConfigurados =
            true;


        document.addEventListener(
            "click",
            function (evento) {

                const filtro =
                    evento.target.closest(
                        ".filtro-personalizado"
                    );

                if (filtro) {

                    evento.preventDefault();

                    aplicarFiltroPersonalizados(
                        filtro.dataset.status
                    );

                    return;
                }


                const card =
                    evento.target.closest(
                        "#personalizados-container .card-personalizado"
                    );

                if (card) {

                    const id =
                        card.dataset.personalizadoId;

                    if (id) {

                        abrirPersonalizado(
                            id
                        );

                    }

                    return;
                }


                const fechar =
                    evento.target.closest(
                        "#botao-fechar-personalizado"
                    );

                if (fechar) {

                    evento.preventDefault();

                    fecharDetalhesPersonalizado();

                    return;
                }


                const voltar =
                    evento.target.closest(
                        "#botao-voltar-personalizados"
                    );

                if (voltar) {

                    evento.preventDefault();

                    fecharDetalhesPersonalizado();

                    return;
                }


                const salvar =
                    evento.target.closest(
                        "#botao-salvar-status-personalizado"
                    );

                if (salvar) {

                    evento.preventDefault();

                    salvarStatusPersonalizado();

                    return;
                }


                const atualizar =
                    evento.target.closest(
                        "#botao-atualizar-personalizados"
                    );

                if (atualizar) {

                    evento.preventDefault();

                    carregarPersonalizados();

                }

            }
        );

    }


    /* =========================================================
       NAVEGAÇÃO DO PAINEL
       ========================================================= */

    function configurarNavegacao() {

        document.addEventListener(
            "click",
            function (evento) {

                const menu =
                    evento.target.closest(
                        '.botao-menu[data-destino="personalizados"]'
                    );

                if (!menu) {
                    return;
                }

                setTimeout(
                    function () {

                        montarEstrutura();

                        carregarPersonalizados();

                    },
                    100
                );

            }
        );

    }


    /* =========================================================
       INICIALIZAÇÃO
       ========================================================= */

    async function iniciar() {

        if (inicializado) {
            return;
        }

        inicializado =
            true;

        await aguardarSupabase();

        if (
            !window.supabase
        ) {

            console.error(
                "Supabase não foi carregado."
            );

            return;
        }

        supabaseClient =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY
            );

        configurarEventos();

        configurarNavegacao();

        const secao =
            document.getElementById(
                "secao-personalizados"
            );

        if (
            secao &&
            (
                secao.classList.contains(
                    "ativa"
                ) ||
                secao.style.display !==
                    "none"
            )
        ) {

            montarEstrutura();

            carregarPersonalizados();

        }

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            iniciar
        );

    } else {

        iniciar();

    }

})();