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
        var OnyxApi = Meteor.npmRequire('onyx-node');
        var onyxTemplate = new onyx.FingerprintTemplate(
            new Buffer(data.template, 'base64'), 100
        );

        var ftv = new onyx.FingerprintTemplateVector();
        var fingerprints = Fingerprints.find({}).fetch();
        fingerprints.forEach(function (fingerprint, index) {
            var templateBuffer = new Buffer(fingerprint.template, 'base64');
            var onyxTemplate = new onyx.FingerprintTemplate(templateBuffer, 100);
            ftv.push_back(onyxTemplate);
        });

        // Do identification
        var onyxResult = onyx.identify(ftv, onyxTemplate);
        var returnResult = {
            match: false
        };
        if (onyxResult.score >= 34) {
            var match = fingerprints[result.index];
            returnResult.match = match._id;
        }
        return returnResult;
    },
    '/onyx/verify': function (data) {
        var OnyxApi = Meteor.npmRequire('onyx-node');
        var fingerprint = Fingerprints.findOne({_id: data.userId});
        if (!fingerprint) {
            throw new Meteor.Error("not-enrolled", "No fingerprint enrolled.");
        }
        var dbTpl = new OnyxApi.FingerprintTemplate(new Buffer(fingerprint.template, 'base64'), 100);
        var reqTpl = new OnyxApi.FingerprintTemplate(new Buffer(data.template, 'base64'), 100);
        var ftv = new OnyxApi.FingerprintTemplateVector();
        ftv.push_back(dbTpl);
        // Do verification
        var result = OnyxApi.identify(ftv, reqTpl);
        console.log("result: ", result);
        var verified = false;
        if (result.score >= 34) {
            console.log('Template Verified');
            verified = true;
        }
        return {isVerified: verified, score: result.score};
    }
});
