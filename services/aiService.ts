import { offlineStore } from "./offlineStore"
import { notificationService } from "./notificationService"

// Types for insights
export interface Insight {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
}

/**
 * AI Service for generating insights and recommendations
 */
export const aiService = {
  /**
   * Generate insights based on projects and tasks
   */
  async generateInsights(projects: any[], tasks: any[]): Promise<Insight[]> {
    try {
      // In a real app, this would call an AI service API
      // For now, we'll generate insights based on the data we have

      const insights: Insight[] = []

      // Check if we have cached insights
      const cachedInsights = await offlineStore.getItem("insights")
      if (cachedInsights) {
        return JSON.parse(cachedInsights)
      }

      // If no projects, return empty insights
      if (!projects || projects.length === 0) {
        return []
      }

      // Get the most recent project
      const recentProject = [...projects].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )[0]

      // Get tasks for the recent project
      const projectTasks = tasks.filter((task) => task.project_id === recentProject.id)

      // Get overdue tasks
      const now = new Date()
      const overdueTasks = projectTasks.filter(
        (task) => task.due_date && new Date(task.due_date) < now && task.status !== "done",
      )

      // Get tasks in progress for more than 7 days
      const longInProgressTasks = projectTasks.filter((task) => {
        if (task.status !== "inProgress") return false
        const updatedDate = new Date(task.updated_at)
        const diffDays = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays > 7
      })

      // Generate insights based on the data

      // Project progress insight
      if (recentProject) {
        insights.push({
          id: `insight-project-${Date.now()}`,
          type: "analytics",
          title: "Project Progress",
          description: `${recentProject.name} is ${recentProject.progress}% complete. Keep up the good work!`,
          timestamp: new Date().toISOString(),
        })
      }

      // Overdue tasks insight
      if (overdueTasks.length > 0) {
        insights.push({
          id: `insight-overdue-${Date.now()}`,
          type: "alert",
          title: "Overdue Tasks",
          description: `You have ${overdueTasks.length} overdue ${overdueTasks.length === 1 ? "task" : "tasks"} that need attention.`,
          timestamp: new Date().toISOString(),
        })

        // Create notifications for overdue tasks
        overdueTasks.forEach((task) => {
          notificationService.createNotification({
            title: "Task Overdue",
            description: `"${task.title}" is past its due date.`,
            type: "alert",
            related_id: task.id,
            related_type: "task",
          })
        })
      }

      // Long in-progress tasks insight
      if (longInProgressTasks.length > 0) {
        insights.push({
          id: `insight-inprogress-${Date.now()}`,
          type: "suggestion",
          title: "Task Breakdown",
          description: `Consider breaking down "${longInProgressTasks[0].title}" into smaller subtasks to make progress easier to track.`,
          timestamp: new Date().toISOString(),
        })
      }

      // Productivity tip
      insights.push({
        id: `insight-productivity-${Date.now()}`,
        type: "productivity",
        title: "Productivity Tip",
        description:
          "Try the Pomodoro Technique: 25 minutes of focused work followed by a 5-minute break to boost productivity.",
        timestamp: new Date().toISOString(),
      })

      // Project suggestion based on task status distribution
      const todoCount = projectTasks.filter((task) => task.status === "todo").length
      const inProgressCount = projectTasks.filter((task) => task.status === "inProgress").length
      const doneCount = projectTasks.filter((task) => task.status === "done").length

      if (inProgressCount > 3) {
        insights.push({
          id: `insight-focus-${Date.now()}`,
          type: "suggestion",
          title: "Focus Your Efforts",
          description: `You have ${inProgressCount} tasks in progress. Consider focusing on completing some before starting new ones.`,
          timestamp: new Date().toISOString(),
        })
      }

      // Weekly summary
      insights.push({
        id: `insight-weekly-${Date.now()}`,
        type: "analytics",
        title: "Weekly Summary",
        description: `This week: ${doneCount} tasks completed, ${inProgressCount} in progress, and ${todoCount} to do.`,
        timestamp: new Date().toISOString(),
      })

      // Cache the insights
      await offlineStore.setItem("insights", JSON.stringify(insights))

      return insights
    } catch (error) {
      console.error("Error generating insights:", error)
      return this.getFallbackInsights()
    }
  },

  /**
   * Get fallback insights when the AI service is unavailable
   */
  getFallbackInsights(): Insight[] {
    return [
      {
        id: "1",
        type: "suggestion",
        title: "Next Steps",
        description: "Consider implementing user settings next to complete the profile section.",
        timestamp: new Date().toISOString(),
      },
      {
        id: "2",
        type: "alert",
        title: "Unfinished Task",
        description:
          "The 'GitHub integration' task is marked as in progress for 5 days. Consider breaking it down into smaller tasks.",
        timestamp: new Date().toISOString(),
      },
      {
        id: "3",
        type: "productivity",
        title: "Productivity Tip",
        description:
          "You complete most tasks in the morning. Consider scheduling complex tasks before noon for optimal productivity.",
        timestamp: new Date().toISOString(),
      },
      {
        id: "4",
        type: "analytics",
        title: "Weekly Summary",
        description: "You completed 12 tasks this week, a 20% increase from last week. Great progress!",
        timestamp: new Date().toISOString(),
      },
    ]
  },
}
