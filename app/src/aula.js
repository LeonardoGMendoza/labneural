// Professor(a) do LabNeural: avatar realista (TalkingHead), voz neural e IA da Oracle pelo servidor do próprio LabNeural.
// Ele(a) explica cada lição, reage ao que o aluno faz no laboratório e responde perguntas por voz.
import { Professor, ehIOS, modoSom } from './professor.js';

const $ = (id) => document.getElementById(id);
const ler = (k, p) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : p; } catch (e) { return p; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

// Servidor do LabNeural (IA da Oracle + voz neural). ?api=... troca o servidor para testes, ex.: ?api=http://localhost:8000
const SERVIDOR = (() => {
  const q = new URLSearchParams(location.search).get('api');
  if (q) { gravar('ln.api', q); return q.replace(/\/$/, ''); }
  return (ler('ln.api', '') || 'https://labneural.sandlj.com.br').replace(/\/$/, '');
})();

const perfil = ler('ln.perfil', null) || { id: 'n' + Math.random().toString(36).slice(2, 10), genero: 'mulher', nome: '' };
gravar('ln.perfil', perfil);
const NOME = { mulher: 'Clara', homem: 'Rafael' };
const g = (fem, masc) => (perfil.genero === 'mulher' ? fem : masc);
const num = (x, casas = 2) => Number(x).toFixed(casas).replace('.', ',');

// ---------- falas de cada lição ----------
const FALAS = {
  geral: () => `Oi${perfil.nome ? ', ' + perfil.nome : ''}! Eu sou ${g('a', 'o')} ${NOME[perfil.genero]}, ${g('sua professora', 'seu professor')} de redes neurais. Aqui você não decora fórmula: você mexe na rede e vê ela aprender. Vamos começar pela lição um. Se tiver dúvida, é só me perguntar pelo microfone.`,
  1: () => 'Esse é um neurônio. Ele multiplica cada entrada por um peso, soma o bias e passa o resultado pela sigmoide. Mexe nos três controles e tenta fazer a tabela inteira acertar a porta AND. Depois aperta Treinar sozinho e compara com o que você fez.',
  2: () => 'Aqui tem uma camada oculta. Cada neurônio do meio traça uma reta, e o neurônio de saída junta todas elas. Aperta Treinar rede e olha o mapa de decisão: a fronteira vai se dobrar para separar o XOR.',
  3: () => 'Agora um problema de verdade: avisar uma pessoa cega sobre um obstáculo. Antes de treinar, mexe na distância e veja a rede chutar. Depois treina e compara o acerto no treino com o acerto no teste.',
  4: () => 'Para a rede, uma imagem é só uma grade de números. Desenha um círculo, um quadrado ou um triângulo aqui no quadro. Primeiro sem treinar, depois aperta Treinar rede e desenha de novo.'
};
const TITULOS = { 1: 'um neurônio e portas lógicas', 2: 'camada oculta e XOR', 3: 'aviso de obstáculo para cegos', 4: 'reconhecer imagens' };

// ---------- avatar ----------
let professor = null;
const status = (t) => { $('profStatus').textContent = t || ''; };
try { professor = new Professor($('prof')); } catch (e) { console.error(e); status('O 3D não funciona neste navegador, mas a voz funciona.'); }
async function mostrarProfessor() {
  if (!professor) return;
  status('Carregando…');
  try {
    await professor.mostrar(perfil.genero, (ev) => { if (ev.lengthComputable) status(`Carregando ${Math.round(ev.loaded / ev.total * 100)}%`); });
    status('');
  } catch (e) { console.error(e); status('Não consegui carregar o avatar.'); }
}

// ---------- voz: neural pelo servidor do LabNeural; se falhar, a voz do próprio aparelho ----------
const VOZES_NUVEM = [
  { url: SERVIDOR + '/api/voz', corpo: (texto) => ({ texto, idioma: 'pt', genero: perfil.genero }) }
];
function vozDoAparelho() {
  if (!('speechSynthesis' in window)) return null;
  const vozes = speechSynthesis.getVoices().filter(v => v.lang.replace('_', '-').toLowerCase().startsWith('pt'));
  const gen = perfil.genero === 'mulher' ? /female|mulher|luciana|francisca|helena|maria|google português/i : /male|homem|antonio|daniel|felipe/i;
  const nota = (v) => (v.lang.replace('_', '-') === 'pt-BR' ? 100 : 0) + (gen.test(v.name) ? 50 : 0) + (/natural|neural|online|premium|enhanced/i.test(v.name) ? 30 : 0);
  return vozes.sort((a, b) => nota(b) - nota(a))[0] || null;
}
if ('speechSynthesis' in window) speechSynthesis.getVoices();

let audioLiberado = false, comecou = false, fila = 0, nuvemFalhou = false;
function liberarAudio() { audioLiberado = true; professor && professor.liberarAudio(); }
document.addEventListener('click', liberarAudio, true);
document.addEventListener('touchend', liberarAudio, true);

async function falar(texto) {
  const id = ++fila;
  $('balao').textContent = texto;
  if (!professor || !audioLiberado) return;
  professor.parar();
  modoSom('playback');
  if (!nuvemFalhou || ehIOS) {
    for (const v of VOZES_NUVEM) {
      if (id !== fila) return;
      try { await professor.falarNuvem(texto, v.url, v.corpo(texto.slice(0, 600))); return; }
      catch (e) { console.warn('voz da nuvem falhou', v.url, e); }
    }
    if (!ehIOS) { nuvemFalhou = true; setTimeout(() => { nuvemFalhou = false; }, 30000); }
  }
  if (id !== fila) return;
  await professor.falarComVoz(texto, { lang: 'pt-BR', voz: vozDoAparelho() });
}
function calar() { fila++; professor && professor.parar(); }
const humor = (h) => professor && professor.humor(h);
const gesto = (n, s) => professor && professor.gesto(n, s);

// ---------- começar a aula ----------
function comecar() {
  if (comecou) return;
  comecou = true;
  liberarAudio();
  $('btnComecar').hidden = true;
  $('profCard').dataset.ativo = '1';
  professor && professor.acenar();
  humor('feliz');
  const id = fila + 1;
  jaApresentou.add(1);
  falar(FALAS.geral()).then(() => { if (fila === id && licaoAtual === 1) falar(FALAS[1]()); });
}
$('btnComecar').onclick = comecar;

// Explica a lição quando ela aparece na tela (uma vez) e no botão "Ouvir" de cada lição
const jaApresentou = new Set();
let licaoAtual = 1;
const obs = new IntersectionObserver((itens) => {
  itens.forEach((it) => {
    if (!it.isIntersecting) return;
    const n = +it.target.id.replace('licao-', '');
    licaoAtual = n;
    if (comecou && !jaApresentou.has(n)) { jaApresentou.add(n); calar(); falar(FALAS[n]()); }
  });
}, { threshold: 0.45 });
document.querySelectorAll('section.licao').forEach((s) => obs.observe(s));
document.querySelectorAll('[data-ouvir]').forEach((b) => b.onclick = () => {
  const n = +b.dataset.ouvir;
  if (!comecou) { comecar(); }
  licaoAtual = n; jaApresentou.add(n); calar(); falar(FALAS[n]());
});

// ---------- reações ao laboratório ----------
const disse = new Set();
let ultimaReacao = 0;
function reagir(texto, { h, gestoNome, chave, intervalo = 0 } = {}) {
  if (!comecou) { $('balao').textContent = texto; return; }
  if (chave) { if (disse.has(chave)) return; disse.add(chave); }
  if (intervalo && Date.now() - ultimaReacao < intervalo) return;
  ultimaReacao = Date.now();
  if (h) humor(h);
  if (gestoNome) gesto(gestoNome, 2);
  calar();
  falar(texto);
}
window.addEventListener('lab', (e) => {
  const d = e.detail;
  switch (d.nome) {
    case 'l1-pesos':
      if (d.porta !== 'xor' && d.acertos === 4) reagir(`Isso! As quatro linhas certas na porta ${d.porta.toUpperCase()}. Você acabou de fazer à mão o que o gradiente descendente faz sozinho.`, { h: 'feliz', gestoNome: 'thumbup', chave: 'l1-ok-' + d.porta });
      else if (d.porta !== 'xor' && d.acertos === 3) reagir('Falta só uma linha. Olha qual está errada e pensa: esse peso precisa subir ou descer?', { chave: 'l1-quase-' + d.porta });
      break;
    case 'l1-porta':
      if (d.porta === 'xor') reagir('XOR é traiçoeiro. Tenta acertar à mão e depois treina. Vou te contar um segredo: um neurônio sozinho não consegue.', { chave: 'l1-xor' });
      break;
    case 'l1-treino-fim':
      if (d.porta === 'xor' && d.perda > 0.15) reagir('Viu? A perda travou. Um neurônio só sabe traçar uma reta, e no XOR nenhuma reta separa os pontos. Na lição dois a gente resolve isso com uma camada oculta.', { h: 'carinho', gestoNome: 'shrug' });
      else reagir(`Pronto! A perda caiu para ${num(d.perda, 3)}. Olha os pesos que ela achou e compara com os que você tentou.`, { h: 'feliz', gestoNome: 'thumbup' });
      break;
    case 'l2-treino-fim':
      if (d.perda < 0.02) reagir('Resolvido! Olha o mapa de decisão: a fronteira se dobrou. Isso só foi possível porque os neurônios ocultos trabalharam juntos.', { h: 'feliz', gestoNome: 'thumbup' });
      else reagir('A rede ficou presa num mínimo local, como uma bola que parou num buraco que não é o mais fundo. Clica em Pesos aleatórios e treina de novo.', { h: 'carinho' });
      break;
    case 'l3-regra':
      reagir(`Você mudou a regra para ${num(d.lim, 1)} metros. A rede ainda pensa do jeito antigo. Treina de novo e ela aprende a regra nova sozinha, sem mudar nenhuma linha de código.`);
      break;
    case 'l3-teste':
      if (!d.treinada && !d.certo) reagir(`Errei, né? Ainda não treinei, estou só chutando.`, { h: 'carinho', chave: 'l3-chute' });
      else if (d.treinada) reagir(`A ${num(d.d, 1)} metros ${d.frente ? 'na frente' : 'do lado'}, eu ${d.avisa ? 'aviso a pessoa' : g('fico quieta', 'fico quieto')}. ${d.certo ? 'Certo!' : 'Hum, essa eu errei.'}`, { intervalo: 6000, h: d.certo ? 'feliz' : 'carinho' });
      break;
    case 'l3-treino-fim':
      reagir(`Acerto no treino: ${d.acTr.replace('.', ',')}. No teste: ${d.acTe.replace('.', ',')}. O teste é o que importa, porque são exemplos que a rede nunca viu. Se os dois estão parecidos, ela aprendeu de verdade e não só decorou.`, { h: 'feliz' });
      break;
    case 'l4-treino-inicio':
      reagir('Estou gerando mil e quinhentas formas para a rede estudar. Olha os detectores aparecendo enquanto ela treina.');
      break;
    case 'l4-treino-fim':
      reagir(`Treinada, com ${d.ac.replace('.', ',')} de acerto no teste. Agora desenha uma forma para eu ver.`, { h: 'feliz', gestoNome: 'thumbup' });
      break;
    case 'l4-desenho': {
      if (!d || d.vazio) break;
      const pct = Math.round(d.prob * 100), forma = d.classe.toLowerCase();
      if (!d.treinada) reagir(`Hum, eu chutaria ${forma}, mas ainda não treinei, então não confia em mim. Aperta Treinar rede.`, { intervalo: 4000 });
      else if (pct >= 80) reagir(`Isso é um ${forma}! Tenho ${pct} por cento de certeza.`, { h: 'feliz', intervalo: 2500 });
      else reagir(`Acho que é um ${forma}, mas não tenho certeza: ${pct} por cento. Será que ela viu exemplos parecidos com esse no treino?`, { h: 'carinho', intervalo: 2500 });
      break;
    }
  }
});

// ---------- perguntas: IA do servidor, ou o glossário quando não houver servidor ----------
const GLOSSARIO = [
  [/\bpeso/, 'O peso diz quanto cada entrada importa. Peso grande e positivo puxa a resposta para cima; negativo puxa para baixo. Treinar uma rede é achar bons pesos.'],
  [/\bbias|vies/, 'O bias é um número somado no fim, que desloca a decisão do neurônio. É como mudar o ponto de partida: mesmo com entradas zero, ele pode responder alguma coisa.'],
  [/sigmoid/, 'A sigmoide transforma qualquer número num valor entre zero e um. Números muito negativos viram quase zero, muito positivos viram quase um.'],
  [/relu/, 'A ReLU é uma ativação simples: se o número é negativo vira zero, se é positivo continua igual. Ela treina rápido e é muito usada em redes grandes.'],
  [/perda|loss|erro/, 'A perda mede o tamanho do erro da rede. O treino inteiro é para fazer esse número cair. Quanto mais perto de zero, melhor.'],
  [/backprop|retropropag|propagacao para tras/, 'Backpropagation é o jeito de descobrir quanto cada peso contribuiu para o erro. O erro da saída é levado para trás, camada por camada, usando a regra da cadeia.'],
  [/gradiente|descendente/, 'O gradiente descendente ajusta cada peso um pouquinho na direção que diminui o erro. É como descer uma montanha no escuro, sempre pelo lado que desce.'],
  [/epoca/, 'Uma época é quando a rede vê todos os exemplos de treino uma vez. Treinar por várias épocas é repetir a lição várias vezes.'],
  [/camada oculta|oculta/, 'A camada oculta fica entre a entrada e a saída. Cada neurônio dela aprende um pedaço do problema, e juntos resolvem coisas que um neurônio sozinho não resolve, como o XOR.'],
  [/\bxor\b/, 'No XOR a resposta é um quando as entradas são diferentes. Não existe uma reta que separe os casos, por isso um neurônio só não resolve e precisamos de camada oculta.'],
  [/minimo local/, 'Mínimo local é quando a rede para num erro que não é o menor possível, como uma bola parada num buraco raso. Recomeçar com outros pesos aleatórios costuma resolver.'],
  [/teste|treino|decor|overfit/, 'Os dados de treino são para a rede aprender; os de teste ela nunca viu. Se acerta muito no treino e pouco no teste, ela decorou em vez de aprender. Isso se chama overfitting.'],
  [/taxa de aprendizado|learning rate/, 'A taxa de aprendizado é o tamanho do passo em cada ajuste. Pequena demais, demora muito; grande demais, a rede pula de um lado para o outro e não aprende.'],
  [/pixel|imagem|cnn|convolu/, 'Para a rede, uma imagem é uma grade de números, um por pixel. As redes convolucionais, as CNNs, olham pedacinhos da imagem de cada vez e são as usadas em câmeras e no app para cegos.'],
  [/softmax|probabilidade|porcent/, 'A softmax transforma as saídas da rede em porcentagens que somam cem. Assim dá para dizer, por exemplo, setenta por cento círculo e trinta por cento quadrado.'],
  [/neuronio/, 'Um neurônio artificial multiplica cada entrada por um peso, soma tudo com o bias e passa por uma função de ativação. É uma conta simples; o poder vem de juntar muitos.']
];
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function social(texto) {
  const n = norm(texto);
  const mn = n.match(/(?:me chamo|meu nome e|sou o|sou a)\s+([a-z]+)/);
  if (mn) { perfil.nome = mn[1][0].toUpperCase() + mn[1].slice(1); gravar('ln.perfil', perfil); return `Prazer, ${perfil.nome}! Vou lembrar do seu nome.`; }
  if (/(como vai|tudo bem|como voce esta)/.test(n)) return 'Estou ótima, obrigada! Vamos treinar umas redes?'.replace('ótima', g('ótima', 'ótimo')).replace('obrigada', g('obrigada', 'obrigado'));
  if (/(obrigad|valeu)/.test(n)) return 'De nada! Estou aqui para isso.';
  if (/(tchau|ate logo|ate mais)/.test(n)) return 'Até logo! Bons estudos.';
  if (/^(oi|ola|bom dia|boa tarde|boa noite|e ai)\b/.test(n) && n.split(' ').length <= 5) return `Oi${perfil.nome ? ', ' + perfil.nome : ''}! O que vamos aprender agora?`;
  return null;
}
async function perguntar(texto) {
  const s = social(texto);
  if (s) return { resposta: s, humor: 'feliz' };
  try {
    const r = await fetch(SERVIDOR + '/api/tutor', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aluno: perfil.id, nome: perfil.nome || '', texto, idioma: 'pt', tema: 'Lição ' + licaoAtual + ': ' + TITULOS[licaoAtual], genero: perfil.genero })
    });
    if (r.ok) { const d = await r.json(); if (d.modo === 'ia' && d.resposta) return d; }
  } catch (e) { /* sem servidor: usa o glossário */ }
  const n = norm(texto), item = GLOSSARIO.find(([re]) => re.test(n));
  return { resposta: item ? item[1] : 'Boa pergunta! Ainda não sei responder essa sem o servidor ligado. Tenta perguntar sobre peso, bias, perda, gradiente ou camada oculta.', humor: 'neutro' };
}
async function responder(texto) {
  texto = (texto || '').trim();
  if (!texto) return;
  if (!comecou) comecar();
  $('balao').textContent = '“' + texto + '”';
  estadoMic('pensando');
  const r = await perguntar(texto);
  estadoMic('pronto');
  humor(r.humor || 'neutro');
  calar();
  falar(r.resposta);
}
$('formPerg').onsubmit = (e) => { e.preventDefault(); const t = $('txtPerg').value; $('txtPerg').value = ''; responder(t); };

