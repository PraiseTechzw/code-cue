import { Component, type ErrorInfo, type ReactNode } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import Colors from "@/constants/Colors"
import { router } from "expo-router"
import { useColorScheme } from "react-native"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

interface ErrorDisplayProps {
  error: Error | null
  errorInfo: ErrorInfo | null
  onReset: () => void
  onGoHome: () => void
}

function ErrorDisplay({ error, errorInfo, onReset, onGoHome }: ErrorDisplayProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Something went wrong</Text>
      <Text style={[styles.subtitle, { color: theme.textDim }]}>We're sorry for the inconvenience</Text>

      <ScrollView style={[styles.errorContainer, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.errorText, { color: theme.error }]}>{error?.toString()}</Text>
        {errorInfo && <Text style={[styles.stackTrace, { color: theme.textDim }]}>{errorInfo.componentStack}</Text>}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, { backgroundColor: theme.tint }]} onPress={onReset}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, { backgroundColor: "transparent", borderColor: theme.border }]} onPress={onGoHome}>
          <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    })

    // Log error to an error reporting service
    console.error("Error caught by ErrorBoundary:", error, errorInfo)
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  goToHome = (): void => {
    this.resetError()
    router.replace("/")
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.resetError}
          onGoHome={this.goToHome}
        />
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  errorContainer: {
    maxHeight: 300,
    width: "100%",
    marginVertical: 20,
    padding: 15,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "monospace",
    marginBottom: 10,
  },
  stackTrace: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 150,
    borderWidth: 1,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  secondaryButtonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
})

export default ErrorBoundary
