"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { useToast } from "@/contexts/ToastContext"
import { Stack } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useColorScheme } from "react-native"
import Colors from "@/constants/Colors"

export default function ToastDemo() {
  const { showToast } = useToast()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const [selectedType, setSelectedType] = useState<"success" | "error" | "info" | "warning">("success")
  const [selectedPosition, setSelectedPosition] = useState<"top" | "bottom">("top")
  const [selectedAnimation, setSelectedAnimation] = useState<"slide" | "fade" | "bounce" | "flip" | "zoom">("slide")
  const [selectedDuration, setSelectedDuration] = useState<number>(3000)

  const showDemoToast = () => {
    showToast(`This is a ${selectedType} toast with ${selectedAnimation} animation!`, {
      type: selectedType,
      position: selectedPosition,
      animation: selectedAnimation,
      duration: selectedDuration,
    })
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: "Toast Animations Demo" }} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Toast Type</Text>
        <View style={styles.optionsRow}>
          {(["success", "error", "info", "warning"] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.optionButton,
                { backgroundColor: selectedType === type ? theme.tint : theme.cardBackground },
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text style={[styles.optionText, { color: selectedType === type ? "#fff" : theme.text }]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Position</Text>
        <View style={styles.optionsRow}>
          {(["top", "bottom"] as const).map((position) => (
            <TouchableOpacity
              key={position}
              style={[
                styles.optionButton,
                { backgroundColor: selectedPosition === position ? theme.tint : theme.cardBackground },
              ]}
              onPress={() => setSelectedPosition(position)}
            >
              <Text style={[styles.optionText, { color: selectedPosition === position ? "#fff" : theme.text }]}>
                {position.charAt(0).toUpperCase() + position.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Animation</Text>
        <View style={styles.optionsRow}>
          {(["slide", "fade", "bounce", "flip", "zoom"] as const).map((animation) => (
            <TouchableOpacity
              key={animation}
              style={[
                styles.optionButton,
                { backgroundColor: selectedAnimation === animation ? theme.tint : theme.cardBackground },
              ]}
              onPress={() => setSelectedAnimation(animation)}
            >
              <Text style={[styles.optionText, { color: selectedAnimation === animation ? "#fff" : theme.text }]}>
                {animation.charAt(0).toUpperCase() + animation.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Duration</Text>
        <View style={styles.optionsRow}>
          {[1000, 2000, 3000, 5000].map((duration) => (
            <TouchableOpacity
              key={duration}
              style={[
                styles.optionButton,
                { backgroundColor: selectedDuration === duration ? theme.tint : theme.cardBackground },
              ]}
              onPress={() => setSelectedDuration(duration)}
            >
              <Text style={[styles.optionText, { color: selectedDuration === duration ? "#fff" : theme.text }]}>
                {duration / 1000}s
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.showToastButton, { backgroundColor: theme.tint }]} onPress={showDemoToast}>
          <Ionicons name="notifications" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.showToastButtonText}>Show Toast</Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>Toast Features:</Text>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={18} color={theme.tint} style={styles.infoIcon} />
            <Text style={[styles.infoText, { color: theme.text }]}>Swipe to dismiss</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={18} color={theme.tint} style={styles.infoIcon} />
            <Text style={[styles.infoText, { color: theme.text }]}>Progress bar indicator</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={18} color={theme.tint} style={styles.infoIcon} />
            <Text style={[styles.infoText, { color: theme.text }]}>5 animation types</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={18} color={theme.tint} style={styles.infoIcon} />
            <Text style={[styles.infoText, { color: theme.text }]}>Multiple positions</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={18} color={theme.tint} style={styles.infoIcon} />
            <Text style={[styles.infoText, { color: theme.text }]}>Customizable duration</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  showToastButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 30,
  },
  buttonIcon: {
    marginRight: 8,
  },
  showToastButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoCard: {
    marginTop: 30,
    padding: 16,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
  },
})
