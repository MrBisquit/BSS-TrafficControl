# Using the dashboard
(It's called the "Admin Panel" but you can just call it the dashboard for ease)

> You do not actually have to use this dashboard, it's just the default built in one that can show you how to do it.
If you do decide to use this make sure you secure it correctly and secure it's API routes.

Table of contents:
- [Using the dashboard](#using-the-dashboard)
  - [Home](#home)
  - [Statistics](#statistics)
  - [Monitor \& Manage Traffic](#monitor--manage-traffic)
  - [Settings](#settings)
  - [Settings -\> Queue](#settings---queue)
- [Why use this dashboard](#why-use-this-dashboard)
  - [Pros](#pros)
  - [Cons](#cons)
- [Why make your own dashboard](#why-make-your-own-dashboard)
  - [Pros](#pros-1)
  - [Cons](#cons-1)

## Home
Not completed.

## Statistics
Not completed.

This is where all of the statistics are kept, this is not particularly needed but is nice to have anyway.

## Monitor & Manage Traffic
This is considerably the most important tab of all of them, this is where you'll be able to view all of the logs, search through them, find users etc...

It's quite straight forward to use this tab.
Filters, search and the refresh button are all at the top. The table below it shows all of the logs (requests) that the server has received.

This is what these tabs are and mean:
- Request ID - The ID of the request, each request has it's own unique ID.
- User ID - Every visitor to the site will get their unique ID.
- Page URL - Kind of obvious what this one does, it just shows the URL of the request.
- Threat
    - Yes - If the CTL (Calculated Threat Level) is higher than 0.75 or the set value (In [settings](#settings)) it will appear as Yes.
    - '-' - If the CTL is above 0 but does not count as a threat this will be displayed, meaning that it may pose a threat but is unlikely to cause any damage if any at all.
    - No - The CTL is 0 and the request has not been seen a threat in any way, passed through all of the scans successfully and with no issues.

## Settings
This tab is where you can control all of the settings in config.json, do bare in mind however, you will need to reload the Node.JS server every time you make a change unless it's updating a file from this repo (Like the threats filtering list).

To use this, head over to the settings tab in the dashboard then you can do the following:
- Change settings, you'll need to fill some in like the "Site name" and the "Free GEO IP API Key" (Which is needed for detecting VPNs)
    - Block VPNs - This will attempt to block activity that may be related to or be using a VPN.
    - Site name - Your site name to fill in the blanks (Like on error pages and other stuff).
    - Free GEO IP API Key - This is the API that will be used to check localisation for one of the methods of catching VPNs, you can get a free API token and put it here.
    - Protect.JS Check over links - Toggles Protect.JS's ability to scan over the document for links and replaces them with checks protecting the user.
    - Log API Admin Links - Log API Admin Links.
    - Enable server console logging - Enables server logging (e.g. 'Request abc -> /' or 'Request abc -> /assets/')
    - Maximum calculated threat level - If the calculated threat level (CTL) is higher than or equal to this value then it will be counted as a threat.
        - Do note that if the CTL is higher than 0.75 then it will trigger the block anyway.

There will be a setup wizard that you will most likely get when you first start off, this goes through basic settings, getting setup and will even pull down the latest data from the repo.
You can leave it while it sets up everything if you want.

Queues will be a feature that you can edit from the Settings page, this can be found at [Settings -\> Queue](#settings---queue)

## Settings -> Queue
> This can be accessed via Settings -> Queue

Here is where you will be able to set up queueing, this can be set up in a way that it will be triggered when the site experiences a lot of traffic, the way queueing works is: When a user comes along to the website, they will be presented with a queue page, this will progress by it's self and they will be told not to refresh the page as it will destroy their position in queue and move everyone along, they then will be added back on the end of the queue.

The waiting time will be calculated by working out the maximum time (Set in these settings) that someone can be on the site before they are taken back to the queue times the amount of people waiting.
There will be slots, you may set the amount of slots, this can be set to any amount ranging between 1-1000 (May change). When a user manages to get into the 1st in the queue then they will have to wait for a queue slot to appear for them to fill.
Obviously, admins may bypass this by their IP Address/User ID being marked with the tag "no-queue" (Which you will be able to easily do in these settings).

You can set this manually or you can set this queuing system to start when the server recieves a certain amount of requests in a certain period of time.

# Why use this dashboard
Let me explain why you should use this dashboard over making your own.

## Pros
- It's reliable
- It get's updates

## Cons
- Is not customisable
- May not look or match your website

# Why make your own dashboard

## Pros
- You can customise it to whatever you want
- Matches your website
- You may better understand how it works and functions

## Cons
- Does not recieve updates
- May not be as reliable