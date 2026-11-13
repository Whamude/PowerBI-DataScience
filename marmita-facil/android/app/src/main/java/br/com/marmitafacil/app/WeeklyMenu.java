package br.com.marmitafacil.app;

import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

/** Owner-defined weekly availability. No prices or products are inferred from chats. */
public final class WeeklyMenu {
    public static final class Entry {
        public long mealId, price;
        public String name, description;
        public final boolean[] days=new boolean[7];
    }
    public String businessName="",greeting="Olá! Seja bem-vindo(a)! Confira nosso cardápio da semana.",start=monday(Rules.today());
    public boolean acceptingOrders=true;
    public final List<Entry> entries=new ArrayList<>();

    public WeeklyMenu(List<Store.Meal> meals,JSONObject published)throws Exception {
        if(published!=null) {
            businessName=published.optString("business_name","");
            greeting=published.optString("greeting",greeting);
            String week=published.optString("week_start",start);
            if(Rules.validDate(week))start=monday(week);
            acceptingOrders=published.optBoolean("accepting_orders",true);
        }
        for(Store.Meal meal:meals)if(meal.active) {
            Entry e=new Entry();e.mealId=meal.id;e.price=meal.price;e.name=meal.name;e.description=meal.description;
            if(published!=null) {
                JSONArray items=published.optJSONArray("items");
                if(items!=null)for(int k=0;k<items.length();k++) {
                    JSONObject item=items.getJSONObject(k);if(item.optLong("local_meal_id")!=meal.id)continue;
                    JSONArray dates=item.optJSONArray("available_dates");
                    if(dates!=null)for(int day=0;day<7;day++)for(int d=0;d<dates.length();d++)
                        if(dateAt(start,day).equals(dates.getString(d)))e.days[day]=true;
                }
            }
            entries.add(e);
        }
    }

    public JSONObject draftJson()throws Exception{return json(true);}
    public JSONObject publishJson()throws Exception {
        businessName=Rules.text(businessName,"o nome do negócio",120,true);
        greeting=Rules.text(greeting,"a mensagem de boas-vindas",1000,true);
        if(!Rules.validDate(start)||!monday(start).equals(start))throw new IllegalArgumentException("Selecione uma semana válida.");
        JSONObject result=json(false);
        if(result.getJSONArray("items").length()==0)throw new IllegalArgumentException("Selecione pelo menos uma marmita em um dia da semana.");
        return result;
    }
    private JSONObject json(boolean includeEmpty)throws Exception {
        JSONObject o=new JSONObject();o.put("business_name",businessName);o.put("greeting",greeting);
        o.put("accepting_orders",acceptingOrders);o.put("week_start",start);o.put("week_end",dateAt(start,6));
        JSONArray items=new JSONArray();
        for(Entry e:entries) {
            JSONArray dates=new JSONArray();for(int d=0;d<7;d++)if(e.days[d])dates.put(dateAt(start,d));
            if(!includeEmpty&&dates.length()==0)continue;
            JSONObject item=new JSONObject();item.put("local_meal_id",e.mealId);item.put("name",e.name);
            item.put("description",e.description);item.put("price_cents",e.price);item.put("available_dates",dates);items.put(item);
        }
        o.put("items",items);return o;
    }
    public static String monday(String iso) {
        Calendar c=calendar(iso);int offset=(c.get(Calendar.DAY_OF_WEEK)+5)%7;c.add(Calendar.DAY_OF_MONTH,-offset);return format(c);
    }
    public static String dateAt(String start,int offset) {
        Calendar c=calendar(start);c.add(Calendar.DAY_OF_MONTH,offset);return format(c);
    }
    private static Calendar calendar(String iso) {
        if(!Rules.validDate(iso))throw new IllegalArgumentException("Data inválida.");
        String[] bits=iso.split("-");Calendar c=Calendar.getInstance();c.clear();c.set(Integer.parseInt(bits[0]),Integer.parseInt(bits[1])-1,Integer.parseInt(bits[2]),12,0,0);return c;
    }
    private static String format(Calendar c){return new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(c.getTime());}
}
