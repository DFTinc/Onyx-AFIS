/**
 * Created by mjwheatley on 8/22/16.
 */
var request = require('request');
var fs = require("fs");

var buf1 = fs.readFileSync("ft1.bin");
var buf2 = fs.readFileSync("ft2.bin");
var buf1base64 = buf1.toString('base64');
var buf2base64 = buf2.toString('base64');


var requestJson = {
    api_key: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // OnyxMeteor-dev
    //api_key: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // OnyxMeteor
    template: buf1base64
};

request({
    url: "http://localhost:3030/api/v1/onyx/enroll", // config/development/env.sh
    //url: "http://localhost:3330/api/v1/onyx/identify", // config/production/env.sh
    method: "POST",
    json: true,   // <--Very important!!!
    body: requestJson
}, function (error, response, body){
    console.log("body:" , body);
});
