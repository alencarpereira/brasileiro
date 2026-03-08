// ===============================
// UTILIDADES
// ===============================

function media(arr) {
    if (arr.length === 0) return 0
    return arr.reduce((a, b) => a + b, 0) / arr.length
}

function pegarNumeros(selector) {
    let els = document.querySelectorAll(selector)
    let valores = []
    els.forEach(e => {
        let v = parseFloat(e.value)
        if (!isNaN(v)) valores.push(v)
    })
    return valores
}

// ===============================
// POISSON
// ===============================

function fatorial(n) {
    if (n === 0) return 1
    let r = 1
    for (let i = 1; i <= n; i++) r *= i
    return r
}

function poisson(gols, media) {
    return (Math.pow(media, gols) * Math.exp(-media)) / fatorial(gols)
}

// ===============================
// BUSCAR TIME NA TABELA
// ===============================

function pegarTime(nome) {
    let linhas = document.querySelectorAll(".timeRow")
    for (let l of linhas) {
        let time = l.querySelector(".time").innerText.trim().toLowerCase()
        if (time === nome.toLowerCase()) {
            let gm = parseFloat(l.querySelector(".gm").innerText)
            let gc = parseFloat(l.querySelector(".gc").innerText)
            let pj = parseFloat(l.querySelectorAll("td")[3].innerText)
            gm = gm / pj
            gc = gc / pj
            let forma = l.querySelector(".forma").innerText
            return { gm, gc, forma }
        }
    }
    return null
}

// ===============================
// CALCULAR FORMA (ATUALIZADA)
// ===============================

function calcularForma(forma) {
    let pontos = 0
    let jogosValidos = 0
    forma.split(",").forEach(r => {
        if (r === "V") { pontos += 3; jogosValidos++ }
        else if (r === "E") { pontos += 1; jogosValidos++ }
        else if (r === "D") { jogosValidos++ } // derrota = 0 pontos mas conta o jogo
        // "N" ou qualquer outro caractere é ignorado
    })
    return jogosValidos > 0 ? pontos / (jogosValidos * 3) : 0
}

// ===============================
// CALCULAR
// ===============================

