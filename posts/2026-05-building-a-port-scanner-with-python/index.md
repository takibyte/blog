---
title: Building a port scanner with Python
dek: How I built a simple network port scanner from scratch with Python.
author: takibyte
date: 2026-05-10
category: tools
tags: [Tools, Python, TCP/IP, Networking]
cover: cover.webp
---

## What is a port scanner?

A port scanner, is a network tool that can be used to scan a host on a network, and determine what port numbers are open or closed on that host. Determining what port numbers are open can give important information about what kinds of services might be running on that host. This is useful to know for both attackers and defenders of a network.

Network defenders will want to know what ports are open, because they can use this information to determine whether *unnecessary* ports / services are open, allowing them to close those unneeded ports / services in an effort to harden the security posture of the network.

Attackers on the other hand, might use a port scanner to do active reconnaissance on a target host, surveying the host and greater network, looking for potentially vulnerable open ports and services as a way inside, and to otherwise exploit those vulnerabilities.

## Why build a port scanner?

The main reason for me to build this is of course, for a learning experience — to get a better understanding of how a simple scanner might work under the hood. There are many much more capable port scanners than the one I've built here, Nmap comes to mind.

Nmap is a much more powerful tool that is more than just a port scanner, it can do network host discovery using ICMP, ARP, or TCP SYN; detection evasion techniques; more advanced port scanning techniques like TCP SYN (stealth) scans; and many other features like OS detection and others that I haven't explored yet.

