// components/CustomAlertModal.tsx
// Dark Glassmorphism Alert Modal — NO BlurView, NO opaque white backgrounds
// Follows AGENTS.md design system exactly.

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

/* ─────────────────── Types ─────────────────── */

export interface CustomAlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

export type AlertType = "info" | "success" | "warning" | "error" | "confirm";

export interface CustomAlertModalProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: CustomAlertButton[];
  onClose: () => void;
  type?: AlertType;
}

/* ─────────────────── Colors (dark glass palette) ─────────────────── */

const C = {
  purple: "#6847F5",
  green: "#16C58B",
  gold: "#F7B718",
  danger: "#FF4B4B",
  orange: "#FF9600",
  white: "#FFFFFF",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.68)",
};

/* ─────────────────── Type meta ─────────────────── */

const getTypeMeta = (
  type: AlertType
): {
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
} => {
  switch (type) {
    case "success":
      return {
        iconName: "checkmark-circle",
        color: C.green,
        bgColor: "rgba(22,197,139,0.14)",
        borderColor: "rgba(22,197,139,0.30)",
        glowColor: "rgba(22,197,139,0.08)",
      };
    case "warning":
      return {
        iconName: "warning",
        color: C.gold,
        bgColor: "rgba(247,183,24,0.14)",
        borderColor: "rgba(247,183,24,0.30)",
        glowColor: "rgba(247,183,24,0.08)",
      };
    case "error":
      return {
        iconName: "close-circle",
        color: C.danger,
        bgColor: "rgba(255,75,75,0.14)",
        borderColor: "rgba(255,75,75,0.30)",
        glowColor: "rgba(255,75,75,0.08)",
      };
    case "confirm":
      return {
        iconName: "alert-circle",
        color: C.orange,
        bgColor: "rgba(255,150,0,0.14)",
        borderColor: "rgba(255,150,0,0.30)",
        glowColor: "rgba(255,150,0,0.08)",
      };
    case "info":
    default:
      return {
        iconName: "information-circle",
        color: C.purple,
        bgColor: "rgba(104,71,245,0.14)",
        borderColor: "rgba(104,71,245,0.30)",
        glowColor: "rgba(104,71,245,0.08)",
      };
  }
};

/* ─────────────────── Component ─────────────────── */

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: "OK", style: "default" }],
  onClose,
  type = "info",
}) => {
  const scaleAnim = useRef(new Animated.Value(0.82)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const cardOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacityAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.82);
      opacityAnim.setValue(0);
      cardOpacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const meta = getTypeMeta(type);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: cardOpacityAnim,
                },
              ]}
            >
              {/* Glass top highlight edge */}
              <View pointerEvents="none" style={styles.glassTopEdge} />

              {/* Glow spot behind icon (decorative) */}
              <View
                pointerEvents="none"
                style={[styles.glowSpot, { backgroundColor: meta.glowColor }]}
              />

              {/* Icon pod */}
              <View
                style={[
                  styles.iconPod,
                  {
                    backgroundColor: meta.bgColor,
                    borderColor: meta.borderColor,
                  },
                ]}
              >
                <Ionicons name={meta.iconName} size={34} color={meta.color} />
              </View>

              {/* Title */}
              <Text style={styles.titleText}>{title}</Text>

              {/* Message */}
              {!!message && (
                <Text style={styles.messageText}>{message}</Text>
              )}

              {/* Divider */}
              <View style={styles.divider} />

              {/* Buttons */}
              <View
                style={[
                  styles.buttonRow,
                  buttons.length === 1 && styles.buttonRowSingle,
                ]}
              >
                {buttons.map((btn, index) => {
                  const isCancel = btn.style === "cancel";
                  const isDestructive = btn.style === "destructive";

                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.72}
                      style={[
                        styles.button,
                        buttons.length > 1 && { flex: 1 },
                        isCancel && styles.cancelButton,
                        isDestructive && styles.destructiveButton,
                        !isCancel && !isDestructive && styles.primaryButton,
                      ]}
                      onPress={() => {
                        onClose();
                        btn.onPress?.();
                      }}
                    >
                      <Text
                        style={[
                          styles.btnText,
                          isCancel && styles.cancelBtnText,
                          isDestructive && styles.destructiveBtnText,
                          !isCancel && !isDestructive && styles.primaryBtnText,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

/* ─────────────────── Styles — dark glass, ZERO Android elevation ─────────────────── */

const styles = StyleSheet.create({
  // Backdrop — dark semi-transparent overlay
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(5,4,18,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  // Modal card — dark glass surface
  // NO elevation — prevents Android white rectangle artifact on translucent views
  modalCard: {
    width: "100%",
    maxWidth: 336,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
    overflow: "hidden",
  },

  // Top highlight line (glass illusion)
  glassTopEdge: {
    position: "absolute",
    top: 0,
    left: 1,
    right: 1,
    height: 1.5,
    backgroundColor: "rgba(255,255,255,0.42)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  // Ambient glow circle behind icon pod
  glowSpot: {
    position: "absolute",
    top: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
  },

  // Icon pod circle
  iconPod: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    marginBottom: 16,
  },

  titleText: {
    fontSize: 19,
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: "center",
    letterSpacing: -0.3,
  },

  messageText: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    color: C.textSecondary,
    textAlign: "center",
    marginTop: 7,
  },

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginTop: 20,
    marginBottom: 16,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },

  buttonRowSingle: {
    justifyContent: "center",
  },

  button: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 96,
  },

  primaryButton: {
    backgroundColor: C.purple,
  },

  cancelButton: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  destructiveButton: {
    backgroundColor: C.danger,
  },

  btnText: {
    fontSize: 14,
    fontWeight: "700",
  },

  primaryBtnText: {
    color: C.white,
  },

  cancelBtnText: {
    color: C.textSecondary,
  },

  destructiveBtnText: {
    color: C.white,
  },
});