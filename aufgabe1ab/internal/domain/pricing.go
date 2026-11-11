package domain

// Category groups skis by price.
type Category string

const (
	Junior   Category = "junior"
	Allround Category = "allround"
	Premium  Category = "premium"
)

// Tier sets the daily price from FromDays on.
type Tier struct {
	FromDays   int `json:"fromDays"`
	DailyCents int `json:"dailyCents"`
}

// CategoryPrices lists the tiers of one category, ascending by FromDays.
type CategoryPrices struct {
	Category Category `json:"category"`
	Tiers    []Tier   `json:"tiers"`
}

// PriceList holds all prices.
type PriceList []CategoryPrices

// DefaultPrices is the one place to change prices.
// The daily price of the matching tier applies to every rental day.
func DefaultPrices() PriceList {
	return PriceList{
		{Junior, []Tier{{1, 1500}, {2, 1300}, {4, 1000}}},
		{Allround, []Tier{{1, 2800}, {2, 2500}, {4, 2000}}},
		{Premium, []Tier{{1, 4200}, {2, 3800}, {4, 3200}}},
	}
}

// Quote is the price for a number of days.
type Quote struct {
	Days       int `json:"days"`
	DailyCents int `json:"dailyCents"`
	TotalCents int `json:"totalCents"`
}

// Quote prices days rental days for category c.
func (p PriceList) Quote(c Category, days int) (Quote, error) {
	if days < 1 {
		return Quote{}, Invalid("Die Verleihdauer muss mindestens einen Tag betragen.")
	}
	for _, cp := range p {
		if cp.Category != c {
			continue
		}
		daily := 0
		for _, t := range cp.Tiers {
			if days >= t.FromDays {
				daily = t.DailyCents
			}
		}
		return Quote{Days: days, DailyCents: daily, TotalCents: days * daily}, nil
	}
	return Quote{}, NotFound("Für diese Kategorie gibt es keinen Preis.")
}
