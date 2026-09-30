const SUPABASE_URL = "https://gmimzvnuvraletepczrp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NtJmSYaKmuQuLY2QvfQKLQ_rFA8Ceqx";

let clienteSupabase = null;
let produtos = [];
let colecoes = [];
let relacoesProdutosColecoes = [];
let filtroColecaoAtual = "";
let produtoEmEdicao = null;


// ============================================================
// INICIALIZAÇÃO
// ============================================================

function esperarSupabase() {
    return new Promise((resolve) => {
        if (window.supabase) {
            resolve();
            return;
        }

        const intervalo = setInterval(() => {
            if (window.supabase) {
                clearInterval(intervalo);
                resolve();
            }
        }, 100);

        setTimeout(() => {
            clearInterval(intervalo);
            resolve();
        }, 10000);
    });
}


async function inicializar() {
    await esperarSupabase();

    if (!window.supabase) {
        alert("Não foi possível carregar o Supabase. Recarregue a página.");
        return;
    }

    clienteSupabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );

    configurarNavegacao();
    configurarBotoesProdutos();
    configurarBotoesColecoes();
    configurarPaginaInicial();
    configurarBotaoSair();
    configurarPreviewImagem();
    configurarVariacoesProduto();

    await verificarSessao();
    await carregarColecoes();
    await carregarProdutos();

    mostrarSecao("dashboard");
}


// ============================================================
// UTILITÁRIOS
// ============================================================

function escaparHTML(valor) {
    if (valor === null || valor === undefined) {
        return "";
    }

    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function gerarSlug(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}


function converterNumero(valor) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return null;
    }

    if (typeof valor === "number") {
        return Number.isFinite(valor)
            ? valor
            : null;
    }

    let texto = String(valor).trim();

    if (!texto) {
        return null;
    }

    texto = texto.replace(/\s/g, "");

    if (
        texto.includes(",") &&
        texto.includes(".")
    ) {
        texto = texto
            .replace(/\./g, "")
            .replace(",", ".");
    } else if (texto.includes(",")) {
        texto = texto.replace(",", ".");
    }

    const numero = Number(texto);

    return Number.isFinite(numero)
        ? numero
        : null;
}


function formatarPreco(valor) {
    const numero = converterNumero(valor);

    if (numero === null) {
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


function elemento(id) {
    return document.getElementById(id);
}


/*
 * Gera um UUID para produtos novos.
 *
 * Isso permite que o produto tenha seu ID definido
 * antes de enviarmos a imagem para o Storage.
 */
function gerarIdProduto() {
    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {
        return window.crypto.randomUUID();
    }

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (caractere) {
            const numero =
                Math.random() * 16 | 0;

            const valor =
                caractere === "x"
                    ? numero
                    : (numero & 0x3) | 0x8;

            return valor.toString(16);
        }
    );
}


// ============================================================
// MENSAGENS
// ============================================================

function mostrarMensagem(texto, tipo = "info") {
    const elementos = [
        elemento("mensagem-produto"),
        elemento("mensagem-home")
    ];

    const alvo = elementos.find(
        (item) => item
    );

    if (!alvo) {
        console.log(texto);
        return;
    }

    alvo.textContent = texto;
    alvo.style.display = "block";

    if (tipo === "erro") {
        alvo.style.color = "#b42318";
    } else if (tipo === "sucesso") {
        alvo.style.color = "#027a48";
    } else {
        alvo.style.color = "";
    }

    clearTimeout(alvo._timerMensagem);

    alvo._timerMensagem = setTimeout(() => {
        alvo.style.display = "none";
    }, 5000);
}


// ============================================================
// NAVEGAÇÃO
// ============================================================

function obterTodasAsSecoesAdmin() {
    const encontrados = new Set();

    document.querySelectorAll(
        '[id^="secao-"]'
    ).forEach((item) => {
        encontrados.add(item);
    });

    document.querySelectorAll(
        ".secao-admin"
    ).forEach((item) => {
        encontrados.add(item);
    });

    document.querySelectorAll(
        ".secao-painel"
    ).forEach((item) => {
        encontrados.add(item);
    });

    document.querySelectorAll(
        "main > section"
    ).forEach((item) => {
        encontrados.add(item);
    });

    return Array.from(encontrados);
}


function esconderTodasAsSecoes() {
    const secoes = obterTodasAsSecoesAdmin();

    secoes.forEach((secao) => {
        secao.hidden = true;

        secao.style.setProperty(
            "display",
            "none",
            "important"
        );

        secao.style.setProperty(
            "visibility",
            "hidden",
            "important"
        );
    });
}


function encontrarSecao(nome) {
    const possibilidades = [
        `secao-${nome}`,
        nome
    ];

    for (const id of possibilidades) {
        const encontrada =
            document.getElementById(id);

        if (encontrada) {
            return encontrada;
        }
    }

    const porData =
        document.querySelector(
            `[data-secao="${nome}"]`
        );

    if (porData) {
        return porData;
    }

    return null;
}


function mostrarSecao(nome) {
    esconderTodasAsSecoes();

    const secao =
        encontrarSecao(nome);

    if (!secao) {
        console.warn(
            "Seção não encontrada:",
            nome
        );
        return;
    }

    secao.hidden = false;

    secao.style.setProperty(
        "display",
        "block",
        "important"
    );

    secao.style.setProperty(
        "visibility",
        "visible",
        "important"
    );

    document.querySelectorAll(
        ".botao-menu"
    ).forEach((botao) => {
        botao.classList.remove("ativo");
    });

    const botaoAtivo =
        document.querySelector(
            `.botao-menu[data-destino="${nome}"]`
        );

    if (botaoAtivo) {
        botaoAtivo.classList.add("ativo");
    }

    if (nome === "dashboard") {
        atualizarDashboard();
    }

    if (nome === "produtos") {
        carregarProdutos();
    }

    if (nome === "colecoes") {
        carregarColecoes();
    }

    if (nome === "pagina-inicial") {
        carregarProdutosHome();
    }
}


function configurarNavegacao() {
    document.addEventListener(
        "click",
        (evento) => {
            const botao =
                evento.target.closest(
                    ".botao-menu[data-destino]"
                );

            if (!botao) {
                return;
            }

            evento.preventDefault();
            evento.stopPropagation();
            evento.stopImmediatePropagation();

            const destino =
                botao.dataset.destino;

            mostrarSecao(destino);
        },
        true
    );

    document.addEventListener(
        "click",
        (evento) => {
            const atalho =
                evento.target.closest(
                    "[data-atalho]"
                );

            if (!atalho) {
                return;
            }

            evento.preventDefault();

            mostrarSecao(
                atalho.dataset.atalho
            );
        }
    );
}


// ============================================================
// SESSÃO
// ============================================================

async function verificarSessao() {
    if (!clienteSupabase) {
        return;
    }

    try {
        const {
            data,
            error
        } =
            await clienteSupabase.auth.getSession();

        if (error) {
            console.warn(
                "Erro ao verificar sessão:",
                error
            );
            return;
        }

        if (data?.session) {
            window.usuarioAdminAtual =
                data.session.user;
        }

    } catch (erro) {
        console.warn(
            "Erro ao verificar sessão:",
            erro
        );
    }
}


// ============================================================
// COLEÇÕES
// ============================================================

async function carregarColecoes() {
    if (!clienteSupabase) {
        return;
    }

    const lista =
        elemento("lista-colecoes");

    try {
        const {
            data,
            error
        } =
            await clienteSupabase
                .from("collections")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );

        if (error) {
            console.error(
                "Erro ao carregar coleções:",
                error
            );

            if (lista) {
                lista.innerHTML = `
                    <div class="mensagem-vazia">
                        Não foi possível carregar as categorias.
                        <br>
                        <small>
                            ${escaparHTML(error.message)}
                        </small>
                    </div>
                `;
            }

            return;
        }

        colecoes = data || [];

        renderizarColecoes();
        preencherFiltroColecoes();

        preencherSeletorColecoes(
            produtoEmEdicao
                ? obterColecoesDoProduto(
                    produtoEmEdicao.id
                )
                : []
        );

        atualizarDashboard();

    } catch (erro) {
        console.error(
            "Erro ao carregar coleções:",
            erro
        );
    }
}


