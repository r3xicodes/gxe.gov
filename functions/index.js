const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();

// Load SendGrid API key from functions config or env
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || functions.config().sendgrid?.key || '';
// AUTO_EMAILS determines whether the function will automatically send approval emails.
// Default is false to allow manual notification. Set to 'true' in env or functions config to enable automated emails.
const AUTO_EMAILS = (process.env.AUTO_EMAILS || (functions.config().sendgrid?.auto_emails) || 'false').toString().toLowerCase() === 'true';
if(SENDGRID_API_KEY && AUTO_EMAILS) sgMail.setApiKey(SENDGRID_API_KEY);

// Callable function to approve a user (must be called by an authenticated admin)
exports.approveUser = functions.https.onCall(async (data, context) => {
  // Basic auth check
  if(!context.auth) throw new functions.https.HttpsError('unauthenticated','The function must be called while authenticated.');
  const callerUid = context.auth.uid;
  // Optionally check caller custom claim 'admin'
  const callerToken = context.auth.token || {};
  if(!callerToken.admin) throw new functions.https.HttpsError('permission-denied','Caller is not an admin.');

  const { uid, approve } = data;
  if(!uid) throw new functions.https.HttpsError('invalid-argument','Missing uid.');

  try{
    const db = admin.firestore();
    await db.collection('users').doc(uid).update({ status: approve ? 'approved' : 'rejected', approvedAt: admin.firestore.FieldValue.serverTimestamp() });
    await admin.auth().setCustomUserClaims(uid, { approved: !!approve });
    return { ok:true };
  }catch(err){
    console.error('approveUser error', err);
    throw new functions.https.HttpsError('internal','Approval failed');
  }
});

// Firestore trigger: when a user's status changes to 'approved', send notification email
exports.onUserApproved = functions.firestore.document('users/{uid}').onUpdate(async (change, context) => {
  const before = change.before.data();
  const after = change.after.data();
  if(before && before.status === 'pending' && after && after.status === 'approved'){
    const email = after.email;
    const name = after.displayName || '';
    const nation = after.nationName || '';
  if(!email) return null;
  // Respect manual mode: only send emails when AUTO_EMAILS is true and SendGrid key exists
  if(!AUTO_EMAILS){ console.info('AUTO_EMAILS disabled; skipping automated notification (manual workflow).'); return null; }
  if(!SENDGRID_API_KEY) { console.warn('SendGrid not configured; skipping email'); return null; }
    const msg = {
      to: email,
      from: functions.config().admin?.email || 'no-reply@example.com',
      subject: 'Your GXE account has been approved',
      text: `Hello ${name},\n\nYour GXE account has been approved. You can now sign in and access the citizen dashboard.\n\nNation name: ${nation}\n\n— GXE`,
    };
    try{ await sgMail.send(msg); return null; }catch(e){ console.error('sendGrid error', e); return null; }
  }
  return null;
});
