import { defineStore } from 'pinia';
import taskService from '@/services/task.service.js';

/**
 * Sort field enum — avoids hardcoded string comparisons
 */
export const TaskSortField = Object.freeze({
  CREATED_AT: 'createdAt',
  DUE_DATE: 'dueDate',
  STATUS: 'status',
  PRIORITY: 'priority',
  TITLE: 'title',
});

export const useTaskStore = defineStore('task', {
  state: () => ({
    // Task lists by channel
    taskListsByChannelId: {},
    taskListsLoadingByChannelId: {},

    // Tasks by task list
    tasksByListId: {},
    tasksLoadingByListId: {},

    // My tasks
    myTasks: [],
    myTasksLoading: false,

    // Selected task for detail panel
    selectedTask: null,
    selectedTaskLoading: false,

    // Create / update
    createTaskLoading: false,
    updateTaskLoading: false,
  }),

  getters: {
    getTaskListsByChannelId: (state) => (channelId) => {
      return state.taskListsByChannelId[channelId] || [];
    },
    getTasksByListId: (state) => (listId) => {
      return state.tasksByListId[listId]?.tasks || [];
    },
    isListTasksLoading: (state) => (listId) => {
      return !!state.tasksLoadingByListId[listId];
    },
  },

  actions: {
    // ─── Task Lists ─────────────────────────────────────────

    async fetchTaskLists(workspaceId, channelId) {
      this.taskListsLoadingByChannelId[channelId] = true;
      try {
        const result = await taskService.getTaskLists(workspaceId, channelId);
        this.taskListsByChannelId[channelId] = result;
        return result;
      } catch (error) {
        throw error;
      } finally {
        this.taskListsLoadingByChannelId[channelId] = false;
      }
    },

    async createTaskList(workspaceId, channelId, name) {
      try {
        const result = await taskService.createTaskList(workspaceId, channelId, { name });
        // Refresh lists
        await this.fetchTaskLists(workspaceId, channelId);
        return result;
      } catch (error) {
        throw error;
      }
    },

    async updateTaskList(workspaceId, taskListId, data) {
      try {
        const result = await taskService.updateTaskList(workspaceId, taskListId, data);
        // Update in local cache
        for (const channelId in this.taskListsByChannelId) {
          const lists = this.taskListsByChannelId[channelId];
          const idx = lists.findIndex((l) => l.id === taskListId);
          if (idx >= 0) {
            lists[idx] = { ...lists[idx], ...result };
            break;
          }
        }
        return result;
      } catch (error) {
        throw error;
      }
    },

    async deleteTaskList(workspaceId, taskListId, channelId) {
      try {
        await taskService.deleteTaskList(workspaceId, taskListId);
        // Refresh lists
        if (channelId) {
          await this.fetchTaskLists(workspaceId, channelId);
        }
        // Clean up tasks cache
        if (this.tasksByListId[taskListId]) {
          delete this.tasksByListId[taskListId];
        }
      } catch (error) {
        throw error;
      }
    },

    // ─── Tasks ──────────────────────────────────────────────

    async fetchTasksByList(workspaceId, taskListId, filters = {}) {
      this.tasksLoadingByListId[taskListId] = true;
      try {
        const result = await taskService.getTasksByList(workspaceId, taskListId, filters);
        this.tasksByListId[taskListId] = result;
        return result;
      } catch (error) {
        throw error;
      } finally {
        this.tasksLoadingByListId[taskListId] = false;
      }
    },

    async createTask(workspaceId, taskListId, data) {
      this.createTaskLoading = true;
      try {
        const result = await taskService.createTask(workspaceId, taskListId, data);
        // Refresh list tasks
        await this.fetchTasksByList(workspaceId, taskListId);
        return result;
      } catch (error) {
        throw error;
      } finally {
        this.createTaskLoading = false;
      }
    },

    async updateTask(workspaceId, taskId, data) {
      this.updateTaskLoading = true;
      try {
        const result = await taskService.updateTask(workspaceId, taskId, data);
        this.updateTaskInLocalState(result);
        return result;
      } catch (error) {
        throw error;
      } finally {
        this.updateTaskLoading = false;
      }
    },

    async deleteTask(workspaceId, taskId, taskListId) {
      try {
        await taskService.deleteTask(workspaceId, taskId);
        // Remove from local state
        if (this.tasksByListId[taskListId]?.tasks) {
          this.tasksByListId[taskListId].tasks =
            this.tasksByListId[taskListId].tasks.filter((t) => t.id !== taskId);
        }
        if (this.selectedTask?.id === taskId) {
          this.selectedTask = null;
        }
      } catch (error) {
        throw error;
      }
    },

    async fetchTaskById(workspaceId, taskId) {
      this.selectedTaskLoading = true;
      try {
        const result = await taskService.getTaskById(workspaceId, taskId);
        this.selectedTask = result;
        return result;
      } catch (error) {
        throw error;
      } finally {
        this.selectedTaskLoading = false;
      }
    },

    async assignTask(workspaceId, taskId, workspaceMemberId) {
      try {
        const result = await taskService.assignTask(workspaceId, taskId, workspaceMemberId);
        this.updateTaskInLocalState(result);
        return result;
      } catch (error) {
        throw error;
      }
    },

    async unassignTask(workspaceId, taskId, memberId) {
      try {
        const result = await taskService.unassignTask(workspaceId, taskId, memberId);
        this.updateTaskInLocalState(result);
        return result;
      } catch (error) {
        throw error;
      }
    },

    async fetchMyTasks(workspaceId, filters = {}) {
      this.myTasksLoading = true;
      try {
        const result = await taskService.getMyTasks(workspaceId, filters);
        this.myTasks = result.tasks || [];
        return result;
      } catch (error) {
        throw error;
      } finally {
        this.myTasksLoading = false;
      }
    },

    selectTask(task) {
      this.selectedTask = task;
    },

    clearSelectedTask() {
      this.selectedTask = null;
    },

    // Update a task in all local caches
    updateTaskInLocalState(updatedTask) {
      if (!updatedTask) return;

      // Update in list tasks
      for (const listId in this.tasksByListId) {
        const data = this.tasksByListId[listId];
        if (data?.tasks) {
          const idx = data.tasks.findIndex((t) => t.id === updatedTask.id);
          if (idx >= 0) {
            data.tasks[idx] = updatedTask;
          }
        }
      }

      // Update selected task
      if (this.selectedTask?.id === updatedTask.id) {
        this.selectedTask = updatedTask;
      }

      // Update in my tasks
      const myIdx = this.myTasks.findIndex((t) => t.id === updatedTask.id);
      if (myIdx >= 0) {
        this.myTasks[myIdx] = updatedTask;
      }
    },
  },
});
