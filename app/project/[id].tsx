"use client"

import React, { useEffect, useState, useRef } from "react"
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  RefreshControl,
  Share,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import { format } from "date-fns"

import { projectService } from "@/services/projectService"
import { taskService } from "@/services/taskService"
import { useToast } from "@/contexts/ToastContext"
import { useAuth } from "@/contexts/AuthContext"
import Colors from "@/constants/Colors"
import { ProgressBar } from "@/components/ProgressBar"
import { TaskList } from "@/components/TaskList"
import { TeamMemberList } from "@/components/TeamMemberList"
import { VerifyAction } from "@/components/VerifyAction"
import { ProjectActivity } from "@/components/ProjectActivity"

interface ProjectDetails {
  id: string
  name: string
  description: string
  progress: number
  status: "active" | "completed" | "archived"
  priority: "low" | "medium" | "high"
  dueDate?: string
  startDate: string
  owner_id: string
  team_members: Array<{
    id: string
    name: string
    avatar_url?: string
    role: string
  }>
  tasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate?: string
    completed?: boolean
    assignee?: {
      id: string
      name: string
      avatar_url?: string
    }
  }>
  activity: Array<{
    id: string
    type: string
    description: string
    user: {
      name: string
      avatar_url?: string
    }
    timestamp: string
  }>
}

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()
  const { user } = useAuth()

  const [project, setProject] = useState<ProjectDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [selectedTab, setSelectedTab] = useState<"tasks" | "team" | "activity">("tasks")
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0
  })

  // Animations
  const headerOpacity = useRef(new Animated.Value(0)).current
  const contentScale = useRef(new Animated.Value(0.95)).current

  useEffect(() => {
    loadProject()
    animateContent()
  }, [id])

  const animateContent = () => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(contentScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const loadProject = async () => {
    try {
      setLoading(true)
      const data = await projectService.getProjectById(id as string)
      setProject(data)
      calculateTaskStats(data.tasks)
    } catch (error) {
      console.error("Error loading project:", error)
      showToast("Failed to load project details", { type: "error" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const calculateTaskStats = (tasks: ProjectDetails["tasks"]) => {
    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === "done").length,
      inProgress: tasks.filter(t => t.status === "inProgress").length,
      overdue: tasks.filter(t => {
        const dueDate = new Date(t.dueDate as string)
        return !t.completed && dueDate < new Date()
      }).length
    }
    setTaskStats(stats)
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadProject()
  }

  const handleBack = () => {
    router.back()
  }

  const handleEdit = () => {
    router.push(`/edit-project/${id}`)
  }

  const handleShare = async () => {
    try {
      await Share.share({
        title: project?.name,
        message: `Check out the project "${project?.name}": Progress: ${project?.progress}%`,
      })
    } catch (error) {
      console.error("Error sharing project:", error)
    }
  }

  const handleArchive = async () => {
    if (!project) return
    try {
      await projectService.updateProject(project.id, { status: "archived" })
      showToast("Project archived successfully", { type: "success" })
      router.back()
    } catch (error) {
      console.error("Error archiving project:", error)
      showToast("Failed to archive project", { type: "error" })
    }
  }

  const handleDelete = async () => {
    if (!project) return
    try {
      await projectService.deleteProject(project.id)
      showToast("Project deleted successfully", { type: "success" })
      router.back()
    } catch (error) {
      console.error("Error deleting project:", error)
      showToast("Failed to delete project", { type: "error" })
    }
  }

  const handleAddTask = () => {
    router.push(`/add-task?projectId=${id}`)
  }

  const handleAddMember = () => {
    router.push({
      pathname: "/add-team-member",
      params: { projectId: id }
    })
  }

  const renderTaskStats = () => (
    <View style={styles.statsContainer}>
      <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.statValue, { color: theme.text }]}>{taskStats.total}</Text>
        <Text style={[styles.statLabel, { color: theme.textDim }]}>Total Tasks</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.statValue, { color: theme.success }]}>{taskStats.completed}</Text>
        <Text style={[styles.statLabel, { color: theme.textDim }]}>Completed</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.statValue, { color: theme.warning }]}>{taskStats.inProgress}</Text>
        <Text style={[styles.statLabel, { color: theme.textDim }]}>In Progress</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.statValue, { color: theme.error }]}>{taskStats.overdue}</Text>
        <Text style={[styles.statLabel, { color: theme.textDim }]}>Overdue</Text>
      </View>
    </View>
  )

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, selectedTab === "tasks" && { borderBottomColor: theme.tint }]}
        onPress={() => setSelectedTab("tasks")}
      >
        <Ionicons
          name={selectedTab === "tasks" ? "list" : "list-outline"}
          size={20}
          color={selectedTab === "tasks" ? theme.tint : theme.textDim}
        />
        <Text style={[styles.tabText, { color: selectedTab === "tasks" ? theme.tint : theme.textDim }]}>
          Tasks
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, selectedTab === "team" && { borderBottomColor: theme.tint }]}
        onPress={() => setSelectedTab("team")}
      >
        <Ionicons
          name={selectedTab === "team" ? "people" : "people-outline"}
          size={20}
          color={selectedTab === "team" ? theme.tint : theme.textDim}
        />
        <Text style={[styles.tabText, { color: selectedTab === "team" ? theme.tint : theme.textDim }]}>
          Team
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, selectedTab === "activity" && { borderBottomColor: theme.tint }]}
        onPress={() => setSelectedTab("activity")}
      >
        <Ionicons
          name={selectedTab === "activity" ? "time" : "time-outline"}
          size={20}
          color={selectedTab === "activity" ? theme.tint : theme.textDim}
        />
        <Text style={[styles.tabText, { color: selectedTab === "activity" ? theme.tint : theme.textDim }]}>
          Activity
        </Text>
      </TouchableOpacity>
    </View>
  )

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    )
  }

  if (!project) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color={theme.error} />
        <Text style={[styles.errorText, { color: theme.text }]}>Project not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={[styles.backButtonText, { color: theme.tint }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
              <Ionicons name="share-outline" size={24} color={theme.text} />
            </TouchableOpacity>
            {project.owner_id === user?.id && (
              <>
                <TouchableOpacity onPress={handleEdit} style={styles.actionButton}>
                  <Ionicons name="create-outline" size={24} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowArchiveConfirm(true)} style={styles.actionButton}>
                  <Ionicons name="archive-outline" size={24} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDeleteConfirm(true)} style={styles.actionButton}>
                  <Ionicons name="trash-outline" size={24} color={theme.error} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.projectInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.projectName, { color: theme.text }]}>{project.name}</Text>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(project.priority, theme) + "20" },
              ]}
            >
              <Text style={[styles.priorityText, { color: getPriorityColor(project.priority, theme) }]}>
                {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
              </Text>
            </View>
          </View>

          <Text style={[styles.projectDescription, { color: theme.textDim }]}>{project.description}</Text>

          <View style={styles.projectMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={theme.textDim} />
              <Text style={[styles.metaText, { color: theme.textDim }]}>
                Started {format(new Date(project.startDate), "MMM d, yyyy")}
              </Text>
            </View>
            {project.dueDate && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={theme.textDim} />
                <Text style={[styles.metaText, { color: theme.textDim }]}>
                  Due {format(new Date(project.dueDate), "MMM d, yyyy")}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.progressSection}>
            <ProgressBar progress={project.progress} />
            <Text style={[styles.progressText, { color: theme.textDim }]}>{project.progress}% complete</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.content, { transform: [{ scale: contentScale }] }]}>
        {renderTaskStats()}
        {renderTabs()}

        <ScrollView
          style={styles.tabContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.tint]} />
          }
        >
          {selectedTab === "tasks" && (
            <View style={styles.tasksContainer}>
              <TaskList
                tasks={project.tasks}
                onTaskPress={(taskId) => router.push(`/task/${taskId}`)}
                showAssignee
              />
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.tint }]}
                onPress={handleAddTask}
              >
                <Ionicons name="add" size={24} color="#fff" />
                <Text style={styles.addButtonText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedTab === "team" && (
            <View style={styles.teamContainer}>
              <TeamMemberList
                members={project.team_members}
                onMemberPress={(memberId) => router.push({
                  pathname: "/profile",
                  params: { id: memberId }
                })}
              />
              {project.owner_id === user?.id && (
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: theme.tint }]}
                  onPress={handleAddMember}
                >
                  <Ionicons name="person-add" size={24} color="#fff" />
                  <Text style={styles.addButtonText}>Add Member</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {selectedTab === "activity" && (
            <View style={styles.activityContainer}>
              <ProjectActivity activities={project.activity} />
            </View>
          )}
        </ScrollView>
      </Animated.View>

      <VerifyAction
        visible={showDeleteConfirm}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        confirmText="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <VerifyAction
        visible={showArchiveConfirm}
        title="Archive Project"
        message="Are you sure you want to archive this project? You can unarchive it later."
        confirmText="Archive"
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveConfirm(false)}
      />
    </View>
  )
}

const getPriorityColor = (priority: string, theme: any) => {
  switch (priority) {
    case "high":
      return theme.error
    case "medium":
      return theme.warning
    case "low":
      return theme.success
    default:
      return theme.textDim
  }
}

const styles = StyleSheet.create({
  container: {
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
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    padding: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  projectInfo: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  projectName: {
    fontSize: 24,
    fontWeight: "bold",
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  projectDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  projectMeta: {
    flexDirection: "row",
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  metaText: {
    fontSize: 14,
    marginLeft: 4,
  },
  progressSection: {
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    padding: 16,
    paddingTop: 0,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  tabContent: {
    flex: 1,
  },
  tasksContainer: {
    flex: 1,
    padding: 16,
  },
  teamContainer: {
    flex: 1,
    padding: 16,
  },
  activityContainer: {
    flex: 1,
    padding: 16,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
})
