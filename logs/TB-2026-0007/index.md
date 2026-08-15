---
title: Improving the port scanner with argparse
dek: Adding CLI interactivity with argparse, and final thoughts.
author: takibyte
date: 2026-07-21
category: tools
tags: [Tools, Python, TCP/IP, Networking]
cover: cover.webp
---

## The current state of the port scanner

In the last log entry on bulding a port scanner, I added error handling, and upgraded the old loop-based scanning implementation to a superior mutli-threaded version.

Currently, the port scanner can scan ports relatively quickly and effectively, however there is no way for a user to determine which host to scan and on which ports, without editing the source code itself.

## The port scanner with argparse

To allow for this user interactivity, we will use the Python 'argparse' module in the scanner.

```py
#!/usr/bin/env python3

import argparse
import socket
import threading
from concurrent.futures import ThreadPoolExecutor

parser = argparse.ArgumentParser(
    prog="pscan",
    description="A simple port scanner")

def valid_port(value):
    port = int(value)
    if not (0 <= port <= 65535):
        raise argparse.ArgumentTypeError(f"{value} is not a valid port, valid range is: 0-65535")
    return port


parser.add_argument('host', type=str, nargs='?', help='hostname or IPv4 address')
parser.add_argument('--start', type=valid_port, default=1, help='start of the port range to be scanned')
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

This is the port scanner in the same state from the previous log entry, but with `argparse` implemented, let's get into the details of the additions.

## Adding argparse

First, we need to import `argparse` like so:

```py
import argparse
```

### Defining the parser object

Now we can define the parser for our port scanner program with the following portion:

```py
parser = argparse.ArgumentParser(
    prog="pscan",
    description="A simple port scanner")
```

Here, I created a new parser object in my variable `parser`, we define the program name with: `prog="the program name"`, and description with: `description="your description"`.

### Adding arguments to the parser

Pretty straightforward so far. Next we can use our newly created parser object to start adding arguments. These arguments that we define, are used to take the user CLI input found after designated flags, and have those values processed by the parser at runtime. We can then use those user provided values in the program.

```py
def valid_port(value):
    port = int(value)
    if not (0 <= port <= 65535):
        raise argparse.ArgumentTypeError(f"{value} is not a valid port, valid range is: 0-65535")
    return port


parser.add_argument('host', type=str, nargs='?', help='hostname or IPv4 address')
parser.add_argument('--start', type=valid_port, default=1, help='start of the port range to be scanned')
parser.add_argument('--end', type=valid_port, default=1024, help='end of the port range to be scanned')
args = parser.parse_args()
```

### Validating input ports

Let's first briefly address the `valid_port()` function. This function accepts an argument, assigns it as an integer to the `port` variable, it then uses a conditional `if` statement to check if the user provided port number is within 0 and 65535 (the possible range of ports). If it is within that range it returns the port, if it isn't, it throws the `argparse.ArgumentTypeError()`, with a message that the port isn't valid.

### Argument details

So moving on, we can see the three arguments `parser.add_argument()` I created. 

The first line:

```py
parser.add_argument('host', type=str, nargs='?', help='hostname or IPv4 address')
```

This adds the first argument to the parser. This argument is called `host`, no dashes in front of `host` make this a positional argument, which is usually required. `type=str`, accepts the input as a string. `nargs='?'`, makes this an optional positional argument, meaning it can be omitted (though this will throw an error if omitted, as seen in the logic a bit later). And `help='hostname or IPv4 address'`, this defines what the description is for this argument if the user runs the script with `-h` or `--help`.

The 2nd and 3rd lines: 

```py
parser.add_argument('--start', type=valid_port, default=1, help='start of the port range to be scanned')
parser.add_argument('--end', type=valid_port, default=1024, help='end of the port range to be scanned')
```

These have similar syntax to the first line with some differences worth going over. These arguments are both optional, the user doesn't need to specify these, as denoted with the flags in front of their names (two dashes).
The `type=valid_port` calls the custom function mentioned above, instead of using a built-in type like a string or integer. `default=` specifies what value is parsed by default if a user doesn't use this optional argument. And the help value is the same as seen above.

So by default, I've set the scanner to scan the port range between 1 and 1024 (the common ports number range), if the user doesn't set a range themselves using the argument flags.

### Parsing the arguments

```py
args = parser.parse_args()
```

This line actually parses the arguments from the command line at runtime, and then stores in into the `args` variable for use in the rest of the program.

You can go through the detailed documentation on python.org to see the various options for the argparse module:
<https://docs.python.org/3/library/argparse.html>.

### Using argument data

Now that we have arguments defined for the program, we can use the data stored in `args`, to sub into the port scanner logic.

```py
hostname = args.host
ports = range(args.start, args.end + 1)
```

Previously the `hostname` and `ports` variables, contained hardcoded values. Now, with the addition of argparse, these are dynamic, and can change depending on the users input, or be the default values (in the case of the ports range). The value parsed from the argument can be access by accessing the object variable with the corresponding argument name e.g. `args.host`. The `+ 1` in the range, accounts for the fact that the Python `range()` function ends before the specified end range, without adding the `+ 1`, the default range would only scan up 1 to 1023 rather than 1024.

### Running the program with input and flags

At this point the arguments are fully functional and can be tested by running the program:

```
python3 pscan.py --start 1 --end 5000 localhost
```
Or simply:

```
python3 pscan.py localhost
```

### Handling hostname errors

To catch some exceptions for a missing or incorrect hostname, I added the following error handling blocks:

```py
if not hostname:
    parser.error("a host argument is required")
 
