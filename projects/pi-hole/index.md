---
title: Setting up a DNS sinkhole with Pi-hole
description: This is a short series on how to set up a DNS sinkhole with a Raspberry Pi and Pi-hole.
type: series
status: complete
icon: server
featured: true
order: 3
tags: [Raspberry Pi, DNS, DHCP]
estimatedTotal: 2        # series only — drives the progress bar %
logs:
    - Raspberry Pi OS installation and ssh configuration
    - Setting up a DNS sinkhole with Pi-hole
---

Learning about DNS sinkholes (Pi-hole in particular in this project), gave me an opportunity to not only learn more about content filtering and ad-blocking, but also steered me towards learning about DNS in more depth, including the role of upstream DNS providers / resolvers.

In this series I will walk through how I set up a DNS sinkhole using a Raspberry Pi model 4B, and the Pi-hole software. 

The first part covers: a Raspberry Pi OS installation, and ssh public key set up and configuration. 

The second part details: installing, configuring, and testing Pi-Hole; doing a DHCP reservation; and going through several DNS configuration options.
