"use client"

import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Switch
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useColorScheme } from 'react-native'
import { useRouter } from 'expo-router'
import { MotiView } from 'moti'

import { workflowService } from '@/services/workflowService'
import { projectService } from '@/services/projectService'
import { useToast } from '@/contexts/ToastContext'
import Colors from '@/constants/Colors'
import { WorkflowAutomation, ProjectTemplate } from '@/types/appwrite'
import { account } from '@/lib/appwrite'

interface WorkflowAutomationScreenProps {
  projectId?: string
}

export default function WorkflowAutomationScreen({ projectId }: WorkflowAutomationScreenProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? 'light']
  const router = useRouter()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<'automations' | 'templates'>('automations')
  const [automations, setAutomations] = useState<WorkflowAutomation[]>([])
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null)
  const [newAutomation, setNewAutomation] = useState({
    name: '',
    description: '',
    trigger: 'task_created' as any,
    is_active: true
  })
  const [isOffline, setIsOffline] = useState(false)

  const triggers = [
    { key: 'task_created', label: 'Task Created', description: 'When a new task is created' },
    { key: 'task_completed', label: 'Task Completed', description: 'When a task is marked as done' },
    { key: 'phase_started', label: 'Phase Started', description: 'When a phase begins' },
    { key: 'phase_completed', label: 'Phase Completed', description: 'When a phase is finished' },
    { key: 'project_created', label: 'Project Created', description: 'When a new project is created' },
    { key: 'deadline_approaching', label: 'Deadline Approaching', description: 'When a task is near its due date' }
  ]

  const templateCategories = [
    { key: 'software', label: 'Software Development', icon: 'code' },
    { key: 'design', label: 'Design Project', icon: 'brush' },
    { key: 'marketing', label: 'Marketing Campaign', icon: 'megaphone' },
    { key: 'research', label: 'Research Project', icon: 'search' },
    { key: 'custom', label: 'Custom Template', icon: 'settings' }
  ]

  useEffect(() => {
    loadData()
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
      const [automationsData, templatesData] = await Promise.all([
        workflowService.getWorkflowAutomations(projectId),
        workflowService.getProjectTemplates()
      ])
      
      setAutomations(automationsData)
      setTemplates(templatesData)
    } catch (error) {
      console.error('Error loading workflow data:', error)
      showToast('Failed to load workflow data', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [projectId, showToast])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [loadData])

  const handleCreateAutomation = async () => {
    if (!newAutomation.name.trim()) {
      showToast('Please enter a name for the automation', { type: 'error' })
      return
    }

    try {
      let createdBy = 'system';
      try {
        createdBy = (await account.get()).$id;
      } catch {}
      const automationData = {
        name: newAutomation.name,
        description: newAutomation.description,
        trigger: newAutomation.trigger,
        conditions: [],
        actions: [],
        is_active: newAutomation.is_active,
        project_id: projectId,
        created_by: createdBy,
      }

      await workflowService.createWorkflowAutomation(automationData)
      showToast('Automation created successfully', { type: 'success' })
      setShowCreateModal(false)
      setNewAutomation({ name: '', description: '', trigger: 'task_created', is_active: true })
      loadData()
    } catch (error) {
      console.error('Error creating automation:', error)
      showToast('Failed to create automation', { type: 'error' })
    }
  }

  const handleToggleAutomation = async (automation: WorkflowAutomation) => {
    try {
      await workflowService.updateWorkflowAutomation(automation.$id, {
        is_active: !automation.is_active
      })
      showToast(`Automation ${automation.is_active ? 'disabled' : 'enabled'}`, { type: 'success' })
      loadData()
    } catch (error) {
      console.error('Error toggling automation:', error)
      showToast('Failed to update automation', { type: 'error' })
    }
  }

  const handleDeleteAutomation = (automation: WorkflowAutomation) => {
    Alert.alert(
      'Delete Automation',
      `Are you sure you want to delete "${automation.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await workflowService.deleteWorkflowAutomation(automation.$id)
              showToast('Automation deleted successfully', { type: 'success' })
              loadData()
            } catch (error) {
              console.error('Error deleting automation:', error)
              showToast('Failed to delete automation', { type: 'error' })
            }
          }
        }
      ]
    )
  }

  const handleCreateFromTemplate = async (template: ProjectTemplate) => {
    try {
      const projectData = {
        name: `${template.name} Copy`,
        description: template.description || '',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + template.estimated_duration * 24 * 60 * 60 * 1000).toISOString()
      }

      const newProjectId = await workflowService.createProjectFromTemplate(template.$id, projectData)
      showToast('Project created from template successfully', { type: 'success' })
      router.push(`/project/${newProjectId}`)
    } catch (error) {
      console.error('Error creating project from template:', error)
      showToast('Failed to create project from template', { type: 'error' })
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <Text style={[styles.loadingText, { color: theme.textDim }]}>Loading workflow data...</Text>
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
          <Text style={[styles.title, { color: theme.text }]}>Workflow Automation</Text>
          <Text style={[styles.subtitle, { color: theme.textDim }]}>
            {projectId ? 'Project Automations' : 'Global Automations'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.tint }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </MotiView>

      {/* Tab Navigation */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 200 }}
        style={styles.tabContainer}
      >
        <View style={[styles.tabBar, { backgroundColor: theme.cardBackground }]}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'automations' && { backgroundColor: theme.tint }
            ]}
            onPress={() => setActiveTab('automations')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'automations' ? { color: '#fff' } : { color: theme.text }
            ]}>
              Automations ({automations.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'templates' && { backgroundColor: theme.tint }
            ]}
            onPress={() => setActiveTab('templates')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'templates' ? { color: '#fff' } : { color: theme.text }
            ]}>
              Templates ({templates.length})
            </Text>
          </TouchableOpacity>
        </View>
      </MotiView>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'automations' ? (
          <View style={styles.automationsContainer}>
            {automations.map((automation, index) => (
              <MotiView
                key={automation.$id}
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'timing', duration: 500, delay: 300 + index * 100 }}
                style={[styles.automationCard, { backgroundColor: theme.cardBackground }]}
              >
                <View style={styles.automationHeader}>
                  <View style={styles.automationInfo}>
                    <Text style={[styles.automationName, { color: theme.text }]}>
                      {automation.name}
                    </Text>
                    <Text style={[styles.automationDescription, { color: theme.textDim }]}>
                      {automation.description || 'No description'}
                    </Text>
                    <Text style={[styles.automationTrigger, { color: theme.tint }]}>
                      {triggers.find(t => t.key === automation.trigger)?.label || automation.trigger}
                    </Text>
                  </View>
                  <View style={styles.automationActions}>
                    <Switch
                      value={automation.is_active}
                      onValueChange={() => handleToggleAutomation(automation)}
                      trackColor={{ false: theme.border, true: theme.tintLight }}
                      thumbColor={automation.is_active ? theme.tint : theme.textDim}
                    />
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.tintLight }]}
                      onPress={() => handleDeleteAutomation(automation)}
                    >
                      <Ionicons name="trash-outline" size={16} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.automationStatus}>
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: automation.is_active ? theme.success : theme.textDim }
                  ]} />
                  <Text style={[styles.statusText, { color: theme.textDim }]}>
                    {automation.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </MotiView>
            ))}

            {automations.length === 0 && (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 500, delay: 400 }}
                style={styles.emptyContainer}
              >
                <Ionicons name="settings-outline" size={60} color={theme.textDim} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Automations</Text>
                <Text style={[styles.emptyText, { color: theme.textDim }]}>
                  Create automation rules to streamline your workflow.
                </Text>
              </MotiView>
            )}
          </View>
        ) : (
          <View style={styles.templatesContainer}>
            {templateCategories.map((category) => {
              const categoryTemplates = templates.filter(t => t.category === category.key)
              return (
                <MotiView
                  key={category.key}
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 500, delay: 300 }}
                  style={styles.categorySection}
                >
                  <Text style={[styles.categoryTitle, { color: theme.text }]}>
                    {category.label}
                  </Text>
                  {categoryTemplates.map((template, index) => (
                    <MotiView
                      key={template.$id}
                      from={{ opacity: 0, translateX: -20 }}
                      animate={{ opacity: 1, translateX: 0 }}
                      transition={{ type: 'timing', duration: 500, delay: 400 + index * 100 }}
                      style={[styles.templateCard, { backgroundColor: theme.cardBackground }]}
                    >
                      <View style={styles.templateInfo}>
                        <View style={[styles.templateIcon, { backgroundColor: theme.tintLight }]}>
                          <Ionicons name={category.icon as any} size={20} color={theme.tint} />
                        </View>
                        <View style={styles.templateDetails}>
                          <Text style={[styles.templateName, { color: theme.text }]}>
                            {template.name}
                          </Text>
                          <Text style={[styles.templateDescription, { color: theme.textDim }]}>
                            {template.description || 'No description'}
                          </Text>
                          <View style={styles.templateMeta}>
                            <Text style={[styles.templateMetaText, { color: theme.textDim }]}>
                              {template.estimated_duration} days
                            </Text>
                            <Text style={[styles.templateMetaText, { color: theme.textDim }]}>
                              {template.complexity} complexity
                            </Text>
                            <Text style={[styles.templateMetaText, { color: theme.textDim }]}>
                              {template.usage_count} uses
                            </Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.useTemplateButton, { backgroundColor: theme.tint }]}
                        onPress={() => handleCreateFromTemplate(template)}
                      >
                        <Text style={[styles.useTemplateText, { color: '#fff' }]}>Use Template</Text>
                      </TouchableOpacity>
                    </MotiView>
                  ))}
                </MotiView>
              )
            })}

            {templates.length === 0 && (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 500, delay: 400 }}
                style={styles.emptyContainer}
              >
                <Ionicons name="document-outline" size={60} color={theme.textDim} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Templates</Text>
                <Text style={[styles.emptyText, { color: theme.textDim }]}>
                  Project templates will appear here once they're available.
                </Text>
              </MotiView>
            )}
          </View>
        )}
      </ScrollView>

      {/* Create Automation Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Create Automation</Text>
            <TouchableOpacity
              onPress={() => setShowCreateModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Name</Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.cardBackground,
                color: theme.text,
                borderColor: theme.border
              }]}
              placeholder="Enter automation name"
              placeholderTextColor={theme.textDim}
              value={newAutomation.name}
              onChangeText={(text) => setNewAutomation({ ...newAutomation, name: text })}
            />

            <Text style={[styles.inputLabel, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: theme.cardBackground,
                color: theme.text,
                borderColor: theme.border
              }]}
              placeholder="Enter description (optional)"
              placeholderTextColor={theme.textDim}
              value={newAutomation.description}
              onChangeText={(text) => setNewAutomation({ ...newAutomation, description: text })}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.inputLabel, { color: theme.text }]}>Trigger</Text>
            {triggers.map((trigger) => (
              <TouchableOpacity
                key={trigger.key}
                style={[
                  styles.triggerOption,
                  { backgroundColor: theme.cardBackground },
                  newAutomation.trigger === trigger.key && { borderColor: theme.tint, borderWidth: 2 }
                ]}
                onPress={() => setNewAutomation({ ...newAutomation, trigger: trigger.key })}
              >
                <View style={styles.triggerInfo}>
                  <Text style={[styles.triggerLabel, { color: theme.text }]}>{trigger.label}</Text>
                  <Text style={[styles.triggerDescription, { color: theme.textDim }]}>
                    {trigger.description}
                  </Text>
                </View>
                {newAutomation.trigger === trigger.key && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.tint} />
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.switchContainer}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>Active</Text>
              <Switch
                value={newAutomation.is_active}
                onValueChange={(value) => setNewAutomation({ ...newAutomation, is_active: value })}
                trackColor={{ false: theme.border, true: theme.tintLight }}
                thumbColor={newAutomation.is_active ? theme.tint : theme.textDim}
              />
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.border }]}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.tint }]}
              onPress={handleCreateAutomation}
            >
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>Create</Text>
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
  automationsContainer: {
    flex: 1,
  },
  automationCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  automationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  automationInfo: {
    flex: 1,
  },
  automationName: {
    fontSize: 16,
    fontWeight: '600',
  },
  automationDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  automationTrigger: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  automationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  automationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
  },
  templatesContainer: {
    flex: 1,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  templateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  templateDetails: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
  },
  templateDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  templateMeta: {
    flexDirection: 'row',
    marginTop: 4,
  },
  templateMetaText: {
    fontSize: 12,
    marginRight: 12,
  },
  useTemplateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  useTemplateText: {
    fontSize: 14,
    fontWeight: '600',
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
  triggerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  triggerInfo: {
    flex: 1,
  },
  triggerLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  triggerDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
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