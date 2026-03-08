package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/middleware"
	"github.com/momshell/backend/internal/service"
)

type TaskHandler struct {
	taskService *service.TaskService
}

func NewTaskHandler(taskService *service.TaskService) *TaskHandler {
	return &TaskHandler{taskService: taskService}
}

// GET /api/v1/tasks/daily
func (h *TaskHandler) DailyTasks(c *gin.Context) {
	userID := middleware.GetUserID(c)
	items, err := h.taskService.GetDailyTasks(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, items)
}

// POST /api/v1/tasks/:id/complete
func (h *TaskHandler) Complete(c *gin.Context) {
	taskID := c.Param("id")
	userID := middleware.GetUserID(c)

	item, err := h.taskService.CompleteTask(userID, taskID)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "任务不存在" {
			status = http.StatusNotFound
		} else if err.Error() == "无权操作此任务" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, item)
}

// GET /api/v1/tasks/partner
func (h *TaskHandler) PartnerTasks(c *gin.Context) {
	userID := middleware.GetUserID(c)
	items, err := h.taskService.GetPartnerTasks(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, items)
}

// POST /api/v1/tasks/:id/score
func (h *TaskHandler) Score(c *gin.Context) {
	taskID := c.Param("id")
	userID := middleware.GetUserID(c)

	var req dto.TaskScore
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item, err := h.taskService.ScoreTask(userID, taskID, req)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "任务不存在" {
			status = http.StatusNotFound
		} else if err.Error() == "只能验收伴侣的任务" || err.Error() == "只有妈妈角色可以验收任务" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, item)
}

// GET /api/v1/tasks/stats
func (h *TaskHandler) Stats(c *gin.Context) {
	userID := middleware.GetUserID(c)
	stats, err := h.taskService.GetTaskStats(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}
