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
                })
                .forEach(function (fingerprint, index) {
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
            var fingerprint = Fingerprints.findOne({_id: data.userId});
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
    }
});
