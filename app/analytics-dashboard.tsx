"use client"

import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useColorScheme } from 'react-native'
import { useRouter } from 'expo-router'
import { MotiView } from 'moti'
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit'

import { analyticsService } from '@/services/analyticsService'
import { projectService } from '@/services/projectService'
import { useToast } from '@/contexts/ToastContext'
import Colors from '@/constants/Colors'
import { ProjectAnalytics, ProjectReport } from '@/types/appwrite'

interface AnalyticsDashboardScreenProps {
  projectId?: string
}

const screenWidth = Dimensions.get('window').width

export default function AnalyticsDashboardScreen({ projectId }: AnalyticsDashboardScreenProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? 'light']
  const router = useRouter()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<'overview' | 'time' | 'team' | 'reports'>('overview')
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(projectId || null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month')
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    loadData()
  }, [selectedProject, timeRange])

  // Check network status
  useEffect(() => {
    const checkNetworkStatus = async () => {
      let online = true
      if ('isOnline' in (projectService as any) && typeof (projectService as any).isOnline === 'function') {
        online = await (projectService as any).isOnline()
      }
      setIsOffline(!online)
    }
    checkNetworkStatus()
    const interval = setInterval(checkNetworkStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      if (selectedProject) {
        const analyticsData = await analyticsService.getProjectAnalytics(selectedProject)
        setAnalytics(analyticsData)
      } else {
        // Load all projects for overview
        const projectsData = await projectService.getProjects()
        setProjects(projectsData)
      }
    } catch (error) {
      showToast('Failed to load analytics data', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [selectedProject, timeRange, showToast])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [loadData])

  const generateBurndownChartData = () => {
    if (!analytics?.burndown_data) return null

    return {
      labels: analytics.burndown_data.map(point => 
        new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          data: analytics.burndown_data.map(point => point.remaining_tasks),
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          strokeWidth: 2
        },
        {
          data: analytics.burndown_data.map(point => point.ideal_remaining),
          color: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
          strokeWidth: 2,
          strokeDasharray: [5, 5]
        }
      ]
    }
  }

  const generateTimeDistributionData = () => {
    if (!analytics?.time_distribution) return null

    return {
      labels: analytics.time_distribution.map(item => item.category),
      data: analytics.time_distribution.map(item => item.hours)
    }
  }

  const generateTeamPerformanceData = () => {
    if (!analytics?.team_performance) return null

    return {
      labels: analytics.team_performance.map(member => member.user_name),
      datasets: [
        {
          data: analytics.team_performance.map(member => member.tasks_completed)
        }
      ]
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return theme.success
    if (percentage >= 60) return theme.warning
    return theme.error
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <Text style={[styles.loadingText, { color: theme.textDim }]}>Loading analytics...</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Offline Banner */}
      {isOffline && (
        <View style={{ backgroundColor: theme.tintLight, flexDirection: 'row', alignItems: 'center', padding: 8 }}>
          <Ionicons name="cloud-offline-outline" size={16} color={theme.tint} />
          <Text style={{ color: theme.tint, marginLeft: 8 }}>You're offline. Some features may be limited.</Text>
        </View>
      )}
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.text }]}>Analytics Dashboard</Text>
          <Text style={[styles.subtitle, { color: theme.textDim }]}>
            {selectedProject ? 'Project Analytics' : 'Overview'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: theme.tint }]}
          onPress={() => {
            // Export functionality would go here
            showToast('Export feature coming soon', { type: 'info' })
          }}
        >
          <Ionicons name="download-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </MotiView>

      {/* Project Selector */}
      {!projectId && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 200 }}
          style={styles.projectSelector}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.projectTab,
                { backgroundColor: theme.cardBackground },
                !selectedProject && { backgroundColor: theme.tint }
              ]}
              onPress={() => setSelectedProject(null)}
            >
              <Text style={[
                styles.projectTabText,
                !selectedProject ? { color: '#fff' } : { color: theme.text }
              ]}>
                Overview
              </Text>
            </TouchableOpacity>
              {projects.map((project) => (
                <TouchableOpacity
                  key={project.$id}
                  style={[
                    styles.projectTab,
                    { backgroundColor: theme.cardBackground },
                    selectedProject === project.$id && { backgroundColor: theme.tint }
                  ]}
                  onPress={() => setSelectedProject(project.$id)}
                >
                  <Text style={[
                    styles.projectTabText,
                    selectedProject === project.$id ? { color: '#fff' } : { color: theme.text }
                  ]}>
                    {project.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
        </MotiView>
      )}

      {/* Tab Navigation */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 300 }}
        style={styles.tabContainer}
      >
        <View style={[styles.tabBar, { backgroundColor: theme.cardBackground }]}>
          {['overview', 'time', 'team', 'reports'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab && { backgroundColor: theme.tint }
              ]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab ? { color: '#fff' } : { color: theme.text }
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </MotiView>

      {/* Time Range Selector */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 400 }}
        style={styles.timeRangeContainer}
      >
        <View style={[styles.timeRangeBar, { backgroundColor: theme.cardBackground }]}>
          {['week', 'month', 'quarter'].map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeRange === range && { backgroundColor: theme.tint }
              ]}
              onPress={() => setTimeRange(range as any)}
            >
              <Text style={[
                styles.timeRangeText,
                timeRange === range ? { color: '#fff' } : { color: theme.text }
              ]}>
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </MotiView>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'overview' && analytics && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 500 }}
          >
            {/* Key Metrics */}
            <View style={styles.metricsContainer}>
              <View style={[styles.metricCard, { backgroundColor: theme.cardBackground }]}>
                <View style={styles.metricHeader}>
                  <Ionicons name="checkmark-circle" size={24} color={theme.success} />
                  <Text style={[styles.metricLabel, { color: theme.textDim }]}>Completion Rate</Text>
                </View>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {analytics.total_tasks > 0 
                    ? Math.round((analytics.completed_tasks / analytics.total_tasks) * 100)
                    : 0}%
                </Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: theme.cardBackground }]}>
                <View style={styles.metricHeader}>
                  <Ionicons name="time" size={24} color={theme.tint} />
                  <Text style={[styles.metricLabel, { color: theme.textDim }]}>Time Efficiency</Text>
                </View>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {analytics.estimated_time > 0 
                    ? Math.round((analytics.total_time_spent / analytics.estimated_time) * 100)
                    : 0}%
                </Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: theme.cardBackground }]}>
                <View style={styles.metricHeader}>
                  <Ionicons name="speedometer" size={24} color={theme.warning} />
                  <Text style={[styles.metricLabel, { color: theme.textDim }]}>Velocity</Text>
                </View>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {analytics.velocity.toFixed(1)}
                </Text>
                <Text style={[styles.metricSubtext, { color: theme.textDim }]}>tasks/day</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: theme.cardBackground }]}>
                <View style={styles.metricHeader}>
                  <Ionicons name="people" size={24} color={theme.tint} />
                  <Text style={[styles.metricLabel, { color: theme.textDim }]}>Team Size</Text>
                </View>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {analytics.team_members}
                </Text>
              </View>
            </View>

            {/* Progress Overview */}
            <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Progress Overview</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressItem}>
                  <Text style={[styles.progressLabel, { color: theme.textDim }]}>Overall Progress</Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { 
                          width: `${analytics.progress_percentage}%`,
                          backgroundColor: getProgressColor(analytics.progress_percentage)
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.progressValue, { color: theme.text }]}>
                    {analytics.progress_percentage}%
                  </Text>
                </View>

                <View style={styles.progressItem}>
                  <Text style={[styles.progressLabel, { color: theme.textDim }]}>Phases Completed</Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { 
                          width: `${analytics.total_phases > 0 ? (analytics.phases_completed / analytics.total_phases) * 100 : 0}%`,
                          backgroundColor: theme.success
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.progressValue, { color: theme.text }]}>
                    {analytics.phases_completed}/{analytics.total_phases}
                  </Text>
                </View>
              </View>
            </View>

            {/* Burndown Chart */}
            {generateBurndownChartData() && (
              <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Burndown Chart</Text>
                <LineChart
                  data={generateBurndownChartData()!}
                  width={screenWidth - 80}
                  height={220}
                  chartConfig={{
                    backgroundColor: theme.cardBackground,
                    backgroundGradientFrom: theme.cardBackground,
                    backgroundGradientTo: theme.cardBackground,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: "6",
                      strokeWidth: "2",
                      stroke: theme.tint
                    }
                  }}
                  bezier
                  style={styles.chart}
                />
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.tint }]} />
                    <Text style={[styles.legendText, { color: theme.textDim }]}>Actual</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.textDim }]} />
                    <Text style={[styles.legendText, { color: theme.textDim }]}>Ideal</Text>
                  </View>
                </View>
              </View>
            )}
          </MotiView>
        )}

        {activeTab === 'time' && analytics && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 500 }}
          >
            {/* Time Summary */}
            <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Time Summary</Text>
              <View style={styles.timeSummary}>
                <View style={styles.timeItem}>
                  <Text style={[styles.timeLabel, { color: theme.textDim }]}>Total Time Spent</Text>
                  <Text style={[styles.timeValue, { color: theme.text }]}>
                    {formatTime(analytics.total_time_spent)}
                  </Text>
                </View>
                <View style={styles.timeItem}>
                  <Text style={[styles.timeLabel, { color: theme.textDim }]}>Estimated Time</Text>
                  <Text style={[styles.timeValue, { color: theme.text }]}>
                    {formatTime(analytics.estimated_time)}
                  </Text>
                </View>
                <View style={styles.timeItem}>
                  <Text style={[styles.timeLabel, { color: theme.textDim }]}>Efficiency</Text>
                  <Text style={[styles.timeValue, { color: getProgressColor(analytics.estimated_time > 0 ? (analytics.total_time_spent / analytics.estimated_time) * 100 : 0) }]}>
                    {analytics.estimated_time > 0 
                      ? Math.round((analytics.total_time_spent / analytics.estimated_time) * 100)
                      : 0}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Time Distribution Chart */}
            {generateTimeDistributionData() && (
              <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Time Distribution</Text>
                <PieChart
                  data={generateTimeDistributionData()!.labels.map((label, index) => ({
                    name: label,
                    population: generateTimeDistributionData()!.data[index],
                    color: [
                      theme.tint,
                      theme.success,
                      theme.warning,
                      theme.error,
                      theme.textDim
                    ][index % 5],
                    legendFontColor: theme.text,
                    legendFontSize: 12
                  }))}
                  width={screenWidth - 80}
                  height={220}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </View>
            )}
          </MotiView>
        )}

        {activeTab === 'team' && analytics && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 500 }}
          >
            {/* Team Performance Chart */}
            {generateTeamPerformanceData() && (
              <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Team Performance</Text>
                <BarChart
                  data={generateTeamPerformanceData()!}
                  width={screenWidth - 80}
                  height={220}
                  chartConfig={{
                    backgroundColor: theme.cardBackground,
                    backgroundGradientFrom: theme.cardBackground,
                    backgroundGradientTo: theme.cardBackground,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16
                    }
                  }}
                  style={styles.chart}
                />
              </View>
            )}

            {/* Team Members List */}
            <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Team Members</Text>
              {analytics.team_performance.map((member, index) => (
                <MotiView
                  key={member.user_id}
                  from={{ opacity: 0, translateX: -20 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ type: 'timing', duration: 500, delay: 600 + index * 100 }}
                  style={styles.teamMemberCard}
                >
                  <View style={styles.memberInfo}>
                    <View style={[styles.memberAvatar, { backgroundColor: theme.tintLight }]}>
                      <Text style={[styles.memberInitial, { color: theme.tint }]}>
                        {member.user_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberDetails}>
                      <Text style={[styles.memberName, { color: theme.text }]}>
                        {member.user_name}
                      </Text>
                      <Text style={[styles.memberStats, { color: theme.textDim }]}>
                        {member.tasks_completed} tasks • {formatTime(member.time_spent)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.memberMetrics}>
                    <Text style={[styles.memberEfficiency, { color: getProgressColor(member.efficiency_score) }]}>
                      {Math.round(member.efficiency_score)}%
                    </Text>
                    <Text style={[styles.memberEfficiencyLabel, { color: theme.textDim }]}>
                      Efficiency
                    </Text>
                  </View>
                </MotiView>
              ))}
            </View>
          </MotiView>
        )}

        {activeTab === 'reports' && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 500 }}
          >
            <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Generate Reports</Text>
              <Text style={[styles.sectionDescription, { color: theme.textDim }]}>
                Create detailed reports for your project analytics
              </Text>
              
              <View style={styles.reportButtons}>
                <TouchableOpacity
                  style={[styles.reportButton, { backgroundColor: theme.tint }]}
                  onPress={() => {
                    showToast('Report generation coming soon', { type: 'info' })
                  }}
                >
                  <Ionicons name="document-text" size={20} color="#fff" />
                  <Text style={[styles.reportButtonText, { color: '#fff' }]}>Progress Report</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.reportButton, { backgroundColor: theme.success }]}
                  onPress={() => {
                    showToast('Report generation coming soon', { type: 'info' })
                  }}
                >
                  <Ionicons name="time" size={20} color="#fff" />
                  <Text style={[styles.reportButtonText, { color: '#fff' }]}>Time Report</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.reportButton, { backgroundColor: theme.warning }]}
                  onPress={() => {
                    showToast('Report generation coming soon', { type: 'info' })
                  }}
                >
                  <Ionicons name="people" size={20} color="#fff" />
                  <Text style={[styles.reportButtonText, { color: '#fff' }]}>Team Report</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.reportButton, { backgroundColor: theme.error }]}
                  onPress={() => {
                    showToast('Report generation coming soon', { type: 'info' })
                  }}
                >
                  <Ionicons name="analytics" size={20} color="#fff" />
                  <Text style={[styles.reportButtonText, { color: '#fff' }]}>Comprehensive</Text>
                </TouchableOpacity>
              </View>
            </View>
          </MotiView>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  exportButton: {
    padding: 8,
    borderRadius: 8,
  },
  projectSelector: {
    padding: 20,
    paddingBottom: 10,
  },
  projectTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  projectTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeRangeContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  timeRangeBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeRangeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  metricSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  progressContainer: {
    gap: 16,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 14,
    width: 100,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
  },
  timeSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeItem: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  teamMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitial: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberStats: {
    fontSize: 12,
    marginTop: 2,
  },
  memberMetrics: {
    alignItems: 'center',
  },
  memberEfficiency: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberEfficiencyLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  reportButtons: {
    gap: 12,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}) 