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
var asset_urls = {};

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
    const data = {
        visit : {
            datetime : moment().toDate(),
            location : req.url,
            reason : "",
            ip : req.ip,
            type : 3,
            banned_until : moment().add(30, "s").toDate(),
            blocked : false,
            checking : false
        }
    }
    var request_id = crypto.randomBytes(16).toString("hex");
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

        const fetchAnalytics = () => {

        }

        const goStatistics = () => { location = "/admin/?p=/statistics/"; }

        const goMonitorManageTraffic = () => { location = "/admin/?p=/traffic/"; }

        const fA = fetchAnalytics;
        const gS = goStatistics;
        const gMMT = goMonitorManageTraffic;

        l("Info", "Index page ready...");
    `;

    let statisticsPage = `
        // Statistics page

        d.title = "BSS-TrafficControl - Admin";
        l("Info", "Updated title...");

        const fetchAnalytics = () => {

        }

        const goHome = () => { location = "/admin/?p=/"; }

        const goMonitorManageTraffic = () => { location = "/admin/?p=/traffic/"; }

        const fA = fetchAnalytics;
        const gH = goHome;
        const gMMT = goMonitorManageTraffic;

        l("Info", "Statistics page ready...");
    `;

    let trafficPage = `
        // Traffic (Monitor & Manage Traffic) page

        d.title = "BSS-TrafficControl - Admin";
        l("Info", "Updated title...");

        let data = {
            "123" : {
                id : "123",
                userID : "123",
                url : "/",
                threat: false
            },
            "456" : {
                id : "456",
                userID : "456",
                url : "/?sql=SELECT * FROM Users",
                threat : true
            }
        }

        let defaultTable;

        let shownData = Object.values(data);

        const fetchAnalytics = () => {

        }

        const viewLog = (id) => {
            alert("Viewing log id " + id);
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

        const clearFilters = () => {
            gEBI("search").value = "";
            shownData = Object.values(data);
            showTable();
        }

        const showTable = () => {
            const values = gEBI("values");
            values.innerHTML = defaultTable;
            for(var i = 0; i < shownData.length; i++) {
                let tr = document.createElement("tr");
                tr.id = shownData[i].id;
                tr.onclick = (e) => {
                    console.log(e);
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
                T.innerHTML = shownData[i].threat ? "Yes" : "No";
                T.style.backgroundColor = shownData[i].threat ? "red" : "green";
                T.id = shownData[i].id;
                tr.appendChild(T);

                values.appendChild(tr);
            }
        }

        const goHome = () => { location = "/admin/?p=/"; }

        const goStatistics = () => { location = "/admin/?p=/statistics/"; }

        const fA = fetchAnalytics;
        const gH = goHome;
        const gS = goStatistics;

        setTimeout(showTable, 2);
        setTimeout(() => { defaultTable = gEBI("values").innerHTML }, 0);
        l("Success", "Shown page");

        l("Info", "Statistics page ready...");
    `;

    let page = "";
    if(options.page == "/") {
        page = indexPage;
    } else if(options.page == "/statistics/") {
        page = statisticsPage;
    } else if(options.page == "/traffic/") {
        page = trafficPage;
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

        l("Info", "Loading...");

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