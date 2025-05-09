"use client"

import { useState } from "react"
import { StyleSheet, View, Text, Modal, TouchableOpacity, TextInput } from "react-native"
import { Ionicons } from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import Colors from "@/constants/Colors"

interface VerifyActionProps {
  visible: boolean
  title: string
  message: string
  confirmText: string
  cancelText?: string
  destructive?: boolean
  verificationText?: string
  onConfirm: () => void
  onCancel: () => void
}

export function VerifyAction({
  visible,
  title,
  message,
  confirmText,
  cancelText = "Cancel",
  destructive = false,
  verificationText,
  onConfirm,
  onCancel,
}: VerifyActionProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const [inputText, setInputText] = useState("")

  const isConfirmEnabled = !verificationText || inputText === verificationText

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.textDim} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.message, { color: theme.text }]}>{message}</Text>

          {verificationText && (
            <View style={styles.verificationContainer}>
              <Text style={[styles.verificationLabel, { color: theme.textDim }]}>
                Type "{verificationText}" to confirm
              </Text>
              <TextInput
                style={[
                  styles.verificationInput,
                  {
                    backgroundColor: theme.background,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Verification text"
                placeholderTextColor={theme.textDim}
              />
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: destructive ? "#F44336" : theme.tint },
                !isConfirmEnabled && styles.disabledButton,
              ]}
              onPress={onConfirm}
              disabled={!isConfirmEnabled}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 4,
  },
  message: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  verificationContainer: {
    marginBottom: 24,
  },
  verificationLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  verificationInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    marginRight: 8,
    borderWidth: 1,
  },
  confirmButton: {
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
})
