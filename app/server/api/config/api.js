/**
 * Created by mjwheatley on 06/28/2016.
 */
API = {
    resources: {enroll: true, verify: true, identify: true, vector: true},
    options: {wsq: true},
    handleRequest: function (context, params, method) {
        if (params.option && !API.options[params.option]) {
            return API.utility.response(context, 404, {message: "Invalid route"});
        }
        if (!API.resources[params.resource]) {
            return API.utility.response(context, 404, {message: "Resource not found"});
        }
        var connection = API.connection(context.request);
        if (!connection.error) {
            if (params.option) {
                API.methods[params.option][params.resource][method](context, connection);
            } else {
                API.methods[params.resource][method](context, connection);
            }
        } else {
            API.utility.response(context, 401, connection);
        }
    },
    connection: function (request) {
        var getRequestContents = API.utility.getRequestContents(request);
        if (request.method === "GET") {
            return {error: 401, message: "This application does not accept GET requests."};
        }

        var apiKey = getRequestContents.api_key;
        var validUser = API.authentication(apiKey);

        if (validUser) {
            // API Key no longer needed, remove from data and return
            delete getRequestContents.api_key;
            return {owner: validUser, data: getRequestContents};
        } else {
            return {error: 401, message: "Invalid API key."};
        }
    },
    authentication: function (apiKey) {
        var getUser = APIKeys.findOne({"key": apiKey}, {fields: {"owner": 1}});
        if (getUser) {
            return getUser.owner;
        } else {
            return false;
        }
    },
    utility: {
        getRequestContents: function (request) {
            switch (request.method) {
                case "GET":
                    return request.query;
                case "POST":
                case "PUT":
                case "DELETE":
                    return request.body;
            }
        },
        response: function (context, statusCode, data) {
            context.response.setHeader('Content-Type', 'application/json');
            context.response.statusCode = statusCode;
            context.response.end(JSON.stringify(data));
        },
        hasData: function (data) {
            return Object.keys(data).length > 0 ? true : false;
        },
        validate: function (data, pattern) {
            return Match.test(data, pattern);
        }
    },
    methods: {
        'enroll': {
            POST: function (context, connection) {
                var hasData = API.utility.hasData(connection.data);
                var validData = API.utility.validate(connection.data, {
                    template: String
                });

                if (hasData && validData && connection.data.template.length > 0) {
                    Meteor.call('/onyx/identify', connection.data, function (error, result) {
                        if (error) {
                            console.log("Error running onyx identification: ", error);
                            API.utility.response(context, 500, {
                                error: error,
                                message: "Error running onyx identification."
                            });
                        } else if (result.match) {
                            API.utility.response(context, 200, {
                                fingerprintId: result.match,
                                success: false,
                                message: "Duplicate fingerprint found."
                            });
                        } else {
                            Meteor.call('/onyx/enroll', connection.data, function (error, result) {
                                if (error) {
                                    API.utility.response(context, 500, {
                                        error: error,
                                        message: "Error enrolling fingerprint template."
                                    });
                                } else {
                                    API.utility.response(context, 200, {
                                        fingerprintId: result,
                                        success: true,
                                        message: "Successfully enrolled fingerprint."
                                    });
                                }
                            });
                        }
                    });
                } else {
                    API.utility.response(context, 403, {
                        error: 403,
                        message: "POST calls must have valid fields passed in the request body in the correct formats."
                    });
                }
            }
        },
        'verify': {
            POST: function (context, connection) {
                var hasData = API.utility.hasData(connection.data);
                var validData = API.utility.validate(connection.data, {
                    fingerprintId: String,
                    template: String
                });

                if (hasData && validData) {
                    Meteor.call('/onyx/verify', connection.data, function (error, result) {
                        if (error) {
                            API.utility.response(context, 500, {
                                error: error,
                                message: "Error executing onyx verification."
                            });
                        } else {
                            API.utility.response(context, 200, result);
                        }
                    });
                } else {
                    API.utility.response(context, 403, {
                        error: 403,
                        message: "POST calls must have valid fields passed in the request body in the correct formats."
                    });
                }
            }
        },
        'identify': {
            POST: function (context, connection) {
                var hasData = API.utility.hasData(connection.data);
                var validData = API.utility.validate(connection.data, {
                    template: String
                });

                if (hasData && validData) {
                    Meteor.call('/onyx/identify', connection.data, function (error, result) {
                        if (error) {
                            console.log("Error running onyx identification: ", error);
                            API.utility.response(context, 500, {
                                error: error,
                                message: "Error running onyx identification."
                            });
                        } else if (result.match) {
                            API.utility.response(context, 200, {
                                fingerprintId: result.match,
                                success: true,
                                score: result.score,
                                message: "Found a matching fingerprint."
                            });
                        } else {
                            API.utility.response(context, 200, {
                                success: false,
                                message: "No match found."
                            });
                        }
                    });
                } else {
                    API.utility.response(context, 403, {
                        error: 403,
                        message: "POST calls must have valid fields passed in the request body in the correct formats."
                    });
                }
            }
        },
        'vector': {
            POST: function (context, connection) {
                var hasData = API.utility.hasData(connection.data);
                var validData = API.utility.validate(connection.data, {
                    template: String,
                    fingerprintIds: Array
                });

                if (hasData && validData) {
                    Meteor.call('/onyx/vector', connection.data, function (error, result) {
                        if (error) {
                            console.log("Error running onyx vector verification: ", error);
                            API.utility.response(context, 500, {
                                error: error,
                                message: "Error running onyx vector verification."
                            });
                        } else if (result.match) {
                            API.utility.response(context, 200, {
                                fingerprintId: result.match,
                                success: true,
                                score: result.score,
                                message: "Found a matching fingerprintId."
                            });
                        } else {
                            API.utility.response(context, 200, {
                                success: false,
                                message: "No match found."
                            });
                        }
                    });
                } else {
                    API.utility.response(context, 403, {
                        error: 403,
                        message: "POST calls must have valid fields passed in the request body in the correct formats."
                    });
                }
            }
        },
        'wsq': {
            'enroll': {
                POST: function (context, connection) {
                    var hasData = API.utility.hasData(connection.data);
                    var validData = API.utility.validate(connection.data, {
                        "wsqImage": String
                    });

                    if (hasData && validData && connection.data.wsqImage.length > 0) {
                        // Check image quality
                        Meteor.call('/onyx/wsq/image/quality', connection.data, function (error, result) {
                            if (error) {
                                console.log("Error running onyx nfiq: ", error);
                                API.utility.response(context, 500, {
                                    error: error,
                                    message: "Error computing image NFIQ."
                                });
                            } else {
                                if (result.nfiqScore > 3) {
                                    API.utility.response(context, 422, {
                                        message: "Insufficient image quality.",
                                        nfiqScore: result.nfiqScore
                                    });
                                } else {
                                    // Pyramid the image
                                    Meteor.call('/onyx/wsq/pyramidImage', connection.data,
                                        function (error, imagePyramid) {
                                            if (error) {
                                                console.log("Error running onyx identification: ", error);
                                                API.utility.response(context, 500, {
                                                    error: error,
                                                    message: "Error creating image pyramid"
                                                });
                                            } else {
                                                // Perform deduplication
                                                var fingerprintTemplateArray = [];
                                                imagePyramid.forEach(function (wsqImage) {
                                                    try {
                                                        var fingerprintTemplate = Meteor.call(
                                                            '/onyx/wsq/generateFingerprintTemplate', wsqImage);
                                                        fingerprintTemplateArray.push(fingerprintTemplate.data);
                                                    } catch (e) {
                                                        console.log("Error generating template from wsq image: ", e);
                                                        return API.utility.response(context, 500, {
                                                            error: e,
                                                            message: "Error generating template from wsq image."
                                                        });
                                                    }
                                                });

                                                var match;
                                                for (var i = 0; i < fingerprintTemplateArray.length; i++) {
                                                    var fingerprintData = fingerprintTemplateArray[i];
                                                    try {
                                                        var result = Meteor.call('/onyx/identify', {
                                                            template: fingerprintData
                                                        });
                                                        if (result.match) {
                                                            match = result;
                                                            break;
                                                        }
                                                    } catch (e) {
                                                        console.log("Error running onyx identification: ", error);
                                                        return API.utility.response(context, 500, {
                                                            error: e,
                                                            message: "Error running onyx identification."
                                                        });
                                                    }
                                                }

                                                if (match) {
                                                    return API.utility.response(context, 200, {
                                                        fingerprintId: match.match,
                                                        success: false,
                                                        message: "Duplicate fingerprint found."
                                                    });
                                                }

                                                // No duplicate found, enroll image
                                                var template;
                                                try {
                                                    template = Meteor.call('/onyx/wsq/generateFingerprintTemplate',
                                                        connection.data.wsqImage);
                                                } catch (e) {
                                                    console.log("Error generating template from wsq image: ", e);
                                                    return API.utility.response(context, 500, {
                                                        error: e,
                                                        message: "Error generating template from wsq image."
                                                    });
                                                }

                                                if (template) {
                                                    Meteor.call('/onyx/enroll', {
                                                        template: template.data
                                                    }, function (error, result) {
                                                        if (error) {
                                                            API.utility.response(context, 500, {
                                                                error: error,
                                                                message: "Error enrolling fingerprint template."
                                                            });
                                                        } else {
                                                            API.utility.response(context, 200, {
                                                                fingerprintId: result,
                                                                success: true,
                                                                message: "Successfully enrolled fingerprint."
                                                            });
                                                        }
                                                    });
                                                }
                                            }
                                        });
                                }
                            }
                        });
                    } else {
                        API.utility.response(context, 403, {
                            error: 403,
                            message: "POST calls must have valid fields passed in the request body in the correct formats."
                        });
                    }
                }
            },
            'identify': {
                POST: function (context, connection) {
                    var hasData = API.utility.hasData(connection.data);
                    var validData = API.utility.validate(connection.data, {
                        "wsqImage": String
                    });

                    if (hasData && validData) {
                        // Check image quality
                        Meteor.call('/onyx/wsq/image/quality', connection.data, function (error, result) {
                            if (error) {
                                console.log("Error running onyx nfiq: ", error);
                                API.utility.response(context, 500, {
                                    error: error,
                                    message: "Error computing image NFIQ."
                                });
                            } else {
                                if (result.nfiqScore > 3) {
                                    API.utility.response(context, 422, {
                                        message: "Insufficient image quality.",
                                        nfiqScore: result.nfiqScore
                                    });
                                } else {
                                    // Pyramid the image
                                    Meteor.call('/onyx/wsq/pyramidImage', connection.data, function (error, imagePyramid) {
                                        if (error) {
                                            console.log("Error running onyx identification: ", error);
                                            API.utility.response(context, 500, {
                                                error: error,
                                                message: "Error creating image pyramid."
                                            });
                                        } else {
                                            // Perform deduplication
                                            var fingerprintTemplateArray = [];
                                            imagePyramid.forEach(function (wsqImage) {
                                                try {
                                                    var fingerprintTemplate = Meteor.call('/onyx/wsq/generateFingerprintTemplate', wsqImage);
                                                    fingerprintTemplateArray.push(fingerprintTemplate.data);
                                                } catch (e) {
                                                    console.log("Error generating template from wsq image: ", e);
                                                    return API.utility.response(context, 500, {
                                                        error: e,
                                                        message: "Error generating template from wsq image."
                                                    });
                                                }
                                            });

                                            var match;
                                            for (var i = 0; i < fingerprintTemplateArray.length; i++) {
                                                var fingerprintData = fingerprintTemplateArray[i];
                                                try {
                                                    var result = Meteor.call('/onyx/identify', {template: fingerprintData});
                                                    if (result.match) {
                                                        match = result;
                                                        break;
                                                    }
                                                } catch (e) {
                                                    console.log("Error running onyx identification: ", error);
                                                    return API.utility.response(context, 500, {
                                                        error: e,
                                                        message: "Error running onyx identification."
                                                    });
                                                }
                                            }

                                            if (match) {
                                                return API.utility.response(context, 200, {
                                                    fingerprintId: match.match,
                                                    success: true,
                                                    score: match.score,
                                                    message: "Found a matching fingerprint."
                                                });
                                            } else {
                                                API.utility.response(context, 200, {
                                                    success: false,
                                                    message: "No match found."
                                                });
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    } else {
                        API.utility.response(context, 403, {
                            error: 403,
                            message: "POST calls must have valid fields passed in the request body in the correct formats."
                        });
                    }
                }
            },
            'vector': {
                POST: function (context, connection) {
                    var hasData = API.utility.hasData(connection.data);
                    var validData = API.utility.validate(connection.data, {
                        wsqImage: String,
                        fingerprintIds: Array
                    });

                    if (hasData && validData) {
                        // Check image quality
                        Meteor.call('/onyx/wsq/image/quality', connection.data, function (error, result) {
                            if (error) {
                                console.log("Error running onyx nfiq: ", error);
                                API.utility.response(context, 500, {
                                    error: error,
                                    message: "Error computing image NFIQ."
                                });
                            } else {
                                if (result.nfiqScore > 3) {
                                    API.utility.response(context, 422, {
                                        message: "Insufficient image quality.",
                                        nfiqScore: result.nfiqScore
                                    });
                                } else {
                                    // Pyramid the image
                                    Meteor.call('/onyx/wsq/pyramidImage', connection.data, function (error, imagePyramid) {
                                        if (error) {
                                            console.log("Error running onyx identification: ", error);
                                            API.utility.response(context, 500, {
                                                error: error,
                                                message: "Error creating image pyramid."
                                            });
                                        } else {
                                            var fingerprintTemplateArray = [];
                                            imagePyramid.forEach(function (wsqImage) {
                                                try {
                                                    var fingerprintTemplate = Meteor.call('/onyx/wsq/generateFingerprintTemplate', wsqImage);
                                                    fingerprintTemplateArray.push(fingerprintTemplate.data);
                                                } catch (e) {
                                                    console.log("Error generating template from wsq image: ", e);
                                                    return API.utility.response(context, 500, {
                                                        error: e,
                                                        message: "Error generating template from wsq image."
                                                    });
                                                }
                                            });

                                            var match;
                                            for (var i = 0; i < fingerprintTemplateArray.length; i++) {
                                                var fingerprintData = fingerprintTemplateArray[i];
                                                try {
                                                    var result = Meteor.call('/onyx/vector', {
                                                        template: fingerprintData,
                                                        fingerprintIds: connection.data.fingerprintIds
                                                    });
                                                    if (result.match) {
                                                        match = result;
                                                        break;
                                                    }
                                                } catch (e) {
                                                    console.log("Error executing onyx vector verification: ", error);
                                                    return API.utility.response(context, 500, {
                                                        error: e,
                                                        message: "Error executing onyx vector verification."
                                                    });
                                                }

                                                if (match) {
                                                    return API.utility.response(context, 200, {
                                                        fingerprintId: match.match,
                                                        success: true,
                                                        score: match.score,
                                                        message: "Found a matching fingerprint."
                                                    });
                                                } else {
                                                    API.utility.response(context, 200, {
                                                        success: false,
                                                        message: "No match found."
                                                    });
                                                }
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    } else {
                        API.utility.response(context, 403, {
                            error: 403,
                            message: "POST calls must have valid fields passed in the request body in the correct formats."
                        });
                    }
                }
            },
            'verify': {
                POST: function (context, connection) {
                    var hasData = API.utility.hasData(connection.data);
                    var validData = API.utility.validate(connection.data, {
                        fingerprintId: String,
                        wsqImage: String
                    });

                    if (hasData && validData) {
                        // Check image quality
                        Meteor.call('/onyx/wsq/image/quality', connection.data, function (error, result) {
                            if (error) {
                                console.log("Error running onyx nfiq: ", error);
                                API.utility.response(context, 500, {
                                    error: error,
                                    message: "Error computing image NFIQ."
                                });
                            } else {
                                if (result.nfiqScore > 3) {
                                    API.utility.response(context, 422, {
                                        message: "Insufficient image quality.",
                                        nfiqScore: result.nfiqScore
                                    });
                                } else {
                                    // Pyramid the image
                                    Meteor.call('/onyx/wsq/pyramidImage', connection.data, function (error, imagePyramid) {
                                        if (error) {
                                            console.log("Error running onyx identification: ", error);
                                            API.utility.response(context, 500, {
                                                error: error,
                                                message: "Error creating image pyramid."
                                            });
                                        } else {
                                            var fingerprintTemplateArray = [];
                                            imagePyramid.forEach(function (wsqImage) {
                                                try {
                                                    var fingerprintTemplate = Meteor.call('/onyx/wsq/generateFingerprintTemplate', wsqImage);
                                                    fingerprintTemplateArray.push(fingerprintTemplate.data);
                                                } catch (e) {
                                                    console.log("Error generating template from wsq image: ", e);
                                                    return API.utility.response(context, 500, {
                                                        error: e,
                                                        message: "Error generating template from wsq image."
                                                    });
                                                }
                                            });

                                            var verifyResult = {
                                                isVerified: false
                                            };
                                            for (var i = 0; i < fingerprintTemplateArray.length; i++) {
                                                var fingerprintData = fingerprintTemplateArray[i];
                                                try {
                                                    var result = Meteor.call('/onyx/verify', {
                                                        template: fingerprintData,
                                                        fingerprintId: connection.data.fingerprintId
                                                    });
                                                    if (result.isVerified) {
                                                        verifyResult.isVerified = result.isVerified;
                                                        verifyResult.score = result.score;
                                                        break;
                                                    }
                                                } catch (e) {
                                                    console.log("Error running onyx verification: ", error);
                                                    return API.utility.response(context, 500, {
                                                        error: e,
                                                        message: "Error running onyx verification."
                                                    });
                                                }

                                                API.utility.response(context, 200, verifyResult);
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    } else {
                        API.utility.response(context, 403, {
                            error: 403,
                            message: "POST calls must have valid fields passed in the request body in the correct formats."
                        });
                    }
                }
            }
        }
    }
};