import React from "react";
import { StyleSheet, View } from "react-native";

interface MapSegmentProps {
  children: React.ReactNode;
  index: number;
  isFirst?: boolean;
  isLast?: boolean;
}

// Pseudo-random generator based on a seed
function randomSeeded(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function MapSegment({ children, index, isFirst, isLast }: MapSegmentProps) {
  // We place 2-3 stepping stones *before* the children if it's not the first item
  // To connect from the previous node.
  // The previous node horizontal offset and current node horizontal offset determine the stones' positions.
  
  const getOffset = (i: number) => {
    const cycle = i % 4;
    if (cycle === 0) return -40; // Left
    if (cycle === 1) return 0;   // Center
    if (cycle === 2) return 40;  // Right
    if (cycle === 3) return 0;   // Center
    return 0;
  };

  const currentOffset = getOffset(index);
  const prevOffset = getOffset(Math.max(0, index - 1));

  // Determine decorations based on index
  const hasTreeLeft = randomSeeded(index * 2) > 0.5;
  const hasTreeRight = randomSeeded(index * 2 + 1) > 0.5;
  const treeEmoji = randomSeeded(index * 3) > 0.7 ? "🌲" : "🌳";
  
  const hasCloud = randomSeeded(index * 4) > 0.7;
  const cloudOffset = (randomSeeded(index * 5) * 100) - 50; // -50 to 50
  
  const hasFlower = randomSeeded(index * 6) > 0.6;
  const flowerEmoji = randomSeeded(index * 7) > 0.5 ? "🌻" : "🌷";

  return (
    <View style={styles.container}>
      {/* Decorative Background Elements */}
      {hasCloud && (
        <View style={[styles.decoration, { top: -20, right: 50 + cloudOffset, opacity: 0.8, zIndex: 0 }]}>
          <Text style={{ fontSize: 40 }}>☁️</Text>
        </View>
      )}

      {hasTreeLeft && (
        <View style={[styles.decoration, { left: 20, top: 40, zIndex: 0 }]}>
          <Text style={{ fontSize: 32 }}>{treeEmoji}</Text>
        </View>
      )}

      {hasTreeRight && (
        <View style={[styles.decoration, { right: 20, top: 20, zIndex: 0 }]}>
          <Text style={{ fontSize: 32 }}>{treeEmoji}</Text>
        </View>
      )}

      {hasFlower && (
        <View style={[styles.decoration, { left: 60, top: 10, zIndex: 0 }]}>
          <Text style={{ fontSize: 16 }}>{flowerEmoji}</Text>
        </View>
      )}

      {/* Stepping Stones from prev to current */}
      {!isFirst && (
        <View style={styles.stonesContainer}>
          <View
            style={[
              styles.stone,
              {
                transform: [{ translateX: prevOffset + (currentOffset - prevOffset) * 0.33 }],
              },
            ]}
          />
          <View
            style={[
              styles.stone,
              {
                transform: [{ translateX: prevOffset + (currentOffset - prevOffset) * 0.66 }],
              },
            ]}
          />
        </View>
      )}

      {/* The actual Node (Lesson or UnitHeader) */}
      <View style={styles.childContainer}>{children}</View>
    </View>
  );
}

import { Text } from "react-native";
import { colors } from "../constant/constant";

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  decoration: {
    position: "absolute",
  },
  stonesContainer: {
    width: "100%",
    height: 40,
    alignItems: "center",
    justifyContent: "space-evenly",
    zIndex: 1,
  },
  stone: {
    width: 24,
    height: 12,
    backgroundColor: "#E2E2E2",
    borderRadius: 6,
    borderBottomWidth: 3,
    borderColor: "#CCCCCC",
  },
  childContainer: {
    zIndex: 2,
    width: "100%",
    alignItems: "center",
  },
});
