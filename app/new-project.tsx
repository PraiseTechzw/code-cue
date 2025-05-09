"use client"

import { useState } from "react"
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useColorScheme } from "react-native"

import { projectService } from "@/services/projectService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"

export default function NewProjectScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [projectName, setProjectName] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(false)

  // Animation for the create button
  const buttonOpacity = new Animated.Value(0.5)
  const buttonScale = new Animated.Value(1)

  // Update button opacity based on form validity
  const isFormValid = projectName.trim() !== "" && description.trim() !== ""
  buttonOpacity.setValue(isFormValid ? 1 : 0.5)

  const handlePressIn = () => {
    if (isFormValid) {
      Animated.spring(buttonScale, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start()
    }
  }

  const handlePressOut = () => {
    if (isFormValid) {
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start()
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (projectName.trim() === "") {
      newErrors.projectName = "Project name is required"
    }

    if (description.trim() === "") {
      newErrors.description = "Description is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateProject = async () => {
    if (validateForm()) {
      try {
        setLoading(true)

        // Create the project
        const newProject = await projectService.createProject({
          name: projectName,
          description,
          progress: 0,
        })

        showToast("Project created successfully", { type: "success" })

        // Navigate back to projects screen
        router.push("/projects")
      } catch (error) {
        console.error("Error creating project:", error)
        showToast("Failed to create project", { type: "error" })
      } finally {
        setLoading(false)
      }
    }
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>New Project</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Project Name</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
                errors.projectName && styles.inputError,
              ]}
              placeholder="Enter project name"
              placeholderTextColor={theme.textDim}
              value={projectName}
              onChangeText={setProjectName}
            />
            {errors.projectName && <Text style={styles.errorText}>{errors.projectName}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
                errors.description && styles.inputError,
              ]}
              placeholder="Enter project description"
              placeholderTextColor={theme.textDim}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          <View style={styles.dateContainer}>
            <View style={[styles.formGroup, styles.dateField]}>
              <Text style={[styles.label, { color: theme.text }]}>Start Date (Optional)</Text>
              <TouchableOpacity
                style={[styles.dateInput, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              >
                <Text style={{ color: startDate ? theme.text : theme.textDim }}>{startDate || "Select date"}</Text>
                <Ionicons name="calendar-outline" size={20} color={theme.textDim} />
              </TouchableOpacity>
            </View>

            <View style={[styles.formGroup, styles.dateField]}>
              <Text style={[styles.label, { color: theme.text }]}>End Date (Optional)</Text>
              <TouchableOpacity
                style={[styles.dateInput, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              >
                <Text style={{ color: endDate ? theme.text : theme.textDim }}>{endDate || "Select date"}</Text>
                <Ionicons name="calendar-outline" size={20} color={theme.textDim} />
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View style={{ opacity: buttonOpacity, transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.tint }]}
              onPress={handleCreateProject}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={!isFormValid || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" style={styles.createIcon} />
                  <Text style={styles.createButtonText}>Create Project</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  form: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  inputError: {
    borderColor: "#F44336",
  },
  errorText: {
    color: "#F44336",
    fontSize: 12,
    marginTop: 4,
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateField: {
    width: "48%",
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  createIcon: {
    marginRight: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
