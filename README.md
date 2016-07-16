# Build / Deploy

```
cd onyxmeteor/app

meteor build --directory ../build/

cd ../config/production/

source env.sh

cd ../../build/bundle/programs/server/

npm install

cd ../../

forever -a -l OnyxMeteor.log -o OnyxMeteorOut.log -e OnyxMeteorErrors.log start main.js

```

# Verify deployment

```
mongo OnyxMeteor

db.api_keys.find().pretty()

```

***Sample output***

```
> db.api_keys.find().pretty()
{
	"_id" : "4BaSXiH2xHAzMy7nA",
	"owner" : "8wBx8xzBET5q5shkX",
	"key" : "51f6b93bf5f20e192195e9ac9879fd98"
}
>
```

***copy the "key" value***

Paste the api key into the enroll.js and verify.js files

```
exit

cd ~/path/to/onyxmeteor/bin/test/

npm install

vi enroll.js

vi verify.js

```

paste the api key value into the `requestJson.api_key`
make sure the **localhost:port** is correct for the request url
save the changes and exit

## Test Enroll

```
node enroll.js
```

**Sample output**

```
body: { userId: 'Y6qG46CQnfCcfJ2iJ',
  success: true,
  message: 'Successfully enrolled fingerprint.' }
```

**copy the userId**

###Error Message

Will return the userId of the existing matched fingerprint in the database.

```
body: { userId: 'QPvKAADjaQD54NEXQ',
  success: false,
  message: 'Duplicate fingerprint found.' }
```

## Test Verify

```
vi verify.js
```
Edit  verify.js and insert the userId into the requestJson.

```
node verify.js
```

***Sample output***

```
body: { isVerified: true, score: 9339 }
```

###Error message

```
onyxmeteor/bin/test$ node verify.js
body: { error:
   { error: 'not-enrolled',
     reason: 'No fingerprint enrolled.',
     message: 'No fingerprint enrolled. [not-enrolled]',
     errorType: 'Meteor.Error' },
  message: 'Error executing onyx verification.' }
```

