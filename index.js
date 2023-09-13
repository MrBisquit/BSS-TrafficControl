const express = require("express");
const app = express();
const fs = require("fs");
const ejs = require("ejs");
const expressLayouts = require("express-ejs-layouts");
const crypto = require("crypto");
const moment = require("moment");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const platform = require('platform');

app.use(cookieParser());

app.set('views', './pages');
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({limit: '10mb'}));
//app.use(express.static(__dirname + '/public', {})); <-- no more static :), time for asset URLs.

app.use(expressLayouts);
app.set('layout', 'layouts/layout');

var temp_log = [];
var temp_users = {};
var asset_urls = {};

let quick_stats = {
    online : 0,
    requests : 0,
    threats : 0
}

var default_assets = {
    //protect : ""//__dirname + "/public/protect.js"
}

function generateAssetURL(asset_link, info) {
    var id = crypto.randomBytes(64).toString("hex");
    asset_urls["/assets/" + id] = {
        asset_link : asset_link,
        info : info,
        used : false,
        created : moment()
    }
    return "/assets/" + id;
}

function makeUpAssets(assets) {
    var new_assets = {
        protect : generateAssetURL(generateProtect())
    };
    var assets_keys = Object.keys(assets);
    var assets_values = Object.values(assets);
    for (let i = 0; i < assets_keys.length; i++) {
        new_assets[assets_keys[i]] = generateAssetURL(assets_values[i]);
    }
    return new_assets;
}

app.use((req, res, next) => {
    quick_stats.requests += 1;

    const request_id = crypto.randomBytes(16).toString("hex");
    let user = null;
    if(!checkExists(req.cookies.user) || !checkExists(temp_users[req.cookies.user])) {
        let u = Object.values(temp_users);
        for (let i = 0; i < u.length; i++) {
            if(u[i].ip == req.ip) {
                res.cookie("user", u[i].id);
                user = u[i];
            }
        }
    } else {
        user = temp_users[req.cookies.user];
    }

    let needsChecking = false;

    if(user == null) {
        user = {
            id : crypto.randomBytes(16).toString("hex"),
            ip : req.ip,
            threatLevel : 0,
            threat : false,
            blocked : {
                blocked : false,
                blockedUntil : null,
                reason : null
            },
            requests : [],
            heartbeat : {
                lastHeartbeat : null
            }
        }
        temp_users[user.id] = user;

        needsChecking = true;
    }

    if(req.query.heartbeat != undefined) {
        user.heartbeat.lastHeartbeat = moment();
    }

    //user.heartbeat.lastHeartbeat = moment();

    let data = {
        visit : {
            datetime : moment().toDate(),
            location : req.url,
            reason : "",
            ip : req.ip,
            type : 3,
            banned_until : moment().add(30, "s").toDate(),
            blocked : false,
            checking : false
        },
        table_data : {
            id : request_id,
            userID : user.id,
            url : req.url,
            threat : false
        },
        request : {
            body : req.body,
            protocol : req.protocol,
            method : req.method
        }
    }

    if(needsChecking) {
        data.visit.checking = true;
    }

    if(!req.url.startsWith("/api/admin/")) {
        user.requests.push(request_id);
        temp_log.push(data);
    }

    res.header("request-id", request_id);
    if(req.url.startsWith("/assets/")) {
        console.log(`Request ${request_id} -> ${data.visit.location} -> ${asset_urls[req.url].asset_link}`);
    } else {
        console.log(`Request ${request_id} -> ${data.visit.location}`);
    }

    req.security = data;

    if(checkExists(asset_urls[req.url])) {
        if(!asset_urls[req.url].used) {
            res.status(201).sendFile(asset_urls[req.url].asset_link);
            asset_urls[req.url].used = true;
            //delete asset_urls[req.url];
            return;
        } else {
            return res.sendStatus(403);
        }
    } else if(req.url.startsWith("/assets/")) {
        return res.sendStatus(403);
    }

    if(data.visit.blocked) {
        var assets = {
            ... default_assets,
            css : __dirname + "/public/blocked.css",
            blocked_timeout : __dirname + "/public/blocked_countdown.js"
        };
        return res.status(403).render("blocked.ejs", { data : data, assets : makeUpAssets(assets) });
    } else if(data.visit.checking) {
        var assets = {
            ... default_assets,
            css : __dirname + "/public/checking.css"
        };
        return res.status(202).render("checking.ejs", { data : data, assets : makeUpAssets(assets) });
    }
    setTimeout(() => {
        next();
    }, 5);
});

