package com.namazvakti

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import org.json.JSONObject
import java.util.*

class PrayerTimesService : Service() {

    private val handler = Handler(Looper.getMainLooper())
    private var updateRunnable: Runnable? = null
    private var lastPrayerName: String = ""

    companion object {
        private const val NOTIFICATION_ID = 1001
        private const val TAG = "PrayerTimesService"
        private const val UPDATE_INTERVAL = 1000L // Her saniye güncelle
        
        fun startService(context: Context) {
            android.util.Log.d(TAG, "startService called")
            val intent = Intent(context, PrayerTimesService::class.java)
            try {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    android.util.Log.d(TAG, "Starting foreground service (API >= O)")
                    context.startForegroundService(intent)
                } else {
                    android.util.Log.d(TAG, "Starting service (API < O)")
                    context.startService(intent)
                }
            } catch (e: Exception) {
                android.util.Log.e(TAG, "Failed to start service", e)
            }
        }
        
        fun stopService(context: Context) {
            val intent = Intent(context, PrayerTimesService::class.java)
            context.stopService(intent)
        }
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onCreate() {
        super.onCreate()
        android.util.Log.d(TAG, "Service onCreate")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        android.util.Log.d(TAG, "onStartCommand called")
        
        // Önce bir bildirim göster (foreground service için gerekli)
        showInitialNotification()
        
        // Periyodik güncellemeyi başlat
        startPeriodicUpdate()

        return START_STICKY
    }

    private fun showInitialNotification() {
        try {
            NotificationHelper.createNotificationChannel(this)
            val notification = androidx.core.app.NotificationCompat.Builder(this, "prayer_times_channel")
                .setSmallIcon(R.mipmap.namazvakti_logo5)
                .setColor(android.graphics.Color.WHITE)
                .setContentTitle("Namaz Vakitleri")
                .setContentText("Yükleniyor...")
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_LOW)  // LOW priority
                .setOngoing(true)
                .setSilent(true)  // Sessiz
                .setOnlyAlertOnce(true)  // Sadece bir kez bildirim
                .build()
            startForeground(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Failed to show initial notification", e)
        }
    }

    private fun startPeriodicUpdate() {
        updateRunnable?.let { handler.removeCallbacks(it) }
        
        updateRunnable = object : Runnable {
            override fun run() {
                updateNotification()
                handler.postDelayed(this, UPDATE_INTERVAL)
            }
        }
        
        handler.post(updateRunnable!!)
    }

