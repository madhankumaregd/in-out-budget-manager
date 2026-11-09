import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../models/user_profile_model.dart';
import '../core/constants/app_constants.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final FirestoreService _firestoreService = FirestoreService();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  User? _currentUser;
  UserProfileModel? _userProfile;
  StreamSubscription<User?>? _authSub;
  StreamSubscription<UserProfileModel?>? _profileSub;
  StreamSubscription<DocumentSnapshot>? _adminConfigSub;
  List<String> _authorizedAdmins = [AppConstants.defaultPrimaryAdmin.toLowerCase()];

  bool _isLoading = true;
  String? _errorMessage;
  bool _accountDisabledNotice = false;

  User? get currentUser => _currentUser;
  UserProfileModel? get userProfile => _userProfile;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _currentUser != null;
  String? get errorMessage => _errorMessage;
  bool get accountDisabledNotice => _accountDisabledNotice;
  List<String> get authorizedAdmins => _authorizedAdmins;

  String get currencySymbol =>
      _userProfile?.currencySymbol ??
      AppConstants.getCurrencySymbol(_userProfile?.currency ?? 'INR');

  bool get isUserAdmin {
    if (_currentUser == null) return false;
    final email = _currentUser?.email?.toLowerCase().trim();
    if (email == null || email.isEmpty) return false;
    return email == AppConstants.defaultPrimaryAdmin.toLowerCase() ||
        _userProfile?.role == 'admin' ||
        _authorizedAdmins.contains(email);
  }

  bool get isUserDisabled =>
      _accountDisabledNotice ||
      (_userProfile != null &&
          (_userProfile!.disabled || _userProfile!.status == 'disabled'));

  bool get needsOnboarding {
    if (_currentUser == null) return false;
    if (!_currentUser!.emailVerified) return true;
    if (_userProfile == null) return true;
    if (_userProfile!.phone == null || _userProfile!.phone!.isEmpty) return true;
    if (_userProfile!.displayName.isEmpty) return true;
    return false;
  }

  AuthProvider() {
    _init();
  }

  void _init() {
    // Real-time synchronization of authorized admins list
    _adminConfigSub = _firestore
        .collection('adminConfig')
        .doc('settings')
        .snapshots()
        .listen((snap) {
      if (snap.exists && snap.data() != null) {
        final data = snap.data()!;
        final emails = <String>{};
        if (data['primaryAdmin'] is String) {
          final p = (data['primaryAdmin'] as String).toLowerCase().trim();
          if (p.isNotEmpty) emails.add(p);
        }
        if (data['adminEmails'] is List) {
          for (final e in (data['adminEmails'] as List)) {
            if (e is String && e.trim().isNotEmpty) {
              emails.add(e.toLowerCase().trim());
            }
          }
        }
        _authorizedAdmins = emails.toList();
        notifyListeners();
      }
    }, onError: (_) {});

    _authSub = _authService.authStateChanges.listen((user) {
      _currentUser = user;
      _profileSub?.cancel();

      if (user != null) {
        _profileSub = _firestoreService.getUserProfileStream(user.uid).listen((profile) {
          if (profile != null) {
            // Check if administrator has disabled this user
            if (profile.disabled || profile.status == 'disabled') {
              _accountDisabledNotice = true;
              signOut();
              notifyListeners();
              return;
            }
          }
          _userProfile = profile;
          _isLoading = false;
          notifyListeners();
        });
      } else {
        _userProfile = null;
        _isLoading = false;
        notifyListeners();
      }
    });
  }

  Future<void> reloadUser() async {
    if (_currentUser != null) {
      await _currentUser!.reload();
      _currentUser = _authService.currentUser;
      notifyListeners();
    }
  }

  Future<void> addCustomCategory(String category, String type) async {
    if (_currentUser == null) return;
    await _firestoreService.addCustomCategory(_currentUser!.uid, category, type);
    notifyListeners();
  }

  void clearDisabledNotice() {
    _accountDisabledNotice = false;
    notifyListeners();
  }

  Future<bool> checkEmailVerified() async {
    if (_currentUser == null) return false;
    await _currentUser!.reload();
    _currentUser = _authService.currentUser;
    notifyListeners();
    return _currentUser?.emailVerified ?? false;
  }

  Future<bool> updatePhone(String fullPhone) async {
    if (_currentUser == null) return false;
    try {
      await _firestoreService.updateUserProfile(_currentUser!.uid, {'phone': fullPhone});
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> signIn(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _authService.signInWithEmailAndPassword(email, password);
    } on FirebaseAuthException catch (e) {
      _errorMessage = _getFriendlyAuthError(e.code);
      _isLoading = false;
      notifyListeners();
      throw Exception(_errorMessage);
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<bool> signInWithGoogle() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final credential = await _authService.signInWithGoogle();
      if (credential == null) {
        _isLoading = false;
        notifyListeners();
        return false;
      }
      return true;
    } on FirebaseAuthException catch (e) {
      _errorMessage = _getFriendlyAuthError(e.code);
      _isLoading = false;
      notifyListeners();
      throw Exception(_errorMessage);
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> signUp({
    required String email,
    required String password,
    String? displayName,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _authService.createUserWithEmailAndPassword(
        email: email,
        password: password,
        displayName: displayName,
      );
    } on FirebaseAuthException catch (e) {
      _errorMessage = _getFriendlyAuthError(e.code);
      _isLoading = false;
      notifyListeners();
      throw Exception(_errorMessage);
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> resetPassword(String email) async {
    try {
      await _authService.sendPasswordResetEmail(email);
    } catch (e) {
      rethrow;
    }
  }

  Future<bool> updateProfile({
    String? displayName,
    String? phone,
    String? currency,
  }) async {
    if (_currentUser == null) return false;
    try {
      final updates = <String, dynamic>{};
      if (displayName != null) updates['displayName'] = displayName.trim();
      if (phone != null) updates['phone'] = phone.trim();
      if (currency != null) {
        updates['currency'] = currency;
        updates['currencySymbol'] = AppConstants.getCurrencySymbol(currency);
      }

      await _firestoreService.updateUserProfile(_currentUser!.uid, updates);
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> signOut() async {
    await _profileSub?.cancel();
    await _authService.signOut();
    _currentUser = null;
    _userProfile = null;
    notifyListeners();
  }

  String _getFriendlyAuthError(String code) {
    switch (code) {
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':
        return 'Invalid email address or password';
      case 'email-already-in-use':
        return 'An account already exists with this email';
      case 'weak-password':
        return 'Password must be at least 6 characters';
      case 'invalid-email':
        return 'Please enter a valid email address';
      default:
        return 'Authentication failed. Please check your network and try again.';
    }
  }

  @override
  void dispose() {
    _adminConfigSub?.cancel();
    _authSub?.cancel();
    _profileSub?.cancel();
    super.dispose();
  }
}
