# LabNeural

Laboratório para aprender redes neurais mexendo nelas, com uma professora de IA (o mesmo avatar realista do StudentMedical e do VinaCare) que explica cada lição em voz alta, reage ao que o aluno faz e responde perguntas por voz.

▶️ Demo: https://leonardogmendoza.github.io/labneural/ (abre a pasta `demo/`)

## Lições
1. **Um neurônio**: pesos, bias, sigmoide, portas AND/OR/XOR, desenho da rede e mapa de decisão.
2. **Camada oculta**: a rede resolve o XOR; dá para ver a fronteira se dobrar e o mínimo local.
3. **Aviso de obstáculo**: rede que decide se avisa uma pessoa cega; treino × teste.
4. **Reconhecer imagens**: o aluno desenha círculo, quadrado ou triângulo e vê os detectores aprendidos.

## Como funciona
- Igual ao StudentMedical: código em `app/` (Vite) e versão compilada em `demo/`, que funciona até em iPhone com iOS 13.
- `app/src/lab.js`, `app/src/aula.js`, `app/src/professor.js`, `app/src/talkinghead/`; avatares em `app/public/avatars/`.
- `app/src/lab.js`: as lições; cada coisa importante dispara um evento `lab` (ex.: `l2-treino-fim`).
- `app/src/aula.js`: a professora; ouve os eventos, fala, mostra gestos e responde perguntas.
- `app/src/professor.js` e `app/src/talkinghead/`: avatar (mesma base do StudentMedical).
- `backend/`: API própria em Python FastAPI (`labneural.sandlj.com.br`): `/api/tutor` (IA da Oracle como professora de redes neurais, com memória do aluno) e `/api/voz` (voz neural). Sem servidor, a professora responde com um glossário embutido e usa a voz do aparelho.

## Servidor (VPS)
```bash
cd backend
cp .env.example .env      # preencha com a mesma conta Oracle/Azure do StudentMedical
docker build -t labneural-api .
docker run -d --name labneural-api --restart unless-stopped -p 127.0.0.1:8040:8000 --env-file .env -v labneural-dados:/data labneural-api
curl http://localhost:8040/api/saude
```
Depois aponte `labneural.sandlj.com.br` para a porta 8040 no Nginx da VPS (do mesmo jeito que os outros subdomínios).

Testar no PC: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --port 8000` e abra o site com `?api=http://localhost:8000`.

## Gerar a demo (igual ao StudentMedical)
```bash
cd app
npm install
npm run build      # gera ../demo
cd ..
git add -A && git commit -m "build" && git push
```
Para testar no PC: `npm run dev` dentro de `app`.

## Créditos
- Avatar falante: [TalkingHead](https://github.com/met4citizen/TalkingHead) (MIT, © Mika Suominen).
- Avatares de exemplo (`avaturn.glb`, `avatarsdk.glb`): exemplos do TalkingHead, **somente uso não comercial**. Para lançar o app, criar avatares próprios com licença comercial.
- [three.js](https://threejs.org) (MIT), instalado pelo npm.
