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
        System.out.println("PASS: "+checks+" checks (money, quantities, totals, dates, statuses, backup validation, price history, draft state).");
    }
}