try:
    resolved_hostname = socket.gethostbyname(hostname)
except socket.gaierror:
    parser.error(f"could not resolve host: {hostname}")
```

The first block raises an exception to the user if they did not provide the host positional argument. The second block tries to resolve the hostname early in the program using: `socket.gethostbyname(hostname)`, and throws an exception if the host doesn't resolve, there would be no point continuing to scan if the host doesn't resolve here.

Now user arguments are fully supported with the port scanner, a user can scan a valid specified host between optionally set valid port number ranges. Nice!

Next we'll look at adding some better user experience and feedback to the port scanner by collecting certain details and printing them to the console.


## The complete port scanner

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
    prog="pscan",
    description="A simple port scanner")


def valid_port(value):
    port = int(value)
    if not (0 <= port <= 65535):
        raise argparse.ArgumentTypeError(f"{value} is not a valid port, valid range is: 0-65535")
    return port


parser.add_argument('host', type=str, nargs='?', help='hostname or IPv4 address')
parser.add_argument('--start', type=valid_port, default=1, help='start of the port range to be scanned')
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

## Improving the user experience

Here is the complete version of the port scanner with some additional polishing touches, adding to the user experience. This mainly involves printing useful information to the terminal, making the program more understandable and transparent.

Let's go through all the new additions from top to bottom.

### Importing the time module

First, please note the new time module I added:

```py
import time
```

This will be used later in the program to print the elapsed time since the scan started.


### User feedback with print additions


We have this new addition that prints before the scan starts:

```py
print(f"Scanning {hostname} ({resolved_hostname}) at ports {args.start}-{args.end}")
```

This prints a formatted string line that gives some information about what host is being scanned, the resolved hostname (IP address), and the port ranges being scanned.

### Collecting port data to display

Next we have a few new variables that collect some data that we can display at the end of the scan as a little scan completed report:

```py
# Outside and before the scan_port() function
ports_open = 0
total_scanned = len(ports)

# Inside the scan_port() function
global ports_open

# Inside the scan_port() function, within the if statement result check
ports_open += 1
```

`ports_open = 0`, this is a new variable that tracks how many ports are open, it is initialised to `0`.
`total_scanned = len(ports)`, this gets the length of the `ports` variable and stores it in a variable called `total_scanned`.
`global ports_open`, this sets the already initalised `ports_open` variable, and makes in accessible globally (inside and outside of the function).
`ports_open += 1`, this increments the variable each time a port is found to be open (because it sits within the conditional 'true' block), this will tally up the amount of ports open throughout the scan.

These variables will be used soon to print the resulting information to the console.

### Collecting time data

Additionally, we have now two time variables:

```py
# This is placed right before the executor starts the function calls with the thread pool. This way a time is set right before the scan begins.
start_time = time.time()

# This is set as a cleanup step after the try: block has completed scanning all ports.
finally:
    end_time = time.time()
```

The first time variable stores a time value right before the scan starts. I also added a `finally:` clause after the `try:` block that runs the `executor` function calls. Within this `finally:` clause, another time is captured once the whole scan has completed, this time in a variable called `end_time`.

### Printing the scan report

And this is where it all comes together:

```py
print("-" * 46)
print("Scan complete.")
print(f"{ports_open} {'ports are' if ports_open > 1 else 'port is'} open. Scanned {total_scanned} ports in total.")
print(f"Finished scan in: {round(end_time-start_time, 2)} seconds.")
```

This is the scan report I mentioned above. The first line prints 46 dashes (as a visual separator from the above scan output). The 2nd line prints 'Scan complete.'. The 3rd line prints how many ports total are open, and this segment: `{'ports are' if ports_open > 1 else 'port is'}`, just changes the grammar based on whether port should be a plural. This line also prints the total number of scanned ports. Finally, the last line prints the amount of time elapsed, by finding the difference between the start and end time — and rounding it to 2 decimal places.

## Example output of the completed scanner

That covers all the additions. Great, the scanner is now complete!

This is an example terminal output you might see if you used the scanner at this point:

```
$ python3 pscan.py lab.takibyte.com
Scanning lab.takibyte.com (185.199.111.153) at ports 1-1024
open port: 80 - http
open port: 443 - https
----------------------------------------------
Scan complete.
2 ports are open. Scanned 1024 ports in total.
Finished scan in: 11.1 seconds.
```

## Final thoughts

To summarise, so far we have: 

1. Created an initial socket connection.
2. Made that connection into a functional single port scanner.
3. Upgraded the scanner to scan multiple ports using a loop.
4. Added error handling.
5. Upgraded the scanner to use multi-threading.
6. Added argparse for user input.
7. Improved the scanner with some output feedback and a scan report.

This was a nice little project to try to better understand how a simple port scanner can work under the hood. It was also a good opportunity to get more familiar with some Python as well. Thank you for reading! I hope you'll join me in the next log entry ✌🏻