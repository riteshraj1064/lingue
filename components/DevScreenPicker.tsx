// components/DevScreenPicker.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, radius, shadows, typography } from "../constant/constant";

const SCREENS = [
  { id: "splash", title: "1. Splash Screen", route: "/splash", icon: "sparkles" },
  { id: "login", title: "2. Login", route: "/(auth)/login", icon: "log-in" },
  { id: "signup", title: "3. Sign Up", route: "/(auth)/signup", icon: "person-add" },
  { id: "forgot", title: "4. Forgot Password", route: "/(auth)/forgot-password", icon: "key" },
  { id: "welcome", title: "5. Onboarding Welcome", route: "/(onboarding)/welcome", icon: "hand-right" },
  { id: "courses", title: "6. Course Selection", route: "/(onboarding)/courses", icon: "language" },
  { id: "native", title: "7. Native Language", route: "/(onboarding)/native-lang", icon: "chatbubbles" },
  { id: "details", title: "8. Course Details", route: "/(onboarding)/course-details", icon: "book" },
  { id: "goal", title: "9. Daily Goal", route: "/(onboarding)/daily-goal", icon: "trophy" },
  { id: "complete", title: "10. Onboarding Complete", route: "/(onboarding)/complete", icon: "checkmark-done-circle" },
  { id: "home", title: "11. Home Dashboard", route: "/(tabs)", icon: "home" },
  { id: "lesson", title: "12. Lesson & Questions", route: "/lesson", icon: "school" },
];

export const DevScreenPicker: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  const handleNavigate = (route: string) => {
    setVisible(false);
    setTimeout(() => {
      router.push(route as any);
    }, 150);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
        accessibilityLabel="Developer Screen Switcher"
      >
        <Ionicons name="layers-outline" size={20} color={colors.white} />
        <Text style={styles.floatingButtonText}>Screens</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <View>
                <Text style={styles.modalTitle}>Lingua Screen Navigator</Text>
                <Text style={styles.modalSubtitle}>Jump to any screen in the system</Text>
              </View>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
              {SCREENS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.screenItem}
                  onPress={() => handleNavigate(item.route)}
                >
                  <View style={styles.itemIconContainer}>
                    <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    bottom: 24,
    right: 18,
    backgroundColor: colors.primaryDark,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    zIndex: 9999,
    gap: 6,
    ...shadows.floating,
  },
  floatingButtonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "700",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    padding: 20,
    ...shadows.floating,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundOffWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollList: {
    marginBottom: 20,
  },
  screenItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.input,
    marginBottom: 8,
    backgroundColor: colors.backgroundOffWhite,
  },
  itemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySurface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemTitle: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: "600",
  },
});

export default DevScreenPicker;
