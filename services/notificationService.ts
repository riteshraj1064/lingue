// services/notificationService.ts
// Local Notification System for Lingue
// - Schedules hourly motivational + streak reminders for the next 24 hours
// - Re-schedules on every app open (AppState foreground) to keep the queue fresh
// - Skips scheduling if user is active (opened app in the last hour)

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";

/* ─────────────────────────────────────────────────────────────────
   NOTIFICATION CONTENT BANK
   Each entry = { title, body, imageUrl? }
   Rotate via index % length so they never repeat the same message
   twice in a row.
───────────────────────────────────────────────────────────────── */

export interface NotificationSlot {
  title: string;
  body: string;
}

const SLOTS: NotificationSlot[] = [
  { title: "🔥 Keep your streak alive!", body: "You haven't practiced yet today. Jump in for just 5 minutes!" },
  { title: "🌟 One lesson = one step closer", body: "Your future self thanks you for practicing right now." },
  { title: "⚡ Quick challenge awaiting!", body: "A new lesson is ready. Can you beat your last score?" },
  { title: "🎯 Stay on target!", body: "Your daily goal is still waiting. Don't lose your streak!" },
  { title: "💬 Your target language misses you", body: "Even one lesson keeps your brain sharp. Start now!" },
  { title: "🏆 Champions practice daily", body: "Log in and complete a lesson to stay at the top of your league." },
  { title: "🌍 The world is talking — join in", body: "Practice your target language and open new doors today." },
  { title: "📚 Small steps, big fluency", body: "Just 5 minutes of Lingue keeps your progress going strong." },
  { title: "😴 Don't let your streak sleep!", body: "You've come so far — don't break the chain now!" },
  { title: "🎓 Your brain loves this", body: "Spaced repetition works best when you stay consistent. Come back!" },
  { title: "🚀 Ready for liftoff?", body: "Your next lesson is loaded and ready. Launch it now!" },
  { title: "💡 Tip: 5 mins a day beats 1 hour a week", body: "Open Lingue for a quick session and lock in your progress." },
];

/* ─────────────────────────────────────────────────────────────────
   CONFIGURE FOREGROUND BEHAVIOR (call once at app start)
───────────────────────────────────────────────────────────────── */

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/* ─────────────────────────────────────────────────────────────────
   REQUEST PERMISSIONS
───────────────────────────────────────────────────────────────── */

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    // Emulators don't support local notifications reliably
    console.log("[Notifications] Skipping — not a real device");
    return false;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    console.log("[Notifications] Permission denied");
    return false;
  }

  // Android 8+ needs a channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("lingue-reminders", {
      name: "Lingue Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#6847F5",
      sound: "default",
    });
  }

  return true;
}

/* ─────────────────────────────────────────────────────────────────
   SCHEDULE HOURLY UNIQUE NOTIFICATIONS (next 24 hours)
   Clears existing ones first to avoid duplicates.
───────────────────────────────────────────────────────────────── */

const HOURS_AHEAD = 24;

export async function scheduleReminderNotifications(
  userStreakDays: number = 0
): Promise<void> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  // Cancel the old batch before rescheduling
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();

  for (let i = 1; i <= HOURS_AHEAD; i++) {
    const slot = SLOTS[(i - 1) % SLOTS.length];

    // Personalise streak-specific slots
    let body = slot.body;
    if (i === 3 && userStreakDays > 0) {
      body = `You're on a ${userStreakDays}-day streak! Keep it going — don't miss today.`;
    }

    const triggerMs = now + i * 60 * 60 * 1000; // i hours from now
    const triggerDate = new Date(triggerMs);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: slot.title,
        body,
        sound: "default",
        badge: 1,
        data: { type: "reminder", hour: i },
        // Android channel
        ...(Platform.OS === "android" && { channelId: "lingue-reminders" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }

  console.log(`[Notifications] Scheduled ${HOURS_AHEAD} hourly reminders`);
}

/* ─────────────────────────────────────────────────────────────────
   CANCEL ALL (call on logout or when user completes daily goal)
───────────────────────────────────────────────────────────────── */

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log("[Notifications] All reminders cancelled");
}

/* ─────────────────────────────────────────────────────────────────
   APP STATE LISTENER
   Re-schedules the 24-hour batch every time the app comes to
   the foreground, keeping the queue topped up indefinitely.
   Pass in a getter for the current streak so messages stay
   personalised.
───────────────────────────────────────────────────────────────── */

export function startAppStateRescheduler(
  getStreak: () => number
): () => void {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      // User opened or returned to the app — refresh the queue
      scheduleReminderNotifications(getStreak()).catch((e) =>
        console.warn("[Notifications] Reschedule error:", e)
      );
    }
  });

  return () => subscription.remove();
}
