package br.com.marmitafacil.app;

import android.app.job.JobParameters;
import android.app.job.JobService;

/** Best-effort periodic import. Android decides when a background job can run. */
public final class WhatsAppSyncJob extends JobService {
    private volatile int generation;
    private Thread worker;
    @Override public boolean onStartJob(JobParameters parameters) {
        if(!WhatsAppSync.configured(this))return false;
        final int current=++generation;
        worker=new Thread(()->{
            boolean retry=false;
            try{new WhatsAppSync(getApplicationContext()).pullOrders();}catch(Exception e){retry=true;}
            final boolean again=retry;
            if(current==generation)new android.os.Handler(getMainLooper()).post(()->{if(current==generation)jobFinished(parameters,again);});
        },"marmita-whatsapp-import");
        worker.start();return true;
    }
    @Override public boolean onStopJob(JobParameters parameters) {
        generation++;if(worker!=null)worker.interrupt();return WhatsAppSync.configured(this);
    }
}
