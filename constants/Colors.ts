const tintColor = "#6366F1"

export type ColorTheme = {
  text: string
  textDim: string
  background: string
  cardBackground: string
  tint: string
  tintLight: string
  tabIconDefault: string
  tabIconSelected: string
  border: string
  ripple: string
  success: string
  warning: string
  error: string
  info: string
  highPriority: string
  mediumPriority: string
  lowPriority: string
  warningBackground: string
  warningText: string
}

export type Colors = {
  light: ColorTheme
  dark: ColorTheme
  // Task priorities
  highPriority: string
  mediumPriority: string
  lowPriority: string
  // Task status colors
  todoStatus: string
  inProgressStatus: string
  reviewStatus: string
  doneStatus: string
  // GitHub colors
  github: string
  // Notification types
  infoNotification: string
  successNotification: string
  warningNotification: string
  errorNotification: string
}

const Colors: Colors = {
  light: {
    text: "#1F2937",
    textDim: "#6B7280",
    background: "#F9FAFB",
    cardBackground: "#FFFFFF",
    tint: tintColor,
    tintLight: "rgba(99, 102, 241, 0.1)",
    tabIconDefault: "#6B7280",
    tabIconSelected: tintColor,
    border: "#E5E7EB",
    ripple: "rgba(0, 0, 0, 0.1)",
    success: "#4CAF50",
    warning: "#FF9800",
    error: "#F44336",
    info: "#2196F3",
    highPriority: "#F44336",
    mediumPriority: "#FF9800",
    lowPriority: "#4CAF50",
    warningBackground: "#FFF3E0",
    warningText: "#FF9800",
  },
  dark: {
    text: "#F9FAFB",
    textDim: "#9CA3AF",
    background: "#111827",
    cardBackground: "#1F2937",
    tint: tintColor,
    tintLight: "rgba(99, 102, 241, 0.2)",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: tintColor,
    border: "#374151",
    ripple: "rgba(255, 255, 255, 0.1)",
    success: "#4CAF50",
    warning: "#FF9800",
    error: "#F44336",
    info: "#2196F3",
    highPriority: "#F44336",
    mediumPriority: "#FF9800",
    lowPriority: "#4CAF50",
    warningBackground: "#2D2010",
    warningText: "#FF9800",
  },
  // Task priorities
  highPriority: "#FF3B30",
  mediumPriority: "#FF9500",
  lowPriority: "#34C759",
  // Task status colors
  todoStatus: "#8E8E93",
  inProgressStatus: "#007AFF",
  reviewStatus: "#5856D6",
  doneStatus: "#34C759",
  // GitHub colors
  github: "#24292E",
  // Notification types
  infoNotification: "#007AFF",
  successNotification: "#34C759",
  warningNotification: "#FF9500",
  errorNotification: "#FF3B30",
}

export default Colors

