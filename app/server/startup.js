Meteor.startup(function () {
    if (Meteor.users.find().count() == 0) {
        var users = [
            {
                name: "DataReveal Admin",
                username: "datarevealadmin",
                roles: ['admin'],
                password: "d@t@r3v3@l@dm1n"
            }
        ];

        _.each(users, function (user) {
            var userId = Accounts.createUser({
                username: user.username,
                password: user.password,
                profile: {name: user.name}
            });

            var newKey = Random.hexString(32);

            var key = APIKeys.insert({
                "owner": userId,
                "key": newKey
            }, function (error, result) {
                if (error) {
                    console.log("Error inserting API Key: " + error.reason);
                } else {
                    console.log("Successfully created API Key for user.");
                }
            });

            if (user.roles.length > 0) {
                Roles.addUsersToRoles(userId, user.roles);
            }
        });
    };
});
