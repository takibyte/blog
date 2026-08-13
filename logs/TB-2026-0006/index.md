---
title: Upgrading the port scanner with multi-threading
dek: Switching out the loop logic for multi-threading, and handling errors.
author: takibyte
date: 2026-06-14
category: tools
tags: [Tools, Python, TCP/IP, Networking]
cover: cover.webp
---

In the previous log entry, I showed how I made the fundamentals of the port scanner: setting up an initial socket connection within a function, and then looping that function through a range of ports.

However, though the scanner functions fine right now, it is missing some things that will improve it significantly.

## Error handling

In most programs, it is a good standard to have some type of error handling present. Error handling is a way to handle potential errors cleanly, it can avoid exposing the program / system internals. Errors, if not handled properly, could pose a security risk, and from what I've learnt, it seems like a good habit to have, particularly when working on critical or complex programs.

Obviously this program isn't critical or complex by any means, but like I said, it is a good practice to have, and it is helpful for my own learning and practice too.

```py
#!/usr/bin/env python3

import socket

def scan_port(host, port):
      try:
            s = socket.socket(family=socket.AF_INET, type=socket.SOCK_STREAM)
            s.settimeout(1)

            result = s.connect_ex((host, port))

            if result == 0:
                print(f"open port: {port}", end=" - ")
                try:
                    print(socket.getservbyport(port))
                except OSError:
                    print("Error: Service not known.")

            s.close()

            return

      except socket.timeout:
            print("Error: The scan has timed out.")
            return False

      except socket.gaierror:
            print("Error: The host couldn't resolve.")
            return False
    
try:
      for port in range(1, 100):
            scan_port("localhost", port)

except KeyboardInterrupt:
      print("\nScan cancelled by the user.")
```

In the code block above, I have added the Python implementation of error handling: `try` and `except`. The full sequence could be: 

```py
try:
    # Try a block of code that could be error prone.
except:
    # On a particular error type, what to do (how to handle it).
else:
    # This runs a block of code if there are no exception errors.
finally:
    # This will always run, regardless of whether or not there are errors, can be used as a final clean-up step.
```

So far I have only used `try` and `except`, the others are optional and not needed right now.

Looking at the innermost try / except, we can see:

```py
if result == 0:
        print(f"open port: {port}", end=" - ")
        try:
            print(socket.getservbyport(port))
        except OSError:
            print("Error: Service not known.")

s.close()

return
```

Here I have added another print function, it gets and prints the service name with the port number that was just scanned, (for example, `ssh` for port 22). Using `try:`, we can attempt to get the service, but if there isn't one, it will throw the `except OSError:`, which will handle the error and print a message. The `OSError` is a generic Python error related to system errors, more information can be found [here](https://docs.python.org/3/library/exceptions.html#OSError). 

Additionally, in this block, I have added `, end=" - "` within the original print function. Normally, the print function automatically includes a newline with `\n`, including `end=" - "` overrides the new line and appends a dash, this simply allows for the service name to be formatted onto the same line as the printed port number.

Next, lets look at the main `try:` before the socket object creation. This `try:` block has the corresponding exception clauses here:

```py
try:
    # The socket connection attempt code

except socket.timeout:
    print("Error: The scan has timed out.")
    return False

except socket.gaierror:
    print("Error: The host couldn't resolve.")
    return False
```

