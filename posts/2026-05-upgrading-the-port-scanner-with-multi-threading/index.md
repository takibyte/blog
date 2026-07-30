---
title: Upgrading the port scanner with multi-threading
dek: Switching out the loop logic for multi-threading, handling errors, and adding argparse.
author: takibyte
date: 2026-05-12
category: tools
tags: [Tools, Python, TCP/IP, Networking]
cover: cover.png
---

## From loops to threads

## Error handling

## Adding argparse

## Final thoughts


```py title=pscan.py

#!/usr/bin/env python3
"""
A simple port scanner utilising the python socket module.

"""

import argparse
import socket
import threading
from concurrent.futures import ThreadPoolExecutor
import time

parser = argparse.ArgumentParser(
    prog="portscanner",
    description="A simple port scanner")


def valid_port(value):
    port = int(value)
    if not (0 <= port <= 65535):
        raise argparse.ArgumentTypeError(f"{value} is not a valid port, valid range is: 0-65535")
    return port


parser.add_argument('host', type=str, nargs='?', help='hostname or IPv4 address')
parser.add_argument('--start', type=valid_port, default=0, help='start of the port range to be scanned')
parser.add_argument('--end', type=valid_port, default=1024, help='end of the port range to be scanned')
args = parser.parse_args()


hostname = args.host
ports = range(args.start, args.end + 1)

if not hostname:
    parser.error("a host argument is required")
 
try:
    resolved_hostname = socket.gethostbyname(hostname)
except socket.gaierror:
    parser.error(f"could not resolve host: {hostname}")


print(f"Scanning {hostname} ({resolved_hostname}) at ports {args.start}-{args.end}")

ports_open = 0
total_scanned = len(ports)

print_lock = threading.Lock()

# Setup socket connection with port connection check
def scan_port(host, port):
    global ports_open
    try:
        with socket.socket(family=socket.AF_INET, type=socket.SOCK_STREAM) as s:
            s.settimeout(1)

            result = s.connect_ex((host, port))

            with print_lock:
                if result == 0:
                    print(f"open port: {port}", end=" - ")
                    ports_open += 1
                    try:
                        print(socket.getservbyport(port))
                    except OSError:
                        print("Error: Service not known.")
        return
    
    except socket.timeout:
        print("Error: The scan has timed out.")
        return False
    
    except socket.gaierror:
        print("Error: The host couldn't resolve.")
        return False
    
start_time = time.time()

# Initiate multi-threaded scan
try:
    with ThreadPoolExecutor(max_workers=100) as executor:
        executor.map(lambda port : scan_port(hostname, port), ports)

except KeyboardInterrupt:
    print("\nScan cancelled by the user.")

finally:
    end_time = time.time()

    print("-" * 46)
    print("Scan complete.")
    print(f"{ports_open} {'ports are' if ports_open > 1 else 'port is'} open. Scanned {total_scanned} ports in total.")
    print(f"Finished scan in: {round(end_time-start_time, 2)} seconds.")

```

