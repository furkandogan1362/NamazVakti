package com.namazvakti

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import org.json.JSONObject

object NotificationHelper {
    private const val CHANNEL_ID = "prayer_times_channel"
    const val NOTIFICATION_ID = 1001
    private const val TAG = "NotificationHelper"

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // Kanal zaten varsa ve doğru ayarlardaysa tekrar oluşturma
            val existingChannel = notificationManager.getNotificationChannel(CHANNEL_ID)
            if (existingChannel != null) {
                // Eğer importance yanlışsa kanalı sil ve yeniden oluştur
                if (existingChannel.importance != NotificationManager.IMPORTANCE_LOW) {
                    android.util.Log.d(TAG, "Deleting old notification channel with wrong importance")
                    notificationManager.deleteNotificationChannel(CHANNEL_ID)
                } else {
                    android.util.Log.d(TAG, "Notification channel already exists with correct settings")
                    return
                }
            }
            
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Namaz Vakitleri",
                NotificationManager.IMPORTANCE_LOW  // IMPORTANCE_LOW kullan - pop-up çıkarmaz, sessiz
            ).apply {
                description = "Kalıcı namaz vakti bildirimi"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setSound(null, null)
                enableVibration(false)
                enableLights(false)
            }
            notificationManager.createNotificationChannel(channel)
            android.util.Log.d(TAG, "Notification channel created with IMPORTANCE_LOW")
        }
    }

    fun createNotification(context: Context, locationName: String, nextPrayerName: String, remainingSeconds: Int, times: JSONObject): Notification {
        createNotificationChannel(context)

        android.util.Log.d(TAG, "Creating notification...")

        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)

        // Vakitleri al
        val fajr = times.getString("fajr")
        val sun = times.getString("sun")
        val dhuhr = times.getString("dhuhr")
        val asr = times.getString("asr")
        val maghrib = times.getString("maghrib")
        val isha = times.getString("isha")

        // Sonraki vakit saatini bul
        val nextPrayerTime = when (nextPrayerName) {
            "İmsak" -> fajr
            "Güneş" -> sun
            "Öğle" -> dhuhr
            "İkindi" -> asr
            "Akşam" -> maghrib
            "Yatsı" -> isha
            else -> ""
        }

        // Kalan süreyi hesapla
        val hours = remainingSeconds / 3600
        val minutes = (remainingSeconds % 3600) / 60
        val seconds = remainingSeconds % 60
        
        // Sayaç formatı (HH:MM:SS) - üst satır için
        val remainingCounter = String.format("%02d:%02d:%02d", hours, minutes, seconds)
        
        // Açık metin formatı - alt satır için
        val remainingTextLong = when {
            hours > 0 && minutes > 0 -> "$hours saat $minutes dakika kaldı."
            hours > 0 && minutes == 0 -> "$hours saat kaldı."
            hours == 0 && minutes > 0 -> "$minutes dakika kaldı."
            else -> "1 dakikadan az kaldı."
        }

        // Başlık: Sadece bölge adı (büyük ve kalın)
        // İçerik: Vakit bilgisi ve sayaç (küçük font)
        val titleText = locationName
        val contentText = "$nextPrayerName: $nextPrayerTime • $remainingCounter"
        
        // Genişletilmiş görünüm için tüm vakitler
        val bigText = "İmsak: $fajr  •  Güneş: $sun  •  Öğle: $dhuhr\nİkindi: $asr  •  Akşam: $maghrib  •  Yatsı: $isha"

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.namazvakti_logo5)
            .setColor(android.graphics.Color.WHITE)
            .setContentTitle(titleText)
            .setContentText(contentText)
            .setStyle(NotificationCompat.BigTextStyle()
                .bigText(bigText)
                .setBigContentTitle(titleText)
                .setSummaryText(remainingTextLong))  // Alt satırda açık metin
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)  // LOW priority - sessiz bildirim
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)  // SERVICE kategorisi - alarm değil
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setShowWhen(false)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setSound(null)  // Ses yok
            .setVibrate(null)  // Titreşim yok
            .build()
        
        android.util.Log.d(TAG, "Notification created successfully")
        return notification
    }

    fun showNotification(context: Context, locationName: String, nextPrayerName: String, remainingSeconds: Int, times: JSONObject) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notification = createNotification(context, locationName, nextPrayerName, remainingSeconds, times)
        notificationManager.notify(NOTIFICATION_ID, notification)
    }
}
