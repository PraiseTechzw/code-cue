import { offlineStore } from "./offlineStore"
import { notificationService } from "./notificationService"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize Gemini AI
const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY
if (!geminiApiKey) {
  throw new Error('EXPO_PUBLIC_GEMINI_API_KEY environment variable is required for Gemini AI.')
}
const genAI = new GoogleGenerativeAI(geminiApiKey)
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" })

// Types for insights
export interface Insight {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
}

interface ProductivityTip {
  id: string
  title: string
  description: string
  category: "time" | "focus" | "planning" | "collaboration" | "workflow"
  difficulty: "easy" | "medium" | "hard"
  timestamp: string
}

/**
 * Generate insights using Gemini AI
 */
async function generateAIInsights(projects: any[], tasks: any[]): Promise<Insight[]> {
  try {
    const prompt = `
      Analyze the following project and task data to generate insights:
      Projects: ${JSON.stringify(projects, null, 2)}
      Tasks: ${JSON.stringify(tasks, null, 2)}

      Generate 4-5 insights in the following format:
      {
        "type": "suggestion" | "alert" | "productivity" | "analytics",
        "title": "Brief title",
        "description": "Detailed insight description"
      }

      Focus on:
      1. Project progress and deadlines
      2. Task distribution and workload
      3. Productivity patterns
      4. Potential bottlenecks or issues
      5. Recommendations for improvement
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Parse the AI response and format insights
    const aiInsights = JSON.parse(text.substring(
      text.indexOf("["),
      text.lastIndexOf("]") + 1
    ))

    return aiInsights.map((insight: any) => ({
      ...insight,
      id: `insight-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString()
    }))
  } catch (error) {
    return []
  }
}

/**
 * Generate productivity tips using Gemini AI
 */
async function generateProductivityTips(userActivity: any): Promise<ProductivityTip[]> {
  try {
    const prompt = `
      Generate 3 practical productivity tips for a software developer.
      Format each tip as a JSON object with:
      {
        "title": "Brief, actionable title",
        "description": "Detailed explanation with concrete steps",
        "category": "time" | "focus" | "planning" | "collaboration" | "workflow",
        "difficulty": "easy" | "medium" | "hard"
      }

      Make tips specific, actionable, and based on proven productivity techniques.
      Focus on:
      1. Time management
      2. Focus and concentration
      3. Task organization
      4. Team collaboration
      5. Development workflow optimization
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Parse the AI response and format tips
    const aiTips = JSON.parse(text.substring(
      text.indexOf("["),
      text.lastIndexOf("]") + 1
    ))

    return aiTips.map((tip: any) => ({
      ...tip,
      id: `tip-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString()
    }))
  } catch (error) {
    return getFallbackTips()
  }
}

function getFallbackTips(): ProductivityTip[] {
  return [
    {
      id: "tip-1",
      title: "Time-Boxing with Pomodoro",
      description: "Use the Pomodoro Technique: Work for 25 minutes, then take a 5-minute break. After 4 cycles, take a longer 15-30 minute break. This helps maintain focus and prevents burnout.",
      category: "time",
      difficulty: "easy",
      timestamp: new Date().toISOString()
    },
    {
      id: "tip-2",
      title: "Task Prioritization Matrix",
      description: "Use the Eisenhower Matrix to prioritize tasks: Urgent & Important (Do First), Important but Not Urgent (Schedule), Urgent but Not Important (Delegate), Neither (Eliminate).",
      category: "planning",
      difficulty: "medium",
      timestamp: new Date().toISOString()
    },
    {
      id: "tip-3",
      title: "Code Review Efficiency",
      description: "Schedule dedicated code review time blocks. Review code in chunks of 200-400 lines at a time. Take breaks between reviews to maintain high quality feedback.",
      category: "workflow",
      difficulty: "medium",
      timestamp: new Date().toISOString()
    }
  ]
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
      // Check if we have cached insights
      const cachedInsights = await offlineStore.getData("insights", async () => null)
      if (cachedInsights) {
        return cachedInsights
      }

      // If no projects, return empty insights
      if (!projects || projects.length === 0) {
        return []
      }

      // Generate AI insights
      const aiInsights = await generateAIInsights(projects, tasks)
      if (aiInsights.length > 0) {
        // Cache the AI insights
        await offlineStore.getData("insights", async () => aiInsights)
        return aiInsights
      }

      // Fallback to rule-based insights if AI fails
      const insights: Insight[] = []

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
            related_id: task.id
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

      return insights
    } catch (error) {
      return this.getFallbackInsights()
    }
  },

  /**
   * Get AI-generated productivity tips
   */
  async getProductivityTips(): Promise<ProductivityTip[]> {
    try {
      // Check cache first
      const cachedTips = await offlineStore.getData("productivityTips", async () => null)
      if (cachedTips) {
        return cachedTips
      }

      // Generate new tips
      const tips = await generateProductivityTips({})
      
      // Cache the tips
      await offlineStore.getData("productivityTips", async () => tips)
      
      return tips
    } catch (error) {
      return getFallbackTips()
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
