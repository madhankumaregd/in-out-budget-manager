import 'dart:async';
import 'package:flutter/material.dart';
import '../services/admin_service.dart';
import '../models/user_profile_model.dart';
import '../models/trash_item_model.dart';
import '../models/api_key_model.dart';
import '../core/constants/app_constants.dart';

class AdminProvider extends ChangeNotifier {
  final AdminService _adminService = AdminService();

  bool _isAuthenticated = false;
  String _adminEmail = '';
  String _primaryAdmin = AppConstants.defaultPrimaryAdmin;
  List<String> _adminEmails = [AppConstants.defaultPrimaryAdmin];
  String? _authError;

  List<UserProfileModel> _users = [];
  List<TrashItemModel> _trashItems = [];
  List<ApiKeyModel> _apiKeys = [];

  Map<String, dynamic>? _analytics;
  String _timeFilter = 'days';
  String? _customStart;
  String? _customEnd;
  bool _isLoading = false;

  StreamSubscription<List<UserProfileModel>>? _usersSub;
  StreamSubscription<List<TrashItemModel>>? _trashSub;
  StreamSubscription<List<ApiKeyModel>>? _apiKeysSub;

  bool get isAuthenticated => _isAuthenticated;
  bool get isAdminAuthenticated => _isAuthenticated;
  String? get adminEmail => _adminEmail.isEmpty ? null : _adminEmail;
  String get primaryAdmin => _primaryAdmin;
  List<String> get adminEmails => _adminEmails;
  String? get authError => _authError;

  bool get isPrimaryAdmin =>
      _adminEmail.toLowerCase() == _primaryAdmin.toLowerCase() ||
      _adminEmail.toLowerCase() == AppConstants.defaultPrimaryAdmin.toLowerCase();

  List<UserProfileModel> get users => _users;
  List<TrashItemModel> get trashItems => _trashItems;
  List<ApiKeyModel> get apiKeys => _apiKeys;
  Map<String, dynamic>? get analytics => _analytics;
  String get timeFilter => _timeFilter;
  String get selectedFilter => _timeFilter;
  bool get isLoading => _isLoading;
  bool get isAnalyticsLoading => _isLoading;

  Future<void> initAdmin() async {
    final list = await _adminService.getAdminAuthList();
    _primaryAdmin = list['primaryAdmin'] as String;
    _adminEmails = List<String>.from(list['adminEmails'] as List);
    notifyListeners();
  }

