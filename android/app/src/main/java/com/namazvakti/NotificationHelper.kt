package com.namazvakti

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.text.Html
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
                if (existingChannel.importance != NotificationManager.IMPORTANCE_HIGH) {
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
                NotificationManager.IMPORTANCE_HIGH  // IMPORTANCE_HIGH kullan - üstte görünsün
            ).apply {
                description = "Kalıcı namaz vakti bildirimi"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setSound(null, null)
                enableVibration(false)
                enableLights(false)
            }
            notificationManager.createNotificationChannel(channel)
            android.util.Log.d(TAG, "Notification channel created with IMPORTANCE_HIGH")
        }
    }

    fun createNotification(context: Context, locationName: String, nextPrayerName: String, remainingSeconds: Int, times: JSONObject): Notification {
        createNotificationChannel(context)

        android.util.Log.d(TAG, "Creating notification...")

        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)

        // Vakitleri al
        val fajr = times.optString("fajr", "00:00")
        val sun = times.optString("sun", "00:00")
        val dhuhr = times.optString("dhuhr", "00:00")
        val asr = times.optString("asr", "00:00")
        val maghrib = times.optString("maghrib", "00:00")
        val isha = times.optString("isha", "00:00")

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
        val contentText = "$nextPrayerName: $nextPrayerTime"
        val expandedTitle = "$locationName  •  $remainingCounter"
        
        // Genişletilmiş görünüm için tüm vakitler
        // Mevcut vakti belirle (Bir sonraki vakte göre)
        val currentPrayer = when(nextPrayerName) {
            "Güneş" -> "İmsak"
            "Öğle" -> "Güneş"
            "İkindi" -> "Öğle"
            "Akşam" -> "İkindi"
            "Yatsı" -> "Akşam"
            "İmsak" -> "Yatsı"
            else -> ""
        }

        val sb = android.text.SpannableStringBuilder()

        fun appendTime(name: String, time: String, isCurrent: Boolean, isLastInLine: Boolean) {
            val start = sb.length
            // Mevcut vakit ise başına işaret koy
            val text = if (isCurrent) "▶ $name: $time" else "$name: $time"
            sb.append(text)
            val end = sb.length

            if (isCurrent) {
                // Sadece Kalın Font (Renk yok)
                sb.setSpan(android.text.style.StyleSpan(android.graphics.Typeface.BOLD), start, end, android.text.Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
            }

            if (!isLastInLine) {
                sb.append("  •  ")
            }
        }

        appendTime("İmsak", fajr, currentPrayer == "İmsak", false)
        appendTime("Güneş", sun, currentPrayer == "Güneş", false)
        appendTime("Öğle", dhuhr, currentPrayer == "Öğle", true)
        sb.append("\n")
        appendTime("İkindi", asr, currentPrayer == "İkindi", false)
        appendTime("Akşam", maghrib, currentPrayer == "Akşam", false)
        appendTime("Yatsı", isha, currentPrayer == "Yatsı", true)

        val bigTextSpanned = sb

        // Determine small icon based on remaining time
        var smallIconResId = R.mipmap.namazvakti_logo5
        // 61 dakika (3660 saniye) altındaysa geri sayım başlasın
        // Böylece 60. dakikada (3600-3659 sn arası) "60" yazar.
        if (remainingSeconds < 3660) {
            val minutesLeft = remainingSeconds / 60
            val iconName = "ic_stat_notify_$minutesLeft"
            val resId = context.resources.getIdentifier(iconName, "drawable", context.packageName)
            if (resId != 0) {
                smallIconResId = resId
            }
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(smallIconResId)
            .setColor(android.graphics.Color.WHITE)
            .setContentTitle(titleText)
            .setContentText(contentText)
            .setStyle(NotificationCompat.BigTextStyle()
                .bigText(bigTextSpanned)
                .setBigContentTitle(expandedTitle)
                .setSummaryText(remainingTextLong))  // Alt satırda açık metin
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_MAX)  // MAX priority - en üstte görünsün
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)  // SERVICE kategorisi - alarm değil
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setShowWhen(false)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
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
