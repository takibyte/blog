
# Setting up a Pi-hole

In this small article i will walk through how i set up a Raspberry Pi (specifically a raspberry pi 4), and then how to install and set up a the Pi-hole software for DNS filtering and ad-blocking capabilites.

Why do this? It's just an excuse to practice some basic networking on my home network, and to get more familiar with a bit of network administration. Oh, and also an excuse to play around with the pi and some linux.

So the basic steps so far are:

1. Setup the raspberry pi with a basic clean install of Linux, I'll go with Raspbery Pi OS Lite.

2. Install Pi-hole, and any other necessary software using a ssh connection and the bash terminal.

3. Configure the Pi-hole and learn how to use it to suite my situation.

## Setting up the Pi

Setting up the pi was really easy. The best and easiest way to set it up is to go to https://www.raspberrypi.com/software/, get the raspberry pi imager software, installing it, and using it to create an image of the OS of your choice on the micro sd card - which will then be slotted into the Pi's card reader.

***Choose your pi hardware***

![pi imager](content/images/pi-imager1.png)

Next, i had to choose an operating system. It seems that with the pi you can use many linux distributions, as long as they are ARM based. Apparently, the contraints of the pi's compute power should also be taken into consideration when choosing an OS. 

I decided to go with the Rapsberry Pi OS Lite (64-bit) version, because it's recommended, lightweight, and headless (i want to get better with the CLI), and it's debian based (same as Kali and Ubuntu etc).

***Choose the OS***

![pi imager](content/images/pi-imager2.png)







