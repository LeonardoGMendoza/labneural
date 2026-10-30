// Lições do LabNeural: as redes treinam no navegador e avisam o professor do que acontece (evento "lab").
export function avisar(nome,dados={}){window.dispatchEvent(new CustomEvent('lab',{detail:{nome,...dados}}));}
const _tempos={};
function avisarDepois(nome,fn,ms=1200){clearTimeout(_tempos[nome]);_tempos[nome]=setTimeout(()=>avisar(nome,fn()),ms);}

const $=id=>document.getElementById(id);
const sig=z=>1/(1+Math.exp(-z));
const rn=()=>{const u=Math.random()||1e-9,v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const X4=[[0,0],[0,1],[1,0],[1,1]];
const PORTAS={and:[0,0,0,1],or:[0,1,1,1],xor:[0,1,1,0]};

function desenhar(cv,hist){
  const r=cv.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  cv.width=Math.max(1,r.width*dpr);cv.height=Math.max(1,r.height*dpr);
  const g=cv.getContext('2d');g.scale(dpr,dpr);const w=r.width,h=r.height,p=10;
  g.clearRect(0,0,w,h);g.strokeStyle=css('--grid');g.lineWidth=1;
  for(let i=1;i<4;i++){const y=p+(h-2*p)*i/4;g.beginPath();g.moveTo(p,y);g.lineTo(w-p,y);g.stroke();}
  if(hist.length<2){g.fillStyle=css('--muted');g.font='12px "IBM Plex Mono",monospace';g.fillText('Treine para ver a perda caindo',p+4,h/2);return;}
  const mx=Math.max(...hist)||1;
  g.beginPath();hist.forEach((v,i)=>{const x=p+(w-2*p)*i/(hist.length-1),y=h-p-(h-2*p)*v/mx;i?g.lineTo(x,y):g.moveTo(x,y);});
  g.strokeStyle=css('--signal');g.lineWidth=2;g.stroke();
  const ult=hist[hist.length-1],ex=w-p,ey=h-p-(h-2*p)*ult/mx;
  g.fillStyle=css('--signal');g.beginPath();g.arc(ex,ey,3.5,0,7);g.fill();
}
function hex(c){c=c.replace('#','');if(c.length===3)c=c.split('').map(h=>h+h).join('');return[0,2,4].map(i=>parseInt(c.substr(i,2),16));}
function mistura(a,b,t){return`rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(',')})`;}
function prep(cv){const r=cv.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=r.width||300,h=r.height||300;cv.width=w*dpr;cv.height=h*dpr;const g=cv.getContext('2d');g.scale(dpr,dpr);g.clearRect(0,0,w,h);return{g,w,h};}

/* Desenho da rede: camadas = [nº entrada, nº oculta?, 1]; pesos = lista de matrizes [de][para] */
function desenharRede(cv,camadas,pesos,rotulos){
  const{g,w,h}=prep(cv),pos=[],m=24,R=Math.min(12,h/(2*Math.max(...camadas)+2));
  camadas.forEach((n,c)=>{const x=m+R+(w-2*m-2*R)*c/(camadas.length-1);pos[c]=[];for(let i=0;i<n;i++)pos[c].push([x,h*(i+1)/(n+1)]);});
  const pos_=hex(css('--signal')),neg=hex(css('--error'));
  pesos.forEach((M,c)=>M.forEach((lin,i)=>lin.forEach((wt,j)=>{
    const a=pos[c][i],b=pos[c+1][j];g.strokeStyle=wt>=0?`rgb(${pos_})`:`rgb(${neg})`;
    g.globalAlpha=Math.min(1,.25+Math.abs(wt)/6);g.lineWidth=Math.min(8,.6+Math.abs(wt)*.9);
    g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();})));
  g.globalAlpha=1;g.font='11px "IBM Plex Mono",monospace';g.textAlign='center';
  pos.forEach((col,c)=>col.forEach(([x,y],i)=>{g.beginPath();g.arc(x,y,R,0,7);g.fillStyle=css('--paper');g.fill();g.lineWidth=1.5;g.strokeStyle=css('--ink');g.stroke();
    const t=rotulos&&rotulos[c]&&rotulos[c][i];if(t){g.fillStyle=css('--muted');g.fillText(t,x,y+R+12);}}));
}
/* Mapa de decisão: f(x1,x2) -> probabilidade; pontos = [[x1,x2,alvo]] */
function desenharMapa(cv,f,pontos){
  const{g,w,h}=prep(cv),N=36,p=14,bg=hex(css('--paper')),s=hex(css('--signal')),e=hex(css('--error'));
  const cw=(w-2*p)/N,ch=(h-2*p)/N;
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x1=(i+.5)/N,x2=1-(j+.5)/N,v=f(x1,x2);
    g.fillStyle=v>=.5?mistura(bg,s,Math.min(1,(v-.5)*1.6)*.75):mistura(bg,e,Math.min(1,(.5-v)*1.6)*.55);g.fillRect(p+i*cw,p+j*ch,cw+.5,ch+.5);}
  g.strokeStyle=css('--line');g.lineWidth=1;g.strokeRect(p,p,w-2*p,h-2*p);
  g.font='10px "IBM Plex Mono",monospace';g.fillStyle=css('--muted');g.textAlign='left';g.fillText('x1 →',w-p-30,h-3);g.save();g.translate(10,p+34);g.rotate(-Math.PI/2);g.fillText('x2 →',0,0);g.restore();
  pontos.forEach(([x1,x2,t])=>{const x=p+x1*(w-2*p),y=p+(1-x2)*(h-2*p);g.beginPath();g.arc(x,y,9,0,7);g.fillStyle=t?css('--signal'):css('--error');g.fill();g.lineWidth=2;g.strokeStyle=css('--paper');g.stroke();
    g.fillStyle=css('--paper');g.textAlign='center';g.font='500 10px "IBM Plex Mono",monospace';g.fillText(t,x,y+3.5);});
}
/* Faixa da lição 3: distância 0–5 m em duas linhas (à frente / ao lado) */
function desenharFaixa(cv,f,limite,dist,posSel){
  const{g,w,h}=prep(cv),esq=78,dir=12,top=10,lh=38,N=100,bg=hex(css('--paper')),s=hex(css('--error')),ok=hex(css('--signal'));
  const larg=w-esq-dir;
  [['À frente',1],['Ao lado',0]].forEach(([nome,c],r)=>{const y=top+r*(lh+8);
    for(let i=0;i<N;i++){const d=(i+.5)/N*5,v=f(d,c);g.fillStyle=v>=.5?mistura(bg,s,.25+(v-.5)*1.2):mistura(bg,ok,(.5-v)*.5);g.fillRect(esq+larg*i/N,y,larg/N+.5,lh);}
    g.fillStyle=css('--ink');g.font='12px "IBM Plex Sans",sans-serif';g.textAlign='left';g.fillText(nome,4,y+lh/2+4);
    if(c===posSel){const x=esq+larg*dist/5;g.fillStyle=css('--ink');g.beginPath();g.moveTo(x,y-1);g.lineTo(x-6,y-9);g.lineTo(x+6,y-9);g.fill();g.fillRect(x-1,y,2,lh);}});
  const xl=esq+larg*limite/5;g.setLineDash([4,4]);g.strokeStyle=css('--ink');g.lineWidth=1.5;g.beginPath();g.moveTo(xl,top-2);g.lineTo(xl,top+lh);g.stroke();g.setLineDash([]);
  g.fillStyle=css('--muted');g.font='10px "IBM Plex Mono",monospace';g.textAlign='center';
  for(let m=0;m<=5;m++){const x=esq+larg*m/5;g.fillText(m+' m',Math.min(w-14,Math.max(esq+8,x)),h-4);}
}
function pesosRede(r){return[r.W1,r.W2.map(v=>[v])];}
function linha(x,esp,s){const ok=(s>.5)===(esp===1);return `<tr><td>${x[0]}</td><td>${x[1]}</td><td>${esp}</td><td>${s.toFixed(3)}</td><td class="${ok?'ok':'err'}">${ok?'acertou':'errou'}</td></tr>`;}

