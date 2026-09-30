// ============================================
// SARAVIEI — CABEÇALHO DO CLIENTE
// ============================================

document.addEventListener("DOMContentLoaded", async function () {

    const botaoConta = document.querySelector(".botao-conta");
    const botaoNotificacoes = document.querySelector(".botao-notificacoes");

    if (!botaoConta) {
        return;
    }

    // Configuração do Supabase
    const SUPABASE_URL = "https://gmimzvnuvraletepczrp.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_NtJmSYaKmuQuLY2QvfQKLQ_rFA8Ceqx";

    // Aguarda o Supabase estar disponível, caso a página carregue a biblioteca antes.
    if (!window.supabase || !window.supabase.createClient) {
        return;
    }

    const clienteSupabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    try {

        const resultado = await clienteSupabase.auth.getUser();

        const usuario = resultado?.data?.user;

        if (usuario) {

            botaoConta.textContent = "Minha conta";
            botaoConta.href = "cliente-login.html";

            if (botaoNotificacoes) {
                botaoNotificacoes.title = "Acompanhar meus pedidos";
                botaoNotificacoes.setAttribute(
                    "aria-label",
                    "Acompanhar meus pedidos"
                );
            }

        } else {

            botaoConta.textContent = "Entrar";
            botaoConta.href = "cliente-login.html";

        }

    } catch (erro) {

        console.warn(
            "Não foi possível verificar o login do cliente.",
            erro
        );

    }

});
