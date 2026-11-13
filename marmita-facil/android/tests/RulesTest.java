package br.com.marmitafacil.app;

import org.json.JSONArray;
import org.json.JSONObject;

/** Executable regression checks. No customer data or external service required. */
public class RulesTest {
    static int checks;
    interface Check {void run() throws Exception;}
    static void equal(Object expected,Object actual) {
        checks++;
        if(!expected.equals(actual))throw new AssertionError("Expected "+expected+", got "+actual);
    }
    static void rejects(Check check) throws Exception {
        checks++;
        try{check.run();}catch(IllegalArgumentException|org.json.JSONException e){return;}
        throw new AssertionError("Expected invalid input to be rejected");
    }
    static JSONObject sample() throws Exception {
        JSONObject o=new JSONObject();o.put("app","marmita-facil");o.put("schema_version",1);
        o.put("customers",new JSONArray().put(new JSONObject().put("id",1).put("name","João da Silva").put("phone","11999990000").put("address","Rua Um, 20").put("active",1)));
        o.put("meals",new JSONArray().put(new JSONObject().put("id",1).put("name","Tradicional").put("description","Arroz e feijão").put("price",2000).put("active",1))
            .put(new JSONObject().put("id",2).put("name","Vegetariana").put("description","").put("price",2500).put("active",0)));
        o.put("orders",new JSONArray().put(new JSONObject().put("id",1).put("customer_id",1).put("customer_name","João da Silva").put("phone","11999990000").put("address","Rua Um, 20").put("ordered","2026-11-13").put("delivery","2026-11-14").put("status","pending").put("notes","Sem pimenta")));
        o.put("items",new JSONArray().put(new JSONObject().put("id",1).put("order_id",1).put("meal_id",1).put("name","Tradicional").put("quantity",2).put("price",1900))
            .put(new JSONObject().put("id",2).put("order_id",1).put("meal_id",2).put("name","Vegetariana").put("quantity",1).put("price",2500)));
        return o;
    }
    interface Edit {void run(JSONObject o) throws Exception;}
    static void invalidBackup(Edit edit) throws Exception {JSONObject o=sample();edit.run(o);rejects(()->Store.validateBackup(o));}
    public static void main(String[] args) throws Exception {
        equal(2000L,Rules.parseMoney("20"));equal(2000L,Rules.parseMoney("20,00"));
        equal(2050L,Rules.parseMoney("20,5"));equal(2050L,Rules.parseMoney("20.50"));
        equal(123456L,Rules.parseMoney("1.234,56"));equal(123456L,Rules.parseMoney("R$ 1.234,56"));
        equal(1L,Rules.parseMoney("0,01"));equal(100000000L,Rules.parseMoney("1.000.000,00"));
        for(String bad:new String[]{"","0","0,00","-10","1,234","1.234","1,2,3","1e2","NaN","12.34,56","1000000,01","999999999999999999999999999999","20,"})rejects(()->Rules.parseMoney(bad));
        equal("20,50",Rules.priceInput(2050));equal(2050L,Rules.parseMoney(Rules.priceInput(2050)));
        equal(1,Rules.parseQuantity("1"));equal(10000,Rules.parseQuantity("10000"));
        for(String bad:new String[]{"","0","-1","1.5","10001","9999999999"})rejects(()->Rules.parseQuantity(bad));
        equal(3702L,Rules.lineTotal(1234,3));equal(6300L,Rules.addTotal(Rules.lineTotal(1900,2),Rules.lineTotal(2500,1)));
        rejects(()->Rules.lineTotal(0,1));rejects(()->Rules.lineTotal(1,0));rejects(()->Rules.lineTotal(100000001,1));
        rejects(()->Rules.addTotal(Rules.MAX_TOTAL,1));rejects(()->Rules.addTotal(10,-1));
        equal(true,Rules.validDate("2024-02-29"));equal(false,Rules.validDate("2025-02-29"));
        equal(false,Rules.validDate("2026-02-31"));equal(false,Rules.validDate("2026-1-01"));equal(false,Rules.validDate(null));
        equal(true,Rules.validDate("1900-01-01"));equal(true,Rules.validDate("2100-12-31"));equal(false,Rules.validDate("2101-01-01"));
        Rules.dates("2026-11-13","2026-11-13");rejects(()->Rules.dates("2026-11-14","2026-11-13"));
        equal("13/11/2026",Rules.date("2026-11-13"));equal("Nome",Rules.text("  Nome  ","nome",120,true));
        rejects(()->Rules.text(" ","nome",120,true));rejects(()->Rules.text("1234","nome",3,false));
        equal(true,Rules.validStatus("pending"));equal(true,Rules.validStatus("delivered"));equal(true,Rules.validStatus("cancelled"));equal(false,Rules.validStatus("unknown"));
        equal("A entregar",Rules.statusLabel("pending"));equal("Entregue",Rules.statusLabel("delivered"));equal("Cancelado",Rules.statusLabel("cancelled"));

        Store.Order order=new Store.Order();Store.Item first=new Store.Item();first.price=1900;first.quantity=2;order.items.add(first);
        Store.Item second=new Store.Item();second.price=2500;second.quantity=1;order.items.add(second);
        equal(6300L,order.total());equal(3,order.quantity());
        equal("1 clientes, 2 tipos de marmita e 1 pedidos.",Store.validateBackup(sample()));
        JSONObject empty=new JSONObject().put("app","marmita-facil").put("schema_version",1);
        for(String table:new String[]{"customers","meals","orders","items"})empty.put(table,new JSONArray());
        equal("0 clientes, 0 tipos de marmita e 0 pedidos.",Store.validateBackup(empty));
        invalidBackup(o->o.put("app","outro"));invalidBackup(o->o.put("schema_version",2));
        invalidBackup(o->o.getJSONArray("orders").getJSONObject(0).put("customer_id",99));
        invalidBackup(o->o.getJSONArray("items").getJSONObject(0).put("meal_id",99));
        invalidBackup(o->o.getJSONArray("items").getJSONObject(0).put("order_id",99));
        invalidBackup(o->o.getJSONArray("items").getJSONObject(0).put("quantity",0));
        invalidBackup(o->o.getJSONArray("items").getJSONObject(0).put("quantity",1.5));
        invalidBackup(o->o.getJSONArray("items").getJSONObject(0).put("price",19.99));
        invalidBackup(o->o.getJSONArray("items").getJSONObject(0).put("price",-1));
        invalidBackup(o->o.getJSONArray("items").getJSONObject(0).put("price","1900"));
        invalidBackup(o->o.getJSONArray("orders").getJSONObject(0).put("status","unknown"));
        invalidBackup(o->o.getJSONArray("orders").getJSONObject(0).put("delivery","2026-11-01"));
        invalidBackup(o->o.getJSONArray("orders").getJSONObject(0).put("delivery","2026-02-31"));
        invalidBackup(o->o.put("items",new JSONArray()));
        invalidBackup(o->o.getJSONArray("customers").put(o.getJSONArray("customers").getJSONObject(0)));
        invalidBackup(o->o.getJSONArray("customers").getJSONObject(0).put("active",2));
        invalidBackup(o->o.getJSONArray("customers").getJSONObject(0).put("name",JSONObject.NULL));
        invalidBackup(o->o.getJSONArray("customers").getJSONObject(0).put("name",""));
        invalidBackup(o->o.getJSONArray("meals").getJSONObject(0).put("price",0));
        invalidBackup(o->o.remove("orders"));
        invalidBackup(o->{JSONArray a=o.getJSONArray("items");for(int i=3;i<=101;i++){JSONObject r=new JSONObject(a.getJSONObject(0).toString());r.put("id",i);a.put(r);}});
        invalidBackup(o->{JSONObject i=o.getJSONArray("items").getJSONObject(0);i.put("price",Rules.MAX_PRICE);i.put("quantity",Rules.MAX_QUANTITY);});
        // Price snapshots must remain independent of subsequent menu changes.
        JSONObject changed=sample();changed.getJSONArray("meals").getJSONObject(0).put("price",9900);
        Store.validateBackup(changed);equal(1900L,changed.getJSONArray("items").getJSONObject(0).getLong("price"));
        // Unsaved numeric input survives the form's process-state JSON round trip.
        Class<?> editorType=Class.forName("br.com.marmitafacil.app.MainActivity$Editor");
        java.lang.reflect.Method from=editorType.getDeclaredMethod("fromJson",JSONObject.class);from.setAccessible(true);
        java.lang.reflect.Method to=editorType.getDeclaredMethod("json");to.setAccessible(true);
        JSONObject draft=new JSONObject().put("id",1).put("customer",1).put("ordered","2026-11-13").put("delivery","2026-11-14").put("status","pending").put("notes","Sem pimenta");
        draft.put("lines",new JSONArray().put(new JSONObject().put("meal",1).put("name","Tradicional").put("quantity","").put("price","20,")));
        JSONObject roundtrip=(JSONObject)to.invoke(from.invoke(null,draft));
        equal("",roundtrip.getJSONArray("lines").getJSONObject(0).getString("quantity"));
        equal("20,",roundtrip.getJSONArray("lines").getJSONObject(0).getString("price"));
        equal("Sem pimenta",roundtrip.getString("notes"));

        // Weekly menu maps each local meal to owner-selected delivery days.
        equal("2026-11-09",WeeklyMenu.monday("2026-11-13"));
        equal("2026-11-09",WeeklyMenu.monday("2026-11-15"));
        equal("2026-11-16",WeeklyMenu.monday("2026-11-16"));
        equal("2027-01-03",WeeklyMenu.dateAt("2026-12-28",6));
        java.util.List<Store.Meal> menuMeals=new java.util.ArrayList<>();
        Store.Meal meal=new Store.Meal();meal.id=1;meal.name="Tradicional";meal.price=2200;menuMeals.add(meal);
        WeeklyMenu menu=new WeeklyMenu(menuMeals,null);menu.start="2026-11-09";
        rejects(()->menu.publishJson());menu.businessName="Cozinha da Ana";rejects(()->menu.publishJson());
        menu.entries.get(0).days[4]=true;JSONObject published=menu.publishJson();
        equal("2026-11-15",published.getString("week_end"));equal(1,published.getJSONArray("items").length());
        equal(2200L,published.getJSONArray("items").getJSONObject(0).getLong("price_cents"));
        equal("2026-11-13",published.getJSONArray("items").getJSONObject(0).getJSONArray("available_dates").getString(0));
        WeeklyMenu loaded=new WeeklyMenu(menuMeals,published);equal(true,loaded.entries.get(0).days[4]);equal(false,loaded.entries.get(0).days[3]);
        menu.acceptingOrders=false;equal(false,menu.publishJson().getBoolean("accepting_orders"));

        // Only final HTTPS endpoints may receive a stored connection key.
        equal("https://example.com",WhatsAppSync.normalizeBaseUrl("https://EXAMPLE.com:443/"));
        equal("https://example.com/shop",WhatsAppSync.normalizeBaseUrl("https://example.com/shop/"));
        for(String bad:new String[]{"http://example.com","ftp://example.com","https://user:pass@example.com","https://example.com?token=x","https://example.com/#x","https://example.com/%2e%2e","https://example.com:0","https://example.com:70000","https://"})rejects(()->WhatsAppSync.normalizeBaseUrl(bad));
        equal("12345678901234567890123456789012",WhatsAppSync.validateToken("12345678901234567890123456789012"));
        rejects(()->WhatsAppSync.validateToken("short"));rejects(()->WhatsAppSync.validateToken("12345678901234567890123456789012\r\nX-Injected:1"));

        // Backup v2 preserves the durable external-order import marker.
        JSONObject v2=sample().put("schema_version",2).put("whatsapp_imports",new JSONArray().put(new JSONObject().put("id",1).put("source_namespace","https://example.com#phone=123").put("external_id","order-uuid-1").put("order_id",1)));
        Store.validateBackup(v2);checks++;
        JSONObject badMarker=new JSONObject(v2.toString());badMarker.getJSONArray("whatsapp_imports").getJSONObject(0).put("order_id",99);rejects(()->Store.validateBackup(badMarker));
        JSONObject duplicateMarker=new JSONObject(v2.toString());JSONObject marker=new JSONObject(duplicateMarker.getJSONArray("whatsapp_imports").getJSONObject(0).toString()).put("id",2);duplicateMarker.getJSONArray("whatsapp_imports").put(marker);rejects(()->Store.validateBackup(duplicateMarker));

        JSONObject remote=new JSONObject().put("external_id","5fc9e275-4cb0-4a12-972f-096a7d179d22").put("customer",new JSONObject().put("name","Ana").put("phone","5511999990000").put("address","Rua Dois, 25"))
            .put("ordered","2026-11-13").put("delivery","2026-11-14").put("status","pending").put("notes","")
            .put("items",new JSONArray().put(new JSONObject().put("local_meal_id",1).put("name","Tradicional").put("quantity",2).put("unit_price_cents",2250)));
        Store.Order incoming=Store.validateWhatsAppOrder(remote);equal(4500L,incoming.total());equal(true,incoming.fromWhatsApp);
        JSONObject invalidRemote=new JSONObject(remote.toString()).put("external_id","../../admin");rejects(()->Store.validateWhatsAppOrder(invalidRemote));
        JSONObject invalidQuantity=new JSONObject(remote.toString());invalidQuantity.getJSONArray("items").getJSONObject(0).put("quantity",1.5);rejects(()->Store.validateWhatsAppOrder(invalidQuantity));
        JSONObject invalidPhone=new JSONObject(remote.toString());invalidPhone.getJSONObject("customer").put("phone","not-a-phone");rejects(()->Store.validateWhatsAppOrder(invalidPhone));
        JSONObject invalidDate=new JSONObject(remote.toString()).put("delivery","2026-11-12");rejects(()->Store.validateWhatsAppOrder(invalidDate));
        JSONObject invalidStatus=new JSONObject(remote.toString()).put("status","delivered");rejects(()->Store.validateWhatsAppOrder(invalidStatus));
        if(args.length>0) {
            String payload=new String(java.nio.file.Files.readAllBytes(java.nio.file.Paths.get(args[0])),java.nio.charset.StandardCharsets.UTF_8);
            JSONObject response=new JSONObject(payload);
            equal(true,response.getString("phone_number_id").matches("[0-9]{1,40}"));
            JSONArray pending=response.getJSONArray("orders");equal(true,pending.length()>0);
            for(int k=0;k<pending.length();k++){Store.Order backendOrder=Store.validateWhatsAppOrder(pending.getJSONObject(k));equal(true,backendOrder.total()>0);equal("pending",backendOrder.status);}
            System.out.println("PASS: backend-confirmed order response matches Android contract.");
        }
        System.out.println("PASS: "+checks+" checks (money, quantities, totals, dates, statuses, backup v1/v2, weekly menu, HTTPS/key validation, WhatsApp order contract, price history, draft state).");
    }
}
