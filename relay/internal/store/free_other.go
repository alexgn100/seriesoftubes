//go:build !(linux || darwin || freebsd)

package store

// FreeDisk is the space left on the data folder's disk, or -1 when unknown: always here (Windows, and Unix systems whose
// Statfs_t has other fields, OpenBSD and NetBSD).
func (s *Store) FreeDisk() int64 { return -1 }
