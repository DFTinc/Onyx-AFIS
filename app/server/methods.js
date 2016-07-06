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
        var onyxTemplate = new Onyx.FingerprintTemplate(
            new Buffer(data.template, 'base64'), 100
        );

        var ftv = new Onyx.FingerprintTemplateVector();
        var fingerprints = Fingerprints.find({}).fetch();
        fingerprints.forEach(function (fingerprint, index) {
            var templateBuffer = new Buffer(fingerprint.template, 'base64');
            var onyxTemplate = new Onyx.FingerprintTemplate(templateBuffer, 100);
            ftv.push_back(onyxTemplate);
        });

        // Do identification
        var onyxResult = Onyx.identify(ftv, onyxTemplate);
        var returnResult = {
            match: false
        };
        if (onyxResult.score >= 34) {
            var match = fingerprints[onyxResult.index];
            returnResult.match = match._id;
        }
        return returnResult;
    },
    '/onyx/verify': function (data) {
        var Onyx = Meteor.npmRequire('onyx-node');
        var fingerprint = Fingerprints.findOne({_id: data.userId});
        if (!fingerprint) {
            throw new Meteor.Error("not-enrolled", "No fingerprint enrolled.");
        }
        var dbTpl = new Onyx.FingerprintTemplate(new Buffer(fingerprint.template, 'base64'), 100);
        var reqTpl = new Onyx.FingerprintTemplate(new Buffer(data.template, 'base64'), 100);
        var ftv = new Onyx.FingerprintTemplateVector();
        ftv.push_back(dbTpl);
        // Do verification
        var onyxResult = Onyx.identify(ftv, reqTpl);
        console.log("result: ", onyxResult);
        var verified = false;
        if (onyxResult.score >= 34) {
            console.log('Template Verified');
            verified = true;
        }
        return {isVerified: verified, score: onyxResult.score};
    }
});
