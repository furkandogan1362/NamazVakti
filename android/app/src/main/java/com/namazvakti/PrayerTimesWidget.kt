package com.namazvakti

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.SharedPreferences
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.*
import android.graphics.Color
import android.content.ComponentName
import android.content.Intent
import android.app.PendingIntent
import android.os.SystemClock
import android.app.AlarmManager

class PrayerTimesWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
        // Her dakika widget'ı güncellemek için alarm kur
        scheduleNextUpdate(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == "com.namazvakti.UPDATE_WIDGET" || intent.action == "com.namazvakti.WIDGET_UPDATE_ALARM") {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisAppWidget = ComponentName(context.packageName, PrayerTimesWidget::class.java.name)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(thisAppWidget)
            for (appWidgetId in appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId)
            }
            // Sonraki güncellemeyi planla
            if (appWidgetIds.isNotEmpty()) {
                scheduleNextUpdate(context)
            }
        }
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        scheduleNextUpdate(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        cancelScheduledUpdate(context)
    }

    private fun scheduleNextUpdate(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, PrayerTimesWidget::class.java).apply {
            action = "com.namazvakti.WIDGET_UPDATE_ALARM"
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // 1 dakika sonra tekrar güncelle
        val triggerTime = System.currentTimeMillis() + 60 * 1000
        
        try {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerTime,
                pendingIntent
            )
        } catch (e: Exception) {
            // Fallback to inexact alarm
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
        }
    }

    private fun cancelScheduledUpdate(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, PrayerTimesWidget::class.java).apply {
            action = "com.namazvakti.WIDGET_UPDATE_ALARM"
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.cancel(pendingIntent)
    }

    companion object {
        private const val TAG = "PrayerTimesWidget"

        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val prefs: SharedPreferences = context.getSharedPreferences("WidgetData", Context.MODE_PRIVATE)
            val prayerTimesJsonSingle = prefs.getString("prayerTimes", null)
            val monthlyJsonRaw = prefs.getString("monthlyPrayerTimes", null)
            val locationName = prefs.getString("locationName", "Konum Seçilmedi") ?: "Konum Seçilmedi"

            val views = RemoteViews(context.packageName, R.layout.widget_prayer_times)
            
            // Open App on Click
            val intent = Intent(context, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.header_container, pendingIntent)

            // Determine which data to use: prefer monthly cache for correct day rollover
            var effectiveTimes: JSONObject? = null
            var timezoneIdFromMonthly: String? = null

            if (monthlyJsonRaw != null) {
                try {
                    val monthlyObj = JSONObject(monthlyJsonRaw)
                    timezoneIdFromMonthly = monthlyObj.optString("timezoneId", null)

                    // Location override from monthly meta if present
                    val country = monthlyObj.optString("country", "")
                    val city = monthlyObj.optString("city", "")
                    val district = monthlyObj.optString("district", "")
                    val fullLocation = if (country.isNotEmpty() && city.isNotEmpty()) {
                        if (district.isNotEmpty() && district != city) {
                            "$country, $city, $district"
                        } else {
                            "$country, $city"
                        }
                    } else {
                        locationName
                    }
                    views.setTextViewText(R.id.location_text, fullLocation)

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
                                // Normalize to expected widget schema
                                effectiveTimes = JSONObject().apply {
                                    put("fajr", dayObj.optString("fajr"))
                                    put("sun", dayObj.optString("sun"))
                                    put("dhuhr", dayObj.optString("dhuhr"))
                                    put("asr", dayObj.optString("asr"))
                                    put("maghrib", dayObj.optString("maghrib"))
                                    put("isha", dayObj.optString("isha"))
                                    put("timezoneId", tzId)
                                    put("country", country)
                                    put("city", city)
                                    put("district", district)
                                }
                                break
                            }
                        }
                    }
                } catch (e: Exception) {
                    android.util.Log.e(TAG, "Failed to parse monthly widget cache", e)
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

                    // Location was already set above for monthly; for single-day ensure it's set
                    if (monthlyJsonRaw == null) {
                        val country = times.optString("country", "")
                        val city = times.optString("city", "")
                        val district = times.optString("district", "")
                        val fullLocation = if (country.isNotEmpty() && city.isNotEmpty()) {
                            if (district.isNotEmpty() && district != city) {
                                "$country, $city, $district"
                            } else {
                                "$country, $city"
                            }
                        } else {
                            locationName
                        }
                        views.setTextViewText(R.id.location_text, fullLocation)
                    }

                    views.setTextViewText(R.id.fajr_time, fajr)
                    views.setTextViewText(R.id.sun_time, sun)
                    views.setTextViewText(R.id.dhuhr_time, dhuhr)
                    views.setTextViewText(R.id.asr_time, asr)
                    views.setTextViewText(R.id.maghrib_time, maghrib)
                    views.setTextViewText(R.id.isha_time, isha)

                    // Get Timezone ID from JSON (e.g. "Europe/Istanbul")
                    // Default to device timezone if not provided
                    val timezoneId = times.optString("timezoneId", timezoneIdFromMonthly ?: TimeZone.getDefault().id)
                    val timeZone = TimeZone.getTimeZone(timezoneId)
                    
                    // Get Current Time in that Timezone
                    val now = Calendar.getInstance(timeZone)
                    val currentTimeMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
                    val currentTimeSeconds = now.get(Calendar.SECOND)

                    val timeMap = mapOf(
                        "fajr" to parseTime(fajr),
                        "sun" to parseTime(sun),
                        "dhuhr" to parseTime(dhuhr),
                        "asr" to parseTime(asr),
                        "maghrib" to parseTime(maghrib),
                        "isha" to parseTime(isha)
                    )

                    var nextPrayerName = ""
                    var nextPrayerTimeMinutes = 0
                    var highlightedPrayerId = 0

                    // Reset backgrounds
                    views.setInt(R.id.fajr_container, "setBackgroundResource", R.drawable.widget_item_background)
                    views.setInt(R.id.sun_container, "setBackgroundResource", R.drawable.widget_item_background)
                    views.setInt(R.id.dhuhr_container, "setBackgroundResource", R.drawable.widget_item_background)
                    views.setInt(R.id.asr_container, "setBackgroundResource", R.drawable.widget_item_background)
                    views.setInt(R.id.maghrib_container, "setBackgroundResource", R.drawable.widget_item_background)
                    views.setInt(R.id.isha_container, "setBackgroundResource", R.drawable.widget_item_background)

                    // Logic to find next prayer using Location Time
                    // Mevcut vakit (saati giren vakit) vurgulanacak, bir sonraki vakit için geri sayım
                    when {
                        currentTimeMinutes < timeMap["fajr"]!! -> {
                            // Gece yarısından imsak'a kadar: Yatsı vakti içindeyiz, imsak'a sayıyoruz
                            nextPrayerName = "İmsak"
                            nextPrayerTimeMinutes = timeMap["fajr"]!!
                            highlightedPrayerId = R.id.isha_container // Yatsı vakti içindeyiz
                        }
                        currentTimeMinutes < timeMap["sun"]!! -> {
                            // İmsak'tan güneş'e kadar: İmsak vakti içindeyiz
                            nextPrayerName = "Güneş"
                            nextPrayerTimeMinutes = timeMap["sun"]!!
                            highlightedPrayerId = R.id.fajr_container // İmsak vakti içindeyiz
                        }
                        currentTimeMinutes < timeMap["dhuhr"]!! -> {
                            // Güneş'ten öğle'ye kadar: Güneş vakti içindeyiz
                            nextPrayerName = "Öğle"
                            nextPrayerTimeMinutes = timeMap["dhuhr"]!!
                            highlightedPrayerId = R.id.sun_container // Güneş vakti içindeyiz
                        }
                        currentTimeMinutes < timeMap["asr"]!! -> {
                            // Öğle'den ikindi'ye kadar: Öğle vakti içindeyiz
                            nextPrayerName = "İkindi"
                            nextPrayerTimeMinutes = timeMap["asr"]!!
                            highlightedPrayerId = R.id.dhuhr_container // Öğle vakti içindeyiz
                        }
                        currentTimeMinutes < timeMap["maghrib"]!! -> {
                            // İkindi'den akşam'a kadar: İkindi vakti içindeyiz
                            nextPrayerName = "Akşam"
                            nextPrayerTimeMinutes = timeMap["maghrib"]!!
                            highlightedPrayerId = R.id.asr_container // İkindi vakti içindeyiz
                        }
                        currentTimeMinutes < timeMap["isha"]!! -> {
                            // Akşam'dan yatsı'ya kadar: Akşam vakti içindeyiz
                            nextPrayerName = "Yatsı"
                            nextPrayerTimeMinutes = timeMap["isha"]!!
                            highlightedPrayerId = R.id.maghrib_container // Akşam vakti içindeyiz
                        }
                        else -> {
                            // Yatsı'dan gece yarısına kadar: Yatsı vakti içindeyiz, yarının imsak'ına sayıyoruz
                            nextPrayerName = "İmsak"
                            nextPrayerTimeMinutes = timeMap["fajr"]!! + 24 * 60 
                            highlightedPrayerId = R.id.isha_container // Yatsı vakti içindeyiz
                        }
                    }

                    // Highlight next prayer
                    if (highlightedPrayerId != 0) {
                         views.setInt(highlightedPrayerId, "setBackgroundResource", R.drawable.widget_item_background_active)
                    }

                    views.setTextViewText(R.id.next_prayer_name, "$nextPrayerName vaktine kalan")

                    // Chronometer Logic for Real-time Countdown
                    // 1. Create a Calendar for the Target Time in the Location's Timezone
                    val targetCalendar = Calendar.getInstance(timeZone)
                    val targetHour = nextPrayerTimeMinutes / 60
                    val targetMinute = nextPrayerTimeMinutes % 60
                    
                    // Handle day overflow (yarının imsaki)
                    if (nextPrayerTimeMinutes >= 24 * 60) {
                        targetCalendar.add(Calendar.DAY_OF_YEAR, 1)
                        targetCalendar.set(Calendar.HOUR_OF_DAY, targetHour - 24)
                    } else {
                        targetCalendar.set(Calendar.HOUR_OF_DAY, targetHour)
                    }
                    targetCalendar.set(Calendar.MINUTE, targetMinute)
                    targetCalendar.set(Calendar.SECOND, 0)
                    targetCalendar.set(Calendar.MILLISECOND, 0)
                    
                    // 2. Get the absolute time in millis (UTC)
                    val targetTimeMillis = targetCalendar.timeInMillis
                    
                    // 3. Calculate Chronometer Base
                    val currentTimeMillis = System.currentTimeMillis()
                    
                    // Eğer hedef zaman geçmişse (negatif sayaç), widget'ı bir sonraki vakitle güncelle
                    val remainingMillis = targetTimeMillis - currentTimeMillis
                    if (remainingMillis <= 0) {
                        android.util.Log.d(TAG, "Target time passed, remaining: $remainingMillis ms, triggering update")
                        // Widget zaten güncel verilerle çağrılmış olmalı
                        // Bir sonraki vakit hesabı yukarıda zaten yapılıyor
                    }
                    
                    val elapsedRealtimeOffset = SystemClock.elapsedRealtime() - currentTimeMillis
                    val chronometerBase = targetTimeMillis + elapsedRealtimeOffset
                    
                    views.setChronometer(R.id.countdown_chronometer, chronometerBase, null, true)
                    views.setChronometerCountDown(R.id.countdown_chronometer, true)

                    // Start/Update foreground service for persistent notification
                    PrayerTimesService.startService(context)

                } catch (e: Exception) {
                    android.util.Log.e(TAG, "Error updating widget", e)
                    e.printStackTrace()
                }
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun parseTime(timeStr: String): Int {
            val parts = timeStr.split(":")
            return parts[0].toInt() * 60 + parts[1].toInt()
        }
    }
}
