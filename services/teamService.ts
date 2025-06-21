import { databases, account, ID, Query } from '@/lib/appwrite'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite'
import { TeamMember, ProjectActivity } from '@/types/appwrite'
import { offlineStore, isOnline } from './offlineStore'
import { notificationService } from './notificationService'

// Cache keys
const CACHE_KEYS = {
  TEAM_MEMBERS: 'team_members',
  PROJECT_ACTIVITIES: 'project_activities',
  USER_PERMISSIONS: 'user_permissions'
}

// Team member roles and permissions
export const TEAM_ROLES = {
  OWNER: {
    name: 'owner',
    permissions: [
      'project:read', 'project:write', 'project:delete',
      'phase:read', 'phase:write', 'phase:delete',
      'task:read', 'task:write', 'task:delete',
      'team:read', 'team:write', 'team:delete',
      'settings:read', 'settings:write',
      'reports:read', 'reports:write',
      'budget:read', 'budget:write'
    ]
  },
  ADMIN: {
    name: 'admin',
    permissions: [
      'project:read', 'project:write',
      'phase:read', 'phase:write',
      'task:read', 'task:write', 'task:delete',
      'team:read', 'team:write',
      'settings:read', 'settings:write',
      'reports:read', 'reports:write',
      'budget:read', 'budget:write'
    ]
  },
  MEMBER: {
    name: 'member',
    permissions: [
      'project:read',
      'phase:read', 'phase:write',
      'task:read', 'task:write',
      'team:read',
      'reports:read'
    ]
  },
  VIEWER: {
    name: 'viewer',
    permissions: [
      'project:read',
      'phase:read',
      'task:read',
      'team:read',
      'reports:read'
    ]
  }
}

/**
 * Team Collaboration Service
 * Handles team member management, roles, permissions, and real-time collaboration
 */
