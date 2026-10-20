import { Ionicons } from "@expo/vector-icons";
import {
  Canvas,
  Circle,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WebView from "react-native-webview";

const DOCUMENTS = {
  terms: {
    title: "Terms of Service",
    url: process.env.EXPO_PUBLIC_TERMS_URL,
    envName: "EXPO_PUBLIC_TERMS_URL",
  },
  privacy: {
    title: "Privacy Policy",
    url: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL,
    envName: "EXPO_PUBLIC_PRIVACY_POLICY_URL",
  },
  subscription: {
    title: "Subscription Policy",
    url: process.env.EXPO_PUBLIC_SUBSCRIPTION_POLICY_URL,
    envName: "EXPO_PUBLIC_SUBSCRIPTION_POLICY_URL",
  },
  deleteAccount: {
    title: "Delete Account",
    url: process.env.EXPO_PUBLIC_DELETE_ACCOUNT_URL,
    envName: "EXPO_PUBLIC_DELETE_ACCOUNT_URL",
  },
} as const;

type DocumentKey = keyof typeof DOCUMENTS;

function isDocumentKey(value: string | undefined): value is DocumentKey {
  return value !== undefined && Object.hasOwn(DOCUMENTS, value);
}

function isValidWebUrl(value: string | undefined): value is string {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export default function PolicyScreen() {
  const router = useRouter();
  const { document } = useLocalSearchParams<{ document?: string }>();
  const { width, height } = useWindowDimensions();
  const webViewRef = useRef<WebView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const config = isDocumentKey(document) ? DOCUMENTS[document] : undefined;
  const validUrl = isValidWebUrl(config?.url) ? config.url : undefined;

  const retryLoading = () => {
    setLoadError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  return (
    <View style={styles.screen}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(width, height)}
            colors={["#F5F2FF", "#F0EDFF", "#F8F8FF", "#EEF9F7"]}
          />
        </Rect>
        <Circle
          cx={width * 0.88}
          cy={height * 0.13}
          r={width * 0.57}
          color="rgba(111,82,245,0.14)"
        />
        <Circle
          cx={-width * 0.05}
          cy={height * 0.78}
          r={width * 0.55}
          color="rgba(61,205,226,0.13)"
        />
        <Circle
          cx={width * 0.8}
          cy={height * 0.94}
          r={width * 0.46}
          color="rgba(112,87,245,0.10)"
        />
      </Canvas>

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.75}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.purple} />
          </TouchableOpacity>
          <Text numberOfLines={1} style={styles.title}>
            {config?.title ?? "Legal & Account"}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.webViewShell}>
          {validUrl && !loadError ? (
            <>
              <WebView
                ref={webViewRef}
                source={{ uri: validUrl }}
                style={styles.webView}
                containerStyle={styles.webViewContainer}
                originWhitelist={["http://*", "https://*"]}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setLoadError(true);
                }}
                onHttpError={() => {
                  setIsLoading(false);
                  setLoadError(true);
                }}
              />
              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator color={COLORS.purple} size="large" />
                  <Text style={styles.helperText}>Loading securely…</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.messageState}>
              <View style={styles.messageIcon}>
                <Ionicons
                  name={loadError ? "cloud-offline-outline" : "link-outline"}
                  size={28}
                  color={COLORS.purple}
                />
              </View>
              <Text style={styles.messageTitle}>
                {loadError
                  ? "This page couldn’t be loaded"
                  : "This page isn’t configured yet"}
              </Text>
              <Text style={styles.helperText}>
                {loadError
                  ? "Check your connection and try again."
                  : config
                    ? `Add a valid URL to ${config.envName} in your .env file.`
                    : "Choose a page from your profile to continue."}
              </Text>
              {loadError && (
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  onPress={retryLoading}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const COLORS = {
  background: "#F5F2FF",
  purple: "#6847F5",
  text: "#111126",
  textSecondary: "#626078",
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 14,
  },
  header: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "rgba(104,71,245,0.06)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.18)",
  },
  title: {
    flex: 1,
    marginLeft: 12,
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSpacer: {
    width: 8,
  },
  webViewShell: {
    flex: 1,
    overflow: "hidden",
    marginBottom: 8,
    borderRadius: 22,
    backgroundColor: "rgba(104,71,245,0.035)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.16)",
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245,242,255,0.92)",
  },
  messageState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  messageIcon: {
    width: 60,
    height: 60,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    backgroundColor: "rgba(104,71,245,0.08)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.18)",
  },
  messageTitle: {
    marginBottom: 8,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  helperText: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 18,
    backgroundColor: "rgba(104,71,245,0.08)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.22)",
  },
  retryText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.purple,
  },
});