function renderizarColecoes() {
    const lista =
        elemento("lista-colecoes");

    if (!lista) {
        return;
    }

    if (!colecoes.length) {
        lista.innerHTML = `
            <div class="mensagem-vazia">
                Nenhuma categoria cadastrada.
            </div>
        `;
        return;
    }

    lista.innerHTML =
        colecoes.map(
            (colecao) => {
                const nome =
                    colecao.nome ||
                    colecao.name ||
                    "Sem nome";

                const quantidadeProdutos =
                    relacoesProdutosColecoes.filter(
                        (relacao) =>
                            String(
                                relacao.collection_id
                            ) ===
                            String(colecao.id)
                    ).length;

                return `
                    <div
                        class="colecao-item"
                        data-id="${escaparHTML(colecao.id)}"
                    >
                        <div>
                            <strong>
                                ${escaparHTML(nome)}
                            </strong>

                            <small
                                style="
                                    display:block;
                                    margin-top:4px;
                                    opacity:.7;
                                "
                            >
                                ${quantidadeProdutos}
                                ${
                                    quantidadeProdutos === 1
                                        ? "produto"
                                        : "produtos"
                                }
                            </small>
                        </div>

                        <div class="acoes-colecao">
                            <button
                                type="button"
                                class="botao-editar-colecao"
                                data-id="${escaparHTML(colecao.id)}"
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="botao-excluir-colecao"
                                data-id="${escaparHTML(colecao.id)}"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                `;
            }
        ).join("");
}


function preencherFiltroColecoes() {
    const filtro =
        elemento("filtro-colecoes");

    if (!filtro) {
        return;
    }

    const valorAtual =
        filtro.value;

    filtro.innerHTML = `
        <option value="">
            Todas as categorias
        </option>

        ${colecoes.map(
            (colecao) => {
                const nome =
                    colecao.nome ||
                    colecao.name ||
                    "Sem nome";

                return `
                    <option
                        value="${escaparHTML(colecao.id)}"
                    >
                        ${escaparHTML(nome)}
                    </option>
                `;
            }
        ).join("")}
    `;

    filtro.value = valorAtual;
}


function preencherSeletorColecoes(
    selecionadas = []
) {
    const container =
        elemento("produto-colecoes");

    if (!container) {
        return;
    }

    if (!colecoes.length) {
        container.innerHTML = `
            <div class="mensagem-vazia">
                Nenhuma categoria cadastrada.
            </div>
        `;
        return;
    }

    const selecionadasNormalizadas =
        selecionadas.map(String);

    container.innerHTML =
        colecoes.map(
            (colecao) => {
                const id =
                    String(colecao.id);

                const nome =
                    colecao.nome ||
                    colecao.name ||
                    "Sem nome";

                const marcado =
                    selecionadasNormalizadas.includes(
                        id
                    );

                return `
                    <label
                        style="
                            display:flex;
                            align-items:center;
                            gap:8px;
                            margin-bottom:8px;
                            cursor:pointer;
                        "
                    >
                        <input
                            type="checkbox"
                            name="produto-colecao"
                            value="${escaparHTML(id)}"
                            ${marcado ? "checked" : ""}
                        >

                        <span>
                            ${escaparHTML(nome)}
                        </span>
                    </label>
                `;
            }
        ).join("");
}


// ============================================================
// RELAÇÕES PRODUTO X COLEÇÃO
// ============================================================

async function carregarRelacoesProdutosColecoes() {
    if (!clienteSupabase) {
        return;
    }

    try {
        const {
            data,
            error
        } =
            await clienteSupabase
                .from("product_collections")
                .select("*");

        if (error) {
            console.error(
                "Erro ao carregar relações produto/coleção:",
                error
            );

            relacoesProdutosColecoes = [];

            return;
        }

        relacoesProdutosColecoes =
            data || [];

    } catch (erro) {
        console.error(
            "Erro ao carregar relações:",
            erro
        );

        relacoesProdutosColecoes = [];
    }
}


async function sincronizarRelacoesLegadas() {
    if (!clienteSupabase) {
        return;
    }

    const relacoesExistentes =
        new Set(
            relacoesProdutosColecoes.map(
                (relacao) =>
                    `${String(relacao.product_id)}::${String(relacao.collection_id)}`
            )
        );

    const relacoesParaCriar = [];

    produtos.forEach((produto) => {
        if (
            produto.collection_id === null ||
            produto.collection_id === undefined ||
            produto.collection_id === ""
        ) {
            return;
        }

        const chave =
            `${String(produto.id)}::${String(produto.collection_id)}`;

        if (!relacoesExistentes.has(chave)) {
            relacoesParaCriar.push({
                product_id:
                    produto.id,
                collection_id:
                    produto.collection_id
            });
        }
    });

    if (!relacoesParaCriar.length) {
        return;
    }

    const {
        error
    } =
        await clienteSupabase
            .from("product_collections")
            .insert(
                relacoesParaCriar
            );

    if (error) {
        console.error(
            "Não foi possível sincronizar as relações antigas:",
            error
        );

        return;
    }

    relacoesProdutosColecoes =
        relacoesProdutosColecoes.concat(
            relacoesParaCriar
        );
}


function obterColecoesDoProduto(
    produtoId
) {
    const ids =
        relacoesProdutosColecoes
            .filter(
                (relacao) =>
                    String(
                        relacao.product_id
                    ) ===
                    String(produtoId)
            )
            .map(
                (relacao) =>
                    String(
                        relacao.collection_id
                    )
            );

    if (!ids.length) {
        const produto =
            produtos.find(
                (item) =>
                    String(item.id) ===
                    String(produtoId)
            );

        if (
            produto &&
            produto.collection_id
        ) {
            ids.push(
                String(
                    produto.collection_id
                )
            );
        }
    }

    return [
        ...new Set(ids)
    ];
}


function obterNomesColecoesDoProduto(
    produtoId
) {
    const ids =
        obterColecoesDoProduto(
            produtoId
        );

    return ids
        .map(
            (id) => {
                const colecao =
                    colecoes.find(
                        (item) =>
                            String(
                                item.id
                            ) ===
                            String(id)
                    );

                if (!colecao) {
                    return "";
                }

                return (
                    colecao.nome ||
                    colecao.name ||
                    ""
                );
            }
        )
        .filter(Boolean);
}


// ============================================================
// PRODUTOS
// ============================================================

async function carregarProdutos() {
    if (!clienteSupabase) {
        return;
    }

    const container =
        elemento("produtos-container");

    if (container) {
        container.innerHTML = `
            <div class="mensagem-vazia">
                Carregando produtos...
            </div>
        `;
    }

    try {
        const {
            data,
            error
        } =
            await clienteSupabase
                .from("products")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            console.error(
                "Erro ao carregar produtos:",
                error
            );

            if (container) {
                container.innerHTML = `
                    <div class="mensagem-vazia">
                        Não foi possível carregar os produtos.
                        <br>
                        <small>
                            ${escaparHTML(error.message)}
                        </small>
                    </div>
                `;
            }

            return;
        }

        produtos = data || [];

        await carregarRelacoesProdutosColecoes();

        await sincronizarRelacoesLegadas();

        renderizarProdutos();
        renderizarColecoes();
        atualizarDashboard();

    } catch (erro) {
        console.error(
            "Erro ao carregar produtos:",
            erro
        );

        if (container) {
            container.innerHTML = `
                <div class="mensagem-vazia">
                    Ocorreu um erro ao carregar os produtos.
                    <br>
                    <small>
                        ${escaparHTML(
                            erro?.message || ""
                        )}
                    </small>
                </div>
            `;
        }
    }
}


