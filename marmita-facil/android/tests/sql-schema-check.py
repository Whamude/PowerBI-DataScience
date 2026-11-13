"""Validate the exact SQLite DDL extracted from Store.java, not Android runtime."""
from pathlib import Path
import re
import sqlite3

source=(Path(__file__).resolve().parents[1]/'app/src/main/java/br/com/marmitafacil/app/Store.java').read_text(encoding='utf-8')
statements=re.findall(r'db\.execSQL\("([^"]+)"\)',source)
legacy=[s for s in statements if 'whatsapp_imports' not in s]
migration=[s for s in statements if 'CREATE TABLE whatsapp_imports' in s]
assert len(migration)==1
db=sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys=ON')
for statement in legacy:db.execute(statement)
db.execute('INSERT INTO customers VALUES(?,?,?,?,?)',(1,'Cliente anterior','5511999990000','Endereço antigo do cadastro',1))
db.execute('INSERT INTO meals VALUES(?,?,?,?,?)',(1,'Marmita anterior','',2200,1))
db.execute('INSERT INTO orders VALUES(?,?,?,?,?,?,?,?,?)',(1,1,'Cliente anterior','5511999990000','Endereço confirmado no pedido','2026-11-13','2026-11-14','pending',''))
db.execute('INSERT INTO items VALUES(?,?,?,?,?,?)',(1,1,1,'Marmita anterior',2,1900))
db.commit()
db.execute(migration[0])
assert db.execute('SELECT COUNT(*) FROM customers').fetchone()[0]==1
assert db.execute('SELECT quantity*price FROM items').fetchone()[0]==3800
assert db.execute('SELECT address FROM orders').fetchone()[0]=='Endereço confirmado no pedido'
db.execute('INSERT INTO whatsapp_imports(source_namespace,external_id,order_id) VALUES(?,?,?)',('https://loja.example#phone=123','remote-1',1))
db.commit()
try:
    db.execute('INSERT INTO whatsapp_imports(source_namespace,external_id,order_id) VALUES(?,?,?)',('https://loja.example#phone=123','remote-1',1))
except sqlite3.IntegrityError:pass
else:raise AssertionError('Duplicate import accepted')
db.rollback()
try:
    db.execute('INSERT INTO whatsapp_imports(source_namespace,external_id,order_id) VALUES(?,?,?)',('https://loja.example#phone=123','remote-2',999))
except sqlite3.IntegrityError:pass
else:raise AssertionError('Import without order accepted')
db.rollback()
db.execute('BEGIN')
db.execute('DELETE FROM whatsapp_imports')
db.execute('DELETE FROM items')
db.execute('DELETE FROM orders')
db.execute('DELETE FROM meals')
db.execute('DELETE FROM customers')
db.rollback()
assert db.execute('SELECT COUNT(*) FROM orders').fetchone()[0]==1
assert db.execute('SELECT COUNT(*) FROM whatsapp_imports').fetchone()[0]==1
print('PASS: SQLite DDL migration preserves v1 data/snapshots/cents; duplicate and orphan imports are rejected; rollback preserves records.')
