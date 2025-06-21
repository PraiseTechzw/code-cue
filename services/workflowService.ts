import { databases, account, ID, Query } from '@/lib/appwrite'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite'
import { 
  WorkflowAutomation, 
  ProjectTemplate, 
  TemplatePhase, 
  TemplateTask,
  AutomationCondition,
  AutomationAction 
} from '@/types/appwrite'
import { offlineStore } from './offlineStore'
import { notificationService } from './notificationService'
import { taskService } from './taskService'
import { phaseService } from './phaseService'

// Cache keys
const CACHE_KEYS = {
  WORKFLOW_AUTOMATIONS: 'workflow_automations',
  PROJECT_TEMPLATES: 'project_templates',
  AUTOMATION_TRIGGERS: 'automation_triggers'
}

/**
 * Workflow Automation Service
 * Handles project templates, automation rules, and workflow management
 */
export const workflowService = {
  /**
   * Get all workflow automations for a project
   */
  async getWorkflowAutomations(projectId?: string): Promise<WorkflowAutomation[]> {
    try {
      const online = await offlineStore.isOnline()
      
      if (!online) {
        const cached = await offlineStore.getData(CACHE_KEYS.WORKFLOW_AUTOMATIONS, async () => [])
        return cached.filter((automation: WorkflowAutomation) => 
          !projectId || automation.project_id === projectId || !automation.project_id
        )
      }

      const queries = projectId 
        ? [Query.equal('project_id', projectId)]
        : [Query.isNull('project_id')]

      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WORKFLOW_AUTOMATIONS,
        queries
      )

      const automations = documents as unknown as WorkflowAutomation[]
      
      // Cache the results
      await offlineStore.setData(CACHE_KEYS.WORKFLOW_AUTOMATIONS, automations)
      
      return automations
    } catch (error) {
      console.error('Error getting workflow automations:', error)
      return []
    }
  },

  /**
   * Create a new workflow automation
   */
  async createWorkflowAutomation(automationData: Omit<WorkflowAutomation, '$id' | '$createdAt' | '$updatedAt'>): Promise<WorkflowAutomation> {
    try {
      const online = await offlineStore.isOnline()
      const currentUser = await account.get()

      const newAutomation = {
        ...automationData,
        created_by: currentUser.$id,
        is_active: true
      }

      if (!online) {
        await offlineStore.addOfflineChange({
          id: ID.unique(),
          table_name: 'workflow_automations',
          record_id: ID.unique(),
          operation: 'INSERT',
          data: newAutomation,
          created_at: new Date().toISOString(),
          synced: false,
          retry_count: 0
        })

        return {
          ...newAutomation,
          $id: `temp_${Date.now()}`,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString()
        } as WorkflowAutomation
      }

      const createdAutomation = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.WORKFLOW_AUTOMATIONS,
        ID.unique(),
        newAutomation
      ) as unknown as WorkflowAutomation

      return createdAutomation
    } catch (error) {
      console.error('Error creating workflow automation:', error)
      throw error
    }
  },

  /**
   * Update workflow automation
   */
  async updateWorkflowAutomation(automationId: string, updates: Partial<WorkflowAutomation>): Promise<WorkflowAutomation> {
    try {
      const online = await offlineStore.isOnline()

      if (!online) {
        await offlineStore.addOfflineChange({
          id: ID.unique(),
          table_name: 'workflow_automations',
          record_id: automationId,
          operation: 'UPDATE',
          data: updates,
          created_at: new Date().toISOString(),
          synced: false,
          retry_count: 0
        })

        return updates as WorkflowAutomation
      }

      const updatedAutomation = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.WORKFLOW_AUTOMATIONS,
        automationId,
        updates
      ) as unknown as WorkflowAutomation

      return updatedAutomation
    } catch (error) {
      console.error('Error updating workflow automation:', error)
      throw error
    }
  },

  /**
   * Delete workflow automation
   */
  async deleteWorkflowAutomation(automationId: string): Promise<boolean> {
    try {
      const online = await offlineStore.isOnline()

      if (!online) {
        await offlineStore.addOfflineChange({
          id: ID.unique(),
          table_name: 'workflow_automations',
          record_id: automationId,
          operation: 'DELETE',
          data: {},
          created_at: new Date().toISOString(),
          synced: false,
          retry_count: 0
        })

        return true
      }

      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.WORKFLOW_AUTOMATIONS,
        automationId
      )

      return true
    } catch (error) {
      console.error('Error deleting workflow automation:', error)
      throw error
    }
  },

  /**
   * Execute automation based on trigger
   */
  async executeAutomation(trigger: string, context: Record<string, any>): Promise<void> {
    try {
      const automations = await this.getWorkflowAutomations(context.project_id)
      const relevantAutomations = automations.filter(automation => 
        automation.trigger === trigger && automation.is_active
      )

      for (const automation of relevantAutomations) {
        const shouldExecute = await this.evaluateConditions(automation.conditions, context)
        
        if (shouldExecute) {
          await this.executeActions(automation.actions, context)
        }
      }
    } catch (error) {
      console.error('Error executing automation:', error)
    }
  },

  /**
   * Evaluate automation conditions
   */
  async evaluateConditions(conditions: AutomationCondition[], context: Record<string, any>): Promise<boolean> {
    try {
      for (const condition of conditions) {
        const fieldValue = this.getNestedValue(context, condition.field)
        const conditionMet = this.evaluateCondition(condition, fieldValue)
        
        if (!conditionMet) {
          return false
        }
      }
      return true
    } catch (error) {
      console.error('Error evaluating conditions:', error)
      return false
    }
  },

  /**
   * Evaluate a single condition
   */
  evaluateCondition(condition: AutomationCondition, fieldValue: any): boolean {
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value
      case 'not_equals':
        return fieldValue !== condition.value
      case 'contains':
        return String(fieldValue).includes(String(condition.value))
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value)
      case 'less_than':
        return Number(fieldValue) < Number(condition.value)
      case 'is_empty':
        return !fieldValue || fieldValue === '' || fieldValue.length === 0
      case 'is_not_empty':
        return fieldValue && fieldValue !== '' && fieldValue.length > 0
      default:
        return false
    }
  },

  /**
   * Execute automation actions
   */
  async executeActions(actions: AutomationAction[], context: Record<string, any>): Promise<void> {
    try {
      for (const action of actions) {
        await this.executeAction(action, context)
      }
    } catch (error) {
      console.error('Error executing actions:', error)
    }
  },

  /**
   * Execute a single action
   */
  async executeAction(action: AutomationAction, context: Record<string, any>): Promise<void> {
    try {
      switch (action.type) {
        case 'create_task':
          await this.createTaskFromAction(action.parameters, context)
          break
        case 'update_task':
          await this.updateTaskFromAction(action.parameters, context)
          break
        case 'send_notification':
          await this.sendNotificationFromAction(action.parameters, context)
          break
        case 'assign_user':
          await this.assignUserFromAction(action.parameters, context)
          break
        case 'update_status':
          await this.updateStatusFromAction(action.parameters, context)
          break
        case 'send_email':
          await this.sendEmailFromAction(action.parameters, context)
          break
        case 'webhook':
          await this.sendWebhookFromAction(action.parameters, context)
          break
        default:
          console.warn('Unknown action type:', action.type)
      }
    } catch (error) {
      console.error('Error executing action:', error)
    }
  },

  /**
   * Create task from automation action
   */
  async createTaskFromAction(parameters: Record<string, any>, context: Record<string, any>): Promise<void> {
    try {
      const taskData = {
        title: this.interpolateTemplate(parameters.title, context),
        description: parameters.description ? this.interpolateTemplate(parameters.description, context) : undefined,
        project_id: context.project_id,
        phase_id: parameters.phase_id || null,
        priority: parameters.priority || 'medium',
        assignee_id: parameters.assignee_id || null,
        estimated_hours: parameters.estimated_hours || null,
        tags: parameters.tags || []
      }

      await taskService.createTask(taskData)
    } catch (error) {
      console.error('Error creating task from action:', error)
    }
  },

  /**
   * Update task from automation action
   */
  async updateTaskFromAction(parameters: Record<string, any>, context: Record<string, any>): Promise<void> {
    try {
      const taskId = parameters.task_id || context.task_id
      if (!taskId) return

      const updates: Record<string, any> = {}
      
      if (parameters.status) updates.status = parameters.status
      if (parameters.priority) updates.priority = parameters.priority
      if (parameters.assignee_id) updates.assignee_id = parameters.assignee_id
      if (parameters.description) updates.description = this.interpolateTemplate(parameters.description, context)

      await taskService.updateTask(taskId, updates)
    } catch (error) {
      console.error('Error updating task from action:', error)
    }
  },

  /**
   * Send notification from automation action
   */
  async sendNotificationFromAction(parameters: Record<string, any>, context: Record<string, any>): Promise<void> {
    try {
      const notificationData = {
        title: this.interpolateTemplate(parameters.title, context),
        description: parameters.description ? this.interpolateTemplate(parameters.description, context) : undefined,
        type: parameters.type || 'info',
        user_id: parameters.user_id || context.user_id,
        related_id: parameters.related_id || context.task_id || context.project_id,
        related_type: parameters.related_type || 'task',
        priority: parameters.priority || 'medium'
      }

      await notificationService.createNotification(notificationData)
    } catch (error) {
      console.error('Error sending notification from action:', error)
    }
  },

  /**
   * Assign user from automation action
   */
  async assignUserFromAction(parameters: Record<string, any>, context: Record<string, any>): Promise<void> {
    try {
      const taskId = parameters.task_id || context.task_id
      const userId = parameters.user_id

      if (!taskId || !userId) return

      await taskService.updateTask(taskId, { assignee_id: userId })
    } catch (error) {
      console.error('Error assigning user from action:', error)
    }
  },

  /**
   * Update status from automation action
   */
  async updateStatusFromAction(parameters: Record<string, any>, context: Record<string, any>): Promise<void> {
    try {
      const entityId = parameters.entity_id || context.task_id || context.phase_id
      const newStatus = parameters.status

      if (!entityId || !newStatus) return

      if (context.task_id) {
        await taskService.updateTask(entityId, { status: newStatus })
      } else if (context.phase_id) {
        await phaseService.updatePhase(entityId, { status: newStatus })
      }
    } catch (error) {
      console.error('Error updating status from action:', error)
    }
  },

  /**
   * Send email from automation action
   */
  async sendEmailFromAction(parameters: Record<string, any>, context: Record<string, any>): Promise<void> {
    try {
      // This would integrate with an email service
      console.log('Email action would be sent:', {
        to: parameters.to,
        subject: this.interpolateTemplate(parameters.subject, context),
        body: this.interpolateTemplate(parameters.body, context)
      })
    } catch (error) {
      console.error('Error sending email from action:', error)
    }
  },

  /**
   * Send webhook from automation action
   */
  async sendWebhookFromAction(parameters: Record<string, any>, context: Record<string, any>): Promise<void> {
    try {
      const url = parameters.url
      const payload = parameters.payload ? this.interpolateTemplate(JSON.stringify(parameters.payload), context) : context

      if (!url) return

      // This would make an HTTP request to the webhook URL
      console.log('Webhook would be sent to:', url, payload)
    } catch (error) {
      console.error('Error sending webhook from action:', error)
    }
  },

  /**
   * Interpolate template variables
   */
  interpolateTemplate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] || match
    })
  },

  /**
   * Get nested object value
   */
  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null
    }, obj)
  },

  /**
   * Get project templates
   */
  async getProjectTemplates(category?: string): Promise<ProjectTemplate[]> {
    try {
      const online = await offlineStore.isOnline()
      
      if (!online) {
        const cached = await offlineStore.getData(CACHE_KEYS.PROJECT_TEMPLATES, async () => [])
        return category 
          ? cached.filter((template: ProjectTemplate) => template.category === category)
          : cached
      }

      const queries = category ? [Query.equal('category', category)] : []
      queries.push(Query.equal('is_public', true))

      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROJECT_TEMPLATES,
        queries
      )

      const templates = documents as unknown as ProjectTemplate[]
      
      // Cache the results
      await offlineStore.setData(CACHE_KEYS.PROJECT_TEMPLATES, templates)
      
      return templates
    } catch (error) {
      console.error('Error getting project templates:', error)
      return []
    }
  },

  /**
   * Create project from template
   */
  async createProjectFromTemplate(templateId: string, projectData: {
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<string> {
    try {
      const template = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECT_TEMPLATES,
        templateId
      ) as unknown as ProjectTemplate

      // Create project
      const projectService = (await import('./projectService')).projectService
      const project = await projectService.createProject({
        ...projectData,
        status: 'planning',
        priority: 'medium'
      })

      // Create phases from template
      for (const templatePhase of template.phases) {
        const phase = await phaseService.createPhase({
          name: templatePhase.name,
          description: templatePhase.description,
          project_id: project.$id,
          order: templatePhase.order,
          weight: templatePhase.weight,
          estimated_duration: templatePhase.estimated_duration
        })

        // Create tasks for this phase
        for (const templateTask of templatePhase.tasks) {
          await taskService.createTask({
            title: templateTask.title,
            description: templateTask.description,
            project_id: project.$id,
            phase_id: phase.$id,
            priority: templateTask.priority,
            estimated_hours: templateTask.estimated_hours,
            tags: templateTask.tags,
            dependencies: templateTask.dependencies
          })
        }
      }

      // Update template usage count
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECT_TEMPLATES,
        templateId,
        { usage_count: template.usage_count + 1 }
      )

      return project.$id
    } catch (error) {
      console.error('Error creating project from template:', error)
      throw error
    }
  }
} 