/* Rede genérica: entradas -> oculta (sigmoid) -> 1 saída (sigmoid) */
function Rede(ni,nh){
  this.ni=ni;this.nh=nh;
  this.W1=[...Array(ni)].map(()=>[...Array(nh)].map(rn));this.b1=Array(nh).fill(0);
  this.W2=[...Array(nh)].map(rn);this.b2=0;
}
Rede.prototype.fwd=function(x){const a1=[];for(let j=0;j<this.nh;j++){let z=this.b1[j];for(let i=0;i<this.ni;i++)z+=x[i]*this.W1[i][j];a1[j]=sig(z);}let z=this.b2;for(let j=0;j<this.nh;j++)z+=a1[j]*this.W2[j];return{a1,a2:sig(z)};};
Rede.prototype.epoca=function(X,Y,lr){
  const n=X.length,nh=this.nh,ni=this.ni;const gW1=[...Array(ni)].map(()=>Array(nh).fill(0)),gb1=Array(nh).fill(0),gW2=Array(nh).fill(0);let gb2=0,perda=0;
  for(let k=0;k<n;k++){const{a1,a2}=this.fwd(X[k]);const e=a2-Y[k];perda+=e*e;const d2=e*a2*(1-a2);gb2+=d2;
    for(let j=0;j<nh;j++){gW2[j]+=a1[j]*d2;const d1=d2*this.W2[j]*a1[j]*(1-a1[j]);gb1[j]+=d1;for(let i=0;i<ni;i++)gW1[i][j]+=X[k][i]*d1;}}
  for(let j=0;j<nh;j++){this.W2[j]-=lr*gW2[j]/n;this.b1[j]-=lr*gb1[j]/n;for(let i=0;i<ni;i++)this.W1[i][j]-=lr*gW1[i][j]/n;}
  this.b2-=lr*gb2/n;return perda/n;
};
function animar(total,porQuadro,passo,fim){let ep=0;const f=()=>{for(let k=0;k<porQuadro&&ep<total;k++,ep++)passo(ep);if(ep<total)requestAnimationFrame(f);else fim();};requestAnimationFrame(f);}