export const teamService = {
  /**
   * Get team members for a project
   */
  async getTeamMembers(projectId: string): Promise<TeamMember[]> {
    try {
      const online = isOnline()
      
      if (!online) {
        const cached = await offlineStore.getData(CACHE_KEYS.TEAM_MEMBERS, async () => [])
        return cached.filter((member: TeamMember) => member.project_id === projectId)
      }

      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.TEAM_MEMBERS,
        [Query.equal('project_id', projectId)]
      )

      const members = documents as unknown as TeamMember[]
      
      // Cache the results
      await offlineStore.setData(CACHE_KEYS.TEAM_MEMBERS, members)
      
      return members
    } catch (error) {
      console.error('Error getting team members:', error)
      return []
    }
  },

  /**
   * Add a team member to a project
   */
  async addTeamMember(projectId: string, userId: string, role: string = 'member'): Promise<TeamMember | null> {
    try {
      const online = isOnline()
      const currentUser = await account.get()
      
      // Check if user has permission to add members
      const hasPermission = await this.checkPermission(currentUser.$id, projectId, 'team:write')
      if (!hasPermission) {
        throw new Error('Insufficient permissions to add team members')
      }

      // Check if member already exists
      const existingMembers = await this.getTeamMembers(projectId)
      const alreadyExists = existingMembers.find(member => member.user_id === userId)
      if (alreadyExists) {
        throw new Error('User is already a team member')
      }

      const newMember = {
        user_id: userId,
        project_id: projectId,
        role: role as 'owner' | 'admin' | 'member' | 'viewer',
        permissions: TEAM_ROLES[role.toUpperCase() as keyof typeof TEAM_ROLES]?.permissions || TEAM_ROLES.MEMBER.permissions,
        joined_at: new Date().toISOString(),
        status: 'active'
      }

      if (!online) {
        // Queue for later sync
        await offlineStore.addOfflineChange({
          id: ID.unique(),
          table_name: 'team_members',
          record_id: ID.unique(),
          operation: 'INSERT',
          data: newMember,
          created_at: new Date().toISOString(),
          synced: false,
          retry_count: 0
        })

        const tempMember = {
          ...newMember,
          $id: `temp_${Date.now()}`,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString()
        }

        return tempMember as TeamMember
      }

      const createdMember = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.TEAM_MEMBERS,
        ID.unique(),
        newMember
      ) as unknown as TeamMember

      // Log activity
      await this.logActivity(projectId, currentUser.$id, 'assigned', 'team', createdMember.$id, `Added ${role} to team`)

      // Send notification to new member
      await notificationService.createNotification({
        title: 'Team Invitation',
        description: `You have been added to a project as ${role}`,
        type: 'info',
        user_id: userId,
        related_id: projectId,
        related_type: 'project'
      })

      return createdMember
    } catch (error) {
      console.error('Error adding team member:', error)
      throw error
    }
  },

  /**
   * Update team member role
   */
  async updateTeamMemberRole(memberId: string, newRole: string): Promise<TeamMember | null> {
    try {
      const online = isOnline()
      const currentUser = await account.get()

      // Get member details
      const member = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.TEAM_MEMBERS,
        memberId
      ) as unknown as TeamMember

      // Check permissions
      const hasPermission = await this.checkPermission(currentUser.$id, member.project_id, 'team:write')
      if (!hasPermission) {
        throw new Error('Insufficient permissions to update team member')
      }

      const updatedData = {
        role: newRole as 'owner' | 'admin' | 'member' | 'viewer',
        permissions: TEAM_ROLES[newRole.toUpperCase() as keyof typeof TEAM_ROLES]?.permissions || TEAM_ROLES.MEMBER.permissions
      }

      if (!online) {
        await offlineStore.addOfflineChange({
          id: ID.unique(),
          table_name: 'team_members',
          record_id: memberId,
          operation: 'UPDATE',
          data: updatedData,
          created_at: new Date().toISOString(),
          synced: false,
          retry_count: 0
        })

        return { ...member, ...updatedData } as TeamMember
      }

      const updatedMember = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.TEAM_MEMBERS,
        memberId,
        updatedData
      ) as unknown as TeamMember

      // Log activity
      await this.logActivity(member.project_id, currentUser.$id, 'updated', 'team', memberId, `Changed role to ${newRole}`)

      return updatedMember
    } catch (error) {
      console.error('Error updating team member role:', error)
      throw error
    }
  },

  /**
   * Remove team member from project
   */
  async removeTeamMember(memberId: string): Promise<boolean> {
    try {
      const online = isOnline()
      const currentUser = await account.get()

      // Get member details
      const member = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.TEAM_MEMBERS,
        memberId
      ) as unknown as TeamMember

      // Check permissions
      const hasPermission = await this.checkPermission(currentUser.$id, member.project_id, 'team:write')
      if (!hasPermission) {
        throw new Error('Insufficient permissions to remove team member')
      }

      // Prevent removing the last owner
      if (member.role === 'owner') {
        const teamMembers = await this.getTeamMembers(member.project_id)
        const owners = teamMembers.filter(m => m.role === 'owner')
        if (owners.length === 1) {
          throw new Error('Cannot remove the last project owner')
        }
      }

      if (!online) {
        await offlineStore.addOfflineChange({
          id: ID.unique(),
          table_name: 'team_members',
          record_id: memberId,
          operation: 'DELETE',
          data: {},
          created_at: new Date().toISOString(),
          synced: false,
          retry_count: 0
        })

        return true
      }

      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.TEAM_MEMBERS,
        memberId
      )

      // Log activity
      await this.logActivity(member.project_id, currentUser.$id, 'deleted', 'team', memberId, 'Removed team member')

      return true
    } catch (error) {
      console.error('Error removing team member:', error)
      throw error
    }
  },

  /**
   * Check if user has permission for a specific action
   */
  async checkPermission(userId: string, projectId: string, permission: string): Promise<boolean> {
    try {
      const teamMembers = await this.getTeamMembers(projectId)
      const userMember = teamMembers.find(member => member.user_id === userId)
      
      if (!userMember) {
        return false
      }

      return userMember.permissions.includes(permission)
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  },

  /**
   * Get user's role in a project
   */
  async getUserRole(userId: string, projectId: string): Promise<string | null> {
    try {
      const teamMembers = await this.getTeamMembers(projectId)
      const userMember = teamMembers.find(member => member.user_id === userId)
      
      return userMember?.role || null
    } catch (error) {
      console.error('Error getting user role:', error)
      return null
    }
  },

  /**
   * Log project activity
   */
  async logActivity(
    projectId: string,
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    description: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const online = isOnline()
      
      const activity = {
        project_id: projectId,
        user_id: userId,
        action: action as any,
        entity_type: entityType as any,
        entity_id: entityId,
        description,
        metadata
      }

      if (!online) {
        await offlineStore.addOfflineChange({
          id: ID.unique(),
          table_name: 'project_activities',
          record_id: ID.unique(),
          operation: 'INSERT',
          data: activity,
          created_at: new Date().toISOString(),
          synced: false,
          retry_count: 0
        })
        return
      }

      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECT_ACTIVITIES,
        ID.unique(),
        activity
      )
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  },

  /**
   * Get project activities
   */
  async getProjectActivities(projectId: string, limit: number = 50): Promise<ProjectActivity[]> {
    try {
      const online = isOnline()
      
      if (!online) {
        const cached = await offlineStore.getData(CACHE_KEYS.PROJECT_ACTIVITIES, async () => [])
        return cached
          .filter((activity: ProjectActivity) => activity.project_id === projectId)
          .slice(0, limit)
      }

      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROJECT_ACTIVITIES,
        [
          Query.equal('project_id', projectId),
          Query.orderDesc('$createdAt'),
          Query.limit(limit)
        ]
      )

      const activities = documents as unknown as ProjectActivity[]
      
      // Cache the results
      await offlineStore.setData(CACHE_KEYS.PROJECT_ACTIVITIES, activities)
      
      return activities
    } catch (error) {
      console.error('Error getting project activities:', error)
      return []
    }
  },

  /**
   * Get team statistics
   */
  async getTeamStats(projectId: string): Promise<{
    totalMembers: number;
    activeMembers: number;
    roles: Record<string, number>;
    recentActivity: number;
  }> {
    try {
      const teamMembers = await this.getTeamMembers(projectId)
      const activities = await this.getProjectActivities(projectId, 100)
      
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const recentActivity = activities.filter(activity => 
        new Date(activity.$createdAt) > weekAgo
      ).length

      const roles = teamMembers.reduce((acc, member) => {
        acc[member.role] = (acc[member.role] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        totalMembers: teamMembers.length,
        activeMembers: teamMembers.filter(m => m.status === 'active').length,
        roles,
        recentActivity
      }
    } catch (error) {
      console.error('Error getting team stats:', error)
      return {
        totalMembers: 0,
        activeMembers: 0,
        roles: {},
        recentActivity: 0
      }
    }
  }
} 