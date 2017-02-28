/**
 * Created by mjwheatley on 06/28/2016.
 */
API = {
    resources: {enroll: true, verify: true, identify: true, vector: true},
    options: {wsq: true},
    handleRequest: function (context, params, method) {
        if (params.option && !API.options[params.option]) {
            console.log("Invalid route");
            return API.utility.response(context, 404, {message: "Invalid route"});
        }
        if (!API.resources[params.resource]) {
            console.log("Resource not found");
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
            console.log("GET request rejected.");
            return {error: 401, message: "This application does not accept GET requests."};
        }

        var apiKey = getRequestContents.api_key;
        var validUser = API.authentication(apiKey);

        if (validUser) {
            // API Key no longer needed, remove from data and return
            delete getRequestContents.api_key;
            return {owner: validUser, data: getRequestContents};
        } else {
            console.log("Invalid API key.");
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
                console.log("/template/enroll");
                console.log("time: ", new Date().toISOString());
                var hasData = API.utility.hasData(connection.data);
                var validData = API.utility.validate(connection.data, {
                    template: String
                });

                if (hasData && validData && connection.data.template.length > 0) {
                    Meteor.call('/onyx/identify', connection.data, function (error, result) {
                        if (error) {
                            console.error("Error running onyx identification: ", error);
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
                                    console.error("Enroll Error: ", console.log(error));
                                    API.utility.response(context, 500, {
                                        error: error,
                                        message: "Error enrolling fingerprint template."
                                    });
                                } else {
                                    console.log("Enrolled fingerprintId: ", result);
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
                    console.log("Invalid parameters");
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
                            console.error("Verify Error: ", error);
                            API.utility.response(context, 500, {
                                error: error,
                                message: "Error executing onyx verification."
                            });
                        } else {
                            API.utility.response(context, 200, result);
                        }
                    });
                } else {
                    console.log("Invalid parameters");
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
                            console.error("Error running onyx identification: ", error);
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
                    console.log("Invalid parameters");
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
                            console.error("Error running onyx vector verification: ", error);
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
                    console.log("Invalid parameters");
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
                    console.log("/wsq/enroll");
                    console.log("time: ", new Date().toISOString());
                    var hasData = API.utility.hasData(connection.data);
                    var validData = API.utility.validate(connection.data, {
                        "wsqImage": String
                    });

                    if (hasData && validData && connection.data.wsqImage.length > 0) {
                        // Check image quality
                        Meteor.call('/onyx/wsq/image/quality', connection.data, function (error, result) {
                            if (error) {
                                console.error("Error running onyx nfiq: ", error);
                                API.utility.response(context, 500, {
                                    error: error,
                                    message: "Error computing image NFIQ."
                                });
                            } else {
                                if (result.nfiqScore > 4) {
                                    console.log("Insufficient image quality.");
                                    API.utility.response(context, 422, {
                                        message: "Insufficient image quality.",
                                        nfiqScore: result.nfiqScore
                                    });
                                } else {
                                    var wsqMat = result.wsqMat;
                                    Meteor.call('/onyx/wsq/mat/pyramid/identify', wsqMat, function (error, result) {
                                        if (error) {
                                            console.error("Error running onyx pyramid identification: ", error);
                                            API.utility.response(context, 500, {
                                                error: error,
                                                message: "Error running onyx pyramid identification."
                                            });
                                        } else if (result.match) {
                                            API.utility.response(context, 200, {
                                                fingerprintId: result.match,
                                                success: false,
                                                message: "Duplicate fingerprint found."
                                            });
                                        } else {
                                            // No duplicate found, enroll image
                                            var template;
                                            try {
                                                template = Meteor.call(
                                                    '/onyx/wsq/mat/generateFingerprintTemplate', wsqMat);
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
                                                        console.error("Enroll Error: ", error);
                                                        API.utility.response(context, 500, {
                                                            error: error,
                                                            message: "Error enrolling fingerprint template."
                                                        });
                                                    } else {
                                                        console.log("Enrolled fingerprintId: ", result);
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
                        console.log("Invalid parameters");
                        API.utility.response(context, 403, {
                            error: 403,
                            message: "POST calls must have valid fields passed in the request body in the correct formats."
                        });
                    }
                }
            },
            'identify': {
                POST: function (context, connection) {
                    console.log("/wsq/identify");
                    console.log("time: ", new Date().toISOString());
                    var hasData = API.utility.hasData(connection.data);
                    var validData = API.utility.validate(connection.data, {
                        "wsqImage": String
                    });

                    if (hasData && validData) {
                        // Check image quality
                        Meteor.call('/onyx/wsq/image/quality', connection.data, function (error, result) {
                            if (error) {
                                console.error("Error running onyx nfiq: ", error);
                                API.utility.response(context, 500, {
                                    error: error,
                                    message: "Error computing image NFIQ."
                                });
                            } else {
                                if (result.nfiqScore > 4) {
                                    console.log("Insufficient image quality.");
                                    API.utility.response(context, 422, {
                                        message: "Insufficient image quality.",
                                        nfiqScore: result.nfiqScore
                                    });
                                } else {
                                    var wsqMat = result.wsqMat;
                                    Meteor.call('/onyx/wsq/mat/pyramid/identify', wsqMat, function (error, result) {
                                        if (error) {
                                            console.error("Error running onyx pyramid identification: ", error);
                                            API.utility.response(context, 500, {
                                                error: error,
                                                message: "Error running onyx pyramid identification."
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
                                }
                            }
                        });
                    } else {
                        console.log("Invalid parameters");
                        API.utility.response(context, 403, {
                            error: 403,
                            message: "POST calls must have valid fields passed in the request body in the correct formats."
                        });
                    }
                }
            },
            'vector': {
                POST: function (context, connection) {
                    console.log("/wsq/vector");
                    console.log("time: ", new Date().toISOString());
                    var hasData = API.utility.hasData(connection.data);
                    var validData = API.utility.validate(connection.data, {
                        wsqImage: String,
                        fingerprintIds: Array
                    });

                    if (hasData && validData) {
                        // Check image quality
                        Meteor.call('/onyx/wsq/image/quality', connection.data, function (error, result) {
                            if (error) {
                                console.error("Error running onyx nfiq: ", error);
                                API.utility.response(context, 500, {
                                    error: error,
                                    message: "Error computing image NFIQ."
                                });
                            } else {
                                console.log("NFIQ Score: ", result.nfiqScore);
                                if (result.nfiqScore > 4) {
                                    console.log("Insufficient image quality.");
                                    API.utility.response(context, 422, {
                                        message: "Insufficient image quality.",
                                        nfiqScore: result.nfiqScore
                                    });
                                } else {
                                    connection.data.wsqMat = result.wsqMat;
                                    Meteor.call('/onyx/wsq/mat/pyramid/vector', connection.data, function (error, result) {
                                        if (error) {
                                            console.error("Error running onyx wsq mat pyramid vector verification: ", error);
                                            API.utility.response(context, 500, {
                                                error: error,
                                                message: "Error running onyx wsq mat pyramid vector verification."
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
                                }
                            }
                        });
                    } else {
                        console.log("Invalid parameters");
                        API.utility.response(context, 403, {
                            error: 403,
                            message: "POST calls must have valid fields passed in the request body in the correct formats."
                        });
                    }
                }
            },
            'verify': {
                POST: function (context, connection) {
                    console.log("/wsq/verify");
                    console.log("time: ", new Date().toISOString());
                    var hasData = API.utility.hasData(connection.data);
                    var validData = API.utility.validate(connection.data, {
                        fingerprintId: String,
                        wsqImage: String
                    });

                    if (hasData && validData) {
                        // Check image quality
                        Meteor.call('/onyx/wsq/image/quality', connection.data, function (error, result) {
                            if (error) {
                                console.error("Error running onyx nfiq: ", error);
                                API.utility.response(context, 500, {
                                    error: error,
                                    message: "Error computing image NFIQ."
                                });
                            } else {
                                if (result.nfiqScore > 4) {
                                    console.log("Insufficient image quality.");
                                    API.utility.response(context, 422, {
                                        message: "Insufficient image quality.",
                                        nfiqScore: result.nfiqScore
                                    });
                                } else {
                                    connection.data.wsqMat = result.wsqMat;

                                    Meteor.call('/onyx/wsq/mat/pyramid/verify', connection.data, function (error, result) {
                                        if (error) {
                                            console.error("Verification Error: ", error);
                                            API.utility.response(context, 500, {
                                                error: error,
                                                message: "Error executing onyx wsq mat pyramid verification."
                                            });
                                        } else {
                                            API.utility.response(context, 200, result);
                                        }
                                    });
                                }
                            }
                        });
                    } else {
                        console.log("Invalid parameters");
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