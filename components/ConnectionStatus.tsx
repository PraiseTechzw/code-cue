"use client"

import { useState, useEffect, useRef } from "react"
import { StyleSheet, View, Text, TouchableOpacity, Animated, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import NetInfo from "@react-native-community/netinfo"
import * as Haptics from "expo-haptics"
import { useAuth } from "@/contexts/AuthContext"
import { offlineStore } from "@/services/offlineStore"
import Colors from "@/constants/Colors"

export function ConnectionStatus() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { isConnected } = useAuth()

  const [expanded, setExpanded] = useState(false)
  const [pendingChanges, setPendingChanges] = useState(0)
  const [syncProgress, setSyncProgress] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: false,
    lastSyncTime: null as number | null,
    error: null as string | null,
  })

  // Animations
  const heightAnim = useRef(new Animated.Value(0)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const progressAnim = useRef(new Animated.Value(0)).current

  // Format last sync time
  const formatLastSyncTime = (timestamp: number | null) => {
    if (!timestamp) return "Never"

    const now = new Date()
    const syncTime = new Date(timestamp)

    // If today, show time
    if (
      now.getDate() === syncTime.getDate() &&
      now.getMonth() === syncTime.getMonth() &&
      now.getFullYear() === syncTime.getFullYear()
    ) {
      return syncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    // If yesterday, show "Yesterday"
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (
      yesterday.getDate() === syncTime.getDate() &&
      yesterday.getMonth() === syncTime.getMonth() &&
      yesterday.getFullYear() === syncTime.getFullYear()
    ) {
      return "Yesterday"
    }

    // Otherwise show date
    return syncTime.toLocaleDateString()
  }

  // Load pending changes count
  const loadPendingChanges = async () => {
    const count = await offlineStore.getPendingChangesCount()
    setPendingChanges(count)
  }

  // Initialize
  useEffect(() => {
    loadPendingChanges()

    // Set up sync listener
    const unsubscribe = offlineStore.addSyncListener((progress) => {
      setSyncProgress(progress)

      // Update progress animation
      if (progress.total > 0) {
        const progressValue = progress.completed / progress.total
        Animated.timing(progressAnim, {
          toValue: progressValue,
          duration: 300,
          useNativeDriver: false,
        }).start()
      } else {
        progressAnim.setValue(0)
      }

      // Reload pending changes after sync
      if (!progress.inProgress) {
        loadPendingChanges()
      }
    })

    // Set up network change listener
    const netInfoUnsubscribe = NetInfo.addEventListener(() => {
      loadPendingChanges()
    })

    return () => {
      unsubscribe()
      netInfoUnsubscribe()
    }
  }, [])

  // Handle expand/collapse
  useEffect(() => {
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: expanded ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: expanded ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: expanded ? 0 : 50,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start()
  }, [expanded])

  // Handle sync button press
  const handleSync = async () => {
    if (syncProgress.inProgress) return

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await offlineStore.syncOfflineChanges()
  }

  // Only show if offline or has pending changes
  if (isConnected && pendingChanges === 0 && !syncProgress.inProgress) {
    return null
  }

  // Calculate progress width
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  })

  // Calculate content height
  const contentHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  })

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.statusBar,
          {
            backgroundColor: isConnected ? theme.tintLight : theme.warningLight,
          },
        ]}
        onPress={() => {
          setExpanded(!expanded)
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${isConnected ? "Online" : "Offline"} status. ${pendingChanges} pending changes.`}
        accessibilityHint="Double tap to expand for more details"
      >
        <View style={styles.statusContent}>
          <View style={styles.statusIconContainer}>
            <Ionicons
              name={isConnected ? "cloud-done-outline" : "cloud-offline-outline"}
              size={18}
              color={isConnected ? theme.tint : theme.warning}
            />
          </View>

          <Text style={[styles.statusText, { color: isConnected ? theme.tint : theme.warning }]}>
            {isConnected ? "Online" : "Offline"}
          </Text>

          {pendingChanges > 0 && (
            <View
              style={[styles.badge, { backgroundColor: isConnected ? theme.tint : theme.warning }]}
              accessibilityLabel={`${pendingChanges} pending changes`}
            >
              <Text style={styles.badgeText}>{pendingChanges}</Text>
            </View>
          )}
        </View>

        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={isConnected ? theme.tint : theme.warning}
        />
      </TouchableOpacity>

      {/* Progress bar for sync */}
      {syncProgress.inProgress && (
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: theme.tint,
                width: progressWidth,
              },
            ]}
          />
        </View>
      )}

      {/* Expanded content */}
      <Animated.View
        style={[
          styles.expandedContent,
          {
            height: contentHeight,
            opacity: opacityAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textDim }]}>Last synced:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {formatLastSyncTime(syncProgress.lastSyncTime)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textDim }]}>Pending changes:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{pendingChanges}</Text>
          </View>

          {syncProgress.inProgress && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textDim }]}>Sync progress:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {syncProgress.completed}/{syncProgress.total}
              </Text>
            </View>
          )}

          {syncProgress.error && (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: theme.error }]}>{syncProgress.error}</Text>
            </View>
          )}
        </View>

        {isConnected && pendingChanges > 0 && (
          <TouchableOpacity
            style={[styles.syncButton, { backgroundColor: theme.tint }]}
            onPress={handleSync}
            disabled={syncProgress.inProgress}
            accessibilityRole="button"
            accessibilityLabel="Sync now"
            accessibilityHint="Synchronize pending changes with the server"
          >
            {syncProgress.inProgress ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="sync" size={16} color="#fff" style={styles.syncIcon} />
                <Text style={styles.syncButtonText}>Sync Now</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIconContainer: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  progressContainer: {
    height: 2,
    backgroundColor: "rgba(0,0,0,0.1)",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
  },
  expandedContent: {
    overflow: "hidden",
    paddingHorizontal: 16,
  },
  detailsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  errorContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  syncIcon: {
    marginRight: 8,
  },
  syncButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
})