function renderizarProdutos() {
    const container =
        elemento("produtos-container");

    if (!container) {
        return;
    }

    let produtosExibidos =
        produtos;

    if (filtroColecaoAtual) {
        produtosExibidos =
            produtos.filter(
                (produto) =>
                    obterColecoesDoProduto(
                        produto.id
                    ).includes(
                        String(
                            filtroColecaoAtual
                        )
                    )
            );
    }

    if (!produtosExibidos.length) {
        container.innerHTML = `
            <div class="mensagem-vazia">
                Nenhum produto encontrado.
            </div>
        `;
        return;
    }

    container.innerHTML =
        produtosExibidos.map(
            (produto) => {
                const imagem =
                    produto.imagem_url ||
                    produto.imagem ||
                    produto.image_url ||
                    produto.foto_url ||
                    produto.image ||
                    produto.foto ||
                    "";

                const nomesColecoes =
                    obterNomesColecoesDoProduto(
                        produto.id
                    );

                const ativo =
                    produto.ativo !== false;

                const destaque =
                    produto.destaque === true;

                const esgotado =
                    produto.esgotado === true;

                return `
                    <div
                        class="produto-admin-item"
                    >
                        <div
                            class="produto-admin-imagem"
                        >
                            ${
                                imagem
                                    ? `
                                        <img
                                            src="${escaparHTML(imagem)}"
                                            alt="${escaparHTML(
                                                produto.nome ||
                                                "Produto"
                                            )}"
                                        >
                                    `
                                    : `
                                        <div class="sem-imagem">
                                            Sem imagem
                                        </div>
                                    `
                            }
                        </div>

                        <div
                            class="produto-admin-info"
                        >
                            <h3>
                                ${escaparHTML(
                                    produto.nome ||
                                    "Sem nome"
                                )}
                            </h3>

                            <div
                                class="produto-admin-preco"
                            >
                                ${formatarPreco(
                                    produto.preco
                                )}
                            </div>

                            ${
                                produto.preco_promocional
                                    ? `
                                        <div
                                            class="produto-admin-promocional"
                                        >
                                            Promoção:
                                            ${formatarPreco(
                                                produto.preco_promocional
                                            )}
                                        </div>
                                    `
                                    : ""
                            }

                            <div
                                class="produto-admin-status"
                            >
                                <span>
                                    ${
                                        ativo
                                            ? "Ativo"
                                            : "Inativo"
                                    }
                                </span>

                                ${
                                    esgotado
                                        ? `
                                            <span>
                                                Esgotado
                                            </span>
                                        `
                                        : ""
                                }

                                ${
                                    destaque
                                        ? `
                                            <span>
                                                Em destaque
                                            </span>
                                        `
                                        : ""
                                }
                            </div>

                            ${
                                nomesColecoes.length
                                    ? `
                                        <div
                                            class="produto-admin-categorias"
                                        >
                                            ${nomesColecoes
                                                .map(
                                                    (nome) =>
                                                        `
                                                            <span>
                                                                ${escaparHTML(nome)}
                                                            </span>
                                                        `
                                                )
                                                .join("")}
                                        </div>
                                    `
                                    : `
                                        <div
                                            class="produto-admin-categorias"
                                        >
                                            <span>
                                                Sem categoria
                                            </span>
                                        </div>
                                    `
                            }
                        </div>

                        <div
                            class="produto-admin-acoes"
                        >
                            <button
                                type="button"
                                class="botao-editar-produto"
                                data-id="${escaparHTML(produto.id)}"
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="botao-excluir-produto"
                                data-id="${escaparHTML(produto.id)}"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                `;
            }
        ).join("");
}


// ============================================================
// FORMULÁRIO DE PRODUTO
// ============================================================

