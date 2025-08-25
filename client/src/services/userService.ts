// client/src/services/UserService.ts - Fixed for your BaseService
import BaseService from './baseServices';
import { 
  User, 
  CreateUserData, 
  UserRole, 
  UserResponse, 
  UsersResponse, 
  UserPermissions,
  UserStats
} from '../types/types';

class UserService extends BaseService {
  
  // Create new user
  async createUser(clubId: string, data: CreateUserData): Promise<UserResponse> {
    return this.request<UserResponse>(`/clubs/${clubId}/users`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Get all users for a club
  async getUsers(clubId: string): Promise<UsersResponse> {
    return this.request<UsersResponse>(`/clubs/${clubId}/users`);
  }

  // Get user by ID
  async getUser(clubId: string, userId: string): Promise<UserResponse> {
    return this.request<UserResponse>(`/clubs/${clubId}/users/${userId}`);
  }

  // Update user
  async updateUser(
    clubId: string, 
    userId: string, 
    data: Partial<CreateUserData>
  ): Promise<UserResponse> {
    return this.request<UserResponse>(`/clubs/${clubId}/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Delete user
  async deleteUser(clubId: string, userId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/clubs/${clubId}/users/${userId}`, {
      method: 'DELETE'
    });
  }

  // Update user role
  async updateUserRole(
    clubId: string, 
    userId: string, 
    role: UserRole
  ): Promise<UserResponse> {
    return this.request<UserResponse>(`/clubs/${clubId}/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
  }

  // Get user permissions
  async getUserPermissions(clubId: string, userId: string): Promise<UserPermissions> {
    return this.request<UserPermissions>(`/clubs/${clubId}/users/${userId}/permissions`);
  }

  // Get users by role
  async getUsersByRole(clubId: string, role: UserRole): Promise<UsersResponse> {
    return this.request<UsersResponse>(`/clubs/${clubId}/users/role/${role}`);
  }

  // Get user statistics
  async getUserStats(clubId: string): Promise<UserStats> {
    return this.request<UserStats>(`/clubs/${clubId}/users/stats`);
  }

  // Helper method to check if current user can manage users
  canManageUsers(userRole: UserRole): boolean {
    return ['host', 'admin'].includes(userRole);
  }

  // Helper method to get role display name
  getRoleDisplayName(role: UserRole): string {
    const roleNames: Record<UserRole, string> = {
      host: 'Host',
      admin: 'Administrator',
      treasurer: 'Treasurer',
      communications: 'Communications',
      volunteer: 'Volunteer'
    };
    return roleNames[role] || role;
  }

  // Helper method to get role description
  getRoleDescription(role: UserRole): string {
    const descriptions: Record<UserRole, string> = {
      host: 'Full access to all club features and settings',
      admin: 'Manage users, campaigns, events, finances, and supporters',
      treasurer: 'Manage finances and view campaign/event data',
      communications: 'Manage events, supporters, and communications',
      volunteer: 'View campaigns, events, and supporters'
    };
    return descriptions[role] || '';
  }

  // Helper method to get allowed roles for creation
  getAllowedRoles(): UserRole[] {
    return ['admin', 'treasurer', 'communications', 'volunteer'];
  }

  // Helper method to validate user data
  validateUserData(data: CreateUserData): string[] {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Name is required');
    }

    if (!data.email?.trim()) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    if (!data.role) {
      errors.push('Role is required');
    } else if (!this.getAllowedRoles().includes(data.role) && data.role !== 'host') {
      errors.push('Invalid role selected');
    }

    return errors;
  }

  // Helper method to format user for display
  formatUserForDisplay(user: User) {
    return {
      ...user,
      role_display: this.getRoleDisplayName(user.role),
      role_description: this.getRoleDescription(user.role),
      created_date: this.formatDate(user.created_at),
      is_host: user.role === 'host',
      can_be_deleted: user.role !== 'host'
    };
  }

  // Helper method to sort users by role hierarchy
  sortUsersByRole(users: User[]): User[] {
    const roleOrder: Record<UserRole, number> = {
      host: 0,
      admin: 1,
      treasurer: 2,
      communications: 3,
      volunteer: 4
    };

    return users.sort((a, b) => {
      const roleComparison = roleOrder[a.role] - roleOrder[b.role];
      if (roleComparison !== 0) return roleComparison;
      return a.name.localeCompare(b.name);
    });
  }

  // Helper method to filter users
  filterUsers(users: User[], filters: { role?: UserRole; search?: string }): User[] {
    return users.filter(user => {
      if (filters.role && user.role !== filters.role) {
        return false;
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          this.getRoleDisplayName(user.role).toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }
}

// Create and export service instance
const userService = new UserService();
export default userService;