from app.ia import Tutor, montar_prompt


class MemoriaFalsa:
    def __init__(self):
        self.turnos = []

    def fatos(self, aluno):
        return ["prefere exemplos práticos"]

    def historico(self, aluno):
        return []

    def guardar_turno(self, *a):
        self.turnos.append(a)


def test_prompt_tem_licao_e_idioma():
    p = montar_prompt("o que é o bias?", "pt", "Lição 1: um neurônio", ["prefere exemplos práticos"], nome="Leo")
    assert "LabNeural" in p and "português do Brasil" in p and "Lição 1" in p and "Leo" in p


def test_tutor_responde_e_guarda_memoria():
    mem = MemoriaFalsa()
    t = Tutor(lambda prompt, **k: '{"resposta": "O bias desloca a decisão.", "fatos_novos": ["entendeu bias"], "humor": "feliz"}', mem)
    r = t.responder("aluno1", "o que é o bias?", "pt", "Lição 1")
    assert r == {"resposta": "O bias desloca a decisão.", "humor": "feliz", "modo": "ia"}
    assert mem.turnos and mem.turnos[0][3] == ["entendeu bias"]


def test_sem_ia_avisa():
    assert Tutor(None, MemoriaFalsa()).responder("a", "oi")["modo"] == "sem-ia"