async function abrirFormularioProduto(
    produto = null
) {
    produtoEmEdicao =
        produto;

    const formulario =
        elemento("formulario-produto");

    if (formulario) {
        formulario.style.setProperty(
            "display",
            "block",
            "important"
        );
    }

    const campos = {
        id: elemento("produto-id"),
        nome: elemento("produto-nome"),
        descricao: elemento("produto-descricao"),
        preco: elemento("produto-preco"),
        promocional: elemento("produto-promocional"),
        custo: elemento("produto-custo"),
        peso: elemento("produto-peso"),
        altura: elemento("produto-altura"),
        largura: elemento("produto-largura"),
        comprimento: elemento("produto-comprimento"),
        imagem: elemento("produto-imagem"),
        ativo: elemento("produto-ativo"),
        destaque: elemento("produto-destaque"),
        esgotado: elemento("produto-esgotado"),
        temCor: elemento("produto-tem-cor"),
        temTamanho: elemento("produto-tem-tamanho")
    };

    if (campos.id) {
        campos.id.value =
            produto?.id || "";
    }

    if (campos.nome) {
        campos.nome.value =
            produto?.nome || "";
    }

    if (campos.descricao) {
        campos.descricao.value =
            produto?.descricao || "";
    }

    if (campos.preco) {
        campos.preco.value =
            produto?.preco ?? "";
    }

    if (campos.promocional) {
        campos.promocional.value =
            produto?.preco_promocional ?? "";
    }

    if (campos.custo) {
        campos.custo.value =
            produto?.custo ?? "";
    }

    if (campos.peso) {
        campos.peso.value =
            produto?.peso ?? "";
    }

    if (campos.altura) {
        campos.altura.value =
            produto?.altura ?? "";
    }

    if (campos.largura) {
        campos.largura.value =
            produto?.largura ?? "";
    }

    if (campos.comprimento) {
        campos.comprimento.value =
            produto?.comprimento ?? "";
    }

    if (campos.imagem) {
        campos.imagem.value = "";
    }

    if (campos.ativo) {
        campos.ativo.checked =
            produto
                ? produto.ativo !== false
                : true;
    }

    if (campos.destaque) {
        campos.destaque.checked =
            produto?.destaque === true;
    }

    if (campos.esgotado) {
        campos.esgotado.checked =
            produto?.esgotado === true;
    }

    if (campos.temCor) {
        campos.temCor.checked =
            produto?.tem_cor === true;
    }

    if (campos.temTamanho) {
        campos.temTamanho.checked =
            produto?.tem_tamanho === true;
    }

    atualizarInterfaceVariacoes();

    if (produto?.id) {
        await carregarVariacoesProduto(produto.id);
    } else {
        variacoesFormulario = [];
        renderizarVariacoesFormulario();
    }

    const selecionadas =
        produto
            ? obterColecoesDoProduto(
                produto.id
            )
            : [];

    preencherSeletorColecoes(
        selecionadas
    );

    mostrarPreviewImagemExistente(
        produto
    );

    formulario?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function fecharFormularioProduto() {
    produtoEmEdicao = null;

    const formulario =
        elemento("formulario-produto");

    if (formulario) {
        formulario.style.setProperty(
            "display",
            "none",
            "important"
        );
    }

    const form =
        elemento("form-produto");

    if (form) {
        form.reset();
    }

    const ativo =
        elemento("produto-ativo");

    if (ativo) {
        ativo.checked = true;
    }

    const esgotado =
        elemento("produto-esgotado");

    if (esgotado) {
        esgotado.checked = false;
    }

    limparVariacoesFormulario();
    atualizarInterfaceVariacoes();

    preencherSeletorColecoes([]);

    limparPreviewImagem();
}


function obterColecoesSelecionadas() {
    return Array.from(
        document.querySelectorAll(
            '#produto-colecoes input[name="produto-colecao"]:checked'
        )
    ).map(
        (input) =>
            input.value
    );
}


// ============================================================
// IMAGEM
// ============================================================

function configurarPreviewImagem() {
    const input =
        elemento("produto-imagem");

    if (!input) {
        return;
    }

    input.addEventListener(
        "change",
        () => {
            const arquivo =
                input.files?.[0];

            if (!arquivo) {
                return;
            }

            const tiposPermitidos = [
                "image/jpeg",
                "image/png",
                "image/webp"
            ];

            if (
                arquivo.type &&
                !tiposPermitidos.includes(
                    arquivo.type
                )
            ) {
                alert(
                    "Escolha uma imagem JPG, PNG ou WEBP."
                );

                input.value = "";

                limparPreviewImagem();

                return;
            }

            const tamanhoMaximo =
                10 * 1024 * 1024;

            if (
                arquivo.size >
                tamanhoMaximo
            ) {
                alert(
                    "A imagem deve ter no máximo 10 MB."
                );

                input.value = "";

                limparPreviewImagem();

                return;
            }

            const url =
                URL.createObjectURL(
                    arquivo
                );

            mostrarPreviewImagem(
                url,
                arquivo.name
            );
        }
    );

    const botaoRemover =
        elemento(
            "botao-remover-imagem"
        );

    if (botaoRemover) {
        botaoRemover.addEventListener(
            "click",
            () => {
                input.value = "";
                limparPreviewImagem();
            }
        );
    }
}


function mostrarPreviewImagem(
    url,
    nomeArquivo = "Imagem selecionada"
) {
    const preview =
        elemento(
            "preview-imagem-produto"
        );

    const imagem =
        elemento(
            "preview-imagem-produto-img"
        );

    const nome =
        elemento(
            "nome-imagem-produto"
        );

    if (preview) {
        preview.hidden = false;
        preview.style.display = "flex";
    }

    if (imagem) {
        imagem.src = url;
    }

    if (nome) {
        nome.textContent =
            nomeArquivo;
    }
}


function obterImagemProduto(
    produto
) {
    if (!produto) {
        return "";
    }

    if (produto.imagem_url) {
        return String(
            produto.imagem_url
        ).trim();
    }

    if (produto.imagem_path) {
        return gerarUrlImagemStorage(
            produto.imagem_path
        );
    }

    return (
        produto.imagem ||
        produto.image_url ||
        produto.foto_url ||
        produto.image ||
        produto.foto ||
        ""
    );
}


function gerarUrlImagemStorage(
    caminho
) {
    if (!caminho) {
        return "";
    }

    let valor =
        String(caminho).trim();

    if (!valor) {
        return "";
    }

    if (
        /^https?:\/\//i.test(valor)
    ) {
        return valor;
    }

    valor =
        valor.replace(
            /^\/+/,
            ""
        );

    if (
        valor.startsWith(
            "storage/v1/object/public/"
        )
    ) {
        return `${SUPABASE_URL}/${valor}`;
    }

    const partes =
        valor
            .split("/")
            .filter(Boolean)
            .map(
                (parte) =>
                    encodeURIComponent(
                        parte
                    )
            );

    return (
        `${SUPABASE_URL}` +
        `/storage/v1/object/public/produtos/` +
        `/${partes.join("/")}`
    );
}


function mostrarPreviewImagemExistente(
    produto
) {
    if (!produto) {
        limparPreviewImagem();
        return;
    }

    const imagem =
        obterImagemProduto(
            produto
        );

    if (!imagem) {
        limparPreviewImagem();
        return;
    }

    mostrarPreviewImagem(
        imagem,
        "Imagem atual"
    );
}


function limparPreviewImagem() {
    const preview =
        elemento(
            "preview-imagem-produto"
        );

    const imagem =
        elemento(
            "preview-imagem-produto-img"
        );

    const nome =
        elemento(
            "nome-imagem-produto"
        );

    if (imagem) {
        imagem.src = "";
    }

    if (nome) {
        nome.textContent =
            "Imagem selecionada";
    }

    if (preview) {
        preview.hidden = true;
        preview.style.display = "none";
    }

    const status =
        elemento(
            "status-upload-imagem"
        );

    if (status) {
        status.textContent = "";
    }
}


async function fazerUploadImagem(
    arquivo,
    produtoId
) {
    if (
        !arquivo ||
        !clienteSupabase
    ) {
        return null;
    }

    if (!produtoId) {
        throw new Error(
            "Não foi possível definir o ID do produto para enviar a imagem."
        );
    }

    const extensaoOriginal =
        arquivo.name.includes(".")
            ? arquivo.name
                .split(".")
                .pop()
                .toLowerCase()
            : "jpg";

    const extensoesPermitidas = [
        "jpg",
        "jpeg",
        "png",
        "webp"
    ];

    const extensao =
        extensoesPermitidas.includes(
            extensaoOriginal
        )
            ? extensaoOriginal
            : "jpg";

    const nomeSeguro =
        gerarSlug(
            arquivo.name.replace(
                /\.[^/.]+$/,
                ""
            )
        ) ||
        "imagem";

    const caminho =
        `${produtoId}/${Date.now()}-${nomeSeguro}.${extensao}`;

    const status =
        elemento(
            "status-upload-imagem"
        );

    if (status) {
        status.textContent =
            "Enviando imagem...";
    }

    const {
        error: erroUpload
    } =
        await clienteSupabase
            .storage
            .from("produtos")
            .upload(
                caminho,
                arquivo,
                {
                    cacheControl: "3600",
                    upsert: false,
                    contentType:
                        arquivo.type ||
                        "image/jpeg"
                }
            );

    if (erroUpload) {
        console.error(
            "Erro no upload da imagem:",
            erroUpload
        );

        throw new Error(
            `Não foi possível enviar a imagem: ${erroUpload.message}`
        );
    }

    const {
        data: dadosUrl
    } =
        clienteSupabase
            .storage
            .from("produtos")
            .getPublicUrl(
                caminho
            );

    const urlPublica =
        dadosUrl?.publicUrl ||
        "";

    if (!urlPublica) {
        throw new Error(
            "A imagem foi enviada, mas o Supabase não retornou a URL pública."
        );
    }

    if (status) {
        status.textContent =
            "Imagem enviada com sucesso!";
    }

    return {
        url: urlPublica,
        path: caminho
    };
}


// ============================================================
// RELACIONAMENTOS
// ============================================================

async function salvarRelacoesProduto(
    produtoId,
    colecoesSelecionadas
) {
    if (!clienteSupabase) {
        throw new Error(
            "Supabase não está disponível."
        );
    }

    const idsUnicos =
        [
            ...new Set(
                (colecoesSelecionadas || [])
                    .map(String)
                    .filter(Boolean)
            )
        ];

    const {
        error: erroDelete
    } =
        await clienteSupabase
            .from("product_collections")
            .delete()
            .eq(
                "product_id",
                produtoId
            );

    if (erroDelete) {
        throw new Error(
            `Não foi possível atualizar as coleções do produto: ${erroDelete.message}`
        );
    }

    if (!idsUnicos.length) {
        relacoesProdutosColecoes =
            relacoesProdutosColecoes.filter(
                (relacao) =>
                    String(
                        relacao.product_id
                    ) !==
                    String(produtoId)
            );

        return;
    }

    const registros =
        idsUnicos.map(
            (collectionId) => ({
                product_id:
                    produtoId,
                collection_id:
                    collectionId
            })
        );

    const {
        data,
        error: erroInsert
    } =
        await clienteSupabase
            .from("product_collections")
            .insert(
                registros
            )
            .select("*");

    if (erroInsert) {
        throw new Error(
            `Não foi possível vincular o produto às coleções: ${erroInsert.message}`
        );
    }

    relacoesProdutosColecoes =
        relacoesProdutosColecoes.filter(
            (relacao) =>
                String(
                    relacao.product_id
                ) !==
                String(produtoId)
        );

    if (data?.length) {
        relacoesProdutosColecoes =
            relacoesProdutosColecoes.concat(
                data
            );
    } else {
        relacoesProdutosColecoes =
            relacoesProdutosColecoes.concat(
                registros
            );
    }
}



// ============================================================
// VARIAÇÕES DE PRODUTO
// ============================================================

let variacoesFormulario = [];


function obterListaOpcoesVariacao(valor) {
    return String(valor || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .filter(
            (item, indice, lista) =>
                lista.findIndex(
                    (outro) =>
                        outro.toLowerCase() === item.toLowerCase()
                ) === indice
        );
}


function atualizarInterfaceVariacoes() {
    const temCor =
        elemento("produto-tem-cor")?.checked === true;

    const temTamanho =
        elemento("produto-tem-tamanho")?.checked === true;

    const area =
        elemento("area-variacoes-produto");

    const campoCores =
        elemento("campo-cores-variacoes");

    const campoTamanhos =
        elemento("campo-tamanhos-variacoes");

    if (area) {
        area.hidden =
            !temCor &&
            !temTamanho;
    }

    if (campoCores) {
        campoCores.hidden =
            !temCor;
    }

    if (campoTamanhos) {
        campoTamanhos.hidden =
            !temTamanho;
    }

    if (!temCor && !temTamanho) {
        variacoesFormulario = [];
        renderizarVariacoesFormulario();
    }
}


function configurarVariacoesProduto() {
    const temCor =
        elemento("produto-tem-cor");

    const temTamanho =
        elemento("produto-tem-tamanho");

    const botaoGerar =
        elemento("botao-gerar-variacoes");

    if (temCor) {
        temCor.addEventListener(
            "change",
            () => {
                atualizarInterfaceVariacoes();

                if (!temCor.checked) {
                    variacoesFormulario =
                        variacoesFormulario.map(
                            (variacao) => ({
                                ...variacao,
                                cor: ""
                            })
                        );

                    renderizarVariacoesFormulario();
                }
            }
        );
    }

    if (temTamanho) {
        temTamanho.addEventListener(
            "change",
            () => {
                atualizarInterfaceVariacoes();

                if (!temTamanho.checked) {
                    variacoesFormulario =
                        variacoesFormulario.map(
                            (variacao) => ({
                                ...variacao,
                                tamanho: ""
                            })
                        );

                    renderizarVariacoesFormulario();
                }
            }
        );
    }

    if (botaoGerar) {
        botaoGerar.addEventListener(
            "click",
            gerarVariacoesFormulario
        );
    }

    const lista =
        elemento("lista-variacoes-produto");

    if (lista) {
        lista.addEventListener(
            "input",
            atualizarVariacaoDigitada
        );

        lista.addEventListener(
            "change",
            atualizarVariacaoDigitada
        );

        lista.addEventListener(
            "click",
            (evento) => {
                const botao =
                    evento.target.closest(
                        "[data-remover-variacao]"
                    );

                if (!botao) {
                    return;
                }

                const indice =
                    Number(botao.dataset.removerVariacao);

                if (
                    Number.isInteger(indice) &&
                    indice >= 0
                ) {
                    variacoesFormulario.splice(
                        indice,
                        1
                    );

                    renderizarVariacoesFormulario();
                }
            }
        );
    }

    atualizarInterfaceVariacoes();
}


function gerarVariacoesFormulario() {
    const temCor =
        elemento("produto-tem-cor")?.checked === true;

    const temTamanho =
        elemento("produto-tem-tamanho")?.checked === true;

    if (!temCor && !temTamanho) {
        variacoesFormulario = [];
        renderizarVariacoesFormulario();
        return;
    }

    const cores =
        temCor
            ? obterListaOpcoesVariacao(
                elemento("produto-cores")?.value
            )
            : [""];

    const tamanhos =
        temTamanho
            ? obterListaOpcoesVariacao(
                elemento("produto-tamanhos")?.value
            )
            : [""];

    if (
        (temCor && cores.length === 0) ||
        (temTamanho && tamanhos.length === 0)
    ) {
        alert(
            "Informe pelo menos uma opção de cor e/ou tamanho antes de gerar as combinações."
        );
        return;
    }

    const anteriores =
        new Map(
            variacoesFormulario.map(
                (variacao) => [
                    `${variacao.cor || ""}|||${variacao.tamanho || ""}`,
                    variacao
                ]
            )
        );

    const novasVariacoes = [];

    cores.forEach(
        (cor) => {
            tamanhos.forEach(
                (tamanho) => {
                    const chave =
                        `${cor || ""}|||${tamanho || ""}`;

                    const anterior =
                        anteriores.get(chave);

                    novasVariacoes.push({
                        cor: cor || "",
                        tamanho: tamanho || "",
                        preco:
                            anterior?.preco ??
                            converterNumero(
                                elemento("produto-preco")?.value
                            ) ??
                            0,
                        preco_promocional:
                            anterior?.preco_promocional ??
                            converterNumero(
                                elemento("produto-promocional")?.value
                            ) ??
                            null,
                        estoque:
                            anterior?.estoque ??
                            0,
                        esgotado:
                            anterior?.esgotado === true
                    });
                }
            );
        }
    );

    variacoesFormulario =
        novasVariacoes;

    renderizarVariacoesFormulario();
}


function converterNumeroVariacao(valor) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return null;
    }

    const texto =
        String(valor).trim();

    if (!texto) {
        return null;
    }

    const normalizado =
        texto.includes(",")
            ? texto
                .replace(/\./g, "")
                .replace(",", ".")
            : texto;

    const numero =
        Number(normalizado);

    return Number.isFinite(numero)
        ? numero
        : null;
}