// ---------- microfone ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, ouvindo = false, ouvido = '';
function estadoMic(e) { $('mic').dataset.estado = e; $('mic').setAttribute('aria-label', e === 'ouvindo' ? 'Ouvindo… toque para parar' : 'Falar com ' + g('a professora', 'o professor')); }
if (SR) {
  rec = new SR(); rec.lang = 'pt-BR'; rec.interimResults = true; rec.continuous = false;
  rec.onresult = (e) => {
    let txt = '', final = false;
    for (const r of e.results) { txt += r[0].transcript; if (r.isFinal) final = true; }
    ouvido = txt; $('balao').textContent = '“' + txt + '”';
    if (final) { ouvindo = false; try { rec.abort(); } catch (er) {} modoSom('playback'); const f = ouvido; ouvido = ''; responder(f); }
  };
  rec.onerror = (e) => { modoSom('playback'); ouvindo = false; ouvido = ''; estadoMic('pronto'); if (e.error === 'not-allowed') $('balao').textContent = 'O microfone está bloqueado. Libere nas configurações do navegador ou escreva a pergunta.'; };
  rec.onend = () => { modoSom('playback'); if (!ouvindo) return; ouvindo = false; if (ouvido) { const f = ouvido; ouvido = ''; responder(f); } else estadoMic('pronto'); };
}
$('mic').onclick = (e) => {
  e.stopPropagation(); liberarAudio();
  if (!comecou) { comecar(); return; }
  if (!rec) { $('balao').textContent = 'Este navegador não reconhece voz. Escreva a pergunta no campo abaixo.'; return; }
  if ($('mic').dataset.estado === 'pensando') return;
  if (ouvindo) { try { rec.stop(); } catch (er) {} return; }
  calar();
  try { modoSom('play-and-record'); ouvido = ''; rec.start(); ouvindo = true; estadoMic('ouvindo'); } catch (er) { estadoMic('pronto'); }
};

