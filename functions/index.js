const https = require('firebase-functions/v2/https');
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

admin.initializeApp();

/*const recursiveDelete = async (db, path) => {

    const funDelete = async (docref) => {  

        const subColls = await docref.listCollections();

        const subCollIds = subColls.map(col => col.id);

        console.log(subCollIds);

        for(const subColl of subColls){
            const snapshot = await subColl.get();

            if(snapshot.empty){
                return;
            }

            for(const doc of snapshot.docs){
                const docPath = `${subColl.path}/${doc.id}`;
                console.log(docPath);
                const subDocRef = db.doc(docPath);
                await funDelete(subDocRef);
            }
        }

        try {
        const batch = db.batch();
        batch.delete(docref);
        await batch.commit();
        }
        catch(error){
            console.error('Error in deleting the document!'+error);
        }

    };

    const ref = db.doc(path);
    await funDelete(ref);

};*/

exports.deleteFarmData = https.onCall(async (request)=>{

    const uid = request.auth.uid;

    console.log(`Deleting Farm data for UID ${uid}`);

    const db = admin.firestore();
    const ref = db.doc(`User/${uid}`);

    const subColls = await ref.listCollections();

    promiseArray = [];

    for(const subcoll of subColls){
        const snapshot = await subcoll.get();
        if(!snapshot.empty){
            for(const doc of snapshot.docs){
                const docPath = `${subcoll.path}/${doc.id}`;
                console.log(docPath);
                const docRef = db.doc(docPath);
                promiseArray.push(new Promise(resolve => db.recursiveDelete(docRef)));
            }
        }
    }

    const results = await Promise.allSettled(promiseArray);
    return Promise.resolve();
});


exports.onUserDelete = functions.auth.user().onDelete(async (user)=>{

    console.log(`Deleting data for the ${user.phoneNumber}`);

    const db = admin.firestore();

    const ref = db.doc(`User/${user.uid}`);

     await db.recursiveDelete(ref);

    //await recursiveDelete(admin.firestore(), `User/${user.uid}`);

    return Promise.resolve();

});

/*const recursiveSearch = async (db, docref) => {
   const funUpdate = async (docref) => {

       const subColls = await docref.listCollections();
       for(const subColl of subColls){
          console.log(subColl.path);
          if((subColl.path).includes('Milk')){
            const snapshot = await subColl.get();
            if(snapshot.empty){
                return;
            }
            for(const doc of snapshot.docs){
                const docPath = `${subColl.path}/${doc.id}`;
                console.log(docPath);
                const subDocRef = db.doc(docPath);
                const docSnapshot = await subDocRef.get();
                if(docSnapshot.exists){
                    const docData = docSnapshot.data();
                    if(docData['rfid'] !== undefined){
                        console.log("inside rfid");
                        rfidVal = docData['rfid'];
                        morVal = docData['morning'];
                        eveVal = docData['evening'];
                        dateVal = docData['dateOfMilk'];

                        if((subColl.path).endsWith('Store')){
                            await subDocRef.delete();
                            await subDocRef.set({
                                id: rfidVal.toString(),
                                morning: morVal,
                                evening: eveVal,
                                dateOfMilk: dateVal
                            });
                        }
                    }
                }
                await funUpdate(subDocRef);
            }
          }
       }
   };
   await funUpdate(docref);
};

exports.updateAllUsersMilkStoreField = functions.https.onRequest(async (req, res) => {
    try {
        const db = await admin.firestore();
        const usersCollRef = await db.collection('User');
        //console.log(typeof usersCollRef);
        const snapshot = await usersCollRef.get();
        //console.log(typeof snapshot.docs);

        if(snapshot.empty){
            console.log("No data to update!");
        }
        else{
            for(const doc of snapshot.docs){
                const docPath = `${usersCollRef.path}/${doc.id}`;
                console.log(docPath);
                const subDocRef = db.doc(docPath);
                console.log(`Updating field for the user id ${doc.id}`);
                await recursiveSearch(db, subDocRef);
            }
        }

        res.send(Promise.resolve());

    } catch (error) {
        if (error.code === 7 || error.message.includes('permission denied')) {
            // Permission denied error codes/messages
            res.status(403).send('Access denied to Firestore.');
        } else {
            res.status(500).send('Error accessing Firestore: ' + error.message);
        }
    }
});*/

exports.sendMilkEntryNotifications = functions.https.onRequest(async (req, res) => {
    let userTokens = [];
    try {
        const db = await admin.firestore();
        const usersCollRef = await db.collection('User');
        //console.log(typeof usersCollRef);
        const snapshot = await usersCollRef.get();
        //console.log(typeof snapshot.docs);

        if(snapshot.empty){
            console.log("No users to send Notifications!");
        }
        else{
            for(const doc of snapshot.docs){
                const docPath = `${usersCollRef.path}/${doc.id}`;
                //console.log(docPath);
                const subDocRef = db.doc(docPath);
                console.log(`Adding token of the user id ${doc.id}`);

                const docSnapshot = await subDocRef.get();
                //console.log('I am here!!!!!!!');
                if(docSnapshot.exists){
                    const docData = docSnapshot.data();
                    if(docData['fcmToken'] !== undefined && docData['fcmToken'] != '' && docData['fcmToken'] != null){
                        userTokens.push(docData['fcmToken']);
                    }
                }
            }
        }

    } catch (error) {
        if (error.code === 7 || error.message.includes('permission denied')) {
            // Permission denied error codes/messages
            res.status(403).send('Access denied to Firestore.');
        } else {
            res.status(500).send('Error accessing Firestore: ' + error.message);
        }
    }

    //console.log(userTokens);

    if(userTokens.length != 0){
        const message = {
            notification: {
                title: 'Milk entry reminder!',
                body: 'It\'s time to make milk entry for today!!'
            },
            tokens: userTokens, // Send to multiple tokens
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log('Successfully sent message:', response);
        } catch (error) {
            console.error('Error sending message:', error);
        }
        res.status(200).send('Successfully sent message!');
    }
    else{
        res.status(200).send('No tokens to send Notifications!');
    }

});