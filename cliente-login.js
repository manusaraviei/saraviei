document.addEventListener(
    "DOMContentLoaded",
    async function() {

        const SUPABASE_URL =
            "https://gmimzvnuvraletepczrp.supabase.co";


        const SUPABASE_ANON_KEY =
            "sb_publishable_NtJmSYaKmuQuLY2QvfQKLQ_rFA8Ceqx";


        if (
            typeof window.supabase === "undefined"
        ) {

            console.error(
                "Supabase não foi carregado."
            );

            return;

        }


        const supabaseClient =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY
            );


        const abaEntrar =
            document.getElementById(
                "aba-entrar"
            );


        const abaCriar =
            document.getElementById(
                "aba-criar"
            );


        const painelEntrar =
            document.getElementById(
                "painel-entrar"
            );


        const painelCriar =
            document.getElementById(
                "painel-criar"
            );


        const painelLogado =
            document.getElementById(
                "painel-logado"
            );


        const formEntrar =
            document.getElementById(
                "form-entrar"
            );


        const formCriar =
            document.getElementById(
                "form-criar"
            );


        const botaoEntrar =
            document.getElementById(
                "botao-entrar"
            );


        const botaoCriar =
            document.getElementById(
                "botao-criar"
            );


        const botaoEsqueci =
            document.getElementById(
                "botao-esqueci"
            );


        const botaoSair =
            document.getElementById(
                "botao-sair"
            );


        const botaoMeusPedidos =
            document.getElementById(
                "botao-meus-pedidos"
            );


        const mensagemEntrar =
            document.getElementById(
                "mensagem-entrar"
            );


        const mensagemCriar =
            document.getElementById(
                "mensagem-criar"
            );


        const mensagemLogado =
            document.getElementById(
                "mensagem-logado"
            );


        const nomeLogado =
            document.getElementById(
                "nome-logado"
            );


        const emailLogado =
            document.getElementById(
                "email-logado"
            );


        function mostrarMensagem(
            elemento,
            texto,
            tipo
        ) {

            elemento.textContent =
                texto || "";


            elemento.className =
                "mensagem";


            if (tipo) {

                elemento.classList.add(
                    tipo
                );

            }

        }


        function limparMensagens() {

            mostrarMensagem(
                mensagemEntrar,
                "",
                ""
            );


            mostrarMensagem(
                mensagemCriar,
                "",
                ""
            );


            mostrarMensagem(
                mensagemLogado,
                "",
                ""
            );

        }


        function mostrarAba(
            nome
        ) {

            limparMensagens();


            if (nome === "criar") {

                abaEntrar.classList.remove(
                    "ativa"
                );

                abaCriar.classList.add(
                    "ativa"
                );


                painelEntrar.classList.remove(
                    "ativo"
                );

                painelCriar.classList.add(
                    "ativo"
                );


                return;

            }


            abaCriar.classList.remove(
                "ativa"
            );

            abaEntrar.classList.add(
                "ativa"
            );


            painelCriar.classList.remove(
                "ativo"
            );

            painelEntrar.classList.add(
                "ativo"
            );

        }


        abaEntrar.addEventListener(
            "click",
            function() {

                mostrarAba(
                    "entrar"
                );

            }
        );


        abaCriar.addEventListener(
            "click",
            function() {

                mostrarAba(
                    "criar"
                );

            }
        );


        function obterNomeUsuario(
            usuario
        ) {

            return (
                usuario?.user_metadata?.nome ||
                usuario?.user_metadata?.name ||
                usuario?.user_metadata?.full_name ||
                usuario?.email?.split("@")[0] ||
                "cliente"
            );

        }


        function mostrarConta(
            usuario
        ) {

            if (!usuario) {

                painelLogado.classList.remove(
                    "ativo"
                );

                return;

            }


            painelEntrar.classList.remove(
                "ativo"
            );

            painelCriar.classList.remove(
                "ativo"
            );


            abaEntrar.style.display =
                "none";

            abaCriar.style.display =
                "none";


            painelLogado.classList.add(
                "ativo"
            );


            nomeLogado.textContent =
                obterNomeUsuario(
                    usuario
                );


            emailLogado.textContent =
                usuario.email || "—";

        }


        function mostrarFormularios() {

            painelLogado.classList.remove(
                "ativo"
            );


            abaEntrar.style.display =
                "";


            abaCriar.style.display =
                "";


            mostrarAba(
                "entrar"
            );

        }


        async function verificarSessao() {

            try {

                const resposta =
                    await supabaseClient.auth.getSession();


                const sessao =
                    resposta?.data?.session;


                if (sessao?.user) {

                    mostrarConta(
                        sessao.user
                    );

                } else {

                    mostrarFormularios();

                }

            } catch (erro) {

                console.error(
                    "Erro ao verificar sessão:",
                    erro
                );

                mostrarFormularios();

            }

        }


        formEntrar.addEventListener(
            "submit",
            async function(evento) {

                evento.preventDefault();


                limparMensagens();


                const email =
                    document
                        .getElementById(
                            "email-entrar"
                        )
                        .value
                        .trim();


                const senha =
                    document
                        .getElementById(
                            "senha-entrar"
                        )
                        .value;


                botaoEntrar.disabled =
                    true;


                botaoEntrar.textContent =
                    "Entrando...";


                try {

                    const resposta =
                        await supabaseClient.auth.signInWithPassword(
                            {
                                email:
                                    email,

                                password:
                                    senha
                            }
                        );


                    if (
                        resposta.error
                    ) {

                        throw resposta.error;

                    }


                    const usuario =
                        resposta
                            ?.data
                            ?.user;


                    if (!usuario) {

                        throw new Error(
                            "Não foi possível confirmar o acesso à conta."
                        );

                    }


                    mostrarMensagem(
                        mensagemEntrar,
                        "Login realizado com sucesso.",
                        "sucesso"
                    );


                    const destino =
                        sessionStorage.getItem(
                            "saravieiDestinoDepoisLogin"
                        );


                    sessionStorage.removeItem(
                        "saravieiDestinoDepoisLogin"
                    );


                    setTimeout(
                        function() {

                            if (destino) {

                                window.location.href =
                                    destino;

                            } else {

                                mostrarConta(
                                    usuario
                                );

                            }

                        },
                        400
                    );

                } catch (erro) {

                    console.error(
                        "Erro no login:",
                        erro
                    );


                    let mensagem =
                        "Não foi possível entrar na conta.";


                    if (
                        erro?.message
                    ) {

                        mensagem =
                            erro.message;

                    }


                    mostrarMensagem(
                        mensagemEntrar,
                        mensagem,
                        "erro"
                    );

                } finally {

                    botaoEntrar.disabled =
                        false;

                    botaoEntrar.textContent =
                        "Entrar";

                }

            }
        );


        formCriar.addEventListener(
            "submit",
            async function(evento) {

                evento.preventDefault();


                limparMensagens();


                const nome =
                    document
                        .getElementById(
                            "nome-criar"
                        )
                        .value
                        .trim();


                const email =
                    document
                        .getElementById(
                            "email-criar"
                        )
                        .value
                        .trim();


                const senha =
                    document
                        .getElementById(
                            "senha-criar"
                        )
                        .value;


                const confirmarSenha =
                    document
                        .getElementById(
                            "senha-confirmar"
                        )
                        .value;


                if (!nome) {

                    mostrarMensagem(
                        mensagemCriar,
                        "Informe seu nome.",
                        "erro"
                    );

                    return;

                }


                if (
                    senha.length < 6
                ) {

                    mostrarMensagem(
                        mensagemCriar,
                        "A senha precisa ter pelo menos 6 caracteres.",
                        "erro"
                    );

                    return;

                }


                if (
                    senha !==
                    confirmarSenha
                ) {

                    mostrarMensagem(
                        mensagemCriar,
                        "As senhas não coincidem.",
                        "erro"
                    );

                    return;

                }


                botaoCriar.disabled =
                    true;


                botaoCriar.textContent =
                    "Criando conta...";


                try {

                    const resposta =
                        await supabaseClient.auth.signUp(
                            {
                                email:
                                    email,

                                password:
                                    senha,

                                options:
                                    {
                                        data:
                                            {
                                                nome:
                                                    nome
                                            }
                                    }
                            }
                        );


                    if (
                        resposta.error
                    ) {

                        throw resposta.error;

                    }


                    const usuario =
                        resposta
                            ?.data
                            ?.user;


                    const sessao =
                        resposta
                            ?.data
                            ?.session;


                    if (
                        sessao?.user
                    ) {

                        mostrarMensagem(
                            mensagemCriar,
                            "Conta criada com sucesso!",
                            "sucesso"
                        );


                        const destino =
                            sessionStorage.getItem(
                                "saravieiDestinoDepoisLogin"
                            );


                        sessionStorage.removeItem(
                            "saravieiDestinoDepoisLogin"
                        );


                        setTimeout(
                            function() {

                                if (destino) {

                                    window.location.href =
                                        destino;

                                } else {

                                    mostrarConta(
                                        sessao.user
                                    );

                                }

                            },
                            500
                        );


                        return;

                    }


                    if (usuario) {

                        mostrarMensagem(
                            mensagemCriar,
                            "Conta criada! Verifique seu e-mail para confirmar a conta antes de entrar.",
                            "sucesso"
                        );


                        formCriar.reset();


                        return;

                    }


                    throw new Error(
                        "A conta não pôde ser criada."
                    );

                } catch (erro) {

                    console.error(
                        "Erro ao criar conta:",
                        erro
                    );


                    let mensagem =
                        "Não foi possível criar sua conta.";


                    if (
                        erro?.message
                    ) {

                        mensagem =
                            erro.message;

                    }


                    mostrarMensagem(
                        mensagemCriar,
                        mensagem,
                        "erro"
                    );

                } finally {

                    botaoCriar.disabled =
                        false;

                    botaoCriar.textContent =
                        "Criar minha conta";

                }

            }
        );


        botaoEsqueci.addEventListener(
            "click",
            async function() {

                const email =
                    document
                        .getElementById(
                            "email-entrar"
                        )
                        .value
                        .trim();


                if (!email) {

                    mostrarMensagem(
                        mensagemEntrar,
                        "Digite seu e-mail primeiro para recuperar a senha.",
                        "erro"
                    );

                    return;

                }


                try {

                    const resposta =
                        await supabaseClient.auth.resetPasswordForEmail(
                            email,
                            {
                                redirectTo:
                                    window.location.origin +
                                    window.location.pathname
                            }
                        );


                    if (
                        resposta.error
                    ) {

                        throw resposta.error;

                    }


                    mostrarMensagem(
                        mensagemEntrar,
                        "Enviamos as instruções de recuperação para seu e-mail.",
                        "sucesso"
                    );

                } catch (erro) {

                    console.error(
                        "Erro na recuperação:",
                        erro
                    );


                    mostrarMensagem(
                        mensagemEntrar,
                        erro?.message ||
                        "Não foi possível enviar a recuperação de senha.",
                        "erro"
                    );

                }

            }
        );


        botaoSair.addEventListener(
            "click",
            async function() {

                botaoSair.disabled =
                    true;


                try {

                    const resposta =
                        await supabaseClient.auth.signOut();


                    if (
                        resposta.error
                    ) {

                        throw resposta.error;

                    }


                    mostrarFormularios();

                } catch (erro) {

                    console.error(
                        "Erro ao sair:",
                        erro
                    );


                    mostrarMensagem(
                        mensagemLogado,
                        "Não foi possível sair da conta.",
                        "erro"
                    );

                } finally {

                    botaoSair.disabled =
                        false;

                }

            }
        );


        botaoMeusPedidos.addEventListener(
            "click",
            function() {

                window.location.href =
                    "meus-pedidos.html";

            }
        );


        supabaseClient.auth.onAuthStateChange(
            function(
                evento,
                sessao
            ) {

                if (
                    sessao?.user
                ) {

                    mostrarConta(
                        sessao.user
                    );

                } else {

                    mostrarFormularios();

                }

            }
        );


        await verificarSessao();

    }
);