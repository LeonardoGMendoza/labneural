"""API do LabNeural: professor(a) de IA (Oracle) que ensina redes neurais, com voz neural e memória do aluno."""
import os
import re
import time
from collections import defaultdict, deque

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import carregar_env

carregar_env()

from .ia import Tutor, oracle_do_ambiente  # noqa: E402
from .memoria import Memoria  # noqa: E402
from .voz import voz_do_ambiente  # noqa: E402

DADOS = os.getenv("LABNEURAL_DATA_DIR", "./data")
app = FastAPI(title="LabNeural API", version="0.1.0")
origens = [o.strip() for o in os.getenv("LN_ORIGENS", "http://localhost:5500,https://leonardogmendoza.github.io").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origens, allow_methods=["GET", "POST", "DELETE"], allow_headers=["*"])

memoria = Memoria(DADOS)
tutor = Tutor(oracle_do_ambiente(), memoria)
voz = voz_do_ambiente(tutor.chat)
ID_OK = re.compile(r"^[a-zA-Z0-9_-]{1,40}$")
_pedidos = defaultdict(deque)


def limitar(request: Request, maximo=30, janela=60):
    """Protege o custo da Oracle: no máximo 30 perguntas (ou 120 falas) por minuto por IP."""
    ip = request.headers.get("cf-connecting-ip") or request.headers.get("x-real-ip") or (request.client.host if request.client else "?")
    agora, fila = time.time(), _pedidos[(ip, maximo)]
    while fila and agora - fila[0] > janela:
        fila.popleft()
    if len(fila) >= maximo:
        raise HTTPException(429, "Muitos pedidos. Espere um minuto.")
    fila.append(agora)


class Pergunta(BaseModel):
    aluno: str = Field("demo", max_length=40)
    nome: str = Field("", max_length=60)
    texto: str = Field(..., min_length=1, max_length=600)
    idioma: str = Field("pt", max_length=5)
    tema: str = Field("", max_length=80)
    genero: str = Field("mulher", max_length=10)


class TextoVoz(BaseModel):
    texto: str = Field(..., min_length=1, max_length=600)
    idioma: str = Field("pt", max_length=5)
    genero: str = Field("mulher", max_length=10)


VOZES = {  # vozes neurais da Azure (as mesmas do StudentMedical)
    "pt": {"mulher": "pt-BR-FranciscaNeural", "homem": "pt-BR-AntonioNeural"},
    "es": {"mulher": "es-PY-TaniaNeural", "homem": "es-PY-MarioNeural"},
    "en": {"mulher": "en-US-JennyNeural", "homem": "en-US-GuyNeural"},
}


@app.get("/api/saude")
def saude():
    return {"ok": True, "ia": tutor.chat is not None, "voz": voz is not None}


@app.post("/api/tutor")
def perguntar(p: Pergunta, request: Request):
    limitar(request)
    if not ID_OK.match(p.aluno):
        raise HTTPException(422, "Identificador inválido.")
    return tutor.responder(p.aluno, p.texto, p.idioma, p.tema, p.nome, p.genero)


@app.delete("/api/memoria/{aluno}")
def apagar_memoria(aluno: str):
    if not ID_OK.match(aluno):
        raise HTTPException(422, "Identificador inválido.")
    memoria.esquecer(aluno)
    return {"ok": True}


@app.post("/api/voz")
def falar(t: TextoVoz, request: Request):
    limitar(request, maximo=120)
    if voz is None:
        raise HTTPException(503, "Voz da nuvem não configurada.")
    nome_voz = VOZES.get(t.idioma, VOZES["pt"]).get(t.genero, VOZES["pt"]["mulher"])
    try:
        audio = voz(t.texto, nome_voz)
    except Exception as erro:  # noqa: BLE001
        raise HTTPException(503, "Voz da nuvem indisponível.") from erro
    return Response(content=audio, media_type="audio/mpeg", headers={"Cache-Control": "public, max-age=86400"})
