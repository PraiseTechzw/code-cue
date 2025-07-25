"use client"

import { useState, useRef, useEffect } from "react"
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
  Alert,
  Switch,
  Image,
} from "react-native"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { router, useLocalSearchParams } from "expo-router"
import { useColorScheme } from "react-native"
import * as Haptics from "expo-haptics"
import DateTimePicker from "@react-native-community/datetimepicker"
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import React from "react"

import { taskService } from "@/services/taskService"
import { projectService } from "@/services/projectService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"
import { ConnectionStatus } from "@/components/ConnectionStatus"
import { phaseService } from '@/services/phaseService';
import { teamService } from '@/services/teamService';
import { profileService } from '@/services/profileService';

export default function AddTaskScreen() {
  const { projectId } = useLocalSearchParams()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [taskTitle, setTaskTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [priority, setPriority] = useState("Medium")
  const [loading, setLoading] = useState(false)
  const [projectLoading, setProjectLoading] = useState(true)
  const [projectName, setProjectName] = useState("")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [hasSubtasks, setHasSubtasks] = useState(false)
  const [subtasks, setSubtasks] = useState<string[]>([])
  const [newSubtask, setNewSubtask] = useState("")
  const [allTasks, setAllTasks] = useState<any[]>([])
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([])
  const [phases, setPhases] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any>({})
  const [dependencySearch, setDependencySearch] = useState('')
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)

  // Animation for the add button
  const buttonOpacity = useRef(new Animated.Value(0.5)).current
  const buttonScale = useRef(new Animated.Value(1)).current
  const inputAnim = useRef(new Animated.Value(0)).current

  // Load project details
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) return

      try {
        setProjectLoading(true)
        const project = await projectService.getProjectById(projectId as string)
        if (project) {
          setProjectName(project.name)
        }
      } catch (error) {
        // console.error("Error loading project:", error)
      } finally {
        setProjectLoading(false)
      }
    }

    loadProject()
  }, [projectId])

  // Check network status
  useEffect(() => {
    const checkNetworkStatus = async () => {
      const online = await taskService.isOnline()
      setIsOffline(!online)
    }

    checkNetworkStatus()
    const interval = setInterval(checkNetworkStatus, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [])

  // Animate input fields on mount
  useEffect(() => {
    Animated.timing(inputAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()
  }, [])

  // Update button opacity based on form validity
  const isFormValid = taskTitle.trim() !== ""

  useEffect(() => {
    Animated.timing(buttonOpacity, {
      toValue: isFormValid ? 1 : 0.5,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [isFormValid])

  const handlePressIn = () => {
    if (isFormValid) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
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

    if (taskTitle.trim() === "") {
      newErrors.taskTitle = "Task title is required"
    } else if (taskTitle.length > 100) {
      newErrors.taskTitle = "Task title must be less than 100 characters"
    }

    return Object.keys(newErrors).length === 0
  }

  const handleAddTask = async () => {
    if (validateForm()) {
      try {
        setLoading(true)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

        // Format date for storage
        const formattedDueDate = dueDate ? dueDate.toISOString() : null

        if (!selectedPhaseId) {
          showToast("Please select a phase for this task", { type: "error" })
          setLoading(false)
          return
        }

        // Create the task
        const newTask = await taskService.createTask({
          title: taskTitle,
          description,
          due_date: formattedDueDate,
          priority,
          project_id: projectId as string,
          status: "todo",
          dependencies: selectedDependencies,
          phase_id: selectedPhaseId,
        })

        // Add subtasks if any
        if (hasSubtasks && subtasks.length > 0 && newTask) {
          for (const subtaskTitle of subtasks) {
            if (subtaskTitle.trim()) {
              await taskService.createSubtask({
                title: subtaskTitle,
                task_id: newTask.$id,
                completed: false,
              })
            }
          }
        }

        showToast("Task created successfully", { type: "success" })

        // Navigate back to project details
        router.push(`/project/${projectId}`)
      } catch (error) {
        // console.error("Error creating task:", error)

        if (isOffline) {
          showToast("Task saved offline. Will sync when online.", { type: "info" })
          router.push(`/project/${projectId}`)
        } else {
          showToast("Failed to create task", { type: "error" })
        }
      } finally {
        setLoading(false)
      }
    } else {
      // Shake animation for invalid form
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Animated.sequence([
        Animated.timing(inputAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(inputAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(inputAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(inputAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(inputAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start()
    }
  }

  const handleBack = () => {
    if (taskTitle.trim() !== "" || description.trim() !== "") {
      Alert.alert("Discard Changes", "Are you sure you want to discard your changes?", [
        { text: "Cancel", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => router.back() },
      ])
    } else {
      router.back()
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return ""
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, newSubtask.trim()])
      setNewSubtask("")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  }

  const handleRemoveSubtask = (index: number) => {
    const newSubtasks = [...subtasks]
    newSubtasks.splice(index, 1)
    setSubtasks(newSubtasks)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  // Fetch all tasks, phases, team members, and profiles for dependency suggestions
  useEffect(() => {
    const fetchAll = async () => {
      if (projectId) {
        try {
          const [tasks, phaseList, members] = await Promise.all([
            taskService.getTasksByProject(projectId as string),
            phaseService.getPhasesByProject(projectId as string),
            teamService.getTeamMembers(projectId as string),
          ]);
          setAllTasks(tasks);
          setPhases(phaseList);
          setTeamMembers(members);
          // Fetch all profiles for team members
          const profileMap: any = {};
          for (const member of members) {
            const { documents } = await databases.listDocuments(
              DATABASE_ID,
              COLLECTION_IDS.PROFILES,
              [Query.equal('user_id', member.user_id)]
            );
            if (documents.length > 0) {
              profileMap[member.user_id] = documents[0];
            }
          }
          setProfiles(profileMap);
        } catch (e) {
          setAllTasks([]);
          setPhases([]);
          setTeamMembers([]);
          setProfiles({});
        }
      }
    };
    fetchAll();
  }, [projectId]);

  // When phases are loaded, auto-select if only one phase
  useEffect(() => {
    if (phases.length === 1) {
      setSelectedPhaseId(phases[0].$id);
    } else if (phases.length === 0) {
      setSelectedPhaseId(null);
    }
  }, [phases]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        {isOffline && (
          <View style={[styles.offlineBanner, { backgroundColor: theme.tintLight }]}>
            <Ionicons name="cloud-offline-outline" size={16} color={theme.tint} />
            <Text style={[styles.offlineText, { color: theme.tint }]}>
              You're offline. Changes will be saved locally.
            </Text>
          </View>
        )}

        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Add New Task</Text>
            {!projectLoading && (
              <Text style={[styles.projectName, { color: theme.textDim }]}>Project: {projectName}</Text>
            )}
          </View>
        </View>

        <Animated.View style={[styles.form, { transform: [{ translateX: inputAnim }] }]}>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Task Title*</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Enter task title"
              placeholderTextColor={theme.textDim}
              value={taskTitle}
              onChangeText={setTaskTitle}
              maxLength={100}
              accessibilityLabel="Task title input"
              accessibilityHint="Enter the title of your task"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Enter task description (optional)"
              placeholderTextColor={theme.textDim}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              accessibilityLabel="Task description input"
              accessibilityHint="Enter a description for your task"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Due Date</Text>
            <TouchableOpacity
              style={[styles.dateInput, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => setShowDatePicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Select due date"
              accessibilityHint="Opens date picker to select task due date"
            >
              <Text style={{ color: dueDate ? theme.text : theme.textDim }}>
                {dueDate ? formatDate(dueDate) : "Select due date (optional)"}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={theme.textDim} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false)
                  if (selectedDate) {
                    setDueDate(selectedDate)
                  }
                }}
              />
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Priority</Text>
            <View style={styles.priorityContainer}>
              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  priority === "Low" && styles.priorityButtonActive,
                  priority === "Low" && { backgroundColor: "rgba(76, 175, 80, 0.2)" },
                ]}
                onPress={() => setPriority("Low")}
                accessibilityRole="radio"
                accessibilityState={{ checked: priority === "Low" }}
                accessibilityLabel="Low priority"
              >
                <View style={[styles.priorityDot, { backgroundColor: "#4CAF50" }]} />
                <Text style={[styles.priorityText, { color: priority === "Low" ? "#4CAF50" : theme.textDim }]}>
                  Low
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  priority === "Medium" && styles.priorityButtonActive,
                  priority === "Medium" && { backgroundColor: "rgba(255, 152, 0, 0.2)" },
                ]}
                onPress={() => setPriority("Medium")}
                accessibilityRole="radio"
                accessibilityState={{ checked: priority === "Medium" }}
                accessibilityLabel="Medium priority"
              >
                <View style={[styles.priorityDot, { backgroundColor: "#FF9800" }]} />
                <Text style={[styles.priorityText, { color: priority === "Medium" ? "#FF9800" : theme.textDim }]}>
                  Medium
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  priority === "High" && styles.priorityButtonActive,
                  priority === "High" && { backgroundColor: "rgba(244, 67, 54, 0.2)" },
                ]}
                onPress={() => setPriority("High")}
                accessibilityRole="radio"
                accessibilityState={{ checked: priority === "High" }}
                accessibilityLabel="High priority"
              >
                <View style={[styles.priorityDot, { backgroundColor: "#F44336" }]} />
                <Text style={[styles.priorityText, { color: priority === "High" ? "#F44336" : theme.textDim }]}>
                  High
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Dependencies</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border, marginBottom: 8 },
              ]}
              placeholder="Search tasks..."
              placeholderTextColor={theme.textDim}
              value={dependencySearch}
              onChangeText={setDependencySearch}
              accessibilityLabel="Search dependencies"
            />
            {phases.length === 0 ? (
              <Text style={{ color: theme.textDim }}>No phases found.</Text>
            ) : (
              <>
                {phases.map(phase => {
                  // Filter tasks for this phase
                  const phaseTasks = allTasks.filter(
                    t => t.phase_id === phase.$id && t.status !== 'done' && t.$id !== undefined && t.title && t.title !== taskTitle &&
                      (!dependencySearch || t.title.toLowerCase().includes(dependencySearch.toLowerCase()))
                  ).sort((a, b) => {
                    // Sort by due date, then by creation date
                    const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity;
                    const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity;
                    if (aDue !== bDue) return aDue - bDue;
                    return new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime();
                  });
                  if (phaseTasks.length === 0) return null;
                  return (
                    <View key={phase.$id} style={{ marginBottom: 8 }}>
                      <Text style={{ fontWeight: 'bold', color: theme.tint, marginBottom: 4 }}>{phase.name}</Text>
                      {phaseTasks.map(task => {
                        const assigneeProfile = task.assignee_id ? profiles[task.assignee_id] : null;
                        return (
                          <TouchableOpacity
                            key={task.$id}
                            style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}
                            onPress={() => {
                              if (selectedDependencies.includes(task.$id)) {
                                setSelectedDependencies(selectedDependencies.filter(id => id !== task.$id));
                              } else {
                                setSelectedDependencies([...selectedDependencies, task.$id]);
                              }
                            }}
                          >
                            <Ionicons
                              name={selectedDependencies.includes(task.$id) ? 'checkbox' : 'square-outline'}
                              size={20}
                              color={selectedDependencies.includes(task.$id) ? theme.tint : theme.textDim}
                              style={{ marginRight: 8 }}
                            />
                            {assigneeProfile && assigneeProfile.avatar_url ? (
                              <Image source={{ uri: assigneeProfile.avatar_url }} style={{ width: 20, height: 20, borderRadius: 10, marginRight: 6 }} />
                            ) : null}
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: theme.text }}>{task.title}</Text>
                              <Text style={{ color: theme.textDim, fontSize: 12 }}>
                                {task.status} {assigneeProfile && assigneeProfile.full_name ? `• ${assigneeProfile.full_name}` : ''}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </>
            )}
            {selectedDependencies.length > 0 && (
              <Text style={{ color: theme.textDim, fontSize: 12, marginTop: 4 }}>
                Depends on: {selectedDependencies.map(id => {
                  const t = allTasks.find(t => t.$id === id);
                  return t ? t.title : id;
                }).join(', ')}
              </Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Phase</Text>
            {phases.length === 0 ? (
              <Text style={{ color: theme.error }}>No phases available. Please create a phase first.</Text>
            ) : phases.length === 1 ? (
              <Text style={{ color: theme.text }}>{phases[0].name}</Text>
            ) : (
              <View style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, backgroundColor: theme.cardBackground }}>
                {phases.map((phase: any) => (
                  <TouchableOpacity
                    key={phase.$id}
                    style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}
                    onPress={() => setSelectedPhaseId(phase.$id)}
                  >
                    <Text style={{ color: selectedPhaseId === phase.$id ? theme.tint : theme.text }}>{phase.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <View style={styles.subtaskHeader}>
              <Text style={[styles.label, { color: theme.text }]}>Subtasks</Text>
              <View style={styles.subtaskToggle}>
                <Text style={[styles.subtaskToggleText, { color: theme.textDim }]}>Add subtasks</Text>
                <Switch
                  value={hasSubtasks}
                  onValueChange={setHasSubtasks}
                  trackColor={{ false: theme.border, true: theme.tintLight }}
                  thumbColor={hasSubtasks ? theme.tint : theme.textDim}
                  accessibilityLabel="Toggle subtasks"
                  accessibilityHint="Enable to add subtasks to this task"
                />
              </View>
            </View>

            {hasSubtasks && (
              <View style={styles.subtasksContainer}>
                {subtasks.map((subtask, index) => (
                  <View key={index} style={[styles.subtaskItem, { backgroundColor: theme.cardBackground }]}>
                    <Text style={[styles.subtaskText, { color: theme.text }]} numberOfLines={1}>
                      {subtask}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveSubtask(index)}
                      accessibilityLabel={`Remove subtask ${subtask}`}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.textDim} />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.addSubtaskContainer}>
                  <TextInput
                    style={[
                      styles.subtaskInput,
                      { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
                    ]}
                    placeholder="Add a subtask"
                    placeholderTextColor={theme.textDim}
                    value={newSubtask}
                    onChangeText={setNewSubtask}
                    onSubmitEditing={handleAddSubtask}
                    returnKeyType="done"
                    accessibilityLabel="New subtask input"
                    accessibilityHint="Enter a subtask and press add or return"
                  />
                  <TouchableOpacity
                    style={[styles.addSubtaskButton, { backgroundColor: theme.tint }]}
                    onPress={handleAddSubtask}
                    disabled={!newSubtask.trim()}
                    accessibilityLabel="Add subtask"
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <Animated.View style={{ opacity: buttonOpacity, transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.tint }]}
              onPress={handleAddTask}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={!isFormValid || loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Add task"
              accessibilityHint="Creates a new task with the entered information"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" style={styles.addIcon} />
                  <Text style={styles.addButtonText}>Add Task</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={[styles.requiredFieldsNote, { color: theme.textDim }]}>* Required fields</Text>
        </Animated.View>
      </ScrollView>

      <ConnectionStatus />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    marginBottom: 8,
  },
  offlineText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
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
  projectName: {
    fontSize: 14,
    marginTop: 4,
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
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priorityContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  priorityButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  priorityButtonActive: {
    borderColor: "transparent",
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  priorityText: {
    fontWeight: "500",
  },
  subtaskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  subtaskToggle: {
    flexDirection: "row",
    alignItems: "center",
  },
  subtaskToggleText: {
    fontSize: 14,
    marginRight: 8,
  },
  subtasksContainer: {
    marginTop: 8,
  },
  subtaskItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  subtaskText: {
    flex: 1,
    marginRight: 8,
  },
  addSubtaskContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  subtaskInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  addSubtaskButton: {
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
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
  addIcon: {
    marginRight: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  requiredFieldsNote: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
  },
})
