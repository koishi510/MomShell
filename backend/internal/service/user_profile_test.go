package service

import (
	"testing"

	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/model"
)

func TestApplyProfileFieldUpdates_DadChatStyleRequiresDadRole(t *testing.T) {
	service := &UserService{}
	style := "ambient"

	user := &model.User{
		Role:         model.RoleMom,
		DadChatStyle: model.DadChatStyleTerminal,
	}

	err := service.applyProfileFieldUpdates(user, dto.UserProfileUpdate{
		DadChatStyle: &style,
	})
	if err == nil {
		t.Fatal("expected error when non-dad user updates dad chat style")
	}
	if user.DadChatStyle != model.DadChatStyleTerminal {
		t.Fatalf("dad chat style = %q, want %q", user.DadChatStyle, model.DadChatStyleTerminal)
	}
}

func TestApplyProfileFieldUpdates_DadChatStyleUpdatesForDad(t *testing.T) {
	service := &UserService{}
	style := "ambient"

	user := &model.User{
		Role:         model.RoleDad,
		DadChatStyle: model.DadChatStyleTerminal,
	}

	if err := service.applyProfileFieldUpdates(user, dto.UserProfileUpdate{
		DadChatStyle: &style,
	}); err != nil {
		t.Fatalf("applyProfileFieldUpdates() error = %v", err)
	}

	if user.DadChatStyle != model.DadChatStyleAmbient {
		t.Fatalf("dad chat style = %q, want %q", user.DadChatStyle, model.DadChatStyleAmbient)
	}
}

func TestBuildUserResponse_NormalizesDadChatStyle(t *testing.T) {
	service := &AuthService{}

	resp := service.buildUserResponse(&model.User{
		ID:           "user-1",
		Username:     "dad",
		Email:        "dad@example.com",
		Nickname:     "Dad",
		Role:         model.RoleDad,
		DadChatStyle: "",
	})

	if resp.DadChatStyle != string(model.DadChatStyleTerminal) {
		t.Fatalf("dad_chat_style = %q, want %q", resp.DadChatStyle, model.DadChatStyleTerminal)
	}
}
