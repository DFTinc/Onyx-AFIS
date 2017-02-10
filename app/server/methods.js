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
        return Fingerprints.insert(data);
    },
    '/onyx/identify': function (data) {
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
            return returnResult;
        } catch (error) {
            throw new Meteor.Error("onyx-node-error", error);
        }
    },
    '/onyx/verify': function (data) {
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
            return {isVerified: verified, score: onyxResult};
        } catch (error) {
            throw new Meteor.Error("onyx-node-error", error);
        }
    },
    '/onyx/vector': function (data) {
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
            var mat = onyx.wsqToMat(new Buffer(params.wsqImage, 'base64'));
            var nfiqMetrics = onyx.computeNfiq(mat, params.ppi || 500, params.opts || 0);

            var response = {
                nfiqScore: nfiqMetrics.nfiqScore,
                mlpScore: nfiqMetrics.mlpScore
            };
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
            var srcImage = onyx.wsqToMat(new Buffer(params.wsqImage, 'base64'));
            var scales = [90, 100, 110];
            var imagePyramid = onyx.pyramidImage(srcImage, scales);

            var response = imagePyramid.map(function (mat) {
                return onyx.matToWsq(mat).toString('base64')
            });
            return response;
        } catch (error) {
            throw new Meteor.Error("onyx-node-error", error);
        }
    },
    '/onyx/wsq/generateFingerprintTemplate': function (wsqImage) {
        var Onyx = Meteor.npmRequire('onyx-node');
        try {
            var ft = onyx.generateFingerprintTemplate(wsqImage);

            var response = {
                fingerLocation: ft.getFingerLocation(),
                quality: ft.getQuality(),
                data: ft.getData().toString('base64')
            };
            return response;
        } catch (error) {
            throw new Meteor.Error("onyx-node-error", error);
        }
    }
});