function atualizarVariacaoDigitada(evento) {
    const elementoAlvo =
        evento.target;

    const indice =
        Number(
            elementoAlvo.dataset.variacaoIndice
        );

    if (
        !Number.isInteger(indice) ||
        !variacoesFormulario[indice]
    ) {
        return;
    }

    const campo =
        elementoAlvo.dataset.variacaoCampo;

    if (!campo) {
        return;
    }

    if (campo === "esgotado") {
        variacoesFormulario[indice].esgotado =
            elementoAlvo.checked;

        return;
    }

    variacoesFormulario[indice][campo] =
        elementoAlvo.value;
}


function renderizarVariacoesFormulario() {
    const lista =
        elemento("lista-variacoes-produto");

    const resumo =
        elemento("resumo-variacoes");

    if (!lista) {
        return;
    }

    if (!variacoesFormulario.length) {
        lista.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="sem-variacoes"
                >
                    Nenhuma combinação criada ainda.
                </td>
            </tr>
        `;

        if (resumo) {
            resumo.textContent =
                "0 combinações";
        }

        return;
    }

    lista.innerHTML =
        variacoesFormulario
            .map(
                (variacao, indice) => `
                    <tr>
                        <td>
                            <input
                                type="text"
                                value="${escaparHTML(variacao.cor || "")}"
                                data-variacao-indice="${indice}"
                                data-variacao-campo="cor"
                            >
                        </td>

                        <td>
                            <input
                                type="text"
                                value="${escaparHTML(variacao.tamanho || "")}"
                                data-variacao-indice="${indice}"
                                data-variacao-campo="tamanho"
                            >
                        </td>

                        <td>
                            <input
                                type="text"
                                inputmode="decimal"
                                value="${variacao.preco ?? ""}"
                                data-variacao-indice="${indice}"
                                data-variacao-campo="preco"
                            >
                        </td>

                        <td>
                            <input
                                type="text"
                                inputmode="decimal"
                                value="${variacao.preco_promocional ?? ""}"
                                data-variacao-indice="${indice}"
                                data-variacao-campo="preco_promocional"
                            >
                        </td>

                        <td>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value="${Number(variacao.estoque || 0)}"
                                data-variacao-indice="${indice}"
                                data-variacao-campo="estoque"
                            >
                        </td>

                        <td>
                            <label class="campo-check">
                                <input
                                    type="checkbox"
                                    ${variacao.esgotado ? "checked" : ""}
                                    data-variacao-indice="${indice}"
                                    data-variacao-campo="esgotado"
                                >
                            </label>
                        </td>

                        <td>
                            <button
                                type="button"
                                class="botao-remover-variacao"
                                data-remover-variacao="${indice}"
                            >
                                Remover
                            </button>
                        </td>
                    </tr>
                `
            )
            .join("");

    if (resumo) {
        resumo.textContent =
            `${variacoesFormulario.length} ${
                variacoesFormulario.length === 1
                    ? "combinação"
                    : "combinações"
            }`;
    }
}


async function carregarVariacoesProduto(produtoId) {
    variacoesFormulario = [];

    if (!clienteSupabase || !produtoId) {
        renderizarVariacoesFormulario();
        return;
    }

    try {
        const {
            data,
            error
        } =
            await clienteSupabase
                .from("product_variants")
                .select("*")
                .eq(
                    "product_id",
                    String(produtoId)
                )
                .order(
                    "ordem",
                    {
                        ascending: true
                    }
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );

        if (error) {
            throw error;
        }

        variacoesFormulario =
            Array.isArray(data)
                ? data.map(
                    (variacao) => ({
                        id: variacao.id,
                        cor: variacao.cor || "",
                        tamanho: variacao.tamanho || "",
                        preco:
                            variacao.preco ?? "",
                        preco_promocional:
                            variacao.preco_promocional ?? "",
                        estoque:
                            Number(
                                variacao.estoque ?? 0
                            ),
                        esgotado:
                            variacao.esgotado === true
                    })
                )
                : [];

        const cores = [
            ...new Set(
                variacoesFormulario
                    .map(
                        (variacao) =>
                            variacao.cor
                    )
                    .filter(Boolean)
            )
        ];

        const tamanhos = [
            ...new Set(
                variacoesFormulario
                    .map(
                        (variacao) =>
                            variacao.tamanho
                    )
                    .filter(Boolean)
            )
        ];

        const campoCores =
            elemento("produto-cores");

        const campoTamanhos =
            elemento("produto-tamanhos");

        if (campoCores) {
            campoCores.value =
                cores.join(", ");
        }

        if (campoTamanhos) {
            campoTamanhos.value =
                tamanhos.join(", ");
        }

        atualizarInterfaceVariacoes();
        renderizarVariacoesFormulario();

    } catch (erro) {
        console.error(
            "Erro ao carregar variações:",
            erro
        );

        variacoesFormulario = [];

        renderizarVariacoesFormulario();

        mostrarMensagem(
            `Não foi possível carregar as variações: ${erro.message}`,
            "erro"
        );
    }
}


async function salvarVariacoesProduto(produtoId) {
    if (!clienteSupabase || !produtoId) {
        return;
    }

    const temCor =
        elemento("produto-tem-cor")?.checked === true;

    const temTamanho =
        elemento("produto-tem-tamanho")?.checked === true;

    if (!temCor && !temTamanho) {
        const { error } =
            await clienteSupabase
                .from("product_variants")
                .delete()
                .eq(
                    "product_id",
                    String(produtoId)
                );

        if (error) {
            throw error;
        }

        return;
    }

    const variacoes =
        variacoesFormulario
            .map(
                (variacao, indice) => ({
                    product_id:
                        String(produtoId),

                    cor:
                        temCor
                            ? String(
                                variacao.cor || ""
                            ).trim() || null
                            : null,

                    tamanho:
                        temTamanho
                            ? String(
                                variacao.tamanho || ""
                            ).trim() || null
                            : null,

                    preco:
                        converterNumeroVariacao(
                            variacao.preco
                        ) ??
                        converterNumero(
                            elemento("produto-preco")?.value
                        ) ??
                        0,

                    preco_promocional:
                        converterNumeroVariacao(
                            variacao.preco_promocional
                        ),

                    estoque:
                        Math.max(
                            0,
                            parseInt(
                                variacao.estoque,
                                10
                            ) || 0
                        ),

                    esgotado:
                        variacao.esgotado === true,

                    ordem:
                        indice
                })
            );

    if (!variacoes.length) {
        throw new Error(
            "O produto possui opções de cor/tamanho, mas nenhuma combinação foi criada."
        );
    }

    const { error: erroExcluir } =
        await clienteSupabase
            .from("product_variants")
            .delete()
            .eq(
                "product_id",
                String(produtoId)
            );

    if (erroExcluir) {
        throw erroExcluir;
    }

    const { error } =
        await clienteSupabase
            .from("product_variants")
            .insert(
                variacoes
            );

    if (error) {
        throw error;
    }
}


function limparVariacoesFormulario() {
    variacoesFormulario = [];

    const cores =
        elemento("produto-cores");

    const tamanhos =
        elemento("produto-tamanhos");

    const temCor =
        elemento("produto-tem-cor");

    const temTamanho =
        elemento("produto-tem-tamanho");

    if (cores) {
        cores.value = "";
    }

    if (tamanhos) {
        tamanhos.value = "";
    }

    if (temCor) {
        temCor.checked = false;
    }

    if (temTamanho) {
        temTamanho.checked = false;
    }

    renderizarVariacoesFormulario();
}


// ============================================================
// SALVAR PRODUTO
// ============================================================

async function salvarProduto(evento) {
    evento.preventDefault();

    if (!clienteSupabase) {
        mostrarMensagem(
            "O sistema ainda está carregando.",
            "erro"
        );
        return;
    }

    const botaoSalvar =
        document.querySelector(
            '#form-produto button[type="submit"]'
        );

    if (botaoSalvar) {
        botaoSalvar.disabled = true;
        botaoSalvar.textContent =
            "Salvando...";
    }

    try {
        const nome =
            elemento("produto-nome")
                ?.value
                .trim() ||
            "";

        if (!nome) {
            throw new Error(
                "Digite o nome do produto."
            );
        }

        const slug =
            gerarSlug(nome);

        if (!slug) {
            throw new Error(
                "Não foi possível gerar o slug do produto."
            );
        }

        /*
         * ID existente = edição.
         *
         * ID vazio = produto novo.
         *
         * Para produto novo geramos o UUID antes
         * do upload da imagem.
         */
        let produtoId =
            elemento("produto-id")
                ?.value
                .trim() ||
            "";

        const produtoEstaSendoEditado =
            Boolean(produtoId);

        if (!produtoId) {
            produtoId =
                gerarIdProduto();
        }

        const colecoesSelecionadas =
            obterColecoesSelecionadas();

        const primeiraColecao =
            colecoesSelecionadas.length
                ? colecoesSelecionadas[0]
                : null;

        const arquivo =
            elemento(
                "produto-imagem"
            )
                ?.files?.[0] ||
            null;

        /*
         * Dados básicos do produto.
         */
        const dadosProduto = {
            id: produtoId,

            nome: nome,

            slug: slug,

            descricao:
                elemento(
                    "produto-descricao"
                )
                    ?.value
                    .trim() ||
                null,

            preco:
                converterNumero(
                    elemento(
                        "produto-preco"
                    )?.value
                ),

            preco_promocional:
                converterNumero(
                    elemento(
                        "produto-promocional"
                    )?.value
                ),

            custo:
                converterNumero(
                    elemento(
                        "produto-custo"
                    )?.value
                ),

            peso:
                converterNumero(
                    elemento(
                        "produto-peso"
                    )?.value
                ),

            altura:
                converterNumero(
                    elemento(
                        "produto-altura"
                    )?.value
                ),

            largura:
                converterNumero(
                    elemento(
                        "produto-largura"
                    )?.value
                ),

            comprimento:
                converterNumero(
                    elemento(
                        "produto-comprimento"
                    )?.value
                ),

            ativo:
                elemento(
                    "produto-ativo"
                )
                    ? elemento(
                        "produto-ativo"
                    ).checked
                    : true,

            destaque:
                elemento(
                    "produto-destaque"
                )
                    ? elemento(
                        "produto-destaque"
                    ).checked
                    : false,

            esgotado:
                elemento(
                    "produto-esgotado"
                )
                    ? elemento(
                        "produto-esgotado"
                    ).checked
                    : false,

            tem_cor:
                elemento(
                    "produto-tem-cor"
                )
                    ? elemento(
                        "produto-tem-cor"
                    ).checked
                    : false,

            tem_tamanho:
                elemento(
                    "produto-tem-tamanho"
                )
                    ? elemento(
                        "produto-tem-tamanho"
                    ).checked
                    : false,

            collection_id:
                primeiraColecao
        };

        /*
         * =====================================================
         * IMAGEM
         * =====================================================
         *
         * Produto novo:
         * - gera ID
         * - envia imagem
         * - coloca imagem_url e imagem_path
         * - só então cria o registro
         *
         * Produto existente:
         * - atualiza os dados
         * - se houver nova imagem, envia e atualiza a referência
         */

        let imagemEnviada =
            null;

        if (
            arquivo &&
            !produtoEstaSendoEditado
        ) {
            imagemEnviada =
                await fazerUploadImagem(
                    arquivo,
                    produtoId
                );

            if (imagemEnviada) {
                dadosProduto.imagem_url =
                    imagemEnviada.url;

                dadosProduto.imagem_path =
                    imagemEnviada.path;
            }
        }

        let produtoSalvo = null;

        // ====================================================
        // CRIAR PRODUTO NOVO
        // ====================================================

        if (!produtoEstaSendoEditado) {
            const {
                data,
                error
            } =
                await clienteSupabase
                    .from("products")
                    .insert(
                        dadosProduto
                    )
                    .select("*")
                    .single();

            if (error) {
                console.error(
                    "Erro ao criar produto:",
                    error
                );

                throw error;
            }

            produtoSalvo =
                data;

        // ====================================================
        // ATUALIZAR PRODUTO
        // ====================================================

        } else {
            /*
             * Na edição não mandamos o id no update.
             */
            const dadosAtualizacao =
                {
                    ...dadosProduto
                };

            delete dadosAtualizacao.id;

            const {
                data,
                error
            } =
                await clienteSupabase
                    .from("products")
                    .update(
                        dadosAtualizacao
                    )
                    .eq(
                        "id",
                        produtoId
                    )
                    .select("*")
                    .single();

            if (error) {
                console.error(
                    "Erro ao atualizar produto:",
                    error
                );

                throw error;
            }

            produtoSalvo =
                data;
        }

        // ====================================================
        // IMAGEM EM PRODUTO EXISTENTE
        // ====================================================

        if (
            arquivo &&
            produtoEstaSendoEditado &&
            produtoSalvo?.id
        ) {
            imagemEnviada =
                await fazerUploadImagem(
                    arquivo,
                    produtoSalvo.id
                );

            if (!imagemEnviada) {
                throw new Error(
                    "Não foi possível enviar a nova imagem."
                );
            }

            const {
                data: produtoComImagem,
                error
            } =
                await clienteSupabase
                    .from("products")
                    .update({
                        imagem_url:
                            imagemEnviada.url,

                        imagem_path:
                            imagemEnviada.path
                    })
                    .eq(
                        "id",
                        produtoSalvo.id
                    )
                    .select("*")
                    .single();

            if (error) {
                throw new Error(
                    `A imagem foi enviada, mas não foi possível salvar sua referência no produto: ${error.message}`
                );
            }

            produtoSalvo =
                produtoComImagem;
        }

        // ====================================================
        // CONFERÊNCIA DA IMAGEM
        // ====================================================

        if (
            arquivo &&
            produtoSalvo
        ) {
            if (
                !produtoSalvo.imagem_url &&
                !produtoSalvo.imagem_path
            ) {
                throw new Error(
                    "A imagem foi enviada, mas a referência não foi gravada no produto."
                );
            }

            console.log(
                "Imagem salva no produto:",
                {
                    id:
                        produtoSalvo.id,

                    imagem_url:
                        produtoSalvo.imagem_url,

                    imagem_path:
                        produtoSalvo.imagem_path
                }
            );
        }

        // ====================================================
        // VARIAÇÕES
        // ====================================================

        if (produtoSalvo?.id) {
            await salvarVariacoesProduto(
                produtoSalvo.id
            );
        }

        // ====================================================
        // COLEÇÕES
        // ====================================================

        if (produtoSalvo?.id) {
            await salvarRelacoesProduto(
                produtoSalvo.id,
                colecoesSelecionadas
            );
        }

        // ====================================================
        // SUCESSO
        // ====================================================

        mostrarMensagem(
            produtoEstaSendoEditado
                ? "Produto atualizado com sucesso!"
                : "Produto cadastrado com sucesso!",
            "sucesso"
        );

        fecharFormularioProduto();

        await carregarColecoes();
        await carregarProdutos();
        await carregarProdutosHome();

    } catch (erro) {
        console.error(
            "Erro ao salvar produto:",
            erro
        );

        const mensagem =
            erro?.message ||
            "Erro desconhecido";

        mostrarMensagem(
            `Não foi possível salvar o produto: ${mensagem}`,
            "erro"
        );

        alert(
            `Não foi possível salvar o produto:\n\n${mensagem}`
        );

    } finally {
        if (botaoSalvar) {
            botaoSalvar.disabled = false;
            botaoSalvar.textContent =
                "Salvar produto";
        }
    }
}


// ============================================================
// EXCLUIR PRODUTO
// ============================================================

async function excluirProduto(id) {
    if (!clienteSupabase) {
        return;
    }

    const produto =
        produtos.find(
            (item) =>
                String(item.id) ===
                String(id)
        );

    if (!produto) {
        return;
    }

    const confirmado =
        confirm(
            `Deseja realmente excluir o produto "${produto.nome || "sem nome"}"?`
        );

    if (!confirmado) {
        return;
    }

    try {
        const {
            error: erroRelacoes
        } =
            await clienteSupabase
                .from("product_collections")
                .delete()
                .eq(
                    "product_id",
                    id
                );

        if (erroRelacoes) {
            throw erroRelacoes;
        }

        const {
            error
        } =
            await clienteSupabase
                .from("products")
                .delete()
                .eq(
                    "id",
                    id
                );

        if (error) {
            throw error;
        }

        mostrarMensagem(
            "Produto excluído com sucesso!",
            "sucesso"
        );

        await carregarProdutos();
        await carregarProdutosHome();

    } catch (erro) {
        console.error(
            "Erro ao excluir produto:",
            erro
        );

        alert(
            `Não foi possível excluir o produto:\n\n${
                erro?.message ||
                "Erro desconhecido"
            }`
        );
    }
}


// ============================================================
// CRIAR COLEÇÃO
// ============================================================

async function criarColecao() {
    if (!clienteSupabase) {
        return;
    }

    const nome =
        prompt(
            "Digite o nome da categoria:"
        );

    if (
        !nome ||
        !nome.trim()
    ) {
        return;
    }

    try {
        const {
            data,
            error
        } =
            await clienteSupabase
                .from("collections")
                .insert({
                    nome:
                        nome.trim()
                })
                .select("*")
                .single();

        if (error) {
            throw error;
        }

        if (data) {
            colecoes.push(data);
        }

        await carregarColecoes();

        mostrarMensagem(
            "Categoria criada com sucesso!",
            "sucesso"
        );

    } catch (erro) {
        console.error(
            "Erro ao criar categoria:",
            erro
        );

        alert(
            `Não foi possível criar a categoria:\n\n${
                erro?.message ||
                "Erro desconhecido"
            }`
        );
    }
}


// ============================================================
// EDITAR COLEÇÃO
// ============================================================

async function editarColecao(id) {
    if (!clienteSupabase) {
        return;
    }

    const colecao =
        colecoes.find(
            (item) =>
                String(item.id) ===
                String(id)
        );

    if (!colecao) {
        return;
    }

    const nomeAtual =
        colecao.nome ||
        colecao.name ||
        "";

    const novoNome =
        prompt(
            "Digite o novo nome da categoria:",
            nomeAtual
        );

    if (
        !novoNome ||
        !novoNome.trim()
    ) {
        return;
    }

    try {
        const {
            error
        } =
            await clienteSupabase
                .from("collections")
                .update({
                    nome:
                        novoNome.trim()
                })
                .eq(
                    "id",
                    id
                );

        if (error) {
            throw error;
        }

        await carregarColecoes();

        mostrarMensagem(
            "Categoria atualizada com sucesso!",
            "sucesso"
        );

    } catch (erro) {
        console.error(
            "Erro ao editar categoria:",
            erro
        );

        alert(
            `Não foi possível editar a categoria:\n\n${
                erro?.message ||
                "Erro desconhecido"
            }`
        );
    }
}


// ============================================================
// EXCLUIR COLEÇÃO
// ============================================================

async function excluirColecao(id) {
    if (!clienteSupabase) {
        return;
    }

    const colecao =
        colecoes.find(
            (item) =>
                String(item.id) ===
                String(id)
        );

    if (!colecao) {
        return;
    }

    const nome =
        colecao.nome ||
        colecao.name ||
        "esta categoria";

    const confirmado =
        confirm(
            `Deseja realmente excluir "${nome}"?`
        );

    if (!confirmado) {
        return;
    }

    try {
        const {
            error: erroRelacoes
        } =
            await clienteSupabase
                .from("product_collections")
                .delete()
                .eq(
                    "collection_id",
                    id
                );

        if (erroRelacoes) {
            throw erroRelacoes;
        }

        const {
            error: erroProdutos
        } =
            await clienteSupabase
                .from("products")
                .update({
                    collection_id:
                        null
                })
                .eq(
                    "collection_id",
                    id
                );

        if (erroProdutos) {
            console.warn(
                "Não foi possível limpar collection_id antigo:",
                erroProdutos
            );
        }

        const {
            error
        } =
            await clienteSupabase
                .from("collections")
                .delete()
                .eq(
                    "id",
                    id
                );

        if (error) {
            throw error;
        }

        await carregarColecoes();
        await carregarProdutos();

        mostrarMensagem(
            "Categoria excluída com sucesso!",
            "sucesso"
        );

    } catch (erro) {
        console.error(
            "Erro ao excluir categoria:",
            erro
        );

        alert(
            `Não foi possível excluir a categoria:\n\n${
                erro?.message ||
                "Erro desconhecido"
            }`
        );
    }
}


// ============================================================
// PÁGINA INICIAL
// ============================================================

async function carregarProdutosHome() {
    if (!clienteSupabase) {
        return;
    }

    const container =
        elemento(
            "produtos-home-container"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="mensagem-vazia">
            Carregando produtos...
        </div>
    `;

    try {
        const {
            data,
            error
        } =
            await clienteSupabase
                .from("products")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            console.error(
                "Erro ao carregar produtos da página inicial:",
                error
            );

            container.innerHTML = `
                <div class="mensagem-vazia">
                    Não foi possível carregar os produtos.
                    <br>
                    <small>
                        ${escaparHTML(
                            error.message
                        )}
                    </small>
                </div>
            `;

            return;
        }

        const lista =
            data || [];

        if (!lista.length) {
            container.innerHTML = `
                <div class="mensagem-vazia">
                    Nenhum produto cadastrado.
                </div>
            `;

            return;
        }

        container.innerHTML =
            lista.map(
                (produto) => {
                    const imagem =
                        obterImagemProduto(
                            produto
                        );

                    return `
                        <div
                            class="produto-home-item"
                        >
                            <div>
                                ${
                                    imagem
                                        ? `
                                            <img
                                                src="${escaparHTML(imagem)}"
                                                alt="${escaparHTML(
                                                    produto.nome ||
                                                    "Produto"
                                                )}"
                                                onerror="this.style.display='none'"
                                            >
                                        `
                                        : ""
                                }
                            </div>

                            <div
                                class="produto-home-info"
                            >
                                <strong>
                                    ${escaparHTML(
                                        produto.nome ||
                                        "Sem nome"
                                    )}
                                </strong>

                                <span>
                                    ${formatarPreco(
                                        produto.preco
                                    )}
                                </span>
                            </div>

                            <label>
                                <input
                                    type="checkbox"
                                    class="produto-home-destaque"
                                    data-id="${escaparHTML(
                                        produto.id
                                    )}"
                                    ${
                                        produto.destaque === true
                                            ? "checked"
                                            : ""
                                    }
                                >

                                Mostrar em destaque
                            </label>
                        </div>
                    `;
                }
            ).join("");

    } catch (erro) {
        console.error(erro);

        container.innerHTML = `
            <div class="mensagem-vazia">
                Ocorreu um erro ao carregar os produtos.
                <br>
                <small>
                    ${escaparHTML(
                        erro?.message || ""
                    )}
                </small>
            </div>
        `;
    }
}