function calcular() {

    let casa = document.getElementById("timeCasa").value
    let fora = document.getElementById("timeFora").value
    if (!casa || !fora) { alert("Digite os dois times"); return }

    let tA = pegarTime(casa)
    let tB = pegarTime(fora)
    if (!tA || !tB) { alert("Time não encontrado na tabela"); return }

    // ===============================
    // DADOS DA TABELA
    // ===============================
    let ataqueA = tA.gm
    let defesaA = tA.gc
    let ataqueB = tB.gm
    let defesaB = tB.gc

    // ===============================
    // FORMA RELATIVA
    // ===============================
    let formaA = calcularForma(tA.forma)
    let formaB = calcularForma(tB.forma)

    // ===============================
    // ULTIMOS 5 INPUT
    // ===============================
    let golsA = media(pegarNumeros(".golsA"))
    let golsB = media(pegarNumeros(".golsB"))
    let sofridosA = media(pegarNumeros(".golsSofridosA"))
    let sofridosB = media(pegarNumeros(".golsSofridosB"))

    // ===============================
    // CONFRONTO DIRETO
    // ===============================
    let h2hCasa = media(pegarNumeros(".golsCasaDireto"))
    let h2hFora = media(pegarNumeros(".golsForaDireto"))

    // ===============================
    // GOLS ESPERADOS
    // ===============================
    let mediaCasa =
        (ataqueA * 0.35) +
        ((1 - defesaB) * 0.15) +
        (golsA * 0.25) +
        (sofridosB * 0.10) +
        (h2hCasa * 0.15)

    let mediaFora =
        (ataqueB * 0.35) +
        ((1 - defesaA) * 0.15) +
        (golsB * 0.25) +
        (sofridosA * 0.10) +
        (h2hFora * 0.15)

    // ===============================
    // APLICAR FORMA RELATIVA
    // ===============================
    mediaCasa *= (1 + (formaA - formaB) * 0.05)
    mediaFora *= (1 + (formaB - formaA) * 0.05)

    // ===============================
    // POISSON
    // ===============================
    let probCasa = 0, probFora = 0, probEmpate = 0
    let over25 = 0, btts = 0

    for (let i = 0; i <= 10; i++) {
        for (let j = 0; j <= 10; j++) {
            let p = poisson(i, mediaCasa) * poisson(j, mediaFora)
            if (i > j) probCasa += p
            if (j > i) probFora += p
            if (i === j) probEmpate += p
            if (i + j > 2) over25 += p
            if (i > 0 && j > 0) btts += p
        }
    }

    let under25 = 1 - over25

    // ===============================
    // NORMALIZAR PROBABILIDADE
    // ===============================
    let somaProb = probCasa + probEmpate + probFora
    probCasa /= somaProb
    probEmpate /= somaProb
    probFora /= somaProb

    // ===============================
    // ODDS
    // ===============================
    let oddCasa = parseFloat(document.getElementById("mercadoCasa").value)
    let oddEmpate = parseFloat(document.getElementById("mercadoEmpate").value)
    let oddFora = parseFloat(document.getElementById("mercadoVisitante").value)

    let mercadoCasa = 0, mercadoEmpate = 0, mercadoFora = 0
    let valueCasa = 0, valueEmpate = 0, valueFora = 0

    if (oddCasa && oddEmpate && oddFora) {
        mercadoCasa = 1 / oddCasa
        mercadoEmpate = 1 / oddEmpate
        mercadoFora = 1 / oddFora

        let soma = mercadoCasa + mercadoEmpate + mercadoFora
        mercadoCasa /= soma
        mercadoEmpate /= soma
        mercadoFora /= soma

        valueCasa = probCasa - mercadoCasa
        valueEmpate = probEmpate - mercadoEmpate
        valueFora = probFora - mercadoFora
    }

    // ===============================
    // DETECTAR MELHOR APOSTA
    // ===============================
    let apostas = [
        { nome: "Vitória Casa", value: valueCasa },
        { nome: "Empate", value: valueEmpate },
        { nome: "Vitória Visitante", value: valueFora }
    ]
    apostas.sort((a, b) => b.value - a.value)
    let melhorAposta = apostas[0]

    let mensagem = "❌ Nenhuma aposta de valor"
    if (melhorAposta.value > 0.10) mensagem = "🔥 APOSTA MUITO FORTE: " + melhorAposta.nome
    else if (melhorAposta.value > 0.05) mensagem = "✅ Boa aposta: " + melhorAposta.nome
    else if (melhorAposta.value > 0) mensagem = "⚠️ Pequeno valor: " + melhorAposta.nome

    // ===============================
    // SAÍDA
    // ===============================
    document.getElementById("resultado").innerHTML = `
<h3>${casa} x ${fora}</h3>

<b>⚽ Gols esperados</b><br>
${mediaCasa.toFixed(2)} x ${mediaFora.toFixed(2)}

<br><br>

<b>📊 Probabilidades</b><br>
Casa: ${(probCasa * 100).toFixed(1)}%<br>
Empate: ${(probEmpate * 100).toFixed(1)}%<br>
Fora: ${(probFora * 100).toFixed(1)}%

<br><br>

<b>📈 Mercados</b><br>
Over 2.5: ${(over25 * 100).toFixed(1)}%<br>
Under 2.5: ${(under25 * 100).toFixed(1)}%<br>
BTTS: ${(btts * 100).toFixed(1)}%

<br><br>

<b>🔥 Value Bet</b><br>
Casa: ${(valueCasa * 100).toFixed(1)}%<br>
Empate: ${(valueEmpate * 100).toFixed(1)}%<br>
Fora: ${(valueFora * 100).toFixed(1)}%

<br><br>

<b>🎯 Melhor aposta</b><br>
${mensagem}<br>
Value: ${(melhorAposta.value * 100).toFixed(1)}%
`
}

function preencherExemplo() {

    // TIMES

    document.getElementById("timeCasa").value = "Palmeiras"
    document.getElementById("timeFora").value = "Mirassol"

    // ODDS

    document.getElementById("mercadoCasa").value = 1.85
    document.getElementById("mercadoEmpate").value = 3.40
    document.getElementById("mercadoVisitante").value = 4.20
    document.getElementById("mercadoOver").value = 2.00
    document.getElementById("mercadoUnder").value = 1.85
    document.getElementById("mercadoBTTS").value = 1.95


    // ======================
    // ULTIMOS 5 TIME A
    // ======================

    let golsA = [2, 3, 1, 4, 2]
    let sofridosA = [1, 1, 0, 2, 1]

    document.querySelectorAll(".golsA").forEach((el, i) => {
        el.value = golsA[i]
    })

    document.querySelectorAll(".golsSofridosA").forEach((el, i) => {
        el.value = sofridosA[i]
    })


    // ======================
    // ULTIMOS 5 TIME B
    // ======================

    let golsB = [1, 2, 0, 1, 2]
    let sofridosB = [1, 1, 2, 1, 1]

    document.querySelectorAll(".golsB").forEach((el, i) => {
        el.value = golsB[i]
    })

    document.querySelectorAll(".golsSofridosB").forEach((el, i) => {
        el.value = sofridosB[i]
    })


    // ======================
    // CONFRONTO DIRETO
    // ======================

    let h2hCasa = [2, 1, 3, 1, 2]
    let h2hFora = [1, 1, 2, 0, 1]

    document.querySelectorAll(".golsCasaDireto").forEach((el, i) => {
        el.value = h2hCasa[i]
    })

    document.querySelectorAll(".golsForaDireto").forEach((el, i) => {
        el.value = h2hFora[i]
    })

}

// ===============================
// LIMPAR
// ===============================

function limpar() {

    document.querySelectorAll("input").forEach(i => i.value = "")

    document.getElementById("resultado").innerHTML = ""

}