/* ---------- Lição 1 ---------- */
const L1={hist:[],rodando:false};
function l1ler(){return[+$('l1w1').value,+$('l1w2').value,+$('l1b').value];}
function l1mostrar(){
  const[w1,w2,b]=l1ler(),Y=PORTAS[$('l1porta').value];
  $('l1w1o').textContent=w1.toFixed(1);$('l1w2o').textContent=w2.toFixed(1);$('l1bo').textContent=b.toFixed(1);
  let perda=0,acertos=0,h='';
  X4.forEach((x,i)=>{const s=sig(w1*x[0]+w2*x[1]+b);perda+=(s-Y[i])**2;if((s>.5)===(Y[i]===1))acertos++;h+=linha(x,Y[i],s);});
  $('l1tab').innerHTML=h;L1.acertos=acertos;
  desenharRede($('l1rede'),[2,1],[[[w1],[w2]]],[['x1','x2'],['saída']]);
  desenharMapa($('l1mapa'),(a,c)=>sig(w1*a+w2*c+b),X4.map((x,i)=>[x[0],x[1],Y[i]]));
  if(!L1.rodando)$('l1status').textContent=`perda = ${(perda/4).toFixed(4)} · ${acertos}/4 certos`;
  return perda/4;
}
['l1w1','l1w2','l1b'].forEach(id=>$(id).addEventListener('input',()=>{if(!L1.rodando){L1.hist=[];desenhar($('l1graf'),L1.hist);l1mostrar();avisarDepois('l1-pesos',()=>({acertos:L1.acertos,porta:$('l1porta').value}));}}));
$('l1porta').addEventListener('change',()=>{L1.hist=[];desenhar($('l1graf'),L1.hist);l1mostrar();avisar('l1-porta',{porta:$('l1porta').value,acertos:L1.acertos});});
$('l1zerar').addEventListener('click',()=>{if(L1.rodando)return;$('l1w1').value=rn().toFixed(1);$('l1w2').value=rn().toFixed(1);$('l1b').value=0;L1.hist=[];desenhar($('l1graf'),L1.hist);l1mostrar();});
$('l1treinar').addEventListener('click',()=>{
  if(L1.rodando)return;L1.rodando=true;L1.hist=[];avisar('l1-treino-inicio',{porta:$('l1porta').value});let[w1,w2,b]=l1ler();const Y=PORTAS[$('l1porta').value],lr=1;
  animar(3000,30,ep=>{
    let g1=0,g2=0,gb=0,perda=0;
    X4.forEach((x,i)=>{const s=sig(w1*x[0]+w2*x[1]+b),e=s-Y[i];perda+=e*e;const d=e*s*(1-s);g1+=x[0]*d;g2+=x[1]*d;gb+=d;});
    w1-=lr*g1;w2-=lr*g2;b-=lr*gb;
    const cl=v=>Math.max(-10,Math.min(10,v));w1=cl(w1);w2=cl(w2);b=cl(b);
    if(ep%30===0){L1.hist.push(perda/4);$('l1w1').value=w1;$('l1w2').value=w2;$('l1b').value=b;l1mostrar();desenhar($('l1graf'),L1.hist);$('l1status').textContent=`época ${ep} · perda = ${(perda/4).toFixed(4)}`;}
  },()=>{
    L1.rodando=false;$('l1w1').value=w1;$('l1w2').value=w2;$('l1b').value=b;const p=l1mostrar();desenhar($('l1graf'),L1.hist);
    if($('l1porta').value==='xor'&&p>0.15)$('l1status').textContent=`perda travou em ${p.toFixed(3)} · um neurônio não resolve XOR`;
    avisar('l1-treino-fim',{porta:$('l1porta').value,perda:p,acertos:L1.acertos});
  });
});

