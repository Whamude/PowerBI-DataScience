package br.com.marmitafacil.app;

import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Optional HTTPS bridge. Meta credentials stay on the business's server. */
public final class WhatsAppSync {
    private static final String PREFS="whatsapp_connection", KEY_ALIAS="marmita-facil-owner-api";
    private static final int JOB_ID=1296455425, MAX_RESPONSE=4*1024*1024;
    private final Context context;
    private final String base, token, connectionId;

    public static final class Result {
        public final int imported, acknowledged;
        public Result(int imported,int acknowledged){this.imported=imported;this.acknowledged=acknowledged;}
    }

    public WhatsAppSync(Context context) throws Exception {
        this.context=context.getApplicationContext();
        SharedPreferences p=prefs(context);
        base=normalizeBaseUrl(p.getString("base_url",""));
        token=decrypt(p.getString("token_iv",""),p.getString("token_cipher",""));
        validateToken(token);
        connectionId=p.getString("connection_id","");
    }
    /** Test a prospective connection without changing saved credentials. */
    public WhatsAppSync(Context context,String baseUrl,String ownerToken) {
        this.context=context.getApplicationContext();base=normalizeBaseUrl(baseUrl);token=validateToken(ownerToken);connectionId=null;
    }
    public static boolean configured(Context context) {
        SharedPreferences p=prefs(context);
        return !p.getString("base_url","").isEmpty()&&!p.getString("token_cipher","").isEmpty();
    }
    public static String baseUrl(Context context){return prefs(context).getString("base_url","");}
    public static String lastSync(Context context){return prefs(context).getString("last_sync","");}
    public static void configure(Context context,String baseUrl,String ownerToken) throws Exception {
        String base=normalizeBaseUrl(baseUrl),token=validateToken(ownerToken);
        String[] encrypted=encrypt(token);
        if(!prefs(context).edit().putString("base_url",base).putString("token_iv",encrypted[0]).putString("token_cipher",encrypted[1]).putString("connection_id",java.util.UUID.randomUUID().toString()).remove("last_sync").commit())
            throw new IOException("Não foi possível guardar a conexão neste aparelho.");
        schedule(context);
    }
    public static void disconnect(Context context) {
        prefs(context).edit().clear().commit();
        try{JobScheduler scheduler=(JobScheduler)context.getSystemService(Context.JOB_SCHEDULER_SERVICE);if(scheduler!=null)scheduler.cancel(JOB_ID);}catch(RuntimeException ignored){}
    }
    public static void schedule(Context context) {
        if(!configured(context))return;
        try {
            JobScheduler scheduler=(JobScheduler)context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
            if(scheduler!=null)scheduler.schedule(new JobInfo.Builder(JOB_ID,new ComponentName(context,WhatsAppSyncJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(15*60*1000L)
                .setBackoffCriteria(30000L,JobInfo.BACKOFF_POLICY_EXPONENTIAL).setPersisted(true).build());
        } catch(RuntimeException ignored) { /* Foreground/manual sync still works if the OS refuses a job. */ }
    }
    public JSONObject health() throws Exception {
        JSONObject response=request("GET","/api/v1/health",null);
        if(!response.optBoolean("ok",false)||response.optInt("protocol",0)!=1)
            throw new IOException("O serviço não é compatível com esta versão do Marmita Fácil.");
        return response;
    }
    public JSONObject fetchMenu() throws Exception {return request("GET","/api/v1/menu",null);}
    public JSONObject publishMenu(JSONObject menu) throws Exception {return request("PUT","/api/v1/menu",menu);}

    /** Commit locally first, acknowledge remotely second. Retries cannot duplicate orders. */
    public Result pullOrders() throws Exception {
        synchronized(WhatsAppSync.class) {
            checkCurrentConnection();
            JSONObject response=request("GET","/api/v1/orders?limit=20",null);
            JSONArray orders=response.getJSONArray("orders");
            if(orders.length()>20)throw new IOException("O serviço enviou mais pedidos que o limite permitido.");
            String number=response.getString("phone_number_id");
            if(!number.matches("[0-9]{1,40}"))throw new IOException("Identificador do negócio inválido.");
            String namespace=base+"#phone="+number;
            int imported=0,acknowledged=0;
            try(Store store=new Store(context)) {
                for(int k=0;k<orders.length();k++) {
                    checkCurrentConnection();
                    JSONObject remote=orders.getJSONObject(k);
                    Store.validateWhatsAppOrder(remote);
                    String id=remote.getString("external_id");
                    boolean existing=store.hasImportedWhatsAppOrder(namespace,id);
                    long local=store.importWhatsAppOrder(remote,namespace);
                    if(!existing)imported++;
                    checkCurrentConnection();
                    request("POST","/api/v1/orders/"+id+"/ack",new JSONObject().put("local_order_id",local));
                    acknowledged++;
                }
            }
            prefs(context).edit().putString("last_sync",new SimpleDateFormat("dd/MM/yyyy 'às' HH:mm",new Locale("pt","BR")).format(new Date())).apply();
            return new Result(imported,acknowledged);
        }
    }

    private void checkCurrentConnection() throws IOException {
        if(Thread.currentThread().isInterrupted())throw new java.io.InterruptedIOException("Sincronização interrompida.");
        if(connectionId!=null&&(!configured(context)||!connectionId.equals(prefs(context).getString("connection_id",""))))
            throw new IOException("A conexão foi alterada ou desconectada. Inicie uma nova sincronização.");
    }

    private JSONObject request(String method,String route,JSONObject body) throws Exception {
        HttpURLConnection connection=(HttpURLConnection)new URL(base+route).openConnection();
        connection.setConnectTimeout(15000);connection.setReadTimeout(20000);
        connection.setRequestMethod(method);connection.setInstanceFollowRedirects(false);connection.setUseCaches(false);
        connection.setRequestProperty("Accept","application/json");connection.setRequestProperty("Authorization","Bearer "+token);
        try {
            if(body!=null) {
                byte[] bytes=body.toString().getBytes(StandardCharsets.UTF_8);
                if(bytes.length>1024*1024)throw new IllegalArgumentException("O cardápio excede o limite permitido.");
                connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json; charset=utf-8");connection.setFixedLengthStreamingMode(bytes.length);
                try(OutputStream out=connection.getOutputStream()){out.write(bytes);}
            }
            int status=connection.getResponseCode();
            if(status<200||status>=300) {
                if(status==401||status==403)throw new IOException("A conexão não foi autorizada. Confira a chave de acesso do negócio.");
                if(status>=300&&status<400)throw new IOException("O serviço mudou de endereço. Configure a URL HTTPS final.");
                throw new IOException("O serviço não concluiu a solicitação (código "+status+"). Tente novamente.");
            }
            if(connection.getContentLength()>MAX_RESPONSE)throw new IOException("A resposta do serviço excede o limite permitido.");
            ByteArrayOutputStream bytes=new ByteArrayOutputStream();
            try(InputStream in=connection.getInputStream()) {
                byte[] buffer=new byte[8192];int n;
                while((n=in.read(buffer))!=-1){if(bytes.size()+n>MAX_RESPONSE)throw new IOException("A resposta do serviço excede o limite permitido.");bytes.write(buffer,0,n);}
            }
            String json=new String(bytes.toByteArray(),StandardCharsets.UTF_8);
            return json.trim().isEmpty()?new JSONObject():new JSONObject(json);
        } finally {connection.disconnect();}
    }
    public static String normalizeBaseUrl(String raw) {
        try {
            String value=raw==null?"":raw.trim();
            URI original=new URI(value);
            if(original.getRawPath()!=null&&original.getRawPath().contains("//"))throw new IllegalArgumentException();
            URI uri=original.normalize();
            if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null||uri.getPort()==0||uri.getPort()>65535||value.indexOf('\\')>=0)
                throw new IllegalArgumentException();
            String path=uri.getRawPath()==null?"":uri.getRawPath();
            if(path.contains("%")||path.contains("//"))throw new IllegalArgumentException();
            while(path.endsWith("/"))path=path.substring(0,path.length()-1);
            String host=uri.getHost().toLowerCase(Locale.US);
            if(host.indexOf(':')>=0&&!host.startsWith("["))host="["+host+"]";
            String url="https://"+host+(uri.getPort()==-1||uri.getPort()==443?"":":"+uri.getPort())+path;
            if(url.length()>440)throw new IllegalArgumentException();
            return url;
        } catch(Exception e){throw new IllegalArgumentException("Informe a URL HTTPS do serviço, sem usuário, senha ou parâmetros.");}
    }
    public static String validateToken(String raw) {
        String value=raw==null?"":raw.trim();
        if(value.length()<32||value.length()>512||!value.matches("[A-Za-z0-9_\\-\\.\\~+/=]+"))
            throw new IllegalArgumentException("A chave de acesso do serviço deve ter de 32 a 512 caracteres e não pode conter espaços.");
        return value;
    }
    private static SharedPreferences prefs(Context c){return c.getApplicationContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE);}
    private static SecretKey key() throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(store.containsAlias(KEY_ALIAS))return (SecretKey)store.getKey(KEY_ALIAS,null);
        KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }
    private static String[] encrypt(String token) throws Exception {
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());
        return new String[]{Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP),Base64.encodeToString(cipher.doFinal(token.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP)};
    }
    private static String decrypt(String iv,String value) throws Exception {
        try {
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(iv,Base64.NO_WRAP)));
            return new String(cipher.doFinal(Base64.decode(value,Base64.NO_WRAP)),StandardCharsets.UTF_8);
        } catch(Exception e){throw new IOException("Não foi possível ler a conexão deste aparelho. Configure novamente o serviço.");}
    }
}
