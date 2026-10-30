"""Professor(a) de IA do LabNeural: ensina redes neurais com a IA da Oracle (mesma conta do StudentMedical)."""
import base64
import json
import logging
import os
import re
import threading

log = logging.getLogger("labneural.ia")
CHAT_MODEL = os.getenv("LN_MODELO", "cohere.command-a-03-2025")
IDIOMAS = {"pt": "português do Brasil", "es": "español", "en": "English"}
HUMORES = {"feliz", "carinho", "neutro"}
FRASES = {
    "pt": {"vazio": "Pode perguntar o que quiser sobre redes neurais.", "sem-ia": "A IA do servidor ainda não foi configurada.",
           "erro": "Tive um probleminha agora. Pode perguntar de novo daqui a pouco?"},
    "es": {"vazio": "Pregúntame lo que quieras sobre redes neuronales.", "sem-ia": "La IA del servidor todavía no está configurada.",
           "erro": "Tuve un problema ahora. ¿Puedes preguntar de nuevo en un momento?"},
    "en": {"vazio": "Ask me anything about neural networks.", "sem-ia": "The server AI isn't set up yet.",
           "erro": "I had a problem just now. Could you ask again in a moment?"},
}

PERSONA = """Você é {nome_prof}, {papel} do LabNeural, um laboratório onde o aluno aprende redes neurais mexendo nelas no navegador. Você conversa por voz com {aluno}.
O LabNeural tem 4 lições: 1) um neurônio aprendendo portas lógicas (pesos, bias, sigmoide, AND/OR/XOR); 2) camada oculta resolvendo o XOR, mapa de decisão e mínimo local; 3) uma rede que decide se avisa uma pessoa cega sobre um obstáculo (treino x teste); 4) uma rede que reconhece círculo, quadrado e triângulo desenhados (pixels, detectores, softmax).
Regras:
- IDIOMA: responda SEMPRE em {idioma}.
- Explique como um bom professor para iniciantes: no máximo 4 frases curtas, porque serão faladas em voz alta. Use exemplos do dia a dia e, quando ajudar, mande o aluno mexer em algo da lição aberta na tela.
- Termine com UMA pergunta curta para checar se ele entendeu, quando a pergunta for de conteúdo. Se ele responder a uma pergunta sua, diga se acertou e corrija com gentileza.
- Se ele mudar de assunto (carreira em IA, Python, estudos, vagas), responda a isso com interesse e sem inventar fatos.
- Escreva números por extenso ou com vírgula decimal, sem fórmulas com símbolos: tudo será lido em voz alta.
- Você é uma IA: não diga que é humano.
- Em "fatos_novos", guarde em português o que ajuda nas próximas conversas: nível do aluno, dúvidas que se repetem, lições já dominadas.
- "humor": "feliz" (acerto, elogio, conversa leve), "carinho" (incentivo depois de erro), "neutro" (explicação).

Responda SOMENTE com um JSON válido, sem texto fora dele:
{{"resposta": "o que você fala, em {idioma}", "fatos_novos": ["..."], "humor": "feliz" | "carinho" | "neutro"}}"""


def montar_prompt(texto, idioma="pt", tema="", fatos=(), historico=(), nome="", genero="mulher"):
    partes = [PERSONA.format(nome_prof="Clara" if genero == "mulher" else "Rafael",
                             papel="a professora" if genero == "mulher" else "o professor",
                             aluno=nome or "o(a) aluno(a)", idioma=IDIOMAS.get(idioma, IDIOMAS["pt"]))]
    if tema:
        partes.append(f"Lição aberta na tela (só contexto; siga o que o aluno disser): {tema}")
    partes.append("O que você já sabe sobre o aluno:\n" + ("\n".join(f"- {f}" for f in fatos) if fatos else "- (nada ainda)"))
    if historico:
        partes.append("Conversa recente:\n" + "\n".join(f"{'Aluno' if q == 'aluno' else 'Tutor'}: {t}" for q, t in historico))
    partes.append(f'O aluno disse: "{texto}"')
    partes.append("Agora responda com o JSON.")
    return "\n\n".join(partes)


