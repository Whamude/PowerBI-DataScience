import hashlib
import hmac
import io
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from datetime import datetime, timezone, timedelta
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from wsgiref.simple_server import make_server, WSGIRequestHandler

from service import Application, Config, Gateway, Invalid, MAX_BODY, WINDOW, validate_menu, message_parts, text


class Clock:
    def __init__(self):self.now=int(datetime(2026,11,13,15,tzinfo=timezone.utc).timestamp())
    def __call__(self):return self.now


class QuietHandler(WSGIRequestHandler):
    def log_message(self,*args):pass


class GatewayTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.clock=Clock();self.sent=[]
        self.config=Config(Path(self.temp.name)/'db.sqlite', 'o'*40, 's'*32, 'v'*40, '123456789', 'a'*40, 'v25.0',
            'Ligue para (11) 3333-4444 para atendimento humano.', timezone(timedelta(hours=-3)), True)
        self.g=Gateway(self.config,self.clock,lambda phone,body:self.sent.append((phone,body)) or 'wamid.sent')
        self.app=Application(self.g)
        self.counter=0
        self.menu={'business_name':'Marmitas da Maria','greeting':'Olá! Seja bem-vindo!','week_start':'2026-11-09','week_end':'2026-11-15',
            'items':[{'local_meal_id':1,'name':'Tradicional','description':'Arroz e feijão','price_cents':1900,'available_dates':['2026-11-13','2026-11-14']},
                     {'local_meal_id':2,'name':'Vegetariana','description':'Sem carne','price_cents':2500,'available_dates':['2026-11-14']}]}
        self.g.publish(self.menu)

    def call(self,path,method='GET',body=None,authorized=True,headers=None):
        raw=body if isinstance(body,bytes) else json.dumps(body).encode() if body is not None else b''
        path,_,query=path.partition('?')
        env={'REQUEST_METHOD':method,'PATH_INFO':path,'QUERY_STRING':query,'wsgi.input':io.BytesIO(raw),'CONTENT_LENGTH':str(len(raw))}
        if authorized:env['HTTP_AUTHORIZATION']='Bearer '+self.config.owner_token
        env.update(headers or {})
        response=[]
        out=b''.join(self.app(env,lambda status,headers:response.append((status,headers))))
        return int(response[0][0].split()[0]), json.loads(out) if response[0][1][0][1].startswith('application/json') else out.decode()

    def envelope(self,body,mid=None,phone=None,sender='5511999990000',stamp=None,kind='text'):
        self.counter+=1
        message={'id':mid or 'wamid.in.'+str(self.counter),'from':sender,'timestamp':str(stamp if stamp is not None else self.clock.now),'type':kind}
        if kind=='text':message['text']={'body':body}
        return {'object':'whatsapp_business_account','entry':[{'id':'waba','changes':[{'field':'messages','value':{'metadata':{'phone_number_id':phone or self.config.phone_number_id},'messages':[message]}}]}]}

    def incoming(self,body,process=True,**kwargs):
        self.clock.now+=1
        payload=self.envelope(body,**kwargs);raw=json.dumps(payload).encode()
        signature='sha256='+hmac.new(self.config.app_secret.encode(),raw,hashlib.sha256).hexdigest()
        status,value=self.call('/webhook','POST',raw,False,{'HTTP_X_HUB_SIGNATURE_256':signature})
        self.assertEqual(status,200,value)
        if process:
            while self.g.process_one():pass
        return payload

    def replies(self):
        with self.g.connect() as db:return [r[0] for r in db.execute('SELECT body FROM outbox ORDER BY id')]

    def draft(self):
        for value in ['oi','14/11/2026','1x2, 2x1','João da Silva','Rua Um, 20, Centro','Sem pimenta']:self.incoming(value)

    def confirmed(self):
        self.draft();self.incoming('CONFIRMAR')
        return self.g.pending_orders(100)[0]

    def test_full_order_is_created_only_after_explicit_confirmation(self):
        self.draft()
        self.assertEqual(self.g.pending_orders(100),[])
        self.assertIn('R$ 63,00',self.replies()[-1]);self.assertIn('R$ 19,00 cada',self.replies()[-1])
        self.incoming('SIM');self.assertEqual(self.g.pending_orders(100),[])
        self.incoming('CONFIRMAR');order=self.g.pending_orders(100)[0]
        self.assertEqual(order['customer'],{'name':'João da Silva','phone':'5511999990000','address':'Rua Um, 20, Centro'})
        self.assertEqual(order['delivery'],'2026-11-14');self.assertEqual(order['ordered'],'2026-11-13')
        self.assertEqual(order['status'],'pending');self.assertEqual(order['notes'],'Sem pimenta')
        self.assertEqual(sum(i['quantity']*i['unit_price_cents'] for i in order['items']),6300)

    def test_greeting_weekly_menu_contains_prices_dates_and_guidance(self):
        self.incoming('Olá')
        body=''.join(self.replies())
        for part in ['Seja bem-vindo','Marmitas da Maria','Tradicional','Vegetariana','R$ 19,00','R$ 25,00','14/11/2026','DD/MM/AAAA']:
            self.assertIn(part,body)

    def test_duplicate_webhook_and_confirmation_do_not_duplicate_orders(self):
        self.draft();self.incoming('CONFIRMAR',mid='wamid.confirm')
        n=len(self.replies());self.incoming('CONFIRMAR',mid='wamid.confirm')
        self.assertEqual(len(self.replies()),n)
        self.incoming('CONFIRMAR',mid='wamid.another')
        self.assertEqual(len(self.g.pending_orders(100)),1)

    def test_returning_customer_gets_fresh_greeting_after_24_hours(self):
        self.confirmed();self.clock.now+=WINDOW
        self.incoming('oi')
        self.assertIn('Seja bem-vindo',self.replies()[-1])
        self.assertIn('DD/MM/AAAA',self.replies()[-1])
        self.assertEqual(len(self.g.pending_orders(100)),1)

    def test_human_pause_survives_24_hours_until_explicit_menu(self):
        self.incoming('ATENDENTE');n=len(self.replies());self.clock.now+=WINDOW
        self.incoming('Meu atendimento continua?')
        self.assertEqual(len(self.replies()),n)
        self.incoming('MENU');self.assertIn('Seja bem-vindo',self.replies()[-1])

    def test_ack_is_idempotent_and_cannot_reassign_local_order(self):
        order=self.confirmed();path='/api/v1/orders/'+order['external_id']+'/ack'
        self.assertEqual(self.call(path,'POST',{'local_order_id':42})[0],200)
        self.assertEqual(self.call(path,'POST',{'local_order_id':42})[0],200)
        self.assertEqual(self.call(path,'POST',{'local_order_id':43})[0],400)
        self.assertEqual(self.call('/api/v1/orders')[1]['orders'],[])

    def test_routes_require_owner_token_and_include_number_identity(self):
        for path in ['/api/v1/health','/api/v1/menu','/api/v1/orders']:
            self.assertEqual(self.call(path,authorized=False)[0],401)
        status,health=self.call('/api/v1/health')
        self.assertEqual(status,200);self.assertEqual(health['protocol'],1)
        self.assertEqual(health['phone_number_id'],self.config.phone_number_id)
        self.assertEqual(self.call('/api/v1/orders')[1]['phone_number_id'],self.config.phone_number_id)

    def test_bad_hmac_is_rejected_before_payload_processing(self):
        self.assertEqual(self.call('/webhook','POST',b'notjson',False,{'HTTP_X_HUB_SIGNATURE_256':'sha256=bad'})[0],403)
        with self.g.connect() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM inbox').fetchone()[0],0)

    def test_unknown_phone_and_mixed_tenant_payloads_are_rejected_atomically(self):
        p=self.envelope('oi');other=self.envelope('oi',phone='9999')
        p['entry']+=other['entry'];raw=json.dumps(p).encode()
        sig='sha256='+hmac.new(self.config.app_secret.encode(),raw,hashlib.sha256).hexdigest()
        self.assertEqual(self.call('/webhook','POST',raw,False,{'HTTP_X_HUB_SIGNATURE_256':sig})[0],403)
        with self.g.connect() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM inbox').fetchone()[0],0)

    def test_webhook_challenge_verification(self):
        good='/webhook?hub.mode=subscribe&hub.verify_token='+self.config.verify_token+'&hub.challenge=123456'
        self.assertEqual(self.call(good,authorized=False),(200,'123456'))
        self.assertEqual(self.call(good.replace(self.config.verify_token,'wrong'),authorized=False)[0],403)

    def test_body_size_is_bounded(self):
        self.assertEqual(self.call('/webhook','POST',b'',False,{'CONTENT_LENGTH':str(MAX_BODY+1)})[0],413)

    def test_malformed_ack_and_webhook_blocks_are_client_errors(self):
        order=self.confirmed()
        self.assertEqual(self.call('/api/v1/orders/'+order['external_id']+'/ack','POST',[])[0],400)
        for payload in [{'object':'whatsapp_business_account','entry':[None]},
                        {'object':'whatsapp_business_account','entry':[{'changes':[{'field':'messages','value':None}]}]}]:
            raw=json.dumps(payload).encode();sig='sha256='+hmac.new(self.config.app_secret.encode(),raw,hashlib.sha256).hexdigest()
            self.assertEqual(self.call('/webhook','POST',raw,False,{'HTTP_X_HUB_SIGNATURE_256':sig})[0],400)

    def test_menu_rejects_invalid_week_ids_money_and_availability(self):
        edits=[lambda m:m.update(week_start='2026-11-10'),lambda m:m.update(week_end='2026-11-16'),
               lambda m:m['items'][0].update(price_cents=19.99),lambda m:m['items'][0].update(price_cents=True),
               lambda m:m['items'][0].update(price_cents=0),lambda m:m['items'][0].update(available_dates=['2026-11-16']),
               lambda m:m['items'][0].update(available_dates=['2026-11-13','2026-11-13']),
               lambda m:m['items'][0].update(available_dates=[[1]]),lambda m:m['items'][1].update(local_meal_id=1),
               lambda m:m.update(accepting_orders='false')]
        for edit in edits:
            value=json.loads(json.dumps(self.menu));edit(value)
            with self.subTest(value=value):self.assertEqual(self.call('/api/v1/menu','PUT',value)[0],400)

    def test_invalid_dates_quantities_unavailable_options_do_not_advance(self):
        self.incoming('oi')
        for body in ['31/02/2026','12/11/2026','2026-11-14','16/11/2026']:
            self.incoming(body);self.assertEqual(self.g.pending_orders(100),[])
        self.incoming('13/11/2026')
        for body in ['2x1','1x0','1x10001','1x-1','um de cada','1x1,1x10000']:
            self.incoming(body);self.assertEqual(self.g.pending_orders(100),[])
        self.incoming('1x2');self.assertIn('nome',self.replies()[-1])

    def test_menu_revision_change_requires_reselection(self):
        self.draft();value=json.loads(json.dumps(self.menu));value['items'][0]['price_cents']=9900
        self.g.publish(value);self.incoming('CONFIRMAR')
        self.assertEqual(self.g.pending_orders(100),[]);self.assertIn('atualizado',self.replies()[-1])
        self.assertIn('R$ 99,00',self.replies()[-1])

    def test_existing_order_prices_survive_menu_update(self):
        self.confirmed();value=json.loads(json.dumps(self.menu));value['items'][0]['price_cents']=9900
        self.g.publish(value);self.assertEqual(self.g.pending_orders(100)[0]['items'][0]['unit_price_cents'],1900)

    def test_pausing_acceptance_blocks_new_and_existing_drafts(self):
        self.draft();self.menu['accepting_orders']=False;self.g.publish(self.menu)
        self.incoming('CONFIRMAR');self.assertEqual(self.g.pending_orders(100),[])
        self.assertIn('pausados',self.replies()[-1]);self.incoming('MENU')
        self.assertIn('pausados',self.replies()[-1])

    def test_cancel_does_not_silently_cancel_confirmed_order(self):
        self.incoming('oi');self.incoming('CANCELAR');self.assertEqual(self.g.pending_orders(100),[])
        self.incoming('MENU');self.incoming('14/11/2026');self.incoming('1x1');self.incoming('João');self.incoming('Rua A');self.incoming('SEM');self.incoming('CONFIRMAR')
        self.incoming('CANCELAR');self.assertEqual(len(self.g.pending_orders(100)),1)
        self.assertIn('atendimento humano',self.replies()[-1])

    def test_human_contact_pauses_automatic_responses_until_menu(self):
        self.incoming('ATENDENTE');self.assertIn('3333-4444',self.replies()[-1]);n=len(self.replies())
        self.incoming('Preciso de ajuda');self.assertEqual(len(self.replies()),n)
        self.incoming('MENU');self.assertGreater(len(self.replies()),n)

    def test_messages_are_durable_before_worker_and_survive_restart(self):
        self.incoming('oi',process=False);self.assertEqual(self.replies(),[])
        other=Gateway(self.config,self.clock,lambda *args:'sent')
        self.assertTrue(other.process_one());self.assertIn('bem-vindo',self.replies()[-1])

    def test_concurrent_workers_do_not_duplicate_confirmation(self):
        self.draft();self.incoming('CONFIRMAR',process=False)
        errors=[]
        def worker():
            try:Gateway(self.config,self.clock,lambda *args:'sent').process_one()
            except Exception as e:errors.append(e)
        threads=[threading.Thread(target=worker) for _ in range(3)]
        for t in threads:t.start()
        for t in threads:t.join()
        self.assertEqual(errors,[]);self.assertEqual(len(self.g.pending_orders(100)),1)

    def test_expired_inbox_and_outbox_are_never_sent(self):
        self.incoming('oi',process=False,stamp=self.clock.now-WINDOW-1)
        self.g.process_one();self.assertEqual(self.replies(),[])
        self.incoming('oi');self.clock.now+=WINDOW+1
        self.assertTrue(self.g.send_one());self.assertEqual(self.sent,[])
        with self.g.connect() as db:self.assertEqual(db.execute('SELECT state FROM outbox').fetchone()[0],'expired')

    def test_outbox_retry_is_bounded_and_expires_after_window(self):
        self.incoming('oi')
        def fail(*args):raise URLError('secret-token-must-not-be-stored')
        self.g.transport=fail;self.g.send_one()
        with self.g.connect() as db:
            row=db.execute('SELECT * FROM outbox').fetchone()
            self.assertEqual(row['state'],'pending');self.assertNotIn('secret',row['last_error'])
        self.clock.now+=WINDOW+1;self.g.send_one()
        with self.g.connect() as db:self.assertEqual(db.execute('SELECT state FROM outbox').fetchone()[0],'expired')

    def test_retry_stops_after_eight_failed_attempts(self):
        self.incoming('oi');attempts=[]
        def fail(*args):attempts.append(1);raise URLError('unavailable')
        self.g.transport=fail
        for _ in range(10):self.g.send_one();self.clock.now+=1000
        self.assertEqual(len(attempts),8)
        with self.g.connect() as db:self.assertEqual(db.execute('SELECT state FROM outbox').fetchone()[0],'failed')

    def test_long_text_chunks_preserve_unicode_and_platform_limits(self):
        body='🍱 Bem-vindo! '*2000
        parts=list(message_parts(body))
        self.assertEqual(''.join(parts),body)
        self.assertTrue(all(len(p.encode('utf-16-le'))//2<=3500 for p in parts))

    def test_text_lengths_match_android_utf16_and_reject_invalid_unicode(self):
        self.assertEqual(text('🍱'*250,500),'🍱'*250)
        self.assertEqual(text('🍱'*60,120),'🍱'*60)
        self.assertEqual(text('🍱'*1000,2000),'🍱'*1000)
        for value,limit in [('🍱'*251,500),('🍱'*61,120),('🍱'*1001,2000),('\ud800',120)]:
            with self.subTest(limit=limit):
                with self.assertRaises(Invalid):text(value,limit)

    def test_new_contact_does_not_resurrect_expired_queued_reply(self):
        self.incoming('oi');self.clock.now+=WINDOW+1
        self.incoming('MENU')
        self.g.send_one();self.assertEqual(self.sent,[])
        self.g.send_one();self.assertEqual(len(self.sent),1)

    def test_permanent_graph_errors_do_not_loop(self):
        self.incoming('oi')
        def fail(*args):raise HTTPError('https://graph.facebook.com',400,'Bad',{},None)
        self.g.transport=fail;self.g.send_one()
        with self.g.connect() as db:self.assertEqual(db.execute('SELECT state FROM outbox').fetchone()[0],'failed')

    def test_disabled_send_never_calls_transport(self):
        self.incoming('oi')
        config=Config(**{**self.config.__dict__,'send_enabled':False})
        disabled=Gateway(config,self.clock,lambda *args:self.fail('Must not send'))
        self.assertFalse(disabled.send_one())

    def test_reply_order_preserved_without_blocking_other_customers(self):
        self.incoming('oi');self.incoming('14/11/2026');self.incoming('oi',sender='5511888880000')
        with self.g.connect() as db:db.execute('UPDATE outbox SET next_attempt=? WHERE id=1',(self.clock.now+1000,))
        self.assertTrue(self.g.send_one());self.assertEqual(self.sent[0][0],'5511888880000')

    def test_graph_request_contract_uses_configured_version_and_token(self):
        calls=[]
        class Response(io.BytesIO):
            def __enter__(self):return self
            def __exit__(self,*args):self.close()
        def fake(req,timeout):calls.append((req,timeout));return Response(b'{"messages":[{"id":"wamid.accepted"}]}')
        with patch('service.urlopen',fake):self.assertEqual(self.g.graph_send('5511999990000','Olá'),'wamid.accepted')
        req,timeout=calls[0]
        self.assertEqual(req.full_url,'https://graph.facebook.com/v25.0/123456789/messages');self.assertEqual(timeout,20)
        self.assertEqual(req.get_header('Authorization'),'Bearer '+self.config.access_token)
        self.assertEqual(json.loads(req.data)['text']['body'],'Olá')

    def test_real_local_http_wsgi_round_trip(self):
        server=make_server('127.0.0.1',0,self.app,handler_class=QuietHandler)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            req=Request('http://127.0.0.1:'+str(server.server_port)+'/api/v1/health',headers={'Authorization':'Bearer '+self.config.owner_token})
            with urlopen(req,timeout=3) as response:self.assertEqual(json.load(response)['business_name'],'Marmitas da Maria')
            base='http://127.0.0.1:'+str(server.server_port)
            auth={'Authorization':'Bearer '+self.config.owner_token,'Content-Type':'application/json'}
            for body in ['oi','14/11/2026','1x2, 2x1','João da Silva','Rua Um, 20','SEM','CONFIRMAR']:
                self.clock.now+=1;raw=json.dumps(self.envelope(body)).encode()
                sig='sha256='+hmac.new(self.config.app_secret.encode(),raw,hashlib.sha256).hexdigest()
                req=Request(base+'/webhook',data=raw,headers={'X-Hub-Signature-256':sig,'Content-Type':'application/json'},method='POST')
                with urlopen(req,timeout=3) as response:self.assertTrue(json.load(response)['ok'])
                while self.g.process_one():pass
                while self.g.send_one():pass
            with urlopen(Request(base+'/api/v1/orders',headers=auth),timeout=3) as response:orders=json.load(response)['orders']
            self.assertEqual(len(orders),1);self.assertEqual(orders[0]['items'][0]['unit_price_cents'],1900)
            ack=Request(base+'/api/v1/orders/'+orders[0]['external_id']+'/ack',data=b'{"local_order_id":42}',headers=auth,method='POST')
            with urlopen(ack,timeout=3) as response:self.assertTrue(json.load(response)['ok'])
            self.assertEqual(self.g.pending_orders(100),[])
            self.assertGreaterEqual(len(self.sent),7)
        finally:server.shutdown();server.server_close();thread.join(timeout=3)

    def test_storage_failure_does_not_acknowledge_webhook(self):
        payload=self.envelope('oi');raw=json.dumps(payload).encode();sig='sha256='+hmac.new(self.config.app_secret.encode(),raw,hashlib.sha256).hexdigest()
        import sqlite3
        with patch.object(self.g,'receive',side_effect=sqlite3.OperationalError('disk unavailable')):
            self.assertEqual(self.call('/webhook','POST',raw,False,{'HTTP_X_HUB_SIGNATURE_256':sig})[0],503)

    def test_empty_or_expired_menu_does_not_collect_order(self):
        with self.g.connect() as db:db.execute('DELETE FROM menu')
        self.incoming('oi');self.assertIn('ainda não foi publicado',self.replies()[-1])
        self.g.publish(self.menu);self.clock.now+=7*WINDOW;self.incoming('MENU')
        self.assertIn('ainda não foi publicado',self.replies()[-1]);self.assertEqual(self.g.pending_orders(100),[])


if __name__=='__main__':unittest.main(verbosity=2)
