package api

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"skirental/internal/domain"
)

const maxUploadBytes = 5 << 20

// allowedDocuments maps detected content types to file extensions.
var allowedDocuments = map[string]string{
	"image/jpeg":      ".jpg",
	"image/png":       ".png",
	"application/pdf": ".pdf",
}

// saveIDDocument stores the uploaded ID under a random name and returns it.
func (h *Handler) saveIDDocument(r *http.Request) (string, error) {
	file, header, err := r.FormFile("idDocument")
	if err != nil {
		return "", domain.Invalid("Bitte den Ausweis als Foto oder PDF hochladen.")
	}
	defer file.Close()
	if header.Size > maxUploadBytes {
		return "", domain.Invalid("Die Datei ist größer als 5 MB.")
	}

	head := make([]byte, 512)
	n, _ := io.ReadFull(file, head)
	ext, ok := allowedDocuments[http.DetectContentType(head[:n])]
	if !ok {
		return "", domain.Invalid("Erlaubt sind JPG, PNG und PDF.")
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", fmt.Errorf("rewind upload: %w", err)
	}

	token := make([]byte, 8)
	if _, err := rand.Read(token); err != nil {
		return "", fmt.Errorf("create file name: %w", err)
	}
	name := hex.EncodeToString(token) + ext

	if err := os.MkdirAll(h.uploadDir, 0o755); err != nil {
		return "", fmt.Errorf("create upload dir: %w", err)
	}
	path := filepath.Join(h.uploadDir, name)
	dst, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return "", fmt.Errorf("create upload file: %w", err)
	}
	_, copyErr := io.Copy(dst, file)
	closeErr := dst.Close()
	if err := errors.Join(copyErr, closeErr); err != nil {
		os.Remove(path)
		return "", fmt.Errorf("save upload: %w", err)
	}
	return name, nil
}
