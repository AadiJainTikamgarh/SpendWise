package expo.modules.smsreader

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoSmsReaderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoSmsReader")

    AsyncFunction("hasPermissionsAsync") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.READ_SMS
      ) == PackageManager.PERMISSION_GRANTED
    }

    AsyncFunction("isNotificationListenerEnabledAsync") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      val enabledPackages = NotificationManagerCompat.getEnabledListenerPackages(context)
      enabledPackages.contains(context.packageName)
    }

    AsyncFunction("openNotificationListenerSettingsAsync") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      try {
        val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS").apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        true
      } catch (e: Exception) {
        false
      }
    }

    AsyncFunction("isNotificationListenerPausedAsync") {
      SpendWiseNotificationListenerService.isPaused()
    }

    AsyncFunction("setNotificationListenerPausedAsync") { paused: Boolean ->
      SpendWiseNotificationListenerService.setPaused(paused)
      true
    }

    AsyncFunction("getActivePaymentNotificationsAsync") {
      SpendWiseNotificationListenerService.getActivePaymentNotifications()
    }

    AsyncFunction("getRecentPaymentNotificationsAsync") {
      SpendWiseNotificationListenerService.getCapturedNotifications()
    }

    AsyncFunction("clearPaymentNotificationsAsync") {
      SpendWiseNotificationListenerService.clearCapturedNotifications()
      true
    }

    AsyncFunction("readSmsAsync") { options: Map<String, Any?> ->
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any>>()
      val maxCount = (options["maxCount"] as? Number)?.toInt() ?: 100
      val minDate = (options["minDate"] as? Number)?.toLong() ?: 0L

      val smsList = mutableListOf<Map<String, Any>>()
      val projection = arrayOf("_id", "address", "body", "date")
      val selection = if (minDate > 0) "date >= ?" else null
      val selectionArgs = if (minDate > 0) arrayOf(minDate.toString()) else null
      val sortOrder = "date DESC"

      // Query inbox first
      var uri = Uri.parse("content://sms/inbox")
      var cursor = try {
        context.contentResolver.query(
          uri,
          projection,
          selection,
          selectionArgs,
          sortOrder
        )
      } catch (e: Exception) {
        null
      }

      // Fallback to content://sms if inbox returned null
      if (cursor == null) {
        uri = Uri.parse("content://sms")
        cursor = try {
          context.contentResolver.query(
            uri,
            projection,
            selection,
            selectionArgs,
            sortOrder
          )
        } catch (e: Exception) {
          null
        }
      }

      cursor?.use {
        val idIndex = it.getColumnIndex("_id")
        val addressIndex = it.getColumnIndex("address")
        val bodyIndex = it.getColumnIndex("body")
        val dateIndex = it.getColumnIndex("date")

        while (it.moveToNext() && smsList.size < maxCount) {
          val id = if (idIndex != -1) it.getString(idIndex) ?: "" else ""
          val address = if (addressIndex != -1) it.getString(addressIndex) ?: "" else ""
          val body = if (bodyIndex != -1) it.getString(bodyIndex) ?: "" else ""
          val date = if (dateIndex != -1) it.getLong(dateIndex) else 0L

          smsList.add(
            mapOf(
              "id" to id,
              "address" to address,
              "body" to body,
              "date" to date
            )
          )
        }
      }

      smsList
    }
  }
}
