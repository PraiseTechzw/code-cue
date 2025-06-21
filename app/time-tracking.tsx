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
  Modal,
  TextInput,
  Switch,
  Alert
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useColorScheme } from 'react-native'
import { useRouter } from 'expo-router'
import { MotiView } from 'moti'

import { analyticsService } from '@/services/analyticsService'
import { taskService } from '@/services/taskService'
import { projectService } from '@/services/projectService'
import { useToast } from '@/contexts/ToastContext'
import Colors from '@/constants/Colors'
import { TimeEntry } from '@/types/appwrite'

interface TimeTrackingScreenProps {
  projectId?: string
}

export default function TimeTrackingScreen({ projectId }: TimeTrackingScreenProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? 'light']
  const router = useRouter()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<'timer' | 'entries' | 'reports'>('timer')
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddEntryModal, setShowAddEntryModal] = useState(false)
  const [showEditEntryModal, setShowEditEntryModal] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null)
  const [currentTimer, setCurrentTimer] = useState<{
    taskId: string
    startTime: Date
    isRunning: boolean
  } | null>(null)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)
  const [newEntry, setNewEntry] = useState({
    task_id: '',
    project_id: projectId || '',
    description: '',
    start_time: '',
    end_time: '',
    duration: 0,
    is_billable: false,
    hourly_rate: 0
  })
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    loadData()
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval)
      }
    }
  }, [projectId])

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
      const [entriesData, tasksData, projectsData] = await Promise.all([
        analyticsService.getTimeEntries(projectId || ''),
        taskService.getTasksByProject(projectId || ''),
        projectService.getProjects()
      ])
      
      setTimeEntries(entriesData)
      setTasks(tasksData)
      setProjects(projectsData)
    } catch (error) {
      console.error('Error loading time tracking data:', error)
      showToast('Failed to load time tracking data', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [projectId, showToast])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [loadData])

  const startTimer = async (taskId: string) => {
    try {
      if (currentTimer?.isRunning) {
        await stopTimer()
      }

      const startTime = new Date()
      setCurrentTimer({
        taskId,
        startTime,
        isRunning: true
      })

      // Start interval to update timer display
      const interval = setInterval(() => {
        setCurrentTimer(prev => prev ? { ...prev } : null)
      }, 1000)
      setTimerInterval(interval)

      showToast('Timer started', { type: 'success' })
    } catch (error) {
      console.error('Error starting timer:', error)
      showToast('Failed to start timer', { type: 'error' })
    }
  }

  const stopTimer = async () => {
    try {
      if (!currentTimer) return

      const endTime = new Date()
      const duration = Math.round((endTime.getTime() - currentTimer.startTime.getTime()) / (1000 * 60))

      // Create time entry
      const timeEntryData = {
        task_id: currentTimer.taskId,
        project_id: projectId || '',
        start_time: currentTimer.startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration,
        description: '',
        is_billable: false,
        hourly_rate: 0
      }

      await analyticsService.createTimeEntry(timeEntryData)
      
      // Clear timer
      setCurrentTimer(null)
      if (timerInterval) {
        clearInterval(timerInterval)
        setTimerInterval(null)
      }

      showToast('Timer stopped and entry saved', { type: 'success' })
      loadData()
    } catch (error) {
      console.error('Error stopping timer:', error)
      showToast('Failed to stop timer', { type: 'error' })
    }
  }

  const handleCreateEntry = async () => {
    if (!newEntry.task_id || !newEntry.start_time) {
      showToast('Please fill in all required fields', { type: 'error' })
      return
    }

    try {
      const timeEntryData = {
        ...newEntry,
        duration: newEntry.duration || 0
      }

      await analyticsService.createTimeEntry(timeEntryData)
      showToast('Time entry created successfully', { type: 'success' })
      setShowAddEntryModal(false)
      setNewEntry({
        task_id: '',
        project_id: projectId || '',
        description: '',
        start_time: '',
        end_time: '',
        duration: 0,
        is_billable: false,
        hourly_rate: 0
      })
      loadData()
    } catch (error) {
      console.error('Error creating time entry:', error)
      showToast('Failed to create time entry', { type: 'error' })
    }
  }

  const handleUpdateEntry = async () => {
    if (!selectedEntry) return

    try {
      const updates = {
        description: newEntry.description,
        duration: newEntry.duration,
        is_billable: newEntry.is_billable,
        hourly_rate: newEntry.hourly_rate
      }

      await analyticsService.updateTimeEntry(selectedEntry.$id, updates)
      showToast('Time entry updated successfully', { type: 'success' })
      setShowEditEntryModal(false)
      setSelectedEntry(null)
      loadData()
    } catch (error) {
      console.error('Error updating time entry:', error)
      showToast('Failed to update time entry', { type: 'error' })
    }
  }

  const handleDeleteEntry = (entry: TimeEntry) => {
    Alert.alert(
      'Delete Time Entry',
      'Are you sure you want to delete this time entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await analyticsService.deleteTimeEntry(entry.$id)
              showToast('Time entry deleted successfully', { type: 'success' })
              loadData()
            } catch (error) {
              console.error('Error deleting time entry:', error)
              showToast('Failed to delete time entry', { type: 'error' })
            }
          }
        }
      ]
    )
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCurrentTimerDuration = () => {
    if (!currentTimer?.isRunning) return 0
    const now = new Date()
    return Math.round((now.getTime() - currentTimer.startTime.getTime()) / (1000 * 60))
  }

  const getTotalTimeToday = () => {
    const today = new Date().toDateString()
    return timeEntries
      .filter(entry => new Date(entry.start_time).toDateString() === today)
      .reduce((total, entry) => total + entry.duration, 0)
  }

  const getTotalTimeThisWeek = () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return timeEntries
      .filter(entry => new Date(entry.start_time) >= weekAgo)
      .reduce((total, entry) => total + entry.duration, 0)
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <Text style={[styles.loadingText, { color: theme.textDim }]}>Loading time tracking data...</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Offline/Sync Banner */}
      {isOffline && (
        <View style={{ backgroundColor: '#FDECEA', padding: 10, borderRadius: 8, margin: 10 }}>
          <Text style={{ color: '#B00020', textAlign: 'center' }}>You are offline. Some features may be limited.</Text>
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
          <Text style={[styles.title, { color: theme.text }]}>Time Tracking</Text>
          <Text style={[styles.subtitle, { color: theme.textDim }]}>
            {projectId ? 'Project Time' : 'All Projects'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.tint }]}
          onPress={() => setShowAddEntryModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </MotiView>

      {/* Current Timer */}
      {currentTimer?.isRunning && (
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500 }}
          style={[styles.timerContainer, { backgroundColor: theme.tintLight }]}
        >
          <View style={styles.timerContent}>
            <Text style={[styles.timerLabel, { color: theme.tint }]}>Currently Tracking</Text>
            <Text style={[styles.timerDuration, { color: theme.tint }]}>
              {formatDuration(getCurrentTimerDuration())}
            </Text>
            <TouchableOpacity
              style={[styles.stopButton, { backgroundColor: theme.error }]}
              onPress={stopTimer}
            >
              <Ionicons name="stop" size={20} color="#fff" />
              <Text style={[styles.stopButtonText, { color: '#fff' }]}>Stop Timer</Text>
            </TouchableOpacity>
          </View>
        </MotiView>
      )}

      {/* Time Summary */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 200 }}
        style={styles.summaryContainer}
      >
        <View style={[styles.summaryCard, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {formatDuration(getTotalTimeToday())}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textDim }]}>Today</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {formatDuration(getTotalTimeThisWeek())}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textDim }]}>This Week</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {timeEntries.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textDim }]}>Entries</Text>
          </View>
        </View>
      </MotiView>

      {/* Tab Navigation */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 300 }}
        style={styles.tabContainer}
      >
        <View style={[styles.tabBar, { backgroundColor: theme.cardBackground }]}>
          {['timer', 'entries', 'reports'].map((tab) => (
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

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'timer' && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 400 }}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Start Timer</Text>
            {tasks.map((task, index) => (
              <MotiView
                key={task.$id}
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'timing', duration: 500, delay: 500 + index * 100 }}
                style={[styles.taskCard, { backgroundColor: theme.cardBackground }]}
              >
                <View style={styles.taskInfo}>
                  <Text style={[styles.taskTitle, { color: theme.text }]}>{task.title}</Text>
                  <Text style={[styles.taskProject, { color: theme.textDim }]}>
                    {projects.find(p => p.$id === task.project_id)?.name || 'Unknown Project'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.startButton,
                    currentTimer?.taskId === task.$id && currentTimer?.isRunning
                      ? { backgroundColor: theme.error }
                      : { backgroundColor: theme.tint }
                  ]}
                  onPress={() => startTimer(task.$id)}
                >
                  <Ionicons 
                    name={currentTimer?.taskId === task.$id && currentTimer?.isRunning ? "stop" : "play"} 
                    size={16} 
                    color="#fff" 
                  />
                  <Text style={[styles.startButtonText, { color: '#fff' }]}>
                    {currentTimer?.taskId === task.$id && currentTimer?.isRunning ? 'Stop' : 'Start'}
                  </Text>
                </TouchableOpacity>
              </MotiView>
            ))}

            {tasks.length === 0 && (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 500, delay: 600 }}
                style={styles.emptyContainer}
              >
                <Ionicons name="time-outline" size={60} color={theme.textDim} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Tasks Available</Text>
                <Text style={[styles.emptyText, { color: theme.textDim }]}>
                  Create tasks to start time tracking.
                </Text>
              </MotiView>
            )}
          </MotiView>
        )}

        {activeTab === 'entries' && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 400 }}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Time Entries</Text>
            {timeEntries.map((entry, index) => {
              const task = tasks.find(t => t.$id === entry.task_id)
              const project = projects.find(p => p.$id === entry.project_id)
              
              return (
                <MotiView
                  key={entry.$id}
                  from={{ opacity: 0, translateX: -20 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ type: 'timing', duration: 500, delay: 500 + index * 100 }}
                  style={[styles.entryCard, { backgroundColor: theme.cardBackground }]}
                >
                  <View style={styles.entryInfo}>
                    <Text style={[styles.entryTask, { color: theme.text }]}>
                      {task?.title || 'Unknown Task'}
                    </Text>
                    <Text style={[styles.entryProject, { color: theme.textDim }]}>
                      {project?.name || 'Unknown Project'}
                    </Text>
                    <Text style={[styles.entryTime, { color: theme.textDim }]}>
                      {formatTime(entry.start_time)} - {entry.end_time ? formatTime(entry.end_time) : 'Running'}
                    </Text>
                    {entry.description && (
                      <Text style={[styles.entryDescription, { color: theme.textDim }]}>
                        {entry.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.entryActions}>
                    <Text style={[styles.entryDuration, { color: theme.tint }]}>
                      {formatDuration(entry.duration)}
                    </Text>
                    <View style={styles.entryButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.tintLight }]}
                        onPress={() => {
                          setSelectedEntry(entry)
                          setNewEntry({
                            task_id: entry.task_id,
                            project_id: entry.project_id,
                            description: entry.description || '',
                            start_time: entry.start_time,
                            end_time: entry.end_time || '',
                            duration: entry.duration,
                            is_billable: entry.is_billable,
                            hourly_rate: entry.hourly_rate || 0
                          })
                          setShowEditEntryModal(true)
                        }}
                      >
                        <Ionicons name="pencil" size={16} color={theme.tint} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.errorLight }]}
                        onPress={() => handleDeleteEntry(entry)}
                      >
                        <Ionicons name="trash" size={16} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </MotiView>
              )
            })}

            {timeEntries.length === 0 && (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 500, delay: 600 }}
                style={styles.emptyContainer}
              >
                <Ionicons name="time-outline" size={60} color={theme.textDim} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Time Entries</Text>
                <Text style={[styles.emptyText, { color: theme.textDim }]}>
                  Start tracking time to see your entries here.
                </Text>
              </MotiView>
            )}
          </MotiView>
        )}

        {activeTab === 'reports' && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 400 }}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Time Reports</Text>
            
            <View style={[styles.reportCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.reportTitle, { color: theme.text }]}>Weekly Summary</Text>
              <View style={styles.reportStats}>
                <View style={styles.reportStat}>
                  <Text style={[styles.reportValue, { color: theme.text }]}>
                    {formatDuration(getTotalTimeThisWeek())}
                  </Text>
                  <Text style={[styles.reportLabel, { color: theme.textDim }]}>Total Time</Text>
                </View>
                <View style={styles.reportStat}>
                  <Text style={[styles.reportValue, { color: theme.text }]}>
                    {Math.round(getTotalTimeThisWeek() / 7)}
                  </Text>
                  <Text style={[styles.reportLabel, { color: theme.textDim }]}>Avg/Day</Text>
                </View>
                <View style={styles.reportStat}>
                  <Text style={[styles.reportValue, { color: theme.text }]}>
                    {timeEntries.filter(entry => entry.is_billable).length}
                  </Text>
                  <Text style={[styles.reportLabel, { color: theme.textDim }]}>Billable</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.exportButton, { backgroundColor: theme.tint }]}
              onPress={() => {
                showToast('Export feature coming soon', { type: 'info' })
              }}
            >
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={[styles.exportButtonText, { color: '#fff' }]}>Export Report</Text>
            </TouchableOpacity>
          </MotiView>
        )}
      </ScrollView>

      {/* Add Entry Modal */}
      <Modal
        visible={showAddEntryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Time Entry</Text>
            <TouchableOpacity
              onPress={() => setShowAddEntryModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Task</Text>
            <View style={[styles.pickerContainer, { backgroundColor: theme.cardBackground }]}>
              {tasks.map((task) => (
                <TouchableOpacity
                  key={task.$id}
                  style={[
                    styles.pickerOption,
                    newEntry.task_id === task.$id && { backgroundColor: theme.tint }
                  ]}
                  onPress={() => setNewEntry({ ...newEntry, task_id: task.$id })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    newEntry.task_id === task.$id ? { color: '#fff' } : { color: theme.text }
                  ]}>
                    {task.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: theme.cardBackground,
                color: theme.text,
                borderColor: theme.border
              }]}
              placeholder="Enter description (optional)"
              placeholderTextColor={theme.textDim}
              value={newEntry.description}
              onChangeText={(text) => setNewEntry({ ...newEntry, description: text })}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.inputLabel, { color: theme.text }]}>Duration (minutes)</Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.cardBackground,
                color: theme.text,
                borderColor: theme.border
              }]}
              placeholder="Enter duration in minutes"
              placeholderTextColor={theme.textDim}
              value={newEntry.duration.toString()}
              onChangeText={(text) => setNewEntry({ ...newEntry, duration: parseInt(text) || 0 })}
              keyboardType="numeric"
            />

            <View style={styles.switchContainer}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>Billable</Text>
              <Switch
                value={newEntry.is_billable}
                onValueChange={(value) => setNewEntry({ ...newEntry, is_billable: value })}
                trackColor={{ false: theme.border, true: theme.tintLight }}
                thumbColor={newEntry.is_billable ? theme.tint : theme.textDim}
              />
            </View>

            {newEntry.is_billable && (
              <>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Hourly Rate ($)</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.cardBackground,
                    color: theme.text,
                    borderColor: theme.border
                  }]}
                  placeholder="Enter hourly rate"
                  placeholderTextColor={theme.textDim}
                  value={newEntry.hourly_rate.toString()}
                  onChangeText={(text) => setNewEntry({ ...newEntry, hourly_rate: parseFloat(text) || 0 })}
                  keyboardType="numeric"
                />
              </>
            )}
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.border }]}
              onPress={() => setShowAddEntryModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.tint }]}
              onPress={handleCreateEntry}
            >
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>Add Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Entry Modal */}
      <Modal
        visible={showEditEntryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Time Entry</Text>
            <TouchableOpacity
              onPress={() => setShowEditEntryModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: theme.cardBackground,
                color: theme.text,
                borderColor: theme.border
              }]}
              placeholder="Enter description"
              placeholderTextColor={theme.textDim}
              value={newEntry.description}
              onChangeText={(text) => setNewEntry({ ...newEntry, description: text })}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.inputLabel, { color: theme.text }]}>Duration (minutes)</Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.cardBackground,
                color: theme.text,
                borderColor: theme.border
              }]}
              placeholder="Enter duration in minutes"
              placeholderTextColor={theme.textDim}
              value={newEntry.duration.toString()}
              onChangeText={(text) => setNewEntry({ ...newEntry, duration: parseInt(text) || 0 })}
              keyboardType="numeric"
            />

            <View style={styles.switchContainer}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>Billable</Text>
              <Switch
                value={newEntry.is_billable}
                onValueChange={(value) => setNewEntry({ ...newEntry, is_billable: value })}
                trackColor={{ false: theme.border, true: theme.tintLight }}
                thumbColor={newEntry.is_billable ? theme.tint : theme.textDim}
              />
            </View>

            {newEntry.is_billable && (
              <>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Hourly Rate ($)</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.cardBackground,
                    color: theme.text,
                    borderColor: theme.border
                  }]}
                  placeholder="Enter hourly rate"
                  placeholderTextColor={theme.textDim}
                  value={newEntry.hourly_rate.toString()}
                  onChangeText={(text) => setNewEntry({ ...newEntry, hourly_rate: parseFloat(text) || 0 })}
                  keyboardType="numeric"
                />
              </>
            )}
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.border }]}
              onPress={() => setShowEditEntryModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.tint }]}
              onPress={handleUpdateEntry}
            >
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>Update Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addButton: {
    padding: 8,
    borderRadius: 8,
  },
  timerContainer: {
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  timerContent: {
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  timerDuration: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  summaryContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  summaryCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
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
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  taskProject: {
    fontSize: 14,
    marginTop: 2,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  entryInfo: {
    flex: 1,
  },
  entryTask: {
    fontSize: 16,
    fontWeight: '600',
  },
  entryProject: {
    fontSize: 14,
    marginTop: 2,
  },
  entryTime: {
    fontSize: 12,
    marginTop: 2,
  },
  entryDescription: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  entryActions: {
    alignItems: 'flex-end',
  },
  entryDuration: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  entryButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 6,
    borderRadius: 6,
    marginLeft: 4,
  },
  reportCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  reportStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportStat: {
    alignItems: 'center',
  },
  reportValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  reportLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  pickerContainer: {
    borderRadius: 8,
    marginBottom: 20,
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  pickerOptionText: {
    fontSize: 16,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}) 