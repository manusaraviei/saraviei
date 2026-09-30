const SUPABASE_URL =
    "https://gmimzvnuvraletepczrp.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_NtJmSYaKmuQuLY2QvfQKLQ_rFA8Ceqx";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


const formSenha =
    document.getElementById("form-senha");

const senhaInput =
    document.getElementById("senha");

const confirmarSenhaInput =
    document.getElementById("confirmar-senha");

const botao =
    document.getElementById("botao");

const mensagem =
    document.getElementById("mensagem");


formSenha.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const senha =
            senhaInput.value;

        const confirmarSenha =
            confirmarSenhaInput.value;


        mensagem.textContent = "";


        if (senha.length < 6) {

            mensagem.textContent =
                "A senha precisa ter pelo menos 6 caracteres.";

            return;
        }


        if (senha !== confirmarSenha) {

            mensagem.textContent =
                "As senhas não são iguais.";

            return;
        }


        botao.disabled = true;

        botao.textContent =
            "Salvando...";


        try {

            const {
                error
            } =
                await supabaseClient.auth.updateUser({
                    password: senha
                });


            if (error) {
                throw error;
            }


            mensagem.style.color =
                "#d1aa61";

            mensagem.textContent =
                "Senha alterada com sucesso!";


            botao.textContent =
                "Senha salva";


            setTimeout(
                async function () {

                    await supabaseClient.auth.signOut();

                    window.location.href =
                        "admin-login.html";

                },
                1800
            );


        } catch (error) {

            console.error(
                "Erro ao alterar senha:",
                error
            );


            mensagem.style.color =
                "#d8a6a6";

            mensagem.textContent =
                error.message ||
                "Não foi possível alterar a senha.";


            botao.disabled = false;

            botao.textContent =
                "Salvar nova senha";

        }

    }
);