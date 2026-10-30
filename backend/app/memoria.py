"""Memória do aluno do LabNeural: o que ele já sabe, onde erra e as últimas mensagens (SQLite)."""
import sqlite3
import threading
import time
from pathlib import Path

LIMITE_FATOS = 40
LIMITE_HISTORICO = 10


class Memoria:
    def __init__(self, pasta):
        Path(pasta).mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(str(Path(pasta) / "labneural.db"), check_same_thread=False)
        self.lock = threading.Lock()
        with self.lock:
            self.db.executescript("""
                CREATE TABLE IF NOT EXISTS fatos (aluno TEXT, fato TEXT, criado REAL, PRIMARY KEY (aluno, fato));
                CREATE TABLE IF NOT EXISTS conversa (aluno TEXT, quem TEXT, texto TEXT, criado REAL);
            """)
            self.db.commit()

    def fatos(self, aluno):
        with self.lock:
            rows = self.db.execute("SELECT fato FROM fatos WHERE aluno=? ORDER BY criado DESC LIMIT ?",
                                   (aluno, LIMITE_FATOS)).fetchall()
        return [r[0] for r in reversed(rows)]

    def historico(self, aluno):
        with self.lock:
            rows = self.db.execute("SELECT quem, texto FROM conversa WHERE aluno=? ORDER BY criado DESC LIMIT ?",
                                   (aluno, LIMITE_HISTORICO)).fetchall()
        return list(reversed(rows))

    def guardar_turno(self, aluno, pergunta, resposta, fatos_novos=()):
        agora = time.time()
        with self.lock:
            self.db.execute("INSERT INTO conversa VALUES (?,?,?,?)", (aluno, "aluno", pergunta, agora))
            self.db.execute("INSERT INTO conversa VALUES (?,?,?,?)", (aluno, "tutor", resposta, agora + 0.001))
            for f in fatos_novos:
                f = str(f).strip()[:200]
                if f:
                    self.db.execute("INSERT OR IGNORE INTO fatos VALUES (?,?,?)", (aluno, f, agora))
            self.db.commit()

    def esquecer(self, aluno):
        with self.lock:
            for t in ("fatos", "conversa"):
                self.db.execute(f"DELETE FROM {t} WHERE aluno=?", (aluno,))
            self.db.commit()
