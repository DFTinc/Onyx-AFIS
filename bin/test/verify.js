/**
 * Created by mjwheatley on 6/30/16.
 */
var request = require('request');
var fs = require("fs");

var buf1 = fs.readFileSync("ft1.bin");
var buf2 = fs.readFileSync("ft2.bin");
var buf1base64 = buf1.toString('base64');
var buf2base64 = buf2.toString('base64');


var requestJson = {
//    api_key: "51f6b93bf5f20e192195e9ac9879fd98", // DataReveal OnyxMeteor-dev
    api_key: "f2599a82c7eb8bd383a47f836e63aaf2", // DataReveal OnyxMeteor
    template: buf1base64,
//    userId: "SNDt6kuesxZh7HkgA" // dev
    userId: "xigEFwbcEDCBe5zJG" // prod
};

request({
//    url: "http://localhost:3030/api/v1/onyx/verify", // config/development/env.sh
    url: "http://localhost:3330/api/v1/onyx/verify", // config/production/env.sh
    method: "POST",
    json: true,   // <--Very important!!!
    body: requestJson
}, function (error, response, body){
    console.log("body:" , body);
});
