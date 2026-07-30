---
title: Building a port scanner with Python
dek: How I went about building a simple network port scanner from scratch with Python.
author: takibyte
date: 2026-05-10
category: tools
tags: [Tools, Python, TCP/IP, Networking]
cover: cover.png
---

## What is a port scanner?

A port scanner or network scanner, is a network tool that can be used to scan a host on a network, and determine what port numbers are open or closed on that host. Determining what port numbers are open can give important information about what kinds of services might be running on that host. This is useful to know for both attackers and defenders of a network.

Network defenders will want to know what ports are open, because they can use this information to determine whether *unnecessary* ports / services are open, allowing them to close those unneeded ports / services in an effort to harden the security posture of the network.

Attackers on the other hand, might use a port scanner to do active reconnaissance on a target host, surveying the host and greater network, looking for potentially vulnerable open ports and services as a way inside, and to otherwise exploit those vulnerabilities.

## Why build a port scanner?

The main reason for me to build this is of course, for a learning experience — to get a better understanding of how a simple scanner might work under the hood. There are many much more capable port scanners than the one I've built here, Nmap comes to mind.

Nmap is much more powerful tool that is more than just a port scanner, it can do network host discovery using ICMP, ARP, or TCP SYN; detection evasion techniques; more advanced port scanning techniques like TCP SYN (stealth) scans; and many other features like OS detection and others that I haven't explored yet.

My scanner here is a humble TCP connect port scanner, where you can scan the ports of a host whose address you already have, completing a full TCP three-way handshake with each connection (rather than a SYN scan, which doesn't complete the handshake).

## The core of my port scanner


```py
import socket

s = socket.socket(family=socket.AF_INET, type=socket.SOCK_STREAM)

```


## Making the first socket connection


```py
#!/usr/bin/env python3

import socket

def scan_port(host, port):
    s = socket.socket(family=socket.AF_INET, type=socket.SOCK_STREAM)
    result = s.connect_ex((host, port))
    
    print(result)

    return

scan_port("localhost", 22)
```

## Scanning multiple ports

