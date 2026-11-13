package br.com.marmitafacil.app;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class Store extends SQLiteOpenHelper {
    public static class Customer {
        public long id;
        public String name = "", phone = "", address = "";
        public boolean active = true;
        @Override public String toString() { return name + (active ? "" : " (arquivado)"); }
    }
    public static class Meal {
        public long id, price;
        public String name = "", description = "";
        public boolean active = true;
        @Override public String toString() { return name + (active ? "" : " (arquivada)"); }
    }
    public static class Item {
        public long mealId, price;
        public String name = "";
        public int quantity = 1;
        public long total() { return Rules.lineTotal(price, quantity); }
    }
    public static class Order {
        public long id, customerId;
        public String customerName = "", phone = "", address = "";
        public String ordered = Rules.today(), delivery = Rules.today(), status = "pending", notes = "";
        public final List<Item> items = new ArrayList<>();
        public long total() {
            long sum = 0;
            for (Item i : items) sum = Rules.addTotal(sum, i.total());
            return sum;
        }
        public int quantity() {
            int sum = 0;
            for (Item i : items) sum += i.quantity;
            return sum;
        }
    }

    public Store(Context c) { super(c, "marmita-facil.db", null, 1); }
    @Override public void onConfigure(SQLiteDatabase db) { db.setForeignKeyConstraintsEnabled(true); }
    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE customers (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,phone TEXT NOT NULL,address TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)))");
        db.execSQL("CREATE TABLE meals (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,description TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>0),active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)))");
        db.execSQL("CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT,customer_id INTEGER NOT NULL REFERENCES customers(id),customer_name TEXT NOT NULL,phone TEXT NOT NULL,address TEXT NOT NULL,ordered TEXT NOT NULL,delivery TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('pending','delivered','cancelled')),notes TEXT NOT NULL)");
        db.execSQL("CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,meal_id INTEGER NOT NULL REFERENCES meals(id),name TEXT NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>0),price INTEGER NOT NULL CHECK(price>0))");
        db.execSQL("CREATE INDEX orders_delivery ON orders(delivery,status)");
        db.execSQL("CREATE INDEX items_order ON items(order_id)");
    }
    @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        throw new IllegalStateException("Versão do banco de dados não suportada.");
    }

    public List<Customer> customers(boolean archived) {
        List<Customer> out = new ArrayList<>();
        try (Cursor c = getReadableDatabase().query("customers", null, archived ? null : "active=1", null, null, null, "active DESC,name COLLATE LOCALIZED,id")) {
            while (c.moveToNext()) {
                Customer x = new Customer(); x.id = number(c,"id"); x.name = string(c,"name");
                x.phone = string(c,"phone"); x.address = string(c,"address"); x.active = number(c,"active")==1;
                out.add(x);
            }
        }
        return out;
    }
    public List<Meal> meals(boolean archived) {
        List<Meal> out = new ArrayList<>();
        try (Cursor c = getReadableDatabase().query("meals",null,archived ? null : "active=1",null,null,null,"active DESC,name COLLATE LOCALIZED,id")) {
            while(c.moveToNext()) {
                Meal x = new Meal(); x.id = number(c,"id"); x.name = string(c,"name");
                x.description = string(c,"description"); x.price = number(c,"price"); x.active = number(c,"active")==1;
                out.add(x);
            }
        }
        return out;
    }
    public long saveCustomer(Customer x) {
        x.name = Rules.text(x.name,"o nome do cliente",120,true);
        x.phone = Rules.text(x.phone,"o telefone",40,false);
        x.address = Rules.text(x.address,"o endereço",500,false);
        ContentValues v = new ContentValues();
        v.put("name",x.name);v.put("phone",x.phone);v.put("address",x.address);v.put("active",x.active?1:0);
        if(x.id==0) x.id = getWritableDatabase().insertOrThrow("customers",null,v);
        else if(getWritableDatabase().update("customers",v,"id=?",args(x.id))!=1) throw new IllegalArgumentException("Cliente não encontrado.");
        return x.id;
    }
    public long saveMeal(Meal x) {
        x.name=Rules.text(x.name,"o nome da marmita",120,true);
        x.description=Rules.text(x.description,"a descrição",500,false);
        Rules.lineTotal(x.price,1);
        ContentValues v = new ContentValues();v.put("name",x.name);v.put("description",x.description);v.put("price",x.price);v.put("active",x.active?1:0);
        if(x.id==0) x.id=getWritableDatabase().insertOrThrow("meals",null,v);
        else if(getWritableDatabase().update("meals",v,"id=?",args(x.id))!=1) throw new IllegalArgumentException("Marmita não encontrada.");
        return x.id;
    }
    public void setActive(String table, long id, boolean active) {
        if(!table.equals("customers")&&!table.equals("meals")) throw new IllegalArgumentException();
        ContentValues v=new ContentValues();v.put("active",active?1:0);
        getWritableDatabase().update(table,v,"id=?",args(id));
    }
    public List<Order> orders() {
        List<Order> out=new ArrayList<>();
        Map<Long,Order> map=new HashMap<>();
        try(Cursor c=getReadableDatabase().query("orders",null,null,null,null,null,"CASE status WHEN 'pending' THEN 0 WHEN 'delivered' THEN 1 ELSE 2 END,delivery ASC,id DESC")) {
            while(c.moveToNext()) {
                Order o=new Order();o.id=number(c,"id");o.customerId=number(c,"customer_id");o.customerName=string(c,"customer_name");
                o.phone=string(c,"phone");o.address=string(c,"address");o.ordered=string(c,"ordered");o.delivery=string(c,"delivery");o.status=string(c,"status");o.notes=string(c,"notes");
                out.add(o);map.put(o.id,o);
            }
        }
        try(Cursor c=getReadableDatabase().query("items",null,null,null,null,null,"id")) {
            while(c.moveToNext()) {
                Order o=map.get(number(c,"order_id"));
                if(o!=null) {Item i=new Item();i.mealId=number(c,"meal_id");i.name=string(c,"name");i.quantity=(int)number(c,"quantity");i.price=number(c,"price");o.items.add(i);}
            }
        }
        return out;
    }
    public Order order(long id) { for(Order o:orders()) if(o.id==id) return o; return null; }
    public long saveOrder(Order o) {
        Rules.dates(o.ordered,o.delivery);
        if(!Rules.validStatus(o.status)) throw new IllegalArgumentException("Status inválido.");
        o.notes=Rules.text(o.notes,"as observações",2000,false);
        if(o.items.isEmpty()||o.items.size()>100) throw new IllegalArgumentException("Adicione de 1 a 100 itens ao pedido.");
        o.total();
        Customer customer=null; for(Customer c:customers(true)) if(c.id==o.customerId) customer=c;
        if(customer==null) throw new IllegalArgumentException("Selecione um cliente.");
        Set<Long> mealIds=new HashSet<>();for(Meal m:meals(true))mealIds.add(m.id);
        for(Item i:o.items) {
            if(!mealIds.contains(i.mealId))throw new IllegalArgumentException("Marmita não encontrada.");
            i.name=Rules.text(i.name,"o nome da marmita",120,true);i.total();
        }
        o.customerName=customer.name;o.phone=customer.phone;o.address=customer.address;
        SQLiteDatabase db=getWritableDatabase();db.beginTransaction();
        try {
            ContentValues v=new ContentValues();v.put("customer_id",o.customerId);v.put("customer_name",o.customerName);v.put("phone",o.phone);v.put("address",o.address);
            v.put("ordered",o.ordered);v.put("delivery",o.delivery);v.put("status",o.status);v.put("notes",o.notes);
            long id=o.id;
            if(id==0) id=db.insertOrThrow("orders",null,v);
            else {
                if(db.update("orders",v,"id=?",args(id))!=1)throw new IllegalArgumentException("Pedido não encontrado.");
                db.delete("items","order_id=?",args(id));
            }
            for(Item i:o.items) {
                ContentValues item=new ContentValues();item.put("order_id",id);item.put("meal_id",i.mealId);item.put("name",i.name);item.put("quantity",i.quantity);item.put("price",i.price);
                db.insertOrThrow("items",null,item);
            }
            db.setTransactionSuccessful();o.id=id;return id;
        } finally {db.endTransaction();}
    }
    public void status(long id,String status) {
        if(!Rules.validStatus(status))throw new IllegalArgumentException("Status inválido.");
        ContentValues v=new ContentValues();v.put("status",status);
        if(getWritableDatabase().update("orders",v,"id=?",args(id))!=1)throw new IllegalArgumentException("Pedido não encontrado.");
    }

    public JSONObject backup() throws JSONException {
        JSONObject root=new JSONObject();root.put("app","marmita-facil");root.put("schema_version",1);root.put("exported_at",new java.util.Date().toString());
        SQLiteDatabase db=getReadableDatabase();db.beginTransaction();
        try {
            for(String table:TABLES) {
                JSONArray rows=new JSONArray();
                try(Cursor c=db.query(table,null,null,null,null,null,"id")) {
                    while(c.moveToNext()) {
                        JSONObject row=new JSONObject();
                        for(int k=0;k<c.getColumnCount();k++)row.put(c.getColumnName(k),c.getType(k)==Cursor.FIELD_TYPE_INTEGER ? (Object)c.getLong(k) : c.getString(k));
                        rows.put(row);
                    }
                }
                root.put(table,rows);
            }
            db.setTransactionSuccessful();return root;
        } finally {db.endTransaction();}
    }
    private static final String[] TABLES={"customers","meals","orders","items"};
    private static final String[][] COLUMNS={
        {"id","name","phone","address","active"},
        {"id","name","description","price","active"},
        {"id","customer_id","customer_name","phone","address","ordered","delivery","status","notes"},
        {"id","order_id","meal_id","name","quantity","price"}
    };

    public static String validateBackup(JSONObject root) throws JSONException {
        if(!"marmita-facil".equals(root.getString("app"))||root.getInt("schema_version")!=1)
            throw new IllegalArgumentException("Este arquivo não é um backup compatível do Marmita Fácil.");
        Set<Long> customers=new HashSet<>(),meals=new HashSet<>(),orders=new HashSet<>();
        Map<Long,Long> totals=new HashMap<>();Map<Long,Integer> counts=new HashMap<>();
        for(int t=0;t<TABLES.length;t++) {
            JSONArray rows=root.getJSONArray(TABLES[t]);
            if(rows.length()>50000)throw new IllegalArgumentException("O backup ultrapassa o limite de registros.");
            Set<Long> ids=new HashSet<>();
            for(int k=0;k<rows.length();k++) {
                JSONObject r=rows.getJSONObject(k);long id=integer(r,"id",1,1000000000000L);
                if(!ids.add(id))throw new IllegalArgumentException("O backup contém registros duplicados.");
                if(t==0) {
                    checkText(r,"name",120,true);checkText(r,"phone",40,false);checkText(r,"address",500,false);integer(r,"active",0,1);customers.add(id);
                } else if(t==1) {
                    checkText(r,"name",120,true);checkText(r,"description",500,false);integer(r,"price",1,Rules.MAX_PRICE);integer(r,"active",0,1);meals.add(id);
                } else if(t==2) {
                    if(!customers.contains(integer(r,"customer_id",1,1000000000000L)))throw new IllegalArgumentException("Cliente ausente no backup.");
                    checkText(r,"customer_name",120,true);checkText(r,"phone",40,false);checkText(r,"address",500,false);checkText(r,"notes",2000,false);
                    Rules.dates(r.getString("ordered"),r.getString("delivery"));
                    if(!Rules.validStatus(r.getString("status")))throw new IllegalArgumentException("Status inválido no backup.");
                    orders.add(id);totals.put(id,0L);counts.put(id,0);
                } else {
                    long order=integer(r,"order_id",1,1000000000000L),meal=integer(r,"meal_id",1,1000000000000L);
                    if(!orders.contains(order)||!meals.contains(meal))throw new IllegalArgumentException("Pedido ou marmita ausente no backup.");
                    checkText(r,"name",120,true);
                    long price=integer(r,"price",1,Rules.MAX_PRICE);int q=(int)integer(r,"quantity",1,Rules.MAX_QUANTITY);
                    totals.put(order,Rules.addTotal(totals.get(order),Rules.lineTotal(price,q)));
                    int count=counts.get(order)+1;if(count>100)throw new IllegalArgumentException("Pedido com mais de 100 itens.");counts.put(order,count);
                }
            }
        }
        for(long id:orders)if(counts.get(id)==0)throw new IllegalArgumentException("O backup contém um pedido sem itens.");
        return customers.size()+" clientes, "+meals.size()+" tipos de marmita e "+orders.size()+" pedidos.";
    }
    public void restore(JSONObject root) throws JSONException {
        validateBackup(root); // validate completely before making any changes
        SQLiteDatabase db=getWritableDatabase();db.beginTransaction();
        try {
            for(int t=TABLES.length-1;t>=0;t--)db.delete(TABLES[t],null,null);
            db.delete("sqlite_sequence","name IN ('customers','meals','orders','items')",null);
            for(int t=0;t<TABLES.length;t++) {
                JSONArray rows=root.getJSONArray(TABLES[t]);
                for(int k=0;k<rows.length();k++) {
                    JSONObject row=rows.getJSONObject(k);ContentValues v=new ContentValues();
                    for(String column:COLUMNS[t]) {
                        Object value=row.get(column);
                        if(value instanceof Number)v.put(column,((Number)value).longValue());else v.put(column,(String)value);
                    }
                    db.insertOrThrow(TABLES[t],null,v);
                }
            }
            db.setTransactionSuccessful();
        } finally {db.endTransaction();}
    }
    private static long integer(JSONObject o,String key,long min,long max) throws JSONException {
        Object v=o.get(key);
        if(!(v instanceof Number)||!v.toString().matches("[0-9]+"))throw new IllegalArgumentException("Número inválido no backup: "+key);
        long n=((Number)v).longValue();if(n<min||n>max)throw new IllegalArgumentException("Número fora do limite no backup.");return n;
    }
    private static void checkText(JSONObject o,String key,int max,boolean required) throws JSONException {
        Object value=o.get(key);if(!(value instanceof String))throw new IllegalArgumentException("Texto inválido no backup.");Rules.text((String)value,key,max,required);
    }
    private static long number(Cursor c,String key){return c.getLong(c.getColumnIndexOrThrow(key));}
    private static String string(Cursor c,String key){return c.getString(c.getColumnIndexOrThrow(key));}
    private static String[] args(long id){return new String[]{Long.toString(id)};}
}
