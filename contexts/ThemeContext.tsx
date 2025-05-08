import React, { createContext, useContext, useState, useEffect } from "react"
import { useColorScheme } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"

type ThemeContextType = {
  isDarkMode: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme()
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === "dark")

  useEffect(() => {
    loadThemePreference()
  }, [])

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("theme")
      if (savedTheme) {
        setIsDarkMode(savedTheme === "dark")
      } else {
        setIsDarkMode(systemColorScheme === "dark")
      }
    } catch (error) {
      console.error("Error loading theme preference:", error)
    }
  }

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode
      setIsDarkMode(newTheme)
      await AsyncStorage.setItem("theme", newTheme ? "dark" : "light")
    } catch (error) {
      console.error("Error saving theme preference:", error)
    }
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
} 