const SUPABASE_URL =
    "https://gmimzvnuvraletepczrp.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_NtJmSYaKmuQuLY2QvfQKLQ_rFA8Ceqx";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


const listaProdutos =
    document.getElementById(
        "listaProdutos"
    );


const botaoSalvar =
    document.getElementById(
        "botaoSalvar"
    );


const mensagem =
    document.getElementById(
        "mensagem"
    );


const botaoVoltar =
    document.getElementById(
        "botaoVoltar"
    );


let produtos =
    [];


/* =========================================
   MENSAGEM
========================================= */

function mostrarMensagem(
    texto,
    tipo
) {

    mensagem.textContent =
        texto;

    mensagem.className =
        "mensagem " +
        tipo;


    setTimeout(
        function() {

            mensagem.textContent =
                "";

            mensagem.className =
                "mensagem";

        },
        4000
    );

}


/* =========================================
   SESSÃO
========================================= */

async function verificarSessao() {

    const {
        data,
        error
    } =
        await supabaseClient.auth.getSession();


    if (error) {

        console.error(
            error
        );

        window.location.href =
            "admin-login.html";

        return null;

    }


    const sessao =
        data.session;


    if (!sessao) {

        window.location.href =
            "admin-login.html";

        return null;

    }


    return sessao;

}


/* =========================================
   PRODUTOS
========================================= */

async function carregarProdutos() {

    listaProdutos.innerHTML = `
        <div class="carregando">
            Carregando produtos...
        </div>
    `;


    const {
        data,
        error
    } =
        await supabaseClient
            .from("products")
            .select(
                `
                    id,
                    nome,
                    preco,
                    preco_promocional,
                    imagem_url,
                    ativo,
                    mostrar_na_home,
                    ordem_home
                `
            )
            .order(
                "nome",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Erro ao carregar produtos:",
            error
        );


        listaProdutos.innerHTML = `
            <div class="vazio">
                Não foi possível carregar os produtos.
            </div>
        `;


        mostrarMensagem(
            "Erro ao carregar os produtos.",
            "erro"
        );

        return;

    }


    produtos =
        Array.isArray(data)
            ? data
            : [];


    if (
        produtos.length === 0
    ) {

        listaProdutos.innerHTML = `
            <div class="vazio">
                Nenhum produto cadastrado.
            </div>
        `;

        return;

    }


    renderizarProdutos();

}


/* =========================================
   RENDER
========================================= */

function renderizarProdutos() {

    listaProdutos.innerHTML =
        "";


    produtos.forEach(
        function(produto) {

            const linha =
                document.createElement(
                    "div"
                );


            linha.className =
                "produto-admin";


            const imagem =
                produto.imagem_url;


            const preco =
                Number(
                    produto.preco_promocional
                ) > 0
                    ? produto.preco_promocional
                    : produto.preco;


            const checkbox =
                Boolean(
                    produto.mostrar_na_home
                );


            const ordem =
                Number(
                    produto.ordem_home
                ) || 0;


            linha.innerHTML = `

                <div class="produto-thumb">

                    ${
                        imagem
                            ? `
                                <img
                                    src="${escaparHTML(imagem)}"
                                    alt="${escaparHTML(produto.nome || "Produto")}"
                                >
                            `
                            : `
                                <div class="produto-thumb-sem-imagem">
                                    ✦
                                </div>
                            `
                    }

                </div>


                <div>

                    <div class="produto-nome">
                        ${escaparHTML(
                            produto.nome ||
                            "Produto sem nome"
                        )}
                    </div>

                    <div class="produto-colecao">
                        ${
                            produto.ativo
                                ? "PRODUTO ATIVO"
                                : "PRODUTO INATIVO"
                        }
                    </div>

                </div>


                <div class="produto-preco">

                    ${formatarPreco(preco)}

                </div>


                <div class="home-controle">

                    <label>

                        <input
                            type="checkbox"
                            class="home-checkbox"
                            data-id="${produto.id}"
                            ${checkbox ? "checked" : ""}
                        >

                        Home

                    </label>


                    <input
                        type="number"
                        class="ordem-home"
                        min="0"
                        step="1"
                        value="${ordem}"
                        data-id="${produto.id}"
                        ${checkbox ? "" : "disabled"}
                        title="Ordem na página inicial"
                    >

                </div>

            `;


            listaProdutos.appendChild(
                linha
            );

        }
    );


    configurarControles();

}


/* =========================================
   CONTROLES
========================================= */

