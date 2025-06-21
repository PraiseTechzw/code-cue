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
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  Switch,
} from "react-native"
import { useState, useEffect, useRef, useCallback } from "react"
import { useLocalSearchParams, router } from "expo-router"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import * as Haptics from "expo-haptics"

import { TaskItem } from "@/components/TaskItem"
import { ProgressBar } from "@/components/ProgressBar"
import { projectService } from "@/services/projectService"
import { taskService } from "@/services/taskService"
import { phaseService } from "@/services/phaseService"
import { useToast } from "@/contexts/ToastContext"
import { ConnectionStatus } from "@/components/ConnectionStatus"
import { VerifyAction } from "@/components/VerifyAction"
import { PhaseCard } from "@/components/PhaseCard"
import Colors from "@/constants/Colors"
import { getProjectSettings, updateProjectSettings, createProjectSettings, ProjectSettings } from '@/services/projectSettingsService'

const allowedStatuses = ["active", "completed", "planning", "on-hold", "cancelled"] as const;
type StatusType = typeof allowedStatuses[number];

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [project, setProject] = useState<any>(null)
  const [phases, setPhases] = useState<any[]>([])
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
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
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
      const online = await projectService.isOnline()
      setIsOffline(!online)
    }

    checkNetworkStatus()
    const interval = setInterval(checkNetworkStatus, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadProjectData()
  }, [id])

  const loadProjectData = async () => {
    // Validate and extract project ID
    let projectId = id
    if (Array.isArray(projectId)) {
      projectId = projectId[0]
    }
    
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
      console.error('Invalid project ID:', id)
      showToast("Invalid project ID", { type: "error" })
      return
    }

    console.log('Loading project data for ID:', projectId)

    try {
      setLoading(true)

      // Load project details
      const projectData = await projectService.getProjectById(projectId)
      setProject(projectData)

      // Load phases for this project
      const phasesData = await phaseService.getPhasesByProject(projectId)
      setPhases(phasesData)

      // Load all tasks for this project
      const tasksData = await taskService.getTasksByProject(projectId)
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

      setSettingsName(typeof projectData?.name === 'string' ? projectData.name : "")
      setSettingsDescription(typeof projectData?.description === 'string' ? projectData.description : "")
      setSettingsStartDate(projectData?.start_date ? new Date(projectData.start_date) : null)
      setSettingsEndDate(projectData?.end_date ? new Date(projectData.end_date) : null)
      setSettingsPrivacy((projectData && 'privacy' in projectData && typeof projectData.privacy === 'string') ? projectData.privacy : "public")
      let statusVal = (projectData && 'status' in projectData && typeof projectData.status === 'string' && allowedStatuses.includes(projectData.status as StatusType)) ? projectData.status as StatusType : undefined
      setSettingsStatus(statusVal)
      setSettingsMembers(Array.isArray((projectData as any)?.members) ? (projectData as any).members : [])

      // Load advanced project settings
      await loadProjectSettings(projectId)
    } catch (error) {
      console.error("Error loading project data:", error)
      showToast("Failed to load project data",  { type: "error" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    loadProjectData()
  }, [id])

  // Filter tasks based on active filter
  const filteredTasks = activeFilter === "all" ? tasks : tasks.filter((task) => task.status === activeFilter)

  const handleAddTask = () => {
    // Navigate to add task screen
    let projectId = id
    if (Array.isArray(projectId)) {
      projectId = projectId[0]
    }
    router.push(`/add-task?projectId=${projectId}`)
  }

  const handleAddPhase = () => {
    // Navigate to add phase screen
    let projectId = id
    if (Array.isArray(projectId)) {
      projectId = projectId[0]
    }
    router.push({
      pathname: "/add-phase",
      params: { projectId }
    })
  }

  const handleBack = () => {
    router.back()
  }

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    Haptics.selectionAsync()
  }

  const handleEditProject = () => {
    // Navigate to edit project screen
    let projectId = id
    if (Array.isArray(projectId)) {
      projectId = projectId[0]
    }
    router.push(`/edit-project/${projectId}`)
  }

  const handleDeleteProject = async () => {
    try {
      let projectId = id
      if (Array.isArray(projectId)) {
        projectId = projectId[0]
      }
      await projectService.deleteProject(projectId as string)
      showToast("Project deleted successfully",{type: 'success'})
      router.replace("/projects")
    } catch (error) {
      console.error("Error deleting project:", error)
      showToast("Failed to delete project",  { type: "error" })
    }
  }

  const handlePhasePress = (phase: any) => {
    // Navigate to phase detail screen
    router.push({
      pathname: "/phase/[id]",
      params: { id: phase.$id }
    })
  }

  // Group tasks by phase
  const tasksByPhase = phases.map(phase => ({
    phase,
    tasks: tasks.filter(task => task.phase_id === phase.$id)
  }))

  // Tasks without phase
  const unassignedTasks = tasks.filter(task => !task.phase_id)

  const [showSettings, setShowSettings] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState("")
  const [settingsName, setSettingsName] = useState("")
  const [settingsDescription, setSettingsDescription] = useState("")
  const [settingsStartDate, setSettingsStartDate] = useState<Date | null>(null)
  const [settingsEndDate, setSettingsEndDate] = useState<Date | null>(null)
  const [settingsPrivacy, setSettingsPrivacy] = useState("public")
  const [settingsStatus, setSettingsStatus] = useState<StatusType | undefined>(undefined)
  const [settingsMembers, setSettingsMembers] = useState<any[]>([])
  const [settingsAutoAssign, setSettingsAutoAssign] = useState(false)
  const [settingsRequireTimeTracking, setSettingsRequireTimeTracking] = useState(false)
  const [settingsEnableBudgetTracking, setSettingsEnableBudgetTracking] = useState(false)
  const [settingsNotificationPrefs, setSettingsNotificationPrefs] = useState('')
  const [settingsWorkflow, setSettingsWorkflow] = useState('')
  const [settingsAccessControl, setSettingsAccessControl] = useState('')
  const [settingsId, setSettingsId] = useState<string | null>(null)

  // Load advanced project settings
  const loadProjectSettings = async (projectId: string) => {
    try {
      const settings = await getProjectSettings(projectId)
      if (settings) {
        setSettingsId(settings.$id)
        setSettingsAutoAssign(!!settings.auto_assign_tasks)
        setSettingsRequireTimeTracking(!!settings.require_time_tracking)
        setSettingsEnableBudgetTracking(!!settings.enable_budget_tracking)
        setSettingsNotificationPrefs(settings.notification_preferences || '')
        setSettingsWorkflow(settings.workflow_settings || '')
        setSettingsAccessControl(settings.access_control || '')
      }
    } catch (err) {
      // If not found, create default settings
      const defaults = {
        auto_assign_tasks: false,
        require_time_tracking: false,
        enable_budget_tracking: false,
        notification_preferences: '',
        workflow_settings: '',
        access_control: '',
      }
      const created = await createProjectSettings(projectId, defaults)
      if (created && created.$id) {
        setSettingsId(created.$id)
      }
      setSettingsAutoAssign(false)
      setSettingsRequireTimeTracking(false)
      setSettingsEnableBudgetTracking(false)
      setSettingsNotificationPrefs('')
      setSettingsWorkflow('')
      setSettingsAccessControl('')
    }
  }

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    setSettingsError("")
    try {
      // Update main project fields
      await projectService.updateProject(project.$id, {
        name: settingsName,
        description: settingsDescription,
        start_date: settingsStartDate ? settingsStartDate.toISOString() : null,
        end_date: settingsEndDate ? settingsEndDate.toISOString() : null,
        status: settingsStatus,
      })
      // Update advanced settings
      if (settingsId) {
        await updateProjectSettings(settingsId, {
          auto_assign_tasks: settingsAutoAssign,
          require_time_tracking: settingsRequireTimeTracking,
          enable_budget_tracking: settingsEnableBudgetTracking,
          notification_preferences: settingsNotificationPrefs,
          workflow_settings: settingsWorkflow,
          access_control: settingsAccessControl,
        })
      }
      setShowSettings(false)
      showToast('Project settings updated', { type: 'success' })
      loadProjectData()
    } catch (err) {
      setSettingsError('Failed to save settings. Please try again.')
    } finally {
      setSettingsSaving(false)
    }
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.projectName, { color: theme.text }]}>Loading...</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      </View>
    )
  }

  if (!project) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.projectName, { color: theme.text }]}>Project not found</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={theme.textDim} />
          <Text style={[styles.errorText, { color: theme.textDim }]}>Project not found</Text>
          <TouchableOpacity onPress={handleBack} style={[styles.backToProjectsButton, { backgroundColor: theme.tint }]}>
            <Text style={styles.backToProjectsText}>Back to Projects</Text>
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
          <Text style={[styles.projectName, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
            {project.name}
          </Text>
          <Text style={[styles.projectDescription, { color: theme.textDim }]} numberOfLines={2} ellipsizeMode="tail">
            {project.description || "No description provided"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          style={styles.settingsButton}
          accessibilityRole="button"
          accessibilityLabel="Project settings"
        >
          <Ionicons name="settings-outline" size={24} color={theme.tint} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.tint]} />}
      >
        {/* Project Info Card */}
        <View style={[styles.projectCardContainer, { backgroundColor: theme.cardBackground, borderRadius: 20, margin: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.projectName, { color: theme.text, fontSize: 22 }]} numberOfLines={1} ellipsizeMode="tail">{project.name}</Text>
              <Text style={[styles.projectDescription, { color: theme.textDim, fontSize: 14 }]} numberOfLines={2} ellipsizeMode="tail">{project.description || 'No description provided'}</Text>
            </View>
            <TouchableOpacity onPress={handleEditProject} style={{ marginLeft: 10, padding: 6, borderRadius: 16, backgroundColor: theme.background }}>
              <Ionicons name="settings-outline" size={22} color={theme.tint} />
            </TouchableOpacity>
          </View>
          {/* Members Avatars */}
          {project.members && project.members.length > 0 && (
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              {project.members.slice(0, 5).map((member: any, idx: number) => (
                <View key={member.id || idx} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', marginLeft: idx === 0 ? 0 : -10, borderWidth: 1, borderColor: theme.border }}>
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>{member.name?.[0] || '?'}</Text>
                </View>
              ))}
              {project.members.length > 5 && (
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', marginLeft: -10, borderWidth: 1, borderColor: theme.border }}>
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>+{project.members.length - 5}</Text>
                </View>
              )}
            </View>
          )}
          {/* Quick Actions Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={() => router.push(`/analytics-dashboard?projectId=${project.$id}`)}>
              <Ionicons name="analytics-outline" size={22} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={() => router.push(`/workflow-automation?projectId=${project.$id}`)}>
              <Ionicons name="git-branch-outline" size={22} color="#9C27B0" />
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={() => router.push(`/time-tracking?projectId=${project.$id}`)}>
              <Ionicons name="time-outline" size={22} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={() => router.push(`/github-connect?projectId=${project.$id}`)}>
              <Ionicons name="logo-github" size={22} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={() => router.push(`/insights?projectId=${project.$id}`)}>
              <Ionicons name="bulb-outline" size={22} color={theme.tint} />
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={() => router.push(`/project/${project.$id}/notifications`)}>
              <Ionicons name="notifications-outline" size={22} color={theme.error} />
              {project.notifications && project.notifications.filter((n: any) => !n.read).length > 0 && (
                <View style={{ position: 'absolute', top: -2, right: 10, backgroundColor: theme.error, borderRadius: 8, paddingHorizontal: 4, minWidth: 16, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{project.notifications.filter((n: any) => !n.read).length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        {/* End Project Info Card */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: theme.text }]}>Project Progress</Text>
            <View style={[styles.progressPercentageContainer, { backgroundColor: theme.tintLight }]}>
              <Text style={[styles.progressPercentage, { color: theme.tint }]}>{project.progress || 0}%</Text>
            </View>
          </View>
          <ProgressBar progress={typeof project.progress === 'number' ? project.progress : 0} />

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

        {/* Phases Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Project Phases</Text>
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.tint }]}
                onPress={handleAddPhase}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Phase</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {phases.length > 0 ? (
            phases.map((phase) => (
              <PhaseCard
                key={phase.$id}
                phase={phase}
                onPress={handlePhasePress}
                showTasks={true}
              />
            ))
          ) : (
            <View style={styles.emptyPhasesContainer}>
              <Ionicons name="layers-outline" size={60} color={theme.textDim} />
              <Text style={[styles.emptyPhasesText, { color: theme.textDim }]}>
                No phases yet
              </Text>
              <Text style={[styles.emptyPhasesSubtext, { color: theme.textDim }]}>
                Create phases to organize your project tasks
              </Text>
            </View>
          )}
        </View>

        {/* Tasks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>All Tasks</Text>
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
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone and all associated tasks will be deleted."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteProject}
        onCancel={() => setShowDeleteConfirm(false)}
        destructive={true}
      />

      <ConnectionStatus />

      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettings(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={{ backgroundColor: theme.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 480 }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, marginBottom: 8 }} />
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>Project Settings</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 4 }}>Project Name</Text>
              <TextInput
                style={{ backgroundColor: theme.background, color: theme.text, borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: theme.border }}
                value={settingsName}
                onChangeText={setSettingsName}
              />
              <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 4 }}>Description</Text>
              <TextInput
                style={{ backgroundColor: theme.background, color: theme.text, borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: theme.border, minHeight: 60, textAlignVertical: 'top' }}
                value={settingsDescription}
                onChangeText={setSettingsDescription}
                multiline
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 4 }}>Start Date</Text>
                  <TouchableOpacity style={{ backgroundColor: theme.background, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: theme.border }} onPress={() => setShowStartDatePicker(true)}>
                    <Text style={{ color: settingsStartDate ? theme.text : theme.textDim }}>{settingsStartDate ? settingsStartDate.toLocaleDateString() : 'Select date'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 4 }}>End Date</Text>
                  <TouchableOpacity style={{ backgroundColor: theme.background, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: theme.border }} onPress={() => setShowEndDatePicker(true)}>
                    <Text style={{ color: settingsEndDate ? theme.text : theme.textDim }}>{settingsEndDate ? settingsEndDate.toLocaleDateString() : 'Select date'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* Privacy and Status */}
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 4 }}>Privacy</Text>
                  <TouchableOpacity style={{ backgroundColor: theme.background, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: theme.border }} onPress={() => setSettingsPrivacy(settingsPrivacy === 'public' ? 'private' : 'public')}>
                    <Text style={{ color: theme.text }}>{settingsPrivacy === 'public' ? 'Public' : 'Private'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 4 }}>Status</Text>
                  <TouchableOpacity style={{ backgroundColor: theme.background, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: theme.border }} onPress={() => {
                    const nextStatus = settingsStatus === 'active' ? 'completed' : 'active';
                    setSettingsStatus(nextStatus as StatusType)
                  }}>
                    <Text style={{ color: theme.text }}>{settingsStatus === 'active' ? 'Active' : 'Completed'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* Members (display only, for now) */}
              <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 4 }}>Members</Text>
              <FlatList
                data={settingsMembers}
                keyExtractor={(item, idx) => item.id || idx.toString()}
                horizontal
                renderItem={({ item }) => (
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 1, borderColor: theme.border }}>
                    <Text style={{ color: theme.text, fontWeight: 'bold' }}>{item.name?.[0] || '?'}</Text>
                  </View>
                )}
                style={{ marginBottom: 16 }}
              />
              {/* Advanced Settings */}
              <View style={{ marginTop: 16 }}>
                <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 4 }}>Advanced Settings</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ flex: 1, color: theme.text }}>Auto-assign Tasks</Text>
                  <Switch value={settingsAutoAssign} onValueChange={setSettingsAutoAssign} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ flex: 1, color: theme.text }}>Require Time Tracking</Text>
                  <Switch value={settingsRequireTimeTracking} onValueChange={setSettingsRequireTimeTracking} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ flex: 1, color: theme.text }}>Enable Budget Tracking</Text>
                  <Switch value={settingsEnableBudgetTracking} onValueChange={setSettingsEnableBudgetTracking} />
                </View>
                <Text style={{ color: theme.text, marginBottom: 4 }}>Notification Preferences</Text>
                <TextInput
                  style={{ backgroundColor: theme.background, borderRadius: 8, borderWidth: 1, borderColor: theme.border, color: theme.text, marginBottom: 8, padding: 8 }}
                  value={settingsNotificationPrefs}
                  onChangeText={setSettingsNotificationPrefs}
                  placeholder="e.g. all, mentions, none"
                  placeholderTextColor={theme.textDim}
                />
                <Text style={{ color: theme.text, marginBottom: 4 }}>Workflow Settings</Text>
                <TextInput
                  style={{ backgroundColor: theme.background, borderRadius: 8, borderWidth: 1, borderColor: theme.border, color: theme.text, marginBottom: 8, padding: 8 }}
                  value={settingsWorkflow}
                  onChangeText={setSettingsWorkflow}
                  placeholder="Custom workflow JSON or description"
                  placeholderTextColor={theme.textDim}
                />
                <Text style={{ color: theme.text, marginBottom: 4 }}>Access Control</Text>
                <TextInput
                  style={{ backgroundColor: theme.background, borderRadius: 8, borderWidth: 1, borderColor: theme.border, color: theme.text, marginBottom: 8, padding: 8 }}
                  value={settingsAccessControl}
                  onChangeText={setSettingsAccessControl}
                  placeholder="e.g. public, private, team-only"
                  placeholderTextColor={theme.textDim}
                />
              </View>
              {/* Error message */}
              {settingsError ? <Text style={{ color: theme.error, marginBottom: 8 }}>{settingsError}</Text> : null}
              {/* Save/Delete/Archive Buttons */}
              <TouchableOpacity
                style={{ backgroundColor: theme.tint, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12, opacity: settingsSaving ? 0.5 : 1 }}
                onPress={handleSaveSettings}
                disabled={settingsSaving}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{settingsSaving ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: theme.error, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 }}
                onPress={async () => {
                  setSettingsSaving(true)
                  setSettingsError("")
                  try {
                    await projectService.deleteProject(project.$id)
                    setShowSettings(false)
                    router.replace('/projects')
                  } catch (e) {
                    setSettingsError("Failed to delete project. Please try again.")
                  } finally {
                    setSettingsSaving(false)
                  }
                }}
                disabled={settingsSaving}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Delete Project</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: theme.background, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}
                onPress={() => setShowSettings(false)}
              >
                <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  offlineText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  optionsButton: {
    padding: 4,
  },
  projectName: {
    fontSize: 22,
    fontWeight: "bold",
  },
  projectDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  progressContainer: {
    padding: 20,
    paddingBottom: 10,
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
    borderRadius: 16,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  statItem: {
    width: "30%",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  filterContainer: {
    paddingHorizontal: 16,
  },
  filterButton: {
    padding: 10,
    marginRight: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterText: {
    fontSize: 14,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  emptyPhasesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 40,
  },
  emptyPhasesText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: "600",
  },
  emptyPhasesSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  content: {
    flex: 1,
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
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  backToProjectsButton: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backToProjectsText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyTasksContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 40,
  },
  emptyTasksText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: "600",
  },
  emptyTasksSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  projectCardContainer: {
    margin: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsButton: {
    padding: 4,
  },
})