Both of these are socket module related errors, and are a subclass of the `OSError` mentioned above.
`socket.timeout:`, as the print message indicates, is thrown when a scan times out.
`socket.gaierror:`, is related to errors getting address info with the `getaddrinfo()` or `getnameinfo()` socket functions (hence gai). More information on both of these error types and more can be found in the [documentation](https://docs.python.org/3/library/socket.html#exceptions).

Finally, the last try / except set is shown here:

```py
try:
      for port in range(1, 100):
            scan_port("localhost", port)

except KeyboardInterrupt:
      print("\nScan cancelled by the user.")
```

Here, I have moved the main `scan_port()` function call into a `try:` block, and added a `KeyboardInterrupt:` exception. As the error print message indicates, this exception is thrown when the user cancels the program (with control ^ C for example). This allows the user to cancel the program cleanly with an exception message, without displaying the default messy system error.

## From loops to threads

There is a bit of a problem with the scanner at the moment, right now, the scanner has to loop through sequentially, trying each socket with an incrementing port number. This is fine, but since we have a timeout set to 1 second, when a connection doesn't happen, it waits 1 second before moving on (this is more apparent when scanning a host other than localhost). In a sense this is good, because it makes sure the scanner doesn't hang on a connection attempt for too long, and it also doesn't give up on one too soon. The problem is that if you scan, say, 1000 ports, since most would be closed, it would take around 1000 seconds to complete the scan, which is obviously not ideal. Furthermore, with this loop setup, there is only one sequential process happening, under-utilising the capabilities of the CPU.

This is where concurrent multi-threading comes into play. Using this, will make it so we could have (for example) 100 threads each attempting a different socket in the range we set, so even with 1 second timeouts, the speed will be drastically increased due to the parallel processing. That's not to mention the increase in speed from simultaneous processing as well — many threads will be working at the same time, reducing the processing time regardless of the timeout setting.

So now that we know why multi-threading will be a big advantage here, here's how I went about implementing it.

```py
#!/usr/bin/env python3

import socket
import threading
from concurrent.futures import ThreadPoolExecutor

hostname = "localhost"
ports = range(1, 1000)

print_lock = threading.Lock()

def scan_port(host, port):
      try:
            with socket.socket(family=socket.AF_INET, type=socket.SOCK_STREAM) as s:
                  s.settimeout(1)

                  result = s.connect_ex((host, port))

                  with print_lock:
                        if result == 0:
                              print(f"open port: {port}", end=" - ")
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
    
try:
      with ThreadPoolExecutor(max_workers=100) as executor:
            executor.map(lambda port : scan_port(hostname, port), ports)

except KeyboardInterrupt:
      print("\nScan cancelled by the user.")
```

Let's break these next additions down. First, I have now included `with` statements three times throughout the program structure. `with` statements, are a control flow structure that makes opening and closing processes cleaner, as it automates the closing / cleanup step. This is superior for most cases, and especially so when it comes to opening many threads — using `with`, safely closes used threads after they are done. Having a habit of using `with` statements is useful for preventing things like memory leaks, because you don't have to remember to close opened / used processes. So, after implementing this, I have removed the close socket cleanup function: `s.close()`, as it is now handled by the `with` statement.

The main implementation of multithreading uses the `ThreadPoolExecutor`, which I have imported with the statement near the top: `from concurrent.futures import ThreadPoolExecutor`.

```py
try:
      with ThreadPoolExecutor(max_workers=100) as executor:
            executor.map(lambda port : scan_port(hostname, port), ports)
```

Here we can see the `ThreadPoolExecutor` being called into the new variable `executor` using `with`, the `max_workers` parameter has been set to 100, this means we are setting maximum of 100 threads in our thread pool that can be used.

Next is a slightly more difficult part to understand (at least it was for me initially). A `lambda` wrapper is needed here, because the `scan_port()` function requires two arguments (hostname and port), however, the `executor.map()` function can only pass one argument at a time + the iterable list `ports`. The `lambda` function solves this by taking the single port value in each instance, and calling the `scan_port()` function itself, with the additional `hostname` argument already baked into the function call.

The result of this is: up to 100 threads are being used to scan all the sockets, with each socket containing one of the different ports in the `ports` list.

:::note
Please note that the hostname and ports list is now moved into their own variable at the beginning of the program.
:::

Now when we run the program with multi-threading, we should see a dramatic increase in speed, particularly when scanning hosts that aren't the localhost loopback IP address.

```
python3 pscan.py
```

However, since we have implemented multi-threading now, we have introduced the potential for a different issue.
Now that multiple threads are running concurrently when scanning, you may encounter what are known as race conditions. Race conditions can happen when multiple processes are trying to access and use the same data, but with potential for time overlaps. One thread could try to open a socket with a particular port, while that thread is scanning the socket, another thread may try to access the `print()` function within the same `scan_port()` function. This could result in the output in the terminal being out of order or garbled, which could lead to incorrect service names being attributed to port numbers when printing.

The solution to this is straight forward to implement, it involves calling `threading.Lock()`.
In the code block above I have enabled access to `threading.Lock()` by importing the module:

```py
import threading
```

Then I created a `print_lock` variable containing `threading.Lock()` here:

```py
print_lock = threading.Lock()
```

Next I used the `prink_lock`, to wrap a code block that is locked with the `print_Lock` as seen here:

```py
with print_lock:
    if result == 0:
            print(f"open port: {port}", end=" - ")
            try:
                print(socket.getservbyport(port))
            except OSError:
                print("Error: Service not known.")
```

What this does, is make it so that only one thread can access this wrapped block of code at a time. When within that `with print_lock:` block, the other threads have to wait until the thread currently using it releases the lock again. Since we use a `with` statement here, the `print_lock` is automatically released once it's done.

And there we go, in this log entry we have: implemented error handling to carefully handle some errors, implemented multi-threading whilst protecting from race conditions with `threading.Lock()`.

In the next and final log entry, I will be adding argparse functionality — so the port scanner is CLI interactive — as well as add some other polishing touches.
