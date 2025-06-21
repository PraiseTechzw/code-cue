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
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 500 }}
        style={[styles.statCard, { backgroundColor: theme.cardBackground }]}
      >
        <Ionicons name="folder-outline" size={24} color={theme.tint} />
        <Text style={[styles.statValue, { color: theme.text }]}>{stats.totalProjects}</Text>
        <Text style={[styles.statLabel, { color: theme.textDim }]}>Projects</Text>
      </MotiView>

      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 500, delay: 100 }}
        style={[styles.statCard, { backgroundColor: theme.cardBackground }]}
      >
        <Ionicons name="checkmark-circle" size={24} color={theme.success} />
        <Text style={[styles.statValue, { color: theme.text }]}>{stats.completedTasks}</Text>
        <Text style={[styles.statLabel, { color: theme.textDim }]}>Completed</Text>
      </MotiView>

      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 500, delay: 200 }}
        style={[styles.statCard, { backgroundColor: theme.cardBackground }]}
      >
        <Ionicons name="trending-up" size={24} color={theme.warning} />
        <Text style={[styles.statValue, { color: theme.text }]}>{stats.productivityScore}%</Text>
        <Text style={[styles.statLabel, { color: theme.textDim }]}>Productivity</Text>
      </MotiView>

      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 500, delay: 300 }}
        style={[styles.statCard, { backgroundColor: theme.cardBackground }]}
      >
        <Ionicons name="alert-circle" size={24} color={theme.error} />
        <Text style={[styles.statValue, { color: theme.text }]}>{stats.overdueTasks}</Text>
        <Text style={[styles.statLabel, { color: theme.textDim }]}>Overdue</Text>
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
            <Text style={[styles.sectionTitle, { color: theme.text }]}>AI Insights Dashboard</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textDim }]}>
              Intelligent analysis of your projects and productivity patterns
            </Text>
            
            {/* Stats Cards */}
            {renderStatsCards()}
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.tint} />
                <Text style={[styles.loadingText, { color: theme.textDim }]}>
                  Generating insights...
                </Text>
              </View>
            ) : (
              <View style={styles.insightsContainer}>
                <Text style={[styles.insightsTitle, { color: theme.text }]}>
                  Recent Insights ({insights.length})
                </Text>
                <View style={styles.insightsList}>
                  {insights.map((insight, index) => renderInsightCard(insight, index))}
                </View>
              </View>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && { backgroundColor: theme.tint }
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tabScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
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
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
})
