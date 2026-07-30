---
title: pscan — Multi-threaded port-scanner
description: Building a network port-scanner from scratch with Python. From implementing the core socket module, to learning about locking threads.
type: tool              # tool | series
status: active           # active | complete | paused
icon: scanner             # key into a small icon lookup table
featured: true
order: 1
tags: [Python, Sockets, CLI]
github: https://github.com/takibyte/port-scanner   # tool only
roadmap:                                          # tool only, omit for series
  - text: Implement Python socket module
    done: true
  - text: Make the first socket connection
    done: true
  - text: Scanning multiple ports
    done: true
  - text: Upgrade loops to threads
    done: true
  - text: Error handling
    done: true
  - text: Adding argparse
    done: true
posts:                    # ordered slugs — curated order, not auto-sorted
    - Building a port scanner with Python
    - Upgrading the port scanner with multi-threading

---

This is a simple port scanner written in Python. It allows you to scan a range of ports on a specified host to check which ports are open.

```
usage: portscanner [-h] [--start START] [--end END] [host]

positional arguments: host hostname or IPv4 address

options:

-h, --help show help message and exit

--start START start of the port range to be scanned

--end END end of the port range to be scanned

example usage: python3 portscanner.py --start 0 --end 1000 example.com
```

