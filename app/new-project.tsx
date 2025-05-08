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
  Modal,
} from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useColorScheme } from "react-native"
import Colors from "@/constants/Colors"
import DateTimePicker from '@react-native-community/datetimepicker'

export default function NewProjectScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const [projectName, setProjectName] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [newTeamMember, setNewTeamMember] = useState("")

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

    if (startDate && endDate && startDate > endDate) {
      newErrors.dates = "End date must be after start date"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateProject = () => {
    if (validateForm()) {
      // In a real app, this would save the project to a database
      console.log("Creating project:", { 
        projectName, 
        description, 
        startDate: startDate?.toISOString(), 
        endDate: endDate?.toISOString(),
        teamMembers 
      })

      // Navigate back to projects screen
      router.push("/projects")
    }
  }

  const handleBack = () => {
    router.back()
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "Select date"
    return date.toLocaleDateString("en-US", { 
      year: "numeric",
      month: "short", 
      day: "numeric" 
    })
  }

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false)
    if (selectedDate) {
      setStartDate(selectedDate)
    }
  }

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false)
    if (selectedDate) {
      setEndDate(selectedDate)
    }
  }

  const handleAddTeamMember = () => {
    if (newTeamMember.trim() && !teamMembers.includes(newTeamMember.trim())) {
      setTeamMembers([...teamMembers, newTeamMember.trim()])
      setNewTeamMember("")
    }
  }

  const handleSubmitEditing = () => {
    handleAddTeamMember()
  }

  const handleRemoveTeamMember = (member: string) => {
    setTeamMembers(teamMembers.filter(m => m !== member))
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
              <Text style={[styles.label, { color: theme.text }]}>Start Date</Text>
              <TouchableOpacity
                style={[styles.dateInput, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={{ color: startDate ? theme.text : theme.textDim }}>{formatDate(startDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color={theme.textDim} />
              </TouchableOpacity>
            </View>

            <View style={[styles.formGroup, styles.dateField]}>
              <Text style={[styles.label, { color: theme.text }]}>End Date</Text>
              <TouchableOpacity
                style={[styles.dateInput, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={{ color: endDate ? theme.text : theme.textDim }}>{formatDate(endDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color={theme.textDim} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Team Members</Text>
            <TouchableOpacity
              style={[styles.addMemberButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => setShowTeamModal(true)}
            >
              <Ionicons name="person-add-outline" size={20} color={theme.tint} />
              <Text style={[styles.addMemberText, { color: theme.tint }]}>Add Team Members</Text>
            </TouchableOpacity>
          </View>

          <Animated.View style={{ opacity: buttonOpacity, transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.tint }]}
              onPress={handleCreateProject}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={!isFormValid}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" style={styles.createIcon} />
              <Text style={styles.createButtonText}>Create Project</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>

      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
        />
      )}

      {showTeamModal && (
        <Modal
          visible={showTeamModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowTeamModal(false)}
        >
          <View style={[styles.teamModal, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
            <View style={[styles.teamModalContent, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.teamModalTitle, { color: theme.text }]}>Add Team Member</Text>
              <TextInput
                style={[styles.teamModalInput, { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border 
                }]}
                placeholder="Enter member name"
                placeholderTextColor={theme.textDim}
                value={newTeamMember}
                onChangeText={setNewTeamMember}
                onSubmitEditing={handleSubmitEditing}
              />
              <View style={styles.teamModalButtons}>
                <TouchableOpacity
                  style={[styles.teamModalButton, { backgroundColor: theme.tint }]}
                  onPress={handleAddTeamMember}
                >
                  <Text style={styles.teamModalButtonText}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.teamModalButton, { backgroundColor: theme.textDim }]}
                  onPress={() => setShowTeamModal(false)}
                >
                  <Text style={styles.teamModalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  addMemberButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  addMemberText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
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
  teamModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamModalContent: {
    padding: 20,
    borderRadius: 20,
    width: '80%',
    alignItems: 'center',
  },
  teamModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  teamModalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 20,
    fontSize: 16,
  },
  teamModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  teamModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  teamModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
