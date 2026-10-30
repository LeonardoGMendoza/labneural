// LabNeural · Mundo real: a câmera reconhece objetos ao vivo (modelo COCO-SSD, treinado com fotos reais)
// e fala em português o que está vendo e onde. Base do app para quem não enxerga.
import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

const $ = (id) => document.getElementById(id);
const video = $('video'), tela = $('tela'), g = tela.getContext('2d');

// As 80 classes do COCO em português (gênero para a frase: m = masculino, f = feminino)
const NOMES = {
  person: ['Pessoa', 'f'], bicycle: ['Bicicleta', 'f'], car: ['Carro', 'm'], motorcycle: ['Moto', 'f'], airplane: ['Avião', 'm'],
  bus: ['Ônibus', 'm'], train: ['Trem', 'm'], truck: ['Caminhão', 'm'], boat: ['Barco', 'm'], 'traffic light': ['Semáforo', 'm'],
  'fire hydrant': ['Hidrante', 'm'], 'stop sign': ['Placa de pare', 'f'], 'parking meter': ['Parquímetro', 'm'], bench: ['Banco', 'm'],
  bird: ['Pássaro', 'm'], cat: ['Gato', 'm'], dog: ['Cachorro', 'm'], horse: ['Cavalo', 'm'], sheep: ['Ovelha', 'f'], cow: ['Vaca', 'f'],
  elephant: ['Elefante', 'm'], bear: ['Urso', 'm'], zebra: ['Zebra', 'f'], giraffe: ['Girafa', 'f'], backpack: ['Mochila', 'f'],
  umbrella: ['Guarda-chuva', 'm'], handbag: ['Bolsa', 'f'], tie: ['Gravata', 'f'], suitcase: ['Mala', 'f'], frisbee: ['Frisbee', 'm'],
  skis: ['Esqui', 'm'], snowboard: ['Snowboard', 'm'], 'sports ball': ['Bola', 'f'], kite: ['Pipa', 'f'], 'baseball bat': ['Taco', 'm'],
  'baseball glove': ['Luva', 'f'], skateboard: ['Skate', 'm'], surfboard: ['Prancha', 'f'], 'tennis racket': ['Raquete', 'f'],
  bottle: ['Garrafa', 'f'], 'wine glass': ['Taça', 'f'], cup: ['Copo', 'm'], fork: ['Garfo', 'm'], knife: ['Faca', 'f'], spoon: ['Colher', 'f'],
  bowl: ['Tigela', 'f'], banana: ['Banana', 'f'], apple: ['Maçã', 'f'], sandwich: ['Sanduíche', 'm'], orange: ['Laranja', 'f'],
  broccoli: ['Brócolis', 'm'], carrot: ['Cenoura', 'f'], 'hot dog': ['Cachorro-quente', 'm'], pizza: ['Pizza', 'f'], donut: ['Rosquinha', 'f'],
  cake: ['Bolo', 'm'], chair: ['Cadeira', 'f'], couch: ['Sofá', 'm'], 'potted plant': ['Vaso de planta', 'm'], bed: ['Cama', 'f'],
  'dining table': ['Mesa', 'f'], toilet: ['Vaso sanitário', 'm'], tv: ['Televisão', 'f'], laptop: ['Notebook', 'm'], mouse: ['Mouse', 'm'],
  remote: ['Controle remoto', 'm'], keyboard: ['Teclado', 'm'], 'cell phone': ['Celular', 'm'], microwave: ['Micro-ondas', 'm'],
  oven: ['Forno', 'm'], toaster: ['Torradeira', 'f'], sink: ['Pia', 'f'], refrigerator: ['Geladeira', 'f'], book: ['Livro', 'm'],
  clock: ['Relógio', 'm'], vase: ['Vaso', 'm'], scissors: ['Tesoura', 'f'], 'teddy bear': ['Ursinho', 'm'], 'hair drier': ['Secador', 'm'],
  toothbrush: ['Escova de dentes', 'f']
};
// O que importa para quem anda na rua: fala primeiro (perigo de esbarrar ou de trânsito)
const PRIORIDADE = { car: 10, bus: 10, truck: 10, motorcycle: 10, bicycle: 9, person: 8, 'traffic light': 7, 'stop sign': 7, dog: 6,
  bench: 5, chair: 5, 'fire hydrant': 5, 'parking meter': 5, 'potted plant': 4, 'dining table': 4, suitcase: 4 };

let modelo = null, rodando = false, falarLigado = true, ultimaFala = '', horaFala = 0, quadros = 0, t0 = performance.now();

function status(t) { $('status').textContent = t; }

// Onde está (esquerda / à frente / direita) e quão perto (pelo tamanho na imagem: é uma estimativa, não uma medida)
function descrever(d, W, H) {
  const [x, y, w, h] = d.bbox, cx = (x + w / 2) / W;
  const lado = cx < 0.35 ? 'à esquerda' : cx > 0.65 ? 'à direita' : 'à frente';
  const ocupa = (w * h) / (W * H), alto = h / H;
  const perto = ocupa > 0.25 || alto > 0.7 ? 'muito perto' : ocupa > 0.08 || alto > 0.4 ? 'perto' : 'longe';
  const [nome] = NOMES[d.class] || [d.class];
  return { nome, lado, perto, nota: (PRIORIDADE[d.class] || 1) * (perto === 'muito perto' ? 3 : perto === 'perto' ? 2 : 1) };
}