app.get("/", (req, res) => {
    var assets = {
        ... default_assets
    };
    res.render("index.ejs", { assets : makeUpAssets(assets) });
});

app.get("/api/admin/logs/", (req, res) => {
    return res.jsonp(temp_log);
});

app.get("/api/admin/logs/:id/", (req, res) => {
    for (let i = 0; i < temp_log.length; i++) {
        if(temp_log[i].table_data.id == req.params.id) {
            return res.jsonp(temp_log[i]);
            //return res.jsonp(temp_log[i].table_data);
        }
    }

    return res.jsonp({err : "LOG_NOT_FOUND"});
});

app.get("/api/admin/users/", (req, res) => {
    return res.jsonp(temp_users);
});

app.get("/api/admin/users/:id/", (req, res) => {
    return res.jsonp(checkExists(temp_users[req.params.id]) ? temp_users[req.params.id] : {});
});

app.get("/api/admin/config/", (req, res) => {
    return res.jsonp(JSON.parse(fs.readFileSync(__dirname + "/config.json")));
});

app.post("/api/admin/config/", (req, res) => {
    let config = JSON.parse(fs.readFileSync(__dirname + "/config.json"));
    console.log(req.body);
    config = JSON.parse(req.body);
    fs.writeFileSync(__dirname + "/config.json", JSON.stringify(config));

    return res.jsonp({ success : true });
});

app.get("/api/admin/basic-stats/", (req, res) => {
    return res.jsonp(quick_stats);
});

app.get("/admin/", (req, res) => {
    var assets = {
        ... default_assets,
        css : __dirname + "/public/admin.css",
        admin : generateAdminJS({ page : checkExists(req.query.p) ? req.query.p : "/" })
    };

    var new_assets = makeUpAssets(assets);

    res.render("admin/index.ejs", { assets : new_assets, page : checkExists(req.query.p) ? req.query.p : "/" });
});

app.listen(80);

function checkExists(value) {
    return value != null && value != undefined && value != "" ? true : false;
}

