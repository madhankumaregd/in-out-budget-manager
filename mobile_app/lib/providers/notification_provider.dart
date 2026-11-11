import 'dart:async';
import 'package:flutter/material.dart';
import '../models/notification_model.dart';
import '../models/account_model.dart';
import '../models/transaction_model.dart';
import '../services/notification_service.dart';

class NotificationProvider extends ChangeNotifier {
  final NotificationService _service = NotificationService();

  String? _userId;
  StreamSubscription<List<NotificationModel>>? _sub;
  List<NotificationModel> _notifications = [];
  final Set<String> _shownNotificationIds = {};
  bool _isLoading = false;
  DateTime? _lastEvaluation;

  List<NotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;
  int get unreadCount => _notifications.where((n) => !n.read).length;

  void setUser(String? userId) {
    if (_userId == userId) return;
    _userId = userId;

    _sub?.cancel();
    if (userId != null && userId.isNotEmpty) {
      _isLoading = true;
      notifyListeners();

      _sub = _service.streamNotifications(userId).listen((items) {
        // Pushes newly arrived unread notifications to Android system status bar
        final now = DateTime.now();
        for (final item in items) {
          if (!item.read &&
              !_shownNotificationIds.contains(item.id) &&
              now.difference(item.createdAt).inHours < 24) {
            _shownNotificationIds.add(item.id);
            _service.showSystemNotification(
              title: item.title,
              body: item.message,
              id: item.id.hashCode.abs().remainder(100000),
            );
          }
        }
        _notifications = items;
        _isLoading = false;
        notifyListeners();
      }, onError: (err) {
        _isLoading = false;
        notifyListeners();
      });
    } else {
      _notifications = [];
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> requestPermission() async {
    return await _service.requestNotificationPermission();
  }

  /// Triggers intelligent notifications check (throttled to once every 30 seconds)
  Future<void> evaluate({
    required List<AccountModel> accounts,
    required List<TransactionModel> transactions,
    String currencySymbol = '₹',
  }) async {
    if (_userId == null || _userId!.isEmpty) return;

    final now = DateTime.now();
    if (_lastEvaluation != null &&
        now.difference(_lastEvaluation!).inSeconds < 15) {
      return;
    }
    _lastEvaluation = now;

    await _service.evaluateAndSyncNotifications(
      userId: _userId!,
      accounts: accounts,
      transactions: transactions,
      currencySymbol: currencySymbol,
    );
  }

  Future<void> markAsRead(String notificationId) async {
    if (_userId == null) return;
    await _service.markAsRead(_userId!, notificationId);
  }

  Future<void> markAllAsRead() async {
    if (_userId == null) return;
    await _service.markAllAsRead(_userId!);
  }

  Future<void> deleteNotification(String notificationId) async {
    if (_userId == null) return;
    await _service.deleteNotification(_userId!, notificationId);
  }

  Future<void> clearAll() async {
    if (_userId == null) return;
    await _service.clearAll(_userId!);
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