async function salvarProdutosHome() {
    if (!clienteSupabase) {
        return;
    }

    const botao =
        elemento(
            "botao-salvar-home"
        );

    if (botao) {
        botao.disabled = true;
        botao.textContent =
            "Salvando...";
    }

    try {
        const checkboxes =
            Array.from(
                document.querySelectorAll(
                    ".produto-home-destaque"
                )
            );

        for (
            const checkbox of checkboxes
        ) {
            const {
                error
            } =
                await clienteSupabase
                    .from("products")
                    .update({
                        destaque:
                            checkbox.checked
                    })
                    .eq(
                        "id",
                        checkbox.dataset.id
                    );

            if (error) {
                throw error;
            }
        }

        mostrarMensagem(
            "Produtos em destaque atualizados com sucesso!",
            "sucesso"
        );

        await carregarProdutos();

    } catch (erro) {
        console.error(
            "Erro ao salvar produtos da página inicial:",
            erro
        );

        alert(
            `Não foi possível salvar os produtos em destaque:\n\n${
                erro?.message ||
                "Erro desconhecido"
            }`
        );

    } finally {
        if (botao) {
            botao.disabled = false;
            botao.textContent =
                "Salvar alterações";
        }
    }
}


// ============================================================
// DASHBOARD
// ============================================================