function configurarControles() {

    const checkboxes =
        document.querySelectorAll(
            ".home-checkbox"
        );


    checkboxes.forEach(
        function(checkbox) {

            checkbox.addEventListener(
                "change",
                function() {

                    const id =
                        checkbox.dataset.id;


                    const campoOrdem =
                        document.querySelector(
                            `.ordem-home[data-id="${id}"]`
                        );


                    if (!campoOrdem) {
                        return;
                    }


                    campoOrdem.disabled =
                        !checkbox.checked;


                    if (
                        checkbox.checked &&
                        Number(
                            campoOrdem.value
                        ) <= 0
                    ) {

                        campoOrdem.value =
                            descobrirProximaOrdem();

                    }

                }
            );

        }
    );

}


/* =========================================
   PRÓXIMA ORDEM
========================================= */

function descobrirProximaOrdem() {

    const ordens =
        produtos
            .filter(
                function(produto) {

                    return Boolean(
                        produto.mostrar_na_home
                    );

                }
            )
            .map(
                function(produto) {

                    return Number(
                        produto.ordem_home
                    ) || 0;

                }
            )
            .filter(
                function(ordem) {

                    return ordem > 0;

                }
            );


    if (
        ordens.length === 0
    ) {

        return 1;

    }


    return (
        Math.max(
            ...ordens
        ) + 1
    );

}


/* =========================================
   SALVAR
========================================= */

async function salvarDestaques() {

    botaoSalvar.disabled =
        true;

    botaoSalvar.textContent =
        "Salvando...";


    try {

        const checkboxes =
            document.querySelectorAll(
                ".home-checkbox"
            );


        const atualizacoes =
            [];


        checkboxes.forEach(
            function(checkbox) {

                const id =
                    checkbox.dataset.id;


                const campoOrdem =
                    document.querySelector(
                        `.ordem-home[data-id="${id}"]`
                    );


                let ordem =
                    Number(
                        campoOrdem?.value
                    );


                if (
                    !Number.isFinite(
                        ordem
                    ) ||
                    ordem < 0
                ) {

                    ordem = 0;

                }


                if (
                    !checkbox.checked
                ) {

                    ordem = 0;

                }


                atualizacoes.push({

                    id:
                        id,

                    mostrar_na_home:
                        checkbox.checked,

                    ordem_home:
                        Math.floor(
                            ordem
                        )

                });

            }
        );


        for (
            const item
            of atualizacoes
        ) {

            const {
                error
            } =
                await supabaseClient
                    .from("products")
                    .update({

                        mostrar_na_home:
                            item.mostrar_na_home,

                        ordem_home:
                            item.ordem_home

                    })
                    .eq(
                        "id",
                        item.id
                    );


            if (error) {

                throw error;

            }

        }


        atualizarProdutosLocais(
            atualizacoes
        );


        mostrarMensagem(
            "Destaques da página inicial salvos com sucesso.",
            "sucesso"
        );


    } catch (error) {

        console.error(
            "Erro ao salvar destaques:",
            error
        );


        mostrarMensagem(
            "Não foi possível salvar os destaques.",
            "erro"
        );

    } finally {

        botaoSalvar.disabled =
            false;

        botaoSalvar.textContent =
            "Salvar destaques";

    }

}


/* =========================================
   ATUALIZAR MEMÓRIA
========================================= */

function atualizarProdutosLocais(
    atualizacoes
) {

    atualizacoes.forEach(
        function(atualizacao) {

            const produto =
                produtos.find(
                    function(item) {

                        return (
                            String(
                                item.id
                            ) ===
                            String(
                                atualizacao.id
                            )
                        );

                    }
                );


            if (!produto) {
                return;
            }


            produto.mostrar_na_home =
                atualizacao.mostrar_na_home;


            produto.ordem_home =
                atualizacao.ordem_home;

        }
    );

}


/* =========================================
   FORMATAÇÃO
========================================= */

function formatarPreco(
    valor
) {

    const numero =
        Number(valor);


    if (
        !Number.isFinite(
            numero
        )
    ) {

        return "R$ 0,00";

    }


    return numero.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

}


/* =========================================
   HTML SEGURO
========================================= */

function escaparHTML(
    valor
) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "";

    }


    return String(valor)
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


/* =========================================
   VOLTAR
========================================= */

botaoVoltar.addEventListener(
    "click",
    function() {

        window.location.href =
            "admin.html";

    }
);


/* =========================================
   SALVAR
========================================= */

botaoSalvar.addEventListener(
    "click",
    salvarDestaques
);


/* =========================================
   INICIALIZAÇÃO
========================================= */

async function iniciar() {

    const sessao =
        await verificarSessao();


    if (!sessao) {
        return;
    }


    await carregarProdutos();

}


iniciar();