My scanner here is a humble TCP connect port scanner, where you can scan the ports of a host whose address you already have, completing a full TCP three-way handshake with each connection (rather than a SYN scan, which doesn't complete the handshake).

## The core of the port scanner

A port scanner doesn't actually scan ports by themselves, they scan what is known as a socket. A socket is essentially an IP address, a transport layer protocol (TCP or UDP), and the port number — the socket is the union of these three things, and is used to form connections.

```py
#!/usr/bin/env python3

import socket

s = socket.socket(family=socket.AF_INET, type=socket.SOCK_STREAM)

```

Python's **socket** module (based on the historic Berkeley socket API standard) can interface with the low-level networking components of the system, this module is what will allow the port scanner to function at all, and it is therefore the core of this tool and is vital.

In the code snippet shown here, I have imported the socket module with `import socket` so we can access it, I have then created a new socket object with `socket.socket()`. For easy reference later, this socket object is stored in the new variable `s`.

The socket object is made from the underlying class: `class socket.socket(family=AF_INET, type=SOCK_STREAM, proto=0, fileno=None)`. The family and type are the only two properties needed, the proto and fileno are only for certain specific cases not required here.

The `family` property has several value options (two main ones), this specifies the 'Address Family', hence the 'AF' in `socket.AF_INET` — referring to the type of IP address in the socket. The two main values here could be either `AF_INET`, representing the IPv4 address family; and `AF_INET6`, representing the IPv6 address family.

The `type` property has again, a number of options, but there are two main options: `SOCK_STREAM`, the default value, this represents the connection-orientated Transmission Control Protocol (TCP); and `SOCK_DGRAM`, representing the 'connectionless' User Datagram Protocol (UDP).

In this port scanner, we will be using the `AF_INET` and `SOCK_STREAM` for our values in the newly created socket object — as IPv4 is still the standard, and a TCP based verifiable connection will be more useful here, (the other options could be added to the scanner later as an additional option).



## Making the first socket connection


```py
#!/usr/bin/env python3

import socket

def scan_port(host, port):
    s = socket.socket(family=socket.AF_INET, type=socket.SOCK_STREAM)
    result = s.connect_ex((host, port))
    
    print(result)

    s.close()

    return

scan_port("localhost", 22)
```

So here we have the crux of the whole program, making an actual socket connection, and testing if a known-open scanned port is detected as being open.

In this code snippet, I have enclosed the socket object within a newly defined function: `def scan_port(host, port):`, this function accepts a **host** IP address / hostname, and a **port** number.

The `result` variable is storing an executed function within the created socket object called `connect_ex()`. `connect_ex()` is related to another function in the socket object called `connect()`, both of these functions attempt a connection to the socket, accepting an IP address and a port number in the form of a tuple: (ip, port).

:::note
I just decided to call the referenced value in my scanner `host`, as you can scan hostnames or host IP addresses, they will both resolve to the same valid IP.
:::

`connect_ex()` is used here, as it returns a number value even on exception: it will return `0` if the connection is successful, and another error number if there is an error. `connect()`, will raise a text exception on failure, which won't be as usable for the port scanner.

`result` is printed, the created socket is closed with `s.close()`, and the function then ends with `return`. The function is called at the bottom with `scan_port("localhost", 22)`, this has the socket object attempt to create a connection to `localhost` (the loopback address / 127.0.0.1), with port `22`, the ssh port (which I know is open on my computer).

:::warn
It is recommended to close the socket connection with `socket.close()` (`s.close()` in my case), as this will free up resources and prevent memory leaks.
:::

Now let's run the program so far like this:

```
python3 pscan.py
```

This will return `0`, indicating the socket object successfully connected and that the port is open, nice it worked!


## Scanning multiple ports

```py
#!/usr/bin/env python3

import socket

def scan_port(host, port):

        s = socket.socket(family=socket.AF_INET, type=socket.SOCK_STREAM)
        s.settimeout(1)

        result = s.connect_ex((host, port))

        if result == 0:
              print(f"open port: {port}")
        else:
              print(f"closed port: {port}")

        s.close()

        return
    

for port in range(1, 30):
    scan_port("localhost", port)
```

To make the scanner a bit more useful now, we'll add a loop, so the function can automatically scan several ports in succession. To do this we can so a simple 'for loop' — as seen in this snippet:

```py
for port in range(1, 30):
    scan_port("localhost", port)`
```

This will use a variable `port` and substitute it into its placeholder in the function call below, iterating through the range 1 to 30. This means the `scan_port("localhost", port)` function will be called 29 times with the port number increasing by 1 each time. With this example, when running the program again, I see an output with a series of error codes `61` (indicating a closed port), and one number `0` (indicating a successful connection and open port), at the 22nd position in the output. So we can see this works as intended.

:::warn
We need to add a `s.settimeout(1)` to the function after the creation of the socket object, this makes it so the program doesn't keep hanging if a socket connection can't be resolved properly in a timely way. The `1` sets the timeout to 1 second, so if the socket can't be connected, it will move on to the next loop iteration.
:::

To make this a bit nicer, we should print a message saying the port is open (when it is open), and closed (when it is closed), along with the corresponding port. As seen in the code block above, we can do this easily with a conditional `if` statement like this:

```py
if result == 0:
        print(f"open port: {port}")
else:
        print(f"closed port: {port}")

s.close()

return
```

The logic here is simple, if the `connect_ex((host, port))` result (from the result variable), equals `0`, that means the connection succeeded and the port is open, therefore we will print using: `print(f"open port: {port}")`, which would return something like: `open port: 22`. Otherwise, we will print using `print(f"closed port: {port}")`, which would return something like: `closed port: 23`. The `print(f"Text {variable}")` format uses a formatted string literal, which allows the formatting of variables into strings at runtime, replacing the curly brackets with the variable value.

Going forward however, when scanning many ports (over 1000 for example), it won't be ideal to print every time a closed port is detected, this will create too much unnecessary noise in the terminal output. So removing the `else:` block as in the block below will be better:

```py
#!/usr/bin/env python3

import socket

def scan_port(host, port):

        s = socket.socket(family=socket.AF_INET, type=socket.SOCK_STREAM)
        s.settimeout(1)

        result = s.connect_ex((host, port))

        if result == 0:
              print(f"open port: {port}")

        s.close()

        return
    

for port in range(1, 30):
    scan_port("localhost", port)
```

:::note
Keep in mind that with the current state of the scanner, when scanning a host other than `localhost`, the scanner will wait for one second on each failed connection attempt. So for example, if scanning 100 ports, since most ports will be closed, the whole scan will take around 100 seconds. This is obviously not ideal, but will be resolved when we add multi-threading in the next post.
:::

And there we have it, an operational port scanner! Though this is quite basic and lacks a lot still, it works, which is pretty cool.

In the next posts, I'll write about how I improved this simple port scanner to have: proper error handling; replacing the loop with multi-threading for much faster speeds; and argparse, allowing for user input, and the ability to interactively set which ports to scan using the CLI.