  Future<bool> authenticateAdmin({
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    _authError = null;
    notifyListeners();

    try {
      final clean = email.toLowerCase().trim();
      final isAuth = await _adminService.isAuthorizedAdmin(clean);
      if (!isAuth) {
        _authError = 'Access denied: "$clean" is not authorized as an administrator.';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      if (password != 'admin123' && password.length < 6) {
        _authError = 'Invalid administrator password';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      _isAuthenticated = true;
      _adminEmail = clean;
      _isLoading = false;

      _bindAdminStreams();
      await fetchAnalytics();
      notifyListeners();
      return true;
    } catch (e) {
      _authError = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> adminLogin(String email, String password) async {
    await authenticateAdmin(email: email, password: password);
  }

  void _bindAdminStreams() {
    _usersSub?.cancel();
    _trashSub?.cancel();
    _apiKeysSub?.cancel();

    _usersSub = _adminService.getAllUsersStream().listen((u) {
      _users = u;
      notifyListeners();
    });

    _trashSub = _adminService.getAllTrashStream().listen((t) {
      _trashItems = t;
      notifyListeners();
    });

    // Also fetch once directly to ensure trash documents are always loaded
    _adminService.fetchAllTrashOnce().then((items) {
      if (items.isNotEmpty) {
        _trashItems = items;
        notifyListeners();
      }
    });

    _apiKeysSub = _adminService.getApiKeysStream().listen((k) {
      _apiKeys = k;
      notifyListeners();
    });
  }

  Future<void> fetchAnalytics({bool isManual = false}) async {
    if (isManual) {
      _isLoading = true;
      notifyListeners();
    }

    try {
      _analytics = await _adminService.getDatabaseAnalytics(
        filter: _timeFilter,
        customStart: _customStart,
        customEnd: _customEnd,
        forceRefresh: isManual,
      );
    } catch (e) {
      // Keep previous telemetry if fetch fails
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void setTimeFilter(String filter) {
    if (_timeFilter == filter) return;
    _timeFilter = filter;

    // Instant zero-latency UI update using local cached document metrics
    if (_analytics != null) {
      _analytics = _adminService.computeAnalyticsForFilter(
        filter: filter,
        customStart: _customStart,
        customEnd: _customEnd,
      );
      notifyListeners();
    } else {
      fetchAnalytics();
    }
  }

  void setFilter(String filter) => setTimeFilter(filter);

  Future<void> setCustomRange(String start, String end) async {
    _timeFilter = 'custom';
    _customStart = start;
    _customEnd = end;
    if (_analytics != null) {
      _analytics = _adminService.computeAnalyticsForFilter(
        filter: 'custom',
        customStart: start,
        customEnd: end,
      );
      notifyListeners();
    } else {
      await fetchAnalytics();
    }
  }

  // ─── User Active/Disabled Toggle ───
  Future<void> toggleUserStatus(String userId, String currentStatus) async {
    final newStatus = await _adminService.toggleUserStatus(userId, currentStatus);
    final idx = _users.indexWhere((u) => u.uid == userId);
    if (idx != -1) {
      _users[idx] = _users[idx].copyWith(
        status: newStatus,
        disabled: newStatus == 'disabled',
      );
      notifyListeners();
    }
  }

  Future<void> toggleUserAccess(String userId, bool isDisabled) async {
    await toggleUserStatus(userId, isDisabled ? 'active' : 'disabled');
  }

  Future<void> deleteUser(String userId) async {
    await _adminService.deleteUserData(userId);
    _users.removeWhere((u) => u.uid == userId);
    notifyListeners();
  }

  // ─── Admin Role Delegation & Transfer ───
  Future<bool> addNewAdmin(String newEmailOrUid) async {
    try {
      await _adminService.addAdmin(newEmailOrUid);
      final list = await _adminService.getAdminAuthList();
      _adminEmails = List<String>.from(list['adminEmails'] as List);
      notifyListeners();
      return true;
    } catch (e) {
      _authError = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> removeAdmin(String emailOrUid) async {
    try {
      await _adminService.removeAdmin(emailOrUid);
      final list = await _adminService.getAdminAuthList();
      _adminEmails = List<String>.from(list['adminEmails'] as List);
      notifyListeners();
      return true;
    } catch (e) {
      _authError = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> transferAdmin(String newPrimaryEmail) async {
    try {
      await _adminService.transferAdmin(newPrimaryEmail, _adminEmail);
      adminLogout();
      return true;
    } catch (e) {
      _authError = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> transferOwnership(String newOwnerEmail) =>
      transferAdmin(newOwnerEmail);

  // ─── Trash & Danger Zone Methods ───
  Future<bool> verifyAdminPassword(String password) =>
      _adminService.verifyAdminPassword(password);

  Future<void> restoreTrashItem(TrashItemModel item) async {
    await _adminService.restoreFromTrashItem(item);
    final items = await _adminService.fetchAllTrashOnce();
    _trashItems = items;
    notifyListeners();
  }

  // ─── Manual Refresh Methods for Every Admin Page ───
  Future<void> refreshTrash() async {
    _isLoading = true;
    notifyListeners();
    try {
      final items = await _adminService.fetchAllTrashOnce();
      _trashItems = items;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshUsers() async {
    _isLoading = true;
    notifyListeners();
    try {
      final users = await _adminService.getAllUsersOnce();
      _users = users;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshApiKeys() async {
    _isLoading = true;
    notifyListeners();
    try {
      final keys = await _adminService.getApiKeysOnce();
      _apiKeys = keys;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshSettings() async {
    _isLoading = true;
    notifyListeners();
    try {
      final authList = await _adminService.getAdminAuthList();
      _primaryAdmin = authList['primaryAdmin'] as String? ?? AppConstants.defaultPrimaryAdmin;
      _adminEmails = List<String>.from(authList['adminEmails'] as List);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshCurrentTab(int tabIndex) async {
    switch (tabIndex) {
      case 0:
        await fetchAnalytics(isManual: true);
        break;
      case 1:
        await refreshUsers();
        break;
      case 2:
        await refreshSettings();
        break;
      case 3:
        await refreshTrash();
        break;
      case 4:
        await refreshApiKeys();
        break;
    }
  }

  Future<void> permanentDeleteTrashItem(TrashItemModel item) async {
    await _adminService.permanentDeleteTrash(item.userId, item.id);
    _trashItems.removeWhere((i) => i.id == item.id);
    notifyListeners();
  }

  Future<void> emptyAllTrash() async {
    await _adminService.emptyAllTrash();
    _trashItems.clear();
    notifyListeners();
  }

  Future<void> moveAllDataToTrash() async {
    await _adminService.moveAllDataToTrash();
    final items = await _adminService.fetchAllTrashOnce();
    _trashItems = items;
    notifyListeners();
  }

  Future<void> createApiKey(String name) async {
    await _adminService.createApiKey(
      name: name,
      description: 'API key generated from mobile console',
      permissions: ['read', 'write'],
      rateLimit: 100,
    );
  }

  Future<void> toggleApiKeyStatus(String keyId, bool newState) async {
    await _adminService.toggleApiKey(keyId, !newState);
  }

  Future<void> deleteApiKey(String keyId) async {
    await _adminService.deleteApiKey(keyId);
  }

  void adminLogout() {
    _isAuthenticated = false;
    _adminEmail = '';
    _usersSub?.cancel();
    _trashSub?.cancel();
    _apiKeysSub?.cancel();
    notifyListeners();
  }

  void signOutAdmin() => adminLogout();

  @override
  void dispose() {
    _usersSub?.cancel();
    _trashSub?.cancel();
    _apiKeysSub?.cancel();
    super.dispose();
  }
}
