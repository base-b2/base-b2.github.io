package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"bikerental/internal/domain"
)

type endpoint func(w http.ResponseWriter, r *http.Request) error

// wrap turns an endpoint that returns an error into an http.HandlerFunc.
func wrap(fn endpoint) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := fn(w, r); err != nil {
			writeError(w, err)
		}
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encode response: %v", err)
	}
}

// writeError maps domain errors to status codes in one place.
func writeError(w http.ResponseWriter, err error) {
	var de *domain.Error
	if !errors.As(err, &de) {
		log.Printf("internal error: %v", err)
		writeJSON(w, http.StatusInternalServerError,
			map[string]string{"error": "Etwas ist schiefgelaufen. Bitte erneut versuchen."})
		return
	}
	status := http.StatusInternalServerError
	switch {
	case errors.Is(err, domain.ErrInvalid):
		status = http.StatusBadRequest
	case errors.Is(err, domain.ErrNotFound):
		status = http.StatusNotFound
	case errors.Is(err, domain.ErrConflict):
		status = http.StatusConflict
	}
	writeJSON(w, status, map[string]string{"error": de.Msg})
}
