import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_sign_in/google_sign_in.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<User?> get authStateChanges => _auth.authStateChanges();
  User? get currentUser => _auth.currentUser;

  Future<UserCredential> signInWithEmailAndPassword(
    String email,
    String password,
  ) async {
    return await _auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
  }

  Future<UserCredential?> signInWithGoogle() async {
    UserCredential? userCredential;

    try {
      // First attempt: Firebase Auth signInWithProvider (Web/Chrome Custom Tabs OAuth flow)
      // This uses Firebase Auth directly (the exact same setup as the web app)
      final googleProvider = GoogleAuthProvider();
      googleProvider.addScope('email');
      googleProvider.addScope('profile');
      userCredential = await _auth.signInWithProvider(googleProvider);
    } catch (e) {
      // Second attempt: Native Google Play Services SDK
      try {
        final GoogleSignIn googleSignIn = GoogleSignIn();
        final GoogleSignInAccount? googleUser = await googleSignIn.signIn();
        if (googleUser == null) return null; // User cancelled

        final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
        final OAuthCredential credential = GoogleAuthProvider.credential(
          accessToken: googleAuth.accessToken,
          idToken: googleAuth.idToken,
        );
        userCredential = await _auth.signInWithCredential(credential);
      } catch (e2) {
        throw Exception(
          'Google Sign-In requires your debug SHA-1 fingerprint (FE:13:15:2C:2E:89:AE:2B:C6:FC:1D:F8:AF:E0:A5:25:A0:96:92:83) to be registered in Firebase Console under Project Settings > Your Android App.',
        );
      }
    }

    final user = userCredential.user;
    if (user != null) {
      final docRef = _firestore.collection('users').doc(user.uid);
      final docSnap = await docRef.get();

      bool isEmailAdmin = false;
      final cleanEmail = user.email?.toLowerCase().trim() ?? '';
      if (cleanEmail == 'egdmadhankumar@gmail.com') {
        isEmailAdmin = true;
      } else {
        try {
          final adminSnap = await _firestore.collection('adminConfig').doc('settings').get();
          if (adminSnap.exists) {
            final data = adminSnap.data();
            final emails = (data?['adminEmails'] as List?)?.map((e) => e.toString().toLowerCase().trim()).toList() ?? [];
            final primary = data?['primaryAdmin']?.toString().toLowerCase().trim() ?? '';
            if (emails.contains(cleanEmail) || primary == cleanEmail) {
              isEmailAdmin = true;
            }
          }
        } catch (_) {}
      }

      if (!docSnap.exists) {
        await docRef.set({
          'email': user.email,
          'displayName': user.displayName ?? user.email?.split('@').first ?? 'User',
          'currency': 'INR',
          'currencySymbol': '₹',
          'status': 'active',
          'disabled': false,
          'role': isEmailAdmin ? 'admin' : 'user',
          'createdAt': Timestamp.now(),
        });
      } else if (isEmailAdmin && docSnap.data()?['role'] != 'admin') {
        await docRef.set({'role': 'admin'}, SetOptions(merge: true));
      }
    }

    return userCredential;
  }

  Future<UserCredential> createUserWithEmailAndPassword({
    required String email,
    required String password,
    String? displayName,
  }) async {
    final credential = await _auth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );

    final user = credential.user;
    if (user != null) {
      if (displayName != null && displayName.isNotEmpty) {
        await user.updateDisplayName(displayName);
      }

      bool isEmailAdmin = false;
      final cleanEmail = user.email?.toLowerCase().trim() ?? '';
      if (cleanEmail == 'egdmadhankumar@gmail.com') {
        isEmailAdmin = true;
      } else {
        try {
          final adminSnap = await _firestore.collection('adminConfig').doc('settings').get();
          if (adminSnap.exists) {
            final data = adminSnap.data();
            final emails = (data?['adminEmails'] as List?)?.map((e) => e.toString().toLowerCase().trim()).toList() ?? [];
            final primary = data?['primaryAdmin']?.toString().toLowerCase().trim() ?? '';
            if (emails.contains(cleanEmail) || primary == cleanEmail) {
              isEmailAdmin = true;
            }
          }
        } catch (_) {}
      }

      // Initialize user document in Firestore (Same structure as website)
      await _firestore.collection('users').doc(user.uid).set({
        'email': user.email,
        'displayName': displayName ?? user.email?.split('@').first ?? 'User',
        'currency': 'INR',
        'currencySymbol': '₹',
        'status': 'active',
        'disabled': false,
        'role': isEmailAdmin ? 'admin' : 'user',
        'createdAt': Timestamp.now(),
      });

      // Send email verification
      await user.sendEmailVerification();
    }

    return credential;
  }

  Future<void> sendPasswordResetEmail(String email) async {
    final cleanEmail = email.toLowerCase().trim();
    if (cleanEmail.isEmpty) throw Exception('Please enter your email address');

    // Restrict reset email if user is disabled
    try {
      final snap = await _firestore
          .collection('users')
          .where('email', isEqualTo: cleanEmail)
          .limit(1)
          .get();
      if (snap.docs.isNotEmpty) {
        final data = snap.docs.first.data();
        if (data['status'] == 'disabled' || data['disabled'] == true) {
          throw Exception('Your ID is restricted');
        }
      }
    } on Exception catch (e) {
      if (e.toString().contains('Your ID is restricted')) rethrow;
    }

    await _auth.sendPasswordResetEmail(email: cleanEmail);
  }

  Future<void> reloadUser() async {
    await _auth.currentUser?.reload();
  }

  Future<void> signOut() async {
    try {
      await GoogleSignIn().signOut();
    } catch (_) {}
    await _auth.signOut();
  }
}