/* ---------- Lição 2 ---------- */
const L2={rede:null,hist:[],rodando:false};
function l2nova(){L2.rede=new Rede(2,+$('l2h').value);L2.hist=[];desenhar($('l2graf'),L2.hist);l2mostrar();$('l2status').textContent='pesos aleatórios · rede sem treino';}
function l2mostrar(){const Y=PORTAS.xor;let h='',perda=0;X4.forEach((x,i)=>{const s=L2.rede.fwd(x).a2;perda+=(s-Y[i])**2;h+=linha(x,Y[i],s);});$('l2tab').innerHTML=h;
  desenharRede($('l2rede'),[2,L2.rede.nh,1],pesosRede(L2.rede),[['x1','x2'],[],['saída']]);
  desenharMapa($('l2mapa'),(a,c)=>L2.rede.fwd([a,c]).a2,X4.map((x,i)=>[x[0],x[1],Y[i]]));
  return perda/4;}
$('l2h').addEventListener('input',()=>{$('l2ho').textContent=$('l2h').value;if(!L2.rodando)l2nova();});
$('l2zerar').addEventListener('click',()=>{if(!L2.rodando)l2nova();});
$('l2treinar').addEventListener('click',()=>{
  if(L2.rodando)return;L2.rodando=true;L2.hist=[];const Y=PORTAS.xor;avisar('l2-treino-inicio',{nh:L2.rede.nh});
  animar(10000,100,ep=>{const p=L2.rede.epoca(X4,Y,1.0);if(ep%100===0){L2.hist.push(p);l2mostrar();desenhar($('l2graf'),L2.hist);$('l2status').textContent=`época ${ep} · perda = ${p.toFixed(4)}`;}},
  ()=>{L2.rodando=false;const p=l2mostrar();desenhar($('l2graf'),L2.hist);
    $('l2status').textContent=p<0.02?`resolvido · perda final = ${p.toFixed(4)}`:`presa num mínimo local (perda ${p.toFixed(3)}) · clique em Pesos aleatórios e treine de novo`;avisar('l2-treino-fim',{perda:p,nh:L2.rede.nh});});
});

