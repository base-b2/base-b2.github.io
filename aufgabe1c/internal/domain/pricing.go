package domain

// Category groups bikes by price.
type Category string

const (
	City     Category = "city"
	Trekking Category = "trekking"
	Mountain Category = "mountain"
	EBike    Category = "ebike"
)

// Tier sets the hourly price from FromHours on.
type Tier struct {
	FromHours   int `json:"fromHours"`
	HourlyCents int `json:"hourlyCents"`
}

// CategoryPrices lists the tiers of one category, ascending by FromHours,
// and the day price that caps every started day.
type CategoryPrices struct {
	Category Category `json:"category"`
	Tiers    []Tier   `json:"tiers"`
	DayCents int      `json:"dayCents"`
}

// PriceList holds all prices.
type PriceList []CategoryPrices

// DefaultPrices is the one place to change prices.
func DefaultPrices() PriceList {
	return PriceList{
		{City, []Tier{{1, 500}, {2, 450}, {4, 350}}, 1600},
		{Trekking, []Tier{{1, 600}, {2, 550}, {4, 450}}, 2000},
		{Mountain, []Tier{{1, 800}, {2, 700}, {4, 600}}, 2800},
		{EBike, []Tier{{1, 1000}, {2, 900}, {4, 800}}, 3600},
	}
}

// Quote is the price for a number of hours.
type Quote struct {
	Hours       int  `json:"hours"`
	HourlyCents int  `json:"hourlyCents"`
	TotalCents  int  `json:"totalCents"`
	DayRate     bool `json:"dayRate"` // the day price applies instead of the hourly price
}

// Quote prices hours rental hours for category c.
// The hourly price of the matching tier applies to every hour.
// The total never exceeds the day price for each started day of 24 hours.
func (p PriceList) Quote(c Category, hours int) (Quote, error) {
	if hours < 1 {
		return Quote{}, Invalid("Die Mietdauer beträgt mindestens eine Stunde.")
	}
	for _, cp := range p {
		if cp.Category != c {
			continue
		}
		hourly := 0
		for _, t := range cp.Tiers {
			if hours >= t.FromHours {
				hourly = t.HourlyCents
			}
		}
		byHour := hours * hourly
		byDay := (hours + 23) / 24 * cp.DayCents
		return Quote{
			Hours:       hours,
			HourlyCents: hourly,
			TotalCents:  min(byHour, byDay),
			DayRate:     byDay < byHour,
		}, nil
	}
	return Quote{}, NotFound("Für diese Kategorie gibt es keinen Preis.")
}
