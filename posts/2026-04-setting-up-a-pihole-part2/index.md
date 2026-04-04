
# Setting up a Pi-hole part 2

Now that i've set up my raspberry pi with its new OS, it's time to go ahead and actually set up the PiHole.

## Installing Pi-hole on the Pi

Going to <https://pi-hole.net/>, presents us with a very straight forward set of steps to install Pi-hole. Since we've already installed a compatible OS we can head to step 2, install the actual software, found [here](https://github.com/pi-hole/pi-hole/#one-step-automated-install).

Navigating to their github repo installation guide presents us with several options, the simplest of which is using their automated command line installer using a curl command, naturally i'll choose this option and use the following command:

`curl -sSL https://install.pi-hole.net | bash`

The installer begins to run..

![pi installer](posts/2026-04-setting-up-a-pihole-part2/images/installer1.png)

### The Setup

Now the installer will run us through the onboarding setup, it's going to let us select various options for how we want the pi-hole to be configured.


![pi installer](posts/2026-04-setting-up-a-pihole-part2/images/installer2.png)

### Static IP and DHCP Reservation

In this next screen, the installer tells us that we need to set a static IP address for the raspberry pi running pi-hole. This is because the pi-hole will act as a DNS (Domain Name Server) for the router and/or the other hosts on the local network. If the pi's IP address was dynamic (and not static) it will be periodically changing and receiving a new IP address from the DHCP (Dynamic Host Configuration Protocol) server. Whenever the other hosts on the network go to make a DNS request via the pi-hole, it's address would likely have changed, and therefore, the pi would not be able to respond to the host making the request.
<br>

To circumvent this we'll do a DHCP reservation, with this we can tell the DHCP server to always give the raspberry pi the same static IP address when it comes time for it to renew all of the IP address leases for the hosts on the network.



![pi installer](posts/2026-04-setting-up-a-pihole-part2/images/installer3.png)


### Reserving an IP address on the DHCP server

For my devices connected on my local network, the DHCP server is my router, this should be the case for most home setups unless one has already set up a separate DHCP server intentionally. Since some standard ISP provided routers apparently don't provide the ability to do DHCP reservations, pi-hole has the ability to also work as a DHCP server using dnsmasq under the hood if needed, more details on that can be found [here](https://docs.pi-hole.net/ftldns/).

My router is from GL.inet, so my setup looks like this, but it should be similar for most routers. For my setup i just had to login to the admin panel at its IP address, go to the LAN section, go down to the address reservation section, and add a new reservation entry. To set the raspberry pi's IP as static, we need to provide its MAC (Medium Access Control) address to identify the hardware, and set an IP address that it will keep. The pi's MAC address can be found on the routers client list. 

The IP address should be set within the range of the subnet, my subnet mask is set to `255.255.255.0` and therefore and a `/24` network. The usable range would be from `x.x.x.1` to `x.x.x.254`, as `x.x.x.0` and `x.x.x.255` are already reserved for the network and broadcast addresses respectively. My router is already set to `x.x.x.1` (or `192.168.8.1`), so i'll leave that alone. We can also observe that the DHCP server on my router has an IP address start and end range (or pool), which it can hand out address leases from.

<br>


![router config](posts/2026-04-setting-up-a-pihole-part2/images/config1.png)


I decided to set my address reservation to `192.168.8.100`, which is within the range of the pool (`192.168.8.100 - 192.168.8.249`). Whether one should set their address reservations inside or outside of this DHCP pool was debated online, it seemed to depend on the DHCP server and the network architecture generally. As far as i understand at the moment, it doesn't seem to matter for my situation, as long as it's in the right subnet and not already taken. The pi needs to be rebooted in order to get the new static address.

<br>


![router config](posts/2026-04-setting-up-a-pihole-part2/images/config2.png)

After rebooting, we can see here back on the client list that the raspberry pi has received its brand new static/reserved IP address of `192.168.8.100`.

![router config](posts/2026-04-setting-up-a-pihole-part2/images/config3.png)

### Network Interface