/* ---------- Lição 3 ---------- */
const L3={rede:null,hist:[],rodando:false,Xtr:[],Ytr:[],Xte:[],Yte:[]};
function l3dados(){
  const lim=+$('l3regra').value,X=[],Y=[];
  for(let i=0;i<400;i++){const d=Math.random()*5,c=Math.random()<.5?1:0;X.push([d/5,c]);Y.push(d<lim&&c===1?1:0);}
  L3.Xtr=X.slice(0,320);L3.Ytr=Y.slice(0,320);L3.Xte=X.slice(320);L3.Yte=Y.slice(320);
}
function acc(X,Y){let a=0;X.forEach((x,i)=>{if((L3.rede.fwd(x).a2>.5)===(Y[i]===1))a++;});return(100*a/X.length).toFixed(1)+'%';}
function l3mostrar(){
  const d=+$('l3dist').value,c=+$('l3pos').value,lim=+$('l3regra').value;
  $('l3disto').textContent=d.toFixed(1)+' m';$('l3regrao').textContent=lim.toFixed(1)+' m';
  const p=L3.rede.fwd([d/5,c]).a2,av=p>.5,certo=d<lim&&c===1;
  $('l3prob').textContent=p.toFixed(2);
  const f=$('l3fala');f.textContent=av?'"Cuidado! Obstáculo à frente."':'(silêncio)';f.classList.toggle('alerta',av);
  const ok=av===certo,ce=$('l3certo');ce.textContent=(ok?'Acertou':'Errou')+': o certo seria '+(certo?'avisar':'ficar em silêncio');ce.className='status '+(ok?'ok':'err');
  desenharFaixa($('l3faixa'),(dd,cc)=>L3.rede.fwd([dd/5,cc]).a2,lim,d,c);
}
function l3nova(){L3.rede=new Rede(2,8);L3.hist=[];l3dados();desenhar($('l3graf'),L3.hist);$('l3ep').textContent='0';$('l3acTr').textContent=acc(L3.Xtr,L3.Ytr);$('l3acTe').textContent=acc(L3.Xte,L3.Yte);l3mostrar();}
function l3teste(){l3mostrar();avisarDepois('l3-teste',()=>{const d=+$('l3dist').value,c=+$('l3pos').value,p=L3.rede.fwd([d/5,c]).a2;return{d,frente:c===1,prob:p,avisa:p>.5,certo:(p>.5)===(d<+$('l3regra').value&&c===1),treinada:L3.hist.length>0};},1500);}
$('l3dist').addEventListener('input',l3teste);$('l3pos').addEventListener('change',l3teste);
$('l3regra').addEventListener('input',()=>{if(L3.rodando)return;avisarDepois('l3-regra',()=>({lim:+$('l3regra').value}));l3dados();L3.hist=[];desenhar($('l3graf'),L3.hist);$('l3acTr').textContent=acc(L3.Xtr,L3.Ytr);$('l3acTe').textContent=acc(L3.Xte,L3.Yte);l3mostrar();});
$('l3zerar').addEventListener('click',()=>{if(!L3.rodando)l3nova();});
$('l3treinar').addEventListener('click',()=>{
  if(L3.rodando)return;L3.rodando=true;L3.hist=[];avisar('l3-treino-inicio');
  animar(6000,60,ep=>{const p=L3.rede.epoca(L3.Xtr,L3.Ytr,2.0);if(ep%60===0){L3.hist.push(p);$('l3ep').textContent=ep;desenhar($('l3graf'),L3.hist);l3mostrar();}},
  ()=>{L3.rodando=false;$('l3ep').textContent='6000';$('l3acTr').textContent=acc(L3.Xtr,L3.Ytr);$('l3acTe').textContent=acc(L3.Xte,L3.Yte);desenhar($('l3graf'),L3.hist);l3mostrar();avisar('l3-treino-fim',{acTr:$('l3acTr').textContent,acTe:$('l3acTe').textContent});});
});

/* ---------- Lição 4: reconhecer formas ---------- */
const CLASSES=['Círculo','Quadrado','Triângulo'],G=16,NIN=G*G,NH=24;
const L4={W1:null,b1:null,W2:null,b2:null,hist:[],rodando:false,treinada:false,teste:null};
function l4init(){L4.W1=[...Array(NIN)].map(()=>[...Array(NH)].map(()=>rn()*0.08));L4.b1=Array(NH).fill(0);L4.W2=[...Array(NH)].map(()=>[...Array(3)].map(()=>rn()*0.3));L4.b2=[0,0,0];L4.hist=[];L4.treinada=false;}
function l4fwd(x){const h=new Array(NH);for(let j=0;j<NH;j++){let z=L4.b1[j];for(let i=0;i<NIN;i++)if(x[i])z+=x[i]*L4.W1[i][j];h[j]=sig(z);}
  const o=L4.b2.slice();for(let k=0;k<3;k++)for(let j=0;j<NH;j++)o[k]+=h[j]*L4.W2[j][k];const m=Math.max(...o),e=o.map(v=>Math.exp(v-m)),s=e[0]+e[1]+e[2];return{h,p:e.map(v=>v/s)};}
/* desenha uma forma aleatória num canvas 64x64 */
function gerarForma(cv,cls){const g=cv.getContext('2d');g.clearRect(0,0,cv.width,cv.height);const W=cv.width,k=W/64;
  g.strokeStyle='#000';g.lineWidth=(3+Math.random()*4)*k;g.lineJoin='round';g.lineCap='round';
  const cx=(22+Math.random()*20)*k,cy=(22+Math.random()*20)*k,r=(10+Math.random()*12)*k,rot=(Math.random()-.5)*0.6;
  g.beginPath();
  if(cls===0){g.ellipse(cx,cy,r,r*(0.75+Math.random()*.5),rot,0,Math.PI*2);}
  else{const n=cls===1?4:3,base=cls===1?Math.PI/4:-Math.PI/2;for(let i=0;i<=n;i++){const a=base+rot+i*2*Math.PI/n,j=(Math.random()-.5)*0.12*r;const x=cx+(r+j)*Math.cos(a),y=cy+(r+j)*Math.sin(a);i?g.lineTo(x,y):g.moveTo(x,y);}}
  g.stroke();}
