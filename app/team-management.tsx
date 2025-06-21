"use client"

import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Switch
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useColorScheme } from 'react-native'
import { useRouter } from 'expo-router'
import { MotiView } from 'moti'

import { teamService } from '@/services/teamService'
import { projectService } from '@/services/projectService'
import { useToast } from '@/contexts/ToastContext'
import Colors from '@/constants/Colors'
import { TeamMember } from '@/types/appwrite'

interface TeamManagementScreenProps {
  projectId: string
}

export default function TeamManagementScreen({ projectId }: TeamManagementScreenProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? 'light']
  const router = useRouter()
  const { showToast } = useToast()

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [selectedRole, setSelectedRole] = useState('member')
  const [project, setProject] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  const roles = [
    { key: 'owner', label: 'Owner', description: 'Full project control' },
    { key: 'admin', label: 'Admin', description: 'Manage project and team' },
    { key: 'member', label: 'Member', description: 'Create and edit tasks' },
    { key: 'viewer', label: 'Viewer', description: 'View project only' }
  ]

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [members, projectData] = await Promise.all([
        teamService.getTeamMembers(projectId),
        projectService.getProjectById(projectId)
      ])
      
      setTeamMembers(members)
      setProject(projectData)

      // Get current user's role
      const currentUser = await (await import('@/lib/appwrite')).account.get()
      const userMember = members.find(member => member.user_id === currentUser.$id)
      setUserRole(userMember?.role || null)
    } catch (error) {
      console.error('Error loading team data:', error)
      showToast('Failed to load team data', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [projectId, showToast])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [loadData])

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      showToast('Please enter an email address', { type: 'error' })
      return
    }

    try {
      // In a real app, you would invite the user by email
      // For now, we'll simulate adding a member
      showToast('Invitation sent successfully', { type: 'success' })
      setShowAddMemberModal(false)
      setNewMemberEmail('')
      setSelectedRole('member')
    } catch (error) {
      console.error('Error adding team member:', error)
      showToast('Failed to add team member', { type: 'error' })
    }
  }

  const handleUpdateRole = async () => {
    if (!selectedMember) return

    try {
      await teamService.updateTeamMemberRole(selectedMember.$id, selectedRole)
      showToast('Role updated successfully', { type: 'success' })
      setShowRoleModal(false)
      setSelectedMember(null)
      loadData()
    } catch (error) {
      console.error('Error updating role:', error)
      showToast('Failed to update role', { type: 'error' })
    }
  }

  const handleRemoveMember = (member: TeamMember) => {
    Alert.alert(
      'Remove Team Member',
      `Are you sure you want to remove ${member.full_name || 'this member'} from the project?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await teamService.removeTeamMember(member.$id)
              showToast('Team member removed successfully', { type: 'success' })
              loadData()
            } catch (error) {
              console.error('Error removing team member:', error)
              showToast('Failed to remove team member', { type: 'error' })
            }
          }
        }
      ]
    )
  }

  const canManageTeam = userRole === 'owner' || userRole === 'admin'

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <Text style={[styles.loadingText, { color: theme.textDim }]}>Loading team data...</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.text }]}>Team Management</Text>
          <Text style={[styles.subtitle, { color: theme.textDim }]}>
            {project?.name} • {teamMembers.length} members
          </Text>
        </View>
        {canManageTeam && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.tint }]}
            onPress={() => setShowAddMemberModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </MotiView>

      {/* Team Stats */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 200 }}
        style={styles.statsContainer}
      >
        <View style={[styles.statsCard, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{teamMembers.length}</Text>
            <Text style={[styles.statLabel, { color: theme.textDim }]}>Total Members</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.success }]}>
              {teamMembers.filter(m => m.status === 'active').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textDim }]}>Active</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.tint }]}>
              {teamMembers.filter(m => m.role === 'owner' || m.role === 'admin').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textDim }]}>Admins</Text>
          </View>
        </View>
      </MotiView>

      {/* Team Members List */}
      <ScrollView
        style={styles.membersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {teamMembers.map((member, index) => (
          <MotiView
            key={member.$id}
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 300 + index * 100 }}
            style={[styles.memberCard, { backgroundColor: theme.cardBackground }]}
          >
            <View style={styles.memberInfo}>
              <View style={[styles.avatar, { backgroundColor: theme.tintLight }]}>
                <Text style={[styles.avatarText, { color: theme.tint }]}>
                  {(member.full_name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberDetails}>
                <Text style={[styles.memberName, { color: theme.text }]}>
                  {member.full_name || 'Unknown User'}
                </Text>
                <Text style={[styles.memberRole, { color: theme.textDim }]}>
                  {roles.find(r => r.key === member.role)?.label || member.role}
                </Text>
                <Text style={[styles.memberStatus, { color: theme.textDim }]}>
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <View style={styles.memberActions}>
              {canManageTeam && member.role !== 'owner' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.tintLight }]}
                    onPress={() => {
                      setSelectedMember(member)
                      setSelectedRole(member.role)
                      setShowRoleModal(true)
                    }}
                  >
                    <Ionicons name="settings-outline" size={16} color={theme.tint} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.errorLight }]}
                    onPress={() => handleRemoveMember(member)}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.error} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </MotiView>
        ))}

        {teamMembers.length === 0 && (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500, delay: 400 }}
            style={styles.emptyContainer}
          >
            <Ionicons name="people-outline" size={60} color={theme.textDim} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Team Members</Text>
            <Text style={[styles.emptyText, { color: theme.textDim }]}>
              {canManageTeam 
                ? 'Add team members to start collaborating on this project.'
                : 'Team members will appear here once they join the project.'
              }
            </Text>
          </MotiView>
        )}
      </ScrollView>

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Team Member</Text>
            <TouchableOpacity
              onPress={() => setShowAddMemberModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Email Address</Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.cardBackground,
                color: theme.text,
                borderColor: theme.border
              }]}
              placeholder="Enter email address"
              placeholderTextColor={theme.textDim}
              value={newMemberEmail}
              onChangeText={setNewMemberEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.inputLabel, { color: theme.text }]}>Role</Text>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.key}
                style={[
                  styles.roleOption,
                  { backgroundColor: theme.cardBackground },
                  selectedRole === role.key && { borderColor: theme.tint, borderWidth: 2 }
                ]}
                onPress={() => setSelectedRole(role.key)}
              >
                <View style={styles.roleInfo}>
                  <Text style={[styles.roleLabel, { color: theme.text }]}>{role.label}</Text>
                  <Text style={[styles.roleDescription, { color: theme.textDim }]}>
                    {role.description}
                  </Text>
                </View>
                {selectedRole === role.key && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.tint} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.border }]}
              onPress={() => setShowAddMemberModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.tint }]}
              onPress={handleAddMember}
            >
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>Send Invitation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Update Role Modal */}
      <Modal
        visible={showRoleModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Update Role</Text>
            <TouchableOpacity
              onPress={() => setShowRoleModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>
              Update role for {selectedMember?.full_name || 'this member'}
            </Text>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.key}
                style={[
                  styles.roleOption,
                  { backgroundColor: theme.cardBackground },
                  selectedRole === role.key && { borderColor: theme.tint, borderWidth: 2 }
                ]}
                onPress={() => setSelectedRole(role.key)}
              >
                <View style={styles.roleInfo}>
                  <Text style={[styles.roleLabel, { color: theme.text }]}>{role.label}</Text>
                  <Text style={[styles.roleDescription, { color: theme.textDim }]}>
                    {role.description}
                  </Text>
                </View>
                {selectedRole === role.key && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.tint} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.border }]}
              onPress={() => setShowRoleModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.tint }]}
              onPress={handleUpdateRole}
            >
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>Update Role</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
  },
  statsContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
  },
  membersList: {
    flex: 1,
    padding: 20,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 14,
    marginTop: 2,
  },
  memberStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
    fontSize: 16,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  roleInfo: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  roleDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}) 