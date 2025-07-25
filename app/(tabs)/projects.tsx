import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  TextInput,
  StatusBar,
} from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useRef, useState, useEffect, useCallback } from "react"
import { useColorScheme } from "react-native"
import * as Haptics from "expo-haptics"
import { useFocusEffect } from "expo-router"

import { ProjectCard } from "@/components/ProjectCard"
import { projectService } from "@/services/projectService"
import { useToast } from "@/contexts/ToastContext"
import { ConnectionStatus } from "@/components/ConnectionStatus"
import Colors from "@/constants/Colors"
import { phaseService } from "@/services/phaseService"
import { taskService } from "@/services/taskService"
import { teamService } from "@/services/teamService"
import { notificationService } from "@/services/notificationService"
import { getProjectSettings } from '@/services/projectSettingsService'

export default function ProjectsScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [projects, setProjects] = useState<any[]>([])
  const [filteredProjects, setFilteredProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [projectDetails, setProjectDetails] = useState<any>({})
  const [projectSettings, setProjectSettings] = useState<any>({})

  // Animation for the add button
  const scaleAnim = useRef(new Animated.Value(1)).current
  const searchBarAnim = useRef(new Animated.Value(0)).current
  const headerAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start()
  }

  const toggleSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (isSearching) {
      // Close search
      Animated.parallel([
        Animated.timing(searchBarAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setIsSearching(false)
        setSearchQuery("")
      })
    } else {
      // Open search
      setIsSearching(true)
      Animated.parallel([
        Animated.timing(searchBarAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(headerAnim, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start()
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  // Filter projects based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProjects(projects)
    } else {
      const filtered = projects.filter(project => 
        project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredProjects(filtered)
    }
  }, [projects, searchQuery])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await projectService.getProjects()
      
      // Ensure all projects have valid IDs
      const validProjects = data.filter(project => {
        const projectId = project.$id
        if (!projectId || projectId.trim() === '') {
          return false
        }
        return true
      })
      
      setProjects(validProjects)
    } catch (error) {
      showToast("Failed to load projects", { type: "error" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    loadProjects()
  }, [])

  const handleProjectPress = useCallback((project: any) => {
    // Validate project ID before navigation
    const projectId = project.$id
    if (!projectId || projectId.trim() === '') {
      showToast("Invalid project ID", { type: "error" })
      return
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    // Navigate to project details
    router.push(`/project/${projectId}`)
  }, [showToast])

  const handleNewProject = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // Navigate to new project screen
    router.push("/new-project")
  }

  const handleTeamManagement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    // Navigate to team management screen
    router.push("/team-management")
  }

  // Fetch additional project details (phases, tasks, members, notifications, progress)
  const fetchProjectDetails = async (projectId: string) => {
    const [phases, tasks, members, allNotifications, progress] = await Promise.all([
      phaseService.getPhasesByProject(projectId),
      taskService.getTasks({ projectId }),
      teamService.getTeamMembers(projectId),
      notificationService.getNotifications ? notificationService.getNotifications() : [],
      phaseService.calculateProjectProgress(projectId),
    ])
    const notifications = allNotifications.filter((n: any) => n.related_id === projectId)
    setProjectDetails((prev: any) => ({
      ...prev,
      [projectId]: { phases, tasks, members, notifications, progress }
    }))
  }

  // Fetch project settings for each project
  const fetchProjectSettings = async (projectId: string) => {
    try {
      const settings = await getProjectSettings(projectId)
      setProjectSettings((prev: any) => ({ ...prev, [projectId]: settings }))
    } catch (e) {
      // fallback: do nothing
    }
  }

  // Fetch details and settings for all projects when loaded
  useEffect(() => {
    filteredProjects.forEach((project) => {
      if (!projectDetails[project.$id]) fetchProjectDetails(project.$id)
      if (!projectSettings[project.$id]) fetchProjectSettings(project.$id)
    })
  }, [filteredProjects])

  // Enhanced Project Card
  const renderProjectCard = useCallback(({ item }: { item: any }) => {
    const projectId = item.$id
    if (!projectId) return null
    const details = projectDetails[projectId] || {}
    const settings = projectSettings[projectId] || {}
    const progress = details.progress || 0
    const members = details.members || []
    const phases = details.phases || []
    const tasks = details.tasks || []
    const notifications = details.notifications || []
    const unreadNotifications = notifications.filter((n: any) => !n.read).length
    // Advanced fields
    const priority = item.priority || 'Normal'
    const budget = item.budget ? `$${item.budget}` : 'N/A'
    const teamSize = members.length
    // Advanced settings
    const autoAssign = settings.auto_assign_tasks
    const requireTime = settings.require_time_tracking
    const enableBudget = settings.enable_budget_tracking
    return (
      <Pressable
        onPress={() => handleProjectPress(item)}
        style={({ pressed }) => [
          { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
        ]}
      >
        <View style={[styles.projectCardContainer, { backgroundColor: theme.cardBackground }]}> 
          {/* Top Row: Name, Settings Icon */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 18, color: theme.text }}>{item.name}</Text>
            <TouchableOpacity onPress={() => router.push(`/project/${projectId}`)} style={{ marginLeft: 8 }}>
              <Ionicons name="settings-outline" size={20} color={theme.tint} />
            </TouchableOpacity>
          </View>
          {/* Description */}
          {item.description ? (
            <Text style={{ color: theme.textDim, marginBottom: 4 }}>{item.description}</Text>
          ) : null}
          {/* Advanced Fields Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
              <Ionicons name="flag-outline" size={14} color={theme.warning} style={{ marginRight: 2 }} />
              <Text style={{ color: theme.text, fontSize: 12 }}>{priority}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
              <Ionicons name="cash-outline" size={14} color={theme.success} style={{ marginRight: 2 }} />
              <Text style={{ color: theme.text, fontSize: 12 }}>{budget}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
              <Ionicons name="people-outline" size={14} color={theme.tint} style={{ marginRight: 2 }} />
              <Text style={{ color: theme.text, fontSize: 12 }}>{teamSize} members</Text>
            </View>
          </View>
          {/* Advanced Settings Badges */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            {autoAssign && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8, backgroundColor: theme.success, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Ionicons name="person-add-outline" size={12} color="#fff" style={{ marginRight: 2 }} />
                <Text style={{ color: '#fff', fontSize: 11 }}>Auto-Assign</Text>
              </View>
            )}
            {requireTime && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8, backgroundColor: theme.warning, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Ionicons name="time-outline" size={12} color="#fff" style={{ marginRight: 2 }} />
                <Text style={{ color: '#fff', fontSize: 11 }}>Time Tracking</Text>
              </View>
            )}
            {enableBudget && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8, backgroundColor: theme.error, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Ionicons name="wallet-outline" size={12} color="#fff" style={{ marginRight: 2 }} />
                <Text style={{ color: '#fff', fontSize: 11 }}>Budget</Text>
              </View>
            )}
          </View>
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg} />
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
          {/* Members Avatars */}
          <View style={styles.membersRow}>
            {members.slice(0, 5).map((member: any, idx: number) => (
              <View key={member.id || idx} style={[styles.memberAvatar, { left: idx * -10, backgroundColor: theme.background }]}> 
                <Text style={styles.memberInitial}>{member.name?.[0] || '?'}</Text>
              </View>
            ))}
            {members.length > 5 && (
              <View style={[styles.memberAvatar, styles.memberAvatarMore, { left: 5 * -10, backgroundColor: theme.background }]}> 
                <Text style={styles.memberInitial}>+{members.length - 5}</Text>
              </View>
            )}
          </View>
          {/* Phases/Tasks Summary */}
          <View style={styles.phaseTaskRow}>
            <Text style={styles.phaseTaskText}>{phases.length} phases</Text>
            <Text style={styles.phaseTaskText}>{tasks.length} tasks</Text>
          </View>
          {/* Phases and Tasks */}
          <View style={{ marginTop: 8 }}>
            {phases.length === 0 ? (
              <Text style={{ color: theme.textDim, fontSize: 12 }}>No phases found for this project.</Text>
            ) : (
              phases.map((phase: any) => (
                <View key={phase.$id} style={{ marginBottom: 12, backgroundColor: theme.cardBackground, borderRadius: 10, padding: 8 }}>
                  <Text style={{ fontWeight: 'bold', color: theme.text }}>{phase.name}</Text>
                  <Text style={{ color: theme.textDim, fontSize: 12 }}>{phase.description}</Text>
                  <Text style={{ color: theme.textDim, fontSize: 12, marginBottom: 2 }}>Status: {phase.status}</Text>
                  <View style={{ height: 6, backgroundColor: '#eee', borderRadius: 3, marginBottom: 4 }}>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.tint, width: `${phase.progress || 0}%` }} />
                  </View>
                  {tasks.filter((task: any) => task.phase_id === phase.$id).length === 0 ? (
                    <Text style={{ color: theme.textDim, fontSize: 12, marginLeft: 8 }}>No tasks in this phase.</Text>
                  ) : (
                    tasks.filter((task: any) => task.phase_id === phase.$id).map((task: any) => (
                      <View key={task.$id} style={{ marginLeft: 8, marginBottom: 4, backgroundColor: theme.background, borderRadius: 6, padding: 6 }}>
                        <Text style={{ color: theme.text, fontWeight: '600' }}>{task.title}</Text>
                        <Text style={{ color: theme.textDim, fontSize: 12 }}>{task.status}</Text>
                      </View>
                    ))
                  )}
                </View>
              ))
            )}
          </View>
          {/* Quick Actions Bar */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push(`/analytics-dashboard?projectId=${projectId}`)}>
              <Ionicons name="analytics-outline" size={20} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push(`/workflow-automation?projectId=${projectId}`)}>
              <Ionicons name="git-branch-outline" size={20} color="#9C27B0" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push(`/time-tracking?projectId=${projectId}`)}>
              <Ionicons name="time-outline" size={20} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push(`/github-connect?projectId=${projectId}`)}>
              <Ionicons name="logo-github" size={20} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push(`/insights?projectId=${projectId}`)}>
              <Ionicons name="bulb-outline" size={20} color={theme.tint} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push(`/project/${projectId}/notifications`)}>
              <Ionicons name="notifications-outline" size={20} color={theme.error} />
              {unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadNotifications}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    )
  }, [projectDetails, projectSettings, theme, router])

  const renderEmptyState = () => {
    if (loading) return null
    
    if (searchQuery && filteredProjects.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={80} color={theme.textDim} />
          <Text style={[styles.emptyText, { color: theme.textDim }]}>No projects found</Text>
          <Text style={[styles.emptySubtext, { color: theme.textDim }]}>
            Try adjusting your search terms
          </Text>
        </View>
      )
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-open-outline" size={80} color={theme.textDim} />
        <Text style={[styles.emptyText, { color: theme.textDim }]}>No projects yet</Text>
        <Text style={[styles.emptySubtext, { color: theme.textDim }]}>
          Tap the "New Project" button to create your first project
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <Text style={[styles.title, { color: theme.text }]}>My Projects</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.cardBackground }]}
            onPress={toggleSearch}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isSearching ? "close" : "search"} 
              size={20} 
              color={theme.text} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.cardBackground }]}
            onPress={handleTeamManagement}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={20} color={theme.text} />
          </TouchableOpacity>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.newButton, { backgroundColor: theme.tint }]}
            onPress={handleNewProject}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.newButtonText}>New Project</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
      </Animated.View>

      <Animated.View 
        style={[
          styles.searchContainer, 
          { 
            height: searchBarAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 60],
            }),
            opacity: searchBarAnim,
          }
        ]}
      >
        <View style={[styles.searchInputContainer, { backgroundColor: theme.cardBackground }]}>
          <Ionicons name="search" size={20} color={theme.textDim} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search projects..."
            placeholderTextColor={theme.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={theme.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.textDim }]}>Loading projects...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.$id}
          renderItem={renderProjectCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={renderEmptyState}
          ListHeaderComponent={
            filteredProjects.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={[styles.listHeaderText, { color: theme.textDim }]}>
                  {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
              </Text>
            </View>
            ) : null
          }
        />
      )}

      <ConnectionStatus />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  newButton: {
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
  newButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    overflow: "hidden",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  listHeader: {
    marginBottom: 16,
  },
  listHeaderText: {
    fontSize: 14,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  projectCardContainer: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  progressBarContainer: {
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  progressBarBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  progressBarFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    zIndex: 1,
  },
  progressText: {
    position: 'absolute',
    right: 8,
    fontSize: 12,
    color: '#2196F3',
    fontWeight: 'bold',
    zIndex: 2,
  },
  membersRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 4,
    height: 32,
    alignItems: 'center',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
    position: 'relative',
    zIndex: 2,
  },
  memberAvatarMore: {
    backgroundColor: '#bbb',
  },
  memberInitial: {
    fontWeight: 'bold',
    color: '#333',
  },
  phaseTaskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 4,
  },
  phaseTaskText: {
    fontSize: 12,
    color: '#888',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  quickActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#e53935',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    zIndex: 3,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
})
