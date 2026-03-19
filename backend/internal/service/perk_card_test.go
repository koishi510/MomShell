package service

import (
	"testing"
	"time"

	"github.com/momshell/backend/internal/model"
)

func TestToPerkCardItem(t *testing.T) {
	now := time.Now()
	usedAt := now.Add(-time.Hour)
	expiresAt := now.Add(24 * time.Hour)

	card := model.PerkCard{
		ID:          "card-1",
		FromUserID:  "mom-1",
		ToUserID:    "dad-1",
		Title:       "游戏时间",
		Description: "可以玩1小时游戏",
		IconType:    "game",
		Status:      model.PerkUsed,
		UsedAt:      &usedAt,
		ExpiresAt:   &expiresAt,
		CreatedAt:   now,
	}

	item := toPerkCardItem(card)

	if item.ID != "card-1" {
		t.Errorf("ID = %q", item.ID)
	}
	if item.FromUserID != "mom-1" {
		t.Errorf("FromUserID = %q", item.FromUserID)
	}
	if item.ToUserID != "dad-1" {
		t.Errorf("ToUserID = %q", item.ToUserID)
	}
	if item.Title != "游戏时间" {
		t.Errorf("Title = %q", item.Title)
	}
	if item.Description != "可以玩1小时游戏" {
		t.Errorf("Description = %q", item.Description)
	}
	if item.IconType != "game" {
		t.Errorf("IconType = %q", item.IconType)
	}
	if item.Status != "used" {
		t.Errorf("Status = %q", item.Status)
	}
	if item.UsedAt == nil || !item.UsedAt.Equal(usedAt) {
		t.Errorf("UsedAt mismatch")
	}
	if item.ExpiresAt == nil || !item.ExpiresAt.Equal(expiresAt) {
		t.Errorf("ExpiresAt mismatch")
	}
}

func TestToPerkCardItem_Active(t *testing.T) {
	card := model.PerkCard{
		ID:         "card-2",
		FromUserID: "mom-2",
		ToUserID:   "dad-2",
		Title:      "睡懒觉",
		Status:     model.PerkActive,
		CreatedAt:  time.Now(),
	}

	item := toPerkCardItem(card)

	if item.Status != "active" {
		t.Errorf("Status = %q, want active", item.Status)
	}
	if item.UsedAt != nil {
		t.Errorf("UsedAt should be nil for active card")
	}
	if item.ExpiresAt != nil {
		t.Errorf("ExpiresAt should be nil")
	}
}

func TestToPerkCardItem_Expired(t *testing.T) {
	card := model.PerkCard{
		ID:     "card-3",
		Status: model.PerkExpired,
	}
	item := toPerkCardItem(card)
	if item.Status != "expired" {
		t.Errorf("Status = %q, want expired", item.Status)
	}
}
