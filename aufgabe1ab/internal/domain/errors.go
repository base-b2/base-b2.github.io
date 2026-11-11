package domain

import "errors"

// Error kinds. The API maps them to HTTP status codes.
var (
	ErrInvalid  = errors.New("invalid input")
	ErrNotFound = errors.New("not found")
	ErrConflict = errors.New("conflict")
)

// Error pairs a kind with a message that is safe to show to users.
type Error struct {
	Kind error
	Msg  string
}

func (e *Error) Error() string { return e.Msg }
func (e *Error) Unwrap() error { return e.Kind }

func Invalid(msg string) error  { return &Error{ErrInvalid, msg} }
func NotFound(msg string) error { return &Error{ErrNotFound, msg} }
func Conflict(msg string) error { return &Error{ErrConflict, msg} }
