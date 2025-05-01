const https = require('firebase-functions/v2/https');
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

admin.initializeApp();

const recursiveDelete = async (db, path) => {

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

};

exports.deleteFarmData = https.onCall(async (request)=>{

    const uid = request.auth.uid;

    console.log(`Deleting Farm data for UID ${uid}`);

    const ref = admin.firestore().doc(`User/${uid}`);

    const subColls = await ref.listCollections();

    for(const subcoll of subColls){
        const snapshot = await subcoll.get();
        if(!snapshot.empty){
            for(const doc of snapshot.docs){
                const docPath = `${subcoll.path}/${doc.id}`;
                console.log(docPath);
                await recursiveDelete(admin.firestore(), docPath);
            }
        }
    }

    return Promise.resolve();
});


exports.onUserDelete = functions.auth.user().onDelete(async (user)=>{

    console.log(`Deleting data for the ${user.phoneNumber}`);

    await recursiveDelete(admin.firestore(), `User/${user.uid}`);

    return Promise.resolve();

});