// ---------- trocar professor(a) e recolher o cartão no celular ----------
function rotulos() {
  $('btnTrocarProf').textContent = 'Trocar para ' + (perfil.genero === 'mulher' ? 'o professor Rafael' : 'a professora Clara');
  $('btnComecar').textContent = 'Começar aula com ' + g('a professora', 'o professor') + ' ' + NOME[perfil.genero];
  $('txtPerg').placeholder = 'Pergunte ' + g('à professora', 'ao professor') + '…';
  $('profNome').textContent = g('Professora ', 'Professor ') + NOME[perfil.genero];
  document.querySelectorAll('[data-ouvir]').forEach((b) => { b.textContent = 'Ouvir ' + g('a professora', 'o professor'); });
}
$('btnTrocarProf').onclick = async () => {
  calar();
  perfil.genero = perfil.genero === 'mulher' ? 'homem' : 'mulher';
  gravar('ln.perfil', perfil); rotulos();
  await mostrarProfessor();
  if (comecou) { professor && professor.acenar(); falar(`Oi! Agora sou eu, ${g('a', 'o')} ${NOME[perfil.genero]}. Vamos continuar.`); }
};
$('btnRecolher').onclick = () => {
  const c = $('profCard'), fechado = c.dataset.recolhido === '1';
  c.dataset.recolhido = fechado ? '0' : '1';
  $('btnRecolher').textContent = fechado ? 'Recolher' : 'Mostrar';
  $('btnRecolher').setAttribute('aria-expanded', String(fechado));
};

rotulos();
estadoMic('pronto');
$('balao').textContent = `Oi! Eu sou ${g('a', 'o')} ${NOME[perfil.genero]}. Toque em Começar aula para eu explicar cada lição em voz alta.`;
mostrarProfessor();