function vozPt() {
  if (!('speechSynthesis' in window)) return null;
  const v = speechSynthesis.getVoices().filter((x) => x.lang.replace('_', '-').toLowerCase().startsWith('pt'));
  return v.find((x) => x.lang.replace('_', '-') === 'pt-BR') || v[0] || null;
}
function falar(texto) {
  if (!falarLigado || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = 'pt-BR'; u.rate = 1.05;
  const v = vozPt(); if (v) u.voice = v;
  speechSynthesis.speak(u);
}

function desenhar(dets) {
  const W = tela.width, H = tela.height;
  g.clearRect(0, 0, W, H);
  g.lineWidth = Math.max(2, W / 250);
  g.font = `600 ${Math.max(14, W / 40)}px system-ui, sans-serif`;
  dets.forEach((d) => {
    const [x, y, w, h] = d.bbox, info = descrever(d, W, H);
    const cor = info.perto === 'muito perto' ? '#ef4444' : info.perto === 'perto' ? '#f59e0b' : '#22c55e';
    g.strokeStyle = cor; g.strokeRect(x, y, w, h);
    const rotulo = `${info.nome} ${Math.round(d.score * 100)}%`;
    const tw = g.measureText(rotulo).width + 12, th = Math.max(22, W / 30);
    g.fillStyle = cor; g.fillRect(x, Math.max(0, y - th), tw, th);
    g.fillStyle = '#0b0f0e'; g.fillText(rotulo, x + 6, Math.max(th - 6, y - 6));
  });
}

function narrar(dets) {
  const W = tela.width, H = tela.height;
  const itens = dets.map((d) => descrever(d, W, H)).sort((a, b) => b.nota - a.nota);
  $('lista').innerHTML = itens.length
    ? itens.map((i) => `<li><b>${i.nome}</b> ${i.lado}, ${i.perto}</li>`).join('')
    : '<li>Nada reconhecido agora</li>';
  if (!itens.length) return;
  const top = itens.slice(0, 2).map((i) => `${i.nome} ${i.lado}, ${i.perto}`);
  const frase = top.join('. ') + '.';
  const agora = Date.now();
  const mudou = frase !== ultimaFala, urgente = itens[0].perto === 'muito perto';
  // Fala quando a cena muda, repete o mais importante a cada 6 s, e não fala mais rápido que a cada 2,5 s
  if ((mudou && agora - horaFala > 2500) || (urgente && agora - horaFala > 4000) || agora - horaFala > 6000) {
    ultimaFala = frase; horaFala = agora; falar(frase);
  }
}

async function laco() {
  if (!rodando) return;
  if (video.readyState >= 2) {
    if (tela.width !== video.videoWidth) { tela.width = video.videoWidth; tela.height = video.videoHeight; }
    const dets = (await modelo.detect(video, 10, +$('limiar').value / 100));
    desenhar(dets); narrar(dets);
    quadros++;
    const dt = performance.now() - t0;
    if (dt > 1000) { $('fps').textContent = `${Math.round(quadros * 1000 / dt)} análises por segundo`; quadros = 0; t0 = performance.now(); }
  }
  requestAnimationFrame(laco);
}

async function ligar() {
  $('btnLigar').disabled = true;
  // destrava a voz no iPhone (precisa ser dentro do toque)
  if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); }
  try {
    status('Pedindo acesso à câmera…');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
    video.srcObject = stream;
    await video.play();
    if (!modelo) {
      status('Baixando o modelo treinado (uns 5 MB, só na primeira vez)…');
      modelo = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
    }
    status('Câmera ligada. Aponte para pessoas, carros, cadeiras, garrafas…');
    rodando = true; $('btnLigar').hidden = true; $('btnParar').hidden = false;
    falar('Câmera ligada. Vou te dizer o que estou vendo.');
    laco();
  } catch (e) {
    console.error(e);
    status(e && e.name === 'NotAllowedError'
      ? 'A câmera foi bloqueada. Libere em Ajustes > Safari > Câmera (ou no cadeado do navegador) e tente de novo.'
      : 'Não consegui ligar a câmera: ' + (e && e.message || e));
    $('btnLigar').disabled = false;
  }
}
function parar() {
  rodando = false;
  const s = video.srcObject; if (s) s.getTracks().forEach((t) => t.stop());
  video.srcObject = null; g.clearRect(0, 0, tela.width, tela.height);
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  $('btnParar').hidden = true; $('btnLigar').hidden = false; $('btnLigar').disabled = false;
  status('Câmera desligada.');
}

$('btnLigar').onclick = ligar;
$('btnParar').onclick = parar;
$('btnVoz').onclick = () => {
  falarLigado = !falarLigado;
  $('btnVoz').textContent = falarLigado ? 'Voz ligada' : 'Voz desligada';
  $('btnVoz').setAttribute('aria-pressed', String(falarLigado));
  if (!falarLigado && 'speechSynthesis' in window) speechSynthesis.cancel();
};
$('limiar').oninput = () => { $('limiarOut').textContent = $('limiar').value + '%'; };
if ('speechSynthesis' in window) speechSynthesis.getVoices();
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) status('Este navegador não dá acesso à câmera. Abra pelo Safari ou Chrome, com https.');
