/*****************************************************************************/
/*  Server Methods */
/*****************************************************************************/

Meteor.methods({
    'isEmailRegistered': function (email) {
        var user;
        if (email) {
            user = Accounts.findUserByEmail(email);
        }
        if (user) {
            return true;
        }
        return false;
    },
    '/onyx/enroll': function (data) {
        console.log("Insert fingerprint");
        return Fingerprints.insert(data);
    },
    '/onyx/identify': function (data) {
        console.log("Template identify");
        var Onyx = Meteor.npmRequire('onyx-node');
        try {
            var reqTemplate = new Onyx.FingerprintTemplate(
                new Buffer(data.template, 'base64'), 100
            );

            var ftv = new Onyx.FingerprintTemplateVector();
            var fingerprints = Fingerprints.find({}).fetch();
            fingerprints.filter(function (fingerprint) {
                return fingerprint.template.length > 0; // drop all the empty templates
            }).forEach(function (fingerprint, index) {
                var templateBuffer = new Buffer(fingerprint.template, 'base64');
                var dbTemplate = new Onyx.FingerprintTemplate(templateBuffer, 100);
                dbTemplate.setCustomId(fingerprint._id);
                ftv.push_back(dbTemplate);
            });

            // Do identification
            var onyxResult = Onyx.identify(ftv, reqTemplate);
            var returnResult = {
                match: false,
                score: onyxResult.score
            };
            if (onyxResult.score >= 34) {
                var match = ftv.get(onyxResult.index);
                returnResult.match = match.getCustomId();
            }
            console.log("result: ", returnResult);
            return returnResult;
        } catch (error) {
            throw new Meteor.Error("onyx-node-error", error);
        }
    },
    '/onyx/verify': function (data) {
        console.log("Template Verify");
        console.log("Requested fingerprintId: ", data.fingerprintId);
        var Onyx = Meteor.npmRequire('onyx-node');
        try {
            var fingerprint = Fingerprints.findOne({_id: data.fingerprintId});
            if (!fingerprint) {
                throw new Meteor.Error("not-enrolled", "No fingerprint enrolled.");
            }
            var dbTpl = new Onyx.FingerprintTemplate(new Buffer(fingerprint.template, 'base64'), 100);
            var reqTpl = new Onyx.FingerprintTemplate(new Buffer(data.template, 'base64'), 100);
            // Do verification
            var onyxResult = Onyx.verify(dbTpl, reqTpl);
            var verified = false;
            if (onyxResult >= 34) {
                console.log('Template Verified');
                verified = true;
            }
            var returnResult = {isVerified: verified, score: onyxResult};
            console.log("result: ", returnResult);
            return returnResult;
        } catch (error) {
            throw new Meteor.Error("onyx-node-error", error);
        }
    },
    '/onyx/vector': function (data) {
        console.log("Template Vector Verification");
        console.log("Requested fingerprintIds: ", data.fingerprintIds);
        var Onyx = Meteor.npmRequire('onyx-node');
        try {
            var reqTemplate = new Onyx.FingerprintTemplate(
                new Buffer(data.template, 'base64'), 100
            );

            var ftv = new Onyx.FingerprintTemplateVector();
            var fingerprints = Fingerprints.find({_id: {$in: data.fingerprintIds}}).fetch();
            fingerprints.filter(function (fingerprint) {
                return fingerprint.template.length > 0; // drop all the empty templates
            }).forEach(function (fingerprint, index) {
                var templateBuffer = new Buffer(fingerprint.template, 'base64');
                var dbTemplate = new Onyx.FingerprintTemplate(templateBuffer, 100);
                dbTemplate.setCustomId(fingerprint._id);
                ftv.push_back(dbTemplate);
            });

            // Do identification
            var onyxResult = Onyx.identify(ftv, reqTemplate);
            var returnResult = {
                match: false,
                score: onyxResult.score
            };
            if (onyxResult.score >= 34) {
                var match = ftv.get(onyxResult.index);
                returnResult.match = match.getCustomId();
            }
            return returnResult;
        } catch (error) {
            throw new Meteor.Error("onyx-node-error", error);
        }
    },
    '/onyx/wsq/image/quality': function (params) {
        /**
         * Compute the NFIQ score of the Base64 encoded WSQ image.
         * @param {string} wsqImage wsqData provided WSQ image data encoded as a Base64 string.
         * @param {number} ppi ppi specifies the Pixels-per-inch of the capture WSQ image.
         * @param {number} opts opts are additional options to pass to the computation (usually not used).
         */
        var Onyx = Meteor.npmRequire('onyx-node');
        try {
            var mat = Onyx.wsqToMat(new Buffer(params.wsqImage, 'base64'));
            var nfiqMetrics = Onyx.computeNfiq(mat, params.ppi || 500, params.opts || 0);

            var response = {
                wsqMat: mat,
                nfiqScore: nfiqMetrics.nfiqScore,
                mlpScore: nfiqMetrics.mlpScore
            };
            console.log("NFIQ Score: ", response.nfiqScore);
            return response;
        } catch (error) {
            throw new Meteor.Error("onyx-node-error", error);
        }
    },
    '/onyx/wsq/pyramidImage': function (params) {
        /**
         * Pyramids a WSQ formatted image in Base64 encoding to multiple scales.
         * @param {string} wsqImage WSQ formatted image encoded as Base64.
         */
        var Onyx = Meteor.npmRequire('onyx-node');
        try {
            // Pyramid Image
            var srcImage = Onyx.wsqToMat(new Buffer(params.wsqImage, 'base64'));
            var scales = [0.9, 1.0, 1.1];
            var imagePyramid = Onyx.pyramidImage(srcImage, scales);
            console.log("Successfully created image pyramid");

            var response = imagePyramid.map(function (mat) {
                return Onyx.matToWsq(mat).toString('base64');
            });
            return response;
        } catch (error) {
            throw new Meteor.Error("onyx-node-error", error);
        }
    },
    '/onyx/wsq/generateFingerprintTemplate': function (wsqImage) {
        var Onyx = Meteor.npmRequire('onyx-node');
        try {
            var srcImage = Onyx.wsqToMat(new Buffer(wsqImage, 'base64'));
            var ft = Onyx.generateFingerprintTemplate(srcImage);
            var response = {
                fingerLocation: ft.getFingerLocation(),
                quality: ft.getQuality(),
                data: ft.getData().toString('base64')
            };
            return response;
        } catch (error) {
            throw new Meteor.Error("onyx-node-error", error);
        }
    },
    '/onyx/wsq/mat/generateFingerprintTemplate': function (wsqMat) {
        var Onyx = Meteor.npmRequire('onyx-node');
        try {
            var ft = Onyx.generateFingerprintTemplate(wsqMat);
            var response = {
                fingerLocation: ft.getFingerLocation(),
                quality: ft.getQuality(),
                data: ft.getData().toString('base64')
            };
            return response;
        } catch (error) {
            throw new Meteor.Error("onyx-node-error", error);
        }
    },
    '/onyx/wsq/mat/pyramid/identify': function (wsqMat) {
        console.log("WSQ pyramidIdentify()");
        var Onyx = Meteor.npmRequire('onyx-node');
        try {
            var ftv = new Onyx.FingerprintTemplateVector();
            var fingerprints = Fingerprints.find({}).fetch();
            fingerprints.filter(function (fingerprint) {
                return fingerprint.template.length > 0; // drop all the empty templates
            }).forEach(function (fingerprint, index) {
                var templateBuffer = new Buffer(fingerprint.template, 'base64');
                var dbTemplate = new Onyx.FingerprintTemplate(templateBuffer, 100);
                dbTemplate.setCustomId(fingerprint._id);
                ftv.push_back(dbTemplate);
            });

            // Do identification
            var onyxResult = Onyx.pyramidIdentify(ftv, wsqMat, [0.7, 0.84, 0.98, 1.12, 1.26, 1.4]);
            var returnResult = {
                match: false,
                score: onyxResult.score
            };
            if (onyxResult.score >= 34) {
                var match = ftv.get(onyxResult.index);
                returnResult.match = match.getCustomId();
            }
            console.log("result: ", returnResult);
            return returnResult;
        } catch (error) {
            throw new Meteor.Error("onyx-node-error", error);
        }
    },
    '/onyx/wsq/mat/pyramid/vector': function (data) {
        console.log("WSQ Pyramid Vector Verification");
        console.log("Requested fingerprintIds: ", data.fingerprintIds);
        var Onyx = Meteor.npmRequire('onyx-node');
        try {
            var ftv = new Onyx.FingerprintTemplateVector();
            var fingerprints = Fingerprints.find({_id: {$in: data.fingerprintIds}}).fetch();
            fingerprints.filter(function (fingerprint) {
                return fingerprint.template.length > 0; // drop all the empty templates
            }).forEach(function (fingerprint, index) {
                var templateBuffer = new Buffer(fingerprint.template, 'base64');
                var dbTemplate = new Onyx.FingerprintTemplate(templateBuffer, 100);
                dbTemplate.setCustomId(fingerprint._id);
                ftv.push_back(dbTemplate);
            });

            // Do identification
            var onyxResult = Onyx.pyramidIdentify(ftv, data.wsqMat, [0.7, 0.84, 0.98, 1.12, 1.26, 1.4]);
            var returnResult = {
                match: false,
                score: onyxResult.score
            };
            if (onyxResult.score >= 34) {
                var match = ftv.get(onyxResult.index);
                returnResult.match = match.getCustomId();
            }
            console.log("result: ", returnResult);
            return returnResult;
        } catch (error) {
            throw new Meteor.Error("onyx-node-error", error);
        }
    },
    '/onyx/wsq/mat/pyramid/verify': function (data) {
        console.log("WSQ pyramidVerify()");
        console.log("Requested fingerprintId: ", data.fingerprintId);
        var Onyx = Meteor.npmRequire('onyx-node');
        try {
            var fingerprint = Fingerprints.findOne({_id: data.fingerprintId});
            if (!fingerprint) {
                throw new Meteor.Error("not-enrolled", "No fingerprint enrolled.");
            }
            var dbTpl = new Onyx.FingerprintTemplate(new Buffer(fingerprint.template, 'base64'), 100);
            // Do verification
            var onyxScore = Onyx.pyramidVerify(dbTpl, data.wsqMat, [0.7, 0.84, 0.98, 1.12, 1.26, 1.4]);
            var verified = false;
            if (onyxScore >= 34) {
                console.log('Template Verified');
                verified = true;
            }
            var returnResult = {isVerified: verified, score: onyxScore};
            console.log("result: ", returnResult);
            return returnResult;
        } catch (error) {
            throw new Meteor.Error("onyx-node-error", error);
        }
    }
});
