const SUPABASE_URL =
    "https://gmimzvnuvraletepczrp.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_NtJmSYaKmuQuLY2QvfQKLQ_rFA8Ceqx";


document.addEventListener(
    "DOMContentLoaded",
    function () {

        const formLogin =
            document.getElementById("form-login");

        const emailInput =
            document.getElementById("email");

        const senhaInput =
            document.getElementById("senha");

        const botaoEntrar =
            document.getElementById("botao-entrar");

        const mensagem =
            document.getElementById("mensagem");

        const esqueciSenha =
            document.getElementById("esqueci-senha");


        if (
            !formLogin ||
            !emailInput ||
            !senhaInput ||
            !botaoEntrar ||
            !mensagem ||
            !esqueciSenha
        ) {

            console.error(
                "ERRO: elementos do formulário de login não encontrados."
            );

            return;
        }


        if (
            !window.supabase ||
            typeof window.supabase.createClient !== "function"
        ) {

            mensagem.style.color =
                "#d8a6a6";

            mensagem.textContent =
                "O sistema de autenticação não foi carregado. Recarregue a página.";

            console.error(
                "ERRO: biblioteca Supabase não carregada."
            );

            return;
        }


        const supabaseClient =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY
            );


        console.log(
            "Saraviei: sistema de login carregado."
        );


        formLogin.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const email =
                    emailInput.value.trim();

                const senha =
                    senhaInput.value;


                if (!email || !senha) {

                    mensagem.style.color =
                        "#d8a6a6";

                    mensagem.textContent =
                        "Digite seu e-mail e sua senha.";

                    return;
                }


                botaoEntrar.disabled =
                    true;

                botaoEntrar.textContent =
                    "Entrando...";


                mensagem.style.color =
                    "#d1aa61";

                mensagem.textContent =
                    "Autenticando...";


                try {

                    /*
                     * =====================================================
                     * ETAPA 1 — LOGIN NO SUPABASE AUTH
                     * =====================================================
                     */

                    const {
                        data: loginData,
                        error: loginError
                    } =
                        await supabaseClient.auth.signInWithPassword({

                            email: email,

                            password: senha

                        });


                    if (loginError) {

                        console.error(
                            "ERRO ETAPA 1 — Supabase Auth:",
                            loginError
                        );

                        throw loginError;

                    }


                    if (
                        !loginData ||
                        !loginData.user
                    ) {

                        throw new Error(
                            "O Supabase não retornou o usuário autenticado."
                        );

                    }


                    console.log(
                        "Login Supabase realizado:",
                        loginData.user.id
                    );


                    mensagem.textContent =
                        "Usuário autenticado. Verificando acesso administrativo...";


                    /*
                     * =====================================================
                     * ETAPA 2 — CONFIRMAR SESSÃO
                     * =====================================================
                     */

                    const {
                        data: sessaoData,
                        error: sessaoError
                    } =
                        await supabaseClient.auth.getSession();


                    if (sessaoError) {

                        console.error(
                            "ERRO ETAPA 2 — Sessão:",
                            sessaoError
                        );

                        throw sessaoError;

                    }


                    if (
                        !sessaoData ||
                        !sessaoData.session
                    ) {

                        throw new Error(
                            "O login foi realizado, mas a sessão não foi encontrada."
                        );

                    }


                    console.log(
                        "Sessão confirmada."
                    );


                    /*
                     * =====================================================
                     * ETAPA 3 — VERIFICAR ADMIN
                     * =====================================================
                     */

                    mensagem.textContent =
                        "Verificando autorização administrativa...";


                    const {
                        data: administrador,
                        error: erroAdmin
                    } =
                        await supabaseClient
                            .from("admin_users")
                            .select(
                                "user_id, role, active"
                            )
                            .eq(
                                "user_id",
                                loginData.user.id
                            )
                            .eq(
                                "active",
                                true
                            )
                            .maybeSingle();


                    if (erroAdmin) {

                        console.error(
                            "ERRO ETAPA 3 — admin_users:",
                            erroAdmin
                        );

                        throw new Error(
                            "Não foi possível verificar seu acesso administrativo: " +
                            erroAdmin.message
                        );

                    }


                    if (!administrador) {

                        console.error(
                            "Usuário autenticado, mas não encontrado como administrador ativo."
                        );


                        await supabaseClient.auth.signOut();


                        throw new Error(
                            "Esta conta não possui acesso ao painel administrativo."
                        );

                    }


                    console.log(
                        "Administrador confirmado:",
                        administrador
                    );


                    /*
                     * =====================================================
                     * ETAPA 4 — REDIRECIONAR PARA O PAINEL
                     * =====================================================
                     */

                    mensagem.style.color =
                        "#d1aa61";

                    mensagem.textContent =
                        "Acesso autorizado. Abrindo o painel...";


                    /*
                     * Pequeno intervalo para garantir que
                     * a sessão esteja persistida.
                     */

                    setTimeout(
                        function () {

                            window.location.replace(
                                "admin.html"
                            );

                        },
                        300
                    );


                } catch (error) {

                    console.error(
                        "ERRO FINAL NO LOGIN:",
                        error
                    );


                    mensagem.style.color =
                        "#d8a6a6";


                    mensagem.textContent =
                        error.message ||
                        "Não foi possível entrar. Verifique seus dados.";


                    botaoEntrar.disabled =
                        false;


                    botaoEntrar.textContent =
                        "Entrar no painel";

                }

            }
        );


        /*
         * =========================================================
         * ESQUECI MINHA SENHA
         * =========================================================
         */

        esqueciSenha.addEventListener(
            "click",
            async function () {

                const email =
                    emailInput.value.trim();


                if (!email) {

                    mensagem.style.color =
                        "#d8a6a6";

                    mensagem.textContent =
                        "Digite seu e-mail primeiro.";

                    emailInput.focus();

                    return;
                }


                mensagem.style.color =
                    "#d1aa61";

                mensagem.textContent =
                    "Enviando e-mail de recuperação...";


                esqueciSenha.disabled =
                    true;


                try {

                    const {
                        error
                    } =
                        await supabaseClient.auth
                            .resetPasswordForEmail(
                                email,
                                {
                                    redirectTo:
                                        "http://127.0.0.1:5500/reset-password.html"
                                }
                            );


                    if (error) {

                        throw error;

                    }


                    mensagem.style.color =
                        "#d1aa61";


                    mensagem.textContent =
                        "E-mail enviado! Verifique sua caixa de entrada.";


                } catch (error) {

                    console.error(
                        "Erro ao enviar recuperação:",
                        error
                    );


                    mensagem.style.color =
                        "#d8a6a6";


                    mensagem.textContent =
                        error.message ||
                        "Não foi possível enviar o e-mail.";

                } finally {

                    esqueciSenha.disabled =
                        false;

                }

            }
        );

    }
);