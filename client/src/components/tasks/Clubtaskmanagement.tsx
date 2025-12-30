// client/src/components/tasks/ClubTaskManagement.tsx
import React, { useState, useEffect } from 'react';
import { Task, CreateTaskData, TaskStatus, Event, Supporter, User } from '../../types/types';
import taskService from '../../services/taskServices';
import supporterService from '../../services/supporterService';
import userService from '../../services/userService';
import { useAuth } from '../../store/app_store';

interface ClubTaskManagementProps {
  events: Event[];
  clubId: string;
}

const ClubTaskManagement: React.FC<ClubTaskManagementProps> = ({ events, clubId }) => {
  const { user: currentUser } = useAuth();

  // State management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  
  // Modal and form state
  const [taskModal, setTaskModal] = useState<{ 
    isOpen: boolean; 
    mode: 'create' | 'edit'; 
    item?: Task;
    eventId?: string;
  }>({ isOpen: false, mode: 'create' });
  
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; task?: Task }>({ isOpen: false });
  const [formState, setFormState] = useState<{
    title: string;
    assigned_to: string;
    due_date: string;
    status: TaskStatus;
    isSubmitting: boolean;
    errors: Record<string, string>;
  }>({
    title: '',
    assigned_to: '',
    due_date: '',
    status: 'todo',
    isSubmitting: false,
    errors: {}
  });

  // Load data on component mount
  useEffect(() => {
    loadAllTasks();
    loadSupporters();
    loadUsers();
  }, [clubId]);

  const loadAllTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load tasks for all events
      const allTasks: Task[] = [];
      
      for (const event of events) {
        try {
          const response = await taskService.getTasksByEvent(event.id);
          if (response.tasks) {
            allTasks.push(...response.tasks);
          }
        } catch (err) {
          console.error(`Failed to load tasks for event ${event.id}:`, err);
        }
      }
      
      setTasks(taskService.sortTasks(allTasks, 'due_date'));
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

  const handleCreateTask = (eventId?: string) => {
    setFormState({
      title: '',
      assigned_to: '',
      due_date: '',
      status: 'todo',
      isSubmitting: false,
      errors: {}
    });
    setTaskModal({ isOpen: true, mode: 'create', eventId: eventId || events[0]?.id });
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
    setTaskModal({ isOpen: true, mode: 'edit', item: task, eventId: task.event_id });
  };

  const handleDeleteTask = (task: Task) => {
    setConfirmModal({ isOpen: true, task });
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      await loadAllTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task status');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eventId = taskModal.eventId;
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
      await loadAllTasks();
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
      await loadAllTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      setConfirmModal({ isOpen: false });
    }
  };

  // Filter tasks by selected event
  let displayTasks = tasks;
  if (selectedEventId !== 'all') {
    displayTasks = tasks.filter(task => task.event_id === selectedEventId);
  }

  // Filter and search tasks
  const filteredTasks = taskService.filterTasks(displayTasks, {
    status: statusFilter === 'all' ? undefined : statusFilter,
    assigned_to: assigneeFilter === 'all' ? undefined : assigneeFilter,
    search: searchTerm
  });

  const groupedTasks = taskService.groupTasksByStatus(filteredTasks);
  const assigneeOptions = taskService.formatAssigneeOptions(supporters, users);
  const canManageTasks = ['host', 'admin', 'communications'].includes(currentUser?.role || '');
  const completionPercentage = taskService.calculateCompletionPercentage(displayTasks);

  // Get stats
  const stats = {
    total: displayTasks.length,
    todo: displayTasks.filter(t => t.status === 'todo').length,
    inProgress: displayTasks.filter(t => t.status === 'in_progress').length,
    done: displayTasks.filter(t => t.status === 'done').length,
    overdue: displayTasks.filter(t => {
      const priority = taskService.getTaskPriority(t);
      return priority.level === 'overdue';
    }).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Yet</h3>
        <p className="text-gray-500 mb-6">Create an event first before adding tasks</p>
        <button
          onClick={() => window.location.hash = '#events'}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
        >
          Go to Events
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Task Management</h2>
            <p className="text-gray-600 mt-1">Manage tasks across all your events</p>
          </div>
          {canManageTasks && (
            <button
              onClick={() => handleCreateTask()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Task
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Tasks</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.todo}</div>
            <div className="text-sm text-gray-600">To Do</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{stats.done}</div>
            <div className="text-sm text-gray-600">Done</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Overall Progress</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Event Filter */}
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Events</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>

            {/* Assignee Filter */}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Assignees</option>
              {assigneeOptions.filter(opt => opt.value !== '').map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Search */}
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="List View"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`p-2 rounded-lg ${viewMode === 'board' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Board View"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Tasks Display */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No tasks found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTasks.map(task => {
                const formatted = taskService.formatTaskForDisplay(task);
                return (
                  <div key={task.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{task.title}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${formatted.status_display.bgColor} ${formatted.status_display.color}`}>
                            {formatted.status_display.text}
                          </span>
                          {formatted.is_overdue && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600">
                              Overdue
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <span>📅 {formatted.due_date_display}</span>
                          <span>👤 {formatted.assigned_display}</span>
                          <span>🎯 {task.event_title || 'Unknown Event'}</span>
                          <span className={formatted.priority_display.color}>
                            {formatted.priority_display.text}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {canManageTasks && (
                          <>
                            <button
                              onClick={() => handleEditTask(task)}
                              className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task)}
                              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                        {formatted.can_be_completed && (
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            {taskService.getStatusOptions().map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // Board View
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(groupedTasks).map(([status, statusTasks]) => {
            const statusDisplay = taskService.getTaskStatusDisplay(status as TaskStatus);
            return (
              <div key={status} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${statusDisplay.color}`}>
                    {statusDisplay.text} ({statusTasks.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {statusTasks.map(task => {
                    const formatted = taskService.formatTaskForDisplay(task);
                    return (
                      <div key={task.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                          {canManageTasks && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditTask(task)}
                                className="p-1 text-gray-400 hover:text-blue-600"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task)}
                                className="p-1 text-gray-400 hover:text-red-600"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <p>📅 {formatted.due_date_display}</p>
                          <p>👤 {formatted.assigned_display}</p>
                          <p>🎯 {task.event_title || 'Unknown'}</p>
                          <p className={formatted.priority_display.color}>
                            {formatted.priority_display.text}
                          </p>
                        </div>
                        {formatted.can_be_completed && (
                          <div className="mt-2">
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            >
                              {taskService.getStatusOptions().map(option => (
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
                        ? 'Create a new task' 
                        : 'Update task information'}
                    </p>
                  </div>

                  {formState.errors.general && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {formState.errors.general}
                    </div>
                  )}

                  <div className="space-y-4">
                    {taskModal.mode === 'create' && (
                      <div>
                        <label htmlFor="event" className="block text-sm font-medium text-gray-700 mb-1">
                          Event *
                        </label>
                        <select
                          id="event"
                          value={taskModal.eventId}
                          onChange={(e) => setTaskModal(prev => ({ ...prev, eventId: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          {events.map(event => (
                            <option key={event.id} value={event.id}>
                              {event.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

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
                        {assigneeOptions.map(option => (
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
                        {taskService.getStatusOptions().map(option => (
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

export default ClubTaskManagement;