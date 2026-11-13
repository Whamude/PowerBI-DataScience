package br.com.marmitafacil.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DatePickerDialog;
import android.app.ProgressDialog;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.Editable;
import android.text.InputFilter;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.*;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private static final int BG=0xFFFAF7F2, WHITE=Color.WHITE, INK=0xFF292D28, MUTED=0xFF62695F,
        ACCENT=0xFFB94720, TINT=0xFFFCEBDD, BORDER=0xFFE5DED3;
    private static final String[] STATUSES={"pending","delivered","cancelled"};
    private Store store;
    private LinearLayout root, content, list;
    private String page="orders", query="", statusFilter="", dateFilter="";
    private boolean showArchived;
    private long detailId;
    private Editor editor;
    private LinearLayout editorLines;
    private TextView editorTotal;
    private Spinner customerSpinner;
    private final List<Store.Customer> editorCustomers=new ArrayList<>();
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private static final int EXPORT=101, IMPORT=102;
    private final android.os.Handler syncHandler=new android.os.Handler(android.os.Looper.getMainLooper());
    private boolean syncInFlight,foreground;
    private WeeklyMenu weeklyMenu;
    private long lastSavedCustomerId;
    private final Runnable scheduledSync=new Runnable(){public void run(){if(foreground){syncWhatsApp(false);syncHandler.postDelayed(this,60000);}}};

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        store=new Store(this);
        getWindow().setStatusBarColor(BG);getWindow().setNavigationBarColor(WHITE);
        int flags=View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if(android.os.Build.VERSION.SDK_INT>=26)flags|=View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(flags);
        if(state!=null) {
            page=state.getString("page","orders");query=state.getString("query","");
            statusFilter=state.getString("status","");dateFilter=state.getString("date","");
            showArchived=state.getBoolean("archived");detailId=state.getLong("detail");
            if(state.containsKey("editor"))try{editor=Editor.fromJson(new JSONObject(state.getString("editor")));}catch(Exception e){page="orders";}
            if(state.containsKey("weekly_menu"))try{weeklyMenu=new WeeklyMenu(store.meals(false),new JSONObject(state.getString("weekly_menu")));}catch(Exception e){page="whatsapp";}
        }
        render();
    }
    @Override protected void onSaveInstanceState(Bundle b) {
        super.onSaveInstanceState(b);
        b.putString("page",page);b.putString("query",query);b.putString("status",statusFilter);b.putString("date",dateFilter);
        b.putBoolean("archived",showArchived);b.putLong("detail",detailId);
        if(editor!=null&&page.equals("editor"))try{b.putString("editor",editor.json().toString());}catch(Exception ignored){}
        if(weeklyMenu!=null&&page.equals("wa_menu"))try{b.putString("weekly_menu",weeklyMenu.draftJson().toString());}catch(Exception ignored){}
    }
    @Override protected void onResume(){super.onResume();foreground=true;syncHandler.removeCallbacks(scheduledSync);syncHandler.post(scheduledSync);}
    @Override protected void onPause(){foreground=false;syncHandler.removeCallbacks(scheduledSync);super.onPause();}
    @Override protected void onDestroy() {
        if(store!=null)io.execute(()->store.close());io.shutdown();super.onDestroy();
    }
    @Override public void onBackPressed() {back();}
    private void back() {
        if(page.equals("wa_menu")) {
            new AlertDialog.Builder(this).setTitle("Sair sem publicar?").setMessage("As alterações deste cardápio serão descartadas.").setNegativeButton("Continuar editando",null).setPositiveButton("Descartar",(d,w)->{weeklyMenu=null;page="whatsapp";render();}).show();
        } else if(page.equals("editor")) {
            new AlertDialog.Builder(this).setTitle("Sair sem salvar?")
                .setMessage("As alterações deste pedido serão descartadas.")
                .setNegativeButton("Continuar editando",null).setPositiveButton("Descartar",(d,w)->{editor=null;page="orders";render();}).show();
        } else if(page.equals("detail")){page="orders";render();}
        else if(!page.equals("orders")){page="orders";query="";render();}
        else super.onBackPressed();
    }

    private void render() {
        if(page.equals("editor")&&editor==null)page="orders";
        if(page.equals("detail")&&store.order(detailId)==null)page="orders";
        if(page.equals("wa_menu")&&weeklyMenu==null)page="whatsapp";
        root=vertical();root.setBackgroundColor(BG);
        root.setOnApplyWindowInsetsListener((v,insets)->{
            if(android.os.Build.VERSION.SDK_INT>=30) {
                android.graphics.Insets bars=insets.getInsets(android.view.WindowInsets.Type.systemBars()|android.view.WindowInsets.Type.displayCutout());
                v.setPadding(bars.left,bars.top,bars.right,bars.bottom);
            } else {
                v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        setContentView(root);root.requestApplyInsets();
        LinearLayout header=vertical();header.setPadding(dp(20),dp(16),dp(20),dp(12));
        TextView brand=label("MARMITA FÁCIL",12,ACCENT,true);brand.setLetterSpacing(.14f);header.addView(brand);
        String title=page.equals("orders")?"Seus pedidos":page.equals("customers")?"Seus clientes":page.equals("meals")?"Seu cardápio":page.equals("backup")?"Seus dados":page.equals("whatsapp")?"Seu WhatsApp":page.equals("wa_menu")?"Cardápio da semana":page.equals("editor")?(editor!=null&&editor.id>0?"Editar pedido":"Novo pedido"):"Detalhes do pedido";
        if(page.equals("editor")||page.equals("detail")||page.equals("wa_menu")) {
            TextView back=label("‹  Voltar",14,ACCENT,true);back.setMinHeight(dp(42));back.setGravity(Gravity.CENTER_VERTICAL);back.setOnClickListener(v->back());header.addView(back);
        }
        header.addView(label(title,28,INK,true));root.addView(header);
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setClipToPadding(false);
        content=vertical();content.setPadding(dp(20),dp(4),dp(20),dp(20));scroll.addView(content);
        root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        if(page.equals("orders"))ordersPage();
        else if(page.equals("customers"))customersPage();
        else if(page.equals("meals"))mealsPage();
        else if(page.equals("backup"))backupPage();
        else if(page.equals("editor"))editorPage();
        else if(page.equals("detail"))detailPage();
        else if(page.equals("whatsapp"))whatsAppPage();
        else if(page.equals("wa_menu"))weeklyMenuPage();
        if(!page.equals("editor")&&!page.equals("wa_menu"))navigation();
    }
    private void navigation() {
        LinearLayout nav=horizontal();nav.setPadding(dp(6),dp(7),dp(6),dp(7));nav.setBackgroundColor(WHITE);
        String[] codes={"orders","customers","meals","whatsapp","backup"};String[] names={"Pedidos","Clientes","Cardápio","WhatsApp","Backup"};
        for(int k=0;k<codes.length;k++) {
            final String target=codes[k];boolean active=page.equals(target)||(page.equals("detail")&&target.equals("orders"));
            TextView b=label(names[k],12,active?ACCENT:MUTED,active);b.setGravity(Gravity.CENTER);b.setMinHeight(dp(50));
            if(active)b.setBackground(shape(TINT,12,false));
            b.setOnClickListener(v->{page=target;query="";showArchived=false;render();});
            nav.addView(b,new LinearLayout.LayoutParams(0,-2,1));
        }
        root.addView(nav);
    }
    private void ordersPage() {
        List<Store.Order> all=store.orders();long value=0;int count=0;
        for(Store.Order o:all)if(o.status.equals("pending")){count++;value+=o.total();}
        LinearLayout stats=horizontal();stats.setBaselineAligned(false);
        LinearLayout s1=card();s1.addView(label("A entregar",12,MUTED,false));s1.addView(label(Integer.toString(count),26,INK,true));s1.addView(label(count==1?"pedido":"pedidos",12,MUTED,false));
        LinearLayout s2=card();s2.addView(label("Valor a entregar",12,MUTED,false));s2.addView(label(Rules.money(value),21,ACCENT,true));s2.addView(label("Total dos pedidos pendentes",11,MUTED,false));
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-1,1);lp.setMargins(0,0,dp(8),0);stats.addView(s1,lp);stats.addView(s2,new LinearLayout.LayoutParams(0,-1,1.4f));
        content.addView(stats);space(content,16);
        content.addView(button("+  Novo pedido",true,()->startOrder(null)));space(content,14);
        if(WhatsAppSync.configured(this)) {
            content.addView(button(syncInFlight?"Buscando pedidos…":"Buscar pedidos do WhatsApp",false,()->syncWhatsApp(true)));
            content.addView(label("Os pedidos confirmados no WhatsApp entram como A entregar.",12,MUTED,false));space(content,12);
        }
        EditText search=field("Buscar cliente ou número do pedido",query,120,InputType.TYPE_CLASS_TEXT);
        content.addView(search);space(content,10);
        LinearLayout statuses=horizontal();
        String[] values={"","pending","delivered","cancelled"},names={"Todos","A entregar","Entregues","Cancelados"};
        for(int k=0;k<values.length;k++){final String code=values[k];statuses.addView(chip(names[k],statusFilter.equals(code),()->{statusFilter=code;render();}));}
        content.addView(horizontalScroll(statuses));space(content,6);
        LinearLayout dates=horizontal();dates.addView(chip("Todas as datas",dateFilter.isEmpty(),()->{dateFilter="";render();}));
        dates.addView(chip("Hoje",dateFilter.equals(Rules.today()),()->{dateFilter=Rules.today();render();}));
        String custom=!dateFilter.isEmpty()&&!dateFilter.equals(Rules.today())?Rules.date(dateFilter):"Escolher data";
        dates.addView(chip(custom,!dateFilter.isEmpty()&&!dateFilter.equals(Rules.today()),()->pickDate(dateFilter.isEmpty()?Rules.today():dateFilter,date->{dateFilter=date;render();})));
        content.addView(horizontalScroll(dates));space(content,10);
        content.addView(label("Filtro de data pela entrega",12,MUTED,false));space(content,12);
        list=vertical();content.addView(list);drawOrders(all);
        watch(search,()->{query=search.getText().toString();drawOrders(all);});
    }
    private void drawOrders(List<Store.Order> all) {
        list.removeAllViews();String needle=normalized(query);int n=0;
        for(Store.Order o:all) {
            if(!statusFilter.isEmpty()&&!o.status.equals(statusFilter))continue;
            if(!dateFilter.isEmpty()&&!o.delivery.equals(dateFilter))continue;
            if(!needle.isEmpty()&&!normalized(o.customerName+" "+number(o.id)+" "+o.phone).contains(needle))continue;
            n++;
            LinearLayout box=card();LinearLayout line=horizontal();line.setGravity(Gravity.CENTER_VERTICAL);
            line.addView(label("Pedido "+number(o.id),12,MUTED,true),new LinearLayout.LayoutParams(0,-2,1));line.addView(badge(o.status));box.addView(line);space(box,8);
            box.addView(label(o.customerName,20,INK,true));
            if(o.fromWhatsApp)box.addView(label("Recebido pelo WhatsApp",12,0xFF1F6A45,true));
            boolean late=o.status.equals("pending")&&o.delivery.compareTo(Rules.today())<0;
            TextView date=label((late?"Atrasado · ":"")+"Entrega "+Rules.date(o.delivery),14,late?0xFFAC3034:MUTED,false);date.setPadding(0,dp(5),0,dp(5));box.addView(date);
            StringBuilder summary=new StringBuilder();for(Store.Item i:o.items){if(summary.length()>0)summary.append(" · ");summary.append(i.quantity).append("× ").append(i.name);}
            TextView items=label(summary.toString(),13,MUTED,false);items.setMaxLines(2);items.setEllipsize(android.text.TextUtils.TruncateAt.END);box.addView(items);space(box,12);
            LinearLayout bottom=horizontal();bottom.setGravity(Gravity.CENTER_VERTICAL);bottom.addView(label(o.quantity()+" marmita"+(o.quantity()==1?"":"s"),12,MUTED,false),new LinearLayout.LayoutParams(0,-2,1));bottom.addView(label(Rules.money(o.total()),21,INK,true));box.addView(bottom);
            box.setOnClickListener(v->{detailId=o.id;page="detail";render();});box.setContentDescription("Pedido "+o.id+", "+o.customerName+", "+Rules.statusLabel(o.status)+", "+Rules.money(o.total()));
            list.addView(box);space(list,12);
        }
        if(n==0)empty(list,all.isEmpty()?"Seu primeiro pedido começa aqui":"Nenhum pedido encontrado",all.isEmpty()?"Cadastre um cliente e uma marmita. Depois, toque em Novo pedido.":"Altere os filtros ou o texto da busca.");
        else list.addView(label(n+" pedido"+(n==1?"":"s")+" encontrado"+(n==1?"":"s"),12,MUTED,false));
    }
    private void customersPage() {
        content.addView(label("Clientes e endereços sempre à mão.",14,MUTED,false));space(content,16);
        content.addView(button("+  Cadastrar cliente",true,()->customerDialog(null,()->render())));space(content,12);
        EditText search=field("Buscar nome ou telefone",query,120,InputType.TYPE_CLASS_TEXT);content.addView(search);
        CheckBox archived=new CheckBox(this);archived.setText("Mostrar também os arquivados");archived.setTextColor(MUTED);archived.setTextSize(13);archived.setChecked(showArchived);content.addView(archived);space(content,8);
        list=vertical();content.addView(list);List<Store.Customer> all=store.customers(showArchived);drawCustomers(all);
        archived.setOnCheckedChangeListener((b,checked)->{showArchived=checked;render();});
        watch(search,()->{query=search.getText().toString();drawCustomers(all);});
    }
    private void drawCustomers(List<Store.Customer> all) {
        list.removeAllViews();int n=0;
        for(Store.Customer c:all) {
            if(!normalized(c.name+" "+c.phone).contains(normalized(query)))continue;n++;
            LinearLayout box=card();box.addView(label(c.name,19,INK,true));
            if(!c.active)box.addView(label("Arquivado",12,MUTED,true));
            space(box,6);box.addView(label(c.phone.isEmpty()?"Telefone não informado":c.phone,14,MUTED,false));
            if(!c.address.isEmpty()){space(box,4);box.addView(label(c.address,14,MUTED,false));}
            box.setOnClickListener(v->customerDialog(c,()->render()));list.addView(box);space(list,12);
        }
        if(n==0)empty(list,"Nenhum cliente encontrado","Toque em Cadastrar cliente para começar.");
    }
    private void mealsPage() {
        content.addView(label("Seus tipos de marmita e preços de venda.",14,MUTED,false));space(content,16);
        content.addView(button("+  Cadastrar marmita",true,()->mealDialog(null,()->render())));space(content,12);
        EditText search=field("Buscar tipo de marmita",query,120,InputType.TYPE_CLASS_TEXT);content.addView(search);
        CheckBox archived=new CheckBox(this);archived.setText("Mostrar também as arquivadas");archived.setTextSize(13);archived.setTextColor(MUTED);archived.setChecked(showArchived);content.addView(archived);space(content,8);
        list=vertical();content.addView(list);List<Store.Meal> all=store.meals(showArchived);drawMeals(all);
        archived.setOnCheckedChangeListener((b,checked)->{showArchived=checked;render();});
        watch(search,()->{query=search.getText().toString();drawMeals(all);});
    }
    private void drawMeals(List<Store.Meal> all) {
        list.removeAllViews();int n=0;
        for(Store.Meal m:all) {
            if(!normalized(m.name+" "+m.description).contains(normalized(query)))continue;n++;
            LinearLayout box=card();box.addView(label(m.name,19,INK,true));
            if(!m.active)box.addView(label("Arquivada",12,MUTED,true));
            if(!m.description.isEmpty()){space(box,5);box.addView(label(m.description,14,MUTED,false));}
            space(box,10);box.addView(label(Rules.money(m.price),23,ACCENT,true));
            box.setOnClickListener(v->mealDialog(m,()->render()));list.addView(box);space(list,12);
        }
        if(n==0)empty(list,"Nenhuma marmita encontrada","Cadastre opções como tradicional, fitness ou vegetariana e defina o preço de cada uma.");
    }

    private void customerDialog(Store.Customer existing,Runnable done) {
        LinearLayout form=dialogForm();
        EditText name=formField(form,"Nome do cliente *",existing==null?"":existing.name,120,InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_WORDS);
        EditText phone=formField(form,"Telefone",existing==null?"":existing.phone,40,InputType.TYPE_CLASS_PHONE);
        EditText address=formField(form,"Endereço de entrega",existing==null?"":existing.address,500,InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_SENTENCES|InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        AlertDialog.Builder builder=new AlertDialog.Builder(this).setTitle(existing==null?"Cadastrar cliente":"Editar cliente").setView(dialogScroll(form)).setNegativeButton("Voltar",null).setPositiveButton("Salvar",null);
        if(existing!=null)builder.setNeutralButton(existing.active?"Arquivar":"Reativar",(d,w)->{
            if(!existing.active){store.setActive("customers",existing.id,true);done.run();return;}
            new AlertDialog.Builder(this).setTitle("Arquivar cliente?").setMessage("Os pedidos existentes serão mantidos. O cliente deixará de aparecer nos novos pedidos.").setNegativeButton("Voltar",null).setPositiveButton("Arquivar",(a,b)->{store.setActive("customers",existing.id,false);done.run();}).show();
        });
        AlertDialog dialog=builder.create();dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
            try {Store.Customer c=new Store.Customer();if(existing!=null){c.id=existing.id;c.active=existing.active;}c.name=name.getText().toString();c.phone=phone.getText().toString();c.address=address.getText().toString();lastSavedCustomerId=store.saveCustomer(c);dialog.dismiss();toast("Cliente salvo.");done.run();}
            catch(Exception e){error(e);}
        }));dialog.show();
    }
    private void mealDialog(Store.Meal existing,Runnable done) {
        LinearLayout form=dialogForm();
        EditText name=formField(form,"Nome da marmita *",existing==null?"":existing.name,120,InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        EditText description=formField(form,"Descrição",existing==null?"":existing.description,500,InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_SENTENCES|InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        EditText price=formField(form,"Valor unitário (R$) *",existing==null?"":Rules.priceInput(existing.price),16,InputType.TYPE_CLASS_NUMBER|InputType.TYPE_NUMBER_FLAG_DECIMAL);
        form.addView(label("Alterar o preço não modifica os pedidos já salvos.",12,MUTED,false));
        AlertDialog.Builder builder=new AlertDialog.Builder(this).setTitle(existing==null?"Cadastrar marmita":"Editar marmita").setView(dialogScroll(form)).setNegativeButton("Voltar",null).setPositiveButton("Salvar",null);
        if(existing!=null)builder.setNeutralButton(existing.active?"Arquivar":"Reativar",(d,w)->{
            if(!existing.active){store.setActive("meals",existing.id,true);done.run();return;}
            new AlertDialog.Builder(this).setTitle("Arquivar marmita?").setMessage("Os pedidos existentes serão mantidos. Esta opção deixará de aparecer nos novos pedidos.").setNegativeButton("Voltar",null).setPositiveButton("Arquivar",(a,b)->{store.setActive("meals",existing.id,false);done.run();}).show();
        });
        AlertDialog dialog=builder.create();dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
            try{Store.Meal m=new Store.Meal();if(existing!=null){m.id=existing.id;m.active=existing.active;}m.name=name.getText().toString();m.description=description.getText().toString();m.price=Rules.parseMoney(price.getText().toString());store.saveMeal(m);dialog.dismiss();toast("Marmita salva.");done.run();}catch(Exception e){error(e);}
        }));dialog.show();
    }

    private void startOrder(Store.Order order) {
        editor=new Editor();
        if(order!=null) {
            editor.id=order.id;editor.customerId=order.customerId;editor.ordered=order.ordered;editor.delivery=order.delivery;editor.status=order.status;editor.notes=order.notes;
            for(Store.Item item:order.items){Line line=new Line();line.mealId=item.mealId;line.name=item.name;line.quantity=Integer.toString(item.quantity);line.price=Rules.priceInput(item.price);editor.lines.add(line);}
        }
        page="editor";render();
    }
    private void editorPage() {
        if(editor==null){page="orders";render();return;}
        content.addView(label("CLIENTE",12,MUTED,true));space(content,6);
        customerSpinner=new Spinner(this);customerSpinner.setBackground(shape(WHITE,12,true));customerSpinner.setMinimumHeight(dp(52));content.addView(customerSpinner,new LinearLayout.LayoutParams(-1,-2));refreshCustomerSpinner();
        content.addView(button("+  Cadastrar novo cliente",false,()->customerDialog(null,()->{editor.customerId=lastSavedCustomerId;refreshCustomerSpinner();})));
        space(content,12);
        LinearLayout dates=horizontal();dates.setBaselineAligned(false);
        LinearLayout left=vertical();left.addView(label("Dia do pedido",13,MUTED,true));Button ordered=button(Rules.date(editor.ordered),false,()->{});left.addView(ordered);ordered.setOnClickListener(v->pickDate(editor.ordered,date->{editor.ordered=date;ordered.setText(Rules.date(date));}));
        LinearLayout right=vertical();right.addView(label("Dia da entrega",13,MUTED,true));Button delivery=button(Rules.date(editor.delivery),false,()->{});right.addView(delivery);delivery.setOnClickListener(v->pickDate(editor.delivery,date->{editor.delivery=date;delivery.setText(Rules.date(date));}));
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-2,1);lp.setMargins(0,0,dp(10),0);dates.addView(left,lp);dates.addView(right,new LinearLayout.LayoutParams(0,-2,1));content.addView(dates);space(content,16);
        content.addView(label("MARMITAS DO PEDIDO",12,MUTED,true));space(content,10);
        editorLines=vertical();content.addView(editorLines);renderEditorLines();
        content.addView(button("+  Adicionar marmita",false,()->chooseMeal()));space(content,18);
        content.addView(label("Status do pedido",13,MUTED,true));space(content,5);
        Spinner status=new Spinner(this);status.setMinimumHeight(dp(52));status.setBackground(shape(WHITE,12,true));String[] labels={"A entregar","Entregue","Cancelado"};status.setAdapter(spinnerAdapter(labels));
        for(int k=0;k<STATUSES.length;k++)if(STATUSES[k].equals(editor.status))status.setSelection(k);
        status.setOnItemSelectedListener(new Selected(){@Override public void onItemSelected(AdapterView<?> a,View v,int position,long id){editor.status=STATUSES[position];}});content.addView(status);space(content,14);
        EditText notes=formField(content,"Observações",editor.notes,2000,InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_SENTENCES|InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        watch(notes,()->editor.notes=notes.getText().toString());
        content.addView(label("O valor unitário pode ser ajustado neste pedido.",12,MUTED,false));
        LinearLayout footer=vertical();footer.setPadding(dp(20),dp(12),dp(20),dp(12));footer.setBackgroundColor(WHITE);
        LinearLayout totalRow=horizontal();totalRow.setGravity(Gravity.CENTER_VERTICAL);totalRow.addView(label("Total do pedido",14,MUTED,true),new LinearLayout.LayoutParams(0,-2,1));editorTotal=label("",24,INK,true);totalRow.addView(editorTotal);footer.addView(totalRow);space(footer,8);footer.addView(button("Salvar pedido",true,()->saveEditor()));root.addView(footer);updateTotal();
    }
    private void refreshCustomerSpinner() {
        editorCustomers.clear();Store.Customer placeholder=new Store.Customer();placeholder.name="Selecione um cliente";editorCustomers.add(placeholder);int selection=0;
        for(Store.Customer c:store.customers(true))if(c.active||c.id==editor.customerId){editorCustomers.add(c);if(c.id==editor.customerId)selection=editorCustomers.size()-1;}
        customerSpinner.setOnItemSelectedListener(null);customerSpinner.setAdapter(new ArrayAdapter<Store.Customer>(this,android.R.layout.simple_spinner_dropdown_item,editorCustomers));customerSpinner.setSelection(selection);
        customerSpinner.setOnItemSelectedListener(new Selected(){@Override public void onItemSelected(AdapterView<?> a,View v,int p,long id){editor.customerId=editorCustomers.get(p).id;}});
    }
    private void chooseMeal() {
        List<Store.Meal> meals=store.meals(false);
        if(meals.isEmpty()) {
            new AlertDialog.Builder(this).setTitle("Cadastre sua primeira marmita").setMessage("Defina o nome e o preço para adicionar ao pedido.").setNegativeButton("Voltar",null).setPositiveButton("Cadastrar",(d,w)->mealDialog(null,()->chooseMeal())).show();return;
        }
        if(editor.lines.size()>=100){toast("O pedido pode ter até 100 itens.");return;}
        String[] options=new String[meals.size()];for(int k=0;k<options.length;k++)options[k]=meals.get(k).name+" · "+Rules.money(meals.get(k).price);
        new AlertDialog.Builder(this).setTitle("Adicionar marmita").setItems(options,(d,which)->{
            Store.Meal meal=meals.get(which);Line line=new Line();line.mealId=meal.id;line.name=meal.name;line.price=Rules.priceInput(meal.price);editor.lines.add(line);renderEditorLines();updateTotal();
        }).setNegativeButton("Voltar",null).show();
    }
    private void renderEditorLines() {
        if(editorLines==null)return;editorLines.removeAllViews();
        if(editor.lines.isEmpty()){empty(editorLines,"Adicione as marmitas","Você pode incluir vários tipos no mesmo pedido.");return;}
        for(Line line:editor.lines) {
            LinearLayout box=card();LinearLayout head=horizontal();head.setGravity(Gravity.CENTER_VERTICAL);
            head.addView(label(line.name,17,INK,true),new LinearLayout.LayoutParams(0,-2,1));TextView remove=label("Remover",12,0xFFAC3034,true);remove.setPadding(dp(8),0,0,0);remove.setMinHeight(dp(48));remove.setGravity(Gravity.CENTER_VERTICAL);remove.setOnClickListener(v->{editor.lines.remove(line);renderEditorLines();updateTotal();});head.addView(remove);box.addView(head);
            LinearLayout row=horizontal();row.setBaselineAligned(false);
            LinearLayout a=vertical(),b=vertical();a.addView(label("Quantidade",12,MUTED,false));b.addView(label("Valor unitário (R$)",12,MUTED,false));space(a,5);space(b,5);
            EditText quantity=field("1",line.quantity,5,InputType.TYPE_CLASS_NUMBER),price=field("20,00",line.price,16,InputType.TYPE_CLASS_NUMBER|InputType.TYPE_NUMBER_FLAG_DECIMAL);
            quantity.setContentDescription("Quantidade de "+line.name);price.setContentDescription("Valor unitário de "+line.name);a.addView(quantity);b.addView(price);
            LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-2,1);lp.setMargins(0,0,dp(10),0);row.addView(a,lp);row.addView(b,new LinearLayout.LayoutParams(0,-2,1.5f));box.addView(row);space(box,8);
            TextView subtotal=label("",14,INK,true);subtotal.setGravity(Gravity.END);box.addView(subtotal);
            Runnable update=()->{line.quantity=quantity.getText().toString();line.price=price.getText().toString();try{subtotal.setText("Subtotal "+Rules.money(Rules.lineTotal(Rules.parseMoney(line.price),Rules.parseQuantity(line.quantity))));}catch(IllegalArgumentException e){subtotal.setText("Confira quantidade e valor");}updateTotal();};
            watch(quantity,update);watch(price,update);update.run();editorLines.addView(box);space(editorLines,10);
        }
    }
    private void updateTotal() {
        if(editorTotal==null||editor==null)return;
        try{long total=0;for(Line line:editor.lines)total=Rules.addTotal(total,Rules.lineTotal(Rules.parseMoney(line.price),Rules.parseQuantity(line.quantity)));editorTotal.setText(Rules.money(total));}
        catch(IllegalArgumentException e){editorTotal.setText("Confira os itens");}
    }
    private void saveEditor() {
        try {
            Store.Order o=new Store.Order();o.id=editor.id;o.customerId=editor.customerId;o.ordered=editor.ordered;o.delivery=editor.delivery;o.status=editor.status;o.notes=editor.notes;
            for(Line l:editor.lines){Store.Item i=new Store.Item();i.mealId=l.mealId;i.name=l.name;i.quantity=Rules.parseQuantity(l.quantity);i.price=Rules.parseMoney(l.price);o.items.add(i);}
            detailId=store.saveOrder(o);editor=null;page="detail";toast("Pedido salvo.");render();
        } catch(Exception e){error(e);}
    }

    private void detailPage() {
        Store.Order o=store.order(detailId);
        if(o==null){page="orders";render();return;}
        LinearLayout box=card();LinearLayout head=horizontal();head.setGravity(Gravity.CENTER_VERTICAL);head.addView(label("Pedido "+number(o.id),17,INK,true),new LinearLayout.LayoutParams(0,-2,1));head.addView(badge(o.status));box.addView(head);space(box,15);
        box.addView(label(o.customerName,23,INK,true));
        if(o.fromWhatsApp){space(box,6);box.addView(label("Recebido pelo WhatsApp",12,0xFF1F6A45,true));}
        if(!o.phone.isEmpty()){space(box,7);box.addView(label("Telefone: "+o.phone,14,MUTED,false));}
        if(!o.address.isEmpty()){space(box,7);box.addView(label(o.address,14,MUTED,false));}
        space(box,15);box.addView(label("Pedido em "+Rules.date(o.ordered),14,MUTED,false));space(box,5);box.addView(label("Entrega em "+Rules.date(o.delivery),16,INK,true));content.addView(box);space(content,18);
        content.addView(label("ITENS DO PEDIDO",12,MUTED,true));space(content,10);
        LinearLayout items=card();for(Store.Item i:o.items){items.addView(label(i.quantity+"× "+i.name,17,INK,true));space(items,4);LinearLayout row=horizontal();row.addView(label(Rules.money(i.price)+" por unidade",12,MUTED,false),new LinearLayout.LayoutParams(0,-2,1));row.addView(label(Rules.money(i.total()),16,INK,true));items.addView(row);space(items,14);}
        LinearLayout total=horizontal();total.setGravity(Gravity.CENTER_VERTICAL);total.addView(label("Total",17,INK,true),new LinearLayout.LayoutParams(0,-2,1));total.addView(label(Rules.money(o.total()),25,ACCENT,true));items.addView(total);content.addView(items);space(content,14);
        if(!o.notes.isEmpty()){LinearLayout notes=card();notes.addView(label("Observações",13,MUTED,true));space(notes,6);notes.addView(label(o.notes,15,INK,false));content.addView(notes);space(content,14);}
        if(o.status.equals("pending"))content.addView(button("✓  Marcar como entregue",true,()->changeStatus(o,"delivered")));
        content.addView(button("Alterar status",false,()->{
            String[] labels={"A entregar","Entregue","Cancelado"};new AlertDialog.Builder(this).setTitle("Status do pedido").setItems(labels,(d,k)->changeStatus(o,STATUSES[k])).setNegativeButton("Voltar",null).show();
        }));
        content.addView(button("Editar pedido",false,()->startOrder(o)));
    }
    private void changeStatus(Store.Order o,String status) {
        if(o.status.equals(status))return;
        Runnable save=()->{try{store.status(o.id,status);render();toast("Status: "+Rules.statusLabel(status)+".");}catch(Exception e){error(e);}};
        if(status.equals("cancelled"))new AlertDialog.Builder(this).setTitle("Cancelar pedido "+number(o.id)+"?").setMessage("O pedido continuará no histórico com o status Cancelado.").setNegativeButton("Voltar",null).setPositiveButton("Cancelar pedido",(d,w)->save.run()).show();
        else save.run();
    }

    private void whatsAppPage() {
        boolean connected=WhatsAppSync.configured(this);
        LinearLayout info=card();info.addView(label("Do atendimento ao pedido",21,INK,true));space(info,8);
        info.addView(label("O cliente recebe as boas-vindas e o cardápio da semana, escolhe a entrega e as marmitas, informa seus dados e confirma o total. Depois, o pedido entra aqui como A entregar.",15,MUTED,false));content.addView(info);space(content,14);
        LinearLayout connection=card();connection.addView(label(connected?"Serviço conectado":"Conecte o seu negócio",20,INK,true));space(connection,8);
        if(connected) {
            connection.addView(label(WhatsAppSync.baseUrl(this),13,MUTED,false));space(connection,8);
            String last=WhatsAppSync.lastSync(this);connection.addView(label(last.isEmpty()?"Ainda não houve uma busca concluída.":"Última busca: "+last,12,MUTED,false));
            connection.addView(button(syncInFlight?"Buscando pedidos…":"Buscar pedidos agora",true,()->syncWhatsApp(true)));
            connection.addView(button("Editar conexão",false,()->connectionDialog()));
        } else {
            connection.addView(label("Cada negócio usa seu próprio número do WhatsApp e seu próprio serviço. Para ativar, será necessário cadastrar o número na plataforma oficial do WhatsApp e configurar o serviço online.",15,MUTED,false));space(connection,8);
            connection.addView(button("Configurar conexão",true,()->connectionDialog()));
        }
        content.addView(connection);space(content,14);
        LinearLayout menu=card();menu.addView(label("Seu cardápio da semana",20,INK,true));space(menu,8);
        menu.addView(label("Cadastre as marmitas e os preços na aba Cardápio. Aqui, escolha a semana e em quais dias cada opção estará disponível. O cliente verá somente o que você publicar.",15,MUTED,false));space(menu,10);
        menu.addView(button("Preparar cardápio da semana",true,()->{
            if(!connected){toast("Configure a conexão do seu negócio primeiro.");return;}
            try{weeklyMenu=new WeeklyMenu(store.meals(false),null);weeklyMenu.businessName=getPreferences(MODE_PRIVATE).getString("wa_business_name","");page="wa_menu";render();}catch(Exception e){error(e);}
        }));
        menu.addView(button("Carregar cardápio publicado",false,()->{
            if(!connected){toast("Configure a conexão do seu negócio primeiro.");return;}
            work("Buscando cardápio…",()->new WhatsAppSync(this).fetchMenu(),published->{try{weeklyMenu=new WeeklyMenu(store.meals(false),published);page="wa_menu";render();}catch(Exception e){error(e);}});
        }));content.addView(menu);space(content,14);
        content.addView(label("A busca ocorre a cada minuto com o app aberto. Em segundo plano, o Android agenda buscas com intervalo mínimo de 15 minutos e pode adiá-las. Pedidos confirmados ficam guardados no serviço até serem recebidos. A integração precisa de internet; o controle manual continua funcionando sem conexão.",12,MUTED,false));space(content,8);
        content.addView(label("Conectar o serviço não ativa sozinho o número de vendas na Meta. Este aplicativo não lê conversas do WhatsApp pessoal.",12,MUTED,false));
        if(connected)content.addView(button("Desconectar este celular",false,()->new AlertDialog.Builder(this).setTitle("Desconectar o aplicativo?").setMessage("Este celular deixará de buscar pedidos. Seus registros locais serão mantidos. O atendimento do WhatsApp continuará no serviço online; para pausá-lo, publique o cardápio com o recebimento desativado.").setNegativeButton("Voltar",null).setPositiveButton("Desconectar",(d,w)->{WhatsAppSync.disconnect(this);render();}).show()));
    }
    private void connectionDialog() {
        LinearLayout form=dialogForm();form.addView(label("Use o endereço e a chave fornecidos na configuração do serviço do seu negócio. A chave da Meta fica somente no servidor.",13,MUTED,false));space(form,14);
        EditText url=formField(form,"Endereço do serviço (https://)",WhatsAppSync.baseUrl(this),500,InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_URI);
        EditText token=formField(form,"Chave de conexão do aplicativo","",512,InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);
        form.addView(label("Para editar, informe novamente a chave. Não use uma chave de outro negócio.",12,MUTED,false));
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Conexão do WhatsApp").setView(dialogScroll(form)).setNegativeButton("Voltar",null).setPositiveButton("Conectar e testar",null).create();
        dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
            final String base=url.getText().toString(),key=token.getText().toString();
            try {
                WhatsAppSync candidate=new WhatsAppSync(this,base,key);
                work("Testando conexão…",()->candidate.health(),health->{
                    try{WhatsAppSync.configure(this,base,key);getPreferences(MODE_PRIVATE).edit().putString("wa_business_name",health.optString("business_name","")).apply();dialog.dismiss();render();toast("Serviço conectado. Confira e publique seu cardápio.");syncWhatsApp(false);}catch(Exception e){error(e);}
                });
            } catch(Exception e){error(e);}
        }));dialog.show();
    }
    private void syncWhatsApp(boolean manual) {
        if(syncInFlight){if(manual)toast("Uma busca de pedidos já está em andamento.");return;}
        if(!WhatsAppSync.configured(this)){if(manual)toast("Configure a conexão na aba WhatsApp.");return;}
        syncInFlight=true;
        io.execute(()->{
            try {
                WhatsAppSync.Result result=new WhatsAppSync(this).pullOrders();
                runOnUiThread(()->{
                    syncInFlight=false;if(isFinishing()||isDestroyed())return;
                    if((result.imported>0||manual)&&(page.equals("orders")||page.equals("whatsapp")))render();
                    if(result.imported>0)toast(result.imported+" pedido(s) do WhatsApp registrado(s).");
                    else if(manual)toast("Busca concluída. Nenhum pedido novo.");
                });
            } catch(Exception e){runOnUiThread(()->{syncInFlight=false;if(isFinishing()||isDestroyed())return;if(manual)new AlertDialog.Builder(this).setTitle("Não foi possível buscar pedidos").setMessage("Confira sua internet, o endereço do serviço e a chave de conexão. Pedidos já registrados permanecem no aplicativo.").setPositiveButton("Entendi",null).show();});}
        });
    }
    private void weeklyMenuPage() {
        content.addView(label("Selecione os dias de venda de cada marmita. Os preços abaixo vêm do cadastro atual do Cardápio. Publicar substitui o cardápio da semana que estava no serviço.",14,MUTED,false));space(content,14);
        EditText business=formField(content,"Nome do negócio *",weeklyMenu.businessName,120,InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_WORDS);watch(business,()->weeklyMenu.businessName=business.getText().toString());
        EditText greeting=formField(content,"Mensagem de boas-vindas *",weeklyMenu.greeting,1000,InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE|InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);watch(greeting,()->weeklyMenu.greeting=greeting.getText().toString());
        content.addView(label("Semana de entrega",13,MUTED,true));content.addView(button(Rules.date(weeklyMenu.start)+" a "+Rules.date(WeeklyMenu.dateAt(weeklyMenu.start,6)),false,()->pickDate(weeklyMenu.start,date->{weeklyMenu.start=WeeklyMenu.monday(date);render();})));space(content,10);
        CheckBox enabled=new CheckBox(this);enabled.setText("Receber novos pedidos pelo WhatsApp");enabled.setTextColor(INK);enabled.setChecked(weeklyMenu.acceptingOrders);enabled.setOnCheckedChangeListener((b,on)->weeklyMenu.acceptingOrders=on);content.addView(enabled);
        content.addView(label("Desmarque e publique para pausar novos pedidos. Os pedidos já confirmados serão mantidos.",12,MUTED,false));space(content,14);
        String[] dayNames={"Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"};
        if(weeklyMenu.entries.isEmpty())empty(content,"Cadastre suas marmitas primeiro","Volte à aba Cardápio, cadastre os tipos e preços e depois prepare a semana.");
        for(WeeklyMenu.Entry entry:weeklyMenu.entries) {
            LinearLayout box=card();box.addView(label(entry.name,19,INK,true));space(box,5);box.addView(label(Rules.money(entry.price)+" por unidade",16,ACCENT,true));space(box,8);
            for(int d=0;d<7;d++) {
                final int day=d;CheckBox check=new CheckBox(this);check.setText(dayNames[d]+" · "+Rules.date(WeeklyMenu.dateAt(weeklyMenu.start,d)));check.setTextSize(14);check.setTextColor(INK);check.setMinHeight(dp(45));check.setChecked(entry.days[d]);check.setOnCheckedChangeListener((b,selected)->entry.days[day]=selected);box.addView(check);
            }
            content.addView(box);space(content,12);
        }
        content.addView(button("Publicar cardápio no WhatsApp",true,()->{
            try {
                JSONObject menu=weeklyMenu.publishJson();new AlertDialog.Builder(this).setTitle("Publicar esta semana?").setMessage("O atendimento usará os dias e preços selecionados para a semana de "+Rules.date(weeklyMenu.start)+". Novos pedidos: "+(weeklyMenu.acceptingOrders?"ativados.":"pausados.")).setNegativeButton("Revisar",null).setPositiveButton("Publicar",(d,w)->work("Publicando cardápio…",()->new WhatsAppSync(this).publishMenu(menu),saved->{getPreferences(MODE_PRIVATE).edit().putString("wa_business_name",menu.optString("business_name","")).apply();weeklyMenu=null;page="whatsapp";render();toast("Cardápio publicado no serviço.");})).show();
            } catch(Exception e){error(e);}
        }));
    }

    private void backupPage() {
        LinearLayout local=card();local.addView(label("Um celular, um controle",21,INK,true));space(local,8);local.addView(label("Clientes, cardápio e pedidos ficam salvos neste aparelho. O controle manual funciona sem internet. Se você ativar o WhatsApp, o serviço online também guardará as conversas e os pedidos recebidos por ele.",15,MUTED,false));content.addView(local);space(content,16);
        LinearLayout backup=card();backup.addView(label("Guarde uma cópia dos seus dados",20,INK,true));space(backup,8);backup.addView(label("Crie um backup e salve o arquivo fora do aplicativo. Para trocar de celular, leve esse arquivo e restaure no novo aparelho.",15,MUTED,false));space(backup,14);backup.addView(button("Criar backup",true,()->exportBackup()));space(backup,6);
        String last=getPreferences(MODE_PRIVATE).getString("last_backup","");backup.addView(label(last.isEmpty()?"Nenhum backup criado neste aparelho.":"Último backup: "+last,12,MUTED,false));content.addView(backup);space(content,16);
        LinearLayout restore=card();restore.addView(label("Restaurar de um arquivo",20,INK,true));space(restore,8);restore.addView(label("A restauração substitui todos os registros atuais deste celular pelos dados do arquivo. Faça um backup atual antes de continuar.",15,MUTED,false));space(restore,12);restore.addView(button("Escolher backup para restaurar",false,()->importBackup()));content.addView(restore);space(content,16);
        content.addView(label("Marmita Fácil · versão 1.1.0\nSem anúncios. Cada negócio tem sua própria conexão.\nO backup não inclui a chave de conexão do WhatsApp.\nSe desinstalar o app ou limpar seus dados, será necessário um backup para recuperar os registros locais.",12,MUTED,false));
    }
    private void exportBackup() {
        Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");
        i.putExtra(Intent.EXTRA_TITLE,"MarmitaFacil-backup-"+new SimpleDateFormat("yyyy-MM-dd-HHmmss",Locale.US).format(new java.util.Date())+".json");
        try{startActivityForResult(i,EXPORT);}catch(Exception e){toast("Nenhum aplicativo de arquivos disponível para salvar o backup.");}
    }
    private void importBackup() {
        Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");
        try{startActivityForResult(i,IMPORT);}catch(Exception e){toast("Nenhum aplicativo de arquivos disponível para abrir o backup.");}
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(result!=RESULT_OK||data==null||data.getData()==null)return;
        android.net.Uri uri=data.getData();
        if(request==EXPORT)work("Criando backup…",()->{
            JSONObject snapshot=store.backup();Store.validateBackup(snapshot);
            byte[] bytes=snapshot.toString(2).getBytes(StandardCharsets.UTF_8);
            if(bytes.length>16*1024*1024)throw new IllegalArgumentException("O backup excede o limite de 16 MB.");
            try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){if(out==null)throw new java.io.IOException("Não foi possível abrir o destino.");out.write(bytes);out.flush();}return true;
        },done->{getPreferences(MODE_PRIVATE).edit().putString("last_backup",new SimpleDateFormat("dd/MM/yyyy 'às' HH:mm",new Locale("pt","BR")).format(new java.util.Date())).apply();page="backup";render();new AlertDialog.Builder(this).setTitle("Backup salvo").setMessage("Guarde o arquivo em um local seguro. Ele contém seus clientes e pedidos.").setPositiveButton("Entendi",null).show();});
        else if(request==IMPORT)work("Conferindo backup…",()->{
            ByteArrayOutputStream out=new ByteArrayOutputStream();try(InputStream in=getContentResolver().openInputStream(uri)) {
                if(in==null)throw new java.io.IOException("Não foi possível abrir o arquivo.");byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1){if(out.size()+n>16*1024*1024)throw new IllegalArgumentException("O arquivo excede o limite de 16 MB.");out.write(buffer,0,n);}
            }
            String json=new String(out.toByteArray(),StandardCharsets.UTF_8);if(json.startsWith("\uFEFF"))json=json.substring(1);
            JSONObject backup=new JSONObject(json);Store.validateBackup(backup);return backup;
        },backup->{
            try {
                String counts=Store.validateBackup(backup);
                new AlertDialog.Builder(this).setTitle("Substituir os registros deste celular?")
                    .setMessage("O backup contém "+counts+"\n\nOs registros atuais serão substituídos. Guarde uma cópia do que deseja manter.\n\nA conexão do WhatsApp deste aparelho será removida. Após restaurar, conecte novamente o serviço do negócio correspondente ao backup.")
                    .setNegativeButton("Voltar",null).setPositiveButton("Restaurar e substituir",(d,w)->{
                        WhatsAppSync.disconnect(this);
                        work("Restaurando…",()->{synchronized(WhatsAppSync.class){store.restore(backup);}return true;},done->{page="orders";query="";dateFilter="";statusFilter="";getPreferences(MODE_PRIVATE).edit().remove("last_backup").remove("wa_business_name").apply();render();toast("Backup restaurado. Reconecte o WhatsApp se desejar receber novos pedidos.");});
                    }).show();
            } catch(Exception e){error(e);}
        });
    }
    private interface Task<T>{T run()throws Exception;}
    private interface Done<T>{void run(T value);}
    private <T>void work(String message,Task<T> task,Done<T> done) {
        ProgressDialog progress=new ProgressDialog(this);progress.setMessage(message);progress.setCancelable(false);progress.show();
        io.execute(()->{try{T result=task.run();runOnUiThread(()->{if(isFinishing()||isDestroyed())return;progress.dismiss();done.run(result);});}catch(Exception e){runOnUiThread(()->{if(isFinishing()||isDestroyed())return;progress.dismiss();new AlertDialog.Builder(this).setTitle("Não foi possível concluir").setMessage(e instanceof org.json.JSONException?"O arquivo não é um backup válido do Marmita Fácil.":safeMessage(e)).setPositiveButton("Entendi",null).show();});}});
    }

    private LinearLayout vertical(){LinearLayout v=new LinearLayout(this);v.setOrientation(LinearLayout.VERTICAL);v.setLayoutParams(new LinearLayout.LayoutParams(-1,-2));return v;}
    private LinearLayout horizontal(){LinearLayout v=new LinearLayout(this);v.setOrientation(LinearLayout.HORIZONTAL);v.setLayoutParams(new LinearLayout.LayoutParams(-1,-2));return v;}
    private LinearLayout card(){LinearLayout v=vertical();v.setPadding(dp(16),dp(15),dp(16),dp(15));v.setBackground(shape(WHITE,16,true));return v;}
    private TextView label(String text,int size,int color,boolean bold){TextView v=new TextView(this);v.setText(text);v.setTextSize(size);v.setTextColor(color);v.setFontFeatureSettings("tnum");if(bold)v.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));v.setLineSpacing(dp(2),1);return v;}
    private Button button(String text,boolean primary,Runnable action){Button b=new Button(this);b.setText(text);b.setTextSize(15);b.setAllCaps(false);b.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));b.setTextColor(primary?WHITE:ACCENT);b.setBackground(shape(primary?ACCENT:TINT,12,false));b.setPadding(dp(14),dp(10),dp(14),dp(10));b.setMinHeight(dp(50));LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.setMargins(0,dp(5),0,dp(5));b.setLayoutParams(p);b.setOnClickListener(v->action.run());return b;}
    private TextView chip(String text,boolean selected,Runnable action){TextView v=label(text,13,selected?WHITE:MUTED,selected);v.setGravity(Gravity.CENTER);v.setPadding(dp(14),dp(10),dp(14),dp(10));v.setMinHeight(dp(46));v.setBackground(shape(selected?ACCENT:WHITE,22,!selected));LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-2,-2);p.setMargins(0,0,dp(7),0);v.setLayoutParams(p);v.setOnClickListener(w->action.run());return v;}
    private TextView badge(String status){int color=status.equals("delivered")?0xFF1F6A45:status.equals("cancelled")?0xFFAC3034:0xFF885300;int fill=status.equals("delivered")?0xFFE4F3E9:status.equals("cancelled")?0xFFFBE8E6:0xFFFFF1CD;TextView t=label(Rules.statusLabel(status),12,color,true);t.setPadding(dp(10),dp(6),dp(10),dp(6));t.setBackground(shape(fill,20,false));return t;}
    private EditText field(String hint,String value,int max,int inputType){EditText e=new EditText(this);e.setId(View.generateViewId());e.setTextSize(16);e.setTextColor(INK);e.setHintTextColor(MUTED);e.setHint(hint);e.setInputType(inputType);if((inputType&InputType.TYPE_MASK_CLASS)==InputType.TYPE_CLASS_NUMBER&&(inputType&InputType.TYPE_NUMBER_FLAG_DECIMAL)!=0){e.setKeyListener(android.text.method.DigitsKeyListener.getInstance("0123456789,."));e.setRawInputType(inputType);}e.setFilters(new InputFilter[]{new InputFilter.LengthFilter(max)});e.setText(value);e.setPadding(dp(13),dp(12),dp(13),dp(12));e.setMinHeight(dp(52));e.setBackground(shape(WHITE,10,true));e.setLayoutParams(new LinearLayout.LayoutParams(-1,-2));if((inputType&InputType.TYPE_TEXT_FLAG_MULTI_LINE)!=0){e.setMinLines(2);e.setMaxLines(5);e.setGravity(Gravity.TOP);}else{e.setSingleLine(true);}return e;}
    private EditText formField(LinearLayout form,String name,String value,int max,int type){TextView label=label(name,13,MUTED,true);form.addView(label);space(form,6);EditText e=field(name.replace(" *",""),value,max,type);e.setContentDescription(name);label.setLabelFor(e.getId());form.addView(e);space(form,14);return e;}
    private GradientDrawable shape(int color,int radius,boolean stroke){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));if(stroke)d.setStroke(dp(1),BORDER);return d;}
    private void space(LinearLayout v,int h){View x=new View(this);v.addView(x,new LinearLayout.LayoutParams(1,dp(h)));}
    private View horizontalScroll(View child){HorizontalScrollView s=new HorizontalScrollView(this);s.setHorizontalScrollBarEnabled(false);s.addView(child,new ViewGroup.LayoutParams(-2,-2));return s;}
    private LinearLayout dialogForm(){LinearLayout f=vertical();f.setPadding(dp(24),dp(8),dp(24),dp(6));return f;}
    private ScrollView dialogScroll(View child){ScrollView s=new ScrollView(this);s.addView(child);return s;}
    private ArrayAdapter<String> spinnerAdapter(String[] values){ArrayAdapter<String>a=new ArrayAdapter<>(this,android.R.layout.simple_spinner_item,values);a.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);return a;}
    private void empty(LinearLayout v,String title,String text){LinearLayout box=card();box.addView(label(title,19,INK,true));space(box,9);box.addView(label(text,14,MUTED,false));v.addView(box);}
    private void watch(EditText e,Runnable run){e.addTextChangedListener(new TextWatcher(){public void beforeTextChanged(CharSequence s,int start,int count,int after){}public void onTextChanged(CharSequence s,int start,int before,int count){run.run();}public void afterTextChanged(Editable e){}});}
    private void pickDate(String current,Done<String> done){String[] s=current.split("-");DatePickerDialog dialog=new DatePickerDialog(this,(v,y,m,d)->done.run(String.format(Locale.US,"%04d-%02d-%02d",y,m+1,d)),Integer.parseInt(s[0]),Integer.parseInt(s[1])-1,Integer.parseInt(s[2]));Calendar c=Calendar.getInstance();c.set(1900,0,1,0,0,0);dialog.getDatePicker().setMinDate(c.getTimeInMillis());c.set(2100,11,31,23,59,59);dialog.getDatePicker().setMaxDate(c.getTimeInMillis());dialog.show();}
    private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private String number(long id){return String.format(Locale.US,"#%04d",id);}
    private String normalized(String s){return Normalizer.normalize(s,Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(new Locale("pt","BR")).trim();}
    private void toast(String message){Toast.makeText(this,message,Toast.LENGTH_LONG).show();}
    private String safeMessage(Exception e){return e instanceof IllegalArgumentException?e.getMessage():"Não foi possível salvar ou acessar os dados. Verifique o espaço disponível e tente novamente.";}
    private void error(Exception e){toast(safeMessage(e));}
    private abstract static class Selected implements AdapterView.OnItemSelectedListener{public void onNothingSelected(AdapterView<?> a){}}

    private static class Line {long mealId;String name="",quantity="1",price="";}
    private static class Editor {
        long id,customerId;String ordered=Rules.today(),delivery=Rules.today(),status="pending",notes="";
        final List<Line> lines=new ArrayList<>();
        JSONObject json()throws Exception{JSONObject o=new JSONObject();o.put("id",id);o.put("customer",customerId);o.put("ordered",ordered);o.put("delivery",delivery);o.put("status",status);o.put("notes",notes);JSONArray arr=new JSONArray();for(Line l:lines){JSONObject j=new JSONObject();j.put("meal",l.mealId);j.put("name",l.name);j.put("quantity",l.quantity);j.put("price",l.price);arr.put(j);}o.put("lines",arr);return o;}
        static Editor fromJson(JSONObject o)throws Exception{Editor e=new Editor();e.id=o.getLong("id");e.customerId=o.getLong("customer");e.ordered=o.getString("ordered");e.delivery=o.getString("delivery");e.status=o.getString("status");e.notes=o.getString("notes");JSONArray a=o.getJSONArray("lines");for(int k=0;k<a.length();k++){JSONObject j=a.getJSONObject(k);Line l=new Line();l.mealId=j.getLong("meal");l.name=j.getString("name");l.quantity=j.getString("quantity");l.price=j.getString("price");e.lines.add(l);}return e;}
    }
}
