(() => {
    // Fonte única de versão/build. Atualize a cada release.
    const APP = { versao: '1.8.9', build: '20261120.1635' };
    window.ENCANTO_APP = APP;

    function aplicarVersaoNoRodape() {
        const rodapes = document.querySelectorAll('footer');
        rodapes.forEach((rodape) => {
            if (rodape.querySelector('[data-versao-build]')) return;

            const assinatura = Array.from(rodape.querySelectorAll('p'))
                .find((p) => /Desenvolvido por/i.test(p.textContent));
            if (!assinatura) return;

            const linkVersao = assinatura.querySelector('a[href*="CHANGELOG"]');
            if (linkVersao) linkVersao.textContent = `v${APP.versao}`;

            const info = document.createElement('p');
            info.setAttribute('data-versao-build', '');
            info.className = 'text-sm text-slate-300 text-center font-semibold pb-2';
            info.textContent = `Versão ${APP.versao} • Build ${APP.build}`;
            assinatura.parentNode.insertBefore(info, assinatura);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', aplicarVersaoNoRodape);
    } else {
        aplicarVersaoNoRodape();
    }
})();