/* recorta a tinta, centraliza e reduz para 16x16 */
const _peq=document.createElement('canvas');_peq.width=G;_peq.height=G;
function preparar(cv){const W=cv.width,H=cv.height,d=cv.getContext('2d').getImageData(0,0,W,H).data;let x0=W,y0=H,x1=-1,y1=-1;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(d[(y*W+x)*4+3]>40){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  const g=_peq.getContext('2d');g.clearRect(0,0,G,G);if(x1<0)return null;
  const bw=x1-x0+1,bh=y1-y0+1,s=12/Math.max(bw,bh),dw=bw*s,dh=bh*s;g.imageSmoothingEnabled=true;g.drawImage(cv,x0,y0,bw,bh,(G-dw)/2,(G-dh)/2,dw,dh);
  const p=g.getImageData(0,0,G,G).data,v=new Array(NIN);for(let i=0;i<NIN;i++)v[i]=p[i*4+3]/255;return v;}
function gerarDados(n){const cv=document.createElement('canvas');cv.width=64;cv.height=64;const X=[],Y=[];for(let i=0;i<n;i++){const c=i%3;gerarForma(cv,c);X.push(preparar(cv));Y.push(c);}return{X,Y};}
function l4passo(X,Y,lr){/* uma época com mini-lotes de 20 */let perda=0;const idx=[...X.keys()].sort(()=>Math.random()-.5);
  for(let b=0;b<idx.length;b+=20){const lote=idx.slice(b,b+20),gW1=new Map(),gb1=Array(NH).fill(0),gW2=[...Array(NH)].map(()=>[0,0,0]),gb2=[0,0,0];
    lote.forEach(k=>{const x=X[k],{h,p}=l4fwd(x);perda-=Math.log(p[Y[k]]+1e-9);const d2=p.map((v,c)=>v-(c===Y[k]?1:0));
      for(let c=0;c<3;c++){gb2[c]+=d2[c];for(let j=0;j<NH;j++)gW2[j][c]+=h[j]*d2[c];}
      const d1=h.map((hj,j)=>(d2[0]*L4.W2[j][0]+d2[1]*L4.W2[j][1]+d2[2]*L4.W2[j][2])*hj*(1-hj));
      for(let j=0;j<NH;j++)gb1[j]+=d1[j];for(let i=0;i<NIN;i++)if(x[i]){let row=gW1.get(i);if(!row){row=Array(NH).fill(0);gW1.set(i,row);}for(let j=0;j<NH;j++)row[j]+=x[i]*d1[j];}});
    const n=lote.length;for(let j=0;j<NH;j++){L4.b1[j]-=lr*gb1[j]/n;for(let c=0;c<3;c++)L4.W2[j][c]-=lr*gW2[j][c]/n;}for(let c=0;c<3;c++)L4.b2[c]-=lr*gb2[c]/n;
    gW1.forEach((row,i)=>{for(let j=0;j<NH;j++)L4.W1[i][j]-=lr*row[j]/n;});}
  return perda/X.length;}
function l4filtros(){const box=$('l4filtros');if(!box.children.length)for(let f=0;f<8;f++){const c=document.createElement('canvas');c.width=G;c.height=G;box.appendChild(c);}
  const bg=hex(css('--paper')),s=hex(css('--signal')),e=hex(css('--error'));
  [...box.children].forEach((c,f)=>{const g=c.getContext('2d');let mx=1e-6;for(let i=0;i<NIN;i++)mx=Math.max(mx,Math.abs(L4.W1[i][f]));
    for(let i=0;i<NIN;i++){const w=L4.W1[i][f]/mx;g.fillStyle=w>=0?mistura(bg,s,w):mistura(bg,e,-w);g.fillRect(i%G,Math.floor(i/G),1,1);}});}
function l4classificar(){const v=preparar($('l4quadro'));const vis=$('l4visto').getContext('2d');vis.clearRect(0,0,G,G);
  const ink=hex(css('--ink')),bg=hex(css('--paper'));
  let p=[1/3,1/3,1/3];if(v){for(let i=0;i<NIN;i++){vis.fillStyle=mistura(bg,ink,v[i]);vis.fillRect(i%G,Math.floor(i/G),1,1);}p=l4fwd(v).p;}
  const top=v?p.indexOf(Math.max(...p)):-1;L4.ultimo={vazio:!v,classe:top>=0?CLASSES[top]:'',prob:top>=0?p[top]:0,treinada:L4.treinada};
  $('l4barras').innerHTML=CLASSES.map((n,c)=>`<div class="barra${c===top?' top':''}"><span>${n}</span><div class="trilho"><div class="enche" style="width:${(p[c]*100).toFixed(0)}%"></div></div><output>${(p[c]*100).toFixed(0)}%</output></div>`).join('');}
/* desenho com mouse/dedo */
(function(){const cv=$('l4quadro'),g=cv.getContext('2d');let ativo=false,ult=null;
  const ponto=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height];};
  cv.addEventListener('pointerdown',e=>{ativo=true;ult=ponto(e);try{cv.setPointerCapture(e.pointerId);}catch(_){}g.fillStyle='#000';g.beginPath();g.arc(ult[0],ult[1],9,0,7);g.fill();});
  cv.addEventListener('pointermove',e=>{if(!ativo)return;const p=ponto(e);g.strokeStyle='#000';g.lineWidth=18;g.lineCap='round';g.beginPath();g.moveTo(ult[0],ult[1]);g.lineTo(p[0],p[1]);g.stroke();ult=p;});
  const fim=()=>{if(ativo){ativo=false;l4classificar();avisarDepois('l4-desenho',()=>L4.ultimo,700);}};cv.addEventListener('pointerup',fim);cv.addEventListener('pointerleave',fim);cv.addEventListener('pointercancel',fim);})();
