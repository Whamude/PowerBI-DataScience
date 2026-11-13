"""Marmita Fácil: one-business WhatsApp Cloud API gateway, durable SQLite queues.

No network requests occur at import, during webhook acknowledgement, or in tests
unless an explicitly supplied transport performs them.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import sqlite3
import sys
import time
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote
from urllib.request import Request, urlopen
import uuid
from wsgiref.simple_server import make_server
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

MAX_BODY = 1024 * 1024
MAX_PRICE = 100_000_000
MAX_TOTAL = 1_000_000_000_000
WINDOW = 86400


class Invalid(ValueError):
    pass


def integer(value, minimum=1, maximum=1_000_000_000_000):
    if type(value) is not int or not minimum <= value <= maximum:
        raise Invalid("Número inválido ou fora do limite.")
    return value


def text(value, maximum, required=True):
    if not isinstance(value, str):
        raise Invalid("Texto ausente, inválido ou muito longo.")
    try:
        # Match Android String.length(): supplementary characters use two units.
        units = len(value.encode("utf-16-le")) // 2
    except UnicodeEncodeError as e:
        raise Invalid("Texto contém uma sequência Unicode inválida.") from e
    if units > maximum or (required and not value.strip()):
        raise Invalid("Texto ausente, inválido ou muito longo.")
    if any(ord(c) < 32 and c not in "\n\t" for c in value):
        raise Invalid("Texto contém caracteres de controle.")
    return value.strip()


def iso(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise Invalid("Data inválida. Use AAAA-MM-DD.")
    try:
        parsed = date.fromisoformat(value)
    except ValueError as e:
        raise Invalid("Data inválida.") from e
    if not date(1900, 1, 1) <= parsed <= date(2100, 12, 31):
        raise Invalid("Data fora do limite.")
    return parsed


def normalize(value):
    return "".join(c for c in unicodedata.normalize("NFD", value.upper().strip()) if unicodedata.category(c) != "Mn")


def money(cents):
    return "R$ " + f"{cents // 100:,}".replace(",", ".") + f",{cents % 100:02d}"


def friendly(day):
    return iso(day).strftime("%d/%m/%Y")


def message_parts(body, limit=3500):
    """Keep even UTF-16-based platform character counts below the text limit."""
    start, units = 0, 0
    for offset, character in enumerate(body):
        width = 2 if ord(character) > 0xFFFF else 1
        if units + width > limit:
            yield body[start:offset]
            start, units = offset, 0
        units += width
    if start < len(body):
        yield body[start:]


def validate_menu(value):
    if not isinstance(value, dict):
        raise Invalid("Cardápio inválido.")
    start, end = iso(value.get("week_start")), iso(value.get("week_end"))
    if start.weekday() != 0 or end != start + timedelta(days=6):
        raise Invalid("A semana deve começar na segunda-feira e terminar no domingo seguinte.")
    items = value.get("items")
    if not isinstance(items, list) or not 1 <= len(items) <= 100:
        raise Invalid("Cadastre de 1 a 100 tipos de marmita no cardápio.")
    accepting = value.get("accepting_orders", True)
    if type(accepting) is not bool:
        raise Invalid("accepting_orders deve ser verdadeiro ou falso.")
    clean = {"business_name": text(value.get("business_name"), 120), "greeting": text(value.get("greeting"), 1000), "accepting_orders": accepting,
             "week_start": start.isoformat(), "week_end": end.isoformat(), "items": []}
    ids = set()
    for item in items:
        if not isinstance(item, dict):
            raise Invalid("Item inválido.")
        meal_id = integer(item.get("local_meal_id"))
        if meal_id in ids:
            raise Invalid("Cada tipo de marmita deve aparecer uma vez no cardápio.")
        ids.add(meal_id)
        days = item.get("available_dates")
        if not isinstance(days, list) or not 1 <= len(days) <= 7 or any(not isinstance(day,str) for day in days) or len(set(days)) != len(days):
            raise Invalid("Selecione de 1 a 7 dias distintos por marmita.")
        for day in days:
            if not start <= iso(day) <= end:
                raise Invalid("Disponibilidade fora da semana do cardápio.")
        clean["items"].append({"local_meal_id": meal_id, "name": text(item.get("name"), 120),
            "description": text(item.get("description", ""), 500, False),
            "price_cents": integer(item.get("price_cents"), 1, MAX_PRICE), "available_dates": sorted(days)})
    return clean


@dataclass(frozen=True)
class Config:
    database: Path
    owner_token: str
    app_secret: str
    verify_token: str
    phone_number_id: str
    access_token: str
    graph_version: str
    human_contact: str
    business_timezone: object
    send_enabled: bool = False

    @classmethod
    def from_env(cls):
        def required(name, minimum=1):
            value = os.environ.get(name, "").strip()
            if len(value) < minimum or value.upper().startswith(("CHANGE", "SUBSTITUA")):
                raise Invalid(f"Configure {name} antes de iniciar o serviço.")
            return value
        phone = required("WHATSAPP_PHONE_NUMBER_ID")
        version = required("META_GRAPH_VERSION")
        if not re.fullmatch(r"[0-9]{1,32}", phone) or not re.fullmatch(r"v[0-9]{1,3}\.0", version):
            raise Invalid("WHATSAPP_PHONE_NUMBER_ID ou META_GRAPH_VERSION inválido.")
        try:
            tz = ZoneInfo(os.environ.get("BUSINESS_TIMEZONE", "America/Sao_Paulo"))
        except ZoneInfoNotFoundError as e:
            raise Invalid("Fuso horário indisponível. Instale requirements.txt (tzdata) e confira BUSINESS_TIMEZONE.") from e
        return cls(Path(os.environ.get("DATABASE_PATH", "data/marmita.sqlite3")), required("OWNER_API_TOKEN", 32),
            required("META_APP_SECRET", 16), required("WEBHOOK_VERIFY_TOKEN", 32), phone,
            required("WHATSAPP_ACCESS_TOKEN", 20), version, text(required("HUMAN_CONTACT_TEXT"), 1000), tz,
            os.environ.get("WHATSAPP_SEND_ENABLED", "false").lower() == "true")


SCHEMA = """
CREATE TABLE IF NOT EXISTS menu (id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS inbox (seq INTEGER PRIMARY KEY AUTOINCREMENT,message_id TEXT NOT NULL UNIQUE,
 sender TEXT NOT NULL,stamp INTEGER NOT NULL,payload TEXT NOT NULL,processed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions (sender TEXT PRIMARY KEY,payload TEXT NOT NULL,last_processed INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS orders (external_id TEXT PRIMARY KEY,confirm_message_id TEXT NOT NULL UNIQUE,
 payload TEXT NOT NULL,created INTEGER NOT NULL,local_order_id INTEGER);
CREATE TABLE IF NOT EXISTS outbox (id INTEGER PRIMARY KEY AUTOINCREMENT,inbox_id INTEGER NOT NULL,part INTEGER NOT NULL,
 recipient TEXT NOT NULL,body TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt INTEGER NOT NULL DEFAULT 0,lease INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT '',
 meta_message_id TEXT NOT NULL DEFAULT '',UNIQUE(inbox_id,part));
CREATE INDEX IF NOT EXISTS inbox_pending ON inbox(processed,stamp,seq);
CREATE INDEX IF NOT EXISTS outbox_pending ON outbox(state,next_attempt,id);
"""


class Gateway:
    def __init__(self, config, clock=time.time, transport=None):
        self.config, self.clock = config, clock
        self.transport = transport or self.graph_send
        config.database.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript(SCHEMA)
        if os.name != "nt":
            config.database.chmod(0o600)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.config.database, timeout=30)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("PRAGMA busy_timeout=30000")
        try:
            with db:
                yield db
        finally:
            db.close()

    def today(self):
        return datetime.fromtimestamp(self.clock(), self.config.business_timezone).date()

    def current_menu(self, db=None):
        if db is None:
            with self.connect() as own:
                return self.current_menu(own)
        row = db.execute("SELECT payload,revision FROM menu WHERE id=1").fetchone()
        if row is None:
            return None
        value = json.loads(row["payload"])
        value["revision"] = row["revision"]
        return value

    def publish(self, value):
        clean = validate_menu(value)
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT revision FROM menu WHERE id=1").fetchone()
            revision = (row[0] if row else 0) + 1
            db.execute("INSERT INTO menu(id,revision,payload) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload",
                       (revision, json.dumps(clean, ensure_ascii=False)))
        clean["revision"] = revision
        return clean

    def receive(self, raw, signature):
        expected = "sha256=" + hmac.new(self.config.app_secret.encode(), raw, hashlib.sha256).hexdigest()
        if not isinstance(signature, str) or not hmac.compare_digest(expected, signature):
            raise PermissionError("Assinatura do webhook inválida.")
        try:
            value = json.loads(raw)
        except (ValueError, UnicodeDecodeError) as e:
            raise Invalid("JSON inválido.") from e
        if not isinstance(value, dict) or value.get("object") != "whatsapp_business_account" or not isinstance(value.get("entry"), list):
            raise Invalid("Evento WhatsApp inválido.")
        pending = []
        for entry in value["entry"]:
            if not isinstance(entry, dict) or not isinstance(entry.get("changes"), list):
                raise Invalid("Evento WhatsApp inválido.")
            for change in entry["changes"]:
                if not isinstance(change, dict) or change.get("field") != "messages":
                    continue
                event = change.get("value", {})
                if not isinstance(event, dict):
                    raise Invalid("Evento inválido.")
                metadata = event.get("metadata", {})
                if not isinstance(metadata, dict) or str(metadata.get("phone_number_id", "")) != self.config.phone_number_id:
                    raise PermissionError("Webhook destinado a outro número de WhatsApp.")
                messages = event.get("messages", [])
                if not isinstance(messages, list):
                    raise Invalid("Lista de mensagens inválida.")
                for message in messages:
                    if not isinstance(message, dict):
                        raise Invalid("Mensagem inválida.")
                    mid, sender = text(message.get("id"), 256), text(message.get("from"), 32)
                    if not re.fullmatch(r"[0-9]{7,15}", sender):
                        raise Invalid("Remetente inválido. Este serviço usa números de telefone individuais.")
                    stamp_raw = message.get("timestamp")
                    if not isinstance(stamp_raw, str) or not re.fullmatch(r"[0-9]{1,12}", stamp_raw):
                        raise Invalid("Timestamp inválido.")
                    stamp = int(stamp_raw)
                    if not 0 < stamp <= int(self.clock()) + 300:
                        raise Invalid("Timestamp fora do limite.")
                    if message.get("type") == "text":
                        body = message.get("text", {}).get("body") if isinstance(message.get("text"), dict) else None
                        body = text(body, 4096)
                    else:
                        body = ""
                    pending.append((mid, sender, min(stamp, int(self.clock())), json.dumps({"type": message.get("type"), "text": body}, ensure_ascii=False)))
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            for row in pending:
                db.execute("INSERT OR IGNORE INTO inbox(message_id,sender,stamp,payload) VALUES(?,?,?,?)", row)
        return len(pending)

    def menu_text(self, menu):
        lines = [menu["greeting"], "", menu["business_name"], f"Cardápio da semana {friendly(menu['week_start'])} a {friendly(menu['week_end'])}:"]
        for offset in range(7):
            day = (iso(menu["week_start"]) + timedelta(days=offset)).isoformat()
            available = [(i+1, item) for i, item in enumerate(menu["items"]) if day in item["available_dates"]]
            if available:
                lines.append("\n" + friendly(day))
                for number, item in available:
                    lines.append(f"{number}. {item['name']} — {money(item['price_cents'])}" + (" · " + item["description"] if item["description"] else ""))
        lines.append("\nPara qual dia deseja a entrega? Responda DD/MM/AAAA.\nMENU: recomeçar · CANCELAR: descartar rascunho · ATENDENTE: contato humano.")
        return "\n".join(lines)

    def begin(self, menu):
        if menu is not None and not menu.get("accepting_orders", True):
            return {}, "Olá! Os pedidos automáticos estão temporariamente pausados. " + self.config.human_contact
        if menu is None or iso(menu["week_end"]) < self.today():
            return {}, "Olá! O cardápio desta semana ainda não foi publicado. " + self.config.human_contact
        return {"stage": "date", "revision": menu["revision"]}, self.menu_text(menu)

    def validate_draft(self, session, menu):
        if menu is not None and not menu.get("accepting_orders", True):
            raise Invalid("Os pedidos automáticos estão temporariamente pausados.")
        if menu is None or session.get("revision") != menu["revision"]:
            raise Invalid("O cardápio foi atualizado. Escolha novamente para confirmar os preços atuais.")
        day = iso(session["delivery"])
        if day < self.today():
            raise Invalid("A data de entrega já passou. Comece um novo pedido.")
        indexed = {item["local_meal_id"]: item for item in menu["items"]}
        total = 0
        for item in session["items"]:
            live = indexed.get(item["local_meal_id"])
            if live is None or session["delivery"] not in live["available_dates"] or live["price_cents"] != item["unit_price_cents"]:
                raise Invalid("Uma marmita ou preço foi alterado. Comece um novo pedido.")
            total += integer(item["quantity"], 1, 10000) * integer(item["unit_price_cents"], 1, MAX_PRICE)
            if total > MAX_TOTAL:
                raise Invalid("O total do pedido excede o limite permitido.")
        return total

    def reply(self, session, body, message, menu, db):
        command = normalize(body)
        stage = session.get("stage", "")
        if command == "ATENDENTE":
            return {"stage": "paused"}, "Atendimento automático pausado. " + self.config.human_contact + "\nDigite MENU para voltar ao pedido automático."
        if command in ("MENU", "RECOMECAR"):
            return self.begin(menu)
        if command == "CANCELAR":
            if stage == "done":
                return session, "O pedido já foi registrado. Para cancelar esse pedido, " + self.config.human_contact
            return {}, "Rascunho descartado. Nenhum pedido foi registrado. Digite MENU para começar."
        if stage == "paused":
            return session, None
        if not stage:
            return self.begin(menu)
        if stage == "done":
            return session, "Seu pedido já foi registrado para entrega. Digite MENU para fazer outro pedido. Para alterações, " + self.config.human_contact
        if menu is not None and not menu.get("accepting_orders", True):
            return self.begin(menu)
        if not body:
            return session, "Por enquanto, envie o pedido por texto. Digite MENU para ver as opções ou ATENDENTE para contato humano."
        if menu is None or session.get("revision") != menu["revision"]:
            fresh, answer = self.begin(menu)
            return fresh, "O cardápio foi atualizado. Vamos conferir o pedido desde o início.\n\n" + answer
        if stage == "date":
            if not re.fullmatch(r"\d{2}/\d{2}/\d{4}", body.strip()):
                return session, "Informe a entrega no formato DD/MM/AAAA."
            try:
                parsed = datetime.strptime(body.strip(), "%d/%m/%Y").date()
            except ValueError:
                return session, "Essa data não existe. Use DD/MM/AAAA."
            available = [(i+1, item) for i,item in enumerate(menu["items"]) if parsed.isoformat() in item["available_dates"]]
            if parsed < self.today() or not available:
                return session, "Não há entregas disponíveis nessa data. Escolha um dia futuro ou hoje dentro do cardápio publicado."
            session.update(stage="items", delivery=parsed.isoformat())
            options = "\n".join(f"{i}. {item['name']} — {money(item['price_cents'])}" for i,item in available)
            return session, f"Entrega em {parsed.strftime('%d/%m/%Y')}:\n{options}\n\nInforme número da opção e quantidade. Exemplo: 1x2, 3x1."
        if stage == "items":
            if not re.fullmatch(r"\s*\d+\s*[xX×]\s*\d+(?:\s*[,;]\s*\d+\s*[xX×]\s*\d+)*\s*", body):
                return session, "Use opção x quantidade, separadas por vírgula. Exemplo: 1x2, 3x1."
            counts = {}
            try:
                for option, quantity in re.findall(r"(\d+)\s*[xX×]\s*(\d+)", body):
                    number = integer(int(option), 1, len(menu["items"]))
                    counts[number] = integer(counts.get(number, 0) + int(quantity), 1, 10000)
                items = []
                for option, quantity in counts.items():
                    item = menu["items"][option-1]
                    if session["delivery"] not in item["available_dates"]:
                        raise Invalid("Essa opção não está disponível no dia escolhido.")
                    items.append({"local_meal_id": item["local_meal_id"], "name": item["name"], "quantity": quantity, "unit_price_cents": item["price_cents"]})
                session["items"] = items
                self.validate_draft(session, menu)
            except (Invalid, ValueError):
                return session, "Confira as opções disponíveis e use quantidades de 1 a 10.000, dentro do limite de valor do pedido."
            session["stage"] = "name"
            return session, "Qual é o nome de quem receberá o pedido?"
        if stage == "name":
            try:
                session["name"] = text(body, 120)
            except Invalid:
                return session, "Informe um nome com até 120 caracteres."
            session["stage"] = "address"
            return session, "Informe o endereço completo da entrega: rua, número, bairro e complemento, se houver."
        if stage == "address":
            try:
                session["address"] = text(body, 500)
            except Invalid:
                return session, "Informe o endereço em texto, com até 500 caracteres."
            session["stage"] = "notes"
            return session, "Alguma observação? Escreva SEM se não houver."
        if stage == "notes":
            try:
                session["notes"] = "" if command == "SEM" else text(body, 2000)
                total = self.validate_draft(session, menu)
            except Invalid as e:
                return session, str(e)
            session["stage"] = "confirm"
            lines = ["Confira antes de confirmar:", session["name"], session["address"], "Entrega: " + friendly(session["delivery"])]
            for item in session["items"]:
                lines.append(f"{item['quantity']}x {item['name']} — {money(item['unit_price_cents'])} cada — {money(item['quantity']*item['unit_price_cents'])}")
            if session["notes"]:
                lines.append("Observações: " + session["notes"])
            lines.extend(["Total: " + money(total), "Responda CONFIRMAR para registrar ou CANCELAR para descartar. Não há cobrança automática por este atendimento."])
            return session, "\n".join(lines)
        if stage == "confirm":
            if command != "CONFIRMAR":
                return session, "Para registrar este pedido, responda CONFIRMAR. Para descartar, responda CANCELAR."
            try:
                self.validate_draft(session, menu)
            except Invalid as e:
                fresh, answer = self.begin(menu)
                return fresh, str(e) + "\n\n" + answer
            order_id = str(uuid.uuid4())
            order = {"external_id": order_id, "customer": {"name": session["name"], "phone": message["sender"], "address": session["address"]},
                     "ordered": self.today().isoformat(), "delivery": session["delivery"], "status": "pending", "notes": session["notes"], "items": session["items"]}
            db.execute("INSERT INTO orders(external_id,confirm_message_id,payload,created) VALUES(?,?,?,?)", (order_id, message["message_id"], json.dumps(order, ensure_ascii=False), int(self.clock())))
            return {"stage": "done", "order_id": order_id}, "Pedido confirmado e registrado para entrega em " + friendly(session["delivery"]) + ". Total: " + money(sum(i["quantity"]*i["unit_price_cents"] for i in session["items"])) + ".\nA equipe receberá o pedido no Marmita Fácil quando o aplicativo sincronizar."
        return self.begin(menu)

    def process_one(self):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT * FROM inbox WHERE processed=0 ORDER BY stamp,seq LIMIT 1").fetchone()
            if row is None:
                return False
            old = db.execute("SELECT * FROM sessions WHERE sender=?", (row["sender"],)).fetchone()
            if int(self.clock()) >= row["stamp"] + WINDOW or (old and row["stamp"] < old["last_processed"]):
                db.execute("UPDATE inbox SET processed=1 WHERE seq=?", (row["seq"],))
                return True
            session = json.loads(old["payload"]) if old else {}
            # A new contact after a day starts a fresh ordering conversation.
            # An explicit human handoff remains paused until MENU/RECOMEÇAR.
            if old and row["stamp"] - old["last_processed"] >= WINDOW and session.get("stage") != "paused":
                session = {}
            message = json.loads(row["payload"])
            updated, reply = self.reply(session, message["text"], row, self.current_menu(db), db)
            db.execute("INSERT INTO sessions(sender,payload,last_processed) VALUES(?,?,?) ON CONFLICT(sender) DO UPDATE SET payload=excluded.payload,last_processed=excluded.last_processed",
                       (row["sender"], json.dumps(updated, ensure_ascii=False), row["stamp"]))
            if reply:
                for part, body in enumerate(message_parts(reply)):
                    db.execute("INSERT INTO outbox(inbox_id,part,recipient,body) VALUES(?,?,?,?)", (row["seq"], part, row["sender"], body))
            db.execute("UPDATE inbox SET processed=1 WHERE seq=?", (row["seq"],))
        return True

    def graph_send(self, recipient, body):
        endpoint = f"https://graph.facebook.com/{self.config.graph_version}/{quote(self.config.phone_number_id, safe='')}/messages"
        raw = json.dumps({"messaging_product": "whatsapp", "recipient_type": "individual", "to": recipient,
                          "type": "text", "text": {"preview_url": False, "body": body}}).encode()
        request = Request(endpoint, data=raw, headers={"Authorization": "Bearer " + self.config.access_token, "Content-Type": "application/json"}, method="POST")
        with urlopen(request, timeout=20) as result:
            response = json.load(result)
        try:
            return text(response["messages"][0]["id"], 256)
        except (KeyError, IndexError, TypeError, Invalid) as e:
            raise URLError("Resposta de aceite da Meta inválida.") from e

    def send_one(self):
        if not self.config.send_enabled:
            return False
        now = int(self.clock())
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT o.* FROM outbox o WHERE ((o.state='pending' AND o.next_attempt<=?) OR (o.state='sending' AND o.lease<?)) AND NOT EXISTS (SELECT 1 FROM outbox p WHERE p.recipient=o.recipient AND p.id<o.id AND p.state IN ('pending','sending')) ORDER BY o.id LIMIT 1", (now, now)).fetchone()
            if row is None:
                return False
            latest = db.execute("SELECT MAX(stamp) FROM inbox WHERE sender=?", (row["recipient"],)).fetchone()[0]
            trigger = db.execute("SELECT stamp FROM inbox WHERE seq=?", (row["inbox_id"],)).fetchone()
            # Also expire old replies themselves: a new customer message must not
            # resurrect a menu/confirmation left unsent several days earlier.
            if latest is None or trigger is None or now >= min(latest, trigger[0]) + WINDOW:
                db.execute("UPDATE outbox SET state='expired',last_error='Janela de atendimento encerrada' WHERE id=?", (row["id"],))
                return True
            db.execute("UPDATE outbox SET state='sending',lease=?,attempts=attempts+1 WHERE id=?", (now+60, row["id"]))
        try:
            meta_id = self.transport(row["recipient"], row["body"])
        except Exception as e:
            retry = not isinstance(e, HTTPError) or e.code == 429 or e.code >= 500
            attempts = row["attempts"] + 1
            state = "pending" if retry and attempts < 8 else "failed"
            # Do not persist exception strings: HTTP errors/transports can contain secrets.
            kind = "HTTP " + str(e.code) if isinstance(e, HTTPError) else type(e).__name__
            if isinstance(e, HTTPError):
                e.close()
            with self.connect() as db:
                db.execute("UPDATE outbox SET state=?,next_attempt=?,lease=0,last_error=? WHERE id=?", (state, now+min(900, 2**attempts*5), kind, row["id"]))
        else:
            with self.connect() as db:
                db.execute("UPDATE outbox SET state='sent',lease=0,meta_message_id=?,last_error='' WHERE id=?", (str(meta_id)[:256], row["id"]))
        return True

    def pending_orders(self, limit):
        with self.connect() as db:
            return [json.loads(r[0]) for r in db.execute("SELECT payload FROM orders WHERE local_order_id IS NULL ORDER BY created,external_id LIMIT ?", (limit,))]

    def acknowledge(self, order_id, local_order_id):
        integer(local_order_id)
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT local_order_id FROM orders WHERE external_id=?", (order_id,)).fetchone()
            if row is None:
                return False
            if row[0] is not None and row[0] != local_order_id:
                raise Invalid("Pedido já associado a outro registro local.")
            db.execute("UPDATE orders SET local_order_id=? WHERE external_id=?", (local_order_id, order_id))
        return True


class Application:
    def __init__(self, gateway):
        self.gateway = gateway

    def __call__(self, environ, start_response):
        try:
            status, value, content_type = self.route(environ)
        except PermissionError as e:
            status, value, content_type = 403, {"error": str(e)}, "application/json"
        except Invalid as e:
            status, value, content_type = 400, {"error": str(e)}, "application/json"
        except (ValueError, KeyError, UnicodeDecodeError, TypeError):
            status, value, content_type = 400, {"error": "Requisição inválida. Confira os campos e o formato dos dados."}, "application/json"
        except sqlite3.Error:
            status, value, content_type = 503, {"error": "Armazenamento indisponível. Tente novamente."}, "application/json"
        except Exception:
            status, value, content_type = 500, {"error": "Falha interna. Consulte o operador do serviço."}, "application/json"
        raw = json.dumps(value, ensure_ascii=False).encode() if content_type == "application/json" else value.encode()
        phrases = {200:"OK",400:"Bad Request",401:"Unauthorized",403:"Forbidden",404:"Not Found",405:"Method Not Allowed",413:"Payload Too Large",500:"Internal Server Error",503:"Service Unavailable"}
        start_response(f"{status} {phrases[status]}", [("Content-Type", content_type+"; charset=utf-8"), ("Content-Length",str(len(raw))),
            ("Cache-Control","no-store"),("X-Content-Type-Options","nosniff")])
        return [raw]

    def read_body(self, environ):
        length = environ.get("CONTENT_LENGTH", "")
        if not length.isdigit() or int(length) > MAX_BODY:
            raise Invalid("Corpo ausente ou grande demais.")
        raw = environ["wsgi.input"].read(int(length))
        if len(raw) != int(length):
            raise Invalid("Corpo incompleto.")
        return raw

    def route(self, env):
        method, path = env["REQUEST_METHOD"], env.get("PATH_INFO", "/")
        query = parse_qs(env.get("QUERY_STRING", ""), keep_blank_values=True)
        g = self.gateway
        if env.get("CONTENT_LENGTH", "").isdigit() and int(env["CONTENT_LENGTH"]) > MAX_BODY:
            return 413, {"error":"Requisição excede 1 MB."}, "application/json"
        if path == "/webhook":
            if method == "GET":
                token = query.get("hub.verify_token", [""])[0]
                if query.get("hub.mode", [""])[0] == "subscribe" and hmac.compare_digest(token, g.config.verify_token):
                    return 200, text(query.get("hub.challenge", [""])[0], 1000), "text/plain"
                raise PermissionError("Verificação do webhook recusada.")
            if method == "POST":
                g.receive(self.read_body(env), env.get("HTTP_X_HUB_SIGNATURE_256"))
                return 200, {"ok":True}, "application/json"
            return 405, {"error":"Método não permitido."}, "application/json"
        if not path.startswith("/api/v1/"):
            return 404, {"error":"Rota não encontrada."}, "application/json"
        if not hmac.compare_digest(env.get("HTTP_AUTHORIZATION", ""), "Bearer " + g.config.owner_token):
            return 401, {"error":"Chave de integração ausente ou inválida."}, "application/json"
        if path == "/api/v1/health" and method == "GET":
            menu = g.current_menu()
            return 200, {"ok":True,"protocol":1,"business_name": menu["business_name"] if menu else "Marmita Fácil", "phone_number_id":g.config.phone_number_id}, "application/json"
        if path == "/api/v1/menu":
            if method == "GET":
                return 200, g.current_menu() or {}, "application/json"
            if method == "PUT":
                return 200, g.publish(json.loads(self.read_body(env))), "application/json"
            return 405, {"error":"Método não permitido."}, "application/json"
        if path == "/api/v1/orders" and method == "GET":
            raw = query.get("limit", ["100"])[0]
            if not re.fullmatch(r"[0-9]{1,3}", raw):
                raise Invalid("Limite inválido.")
            return 200, {"orders":g.pending_orders(integer(int(raw), 1, 100)), "phone_number_id":g.config.phone_number_id}, "application/json"
        match = re.fullmatch(r"/api/v1/orders/([0-9a-f-]{36})/ack", path)
        if match and method == "POST":
            body = json.loads(self.read_body(env))
            if not isinstance(body, dict):
                raise Invalid("Confirmação de importação inválida.")
            found = g.acknowledge(match[1], body.get("local_order_id"))
            return (200, {"ok":True}, "application/json") if found else (404, {"error":"Pedido não encontrado."}, "application/json")
        return 404, {"error":"Rota não encontrada ou método não permitido."}, "application/json"


def create_app():
    return Application(Gateway(Config.from_env()))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["serve","worker"])
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    try:
        gateway = Gateway(Config.from_env())
    except Invalid as e:
        parser.error(str(e))
    if args.action == "serve":
        print("Servidor local em http://127.0.0.1:"+str(args.port)+"; publique somente atrás de HTTPS.", flush=True)
        make_server("127.0.0.1", args.port, Application(gateway)).serve_forever()
    else:
        print("Worker iniciado. Envio Meta habilitado: "+str(gateway.config.send_enabled), flush=True)
        try:
            while True:
                processed = gateway.process_one()
                sent = gateway.send_one()
                if not processed and not sent:
                    time.sleep(1)
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
