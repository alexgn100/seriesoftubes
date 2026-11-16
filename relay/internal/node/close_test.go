package node_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/fjaeckel/seriesoftubes/relay/internal/config"
	rt "github.com/fjaeckel/seriesoftubes/relay/internal/relaytest"
)

// Close returns only once the goroutines sessions run in have ended, and starts none after.
func TestCloseWaitsForSessionGoroutines(t *testing.T) {
	n := rt.New(t)
	x := n.Found("closing", "open").Nodes[0]
	release, ended := make(chan struct{}), make(chan struct{})
	if !x.R.Spawn(func() { <-release }) {
		t.Fatal("nothing ran on a live relay")
	}
	go func() { x.Stop(); close(ended) }()
	select {
	case <-ended:
		t.Fatal("Close returned while a session goroutine still ran")
	case <-time.After(200 * time.Millisecond):
	}
	close(release)
	<-ended
	if x.R.Spawn(func() { t.Error("ran after Close") }) {
		t.Fatal("a closed relay started a goroutine")
	}
}

// The registry refresh Run starts is one of those goroutines: Close returns only once it has ended (it writes the
// registry cache and may send an update notice, neither of which may happen after Close).
func TestCloseWaitsForTheFirstRegistryRefresh(t *testing.T) {
	n := rt.New(t)
	asked := make(chan struct{}, 1)
	url := n.Serve("registry", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case asked <- struct{}{}:
		default:
		}
		<-r.Context().Done() // no answer: the fetch ends only when the relay closes
	}))
	x := n.Listen("refreshing")
	cfg := config.Default()
	cfg.Registry = url + "/federation/servers.json"
	x.Start(rt.Dir(t), cfg)
	select {
	case <-asked:
	case <-time.After(10 * time.Second):
		t.Fatal("the registry was never asked")
	}
	x.Stop()
	if !strings.Contains(x.Log.String(), "registry: not refreshed") {
		t.Fatal("Close returned while the registry refresh it started still ran")
	}
}