function atualizarDashboard() {
    const totalProdutos =
        elemento(
            "total-produtos"
        );

    const totalColecoes =
        elemento(
            "total-colecoes"
        );

    const totalPedidos =
        elemento(
            "total-pedidos"
        );

    const totalPersonalizados =
        elemento(
            "total-personalizados"
        );

    if (totalProdutos) {
        totalProdutos.textContent =
            produtos.length;
    }

    if (totalColecoes) {
        totalColecoes.textContent =
            colecoes.length;
    }

    if (totalPedidos) {
        totalPedidos.textContent =
            "0";
    }

    if (totalPersonalizados) {
        totalPersonalizados.textContent =
            "0";
    }
}


// ============================================================
// BOTÕES DE PRODUTOS
// ============================================================

function configurarBotoesProdutos() {
    const novo =
        elemento(
            "botao-novo-produto"
        );

    if (novo) {
        novo.addEventListener(
            "click",
            (evento) => {
                evento.preventDefault();

                abrirFormularioProduto();
            }
        );
    }

    const formulario =
        elemento("form-produto");

    if (formulario) {
        formulario.addEventListener(
            "submit",
            salvarProduto
        );
    }

    const filtro =
        elemento("filtro-colecoes");

    if (filtro) {
        filtro.addEventListener(
            "change",
            () => {
                filtroColecaoAtual =
                    filtro.value;

                renderizarProdutos();
            }
        );
    }

    document.addEventListener(
        "click",
        (evento) => {
            const editar =
                evento.target.closest(
                    ".botao-editar-produto"
                );

            if (editar) {
                const produto =
                    produtos.find(
                        (item) =>
                            String(
                                item.id
                            ) ===
                            String(
                                editar.dataset.id
                            )
                    );

                if (produto) {
                    abrirFormularioProduto(
                        produto
                    );
                }

                return;
            }

            const excluir =
                evento.target.closest(
                    ".botao-excluir-produto"
                );

            if (excluir) {
                excluirProduto(
                    excluir.dataset.id
                );

                return;
            }

            const cancelar =
                evento.target.closest(
                    "[data-cancelar-produto]"
                );

            if (cancelar) {
                evento.preventDefault();

                fecharFormularioProduto();

                return;
            }

            const fechar =
                evento.target.closest(
                    "#formulario-produto .fechar, #formulario-produto .botao-fechar"
                );

            if (fechar) {
                evento.preventDefault();

                fecharFormularioProduto();
            }
        }
    );
}


