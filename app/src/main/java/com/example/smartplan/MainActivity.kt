package com.example.smartplan

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.kizitonwose.calendar.core.CalendarDay
import com.kizitonwose.calendar.core.firstDayOfWeekFromLocale
import com.kizitonwose.calendar.view.CalendarView
import com.kizitonwose.calendar.view.MonthDayBinder
import com.kizitonwose.calendar.view.ViewContainer
import java.text.SimpleDateFormat
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    private lateinit var recyclerView: RecyclerView
    private lateinit var taskAdapter: TaskAdapter
    private val tasks = mutableListOf<Task>()
    private val calendarTasks = mutableMapOf<Date, List<Task>>()

    private val requestPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted: Boolean ->
            if (!isGranted) {
                Toast.makeText(this, "Notifications permission denied. You will not receive reminders.", Toast.LENGTH_LONG).show()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val toolbar: Toolbar = findViewById(R.id.toolbar)
        setSupportActionBar(toolbar)
        supportActionBar?.title = "Smartplan"

        recyclerView = findViewById(R.id.recyclerView)
        recyclerView.layoutManager = LinearLayoutManager(this)

        taskAdapter = TaskAdapter(tasks)
        recyclerView.adapter = taskAdapter

        askNotificationPermission()
    }

    override fun onCreateOptionsMenu(menu: Menu?): Boolean {
        menuInflater.inflate(R.menu.menu_main, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_add -> {
                showAddTaskDialog()
                true
            }
            R.id.action_calendar -> {
                showCalendarDialog()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun showAddTaskDialog(selectedDate: Date? = null) {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_add_task, null)
        val remindersContainer = dialogView.findViewById<LinearLayout>(R.id.reminders_container)
        val addReminder = dialogView.findViewById<TextView>(R.id.tv_add_reminder)

        val deadlineDateEditText = dialogView.findViewById<EditText>(R.id.et_deadline_date)
        selectedDate?.let {
            deadlineDateEditText.setText(SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(it))
        }

        addReminder.performClick()

        addReminder.setOnClickListener {
            if (remindersContainer.childCount < 6) {
                val reminderView = LayoutInflater.from(this).inflate(R.layout.item_reminder, remindersContainer, false)
                val reminderNumber = remindersContainer.childCount + 1
                reminderView.findViewById<TextView>(R.id.tv_reminder_number).text = "Reminder $reminderNumber"
                remindersContainer.addView(reminderView)
            } else {
                Toast.makeText(this, "You can add a maximum of 6 reminders.", Toast.LENGTH_SHORT).show()
            }
        }

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()

        dialogView.findViewById<Button>(R.id.btn_add).setOnClickListener {
            val taskDescription = dialogView.findViewById<EditText>(R.id.et_task_description).text.toString()
            val deadlineDateStr = dialogView.findViewById<EditText>(R.id.et_deadline_date).text.toString()
            val deadlineTimeStr = dialogView.findViewById<EditText>(R.id.et_deadline_time).text.toString()
            val email = dialogView.findViewById<EditText>(R.id.et_email).text.toString()

            if (taskDescription.isBlank() || deadlineDateStr.isBlank() || deadlineTimeStr.isBlank() || email.isBlank()) {
                Toast.makeText(this, "Please fill all fields.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val deadlineStr = "$deadlineDateStr $deadlineTimeStr"
            val deadline = parseDateTime(deadlineStr)
            if (deadline == null) {
                Toast.makeText(this, "Invalid deadline format. Use YYYY-MM-DD and HH:MM", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val reminders = mutableListOf<Date>()
            val reminderStrings = mutableListOf<String>()

            for (i in 0 until remindersContainer.childCount) {
                val reminderView = remindersContainer.getChildAt(i)
                val dateStr = reminderView.findViewById<EditText>(R.id.et_reminder_date).text.toString()
                val timeStr = reminderView.findViewById<EditText>(R.id.et_reminder_time).text.toString()

                if (timeStr.isNotBlank()) {
                    val effectiveDateStr = if (dateStr.isBlank()) getCurrentDate() else dateStr
                    val reminderDateTimeStr = "$effectiveDateStr $timeStr"
                    val reminder = parseDateTime(reminderDateTimeStr)

                    if (reminder != null && reminder.before(deadline) && (deadline.time - reminder.time) >= TimeUnit.MINUTES.toMillis(5)) {
                        reminders.add(reminder)
                        reminderStrings.add(formatDateTime(reminder))
                    } else {
                        Toast.makeText(this, "Invalid reminder: must be at least 5 minutes before the deadline.", Toast.LENGTH_LONG).show()
                        return@setOnClickListener
                    }
                }
            }

            val newTask = Task(taskDescription, "Deadline: $deadlineStr", "Reminders:\n" + reminderStrings.joinToString("\n") { "- $it" })
            tasks.add(newTask)
            taskAdapter.notifyItemInserted(tasks.size - 1)

            val deadlineDate = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).parse(deadlineDateStr)
            if (deadlineDate != null) {
                val existingTasks = calendarTasks[deadlineDate] ?: emptyList()
                calendarTasks[deadlineDate] = existingTasks + newTask
            }

            scheduleConfirmation(taskDescription, email, deadlineStr, reminderStrings)
            scheduleNotification(taskDescription, email, deadline, isDeadline = true)
            reminders.forEach { scheduleNotification(taskDescription, email, it, isDeadline = false) }

            dialog.dismiss()
        }

        dialogView.findViewById<Button>(R.id.btn_cancel).setOnClickListener {
            dialog.dismiss()
        }

        dialog.show()
    }

    private fun showCalendarDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_calendar, null)
        val calendarView = dialogView.findViewById<CalendarView>(R.id.calendar_view)
        val monthYearText = dialogView.findViewById<TextView>(R.id.tv_month_year)

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()

        val currentMonth = YearMonth.now()
        val startMonth = currentMonth.minusMonths(10)
        val endMonth = currentMonth.plusMonths(10)
        val firstDayOfWeek = firstDayOfWeekFromLocale()

        calendarView.setup(startMonth, endMonth, firstDayOfWeek)
        calendarView.scrollToMonth(currentMonth)

        class DayViewContainer(view: View) : ViewContainer(view) {
            val textView = view.findViewById<TextView>(R.id.calendar_day_text)
            lateinit var day: CalendarDay
            init {
                view.setOnClickListener {
                    val date = Date.from(day.date.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant())
                    showAddTaskDialog(date)
                    dialog.dismiss()
                }
            }
        }

        calendarView.dayBinder = object : MonthDayBinder<DayViewContainer> {
            override fun create(view: View) = DayViewContainer(view)
            override fun bind(container: DayViewContainer, day: CalendarDay) {
                container.day = day
                container.textView.text = day.date.dayOfMonth.toString()
                val date = Date.from(day.date.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant())
                if (calendarTasks.containsKey(date)) {
                    container.textView.setBackgroundResource(R.drawable.rounded_background)
                }
            }
        }

        val monthTitleFormatter = DateTimeFormatter.ofPattern("MMMM yyyy")

        dialogView.findViewById<View>(R.id.iv_left_arrow).setOnClickListener {
            calendarView.findFirstVisibleMonth()?.let { calendarView.smoothScrollToMonth(it.yearMonth.minusMonths(1)) }
        }

        dialogView.findViewById<View>(R.id.iv_right_arrow).setOnClickListener {
            calendarView.findFirstVisibleMonth()?.let { calendarView.smoothScrollToMonth(it.yearMonth.plusMonths(1)) }
        }

        calendarView.monthScrollListener = {
            monthYearText.text = monthTitleFormatter.format(it.yearMonth)
        }

        dialog.show()
    }

    private fun scheduleConfirmation(taskDescription: String, email: String, deadline: String, reminders: List<String>) {
        val data = Data.Builder()
            .putString("task_description", taskDescription)
            .putString("email", email)
            .putString("deadline", deadline)
            .putStringArray("reminders", reminders.toTypedArray())
            .putBoolean("is_confirmation", true)
            .build()

        val notificationWorkRequest = OneTimeWorkRequestBuilder<NotificationWorker>()
            .setInputData(data)
            .build()

        WorkManager.getInstance(this).enqueue(notificationWorkRequest)
    }

    private fun scheduleNotification(taskDescription: String, email: String, time: Date, isDeadline: Boolean) {
        val delay = time.time - System.currentTimeMillis()
        if (delay > 0) {
            val data = Data.Builder()
                .putString("task_description", taskDescription)
                .putString("email", email)
                .putBoolean("is_deadline", isDeadline)
                .putBoolean("is_confirmation", false)
                .build()

            val notificationWorkRequest = OneTimeWorkRequestBuilder<NotificationWorker>()
                .setInitialDelay(delay, TimeUnit.MILLISECONDS)
                .setInputData(data)
                .build()

            WorkManager.getInstance(this).enqueue(notificationWorkRequest)
        }
    }

    private fun parseDateTime(dateTimeStr: String): Date? {
        return try {
            SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).parse(dateTimeStr)
        } catch (e: Exception) {
            null
        }
    }

    private fun formatDateTime(date: Date): String {
        return SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(date)
    }

    private fun getCurrentDate(): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    }

    private fun askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
                PackageManager.PERMISSION_GRANTED
            ) {
                if (shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
                    AlertDialog.Builder(this)
                        .setTitle("Notification Permission Needed")
                        .setMessage("This app needs the Notification permission to send you task reminders.")
                        .setPositiveButton("OK") { _, _ ->
                            requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                        }
                        .setNegativeButton("Cancel", null)
                        .show()
                } else {
                    requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
            }
        }
    }
}