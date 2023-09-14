module.exports = function check(data) {
    const url = decodeURIComponent(data.request.request.url);

    let threat = false;
    let calculatedThreatLevel = 0;
    let threats = [];

    let urlNoContain = ["SELECT", "USERS", "AT", '"', "'"];
    urlNoContain.forEach(item => {
        if(new RegExp(item, "i").test(url) ||
        url.includes(item) ||
        url.indexOf(item) !== -1) {
            threats.push({ item: item, level: 0.5 });
        }
    });

    threats.forEach(item => {
        calculatedThreatLevel += item.level / 10;
    });

    if(calculatedThreatLevel >= require('../config.json').maxctl ||
    calculatedThreatLevel >= 0.75) {
        threat = true;
    }

    return { threat : threat, ctl : calculatedThreatLevel, threats : threats };
}

/*module.exports = function check(data) {
    const url = decodeURIComponent(data.request.req.url);

    let threat = false;
    let calculatedThreatLevel = 0;
    let threats = [];

    // SQL keywords and common patterns for SQL injection
    const sqlKeywords = ["SELECT", "UPDATE", "DELETE", "INSERT", "DROP", "UNION", "OR 1=1"];
    
    sqlKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(url)) {
            threats.push({ item: keyword, level: 0.5 }); // Assign a higher threat level for SQL keywords
        }
    });

    threats.forEach(item => {
        calculatedThreatLevel += item.level;
    });

    if (calculatedThreatLevel >= require('../config.json').maxctl) {
        threat = true;
    }

    console.log({ threat: threat, ctl: calculatedThreatLevel, threats: threats });

    return { threat: threat, ctl: calculatedThreatLevel, threats: threats };
}*/
