package com.namazvakti

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Servis öldüğünde veya sistem tarafından kapatıldığında
 * servisi yeniden başlatmak için kullanılan Receiver
 */
class ServiceRestartReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "ServiceRestartReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "ServiceRestartReceiver triggered - restarting PrayerTimesService")
        
        try {
            // Servisi yeniden başlat
            PrayerTimesService.startService(context)
            Log.d(TAG, "PrayerTimesService restart initiated successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to restart PrayerTimesService", e)
        }
    }
}