// ============================================================
// BOTÕES DE COLEÇÕES
// ============================================================

function configurarBotoesColecoes() {
    const nova =
        elemento(
            "botao-nova-colecao"
        );

    if (nova) {
        nova.addEventListener(
            "click",
            (evento) => {
                evento.preventDefault();

                criarColecao();
            }
        );
    }

    document.addEventListener(
        "click",
        (evento) => {
            const editar =
                evento.target.closest(
                    ".botao-editar-colecao"
                );

            if (editar) {
                editarColecao(
                    editar.dataset.id
                );

                return;
            }

            const excluir =
                evento.target.closest(
                    ".botao-excluir-colecao"
                );

            if (excluir) {
                excluirColecao(
                    excluir.dataset.id
                );
            }
        }
    );
}


// ============================================================
// PÁGINA INICIAL
// ============================================================

function configurarPaginaInicial() {
    const botao =
        elemento(
            "botao-salvar-home"
        );

    if (botao) {
        botao.addEventListener(
            "click",
            salvarProdutosHome
        );
    }
}


// ============================================================
// SAIR
// ============================================================

function configurarBotaoSair() {
    const botao =
        document.querySelector(
            '[data-acao="sair"], #botao-sair, .botao-sair'
        );

    if (!botao) {
        return;
    }

    botao.addEventListener(
        "click",
        async (evento) => {
            evento.preventDefault();

            if (!clienteSupabase) {
                return;
            }

            try {
                await clienteSupabase
                    .auth
                    .signOut();

                window.location.href =
                    "login.html";

            } catch (erro) {
                console.error(
                    "Erro ao sair:",
                    erro
                );
            }
        }
    );
}


// ============================================================
// INICIAR
// ============================================================

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        inicializar
    );
} else {
    inicializar();
}