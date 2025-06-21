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
} from "react-native"
import  Ionicons from "@expo/vector-icons/Ionicons"
import { router, useLocalSearchParams } from "expo-router"
import { useColorScheme } from "react-native"
import * as Haptics from "expo-haptics"
import DateTimePicker from "@react-native-community/datetimepicker"

import { phaseService } from "@/services/phaseService"
import { useToast } from "@/contexts/ToastContext"
import Colors from "@/constants/Colors"
import { ConnectionStatus } from "@/components/ConnectionStatus"

export default function AddPhaseScreen() {
  const { projectId } = useLocalSearchParams()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  const { showToast } = useToast()

  const [phaseName, setPhaseName] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [weight, setWeight] = useState("25")
  const [status, setStatus] = useState("not-started")
  const [order, setOrder] = useState("1")
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(false)
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  // Animation for the create button
  const buttonOpacity = useRef(new Animated.Value(0.5)).current
  const buttonScale = useRef(new Animated.Value(1)).current
  const inputAnim = useRef(new Animated.Value(0)).current

  // Check network status
  useEffect(() => {
    const checkNetworkStatus = async () => {
      const online = await phaseService.isOnline()
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
  const isFormValid = phaseName.trim() !== "" && description.trim() !== ""

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

    if (phaseName.trim() === "") {
      newErrors.phaseName = "Phase name is required"
    } else if (phaseName.length > 100) {
      newErrors.phaseName = "Phase name must be less than 100 characters"
    }

    if (description.trim() === "") {
      newErrors.description = "Description is required"
    }

    const weightNum = parseInt(weight)
    if (isNaN(weightNum) || weightNum < 1 || weightNum > 100) {
      newErrors.weight = "Weight must be between 1 and 100"
    }

    const orderNum = parseInt(order)
    if (isNaN(orderNum) || orderNum < 1) {
      newErrors.order = "Order must be a positive number"
    }

    if (startDate && endDate && startDate > endDate) {
      newErrors.endDate = "End date must be after start date"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreatePhase = async () => {
    if (validateForm()) {
      try {
        setLoading(true)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

        // Format dates for storage
        const formattedStartDate = startDate ? startDate.toISOString() : null
        const formattedEndDate = endDate ? endDate.toISOString() : null

        // Create the phase
        const newPhase = await phaseService.createPhase({
          name: phaseName,
          description,
          project_id: projectId as string,
          order: parseInt(order),
          progress: 0,
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          status: status as any,
          weight: parseInt(weight),
          assignee_id: null,
          dependencies: [],
        })

        showToast("Phase created successfully", { type: "success" })

        // Navigate back to project details
        router.push(`/project/${projectId}`)
      } catch (error) {
        console.error("Error creating phase:", error)

        if (isOffline) {
          showToast("Phase saved offline. Will sync when online.", { type: "info" })
          router.push(`/project/${projectId}`)
        } else {
          showToast("Failed to create phase", { type: "error" })
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const statusOptions = [
    { value: "not-started", label: "Not Started", color: "#9E9E9E" },
    { value: "in-progress", label: "In Progress", color: "#FF9800" },
    { value: "completed", label: "Completed", color: "#4CAF50" },
    { value: "on-hold", label: "On Hold", color: "#F44336" },
  ]

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Add Phase</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View
          style={[
            styles.formContainer,
            {
              transform: [{ translateX: inputAnim }],
            },
          ]}
        >
          {/* Phase Name */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Phase Name *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text },
                errors.phaseName && styles.inputError,
              ]}
              value={phaseName}
              onChangeText={setPhaseName}
              placeholder="Enter phase name"
              placeholderTextColor={theme.textDim}
              maxLength={100}
            />
            {errors.phaseName && <Text style={styles.errorText}>{errors.phaseName}</Text>}
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Description *</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text },
                errors.description && styles.inputError,
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what this phase involves"
              placeholderTextColor={theme.textDim}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          {/* Order and Weight */}
          <View style={styles.row}>
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={[styles.label, { color: theme.text }]}>Order *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text },
                  errors.order && styles.inputError,
                ]}
                value={order}
                onChangeText={setOrder}
                placeholder="1"
                placeholderTextColor={theme.textDim}
                keyboardType="numeric"
              />
              {errors.order && <Text style={styles.errorText}>{errors.order}</Text>}
            </View>

            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={[styles.label, { color: theme.text }]}>Weight (%) *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text },
                  errors.weight && styles.inputError,
                ]}
                value={weight}
                onChangeText={setWeight}
                placeholder="25"
                placeholderTextColor={theme.textDim}
                keyboardType="numeric"
              />
              {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
            </View>
          </View>

          {/* Status */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Status</Text>
            <View style={styles.statusContainer}>
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusOption,
                    { backgroundColor: theme.cardBackground, borderColor: theme.border },
                    status === option.value && { borderColor: option.color, borderWidth: 2 },
                  ]}
                  onPress={() => setStatus(option.value)}
                >
                  <View style={[styles.statusIndicator, { backgroundColor: option.color }]} />
                  <Text style={[styles.statusText, { color: theme.text }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Dates */}
          <View style={styles.dateContainer}>
            <View style={[styles.formGroup, styles.dateField]}>
              <Text style={[styles.label, { color: theme.text }]}>Start Date (Optional)</Text>
              <TouchableOpacity
                style={[styles.dateInput, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => setShowStartDatePicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Select start date"
                accessibilityHint="Opens date picker to select phase start date"
              >
                <Text style={{ color: startDate ? theme.text : theme.textDim }}>
                  {startDate ? formatDate(startDate) : "Select date"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.textDim} />
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowStartDatePicker(false)
                    if (selectedDate) {
                      setStartDate(selectedDate)
                    }
                  }}
                />
              )}
            </View>

            <View style={[styles.formGroup, styles.dateField]}>
              <Text style={[styles.label, { color: theme.text }]}>End Date (Optional)</Text>
              <TouchableOpacity
                style={[styles.dateInput, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => setShowEndDatePicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Select end date"
                accessibilityHint="Opens date picker to select phase end date"
              >
                <Text style={{ color: endDate ? theme.text : theme.textDim }}>
                  {endDate ? formatDate(endDate) : "Select date"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.textDim} />
              </TouchableOpacity>
              {errors.endDate && <Text style={styles.errorText}>{errors.endDate}</Text>}
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowEndDatePicker(false)
                    if (selectedDate) {
                      setEndDate(selectedDate)
                    }
                  }}
                />
              )}
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <Animated.View style={{ opacity: buttonOpacity, transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: theme.tint }]}
            onPress={handleCreatePhase}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={!isFormValid || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#fff" style={styles.createIcon} />
                <Text style={styles.createButtonText}>Create Phase</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      <ConnectionStatus />
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  formContainer: {
    paddingBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  halfWidth: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  inputError: {
    borderColor: "#F44336",
  },
  errorText: {
    color: "#F44336",
    fontSize: 14,
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  dateContainer: {
    gap: 16,
  },
  dateField: {
    flex: 1,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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