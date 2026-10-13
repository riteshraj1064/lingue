// components/AdBanner.tsx
// AdMob Banner Ad Component with AGENTS.md Glassmorphism Styling
// Automatically hidden when user has an active premium plan (isPremium === true)

import { useApp } from "@/context/AppContext";
import React, { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";

interface AdBannerProps {
  /** Optional custom ad unit ID. Falls back to official TestIds.BANNER in dev/test */
  unitId?: string;
  size?: BannerAdSize;
  style?: any;
}

// Production unit ID fallback to TestIds for safe rendering
const PRODUCTION_BANNER_ID = Platform.select({
  android: "ca-app-pub-9842032709789426/3689729843",
  ios: "ca-app-pub-9842032709789426/9768976474",
  default: TestIds.BANNER,
});

const AD_UNIT_ID = __DEV__ ? TestIds.BANNER : (PRODUCTION_BANNER_ID || TestIds.BANNER);

export const AdBanner: React.FC<AdBannerProps> = ({
  unitId = AD_UNIT_ID,
  size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
  style,
}) => {
  const { isPremium } = useApp();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adFailed, setAdFailed] = useState(false);

  // If user has an active premium plan, DO NOT render ads
  if (isPremium) {
    return null;
  }

  // If ad failed to load, gracefully collapse so layout doesn't break
  if (adFailed) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {/* Top subtle glass highlight */}
      <View pointerEvents="none" style={styles.topEdge} />

      <View style={styles.badgeRow}>
        <Text style={styles.sponsorBadge}>SPONSORED</Text>
      </View>

      <View style={styles.adWrapper}>
        <BannerAd
          unitId={unitId}
          size={size}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={() => {
            setAdLoaded(true);
            setAdFailed(false);
          }}
          onAdFailedToLoad={(error) => {
            console.log("[AdBanner] Failed to load banner ad:", error);
            setAdFailed(true);
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "rgba(104,71,245,0.035)",
    borderWidth: 1,
    borderColor: "rgba(104,71,245,0.16)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    overflow: "hidden",
    position: "relative",
  },
  topEdge: {
    position: "absolute",
    top: 0,
    left: 1,
    right: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.70)",
  },
  badgeRow: {
    alignSelf: "flex-start",
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  sponsorBadge: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(98,96,120,0.65)",
    letterSpacing: 0.8,
  },
  adWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default AdBanner;