    private fun updateNotification() {
        val prefs: SharedPreferences = getSharedPreferences("WidgetData", Context.MODE_PRIVATE)
        val prayerTimesJsonSingle = prefs.getString("prayerTimes", null)
        val monthlyJsonRaw = prefs.getString("monthlyPrayerTimes", null)
        val locationName = prefs.getString("locationName", "Konum Seçilmedi") ?: "Konum Seçilmedi"

        // Determine which data to use: prefer monthly cache for correct day rollover
        var effectiveTimes: JSONObject? = null
        var timezoneIdFromMonthly: String? = null

        if (monthlyJsonRaw != null) {
            try {
                val monthlyObj = JSONObject(monthlyJsonRaw)
                timezoneIdFromMonthly = monthlyObj.optString("timezoneId", null)

                // Pick today's item by date in that timezone
                val tzId = timezoneIdFromMonthly ?: TimeZone.getDefault().id
                val tz = TimeZone.getTimeZone(tzId)
                val cal = Calendar.getInstance(tz)
                val y = cal.get(Calendar.YEAR)
                val m = cal.get(Calendar.MONTH) + 1
                val d = cal.get(Calendar.DAY_OF_MONTH)
                val todayStr = String.format(Locale.US, "%04d-%02d-%02d", y, m, d)

                val days = monthlyObj.optJSONArray("days")
                if (days != null) {
                    for (i in 0 until days.length()) {
                        val dayObj = days.optJSONObject(i)
                        if (dayObj != null && todayStr == dayObj.optString("date")) {
                            // Normalize to expected notification schema
                            effectiveTimes = JSONObject().apply {
                                put("fajr", dayObj.optString("fajr"))
                                put("sun", dayObj.optString("sun"))
                                put("dhuhr", dayObj.optString("dhuhr"))
                                put("asr", dayObj.optString("asr"))
                                put("maghrib", dayObj.optString("maghrib"))
                                put("isha", dayObj.optString("isha"))
                                put("timezoneId", tzId)
                                put("country", monthlyObj.optString("country", ""))
                                put("city", monthlyObj.optString("city", ""))
                                put("district", monthlyObj.optString("district", ""))
                            }
                            break
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e(TAG, "Failed to parse monthly notification cache", e)
            }
        }

        // Fallback to single-day payload if monthly not available or today's not found
        if (effectiveTimes == null && prayerTimesJsonSingle != null) {
            try {
                effectiveTimes = JSONObject(prayerTimesJsonSingle)
            } catch (_: Exception) {}
        }

        if (effectiveTimes != null) {
            try {
                val times = effectiveTimes
                val fajr = times.getString("fajr")
                val sun = times.getString("sun")
                val dhuhr = times.getString("dhuhr")
                val asr = times.getString("asr")
                val maghrib = times.getString("maghrib")
                val isha = times.getString("isha")

                val country = times.optString("country", "")
                val city = times.optString("city", "")
                val district = times.optString("district", "")

                val fullLocation = if (country.isNotEmpty() && city.isNotEmpty()) {
                    if (district.isNotEmpty() && district != city) {
                        "$district, $city"
                    } else {
                        city
                    }
                } else {
                    locationName
                }

                val timezoneId = times.optString("timezoneId", timezoneIdFromMonthly ?: TimeZone.getDefault().id)
                val timeZone = TimeZone.getTimeZone(timezoneId)

                val now = Calendar.getInstance(timeZone)
                val currentTimeSeconds = now.get(Calendar.HOUR_OF_DAY) * 3600 + 
                                        now.get(Calendar.MINUTE) * 60 + 
                                        now.get(Calendar.SECOND)

                val timeMap = mapOf(
                    "fajr" to parseTimeToSeconds(fajr),
                    "sun" to parseTimeToSeconds(sun),
                    "dhuhr" to parseTimeToSeconds(dhuhr),
                    "asr" to parseTimeToSeconds(asr),
                    "maghrib" to parseTimeToSeconds(maghrib),
                    "isha" to parseTimeToSeconds(isha)
                )

                var nextPrayerName = ""
                var nextPrayerTimeSeconds = 0

                when {
                    currentTimeSeconds < timeMap["fajr"]!! -> {
                        nextPrayerName = "İmsak"
                        nextPrayerTimeSeconds = timeMap["fajr"]!!
                    }
                    currentTimeSeconds < timeMap["sun"]!! -> {
                        nextPrayerName = "Güneş"
                        nextPrayerTimeSeconds = timeMap["sun"]!!
                    }
                    currentTimeSeconds < timeMap["dhuhr"]!! -> {
                        nextPrayerName = "Öğle"
                        nextPrayerTimeSeconds = timeMap["dhuhr"]!!
                    }
                    currentTimeSeconds < timeMap["asr"]!! -> {
                        nextPrayerName = "İkindi"
                        nextPrayerTimeSeconds = timeMap["asr"]!!
                    }
                    currentTimeSeconds < timeMap["maghrib"]!! -> {
                        nextPrayerName = "Akşam"
                        nextPrayerTimeSeconds = timeMap["maghrib"]!!
                    }
                    currentTimeSeconds < timeMap["isha"]!! -> {
                        nextPrayerName = "Yatsı"
                        nextPrayerTimeSeconds = timeMap["isha"]!!
                    }
                    else -> {
                        // Yatsı geçti, yarının imsak vaktine
                        nextPrayerName = "İmsak"
                        nextPrayerTimeSeconds = timeMap["fajr"]!! + 24 * 3600
                    }
                }

                // Vakit değiştiyse widget'ı da güncelle
                if (lastPrayerName.isNotEmpty() && lastPrayerName != nextPrayerName) {
                    android.util.Log.d(TAG, "Prayer time changed from $lastPrayerName to $nextPrayerName, updating widget")
                    // Widget'ı güncelle
                    val widgetIntent = Intent(this, PrayerTimesWidget::class.java)
                    widgetIntent.action = "com.namazvakti.UPDATE_WIDGET"
                    sendBroadcast(widgetIntent)
                }
                lastPrayerName = nextPrayerName

                // Kalan süreyi hesapla (saniye cinsinden)
                val remainingSeconds = nextPrayerTimeSeconds - currentTimeSeconds
                
                val notification = NotificationHelper.createNotification(
                    this,
                    fullLocation,
                    nextPrayerName,
                    remainingSeconds,
                    times
                )

                val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
                notificationManager.notify(NOTIFICATION_ID, notification)

            } catch (e: Exception) {
                android.util.Log.e(TAG, "Error updating notification", e)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        updateRunnable?.let { handler.removeCallbacks(it) }
        android.util.Log.d(TAG, "Service destroyed")
    }

    private fun parseTimeToSeconds(timeStr: String): Int {
        val parts = timeStr.split(":")
        return parts[0].toInt() * 3600 + parts[1].toInt() * 60
    }
}
