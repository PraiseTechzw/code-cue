import { Component, type ErrorInfo, type ReactNode } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from "react-native"
import Colors from "@/constants/Colors"
import { router } from "expo-router"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

// Create styles factory function to handle theme
const createStyles = (theme: typeof Colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: theme.background,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textDim,
    marginBottom: 20,
  },
  errorContainer: {
    maxHeight: 300,
    width: "100%",
    marginVertical: 20,
    padding: 15,
    backgroundColor: theme.cardBackground,
    borderRadius: 8,
  },
  errorText: {
    color: theme.error,
    fontSize: 14,
    fontFamily: "monospace",
    marginBottom: 10,
  },
  stackTrace: {
    color: theme.textDim,
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
  },
  primaryButton: {
    backgroundColor: theme.tint,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.border,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  secondaryButtonText: {
    color: theme.text,
    fontWeight: "bold",
    fontSize: 16,
  },
})

// Wrapper component to handle theme
function ErrorBoundaryWithTheme(props: Props) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? 'light']
  return <ErrorBoundaryClass {...props} theme={theme} />
}

class ErrorBoundaryClass extends Component<Props & { theme: typeof Colors.light }, State> {
  constructor(props: Props & { theme: typeof Colors.light }) {
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
    const styles = createStyles(this.props.theme)

    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>We're sorry for the inconvenience</Text>

          <ScrollView style={styles.errorContainer}>
            <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
            {this.state.errorInfo && <Text style={styles.stackTrace}>{this.state.errorInfo.componentStack}</Text>}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={this.resetError}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={this.goToHome}>
              <Text style={styles.secondaryButtonText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundaryWithTheme
