---
title: pscan — Multi-threaded port-scanner
description: Building a network port-scanner from scratch with Python. From implementing the core socket module, to learning about locking threads.
type: tool              # tool | series
status: complete           # active | complete | paused
icon: scanner             # key into a small icon lookup table
featured: true
order: 2
tags: [Python, Sockets, CLI]
github: https://github.com/takibyte/pscan   # tool only
roadmap:                                          # tool only, omit for series
  - text: Implement Python socket module
    done: true
  - text: Make the first socket connection
    done: true
  - text: Scanning multiple ports
    done: true
  - text: Error handling
    done: true
  - text: Upgrade loops to threads
    done: true
  - text: Adding argparse
    done: true
logs:                    # ordered slugs — curated order, not auto-sorted
    - Building a port scanner with Python
    - Upgrading the port scanner with multi-threading
    - Improving the port scanner with argparse

---

This is a simple port scanner written in Python. It allows you to scan a range of ports on a specified host to check which ports are open.

```
usage: pscan [-h] [--start START] [--end END] [host]

A simple port scanner

positional arguments:
  host           hostname or IPv4 address

options:
  -h, --help     show this help message and exit
  --start START  start of the port range to be scanned
  --end END      end of the port range to be scanned

example usage: python3 pscan.py --start 1 --end 1024 example.com
```

