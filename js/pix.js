/**
 * Gerador de código PIX Copia e Cola (padrão EMV / BR Code - Banco Central do Brasil).
 */
(() => {
    function limparTexto(texto, maxLen) {
        return String(texto || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^A-Za-z0-9 .\-]/g, '')
            .trim()
            .slice(0, maxLen) || 'LOJA';
    }

    function emvField(id, value) {
        const str = String(value ?? '');
        const len = String(str.length).padStart(2, '0');
        return `${id}${len}${str}`;
    }

    function crc16Ccitt(payload) {
        let crc = 0xffff;
        for (let i = 0; i < payload.length; i++) {
            crc ^= payload.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : (crc << 1);
                crc &= 0xffff;
            }
        }
        return crc.toString(16).toUpperCase().padStart(4, '0');
    }

    function gerarPixCopiaECola({ chave, titular, cidade, valor, txid = '***' }) {
        const chaveLimpa = String(chave || '').trim();
        if (!chaveLimpa) {
            throw new Error('Chave PIX não configurada. Preencha em Admin > Dados da Empresa.');
        }

        const merchantAccount = emvField('00', 'BR.GOV.BCB.PIX') + emvField('01', chaveLimpa);
        const valorNum = Number(valor || 0);
        const txidLimpo = String(txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';

        const partes = [
            emvField('00', '01'),
            emvField('26', merchantAccount),
            emvField('52', '0000'),
            emvField('53', '986'),
            valorNum > 0 ? emvField('54', valorNum.toFixed(2)) : '',
            emvField('58', 'BR'),
            emvField('59', limparTexto(titular || 'ENCANTO DO ACAI', 25).toUpperCase()),
            emvField('60', limparTexto(cidade || 'BRASIL', 15).toUpperCase()),
            emvField('62', emvField('05', txidLimpo)),
            '6304',
        ].join('');

        return `${partes}${crc16Ccitt(partes)}`;
    }

    window.EncantoPix = {
        gerarPixCopiaECola,
    };
})();
