import { databases, account, ID, Query } from '@/lib/appwrite'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite'
import { 
  ProjectAnalytics, 
  ProjectReport, 
  TimeEntry, 
  ProjectBudget,
  BurndownPoint,
  TimeDistribution,
  TeamPerformance
} from '@/types/appwrite'
import { offlineStore } from './offlineStore'
import { projectService } from './projectService'
import { taskService } from './taskService'
import { phaseService } from './phaseService'
import { teamService } from './teamService'

// Cache keys
const CACHE_KEYS = {
  PROJECT_ANALYTICS: 'project_analytics',
  TIME_ENTRIES: 'time_entries',
  PROJECT_REPORTS: 'project_reports',
  BUDGET_DATA: 'budget_data'
}

/**
 * Analytics Service
 * Handles advanced project analytics, reporting, and metrics
 */
export const analyticsService = {
  /**
   * Get comprehensive analytics for a project
   */
  async getProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
    try {
      const online = await offlineStore.isOnline()
      
      if (!online) {
        const cached = await offlineStore.getData(`${CACHE_KEYS.PROJECT_ANALYTICS}_${projectId}`, async () => null)
        if (cached) return cached
      }

      // Get project data
      const project = await projectService.getProjectById(projectId)
      const phases = await phaseService.getPhasesByProject(projectId)
      const tasks = await taskService.getTasksByProject(projectId)
      const timeEntries = await this.getTimeEntries(projectId)
      const teamMembers = await teamService.getTeamMembers(projectId)

      // Calculate metrics
      const totalTasks = tasks.length
      const completedTasks = tasks.filter(task => task.status === 'done').length
      const overdueTasks = tasks.filter(task => {
        if (!task.due_date || task.status === 'done') return false
        return new Date(task.due_date) < new Date()
      }).length

      const totalTimeSpent = timeEntries.reduce((sum, entry) => sum + entry.duration, 0)
      const estimatedTime = tasks.reduce((sum, task) => sum + (task.estimated_hours || 0) * 60, 0)

      const phasesCompleted = phases.filter(phase => phase.status === 'completed').length
      const totalPhases = phases.length

      // Calculate velocity (tasks completed per day)
      const completedTasksWithDates = tasks.filter(task => task.status === 'done' && task.$updatedAt)
      const velocity = this.calculateVelocity(completedTasksWithDates)

      // Generate burndown data
      const burndownData = this.generateBurndownData(tasks, project)

      // Generate time distribution
      const timeDistribution = this.generateTimeDistribution(timeEntries, tasks)

      // Generate team performance
      const teamPerformance = await this.generateTeamPerformance(projectId, teamMembers, tasks, timeEntries)

      const analytics: ProjectAnalytics = {
        project_id: projectId,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        overdue_tasks: overdueTasks,
        total_time_spent: totalTimeSpent,
        estimated_time: estimatedTime,
        team_members: teamMembers.length,
        phases_completed: phasesCompleted,
        total_phases: totalPhases,
        progress_percentage: project?.progress || 0,
        velocity,
        burndown_data: burndownData,
        time_distribution: timeDistribution,
        team_performance: teamPerformance
      }

      // Cache the results
      await offlineStore.setData(`${CACHE_KEYS.PROJECT_ANALYTICS}_${projectId}`, analytics)

      return analytics
    } catch (error) {
      console.error('Error getting project analytics:', error)
      return this.getDefaultAnalytics(projectId)
    }
  },

  /**
   * Get time entries for a project
   */
  async getTimeEntries(projectId: string): Promise<TimeEntry[]> {
    try {
      const online = await offlineStore.isOnline()
      
      if (!online) {
        const cached = await offlineStore.getData(CACHE_KEYS.TIME_ENTRIES, async () => [])
        return cached.filter((entry: TimeEntry) => entry.project_id === projectId)
      }

      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.TIME_ENTRIES,
        [Query.equal('project_id', projectId)]
      )

      const timeEntries = documents as unknown as TimeEntry[]
      
      // Cache the results
      await offlineStore.setData(CACHE_KEYS.TIME_ENTRIES, timeEntries)
      
      return timeEntries
    } catch (error) {
      console.error('Error getting time entries:', error)
      return []
    }
  },

  /**
   * Create a time entry
   */
  async createTimeEntry(timeEntryData: Omit<TimeEntry, '$id' | '$createdAt' | '$updatedAt'>): Promise<TimeEntry> {
    try {
      const online = await offlineStore.isOnline()
      const currentUser = await account.get()

      const newTimeEntry = {
        ...timeEntryData,
        user_id: currentUser.$id,
        start_time: timeEntryData.start_time || new Date().toISOString()
      }

      if (!online) {
        await offlineStore.addOfflineChange({
          id: ID.unique(),
          table_name: 'time_entries',
          record_id: ID.unique(),
          operation: 'INSERT',
          data: newTimeEntry,
          created_at: new Date().toISOString(),
          synced: false,
          retry_count: 0
        })

        return {
          ...newTimeEntry,
          $id: `temp_${Date.now()}`,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString()
        } as TimeEntry
      }

      const createdTimeEntry = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.TIME_ENTRIES,
        ID.unique(),
        newTimeEntry
      ) as unknown as TimeEntry

      return createdTimeEntry
    } catch (error) {
      console.error('Error creating time entry:', error)
      throw error
    }
  },

  /**
   * Stop a time entry
   */
  async stopTimeEntry(timeEntryId: string): Promise<TimeEntry> {
    try {
      const online = await offlineStore.isOnline()
      const endTime = new Date().toISOString()

      // Get the time entry
      const timeEntry = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.TIME_ENTRIES,
        timeEntryId
      ) as unknown as TimeEntry

      const startTime = new Date(timeEntry.start_time)
      const endTimeDate = new Date(endTime)
      const duration = Math.round((endTimeDate.getTime() - startTime.getTime()) / (1000 * 60)) // in minutes

      const updates = {
        end_time: endTime,
        duration
      }

      if (!online) {
        await offlineStore.addOfflineChange({
          id: ID.unique(),
          table_name: 'time_entries',
          record_id: timeEntryId,
          operation: 'UPDATE',
          data: updates,
          created_at: new Date().toISOString(),
          synced: false,
          retry_count: 0
        })

        return { ...timeEntry, ...updates } as TimeEntry
      }

      const updatedTimeEntry = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.TIME_ENTRIES,
        timeEntryId,
        updates
      ) as unknown as TimeEntry

      return updatedTimeEntry
    } catch (error) {
      console.error('Error stopping time entry:', error)
      throw error
    }
  },

  /**
   * Generate project report
   */
  async generateProjectReport(
    projectId: string,
    reportType: 'progress' | 'time' | 'budget' | 'team' | 'comprehensive',
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom',
    startDate?: string,
    endDate?: string
  ): Promise<ProjectReport> {
    try {
      const online = await offlineStore.isOnline()
      const currentUser = await account.get()

      const now = new Date()
      const defaultStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      const defaultEndDate = now

      const reportStartDate = startDate || defaultStartDate.toISOString()
      const reportEndDate = endDate || defaultEndDate.toISOString()

      let reportData: Record<string, any> = {}

      switch (reportType) {
        case 'progress':
          reportData = await this.generateProgressReport(projectId, reportStartDate, reportEndDate)
          break
        case 'time':
          reportData = await this.generateTimeReport(projectId, reportStartDate, reportEndDate)
          break
        case 'budget':
          reportData = await this.generateBudgetReport(projectId, reportStartDate, reportEndDate)
          break
        case 'team':
          reportData = await this.generateTeamReport(projectId, reportStartDate, reportEndDate)
          break
        case 'comprehensive':
          reportData = await this.generateComprehensiveReport(projectId, reportStartDate, reportEndDate)
          break
      }

      const report: ProjectReport = {
        project_id: projectId,
        report_type: reportType,
        period,
        start_date: reportStartDate,
        end_date: reportEndDate,
        data: reportData,
        generated_by: currentUser.$id,
        is_automated: false
      }

      if (!online) {
        await offlineStore.addOfflineChange({
          id: ID.unique(),
          table_name: 'project_reports',
          record_id: ID.unique(),
          operation: 'INSERT',
          data: report,
          created_at: new Date().toISOString(),
          synced: false,
          retry_count: 0
        })

        return {
          ...report,
          $id: `temp_${Date.now()}`,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString()
        } as ProjectReport
      }

      const createdReport = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECT_REPORTS,
        ID.unique(),
        report
      ) as unknown as ProjectReport

      return createdReport
    } catch (error) {
      console.error('Error generating project report:', error)
      throw error
    }
  },

  /**
   * Generate progress report data
   */
  async generateProgressReport(projectId: string, startDate: string, endDate: string): Promise<Record<string, any>> {
    try {
      const project = await projectService.getProjectById(projectId)
      const phases = await phaseService.getPhasesByProject(projectId)
      const tasks = await taskService.getTasksByProject(projectId)

      const start = new Date(startDate)
      const end = new Date(endDate)

      // Filter tasks by date range
      const tasksInRange = tasks.filter(task => {
        const taskDate = new Date(task.$createdAt)
        return taskDate >= start && taskDate <= end
      })

      const completedTasks = tasksInRange.filter(task => task.status === 'done')
      const inProgressTasks = tasksInRange.filter(task => task.status === 'inProgress')

      return {
        total_tasks: tasksInRange.length,
        completed_tasks: completedTasks.length,
        in_progress_tasks: inProgressTasks.length,
        completion_rate: tasksInRange.length > 0 ? (completedTasks.length / tasksInRange.length) * 100 : 0,
        phases_completed: phases.filter(phase => phase.status === 'completed').length,
        total_phases: phases.length,
        overall_progress: project?.progress || 0
      }
    } catch (error) {
      console.error('Error generating progress report:', error)
      return {}
    }
  },

  /**
   * Generate time report data
   */
  async generateTimeReport(projectId: string, startDate: string, endDate: string): Promise<Record<string, any>> {
    try {
      const timeEntries = await this.getTimeEntries(projectId)
      const tasks = await taskService.getTasksByProject(projectId)

      const start = new Date(startDate)
      const end = new Date(endDate)

      // Filter time entries by date range
      const entriesInRange = timeEntries.filter(entry => {
        const entryDate = new Date(entry.start_time)
        return entryDate >= start && entryDate <= end
      })

      const totalTimeSpent = entriesInRange.reduce((sum, entry) => sum + entry.duration, 0)
      const estimatedTime = tasks.reduce((sum, task) => sum + (task.estimated_hours || 0) * 60, 0)

      // Group by day
      const dailyTime = entriesInRange.reduce((acc, entry) => {
        const date = new Date(entry.start_time).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + entry.duration
        return acc
      }, {} as Record<string, number>)

      return {
        total_time_spent: totalTimeSpent,
        estimated_time: estimatedTime,
        time_efficiency: estimatedTime > 0 ? (totalTimeSpent / estimatedTime) * 100 : 0,
        daily_time_distribution: dailyTime,
        average_daily_time: Object.values(dailyTime).reduce((sum, time) => sum + time, 0) / Object.keys(dailyTime).length || 0
      }
    } catch (error) {
      console.error('Error generating time report:', error)
      return {}
    }
  },

  /**
   * Generate budget report data
   */
  async generateBudgetReport(projectId: string, startDate: string, endDate: string): Promise<Record<string, any>> {
    try {
      // This would integrate with budget tracking
      return {
        total_budget: 0,
        spent_amount: 0,
        remaining_amount: 0,
        budget_utilization: 0
      }
    } catch (error) {
      console.error('Error generating budget report:', error)
      return {}
    }
  },

  /**
   * Generate team report data
   */
  async generateTeamReport(projectId: string, startDate: string, endDate: string): Promise<Record<string, any>> {
    try {
      const teamMembers = await teamService.getTeamMembers(projectId)
      const tasks = await taskService.getTasksByProject(projectId)
      const timeEntries = await this.getTimeEntries(projectId)

      const start = new Date(startDate)
      const end = new Date(endDate)

      // Filter data by date range
      const tasksInRange = tasks.filter(task => {
        const taskDate = new Date(task.$createdAt)
        return taskDate >= start && taskDate <= end
      })

      const entriesInRange = timeEntries.filter(entry => {
        const entryDate = new Date(entry.start_time)
        return entryDate >= start && entryDate <= end
      })

      const teamStats = teamMembers.map(member => {
        const memberTasks = tasksInRange.filter(task => task.assignee_id === member.user_id)
        const memberTime = entriesInRange.filter(entry => entry.user_id === member.user_id)
        const completedTasks = memberTasks.filter(task => task.status === 'done')

        return {
          user_id: member.user_id,
          user_name: member.full_name || 'Unknown',
          role: member.role,
          tasks_assigned: memberTasks.length,
          tasks_completed: completedTasks.length,
          time_spent: memberTime.reduce((sum, entry) => sum + entry.duration, 0),
          completion_rate: memberTasks.length > 0 ? (completedTasks.length / memberTasks.length) * 100 : 0
        }
      })

      return {
        total_members: teamMembers.length,
        active_members: teamMembers.filter(m => m.status === 'active').length,
        team_performance: teamStats,
        average_completion_rate: teamStats.reduce((sum, member) => sum + member.completion_rate, 0) / teamStats.length || 0
      }
    } catch (error) {
      console.error('Error generating team report:', error)
      return {}
    }
  },

  /**
   * Generate comprehensive report data
   */
  async generateComprehensiveReport(projectId: string, startDate: string, endDate: string): Promise<Record<string, any>> {
    try {
      const progressData = await this.generateProgressReport(projectId, startDate, endDate)
      const timeData = await this.generateTimeReport(projectId, startDate, endDate)
      const budgetData = await this.generateBudgetReport(projectId, startDate, endDate)
      const teamData = await this.generateTeamReport(projectId, startDate, endDate)

      return {
        progress: progressData,
        time: timeData,
        budget: budgetData,
        team: teamData,
        summary: {
          overall_health: this.calculateProjectHealth(progressData, timeData, budgetData),
          key_metrics: this.extractKeyMetrics(progressData, timeData, teamData),
          recommendations: this.generateRecommendations(progressData, timeData, teamData)
        }
      }
    } catch (error) {
      console.error('Error generating comprehensive report:', error)
      return {}
    }
  },

  /**
   * Calculate project velocity
   */
  calculateVelocity(completedTasks: any[]): number {
    if (completedTasks.length === 0) return 0

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const recentTasks = completedTasks.filter(task => {
      const completionDate = new Date(task.$updatedAt)
      return completionDate >= thirtyDaysAgo
    })

    return recentTasks.length / 30 // tasks per day
  },

  /**
   * Generate burndown data
   */
  generateBurndownData(tasks: any[], project: any): BurndownPoint[] {
    try {
      const burndownData: BurndownPoint[] = []
      const totalTasks = tasks.length
      const completedTasks = tasks.filter(task => task.status === 'done').length

      if (!project.start_date || !project.end_date) {
        return burndownData
      }

      const startDate = new Date(project.start_date)
      const endDate = new Date(project.end_date)
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      for (let day = 0; day <= totalDays; day++) {
        const currentDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000)
        const tasksCompletedByDate = tasks.filter(task => {
          if (task.status !== 'done' || !task.$updatedAt) return false
          const completionDate = new Date(task.$updatedAt)
          return completionDate <= currentDate
        }).length

        const idealRemaining = totalTasks - (totalTasks * day / totalDays)

        burndownData.push({
          date: currentDate.toISOString(),
          remaining_tasks: totalTasks - tasksCompletedByDate,
          completed_tasks: tasksCompletedByDate,
          ideal_remaining: Math.max(0, idealRemaining)
        })
      }

      return burndownData
    } catch (error) {
      console.error('Error generating burndown data:', error)
      return []
    }
  },

  /**
   * Generate time distribution
   */
  generateTimeDistribution(timeEntries: TimeEntry[], tasks: any[]): TimeDistribution[] {
    try {
      const distribution: Record<string, number> = {}

      // Group by task tags or categories
      timeEntries.forEach(entry => {
        const task = tasks.find(t => t.$id === entry.task_id)
        const category = task?.tags?.[0] || 'General'
        distribution[category] = (distribution[category] || 0) + entry.duration
      })

      const totalTime = Object.values(distribution).reduce((sum, time) => sum + time, 0)

      return Object.entries(distribution).map(([category, hours]) => ({
        category,
        hours: hours / 60, // Convert minutes to hours
        percentage: totalTime > 0 ? (hours / totalTime) * 100 : 0
      }))
    } catch (error) {
      console.error('Error generating time distribution:', error)
      return []
    }
  },

  /**
   * Generate team performance data
   */
  async generateTeamPerformance(
    projectId: string,
    teamMembers: any[],
    tasks: any[],
    timeEntries: TimeEntry[]
  ): Promise<TeamPerformance[]> {
    try {
      return teamMembers.map(member => {
        const memberTasks = tasks.filter(task => task.assignee_id === member.user_id)
        const memberTime = timeEntries.filter(entry => entry.user_id === member.user_id)
        const completedTasks = memberTasks.filter(task => task.status === 'done')

        const totalTimeSpent = memberTime.reduce((sum, entry) => sum + entry.duration, 0)
        const efficiencyScore = this.calculateEfficiencyScore(memberTasks, totalTimeSpent)
        const onTimeCompletionRate = this.calculateOnTimeCompletionRate(memberTasks)

        return {
          user_id: member.user_id,
          user_name: member.full_name || 'Unknown',
          tasks_completed: completedTasks.length,
          time_spent: totalTimeSpent,
          efficiency_score: efficiencyScore,
          on_time_completion_rate: onTimeCompletionRate
        }
      })
    } catch (error) {
      console.error('Error generating team performance:', error)
      return []
    }
  },

  /**
   * Calculate efficiency score
   */
  calculateEfficiencyScore(tasks: any[], totalTimeSpent: number): number {
    const estimatedTime = tasks.reduce((sum, task) => sum + (task.estimated_hours || 0) * 60, 0)
    if (estimatedTime === 0) return 100
    return Math.max(0, Math.min(100, (estimatedTime / totalTimeSpent) * 100))
  },

  /**
   * Calculate on-time completion rate
   */
  calculateOnTimeCompletionRate(tasks: any[]): number {
    const completedTasks = tasks.filter(task => task.status === 'done' && task.due_date)
    if (completedTasks.length === 0) return 100

    const onTimeTasks = completedTasks.filter(task => {
      const completionDate = new Date(task.$updatedAt)
      const dueDate = new Date(task.due_date)
      return completionDate <= dueDate
    })

    return (onTimeTasks.length / completedTasks.length) * 100
  },

  /**
   * Calculate project health score
   */
  calculateProjectHealth(progressData: any, timeData: any, budgetData: any): number {
    const progressScore = progressData.completion_rate || 0
    const timeScore = timeData.time_efficiency || 100
    const budgetScore = budgetData.budget_utilization || 100

    return (progressScore + timeScore + budgetScore) / 3
  },

  /**
   * Extract key metrics
   */
  extractKeyMetrics(progressData: any, timeData: any, teamData: any): Record<string, any> {
    return {
      completion_rate: progressData.completion_rate,
      time_efficiency: timeData.time_efficiency,
      team_productivity: teamData.average_completion_rate,
      velocity: timeData.velocity || 0
    }
  },

  /**
   * Generate recommendations
   */
  generateRecommendations(progressData: any, timeData: any, teamData: any): string[] {
    const recommendations: string[] = []

    if (progressData.completion_rate < 50) {
      recommendations.push('Consider breaking down large tasks into smaller, more manageable pieces')
    }

    if (timeData.time_efficiency < 80) {
      recommendations.push('Review time estimates and consider adjusting future planning')
    }

    if (teamData.average_completion_rate < 70) {
      recommendations.push('Provide additional support to team members with low completion rates')
    }

    if (recommendations.length === 0) {
      recommendations.push('Project is on track! Keep up the good work.')
    }

    return recommendations
  },

  /**
   * Get default analytics
   */
  getDefaultAnalytics(projectId: string): ProjectAnalytics {
    return {
      project_id: projectId,
      total_tasks: 0,
      completed_tasks: 0,
      overdue_tasks: 0,
      total_time_spent: 0,
      estimated_time: 0,
      team_members: 0,
      phases_completed: 0,
      total_phases: 0,
      progress_percentage: 0,
      velocity: 0,
      burndown_data: [],
      time_distribution: [],
      team_performance: []
    }
  }
} 