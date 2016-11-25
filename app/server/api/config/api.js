/**
 * Created by mjwheatley on 06/28/2016.
 */
API = {
    resources: {enroll: true, verify: true, identify: true, vector: true},
    handleRequest: function (context, resource, method) {
        if (!API.resources[resource]) {
            return API.utility.response(context, 404, {message: "Resource not found"});
        }
        var connection = API.connection(context.request);
        if (!connection.error) {
            API.methods[resource][method](context, connection);
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
            GET: function (context, connection) {
                console.log("GET enroll");
                API.utility.response(context, 403, {
                    "message": "This endpoint does not accept GET requests."
                });
            },
            POST: function (context, connection) {
                var hasData = API.utility.hasData(connection.data);
                var validData = API.utility.validate(connection.data, {
                    "template": String
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
                                "userId": result.match,
                                "success": false,
                                "message": "Duplicate fingerprint found."
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
                                        "userId": result,
                                        "success": true,
                                        "message": "Successfully enrolled fingerprint."
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
                    "userId": String,
                    "template": String
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
                    "template": String
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
                                "userId": result.match,
                                "success": true,
                                "score": result.score,
                                "message": "Found a matching userId."
                            });
                        } else {
                            API.utility.response(context, 200, {
                                "success": false,
                                "message": "No match found."
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
                    "template": String,
                    "fingerprintIds": Array
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
                                "userId": result.match,
                                "success": true,
                                "score": result.score,
                                "message": "Found a matching userId."
                            });
                        } else {
                            API.utility.response(context, 200, {
                                "success": false,
                                "message": "No match found."
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
        }
    }
};