function generateAdminJS(options) {
    const id = crypto.randomBytes(16).toString("hex");

    var UglifyJS = require("uglify-js");
    var UglifyJSOptions = {
        compress : {
            unsafe : true,
            hoist_funs : true
        },
        mangle : {
            // toplevel : true // Cannot be used because we need function names.
        },
        output : {
            beautify : false,
            preamble: `/* Generated code - ${id}.js */`
        }
    }
    /*setTimeout(() => {
        try {
            fs.rmSync(__dirname + "/public/generated/" + id + ".js");
        } catch {}
    }, 2500);*/

    let indexPage = `
        // Index page

        d.title = "BSS-TrafficControl - Admin";
        l("Info", "Updated title...");

        const fetchAnalytics = async () => {
            let online = gEBI("stat_online");
            let requests = gEBI("stat_requests");
            let threats = gEBI("stat_threats");

            let loader = gEBI("loader");

            try {
                //loader.style.display = "block";

                let response = await fetch("/api/admin/basic-stats/");
                let json = await response.json();

                if(!response.ok) {
                    return console.error("RESPONSE_NOT_OK");
                }

                console.log(json);

                online.innerHTML = json.online;
                requests.innerHTML = json.requests;
                threats.innerHTML = json.threats;

                loader.style.display = "none";
            } catch (error) {

            }
        }

        /*const goStatistics = () => { setNavigating(); location = "/admin/?p=/statistics/"; }

        const goMonitorManageTraffic = () => { setNavigating(); location = "/admin/?p=/traffic/"; }

        const fA = fetchAnalytics;
        const gS = goStatistics;
        const gMMT = goMonitorManageTraffic;*/

        setTimeout(() => { fetchAnalytics(); }, 5);
        setInterval(() => { fetchAnalytics(); }, 5000);

        l("Info", "Index page ready...");
    `;

    let statisticsPage = `
        // Statistics page

        d.title = "BSS-TrafficControl - Admin";
        l("Info", "Updated title...");

        const fetchAnalytics = () => {

        }

        /*const goHome = () => { setNavigating(); location = "/admin/?p=/"; }

        const goMonitorManageTraffic = () => { setNavigating(); location = "/admin/?p=/traffic/"; }

        const fA = fetchAnalytics;
        const gH = goHome;
        const gMMT = goMonitorManageTraffic;*/

        l("Info", "Statistics page ready...");
    `;

    let trafficPage = `
        // Traffic (Monitor & Manage Traffic) page

        d.title = "BSS-TrafficControl - Admin";
        l("Info", "Updated title...");

        let data = {
            /*"123" : {
                id : "123",
                userID : "123",
                url : "/",
                threat: false,
                blocked: false
            },
            "456" : {
                id : "456",
                userID : "456",
                url : "/?sql=SELECT * FROM Users",
                threat : true,
                blocked : true
            },
            "789" : {
                id : "789",
                userID : "456",
                url : "/",
                threat : false,
                blocked : true
            },
            "101112" : {
                id : "101112",
                userID : "123",
                url : "/",
                threat : null,
                blocked : false
            }*/
        }

        let defaultTable;

        let shownData = Object.values(data);

        const fetchAnalytics = () => {

        }

        let selectedLog = {};
        let online = true;

        const openPopup = () => {
            let popup = gEBI("popup");
            popup.style.display = "block";
        }

        const openUserPopup = () => {
            let popup = gEBI("popup");
            popup.style.display = "none";

            let userPopup = gEBI("user_popup");
            userPopup.style.display = "block";
        }

        const popupVU = async () => {
            gEBI("laup").style.display = "block";
            gEBI("bottom_user_popup_name").innerHTML = "User ID - " + selectedLog.userID;
            gEBI("bottom_user_popup_content").innerHTML = "";
            openUserPopup();

            try {
                let response = await fetch("/api/admin/users/" + selectedLog.userID);
                let json = await response.json();

                gEBI("laup").style.display = "none";
                let blocked = "";
                if(json.blocked.blocked) {
                    blocked = "<span style='color: red;'>User is blocked</span><br>" +
                    "They will be unblocked at " + json.blocked.blockedUntil + "<br>" +
                    "Reason they are blocked: " + json.blocked.reason;
                } else {
                    blocked = "<span style='color: green;'>User is not blocked</span>";
                }
                let threat = "";
                if(json.threat) {
                    threat = "<span style='color: red;'>Threat</span><br>" + "Threat level: " + json.threatLevel;
                }
                gEBI("bottom_user_popup_content").innerHTML = blocked + "<br>" +
                "Last heartbeat at " + json.heartbeat.lastHeartbeat + "<br>" +
                "IP Address: " + json.ip + "<br>" + threat;
                console.log(json);
            } catch(error) {

            } 
        }

        const viewLog = async (id) => {
            const currentData = data[id];
            selectedLog = currentData;
            gEBI("lap").style.display = "block";
            gEBI("bottom_popup_name").innerHTML = "Log ID - " + currentData.id;
            gEBI("bottom_popup_content").innerHTML = "";
            openPopup();

            try {
                let response = await fetch("/api/admin/logs/" + id);
                let json = await response.json();

                let blocked = "";
                if(json.visit.blocked) {
                    blocked = "<br><span style='color: red;'>The request was blocked</span>" +
                    "<br>Reason: " + json.visit.reason;
                } else {
                    blocked = "<br><span style='color: green;'>The request went through</span>";
                }
                gEBI("lap").style.display = "none";
                gEBI("bottom_popup_content").innerHTML = "Log ID - " + currentData.id +
                "<br>User ID - " + currentData.userID +
                "<br>Page URL - " + currentData.url +
                blocked +
                "<br>Method: " + json.request.method +
                "<br>Protocol: " + json.request.protocol +
                "<br>Body of request: " + JSON.stringify(json.request.body);

                console.log(json);
            } catch(error) {

            }
        }

        const searchUpdated = (value) => {
            shownData = [];
            let theData = Object.values(data);

            for(var i = 0; i < theData.length; i++) {
                if(contains(theData[i].id, value) ||
                 contains(theData[i].userID, value) ||
                 contains(theData[i].url, value)) {
                    shownData.push(theData[i]);
                }
            }

            if(!checkExists(value)) {
                shownData = theData;
            }

            showTable();
        }

        const filterThreats = () => {
            shownData = [];
            let theData = Object.values(data);

            for(var i = 0; i < theData.length; i++) {
                if(theData[i].threat) {
                    shownData.push(theData[i]);
                }
            }

            showTable();
        }

        const filterBlocked = () => {
            shownData = [];
            let theData = Object.values(data);

            for(var i = 0; i < theData.length; i++) {
                if(theData[i].blocked) {
                    shownData.push(theData[i]);
                }
            }

            showTable();
        }

        const clearFilters = () => {
            let filters = gEBI("filters");
            filters.value = "None";
            gEBI("search").value = "";
            shownData = Object.values(data);
            showTable();
        }

        const showTable = () => {
            if(defaultTable == undefined) {
                //l.reload();
                return;
            }
            const values = gEBI("values");
            values.innerHTML = defaultTable;
            for(var i = 0; i < shownData.length; i++) {
                let tr = document.createElement("tr");
                tr.id = shownData[i].id;
                tr.onclick = (e) => {
                    viewLog(e.srcElement.id);
                }

                let RID = document.createElement("td");
                RID.innerHTML = shownData[i].id;
                RID.id = shownData[i].id;
                tr.appendChild(RID);

                let UID = document.createElement("td");
                UID.innerHTML = shownData[i].userID;
                UID.id = shownData[i].id;
                tr.appendChild(UID);

                let URL = document.createElement("td");
                URL.innerHTML = shownData[i].url;
                URL.id = shownData[i].id;
                tr.appendChild(URL);

                let T = document.createElement("td");
                if(shownData[i].threat == null) {
                    T.style.color = "orange";
                    // Changed backgroundColor to color.
                    T.innerHTML = "-";
                } else {
                    T.style.color = shownData[i].threat ? "red" : "green";
                    // Changed backgroundColor to color.
                    T.innerHTML = shownData[i].threat ? "Yes" : "No";
                }
                T.id = shownData[i].id;
                tr.appendChild(T);

                let B = document.createElement("td");
                B.innerHTML = shownData[i].blocked ? "Yes" : "No";
                B.style.color = shownData[i].blocked ? "red" : "green";
                // Changed backgroundColor to color.
                B.id = shownData[i].id;
                tr.appendChild(B);

                values.appendChild(tr);
            }
        }

        const fetchAndRefresh = async () => {
            let lat = gEBI("lat");
            //lat.style.display = "block";

            if(!online) return;

            try {
                let response = await fetch("/api/admin/logs/");
                if(!response.ok) {
                    //return fetchAndRefresh();
                }
                let json = await response.json();
                //console.log(json);
                
                data = {};
                for(var i = 0; i < json.length; i++) {
                    data[json[i].table_data.id] = json[i].table_data;
                }

                updateFilters();
                showTable();
                
                let lat = gEBI("lat");
                lat.style.display = "none";
            } catch(error) {
                console.log(error);
                //return fetchAndRefresh();
            }
        }

        const updateFilters = () => {
            let value = filters.value;
            if(value == "None") {
                searchUpdated(gEBI("search").value);
            } else if(value == "OST") {
                filterThreats();
            } else if(value == "OSB") {
                filterBlocked();
            }
        }

        const refresh = () => {
            let lat = gEBI("lat");
            lat.style.display = "block";
            
            fetchAndRefresh();
        }

        /*const goHome = () => { setNavigating(); location = "/admin/?p=/"; }

        const goStatistics = () => { setNavigating(); location = "/admin/?p=/statistics/"; }

        const fA = fetchAnalytics;
        const gH = goHome;
        const gS = goStatistics;*/

        window.addEventListener('online', () => {
            online = true;
            gEBI("offline_popup").style.display = "none";
        });
        window.addEventListener('offline', () => {
            online = false;
            gEBI("offline_popup").style.display = "block";
        });

        setInterval(() => { /* clearFilters(); */ fetchAndRefresh(); }, 5000);
        setTimeout(() => {
            fetchAndRefresh();
            clearFilters();
        }, 5);

        setTimeout(() => {
            let popup = gEBI("popup");
            let userPopup = gEBI("user_popup");
            window.onclick = function(event) {
                if (event.target == popup) {
                  popup.style.display = "none";
                } else if(event.target == userPopup) {
                    userPopup.style.display = "none";
                    popup.style.display = "block";
                }
              }
        }, 5);
        setTimeout(() => {
            let filters = gEBI("filters");
            filters.addEventListener("change", () => {
                updateFilters();
            });
        }, 5);
        setTimeout(showTable, 2);
        setTimeout(() => { defaultTable = gEBI("values").innerHTML }, 5);
        l("Success", "Shown page");

        l("Info", "Traffic page ready...");
    `;

    let settingsPage = `
        let settingsData = {};

        const loadSettings = async () => {
            gEBI("loader").style.display = "block";

            try {
                let response = await fetch("/api/admin/config/");
                let json = await response.json();

                if(!response.ok) {
                    return settings.innerHTML = "Failed to load settings! Error: RESPONSE_NOT_OK";
                }

                settingsData = json;

                showSettings();

                gEBI("loader").style.display = "none";
            } catch(error) {
                console.error(error);
            }
        }

        const showSettings = () => {
            let settings = gEBI("settings");
            settings.innerHTML = "";


            let keys = Object.keys(settingsData);
            for(var i = 0; i < keys.length; i++) {
                let setting = settingsData[keys[i]];

                let div = document.createElement("div");
                div.style.padding = "0.5rem";
                div.id = keys[i];
                
                let label = document.createElement("label");
                label.innerHTML = setting.name + "&nbsp;&nbsp;";
                label.id = keys[i];
                div.appendChild(label);

                if(setting.type == "boolean") {
                    let checkbox = document.createElement("input");
                    checkbox.type = "checkbox";

                    if(setting.value == true) {
                        checkbox.checked = true;
                    }

                    checkbox.id = keys[i];

                    checkbox.onclick = (e) => {
                        settingsData[e.srcElement.id].value = checkbox.checked;
                    }

                    div.appendChild(checkbox);
                } else if(setting.type == "string") {
                    let input = document.createElement("input");
                    input.placeholder = setting.placeholder;
                    input.value = setting.value;
                    input.style.width = "100%";

                    input.id = keys[i];

                    input.oninput = (e) => {
                        settingsData[e.srcElement.id].value = input.value;
                    }

                    div.appendChild(input);
                } else if(setting.type == "number") {
                    let input = document.createElement("input");
                    input.type = "number";
                    input.placeholder = setting.placeholder;
                    input.value = setting.value;
                    input.style.width = "100%";

                    input.id = keys[i];

                    input.oninput = (e) => {
                        settingsData[e.srcElement.id].value = input.value;
                    }

                    div.appendChild(input);
                } else if(setting.type == "password") {
                    let input = document.createElement("input");
                    input.type = "password";
                    input.placeholder = setting.placeholder;
                    input.value = setting.value;
                    input.style.width = "100%";

                    input.id = keys[i];

                    input.oninput = (e) => {
                        settingsData[e.srcElement.id].value = input.value;
                    }

                    div.appendChild(input);
                }

                let description = document.createElement("p");
                let desc = checkExists(setting.description) ? setting.description : "No description set.";
                description.innerHTML = "<i>" + desc + "</i>";
                description.id = keys[i];
                description.classList.add("gray_desc");
                div.appendChild(description);

                settings.appendChild(div);

                if(i != keys.length - 1) {
                    settings.appendChild(document.createElement("hr"));
                }
            }
        }

        const saveChanges = async () => {
            try {
                let response = await fetch("/api/admin/config/", { method : 'POST', body : JSON.stringify(settingsData) });
            } catch {}
        }

        const resetDefaultSettings = () => {
            let keys = Object.keys(settingsData);
            for(var i = 0; i < keys.length; i++) {
                let setting = settingsData[keys[i]];
                setting.value = setting.defaultValue;
            }

            showSettings();
        }

        setTimeout(() => { loadSettings(); }, 5);
    `;

    let page = "";
    if(options.page == "/") {
        page = indexPage;
    } else if(options.page == "/statistics/") {
        page = statisticsPage;
    } else if(options.page == "/traffic/") {
        page = trafficPage;
    } else if(options.page == "/settings/") {
        page = settingsPage;
    }

    let code = `
        // Generated code - ${id}.js
        const config = ${JSON.stringify(options)};
        let w = window;
        let d = document;
        let c = console;

        const getMoment = () => { return new Date(); }
        const gM = getMoment;

        const log = (status, message) => {
            var date = gM();
            c.log("[" + status + "] (" + date + ") " + message);
        }
        const l = log;

        const gEBI = (id) => { return document.getElementById(id); }
        const contains = (what, contains) => {
            return what.includes(contains);
            //return what.indexOf(contains) >= 0 ? true : false;
        }

        const goHome = () => { setNavigating(); location = "/admin/?p=/"; };
        const goStatistics = () => { setNavigating(); location = "/admin/?p=/statistics/"; };
        const goMonitorManageTraffic = () => { setNavigating(); location = "/admin/?p=/traffic/"; };
        const goSettings = () => { setNavigating(); location = "/admin/?p=/settings/"; };

        const gH = () => { goHome(); };
        const gS = () => { goStatistics(); };
        const gMMT = () => { goMonitorManageTraffic(); };
        const gSs = () => { goSettings(); };

        l("Info", "Loading...");

        const setNavigating = () => {
            localStorage.setItem("an", true);
        }

        setTimeout(() => {
            if(checkExists(localStorage.getItem("an"))) {
                localStorage.removeItem("an");
                gEBI("content").style.display = "block";
            } else {
                gEBI("loading").style.display = "block";
                let loadI = setInterval(() => {
                    if(document.readyState == "complete") {
                        gEBI("loading").style.display = "none";
                        gEBI("content").style.display = "block";
                        clearInterval(loadI);
                    }
                }, 500);
            }
        }, 5);

        ${page}

        l("Info", "${id}.js ready.");

        // End
    `;

    var result = UglifyJS.minify(code, UglifyJSOptions);

    if(fs.existsSync(__dirname + '/public/generated')) {
        fs.writeFileSync(__dirname + "/public/generated/" + id + ".js", result.code);
    } else {
        fs.mkdirSync(__dirname + "/public/generated");
        fs.writeFileSync(__dirname + "/public/generated/" + id + ".js", result.code);
    }

    return __dirname + "/public/generated/" + id + ".js";
}

