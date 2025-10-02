package com.example.smartplan

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import jakarta.mail.Authenticator
import jakarta.mail.Message
import jakarta.mail.PasswordAuthentication
import jakarta.mail.Session
import jakarta.mail.Transport
import jakarta.mail.internet.InternetAddress
import jakarta.mail.internet.MimeMessage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Properties

class NotificationWorker(private val context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val taskDescription = inputData.getString("task_description") ?: return@withContext Result.failure()
            val email = inputData.getString("email") ?: return@withContext Result.failure()
            val isDeadline = inputData.getBoolean("is_deadline", false)
            val isConfirmation = inputData.getBoolean("is_confirmation", false)

            createNotificationChannel()

            val notificationTitle: String
            val notificationBody: String
            val emailSubject: String
            val emailBody: String

            if (isConfirmation) {
                val deadline = inputData.getString("deadline") ?: ""
                val reminders = inputData.getStringArray("reminders") ?: emptyArray()

                notificationTitle = "Task Confirmation"
                notificationBody = "A new task has been added: $taskDescription"
                emailSubject = "A new task has been added to your Smartplan"
                emailBody = """
                    <html>
                    <body>
                        <p>A new task has been added to your Smartplan:</p>
                        <p><b>Task:</b><br>$taskDescription</p>
                        <p><b>Deadline:</b><br>$deadline</p>
                        <p><b>Reminders:</b><br>${reminders.joinToString("<br>")}</p>
                        <p>Thank you for using Smartplan!</p>
                    </body>
                    </html>
                """.trimIndent()
            } else {
                notificationTitle = if (isDeadline) "Task Deadline" else "Task Reminder"
                notificationBody = "Your task is due: $taskDescription"
                emailSubject = notificationTitle
                emailBody = notificationBody
            }

            val notification = NotificationCompat.Builder(context, "smartplan_channel")
                .setContentTitle(notificationTitle)
                .setContentText(notificationBody)
                .setSmallIcon(R.drawable.ic_notification)
                .build()

            if (ActivityCompat.checkSelfPermission(
                    context,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                return@withContext Result.failure()
            }
            NotificationManagerCompat.from(context).notify(System.currentTimeMillis().toInt(), notification)

            sendEmail(email, emailSubject, emailBody)

            Result.success()
        } catch (e: Exception) {
            Result.failure()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Smartplan Reminders"
            val descriptionText = "Channel for Smartplan reminders and notifications"
            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel("smartplan_channel", name, importance).apply {
                description = descriptionText
            }
            val notificationManager: NotificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun sendEmail(recipient: String, subject: String, body: String) {
        val properties = Properties().apply {
            put("mail.smtp.host", "smtp.gmail.com")
            put("mail.smtp.port", "587")
            put("mail.smtp.auth", "true")
            put("mail.smtp.starttls.enable", "true")
        }

        val session = Session.getInstance(properties, object : Authenticator() {
            override fun getPasswordAuthentication(): PasswordAuthentication {
                return PasswordAuthentication("abcd20050625@gmail.com", "fosx icrl xbxo mkdc")
            }
        })

        val message = MimeMessage(session).apply {
            setFrom(InternetAddress("abcd20050625@gmail.com", "Smartplan"))
            addRecipient(Message.RecipientType.TO, InternetAddress(recipient))
            this.subject = subject
            setContent(body, "text/html; charset=utf-8")
        }

        Transport.send(message)
    }
}