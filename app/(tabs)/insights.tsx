"use client"

import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { useColorScheme } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import Colors from '@/constants/Colors'
import { MotiView } from 'moti'
import { aiService, Insight } from '@/services/aiService'
import { projectService } from '@/services/projectService'
import { taskService } from '@/services/taskService'
import { useToast } from '@/contexts/ToastContext'
import { InsightCard } from '@/components/InsightCard'

export default function InsightsScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? 'light']
  const [activeTab, setActiveTab] = useState('overview')
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    productivityScore: 0
  })
  const [productivityTips, setProductivityTips] = useState<any[]>([])
  const { showToast } = useToast()

  const tabs = [
    { id: 'overview', label: 'AI Insights', icon: 'bulb-outline' },
    { id: 'team', label: 'Team', icon: 'people-outline' },
    { id: 'analytics', label: 'Analytics', icon: 'analytics-outline' },
    { id: 'workflow', label: 'Workflow', icon: 'git-branch-outline' },
  ]

  useEffect(() => {
    loadInsights()
  }, [])

  const loadInsights = async () => {
    try {
      setLoading(true)
      const projects = await projectService.getProjects()
      const tasks = await taskService.getTasks()
      const aiInsights = await aiService.generateInsights(projects, tasks)
      const tips = await aiService.getProductivityTips()
      setInsights(aiInsights)
      setProductivityTips(tips)
      
      // Calculate stats
      const now = new Date()
      const completedTasks = tasks.filter(task => task.status === 'done').length
      const overdueTasks = tasks.filter(task => 
        task.due_date && new Date(task.due_date) < now && task.status !== 'done'
      ).length
      
      const productivityScore = projects.length > 0 
        ? Math.round((completedTasks / Math.max(tasks.length, 1)) * 100)
        : 0

      setStats({
        totalProjects: projects.length,
        totalTasks: tasks.length,
        completedTasks,
        overdueTasks,
        productivityScore
      })
    } catch (error) {
      console.error('Error loading insights:', error)
      showToast('Failed to load insights', { type: 'error' })
      // Load fallback insights
      setInsights(aiService.getFallbackInsights())
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadInsights()
    setRefreshing(false)
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'suggestion': return <Ionicons name="bulb-outline" size={24} color="#4CAF50" />
      case 'alert': return <Ionicons name="warning-outline" size={24} color="#FF9800" />
      case 'productivity': return <Ionicons name="trending-up-outline" size={24} color="#2196F3" />
      case 'analytics': return <Ionicons name="analytics-outline" size={24} color="#9C27B0" />
      default: return <Ionicons name="information-circle-outline" size={24} color={theme.tint} />
    }
  }

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <MotiView
        from={{ opacity: 0, scale: 0.9, translateY: 20 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600 }}
        style={[styles.statCard, { backgroundColor: theme.cardBackground }]}
      >
        <View style={[styles.statIconContainer, { backgroundColor: `${theme.tint}20` }]}>
          <Ionicons name="folder-outline" size={28} color={theme.tint} />
        </View>
        <Text style={[styles.statValue, { color: theme.text }]}>{stats.totalProjects}</Text>
        <Text style={[styles.statLabel, { color: theme.textDim }]}>Projects</Text>
        <View style={[styles.statProgress, { backgroundColor: `${theme.tint}30` }]}>
          <View style={[styles.statProgressFill, { backgroundColor: theme.tint, width: '100%' }]} />
        </View>
      </MotiView>

      <MotiView
        from={{ opacity: 0, scale: 0.9, translateY: 20 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: 150 }}
        style={[styles.statCard, { backgroundColor: theme.cardBackground }]}
      >
        <View style={[styles.statIconContainer, { backgroundColor: `${theme.success}20` }]}>
          <Ionicons name="checkmark-circle" size={28} color={theme.success} />
        </View>
        <Text style={[styles.statValue, { color: theme.text }]}>{stats.completedTasks}</Text>
        <Text style={[styles.statLabel, { color: theme.textDim }]}>Completed</Text>
        <View style={[styles.statProgress, { backgroundColor: `${theme.success}30` }]}>
          <View style={[styles.statProgressFill, { backgroundColor: theme.success, width: `${stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0}%` }]} />
        </View>
      </MotiView>

      <MotiView
        from={{ opacity: 0, scale: 0.9, translateY: 20 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: 300 }}
        style={[styles.statCard, { backgroundColor: theme.cardBackground }]}
      >
        <View style={[styles.statIconContainer, { backgroundColor: `${theme.warning}20` }]}>
          <Ionicons name="trending-up" size={28} color={theme.warning} />
        </View>
        <Text style={[styles.statValue, { color: theme.text }]}>{stats.productivityScore}%</Text>
        <Text style={[styles.statLabel, { color: theme.textDim }]}>Productivity</Text>
        <View style={[styles.statProgress, { backgroundColor: `${theme.warning}30` }]}>
          <View style={[styles.statProgressFill, { backgroundColor: theme.warning, width: `${stats.productivityScore}%` }]} />
        </View>
      </MotiView>

      <MotiView
        from={{ opacity: 0, scale: 0.9, translateY: 20 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: 450 }}
        style={[styles.statCard, { backgroundColor: theme.cardBackground }]}
      >
        <View style={[styles.statIconContainer, { backgroundColor: `${theme.error}20` }]}>
          <Ionicons name="alert-circle" size={28} color={theme.error} />
        </View>
        <Text style={[styles.statValue, { color: theme.text }]}>{stats.overdueTasks}</Text>
        <Text style={[styles.statLabel, { color: theme.textDim }]}>Overdue</Text>
        <View style={[styles.statProgress, { backgroundColor: `${theme.error}30` }]}>
          <View style={[styles.statProgressFill, { backgroundColor: theme.error, width: stats.overdueTasks > 0 ? '100%' : '0%' }]} />
        </View>
      </MotiView>
    </View>
  )

  const renderInsightCard = (insight: Insight, index: number) => (
    <MotiView
      key={insight.id}
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500, delay: index * 100 }}
    >
      <InsightCard
        insight={{
          ...insight,
          icon: getInsightIcon(insight.type)
        }}
      />
    </MotiView>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500 }}
            style={styles.contentContainer}
          >
            {/* Futuristic Header */}
            <MotiView
              from={{ opacity: 0, translateY: -20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 600 }}
              style={styles.futuristicHeader}
            >
              <View style={[styles.headerGlow, { backgroundColor: `${theme.tint}20` }]} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>AI Insights Dashboard</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textDim }]}>
                Intelligent analysis of your projects and productivity patterns
              </Text>
            </MotiView>
            
            {/* Stats Cards with better spacing */}
            <View style={styles.statsWrapper}>
              {renderStatsCards()}
            </View>
            
            {loading ? (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 500 }}
                style={styles.loadingContainer}
              >
                <View style={[styles.loadingSpinner, { borderColor: `${theme.tint}30`, borderTopColor: theme.tint }]} />
                <Text style={[styles.loadingText, { color: theme.textDim }]}>
                  Generating insights...
                </Text>
              </MotiView>
            ) : (
              <MotiView
                from={{ opacity: 0, translateY: 30 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 600, delay: 300 }}
                style={styles.insightsContainer}
              >
                <View style={styles.insightsHeader}>
                  <Text style={[styles.insightsTitle, { color: theme.text }]}>
                    Recent Insights ({insights.length})
                  </Text>
                  <View style={[styles.insightsBadge, { backgroundColor: `${theme.tint}20` }]}>
                    <Text style={[styles.insightsBadgeText, { color: theme.tint }]}>AI Powered</Text>
                  </View>
                </View>
                <View style={styles.insightsList}>
                  {insights.map((insight, index) => renderInsightCard(insight, index))}
                </View>
              </MotiView>
            )}
          </MotiView>
        )

      case 'team':
        return (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500 }}
            style={styles.contentContainer}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Team Insights</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textDim }]}>
              Analyze team performance and collaboration patterns
            </Text>
            
            <View style={styles.featureGrid}>
              <TouchableOpacity
                style={[styles.featureCard, { backgroundColor: theme.cardBackground }]}
                onPress={() => router.push('/team-management')}
              >
                <Ionicons name="people-outline" size={32} color={theme.tint} />
                <Text style={[styles.featureTitle, { color: theme.text }]}>Team Management</Text>
                <Text style={[styles.featureSubtitle, { color: theme.textDim }]}>
                  Manage team members and roles
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.featureCard, { backgroundColor: theme.cardBackground }]}
                onPress={() => router.push('/analytics-dashboard')}
              >
                <Ionicons name="analytics-outline" size={32} color="#2196F3" />
                <Text style={[styles.featureTitle, { color: theme.text }]}>Team Analytics</Text>
                <Text style={[styles.featureSubtitle, { color: theme.textDim }]}>
                  View team performance metrics
                </Text>
              </TouchableOpacity>
            </View>
          </MotiView>
        )

      case 'analytics':
        return (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500 }}
            style={styles.contentContainer}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Analytics Dashboard</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textDim }]}>
              Detailed project analytics and performance metrics
            </Text>
            
            <View style={styles.featureGrid}>
              <TouchableOpacity
                style={[styles.featureCard, { backgroundColor: theme.cardBackground }]}
                onPress={() => router.push('/analytics-dashboard')}
              >
                <Ionicons name="analytics-outline" size={32} color="#2196F3" />
                <Text style={[styles.featureTitle, { color: theme.text }]}>Project Analytics</Text>
                <Text style={[styles.featureSubtitle, { color: theme.textDim }]}>
                  View detailed project metrics
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.featureCard, { backgroundColor: theme.cardBackground }]}
                onPress={() => router.push('/time-tracking')}
              >
                <Ionicons name="time-outline" size={32} color="#4CAF50" />
                <Text style={[styles.featureTitle, { color: theme.text }]}>Time Analytics</Text>
                <Text style={[styles.featureSubtitle, { color: theme.textDim }]}>
                  Track time and productivity
                </Text>
              </TouchableOpacity>
            </View>
          </MotiView>
        )

      case 'workflow':
        return (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500 }}
            style={styles.contentContainer}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Workflow Automation</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textDim }]}>
              Automate and optimize your project workflows
            </Text>
            
            <View style={styles.featureGrid}>
              <TouchableOpacity
                style={[styles.featureCard, { backgroundColor: theme.cardBackground }]}
                onPress={() => router.push('/workflow-automation')}
              >
                <Ionicons name="git-branch-outline" size={32} color="#9C27B0" />
                <Text style={[styles.featureTitle, { color: theme.text }]}>Workflow Rules</Text>
                <Text style={[styles.featureSubtitle, { color: theme.textDim }]}>
                  Set up automated workflows
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.featureCard, { backgroundColor: theme.cardBackground }]}
                onPress={() => router.push('/github-connect')}
              >
                <Ionicons name="logo-github" size={32} color="#333" />
                <Text style={[styles.featureTitle, { color: theme.text }]}>GitHub Integration</Text>
                <Text style={[styles.featureSubtitle, { color: theme.textDim }]}>
                  Connect with GitHub workflows
                </Text>
              </TouchableOpacity>
            </View>
          </MotiView>
        )

      default:
        return null
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Top Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.tabBackground, { backgroundColor: `${theme.tint}10` }]} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && { 
                  backgroundColor: theme.tint,
                  shadowColor: theme.tint,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.id ? '#fff' : theme.textDim}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab.id ? '#fff' : theme.textDim }
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tabBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    margin: 8,
  },
  tabScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  insightsContainer: {
    gap: 16,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  insightsList: {
    gap: 16,
  },
  insightCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightMeta: {
    marginLeft: 12,
  },
  insightType: {
    fontSize: 14,
    fontWeight: '600',
  },
  insightTime: {
    fontSize: 12,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  featureGrid: {
    gap: 16,
  },
  featureCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  featureSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statProgress: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  statProgressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 3,
  },
  futuristicHeader: {
    position: 'relative',
    marginBottom: 24,
  },
  headerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    opacity: 0.5,
  },
  statsWrapper: {
    marginBottom: 24,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderWidth: 4,
    borderRadius: 20,
    borderColor: 'rgba(0,0,0,0.1)',
    borderTopColor: 'rgba(0,0,0,0.2)',
    marginBottom: 12,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightsBadge: {
    padding: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  insightsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
})