function generateProtect() {
    const id = crypto.randomBytes(16).toString("hex");

    var UglifyJS = require("uglify-js");
    var UglifyJSOptions = {
        compress : {
            unsafe : true,
            hoist_funs : true
        },
        mangle : {
            // toplevel : true // Cannot be used because we need function names.
        },
        output : {
            beautify : false,
            preamble: `/* Generated code - ${id}.js */`
        }
    }

    var API_KEY = 'NO_API_KEY_PRESENT';

    var code = `
        try {
            let w = window;
            let d = document;
            let c = console;
        } catch {}
        
        const checkExists = (value) => {
            return value != null && value != undefined && value != "" ? true : false;
        }

        const errorCodes = {
            0 : "NO_ERROR",
            1 : "INVALID_TOKEN",
            2 : "UNAUTHORISED",
            3 : "RESPONSE_NOT_OK",
            4 : "INVALID_UNRECOGNISED_OR_MISSING_ERROR"
        }

        const regexPatterns = {
            url : new RegExp("/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/")
        }

        class link {
            constructor(url) {
                if(regexPatterns.url.test(url)) {
                    this.url = url;
                } else {
                    console.error("URL did not match regex!");
                    return;
                }
            }

            url = null;
            isGood = null;

            check() {
                return true;
                return false;
            }
        }

        document.protect = {
            getAsset : {
                fromID = async (assetID) => {
                    try {
                        const response = await fetch('/api/fetchAsset/?id=' + assetID, {
                            method : "POST",
                            body : JSON.stringify({
                                API_KEY : "${API_KEY}"
                            })
                        })
                        if(!response.ok) {
                            c.error(errorCodes[3]);
                        }
                        const json = await response.json();
                        if(checkExists(json.error) && json.error != 0) {
                            c.error(checkExists(errorCodes[json.error]) ? errorCodes[json.error] : errorCodes[4]);
                        }
                        return json;
                    } catch {
                        c.error(errorCodes[3]);
                    }
                },
            },
            checkConnection = async () => {
                try {
                    const response = await fetch('/api/');
                    if(!response.ok) {
                        return false;
                    }
                } catch {
                    return false;
                }
            },
            links : {
                checkLink = async (url) => {
                    const checkedLink = await new link(url).check();
                }
            }
        }
    `;

    var result = UglifyJS.minify(code, UglifyJSOptions);

    if(fs.existsSync(__dirname + '/public/generated')) {
        fs.writeFileSync(__dirname + "/public/generated/" + id + ".js", result.code);
    } else {
        fs.mkdirSync(__dirname + "/public/generated");
        fs.writeFileSync(__dirname + "/public/generated/" + id + ".js", result.code);
    }

    return __dirname + "/public/generated/" + id + ".js";
}

setInterval(() => {
    if(!fs.existsSync(__dirname + '/public/generated')) return;
    fs.rmSync(__dirname + "/public/generated", { recursive : true, force : true });
}, 25000);