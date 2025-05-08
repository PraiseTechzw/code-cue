import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Project } from "./projectService"
import type { Task } from "./taskService"

// Gemini API key
const GEMINI_API_KEY = "AIzaSyCH6irwSysB1Osl_dnhQzh-LvwS_YHQ9Qg"
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

export type AIInsight = {
  id: string
  type: "suggestion" | "alert" | "productivity" | "analytics"
  title: string
  description: string
  timestamp: string
}

export const aiService = {
  async generateInsights(projects: Project[], tasks: Task[]): Promise<AIInsight[]> {
    try {
      // Check if we have cached insights that are less than 1 hour old
      const cachedInsightsJson = await AsyncStorage.getItem("aiInsights")
      const cachedInsights = cachedInsightsJson ? JSON.parse(cachedInsightsJson) : null

      if (cachedInsights && cachedInsights.timestamp) {
        const cacheTime = new Date(cachedInsights.timestamp).getTime()
        const currentTime = new Date().getTime()
        const hourInMs = 60 * 60 * 1000

        if (currentTime - cacheTime < hourInMs) {
          return cachedInsights.insights
        }
      }

      // Prepare data for the AI
      const projectData = projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        progress: p.progress,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }))

      const taskData = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        project_id: t.project_id,
        created_at: t.created_at,
        updated_at: t.updated_at,
      }))

      // Create prompt for Gemini
      const prompt = `
        As an AI project assistant, analyze this project and task data to provide 5 insights:
        
        Projects: ${JSON.stringify(projectData)}
        Tasks: ${JSON.stringify(taskData)}
        
        Generate 5 insights in the following JSON format:
        [
          {
            "type": "suggestion|alert|productivity|analytics",
            "title": "Brief title",
            "description": "Detailed insight description"
          }
        ]
        
        Include:
        - 1-2 suggestions for next steps or improvements
        - 1 alert about potential issues (overdue tasks, bottlenecks)
        - 1 productivity tip based on work patterns
        - 1 analytics insight about progress or trends
        
        Return ONLY valid JSON without any additional text.
      `

      // Call Gemini API
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      // Extract the generated text
      const generatedText = data.candidates[0].content.parts[0].text

      // Parse the JSON from the response
      // Find JSON in the response (in case the model adds extra text)
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/)
      const jsonString = jsonMatch ? jsonMatch[0] : generatedText

      let insights = JSON.parse(jsonString)

      // Add IDs and timestamps to insights
      insights = insights.map((insight: any, index: number) => ({
        ...insight,
        id: `ai_${Date.now()}_${index}`,
        timestamp: new Date().toISOString(),
      }))

      // Cache the insights
      await AsyncStorage.setItem(
        "aiInsights",
        JSON.stringify({
          insights,
          timestamp: new Date().toISOString(),
        }),
      )

      return insights
    } catch (error) {
      console.error("Error generating AI insights:", error)

      // If there's an error, try to return cached insights regardless of age
      try {
        const cachedInsightsJson = await AsyncStorage.getItem("aiInsights")
        const cachedInsights = cachedInsightsJson ? JSON.parse(cachedInsightsJson) : null

        if (cachedInsights && cachedInsights.insights) {
          return cachedInsights.insights
        }
      } catch (cacheError) {
        console.error("Error retrieving cached insights:", cacheError)
      }

      // If all else fails, return some fallback insights
      return this.getFallbackInsights()
    }
  },

  async analyzeTask(task: Task, projectName: string): Promise<string> {
    try {
      const prompt = `
        Analyze this task and provide recommendations:
        
        Task: ${JSON.stringify(task)}
        Project: ${projectName}
        
        Provide a brief analysis with:
        1. Estimated time to complete based on description
        2. Suggested approach or steps
        3. Potential challenges to watch for
        
        Keep your response under 200 words and focus on practical advice.
      `

      // Call Gemini API
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 512,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      // Extract the generated text
      return data.candidates[0].content.parts[0].text
    } catch (error) {
      console.error("Error analyzing task:", error)
      return "Unable to analyze task at this time. Please try again later."
    }
  },

  async suggestNextTasks(projectId: string, completedTasks: Task[]): Promise<string[]> {
    try {
      const prompt = `
        Based on these completed tasks for project ${projectId}:
        ${JSON.stringify(completedTasks)}
        
        Suggest 3 logical next tasks to work on.
        Return only a JSON array of task titles without any additional text:
        ["Task 1", "Task 2", "Task 3"]
      `

      // Call Gemini API
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 256,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      // Extract the generated text
      const generatedText = data.candidates[0].content.parts[0].text

      // Parse the JSON from the response
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/)
      const jsonString = jsonMatch ? jsonMatch[0] : generatedText

      return JSON.parse(jsonString)
    } catch (error) {
      console.error("Error suggesting next tasks:", error)
      return ["Implement remaining features", "Fix outstanding bugs", "Improve user experience"]
    }
  },

  getFallbackInsights(): AIInsight[] {
    return [
      {
        id: `ai_fallback_1`,
        type: "suggestion",
        title: "Complete High Priority Tasks",
        description:
          "Focus on completing high priority tasks that are approaching their due dates to maintain project momentum.",
        timestamp: new Date().toISOString(),
      },
      {
        id: `ai_fallback_2`,
        type: "alert",
        title: "Check Overdue Tasks",
        description:
          "Some tasks may be past their due dates. Consider reviewing and updating their status or timeline.",
        timestamp: new Date().toISOString(),
      },
      {
        id: `ai_fallback_3`,
        type: "productivity",
        title: "Break Down Large Tasks",
        description:
          "Consider breaking down large tasks into smaller subtasks to make progress more measurable and manageable.",
        timestamp: new Date().toISOString(),
      },
      {
        id: `ai_fallback_4`,
        type: "analytics",
        title: "Project Progress",
        description:
          "Review your project progress regularly and adjust timelines if necessary to ensure successful completion.",
        timestamp: new Date().toISOString(),
      },
      {
        id: `ai_fallback_5`,
        type: "suggestion",
        title: "Document Your Work",
        description: "Keep documentation updated as you complete tasks to make future work easier and more efficient.",
        timestamp: new Date().toISOString(),
      },
    ]
  },
}
