// Command server starts the ski rental app: JSON API and web UI.
package main

import (
	"embed"
	"flag"
	"io/fs"
	"log"
	"net/http"
	"time"

	"skirental/internal/api"
	"skirental/internal/domain"
	"skirental/internal/store"
)

//go:embed static
var staticFiles embed.FS

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	uploads := flag.String("uploads", "uploads", "directory for ID documents")
	flag.Parse()

	prices := domain.DefaultPrices()
	st := store.NewMemory(demoSkis())
	seedRentals(st, prices, domain.NewDate(time.Now()))

	web, err := fs.Sub(staticFiles, "static")
	if err != nil {
		log.Fatal(err)
	}
	mux := api.New(st, prices, *uploads, time.Now).Routes()
	mux.Handle("GET /", http.FileServer(http.FS(web)))

	log.Printf("open http://localhost%s", *addr)
	log.Fatal(http.ListenAndServe(*addr, mux))
}
