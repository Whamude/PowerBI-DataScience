package br.com.marmitafacil.app;

import org.json.JSONArray;
import org.json.JSONObject;

/** Pure-JVM protocol validation tests. These do not simulate an Android device. */
public final class WhatsAppValidationTest {
    private static int checks;
    private interface Action {void run()throws Exception;}
    private interface Edit {void run(JSONObject value)throws Exception;}
    private static void eq(Object expected,Object actual){checks++;if(!expected.equals(actual))throw new AssertionError("Expected "+expected+", got "+actual);}
    private static void rejects(Action action)throws Exception{checks++;try{action.run();}catch(IllegalArgumentException|org.json.JSONException e){return;}throw new AssertionError("Invalid input accepted");}
    private static JSONObject remote()throws Exception {
        JSONObject order=new JSONObject().put("external_id","8d365c28-5c10-4197-8cad-d6b8bca6b707");
        order.put("customer",new JSONObject().put("name","João Silva").put("phone","5511999990000").put("address","Rua Um, 30"));
        order.put("ordered","2026-11-13").put("delivery","2026-11-14").put("status","pending").put("notes","Sem sal");
        order.put("items",new JSONArray().put(new JSONObject().put("local_meal_id",1).put("name","Tradicional").put("quantity",2).put("unit_price_cents",1900))
            .put(new JSONObject().put("local_meal_id",2).put("name","Fitness").put("quantity",1).put("unit_price_cents",2500)));
        return order;
    }
    private static void badRemote(Edit edit)throws Exception{JSONObject order=remote();edit.run(order);rejects(()->Store.validateWhatsAppOrder(order));}
    private static JSONObject backup()throws Exception {
        JSONObject value=new JSONObject().put("app","marmita-facil").put("schema_version",2);
        value.put("customers",new JSONArray().put(new JSONObject().put("id",1).put("name","João Silva").put("phone","5511999990000").put("address","Rua Um, 30").put("active",1)));
        value.put("meals",new JSONArray().put(new JSONObject().put("id",1).put("name","Tradicional").put("description","").put("price",2200).put("active",1)));
        value.put("orders",new JSONArray().put(new JSONObject().put("id",1).put("customer_id",1).put("customer_name","João Silva").put("phone","5511999990000").put("address","Rua Um, 30").put("ordered","2026-11-13").put("delivery","2026-11-14").put("status","pending").put("notes","") ));
        value.put("items",new JSONArray().put(new JSONObject().put("id",1).put("order_id",1).put("meal_id",1).put("name","Tradicional").put("quantity",2).put("price",1900)));
        value.put("whatsapp_imports",new JSONArray().put(new JSONObject().put("id",1).put("source_namespace","https://loja.example#phone=123456").put("external_id","8d365c28-5c10-4197-8cad-d6b8bca6b707").put("order_id",1)));
        return value;
    }
    private static void badBackup(Edit edit)throws Exception{JSONObject value=backup();edit.run(value);rejects(()->Store.validateBackup(value));}
    public static void main(String[] args)throws Exception {
        eq("https://loja.example",WhatsAppSync.normalizeBaseUrl(" HTTPS://LOJA.EXAMPLE:443/ "));
        eq("https://loja.example:8443/app",WhatsAppSync.normalizeBaseUrl("https://loja.example:8443/app/"));
        eq("https://loja.example/app",WhatsAppSync.normalizeBaseUrl("https://loja.example/a/../app"));
        for(String bad:new String[]{"http://loja.example","loja.example","https://user:password@loja.example","https://loja.example?token=abc","https://loja.example/#fragment","https://loja.example:0","https://loja.example:70000","https://loja.example//app","https://loja.example/a%2Fb","https://loja.example\\app","https:///app",""})rejects(()->WhatsAppSync.normalizeBaseUrl(bad));
        String token="Abcd_1234567890-Abcd_1234567890-Abcd_1234567890";
        eq(token,WhatsAppSync.validateToken(token));
        rejects(()->WhatsAppSync.validateToken("short"));rejects(()->WhatsAppSync.validateToken(token+"\nextra"));rejects(()->WhatsAppSync.validateToken(token+":bad"));
        Store.Order parsed=Store.validateWhatsAppOrder(remote());
        eq(6300L,parsed.total());eq(3,parsed.quantity());eq(true,parsed.fromWhatsApp);eq("Rua Um, 30",parsed.address);eq(1900L,parsed.items.get(0).price);
        badRemote(o->o.put("external_id","../orders"));badRemote(o->o.put("external_id",""));
        badRemote(o->o.put("external_id",123));
        badRemote(o->o.put("status","delivered"));badRemote(o->o.put("status","unknown"));
        badRemote(o->o.put("delivery","2026-11-12"));badRemote(o->o.put("delivery","2026-02-31"));
        badRemote(o->o.getJSONObject("customer").put("name"," "));
        badRemote(o->o.getJSONObject("customer").put("address",""));
        badRemote(o->o.getJSONObject("customer").put("phone","+55 (11) 99999-0000"));
        badRemote(o->o.getJSONObject("customer").put("name",JSONObject.NULL));
        badRemote(o->o.getJSONArray("items").getJSONObject(0).put("quantity",0));
        badRemote(o->o.getJSONArray("items").getJSONObject(0).put("quantity",1.5));
        badRemote(o->o.getJSONArray("items").getJSONObject(0).put("unit_price_cents","1900"));
        badRemote(o->o.getJSONArray("items").getJSONObject(0).put("unit_price_cents",-10));
        badRemote(o->o.getJSONArray("items").getJSONObject(0).put("local_meal_id",0));
        badRemote(o->o.getJSONArray("items").getJSONObject(0).put("local_meal_id","1"));
        badRemote(o->o.put("items",new JSONArray()));
        badRemote(o->{JSONArray a=o.getJSONArray("items");while(a.length()<101)a.put(new JSONObject(a.getJSONObject(0).toString()));});
        badRemote(o->{JSONObject line=o.getJSONArray("items").getJSONObject(0);line.put("unit_price_cents",Rules.MAX_PRICE);line.put("quantity",Rules.MAX_QUANTITY);});
        eq("1 clientes, 1 tipos de marmita e 1 pedidos.",Store.validateBackup(backup()));
        JSONObject legacy=backup();legacy.put("schema_version",1);legacy.remove("whatsapp_imports");eq("1 clientes, 1 tipos de marmita e 1 pedidos.",Store.validateBackup(legacy));
        badBackup(o->o.remove("whatsapp_imports"));
        badBackup(o->o.getJSONArray("whatsapp_imports").getJSONObject(0).put("order_id",999));
        badBackup(o->o.getJSONArray("whatsapp_imports").getJSONObject(0).put("external_id","bad/id"));
        badBackup(o->o.getJSONArray("whatsapp_imports").getJSONObject(0).put("source_namespace",""));
        badBackup(o->{JSONArray a=o.getJSONArray("whatsapp_imports");JSONObject row=new JSONObject(a.getJSONObject(0).toString()).put("id",2);a.put(row);});
        badBackup(o->{JSONArray a=o.getJSONArray("whatsapp_imports");JSONObject row=new JSONObject(a.getJSONObject(0).toString()).put("id",2).put("external_id","another-id");a.put(row);});
        System.out.println("PASS: "+checks+" WhatsApp protocol checks (URLs, tokens, remote orders, snapshots, backup v2, legacy backup).");
    }
}