Back to the installer now, it asks us to select a network interface. I selected eth0 (the ethernet connection), as it's already connected and will be reliably available, and fast.

![pi installer](posts/2026-04-setting-up-a-pihole-part2/images/installer4.png)

### Upstream DNS Provider

Here we are offered several choices for which Upstream DNS provider we would like to use. For this i had to learn a bit about upstream DNS servers because i didn't know much about them at the time, more info can be found in pi-holes documentation [here](https://docs.pi-hole.net/guides/dns/upstream-dns-providers/?h=upstream). I decided to go with Cloudflare's 1.1.1.1 DNS as my upstream DNS provider, because it is said to be fast and good for privacy. 

Briefly, this is my understanding as to what upstream DNS providers are for. Ordinarily as a *client* computer, when connecting to a website *hosted* on a web server on the internet - we as humans who recognise words much better than numbers - would use a web address consisting of a domain name, and other aspects of the address (***example***.com). 

A DNS is used to resolve a domain name with its corresponding public IP address, eg. example.com becomes `x.x.x.x`. An upstream DNS is required, because they are large providers which have access to all of the records linking the domain names to their respective IP addresses. My router by default has its DNS server set to automatic, which is just deferring to whichever upstream DNS provider is set by the upstream network: most likely the ISP (internet service provider), or a VPN if one is enabled.

The pi-hole acts as an *intermediary DNS*. When a client connecting through it makes a request to a website (web server host), the pi-hole DNS first filters the domain name request against a block list, whatever is blocked returns null. The filtered request then passes on to the upstream DNS which has been configured, (cloudflare 1.1.1.1, or google 8.8.8.8 for example). The upstream DNS resolves the domain name with its corresponding IP address, sending the response back to the pi-hole. The pi-hole then finally provides the response back to the original client. The original client computer now has the web server's actual IP address (or not if it was blocked). The client can now initiate the TCP connection with the web server.



![pi installer](posts/2026-04-setting-up-a-pihole-part2/images/installer5.png)

### Blocklists

The set up now asks if we want to include the default blocklist, i just went with yes, as the default list is apparently good and well maintained, there are plenty of other blocklists that appear to be good and recommended online too. As the set up says you can add and remove lists easily later. 


![pi installer](posts/2026-04-setting-up-a-pihole-part2/images/installer6.png)

### Query Logging

Query logging allows you to well.. *log* the domain queries made by all clients filtering through the pi-hole when using it as an intermediary DNS. This enables you to view all of the domains queries passing though the pi-hole, and therefore see what websites all of the connected clients are trying to connect to. I enabled this setting because it will allow me to more easily see how pi-hole is working and so i can confirm it is working while i learn and experiment with it.

![pi installer](posts/2026-04-setting-up-a-pihole-part2/images/installer7.png)

### Privacy mode

This is related to the query logging, it allows you to manage the degree to which you can see what sites are being visited by the connected clients. This is a good feature if you were using pi-hole and query logging on a family/shared router, so you can respect the privacy of people on your network. Since i'm not using this on a shared router (my pi is connected through a secondary router), and because i am mainly installing this for experimental purposes, i have gone with option 0 - show everything.

![pi installer](posts/2026-04-setting-up-a-pihole-part2/images/installer8.png)



![pi installer](posts/2026-04-setting-up-a-pihole-part2/images/installer9.png)

![pi installer](posts/2026-04-setting-up-a-pihole-part2/images/installer10.png)

![pihole web](posts/2026-04-setting-up-a-pihole-part2/images/pihole1.png)

![router config](posts/2026-04-setting-up-a-pihole-part2/images/config4.png)

![pihole web](posts/2026-04-setting-up-a-pihole-part2/images/pihole2.png)

![pihole web](posts/2026-04-setting-up-a-pihole-part2/images/pihole3.png)

![router config](posts/2026-04-setting-up-a-pihole-part2/images/config5.png)

![pihole web](posts/2026-04-setting-up-a-pihole-part2/images/pihole4.png)

![router config](posts/2026-04-setting-up-a-pihole-part2/images/config6.png)