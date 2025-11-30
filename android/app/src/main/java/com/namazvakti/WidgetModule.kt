package com.namazvakti

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*

class WidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val context: Context = reactContext

    override fun getName(): String {
        return "WidgetModule"
    }

    @ReactMethod
    fun updateWidgetData(locationName: String, prayerTimesJson: String) {
        val prefs: SharedPreferences = context.getSharedPreferences("WidgetData", Context.MODE_PRIVATE)
        val editor = prefs.edit()
        editor.putString("locationName", locationName)
        editor.putString("prayerTimes", prayerTimesJson)
        editor.apply()

        // Trigger widget update
        val intent = Intent(context, PrayerTimesWidget::class.java)
        intent.action = "com.namazvakti.UPDATE_WIDGET"
        context.sendBroadcast(intent)

        // Start/Update foreground service for persistent notification
        PrayerTimesService.startService(context)
    }

    @ReactMethod
    fun requestBatteryOptimizationPermission() {
        android.util.Log.d("WidgetModule", "Requesting Battery Optimization Permission")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                // Always open battery optimization settings
                val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
            } catch (e: Exception) {
                // Fallback to app info
                try {
                    val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                    intent.data = Uri.parse("package:${context.packageName}")
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    context.startActivity(intent)
                } catch (e2: Exception) {
                    android.util.Log.e("WidgetModule", "Failed to open settings", e2)
                }
            }
        }
    }

    @ReactMethod
    fun requestOverlayPermission() {
        android.util.Log.d("WidgetModule", "Requesting Overlay Permission")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
            } catch (e: Exception) {
                android.util.Log.e("WidgetModule", "Failed to open overlay settings", e)
            }
        }
    }

    @ReactMethod
    fun requestNotificationPermission() {
        android.util.Log.d("WidgetModule", "Requesting Notification Permission")
        try {
            // MIUI için özel bildirim ayarları
            val miuiIntent = Intent("miui.intent.action.APP_PERM_EDITOR")
            miuiIntent.setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity")
            miuiIntent.putExtra("extra_pkgname", context.packageName)
            miuiIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            
            try {
                context.startActivity(miuiIntent)
                return
            } catch (e: Exception) {
                android.util.Log.d("WidgetModule", "MIUI intent failed, trying standard")
            }
            
            // Standart bildirim ayarları
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
            } else {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                intent.data = Uri.parse("package:${context.packageName}")
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
            }
        } catch (e: Exception) {
            android.util.Log.e("WidgetModule", "Failed to open notification settings", e)
            // Fallback
            try {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                intent.data = Uri.parse("package:${context.packageName}")
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
            } catch (e2: Exception) {
                android.util.Log.e("WidgetModule", "Failed to open app settings", e2)
            }
        }
    }
    
    @ReactMethod
    fun openLockScreenNotificationSettings() {
        android.util.Log.d("WidgetModule", "Opening Lock Screen Notification Settings")
        try {
            // MIUI kilit ekranı bildirim ayarları
            val miuiLockIntent = Intent()
            miuiLockIntent.setClassName("com.android.settings", "com.android.settings.Settings\$StatusBarNotificationSettingsActivity")
            miuiLockIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            
            try {
                context.startActivity(miuiLockIntent)
                return
            } catch (e: Exception) {
                android.util.Log.d("WidgetModule", "MIUI lock screen intent failed")
            }
            
            // Standart kilit ekranı ayarları
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
        } catch (e: Exception) {
            android.util.Log.e("WidgetModule", "Failed to open lock screen settings", e)
            try {
                val intent = Intent(Settings.ACTION_SETTINGS)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
            } catch (e2: Exception) {
                android.util.Log.e("WidgetModule", "Failed to open settings", e2)
            }
        }
    }

    @ReactMethod
    fun openAutoStartSettings() {
        android.util.Log.d("WidgetModule", "Opening Auto Start Settings")
        // This is manufacturer specific, trying common ones
        val intents = arrayOf(
            // Xiaomi MIUI
            Intent().setComponent(android.content.ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")),
            // Xiaomi MIUI alternative
            Intent().setComponent(android.content.ComponentName("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity")),
            // LeTV
            Intent().setComponent(android.content.ComponentName("com.letv.android.letvsafe", "com.letv.android.letvsafe.AutobootManageActivity")),
            // Huawei
            Intent().setComponent(android.content.ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity")),
            Intent().setComponent(android.content.ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")),
            // Oppo
            Intent().setComponent(android.content.ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")),
            Intent().setComponent(android.content.ComponentName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity")),
            // Vivo
            Intent().setComponent(android.content.ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity")),
            Intent().setComponent(android.content.ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager")),
            Intent().setComponent(android.content.ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")),
            // Samsung
            Intent().setComponent(android.content.ComponentName("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity")),
            // OnePlus
            Intent().setComponent(android.content.ComponentName("com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity"))
        )

        var opened = false
        for (intent in intents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                opened = true
                break
            } catch (e: Exception) {
                // Try next
            }
        }

        // If no manufacturer specific setting found, open app info
        if (!opened) {
            try {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                intent.data = Uri.parse("package:${context.packageName}")
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
            } catch (e: Exception) {
                android.util.Log.e("WidgetModule", "Failed to open settings", e)
            }
        }
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        val result = Arguments.createMap()
        
        // Battery Optimization
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            result.putBoolean("batteryOptimization", pm.isIgnoringBatteryOptimizations(context.packageName))
        } else {
            result.putBoolean("batteryOptimization", true)
        }

        // Overlay Permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            result.putBoolean("overlay", Settings.canDrawOverlays(context))
        } else {
            result.putBoolean("overlay", true)
        }

        // Notification Permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            result.putBoolean("notification", ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)
        } else {
            result.putBoolean("notification", true)
        }

        promise.resolve(result)
    }

    @ReactMethod
    fun startNotificationService() {
        android.util.Log.d("WidgetModule", "startNotificationService called from React Native")
        try {
            PrayerTimesService.startService(context)
            android.util.Log.d("WidgetModule", "startNotificationService completed")
        } catch (e: Exception) {
            android.util.Log.e("WidgetModule", "Failed to start notification service", e)
        }
    }

    @ReactMethod
    fun stopNotificationService() {
        PrayerTimesService.stopService(context)
    }
}
