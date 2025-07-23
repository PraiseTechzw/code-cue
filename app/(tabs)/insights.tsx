"use client"

import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator, RefreshControl, Modal } from 'react-native'
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
  const [drawerVisible, setDrawerVisible] = useState(false)
  const { showToast } = useToast()
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    loadInsights()
  }, [])

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Offline Banner */}
      {isOffline && (
        <View style={{ backgroundColor: theme.tintLight, flexDirection: 'row', alignItems: 'center', padding: 8 }}>
          <Ionicons name="cloud-offline-outline" size={16} color={theme.tint} />
          <Text style={{ color: theme.tint, marginLeft: 8 }}>You're offline. Some features may be limited.</Text>
        </View>
      )}
      
      {/* Header with Drawer Button */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>AI Insights</Text>
        <TouchableOpacity
          style={[styles.drawerButton, { backgroundColor: theme.cardBackground }]}
          onPress={() => setDrawerVisible(true)}
        >
          <Ionicons name="menu-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
      </ScrollView>

      {/* Advanced Features Drawer Modal */}
      <Modal
        visible={drawerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDrawerVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setDrawerVisible(false)}
          />
          <View style={[styles.drawerContent, { backgroundColor: theme.background }]}>
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: theme.text }]}>Advanced Features</Text>
              <TouchableOpacity
                onPress={() => setDrawerVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.drawerList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.drawerItem, { backgroundColor: theme.cardBackground }]}
                onPress={() => {
                  setDrawerVisible(false)
                  router.push('/analytics-dashboard')
                }}
              >
                <Ionicons name="analytics-outline" size={24} color="#2196F3" />
                <View style={styles.drawerItemContent}>
                  <Text style={[styles.drawerItemTitle, { color: theme.text }]}>Analytics Dashboard</Text>
                  <Text style={[styles.drawerItemSubtitle, { color: theme.textDim }]}>
                    Detailed project analytics and metrics
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerItem, { backgroundColor: theme.cardBackground }]}
                onPress={() => {
                  setDrawerVisible(false)
                  router.push('/workflow-automation')
                }}
              >
                <Ionicons name="git-branch-outline" size={24} color="#9C27B0" />
                <View style={styles.drawerItemContent}>
                  <Text style={[styles.drawerItemTitle, { color: theme.text }]}>Workflow Automation</Text>
                  <Text style={[styles.drawerItemSubtitle, { color: theme.textDim }]}>
                    Automate and optimize workflows
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerItem, { backgroundColor: theme.cardBackground }]}
                onPress={() => {
                  setDrawerVisible(false)
                  router.push('/time-tracking')
                }}
              >
                <Ionicons name="time-outline" size={24} color="#4CAF50" />
                <View style={styles.drawerItemContent}>
                  <Text style={[styles.drawerItemTitle, { color: theme.text }]}>Time Tracking</Text>
                  <Text style={[styles.drawerItemSubtitle, { color: theme.textDim }]}>
                    Track time and analyze productivity
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerItem, { backgroundColor: theme.cardBackground }]}
                onPress={() => {
                  setDrawerVisible(false)
                  router.push('/github-connect')
                }}
              >
                <Ionicons name="logo-github" size={24} color="#333" />
                <View style={styles.drawerItemContent}>
                  <Text style={[styles.drawerItemTitle, { color: theme.text }]}>GitHub Integration</Text>
                  <Text style={[styles.drawerItemSubtitle, { color: theme.textDim }]}>
                    Connect with GitHub workflows
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  drawerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  drawerContent: {
    height: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  drawerList: {
    flex: 1,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  drawerItemContent: {
    flex: 1,
    marginLeft: 16,
  },
  drawerItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  drawerItemSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  drawerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignSelf: 'center',
    marginBottom: 16,
  },
})
