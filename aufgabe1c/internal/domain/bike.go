package domain

// Bike is one bicycle in the stock.
type Bike struct {
	ID        int      `json:"id"`
	Brand     string   `json:"brand"`
	Model     string   `json:"model"`
	FrameSize string   `json:"frameSize"`
	Category  Category `json:"category"`
}
