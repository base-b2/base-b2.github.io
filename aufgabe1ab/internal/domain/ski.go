package domain

// Ski is one pair of skis in the stock.
type Ski struct {
	ID       int      `json:"id"`
	Brand    string   `json:"brand"`
	Model    string   `json:"model"`
	LengthCm int      `json:"lengthCm"`
	Category Category `json:"category"`
}
