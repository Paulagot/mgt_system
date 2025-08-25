// client/src/services/TaskService.ts - Fixed for your BaseService
import BaseService from './baseServices';
import { 
  Task, 
  CreateTaskData, 
  TaskStatus,
  TaskResponse, 
  TasksResponse,
  TaskStats,
  BulkCreateResponse,
  Supporter,
  User
} from '../types/types';

class TaskService extends BaseService {

  // Create new task
  async createTask(eventId: string, data: CreateTaskData): Promise<TaskResponse> {
    return this.request<TaskResponse>(`/events/${eventId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Get all tasks for an event
  async getTasksByEvent(eventId: string): Promise<TasksResponse> {
    return this.request<TasksResponse>(`/events/${eventId}/tasks`);
  }

  // Get specific task by ID
  async getTask(taskId: string): Promise<TaskResponse> {
    return this.request<TaskResponse>(`/tasks/${taskId}`);
  }

  // Update task
  async updateTask(taskId: string, data: Partial<CreateTaskData>): Promise<TaskResponse> {
    return this.request<TaskResponse>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Delete task
  async deleteTask(taskId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/tasks/${taskId}`, {
      method: 'DELETE'
    });
  }

  // Update task status only
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<TaskResponse> {
    return this.request<TaskResponse>(`/tasks/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  // Get tasks assigned to a supporter
  async getTasksByUser(supporterId: string): Promise<TasksResponse> {
    return this.request<TasksResponse>(`/supporters/${supporterId}/tasks`);
  }

  // Get tasks assigned to current user
  async getTasksByUserId(userId: string): Promise<TasksResponse> {
    return this.request<TasksResponse>(`/users/${userId}/tasks`);
  }

  // Get overdue tasks for club
  async getOverdueTasks(clubId: string): Promise<TasksResponse> {
    return this.request<TasksResponse>(`/clubs/${clubId}/tasks/overdue`);
  }

  // Get upcoming tasks for club
  async getUpcomingTasks(clubId: string, days: number = 7): Promise<TasksResponse> {
    const queryParams = this.buildQueryString({ days });
    return this.request<TasksResponse>(`/clubs/${clubId}/tasks/upcoming?${queryParams}`);
  }

  // Get task statistics for an event
  async getTaskStats(eventId: string): Promise<TaskStats> {
    return this.request<TaskStats>(`/events/${eventId}/tasks/stats`);
  }

  // Get tasks by status for an event
  async getTasksByStatus(eventId: string, status: TaskStatus): Promise<TasksResponse> {
    return this.request<TasksResponse>(`/events/${eventId}/tasks/status/${status}`);
  }

  // Get club-wide task statistics
  async getClubTaskStats(clubId: string): Promise<TaskStats> {
    return this.request<TaskStats>(`/clubs/${clubId}/tasks/stats`);
  }

  // Bulk create tasks
  async bulkCreateTasks(eventId: string, tasks: CreateTaskData[]): Promise<BulkCreateResponse<Task>> {
    return this.request<BulkCreateResponse<Task>>(`/events/${eventId}/tasks/bulk`, {
      method: 'POST',
      body: JSON.stringify({ tasks })
    });
  }

  // MISSING METHOD: Format assignee options for dropdowns
  formatAssigneeOptions(supporters: Supporter[], users: User[]): Array<{
    value: string;
    label: string;
    type: 'supporter' | 'user';
    email?: string;
  }> {
    const options: Array<{
      value: string;
      label: string;
      type: 'supporter' | 'user';
      email?: string;
    }> = [];

    // Add unassigned option
    options.push({
      value: '',
      label: 'Unassigned',
      type: 'supporter'
    });

    // Add supporters
    supporters.forEach(supporter => {
      options.push({
        value: supporter.id,
        label: `${supporter.name} (Supporter)`,
        type: 'supporter',
        email: supporter.email
      });
    });

    // Add users
    users.forEach(user => {
      options.push({
        value: user.id,
        label: `${user.name} (${this.formatUserRole(user.role)})`,
        type: 'user',
        email: user.email
      });
    });

    // Sort by label for better UX
    return options.sort((a, b) => {
      if (a.value === '') return -1; // Keep "Unassigned" at top
      if (b.value === '') return 1;
      return a.label.localeCompare(b.label);
    });
  }

  // Helper method to format user role for display
  private formatUserRole(role: string): string {
    const roleMap: Record<string, string> = {
      host: 'Host',
      admin: 'Admin',
      treasurer: 'Treasurer',
      communications: 'Communications',
      volunteer: 'Volunteer'
    };
    return roleMap[role] || role;
  }

  // Helper method to get task status display
  getTaskStatusDisplay(status: TaskStatus): { 
    text: string; 
    color: string; 
    bgColor: string;
    icon: string; 
  } {
    const statusMap = {
      todo: {
        text: 'To Do',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: '○'
      },
      in_progress: {
        text: 'In Progress',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        icon: '◐'
      },
      done: {
        text: 'Done',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: '●'
      }
    };

    return statusMap[status] || statusMap.todo;
  }

  // Helper method to get task priority based on due date
  getTaskPriority(task: Task): { 
    level: 'low' | 'medium' | 'high' | 'overdue';
    color: string;
    text: string;
  } {
    if (!task.due_date) {
      return { level: 'low', color: 'text-gray-500', text: 'No due date' };
    }

    const dueDate = new Date(task.due_date);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { level: 'overdue', color: 'text-red-600', text: `${Math.abs(diffDays)} days overdue` };
    } else if (diffDays <= 1) {
      return { level: 'high', color: 'text-red-500', text: diffDays === 0 ? 'Due today' : 'Due tomorrow' };
    } else if (diffDays <= 3) {
      return { level: 'medium', color: 'text-yellow-600', text: `Due in ${diffDays} days` };
    } else {
      return { level: 'low', color: 'text-green-600', text: `Due in ${diffDays} days` };
    }
  }

  // Helper method to validate task data
  validateTaskData(data: CreateTaskData): string[] {
    const errors: string[] = [];

    if (!data.title?.trim()) {
      errors.push('Task title is required');
    }

    if (data.due_date) {
      const dueDate = new Date(data.due_date);
      if (isNaN(dueDate.getTime())) {
        errors.push('Invalid due date format');
      }
    }

    if (data.status && !['todo', 'in_progress', 'done'].includes(data.status)) {
      errors.push('Invalid task status');
    }

    return errors;
  }

  // Helper method to format task for display
  formatTaskForDisplay(task: Task) {
    const status = this.getTaskStatusDisplay(task.status);
    const priority = this.getTaskPriority(task);
    
    return {
      ...task,
      status_display: status,
      priority_display: priority,
      assigned_display: task.assigned_supporter_name || task.assigned_user_name || task.assigned_name || 'Unassigned',
      due_date_display: task.due_date 
        ? this.formatDate(task.due_date)
        : 'No due date',
      created_date: this.formatDate(task.created_at),
      is_overdue: task.days_overdue ? task.days_overdue > 0 : false,
      is_completed: task.status === 'done',
      can_be_completed: task.status !== 'done'
    };
  }

  // Helper method to sort tasks
  sortTasks(tasks: Task[], sortBy: 'title' | 'due_date' | 'status' | 'assigned' | 'priority' = 'due_date'): Task[] {
    return tasks.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'status':
          const statusOrder = { todo: 0, in_progress: 1, done: 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'assigned':
          const nameA = a.assigned_supporter_name || a.assigned_user_name || a.assigned_name || 'zzz'; // Put unassigned at end
          const nameB = b.assigned_supporter_name || b.assigned_user_name || b.assigned_name || 'zzz';
          return nameA.localeCompare(nameB);
        case 'priority':
          const priorityA = this.getTaskPriority(a);
          const priorityB = this.getTaskPriority(b);
          const priorityOrder = { overdue: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[priorityA.level] - priorityOrder[priorityB.level];
        case 'due_date':
        default:
          // Sort by due date: no due date last, then by date
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
    });
  }

  // Helper method to filter tasks
  filterTasks(tasks: Task[], filters: {
    status?: TaskStatus;
    assigned_to?: string;
    overdue?: boolean;
    upcoming_days?: number;
    search?: string;
  }): Task[] {
    return tasks.filter(task => {
      if (filters.status && task.status !== filters.status) {
        return false;
      }

      if (filters.assigned_to !== undefined) {
        if (filters.assigned_to === '') {
          // Filter for unassigned tasks
          if (task.assigned_to) {
            return false;
          }
        } else {
          // Filter for specific assignee
          if (task.assigned_to !== filters.assigned_to) {
            return false;
          }
        }
      }

      if (filters.overdue) {
        const priority = this.getTaskPriority(task);
        if (priority.level !== 'overdue') {
          return false;
        }
      }

      if (filters.upcoming_days && task.due_date) {
        const dueDate = new Date(task.due_date);
        const today = new Date();
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > filters.upcoming_days) {
          return false;
        }
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          task.title.toLowerCase().includes(searchLower) ||
          (task.assigned_supporter_name && task.assigned_supporter_name.toLowerCase().includes(searchLower)) ||
          (task.assigned_user_name && task.assigned_user_name.toLowerCase().includes(searchLower)) ||
          (task.assigned_name && task.assigned_name.toLowerCase().includes(searchLower)) ||
          (task.event_title && task.event_title.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  }

  // Helper method to group tasks by status
  groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
    return {
      todo: tasks.filter(t => t.status === 'todo'),
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      done: tasks.filter(t => t.status === 'done')
    };
  }

  // Helper method to calculate task completion percentage
  calculateCompletionPercentage(tasks: Task[]): number {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    return Math.round((completedTasks / tasks.length) * 100);
  }

  // Helper method to get task status options for forms
  getStatusOptions(): { value: TaskStatus; label: string; color: string }[] {
    return [
      { value: 'todo', label: 'To Do', color: 'gray' },
      { value: 'in_progress', label: 'In Progress', color: 'blue' },
      { value: 'done', label: 'Done', color: 'green' }
    ];
  }

  // Helper method to export tasks data
  exportTasksData(tasks: Task[]): string {
    const headers = [
      'Title', 
      'Status', 
      'Assigned To', 
      'Due Date', 
      'Event', 
      'Created Date',
      'Priority'
    ];
    
    const rows = tasks.map(task => {
      const priority = this.getTaskPriority(task);
      const assignedName = task.assigned_supporter_name || task.assigned_user_name || task.assigned_name || 'Unassigned';
      
      return [
        task.title,
        this.getTaskStatusDisplay(task.status).text,
        assignedName,
        task.due_date ? this.formatDate(task.due_date) : 'No due date',
        task.event_title || '',
        this.formatDate(task.created_at),
        priority.text
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }
}

// Create and export service instance
const taskService = new TaskService();
export default taskService;