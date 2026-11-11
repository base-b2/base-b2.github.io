// Command server starts the bike rental app: JSON API and web UI.
package main

import (
	"embed"
	"flag"
	"io/fs"
	"log"
	"net/http"
	"time"
	_ "time/tzdata" // time zone data inside the binary, also for Windows

	"bikerental/internal/api"
	"bikerental/internal/domain"
	"bikerental/internal/store"
)

//go:embed static
var staticFiles embed.FS

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	uploads := flag.String("uploads", "uploads", "directory for ID documents")
	zone := flag.String("zone", "Europe/Berlin", "time zone of the shop")
	flag.Parse()

	loc, err := time.LoadLocation(*zone)
	if err != nil {
		log.Fatalf("time zone: %v", err)
	}

	prices := domain.DefaultPrices()
	st := store.NewMemory(demoBikes())
	seedRentals(st, prices, domain.NewMoment(time.Now().In(loc)))

	web, err := fs.Sub(staticFiles, "static")
	if err != nil {
		log.Fatal(err)
	}
	mux := api.New(st, prices, domain.DefaultOpeningHours(), loc, *uploads, time.Now).Routes()
	mux.Handle("GET /", http.FileServer(http.FS(web)))

	log.Printf("open http://localhost%s", *addr)
	log.Fatal(http.ListenAndServe(*addr, mux))
}
