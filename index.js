const express = require('express');
const axios = require('axios');
var bodyParser = require('body-parser');
const uuid = require('uuid/v4');

const app = express();
app.use(bodyParser.json());

app.get('/test', function (req, res) {
    res.send('Hello World');
});

const contactCache = {};

app.post('/', async function (req, res) {

    let cignalsAppId = req.query.cignalsAppId;
    let cignalsAccessKey = req.query.cignalsAccessKey;

    let limeMessage = req.body;
    if (limeMessage.category != undefined) {
        //get
        let identity = limeMessage["identity"];
        console.log(limeMessage);
        let contact = {
            name: limeMessage.extras["name"] || identity,
            email: limeMessage.extras["email"] || "noemail@noemail.com",
            phone: limeMessage.extras["phone"] || "",
        }

        contactCache[identity] = contact;
        return;
    }

    try {
        await axios.post("https://api.cignals.ai/api/v1/" + cignalsAppId + "/message",
            await getCignalsMessageFromLimeMessage(limeMessage),
            {
                headers: {
                    "accesskey": cignalsAccessKey,
                    "content-type": "application/json"
                }
            })
        res.send('Ok');
    }
    catch (err) {
        console.error(err);
        res.status(404).send('Error');
    }
});

async function getBLiPContact(userIdentity) {

    let contact = contactCache[userIdentity];
    if (contact) return contact;

    return {
        "name": userIdentity,
        "email": "noemail@noemail.com",
        "phone": ""
    }
    // try {
    //     console.log("userIdentity", userIdentity);
    //     const result = await axios.post("https://msging.net/commands",
    //         {
    //             "id": uuid(),
    //             "method": "get",
    //             "uri": "/contacts/" + userIdentity
    //         },
    //         {
    //             headers: {
    //                 "Authorization": "Key Y2lnbmFsc2FpOnRjdDdZTUE3Rzd6S0Fxa3ZiWnBm",
    //                 "Content-Type": "application/json"
    //             }
    //         })

    //     const body = result.data;

    //     contact = {
    //         "name": body.resource.name || userIdentity,
    //         "email": body.resource.email || "noemail@noemail.com",
    //         "phone": body.resource.phoneNumber || ""
    //     }
    //     contactCache[userIdentity] = contact;
    //     return contact;
    // }
    // catch (err) {
    //     console.error(err);
    //     return {
    //         "name": "EMPTY",
    //         "email": "noemail@noemail.com",
    //         "phone": ""
    //     }
    // }
}

async function getCignalsMessageFromLimeMessage(limeMessage) {

    console.log(limeMessage);
    let limeTo = limeMessage.to.split('/')[0];
    let limeFrom = limeMessage.from.split('/')[0];

    let limeMessageDomain = limeFrom.indexOf("@msging.net") != -1 ? limeTo.split('@')[1] : limeFrom.split('@')[1];

    let type = limeMessage.from.indexOf("@msging.net") != -1 ? "bot" : "user";
    let message = limeMessage.type == "text/plain" ? limeMessage.content : limeMessage.type;
    let intent = type == "bot" ? limeMessage.metadata["#stateName"] : undefined;
    let sessionId = type == "bot" ? limeTo : limeFrom;
    //get domain
    let platform = "BLiP/" + limeMessageDomain;

    //get contact and save a cache
    let contact = type == "user" ? await getBLiPContact(limeFrom) : {
        "name": "Bot",
        "email": "noemail@noemail.com",
        "phone": ""
    };

    let cignalsMessage = {
        "message": {
            "type": type, // user or bot (or app)
            "senderId": sessionId, // name or identity
            "timestamp": new Date().toISOString(),
            "message": message, // content if text/plain or type
            "handled": true, // true
            "intent": intent, // block name
            "sessionId": sessionId, // identity
            "platform": platform, // domain
            "senderDetails": contact
        }
    }
    console.log(cignalsMessage);

    return cignalsMessage;
}

/* istanbul ignore next */
if (!module.parent) {
    app.listen(3001);
    console.log('Express started on port 3001');
}