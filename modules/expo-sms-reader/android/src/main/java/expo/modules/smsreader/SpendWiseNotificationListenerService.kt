package expo.modules.smsreader

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import java.util.concurrent.CopyOnWriteArrayList

class SpendWiseNotificationListenerService : NotificationListenerService() {

  companion object {
    private var instance: SpendWiseNotificationListenerService? = null
    const val CHANNEL_ID = "spendwise_upi_listener"
    const val NOTIFICATION_ID = 9812
    const val ACTION_PAUSE = "expo.modules.smsreader.ACTION_PAUSE"
    const val ACTION_RESUME = "expo.modules.smsreader.ACTION_RESUME"

    @Volatile
    private var isPaused = false

    fun isPaused(): Boolean = isPaused

    fun setPaused(paused: Boolean) {
      isPaused = paused
      instance?.updateControlNotification()
    }

    // Recognized Indian UPI and banking app package identifiers
    val FINANCIAL_PACKAGES = setOf(
      "com.phonepe.app",                                // PhonePe
      "com.google.android.apps.nbu.paisa.user",          // Google Pay
      "net.one97.paytm",                                 // Paytm
      "com.cred.app",                                   // CRED
      "in.org.npci.upiapp",                             // BHIM UPI
      "in.amazon.mShop.android.shopping",               // Amazon Pay
      "com.sbi.lotusintouch",                           // YONO SBI
      "com.csam.icici.bank.imobile",                    // iMobile ICICI
      "com.snapwork.hdfc",                              // HDFC Bank
      "com.msf.kbank.mobile",                           // Kotak Mobile
      "com.axis.mobile",                                // Axis Mobile
      "com.pnb.pnbone",                                 // PNB ONE
      "com.bankofbaroda.mconnect",                      // bob World
      "com.canarabank.ai1"                              // Canara ai1
    )

    private val capturedNotifications = CopyOnWriteArrayList<Map<String, Any>>()

    fun isServiceConnected(): Boolean = instance != null

    fun getCapturedNotifications(): List<Map<String, Any>> {
      return ArrayList(capturedNotifications)
    }

    fun clearCapturedNotifications() {
      capturedNotifications.clear()
    }

    fun getActivePaymentNotifications(): List<Map<String, Any>> {
      val inst = instance ?: return emptyList()
      val list = mutableListOf<Map<String, Any>>()
      try {
        val active = inst.activeNotifications ?: return emptyList()
        for (sbn in active) {
          val pkg = sbn.packageName ?: ""
          if (FINANCIAL_PACKAGES.contains(pkg)) {
            val item = parseStatusBarNotification(sbn)
            if (item != null) {
              list.add(item)
            }
          }
        }
      } catch (_: Exception) {}
      return list
    }

    private fun parseStatusBarNotification(sbn: StatusBarNotification): Map<String, Any>? {
      val notification = sbn.notification ?: return null
      val extras = notification.extras ?: return null
      val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
      val text = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
        ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
        ?: ""

      if (title.isBlank() && text.isBlank()) {
        return null
      }

      val pkg = sbn.packageName ?: ""
      val id = "notif_${pkg}_${sbn.id}_${sbn.postTime}"

      return mapOf(
        "id" to id,
        "packageName" to pkg,
        "title" to title,
        "text" to text,
        "timestamp" to sbn.postTime
      )
    }
  }

  private val controlReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      when (intent?.action) {
        ACTION_PAUSE -> setPaused(true)
        ACTION_RESUME -> setPaused(false)
      }
    }
  }

  override fun onListenerConnected() {
    super.onListenerConnected()
    instance = this
    registerControlReceiver()
    createNotificationChannel()
    updateControlNotification()
  }

  override fun onListenerDisconnected() {
    super.onListenerDisconnected()
    unregisterControlReceiver()
    if (instance == this) {
      instance = null
    }
  }

  override fun onDestroy() {
    super.onDestroy()
    unregisterControlReceiver()
    if (instance == this) {
      instance = null
    }
  }

  private fun registerControlReceiver() {
    val filter = IntentFilter().apply {
      addAction(ACTION_PAUSE)
      addAction(ACTION_RESUME)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(controlReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      registerReceiver(controlReceiver, filter)
    }
  }

  private fun unregisterControlReceiver() {
    try {
      unregisterReceiver(controlReceiver)
    } catch (_: Exception) {}
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "SpendWise UPI Payment Tracker",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Controls and status for real-time UPI payment tracking"
        setShowBadge(false)
      }
      val manager = getSystemService(NotificationManager::class.java)
      manager?.createNotificationChannel(channel)
    }
  }

  fun updateControlNotification() {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }

    val actionIntent = if (isPaused) {
      Intent(ACTION_RESUME).setPackage(packageName)
    } else {
      Intent(ACTION_PAUSE).setPackage(packageName)
    }

    val pendingAction = PendingIntent.getBroadcast(
      this,
      if (isPaused) 101 else 102,
      actionIntent,
      flags
    )

    val actionTitle = if (isPaused) "▶ Resume Sync" else "⏸ Pause Sync"
    val contentTitle = if (isPaused) "SpendWise UPI Tracker (Paused)" else "SpendWise UPI Tracker (Active)"
    val contentText = if (isPaused) {
      "Auto-sync is paused. Tap Resume to start tracking payments."
    } else {
      "Listening for UPI payments from PhonePe, GPay, Paytm..."
    }

    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(contentTitle)
      .setContentText(contentText)
      .setSmallIcon(android.R.drawable.stat_notify_sync)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .addAction(android.R.drawable.ic_media_pause, actionTitle, pendingAction)
      .build()

    manager.notify(NOTIFICATION_ID, notification)
  }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    if (sbn == null || isPaused) return
    val pkg = sbn.packageName ?: return

    // Quick filter: only process payment/banking app packages
    if (!FINANCIAL_PACKAGES.contains(pkg)) {
      return
    }

    val item = parseStatusBarNotification(sbn) ?: return

    // Keep up to 100 latest notifications in memory
    if (capturedNotifications.size >= 100) {
      capturedNotifications.removeAt(0)
    }
    capturedNotifications.add(item)
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification?) {
    // No-op
  }
}
