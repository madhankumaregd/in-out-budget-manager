import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:intl/intl.dart';
import '../models/notification_model.dart';
import '../models/account_model.dart';
import '../models/transaction_model.dart';

class NotificationService {
  static final NotificationService instance = NotificationService._internal();
  factory NotificationService() => instance;
  NotificationService._internal();

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  bool _isLocalInitialized = false;
  bool _hasShownWelcomeNotif = false;

  /// Initialize local notification channels and platform settings
  Future<void> initLocalNotifications() async {
    if (_isLocalInitialized) return;

    try {
      const androidSettings =
          AndroidInitializationSettings('@mipmap/ic_launcher');
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: false,
        requestBadgePermission: false,
        requestSoundPermission: false,
      );

      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      await _localNotifications.initialize(
        settings: initSettings,
        onDidReceiveNotificationResponse: (response) {
          // Can navigate to notification sheet or specific transaction if tapped
        },
      );

      // Create Android Notification Channel for Financial Alerts
      final androidImplementation = _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();

      if (androidImplementation != null) {
        const channel = AndroidNotificationChannel(
          'in_out_alerts',
          'Financial Alerts & Security',
          description:
              'Low balance alerts, daily transaction summaries, and security notifications',
          importance: Importance.max,
          enableVibration: true,
          playSound: true,
        );
        await androidImplementation.createNotificationChannel(channel);
      }

      _isLocalInitialized = true;
    } catch (_) {
      // Safe fallback
    }
  }

  /// Explicitly prompt user for Android 13+ and iOS Notification Permissions
  Future<bool> requestNotificationPermission() async {
    try {
      if (!_isLocalInitialized) {
        await initLocalNotifications();
      }

      // Android 13+ (API 33+) native runtime permission prompt
      final androidImplementation = _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();
      if (androidImplementation != null) {
        final granted =
            await androidImplementation.requestNotificationsPermission();
        if (granted == true && !_hasShownWelcomeNotif) {
          _hasShownWelcomeNotif = true;
          await showSystemNotification(
            title: 'IN & OUT Notifications Enabled',
            body: 'You will receive daily financial summaries and security alerts for low balances.',
            id: 1001,
          );
        }
        return granted ?? false;
      }

      // iOS permission prompt
      final iosImplementation = _localNotifications
          .resolvePlatformSpecificImplementation<
              IOSFlutterLocalNotificationsPlugin>();
      if (iosImplementation != null) {
        final granted = await iosImplementation.requestPermissions(
          alert: true,
          badge: true,
          sound: true,
        );
        return granted ?? false;
      }

      return false;
    } catch (_) {
      return false;
    }
  }

  /// Fire a heads-up system notification into the phone's notification shade
  Future<void> showSystemNotification({
    required String title,
    required String body,
    int? id,
    String? payload,
  }) async {
    try {
      if (!_isLocalInitialized) {
        await initLocalNotifications();
      }

      const androidDetails = AndroidNotificationDetails(
        'in_out_alerts',
        'Financial Alerts & Security',
        channelDescription:
            'Low balance alerts, daily transaction summaries, and security notifications',
        importance: Importance.max,
        priority: Priority.high,
        enableVibration: true,
        playSound: true,
        showWhen: true,
        icon: '@mipmap/ic_launcher',
      );

      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      const details = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      final notifId =
          id ?? DateTime.now().millisecondsSinceEpoch.remainder(100000);
      await _localNotifications.show(
        id: notifId,
        title: title,
        body: body,
        notificationDetails: details,
        payload: payload,
      );
    } catch (_) {
      // Safe fallback
    }
  }

  CollectionReference<Map<String, dynamic>> _userNotificationsRef(
      String userId) {
    return _firestore
        .collection('users')
        .doc(userId)
        .collection('notifications');
  }

  /// Stream notifications for a user, newest first
  Stream<List<NotificationModel>> streamNotifications(String userId) {
    return _userNotificationsRef(userId)
        .orderBy('createdAt', descending: true)
        .limit(50)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => NotificationModel.fromFirestore(doc))
            .toList());
  }

  /// Mark single notification as read
  Future<void> markAsRead(String userId, String notificationId) async {
    try {
      await _userNotificationsRef(userId)
          .doc(notificationId)
          .update({'read': true});
    } catch (e) {
      // If doc doesn't exist or error, ignore
    }
  }

  /// Mark all notifications as read
  Future<void> markAllAsRead(String userId) async {
    try {
      final unreadDocs = await _userNotificationsRef(userId)
          .where('read', isEqualTo: false)
          .get();
      if (unreadDocs.docs.isEmpty) return;

      final batch = _firestore.batch();
      for (final doc in unreadDocs.docs) {
        batch.update(doc.reference, {'read': true});
      }
      await batch.commit();
    } catch (e) {
      // Silent error
    }
  }

  /// Delete a single notification
  Future<void> deleteNotification(String userId, String notificationId) async {
    try {
      await _userNotificationsRef(userId).doc(notificationId).delete();
    } catch (e) {
      // Silent error
    }
  }

  /// Clear all notifications for user
  Future<void> clearAll(String userId) async {
    try {
      final allDocs = await _userNotificationsRef(userId).limit(100).get();
      if (allDocs.docs.isEmpty) return;

      final batch = _firestore.batch();
      for (final doc in allDocs.docs) {
        batch.delete(doc.reference);
      }
      await batch.commit();
    } catch (e) {
      // Silent error
    }
  }

  /// Evaluate accounts and transactions and create system / security notifications
  Future<void> evaluateAndSyncNotifications({
    required String userId,
    required List<AccountModel> accounts,
    required List<TransactionModel> transactions,
    String currencySymbol = '₹',
  }) async {
    if (userId.isEmpty) return;

    final now = DateTime.now();
    final todayStr = DateFormat('yyyy-MM-dd').format(now);
    final batch = _firestore.batch();
    bool hasWrites = false;

    // 1. SECURITY ALERT: Low balance in bank accounts (< 1k, i.e. < 1000)
    // Only triggers once per day per account to prevent notification spam
    for (final acc in accounts) {
      final isBankOrWallet = acc.type == 'bank' || acc.type == 'wallet';
      if (isBankOrWallet && acc.balance < 1000 && acc.balance >= 0) {
        final docId = 'low_bal_${acc.id}_$todayStr';
        final docRef = _userNotificationsRef(userId).doc(docId);

        // Check if doc exists
        final snap = await docRef.get();
        if (!snap.exists) {
          final title = 'Security Alert: Low Bank Balance';
          final message =
              'Account "${acc.name}" balance has dropped to $currencySymbol${acc.balance.toStringAsFixed(2)}, which is below the safe threshold of $currencySymbol 1,000.';

          batch.set(docRef, {
            'title': title,
            'message': message,
            'type': 'security_low_balance',
            'severity': 'warning',
            'read': false,
            'createdAt': FieldValue.serverTimestamp(),
            'metadata': {
              'accountId': acc.id,
              'accountName': acc.name,
              'balance': acc.balance,
              'threshold': 1000,
            },
          });
          hasWrites = true;

          // Fire native Android system notification
          await showSystemNotification(
            title: title,
            body: message,
            id: acc.id.hashCode.abs().remainder(100000),
          );
        }
      } else if (acc.balance < 0) {
        // Critical: Overdrawn account
        final docId = 'overdrawn_${acc.id}_$todayStr';
        final docRef = _userNotificationsRef(userId).doc(docId);
        final snap = await docRef.get();
        if (!snap.exists) {
          final title = 'Critical: Overdrawn Account';
          final message =
              'Account "${acc.name}" has an overdraft balance of -$currencySymbol${acc.balance.abs().toStringAsFixed(2)}. Immediate action required.';

          batch.set(docRef, {
            'title': title,
            'message': message,
            'type': 'overdraft',
            'severity': 'danger',
            'read': false,
            'createdAt': FieldValue.serverTimestamp(),
            'metadata': {
              'accountId': acc.id,
              'accountName': acc.name,
              'balance': acc.balance,
            },
          });
          hasWrites = true;

          // Fire native Android system notification
          await showSystemNotification(
            title: title,
            body: message,
            id: acc.id.hashCode.abs().remainder(100000),
          );
        }
      }
    }

    // 2. DAILY FINANCIAL SUMMARY: One notification for day's expense/income/transactions
    final todayTxs = transactions.where((t) {
      return t.date.year == now.year &&
          t.date.month == now.month &&
          t.date.day == now.day;
    }).toList();

    if (todayTxs.isNotEmpty) {
      final todayExpense = todayTxs
          .where((t) => t.type == 'expense')
          .fold(0.0, (acc, t) => acc + t.amount);
      final todayIncome = todayTxs
          .where((t) => t.type == 'income')
          .fold(0.0, (acc, t) => acc + t.amount);
      final txCount = todayTxs.length;

      final summaryDocId = 'daily_summary_$todayStr';
      final summaryDocRef = _userNotificationsRef(userId).doc(summaryDocId);
      final snap = await summaryDocRef.get();

      final summaryMsg = StringBuffer();
      summaryMsg.write('Today: $txCount transaction${txCount > 1 ? 's' : ''}. ');
      if (todayExpense > 0) {
        summaryMsg
            .write('Spent $currencySymbol${todayExpense.toStringAsFixed(2)}');
      } else {
        summaryMsg.write('No expenses yet');
      }
      if (todayIncome > 0) {
        summaryMsg.write(
            ' · Earned +$currencySymbol${todayIncome.toStringAsFixed(2)}');
      }

      final title = 'Daily Financial Summary';
      final message = summaryMsg.toString();

      if (!snap.exists) {
        batch.set(summaryDocRef, {
          'title': title,
          'message': message,
          'type': 'daily_summary',
          'severity': 'info',
          'read': false,
          'createdAt': FieldValue.serverTimestamp(),
          'metadata': {
            'date': todayStr,
            'txCount': txCount,
            'expense': todayExpense,
            'income': todayIncome,
          },
        });
        hasWrites = true;

        // Fire native Android system notification
        await showSystemNotification(
          title: title,
          body: message,
          id: 99999,
        );
      } else {
        // If summary exists, update the text and amounts without unmarking read if user already opened it
        final existingData = snap.data();
        final prevCount = existingData?['metadata']?['txCount'] ?? 0;
        if (prevCount != txCount) {
          batch.update(summaryDocRef, {
            'message': message,
            'metadata.txCount': txCount,
            'metadata.expense': todayExpense,
            'metadata.income': todayIncome,
          });
          hasWrites = true;
        }
      }
    }

    // 3. HIGH EXPENSE NOTIFICATION (Single expense >= 10,000)
    final recentHighExpenses = transactions
        .where((t) =>
            t.type == 'expense' &&
            t.amount >= 10000 &&
            t.date.isAfter(now.subtract(const Duration(days: 7))))
        .take(5);

    for (final tx in recentHighExpenses) {
      final docId = 'high_exp_${tx.id}';
      final docRef = _userNotificationsRef(userId).doc(docId);
      final snap = await docRef.get();
      if (!snap.exists) {
        final categoryOrDesc =
            tx.description.isNotEmpty ? tx.description : tx.category;
        final title = 'High Expense Recorded';
        final message =
            'A high expense of $currencySymbol${tx.amount.toStringAsFixed(2)} was recorded for "$categoryOrDesc".';

        batch.set(docRef, {
          'title': title,
          'message': message,
          'type': 'high_expense',
          'severity': 'warning',
          'read': false,
          'createdAt': Timestamp.fromDate(tx.date),
          'metadata': {
            'transactionId': tx.id,
            'amount': tx.amount,
            'category': tx.category,
          },
        });
        hasWrites = true;

        // Fire native Android system notification
        await showSystemNotification(
          title: title,
          body: message,
          id: tx.id.hashCode.abs().remainder(100000),
        );
      }
    }

    if (hasWrites) {
      try {
        await batch.commit();
      } catch (e) {
        // Resilient fail-soft
      }
    }
  }
}
