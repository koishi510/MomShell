package jwt

import (
	"errors"
	"time"

	jwtv5 "github.com/golang-jwt/jwt/v5"
)

var ErrInvalidToken = errors.New("invalid or expired token")

type Claims struct {
	jwtv5.RegisteredClaims
	Type string `json:"type"` // access, refresh, password_reset
}

func CreateAccessToken(userID, secret string, expireMinutes int) (string, error) {
	claims := Claims{
		RegisteredClaims: jwtv5.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwtv5.NewNumericDate(time.Now().Add(time.Duration(expireMinutes) * time.Minute)),
			IssuedAt:  jwtv5.NewNumericDate(time.Now()),
		},
		Type: "access",
	}
	token := jwtv5.NewWithClaims(jwtv5.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func CreateRefreshToken(userID, secret string, expireDays int) (string, error) {
	claims := Claims{
		RegisteredClaims: jwtv5.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwtv5.NewNumericDate(time.Now().Add(time.Duration(expireDays) * 24 * time.Hour)),
			IssuedAt:  jwtv5.NewNumericDate(time.Now()),
		},
		Type: "refresh",
	}
	token := jwtv5.NewWithClaims(jwtv5.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func CreatePasswordResetToken(userID, secret string) (string, error) {
	claims := Claims{
		RegisteredClaims: jwtv5.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwtv5.NewNumericDate(time.Now().Add(1 * time.Hour)),
			IssuedAt:  jwtv5.NewNumericDate(time.Now()),
		},
		Type: "password_reset",
	}
	token := jwtv5.NewWithClaims(jwtv5.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ParseToken(tokenStr, secret string) (*Claims, error) {
	token, err := jwtv5.ParseWithClaims(tokenStr, &Claims{}, func(t *jwtv5.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwtv5.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, ErrInvalidToken
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

func VerifyPasswordResetToken(tokenStr, secret string) (string, error) {
	claims, err := ParseToken(tokenStr, secret)
	if err != nil {
		return "", err
	}
	if claims.Type != "password_reset" {
		return "", ErrInvalidToken
	}
	return claims.Subject, nil
}
