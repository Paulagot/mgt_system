import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Task, CreateTaskData, TaskStatus, TaskFormState, ModalState, Supporter, User } from '../../types/types';
// Fixed imports - import service instances, not classes
import taskService from '../../services/taskServices';
import supporterService from '../../services/supporterService';
import userService from '../../services/userService';
import { useAuth } from '../../store/app_store';

const TaskManagement: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user: currentUser } = useAuth();

  // State management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  
  // Modal and form state
  const [taskModal, setTaskModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; task?: Task }>({ isOpen: false });
  const [formState, setFormState] = useState<TaskFormState>({
    title: '',
    assigned_to: '',
    due_date: '',
    status: 'todo',
    isSubmitting: false,
    errors: {}
  });

  // Load data on component mount
  useEffect(() => {
    if (eventId) {
      loadTasks();
      loadSupporters();
      loadUsers();
    }
  }, [eventId]);

  const loadTasks = async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await taskService.getTasksByEvent(eventId);
      setTasks(taskService.sortTasks(response.tasks || [], 'due_date'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const loadSupporters = async () => {
    if (!currentUser?.club_id) return;
    
    try {
      const response = await supporterService.getSupportersByClub(currentUser.club_id);
      setSupporters(response.supporters || []);
    } catch (err) {
      console.error('Failed to load supporters:', err);
    }
  };

  const loadUsers = async () => {
    if (!currentUser?.club_id) return;
    
    try {
      const response = await userService.getUsers(currentUser.club_id);
      setUsers(response.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleCreateTask = () => {
    setFormState({
      title: '',
      assigned_to: '',
      due_date: '',
      status: 'todo',
      isSubmitting: false,
      errors: {}
    });
    setTaskModal({ isOpen: true, mode: 'create' });
  };

  const handleEditTask = (task: Task) => {
    setFormState({
      title: task.title,
      assigned_to: task.assigned_to || '',
      due_date: task.due_date || '',
      status: task.status,
      isSubmitting: false,
      errors: {}
    });
    setTaskModal({ isOpen: true, mode: 'edit', item: task });
  };

  const handleDeleteTask = (task: Task) => {
    setConfirmModal({ isOpen: true, task });
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task status');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    
    const taskData: CreateTaskData = {
      title: formState.title.trim(),
      assigned_to: formState.assigned_to || undefined,
      due_date: formState.due_date || undefined,
      status: formState.status
    };

    const validationErrors = taskService.validateTaskData(taskData);
    if (validationErrors.length > 0) {
      setFormState(prev => ({
        ...prev,
        errors: { general: validationErrors.join(', ') }
      }));
      return;
    }

    setFormState(prev => ({ ...prev, isSubmitting: true, errors: {} }));

    try {
      if (taskModal.mode === 'create') {
        await taskService.createTask(eventId, taskData);
      } else if (taskModal.item) {
        await taskService.updateTask(taskModal.item.id, taskData);
      }
      
      setTaskModal({ isOpen: false, mode: 'create' });
      await loadTasks();
    } catch (err) {
      setFormState(prev => ({
        ...prev,
        errors: { general: err instanceof Error ? err.message : 'Operation failed' }
      }));
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmModal.task) return;

    try {
      await taskService.deleteTask(confirmModal.task.id);
      setConfirmModal({ isOpen: false });
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      setConfirmModal({ isOpen: false });
    }
  };

  // Filter and search tasks
  const filteredTasks = taskService.filterTasks(tasks, {
    status: statusFilter === 'all' ? undefined : statusFilter,
    assigned_to: assigneeFilter === 'all' ? undefined : assigneeFilter,
    search: searchTerm
  });

  const groupedTasks = taskService.groupTasksByStatus(filteredTasks);
  const assigneeOptions = taskService.formatAssigneeOptions(supporters, users);
  const canManageTasks = ['host', 'admin', 'communications'].includes(currentUser?.role || '');
  const completionPercentage = taskService.calculateCompletionPercentage(tasks);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Task Management</h2>
          <p className="text-gray-600">Organize and track event tasks</p>
          
          {/* Progress Bar */}
          <div className="mt-4 max-w-md">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Completion Progress</span>
              <span>{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center space-x-6 mt-4">
            <div className="text-sm">
              <span className="text-gray-500">Total:</span>
              <span className="ml-1 font-semibold text-gray-900">{tasks.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Completed:</span>
              <span className="ml-1 font-semibold text-green-600">{groupedTasks.done.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">In Progress:</span>
              <span className="ml-1 font-semibold text-blue-600">{groupedTasks.in_progress.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">To Do:</span>
              <span className="ml-1 font-semibold text-yellow-600">{groupedTasks.todo.length}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-300">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm font-medium rounded-l-lg ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1 text-sm font-medium rounded-r-lg ${
                viewMode === 'board' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Board
            </button>
          </div>

          {canManageTasks && (
            <button
              onClick={handleCreateTask}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <span>+</span>
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="sm:w-40">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            {taskService.getStatusOptions().map((option: { value: TaskStatus; label: string; color: string }) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:w-48">
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Assignees</option>
            <option value="">Unassigned</option>
            {assigneeOptions.slice(1).map((option: { value: string; label: string; type: 'supporter' | 'user'; email?: string }) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tasks Display */}
      {viewMode === 'list' ? (
        // List View
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || statusFilter !== 'all' || assigneeFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Start by adding your first task'}
              </p>
              {canManageTasks && !searchTerm && statusFilter === 'all' && assigneeFilter === 'all' && (
                <button
                  onClick={handleCreateTask}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                >
                  Add First Task
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    {canManageTasks && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTasks.map((task: Task) => {
                    const formattedTask = taskService.formatTaskForDisplay(task);
                    return (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {task.title}
                              </div>
                              {formattedTask.priority_display.level === 'overdue' && (
                                <div className="text-xs text-red-600 font-medium">
                                  {formattedTask.priority_display.text}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {canManageTasks ? (
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                              className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 focus:ring-2 focus:ring-blue-500 ${formattedTask.status_display.color} ${formattedTask.status_display.bgColor}`}
                            >
                              {taskService.getStatusOptions().map((option: { value: TaskStatus; label: string; color: string }) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${formattedTask.status_display.color} ${formattedTask.status_display.bgColor}`}>
                              {formattedTask.status_display.icon} {formattedTask.status_display.text}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formattedTask.assigned_display}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={formattedTask.priority_display.color}>
                            {formattedTask.due_date_display}
                          </span>
                        </td>
                        {canManageTasks && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleEditTask(task)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => handleDeleteTask(task)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // Board View
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(groupedTasks).map(([status, statusTasks]: [string, Task[]]) => {
            const statusDisplay = taskService.getTaskStatusDisplay(status as TaskStatus);
            return (
              <div key={status} className="bg-gray-50 rounded-lg p-4">
                <h3 className={`font-semibold mb-4 flex items-center ${statusDisplay.color}`}>
                  <span className="mr-2">{statusDisplay.icon}</span>
                  {statusDisplay.text} ({statusTasks.length})
                </h3>
                
                <div className="space-y-3">
                  {statusTasks.map((task: Task) => {
                    const formattedTask = taskService.formatTaskForDisplay(task);
                    return (
                      <div key={task.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                          {canManageTasks && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleEditTask(task)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task)}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-xs text-gray-600">
                          <div>Assigned: {formattedTask.assigned_display}</div>
                          <div className={formattedTask.priority_display.color}>
                            Due: {formattedTask.due_date_display}
                          </div>
                        </div>

                        {canManageTasks && status !== 'done' && (
                          <div className="mt-3 pt-2 border-t border-gray-100">
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                              className="w-full text-xs border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                            >
                              {taskService.getStatusOptions().map((option: { value: TaskStatus; label: string; color: string }) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {statusTasks.length === 0 && (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      No {statusDisplay.text.toLowerCase()} tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Form Modal */}
      {taskModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleFormSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {taskModal.mode === 'create' ? 'Add New Task' : 'Edit Task'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {taskModal.mode === 'create' 
                        ? 'Create a new task for this event' 
                        : 'Update task information'}
                    </p>
                  </div>

                  {formState.errors.general && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {formState.errors.general}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                        Task Title *
                      </label>
                      <input
                        type="text"
                        id="title"
                        value={formState.title}
                        onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter task title"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 mb-1">
                        Assign To
                      </label>
                      <select
                        id="assigned_to"
                        value={formState.assigned_to}
                        onChange={(e) => setFormState(prev => ({ ...prev, assigned_to: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {assigneeOptions.map((option: { value: string; label: string; type: 'supporter' | 'user'; email?: string }) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        id="due_date"
                        value={formState.due_date}
                        onChange={(e) => setFormState(prev => ({ ...prev, due_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        id="status"
                        value={formState.status}
                        onChange={(e) => setFormState(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {taskService.getStatusOptions().map((option: { value: TaskStatus; label: string; color: string }) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={formState.isSubmitting}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {formState.isSubmitting ? 'Saving...' : (taskModal.mode === 'create' ? 'Add Task' : 'Save Changes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskModal({ isOpen: false, mode: 'create' })}
                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmModal.isOpen && confirmModal.task && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete Task
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete "<strong>{confirmModal.task.title}</strong>"? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmModal({ isOpen: false })}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManagement;