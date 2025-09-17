// Example Google Cloud Function (Node.js) to approve a user and optionally set a custom claim.
// Deploy with the Firebase CLI or Google Cloud Functions. This requires the Firebase Admin SDK.

const admin = require('firebase-admin');

// Initialize the Admin SDK (the environment should have credentials set by Cloud Functions)
if(!admin.apps.length){
  admin.initializeApp();
}

exports.approveUser = async (req, res) => {
  // Basic HTTP function: expects POST with JSON { uid: 'UID', approve: true }
  if(req.method !== 'POST') return res.status(405).send('Method not allowed');
  const { uid, approve } = req.body || {};
  if(!uid) return res.status(400).send('Missing uid');
  try{
    // Update Firestore user doc
    const db = admin.firestore();
    await db.collection('users').doc(uid).update({ status: approve ? 'approved' : 'rejected', approvedAt: admin.firestore.FieldValue.serverTimestamp() });
    // Optionally set a custom claim 'admin' or 'approved'
    if(approve){
      await admin.auth().setCustomUserClaims(uid, { approved: true });
    } else {
      await admin.auth().setCustomUserClaims(uid, { approved: false });
    }
    return res.status(200).send({ok:true});
  }catch(err){ console.error(err); return res.status(500).send({error: err.message}); }
};
