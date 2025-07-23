"use client"

import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
} from "react-native"
import { useState, useEffect, useRef, useCallback } from "react"
import { useLocalSearchParams, router } from "expo-router"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import * as Haptics from "expo-haptics"

import { TaskItem } from "@/components/TaskItem"
import { ProgressBar } from "@/components/ProgressBar"
import { phaseService } from "@/services/phaseService"
import { taskService } from "@/services/taskService"
import { useToast } from "@/contexts/ToastContext"
import { ConnectionStatus } from "@/components/ConnectionStatus"
import { VerifyAction } from "@/components/VerifyAction"
import Colors from "@/constants/Colors"

export default function PhaseDetailScreen() {
  const { id } = useLocalSearchParams()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [phase, setPhase] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState("all")
  const [isOffline, setIsOffline] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [taskStats, setTaskStats] = useState({
    todo: 0,
    inProgress: 0,
    done: 0,
    total: 0,
  })

  // Animation for the add button
  const buttonScale = useRef(new Animated.Value(1)).current
  const headerAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start()
  }

  // Check network status
  useEffect(() => {
    const checkNetworkStatus = async () => {
      const online = await phaseService.isOnline()
      setIsOffline(!online)
    }

    checkNetworkStatus()
    const interval = setInterval(checkNetworkStatus, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadPhaseData()
  }, [id])

  const loadPhaseData = async () => {
    // Validate and extract phase ID
    let phaseId = id
    if (Array.isArray(phaseId)) {
      phaseId = phaseId[0]
    }
    
    if (!phaseId || typeof phaseId !== 'string' || phaseId.trim() === '') {
      showToast("Invalid phase ID", { type: "error" })
      return
    }

    try {
      setLoading(true)

      // Load phase details
      const phaseData = await phaseService.getPhaseById(phaseId)
      setPhase(phaseData)

      // Load tasks for this phase
      const tasksData = await taskService.getTasks({ phaseId })
      setTasks(tasksData)

      // Calculate task statistics
      const todo = tasksData.filter((task) => task.status === "todo").length
      const inProgress = tasksData.filter((task) => task.status === "inProgress").length
      const done = tasksData.filter((task) => task.status === "done").length

      setTaskStats({
        todo,
        inProgress,
        done,
        total: tasksData.length,
      })
    } catch (error) {
      showToast("Failed to load phase data",  { type: "error" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    loadPhaseData()
  }, [id])

  // Filter tasks based on active filter
  const filteredTasks = activeFilter === "all" ? tasks : tasks.filter((task) => task.status === activeFilter)

  const handleAddTask = () => {
    // Navigate to add task screen
    let phaseId = id
    if (Array.isArray(phaseId)) {
      phaseId = phaseId[0]
    }
    router.push({
      pathname: "/add-task",
      params: { projectId: phase?.project_id, phaseId }
    })
  }

  const handleBack = () => {
    router.back()
  }

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    Haptics.selectionAsync()
  }

  const handleEditPhase = () => {
    // Navigate to edit phase screen
    let phaseId = id
    if (Array.isArray(phaseId)) {
      phaseId = phaseId[0]
    }
    router.push({
      pathname: "/edit-phase/[id]",
      params: { id: phaseId }
    })
  }

  const handleDeletePhase = async () => {
    try {
      let phaseId = id
      if (Array.isArray(phaseId)) {
        phaseId = phaseId[0]
      }
      await phaseService.deletePhase(phaseId as string)
      showToast("Phase deleted successfully",{type: 'success'})
      router.replace(`/project/${phase?.project_id}`)
    } catch (error) {
      showToast("Failed to delete phase",  { type: "error" })
    }
  }

  const handleShowOptions = () => {
    Alert.alert("Phase Options", "What would you like to do?", [
      {
        text: "Edit Phase",
        onPress: handleEditPhase,
      },
      {
        text: "Delete Phase",
        onPress: () => setShowDeleteConfirm(true),
        style: "destructive",
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ])
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50'
      case 'in-progress':
        return '#FF9800'
      case 'on-hold':
        return '#F44336'
      case 'not-started':
        return '#9E9E9E'
      default:
        return theme.textDim
    }
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { 
      year: "numeric",
      month: "short", 
      day: "numeric" 
    })
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.phaseName, { color: theme.text }]}>Loading...</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      </View>
    )
  }

  if (!phase) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.phaseName, { color: theme.text }]}>Phase not found</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={theme.textDim} />
          <Text style={[styles.errorText, { color: theme.textDim }]}>Phase not found</Text>
          <TouchableOpacity onPress={handleBack} style={[styles.backToProjectsButton, { backgroundColor: theme.tint }]}>
            <Text style={styles.backToProjectsText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: theme.tintLight }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={theme.tint} />
          <Text style={[styles.offlineText, { color: theme.tint }]}>You're offline. Some features may be limited.</Text>
        </View>
      )}

      <Animated.View
        style={[
          styles.header,
          { borderBottomColor: theme.border },
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.phaseName, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
            {phase.name}
          </Text>
          <Text style={[styles.phaseDescription, { color: theme.textDim }]} numberOfLines={2} ellipsizeMode="tail">
            {phase.description || "No description provided"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleShowOptions}
          style={styles.optionsButton}
          accessibilityRole="button"
          accessibilityLabel="Phase options"
        >
          <Ionicons name="ellipsis-vertical" size={24} color={theme.text} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.tint]} />}
      >
        {/* Phase Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: theme.text }]}>Phase Progress</Text>
            <View style={[styles.progressPercentageContainer, { backgroundColor: theme.tintLight }]}>
              <Text style={[styles.progressPercentage, { color: theme.tint }]}>{phase.progress || 0}%</Text>
            </View>
          </View>
          <ProgressBar progress={typeof phase.progress === 'number' ? phase.progress : 0} />

          <View style={styles.statsContainer}>
            <View style={[styles.statItem, { backgroundColor: theme.cardBackground }]}>
              <Ionicons name="list-outline" size={20} color="#2196F3" />
              <Text style={[styles.statValue, { color: theme.text }]}>{taskStats.todo}</Text>
              <Text style={[styles.statLabel, { color: theme.textDim }]}>To Do</Text>
            </View>

            <View style={[styles.statItem, { backgroundColor: theme.cardBackground }]}>
              <Ionicons name="time-outline" size={20} color="#FF9800" />
              <Text style={[styles.statValue, { color: theme.text }]}>{taskStats.inProgress}</Text>
              <Text style={[styles.statLabel, { color: theme.textDim }]}>In Progress</Text>
            </View>

            <View style={[styles.statItem, { backgroundColor: theme.cardBackground }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text style={[styles.statValue, { color: theme.text }]}>{taskStats.done}</Text>
              <Text style={[styles.statLabel, { color: theme.textDim }]}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Phase Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="information-circle-outline" size={20} color={theme.textDim} />
            <Text style={[styles.detailLabel, { color: theme.textDim }]}>Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(phase.status) }]}>
              <Text style={styles.statusBadgeText}>
                {phase.status.replace('-', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="trending-up-outline" size={20} color={theme.textDim} />
            <Text style={[styles.detailLabel, { color: theme.textDim }]}>Weight:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{phase.weight}%</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="list-outline" size={20} color={theme.textDim} />
            <Text style={[styles.detailLabel, { color: theme.textDim }]}>Order:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{phase.order}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={theme.textDim} />
            <Text style={[styles.detailLabel, { color: theme.textDim }]}>Duration:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {formatDate(phase.start_date)} - {formatDate(phase.end_date)}
            </Text>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {["all", "todo", "inProgress", "done"].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  { backgroundColor: theme.cardBackground },
                  activeFilter === filter && { backgroundColor: theme.tint },
                ]}
                onPress={() => handleFilterChange(filter)}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: activeFilter === filter ? "#fff" : theme.text },
                  ]}
                >
                  {filter === "all" ? "All" : filter === "inProgress" ? "In Progress" : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tasks Section */}
        <View style={styles.tasksSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Tasks</Text>
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.tint }]}
                onPress={handleAddTask}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Task</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <TaskItem 
                key={task.$id} 
                task={{
                  id: task.$id,
                  title: task.title,
                  due_date: task.due_date,
                  priority: task.priority
                }} 
                status={task.status as "todo" | "inProgress" | "done"} 
              />
            ))
          ) : (
            <View style={styles.emptyTasksContainer}>
              <Ionicons name="list-outline" size={60} color={theme.textDim} />
              <Text style={[styles.emptyTasksText, { color: theme.textDim }]}>
                No {activeFilter !== "all" ? activeFilter : ""} tasks found
              </Text>
              <Text style={[styles.emptyTasksSubtext, { color: theme.textDim }]}>
                Tap the "Add Task" button to create a new task
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <VerifyAction
        visible={showDeleteConfirm}
        title="Delete Phase"
        message="Are you sure you want to delete this phase? This action cannot be undone and all associated tasks will be unassigned."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeletePhase}
        onCancel={() => setShowDeleteConfirm(false)}
        destructive={true}
      />

      <ConnectionStatus />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  phaseName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  phaseDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  optionsButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  progressContainer: {
    padding: 20,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  progressPercentageContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  statItem: {
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    minWidth: 80,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  detailsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    marginLeft: 8,
    marginRight: 8,
    minWidth: 60,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  tasksSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  emptyTasksContainer: {
    alignItems: "center",
    padding: 40,
    marginTop: 20,
  },
  emptyTasksText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptyTasksSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  backToProjectsButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToProjectsText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  offlineText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
}) 