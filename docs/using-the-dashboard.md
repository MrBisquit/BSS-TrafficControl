# Using the dashboard
(It's called the "Admin Panel" but you can just call it the dashboard for ease)

Three tabs:
- [Home](#home)
- [Statistics](#statistics)
- [Monitor & Manage Traffic](#monitor-&-manage-traffic)
- [Settings](#settings)

## Home
Not completed.

## Statistics
Not completed.

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