package repository

// allowedSortOrders is shared across question and answer repositories
// to validate user-supplied ORDER BY direction.
var allowedSortOrders = map[string]string{
	"asc":  "asc",
	"desc": "desc",
}