def interpretar(texto):
    texto = (texto or "").strip()
    bloco = re.search(r"\{.*\}", texto, re.S)
    if bloco:
        try:
            d = json.loads(bloco.group(0))
            resposta = str(d.get("resposta") or "").strip()
            fatos = d.get("fatos_novos") or []
            fatos = fatos if isinstance(fatos, list) else [fatos]
            humor = str(d.get("humor") or "neutro").lower()
            if resposta:
                return {"resposta": resposta, "fatos_novos": [str(f) for f in fatos if f], "humor": humor if humor in HUMORES else "neutro"}
        except (ValueError, AttributeError, TypeError):
            pass
    return {"resposta": re.sub(r"```(json)?", "", texto).strip(), "fatos_novos": [], "humor": "neutro"}


class OracleChat:
    """Igual ao do StudentMedical: importa o SDK só no primeiro uso."""

    def __init__(self, config, compartment_id):
        self.config, self.compartment_id, self._client = config, compartment_id, None
        self._lock = threading.Lock()

    def __call__(self, prompt, max_tokens=500, temperature=0.3):
        import oci  # noqa: PLC0415

        with self._lock:
            if self._client is None:
                oci.config.validate_config(self.config)
                self._client = oci.generative_ai_inference.GenerativeAiInferenceClient(config=self.config, timeout=(10, 45))
        m = oci.generative_ai_inference.models
        detalhe = m.ChatDetails(
            compartment_id=self.compartment_id,
            serving_mode=m.OnDemandServingMode(model_id=CHAT_MODEL),
            chat_request=m.CohereChatRequest(message=prompt, max_tokens=max_tokens, temperature=temperature))
        return self._client.chat(detalhe).data.chat_response.text.strip()


def oracle_do_ambiente(env=os.environ):
    chave = env.get("OCI_KEY_CONTENT", "")
    if not chave and env.get("OCI_KEY_B64"):
        chave = base64.b64decode(env["OCI_KEY_B64"]).decode("utf-8")
    campos = {"user": env.get("OCI_USER"), "fingerprint": env.get("OCI_FINGERPRINT"),
              "tenancy": env.get("OCI_TENANCY"), "region": env.get("OCI_REGION"), "key_content": chave}
    compartimento = env.get("OCI_COMPARTMENT_ID")
    if not all(campos.values()) or not compartimento:
        return None
    return OracleChat(campos, compartimento)


class Tutor:
    def __init__(self, chat, memoria):
        self.chat, self.memoria = chat, memoria

    def responder(self, aluno, texto, idioma="pt", tema="", nome="", genero="mulher"):
        idioma = idioma if idioma in IDIOMAS else "pt"
        frases = FRASES[idioma]
        texto = (texto or "").strip()[:600]
        if not texto:
            return {"resposta": frases["vazio"], "humor": "neutro", "modo": "vazio"}
        if self.chat is None:
            return {"resposta": frases["sem-ia"], "humor": "neutro", "modo": "sem-ia"}
        prompt = montar_prompt(texto, idioma, tema, self.memoria.fatos(aluno), self.memoria.historico(aluno), nome, genero)
        try:
            dados = interpretar(self.chat(prompt))
        except Exception as erro:  # noqa: BLE001
            log.warning("Oracle falhou: %s", type(erro).__name__)
            return {"resposta": frases["erro"], "humor": "neutro", "modo": "erro"}
        if not dados["resposta"]:
            return {"resposta": frases["erro"], "humor": "neutro", "modo": "erro"}
        self.memoria.guardar_turno(aluno, texto, dados["resposta"], dados["fatos_novos"])
        return {"resposta": dados["resposta"], "humor": dados["humor"], "modo": "ia"}