$('l4limpar').addEventListener('click',()=>{$('l4quadro').getContext('2d').clearRect(0,0,280,280);l4classificar();});
$('l4exemplo').addEventListener('change',e=>{const v=e.target.value;if(v==='')return;gerarForma($('l4quadro'),+v);e.target.value='';l4classificar();});
$('l4zerar').addEventListener('click',()=>{if(L4.rodando)return;l4init();$('l4ep').textContent='0';$('l4ac').textContent='—';$('l4status').textContent='pesos aleatórios · a rede está chutando';desenhar($('l4graf'),L4.hist);l4filtros();l4classificar();});
$('l4treinar').addEventListener('click',()=>{if(L4.rodando)return;L4.rodando=true;$('l4status').textContent='gerando 1.500 formas de treino…';avisar('l4-treino-inicio');
  setTimeout(()=>{const tr=gerarDados(1500);L4.teste=gerarDados(300);L4.hist=[];let ep=0;
    const step=()=>{const p=l4passo(tr.X,tr.Y,0.8);L4.hist.push(p);ep++;
      let ac=0;L4.teste.X.forEach((x,i)=>{const q=l4fwd(x).p;if(q.indexOf(Math.max(...q))===L4.teste.Y[i])ac++;});
      $('l4ep').textContent=ep;$('l4ac').textContent=(100*ac/L4.teste.X.length).toFixed(1)+'%';$('l4status').textContent=`época ${ep} · perda = ${p.toFixed(3)}`;
      desenhar($('l4graf'),L4.hist);l4filtros();l4classificar();
      if(ep<12)setTimeout(step,0);else{L4.rodando=false;L4.treinada=true;$('l4status').textContent='treinada · desenhe uma forma e veja a resposta';avisar('l4-treino-fim',{ac:$('l4ac').textContent});}};step();},30);});

/* início */
l4init();gerarForma($('l4quadro'),0);l4filtros();l4classificar();$('l4status').textContent='pesos aleatórios · a rede está chutando';desenhar($('l4graf'),[]);
l1mostrar();desenhar($('l1graf'),[]);l2nova();l3nova();
window.addEventListener('resize',()=>{desenhar($('l1graf'),L1.hist);desenhar($('l2graf'),L2.hist);desenhar($('l3graf'),L3.hist);l1mostrar();l2mostrar();l3mostrar();});
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{l1mostrar();l2mostrar();l3mostrar();desenhar($('l1graf'),L1.hist);desenhar($('l2graf'),L2.hist);desenhar($('l3graf'),L3.hist);});}catch(e){}
