import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/account_model.dart';
import '../models/transaction_model.dart';
import '../models/user_profile_model.dart';
import 'rate_limiter_service.dart';

class FirestoreService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // ─── USER PROFILE (REAL-TIME STREAM) ───
  Stream<UserProfileModel?> getUserProfileStream(String userId) {
    if (userId.isEmpty) return Stream.value(null);
    return _firestore
        .collection('users')
        .doc(userId)
        .snapshots()
        .map((doc) => doc.exists ? UserProfileModel.fromFirestore(doc) : null);
  }

  Future<void> updateUserProfile(String userId, Map<String, dynamic> data) async {
    await _firestore.collection('users').doc(userId).update({
      ...data,
      'updatedAt': Timestamp.now(),
    });
  }

  // ─── ACCOUNTS (REAL-TIME STREAM) ───
  Stream<List<AccountModel>> getUserAccountsStream(String userId) {
    if (userId.isEmpty) return Stream.value([]);
    return _firestore
        .collection('users')
        .doc(userId)
        .collection('accounts')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => AccountModel.fromFirestore(doc)).toList());
  }

  Future<String> createAccount(String userId, {
    required String name,
    required String type,
    required double initialBalance,
    String currency = 'INR',
  }) async {
    final docRef = await _firestore
        .collection('users')
        .doc(userId)
        .collection('accounts')
        .add({
      'name': name.trim(),
      'type': type,
      'balance': initialBalance,
      'currency': currency,
      'createdAt': Timestamp.now(),
    });
    return docRef.id;
  }

  Future<void> updateAccount(
    String userId,
    String accountId, {
    required String name,
    required String type,
    required double balance,
  }) async {
    await _firestore
        .collection('users')
        .doc(userId)
        .collection('accounts')
        .doc(accountId)
        .update({
      'name': name.trim(),
      'type': type,
      'balance': balance,
      'updatedAt': Timestamp.now(),
    });
  }

  Future<void> addCustomCategory(String userId, String category, String type) async {
    final field = type == 'income' ? 'customIncomeCategories' : 'customExpenseCategories';
    await _firestore.collection('users').doc(userId).set({
      field: FieldValue.arrayUnion([category.trim()]),
    }, SetOptions(merge: true));
  }

  Future<void> deleteAccount(String userId, String accountId) async {
    final accRef = _firestore
        .collection('users')
        .doc(userId)
        .collection('accounts')
        .doc(accountId);
    final accDoc = await accRef.get();
    if (!accDoc.exists) return;

    final batch = _firestore.batch();
    final trashPayload = {
      'originalId': accountId,
      'itemType': 'account',
      'data': accDoc.data(),
      'userId': userId,
      'title': accDoc.data()?['name'] ?? 'Account',
      'amount': (accDoc.data()?['balance'] as num?)?.toDouble() ?? 0.0,
      'type': 'account',
      'deletedAt': Timestamp.now(),
      'expiresAt': Timestamp.fromDate(DateTime.now().add(const Duration(days: 30))),
    };

    batch.set(_firestore.collection('users').doc(userId).collection('trash').doc(accountId), trashPayload);
    batch.delete(accRef);
    await batch.commit();

    // Resilient mirror to global trash (non-blocking, won't fail account deletion if permissions differ)
    try {
      await _firestore.collection('trash').doc('${userId}_$accountId').set(trashPayload);
    } catch (_) {}
  }

  // ─── TRANSACTIONS (REAL-TIME STREAM) ───
  Stream<List<TransactionModel>> getUserTransactionsStream(String userId) {
    if (userId.isEmpty) return Stream.value([]);
    return _firestore
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .orderBy('date', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => TransactionModel.fromFirestore(doc))
            .toList());
  }

  Future<String> createTransaction(String userId, {
    required String type, // 'income' | 'expense' | 'transfer'
    required double amount,
    required String category,
    required String fromAccountId,
    String? toAccountId,
    required DateTime date,
    String description = '',
  }) async {
    // ── Security: Rate Limit Check (> 20 tx / 30 min -> 1 hr restrict) ──
    final rateCheck = await RateLimiterService.checkTransactionRate(userId);
    if (!rateCheck.allowed) {
      throw Exception(rateCheck.error ?? 'Too many transactions. Please wait before adding more.');
    }

    // ── Security: Amount Validation ──
    if (amount <= 0) throw Exception("Amount must be greater than 0");
    if (amount > 10000000) throw Exception("Amount exceeds maximum transaction limit of ₹1,00,00,000");
    final safeAmount = (amount * 100).round() / 100.0;

    // ── Security: Input Sanitization ──
    final cleanDesc = description.replaceAll(RegExp(r'<[^>]*>'), '').trim();
    final cleanCategory = category.replaceAll(RegExp(r'<[^>]*>'), '').trim();

    final accountsRef = _firestore.collection('users').doc(userId).collection('accounts');
    final transactionsRef = _firestore.collection('users').doc(userId).collection('transactions');

    if (type == 'transfer') {
      if (toAccountId == null || toAccountId.isEmpty) {
        throw Exception("Please select a destination account");
      }
      if (fromAccountId == toAccountId) {
        throw Exception("Source and destination accounts must be different");
      }

      final fromSnap = await accountsRef.doc(fromAccountId).get();
      final toSnap = await accountsRef.doc(toAccountId).get();

      final fromBalance = (fromSnap.data()?['balance'] as num?)?.toDouble() ?? 0.0;
      final toBalance = (toSnap.data()?['balance'] as num?)?.toDouble() ?? 0.0;

      if (fromBalance < safeAmount) {
        throw Exception(
          "Insufficient balance! Available: ₹${fromBalance.toStringAsFixed(2)}, required: ₹${safeAmount.toStringAsFixed(2)}",
        );
      }

      final txDoc = transactionsRef.doc();
      final batch = _firestore.batch();

      txDoc.set({
        'type': 'transfer',
        'amount': safeAmount,
        'category': cleanCategory.isNotEmpty ? cleanCategory : 'Transfer',
        'fromAccountId': fromAccountId,
        'toAccountId': toAccountId,
        'date': Timestamp.fromDate(date),
        'description': cleanDesc,
        'createdAt': Timestamp.now(),
      });

      batch.update(accountsRef.doc(fromAccountId), {'balance': fromBalance - safeAmount});
      batch.update(accountsRef.doc(toAccountId), {'balance': toBalance + safeAmount});

      await batch.commit();

      // Record successful transaction in rate limiter
      await RateLimiterService.recordTransaction(userId);
      return txDoc.id;
    } else {
      final accountSnap = await accountsRef.doc(fromAccountId).get();
      final currentBalance = (accountSnap.data()?['balance'] as num?)?.toDouble() ?? 0.0;

      if (type == 'expense' && currentBalance < safeAmount) {
        throw Exception(
          "Insufficient balance! Available: ₹${currentBalance.toStringAsFixed(2)}, required: ₹${safeAmount.toStringAsFixed(2)}",
        );
      }

      final newBalance = type == 'income'
          ? currentBalance + safeAmount
          : currentBalance - safeAmount;

      final txDoc = await transactionsRef.add({
        'type': type,
        'amount': safeAmount,
        'category': cleanCategory,
        'fromAccountId': fromAccountId,
        'date': Timestamp.fromDate(date),
        'description': cleanDesc,
        'createdAt': Timestamp.now(),
      });

      await accountsRef.doc(fromAccountId).update({'balance': newBalance});

      // Record successful transaction in rate limiter
      await RateLimiterService.recordTransaction(userId);
      return txDoc.id;
    }
  }

  Future<void> updateTransaction(
    String userId,
    String transactionId, {
    required String newType,
    required double newAmount,
    required String newCategory,
    required String newFromAccountId,
    String? newToAccountId,
    required DateTime newDate,
    String newDescription = '',
  }) async {
    // ── Security: Amount Validation ──
    if (newAmount <= 0) throw Exception("Amount must be greater than 0");
    if (newAmount > 10000000) throw Exception("Amount exceeds maximum transaction limit of ₹1,00,00,000");
    final safeNewAmount = (newAmount * 100).round() / 100.0;

    // ── Security: Input Sanitization ──
    final cleanDesc = newDescription.replaceAll(RegExp(r'<[^>]*>'), '').trim();
    final cleanCategory = newCategory.replaceAll(RegExp(r'<[^>]*>'), '').trim();
    final txRef = _firestore
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .doc(transactionId);
    final txDoc = await txRef.get();
    if (!txDoc.exists) throw Exception("Transaction not found");

    final oldTx = TransactionModel.fromFirestore(txDoc);
    final accountsRef = _firestore.collection('users').doc(userId).collection('accounts');

    // Collect affected accounts
    final affectedIds = {
      oldTx.fromAccountId,
      if (oldTx.toAccountId != null) oldTx.toAccountId!,
      newFromAccountId,
      if (newToAccountId != null) newToAccountId,
    };

    final accountSnaps = await Future.wait(
      affectedIds.map((id) => accountsRef.doc(id).get()),
    );

    final balances = <String, double>{};
    for (var snap in accountSnaps) {
      balances[snap.id] = (snap.data()?['balance'] as num?)?.toDouble() ?? 0.0;
    }

    final deltas = <String, double>{for (var id in affectedIds) id: 0.0};

    // 1. Revert old transaction
    if (oldTx.type == 'income') {
      deltas[oldTx.fromAccountId] = (deltas[oldTx.fromAccountId] ?? 0) - oldTx.amount;
    } else if (oldTx.type == 'expense') {
      deltas[oldTx.fromAccountId] = (deltas[oldTx.fromAccountId] ?? 0) + oldTx.amount;
    } else if (oldTx.type == 'transfer') {
      deltas[oldTx.fromAccountId] = (deltas[oldTx.fromAccountId] ?? 0) + oldTx.amount;
      if (oldTx.toAccountId != null) {
        deltas[oldTx.toAccountId!] = (deltas[oldTx.toAccountId!] ?? 0) - oldTx.amount;
      }
    }

    // 2. Apply new transaction
    if (newType == 'income') {
      deltas[newFromAccountId] = (deltas[newFromAccountId] ?? 0) + safeNewAmount;
    } else if (newType == 'expense') {
      deltas[newFromAccountId] = (deltas[newFromAccountId] ?? 0) - safeNewAmount;
    } else if (newType == 'transfer') {
      if (newToAccountId == null || newFromAccountId == newToAccountId) {
        throw Exception("Invalid transfer accounts");
      }
      deltas[newFromAccountId] = (deltas[newFromAccountId] ?? 0) - safeNewAmount;
      deltas[newToAccountId] = (deltas[newToAccountId] ?? 0) + safeNewAmount;
    }

    // 3. Balance verification
    for (var id in affectedIds) {
      final current = balances[id] ?? 0.0;
      final finalBal = current + (deltas[id] ?? 0.0);
      if (finalBal < 0 && (id == newFromAccountId || (deltas[id] ?? 0.0) < 0)) {
        throw Exception("Insufficient balance to modify this transaction");
      }
    }

    // 4. Batch commit
    final batch = _firestore.batch();
    for (var id in affectedIds) {
      if ((deltas[id] ?? 0.0) != 0) {
        final current = balances[id] ?? 0.0;
        batch.update(accountsRef.doc(id), {'balance': current + deltas[id]!});
      }
    }

    batch.update(txRef, {
      'type': newType,
      'amount': safeNewAmount,
      'category': newType == 'transfer' ? 'Transfer' : cleanCategory,
      'fromAccountId': newFromAccountId,
      'toAccountId': newType == 'transfer' ? newToAccountId : null,
      'date': Timestamp.fromDate(newDate),
      'description': cleanDesc,
      'updatedAt': Timestamp.now(),
    });

    await batch.commit();
  }

  Future<void> deleteTransaction(String userId, String transactionId) async {
    final txRef = _firestore
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .doc(transactionId);
    final txDoc = await txRef.get();
    if (!txDoc.exists) return;

    final tx = TransactionModel.fromFirestore(txDoc);
    final accountsRef = _firestore.collection('users').doc(userId).collection('accounts');

    // 1. Revert account balances (non-blocking, won't fail transaction deletion if account is missing or deleted)
    if (tx.type == 'transfer') {
      if (tx.fromAccountId.isNotEmpty) {
        try {
          final fromDoc = accountsRef.doc(tx.fromAccountId);
          final fromSnap = await fromDoc.get();
          if (fromSnap.exists) {
            final fromBal = (fromSnap.data()?['balance'] as num?)?.toDouble() ?? 0.0;
            await fromDoc.set({'balance': fromBal + tx.amount}, SetOptions(merge: true));
          }
        } catch (_) {}
      }

      if (tx.toAccountId != null && tx.toAccountId!.isNotEmpty) {
        try {
          final toDoc = accountsRef.doc(tx.toAccountId!);
          final toSnap = await toDoc.get();
          if (toSnap.exists) {
            final toBal = (toSnap.data()?['balance'] as num?)?.toDouble() ?? 0.0;
            await toDoc.set({'balance': toBal - tx.amount}, SetOptions(merge: true));
          }
        } catch (_) {}
      }
    } else {
      if (tx.fromAccountId.isNotEmpty) {
        try {
          final accDoc = accountsRef.doc(tx.fromAccountId);
          final accSnap = await accDoc.get();
          if (accSnap.exists) {
            final curBal = (accSnap.data()?['balance'] as num?)?.toDouble() ?? 0.0;
            final adjustment = tx.type == 'income' ? -tx.amount : tx.amount;
            await accDoc.set({'balance': curBal + adjustment}, SetOptions(merge: true));
          }
        } catch (_) {}
      }
    }

    // 2. Soft-delete: Move to trash collection (per website architecture)
    final userTrashRef = _firestore
        .collection('users')
        .doc(userId)
        .collection('trash')
        .doc(transactionId);

    final trashPayload = {
      'originalId': transactionId,
      'itemType': 'transaction',
      'data': txDoc.data(),
      'userId': userId,
      'title': tx.description.isNotEmpty ? tx.description : tx.category,
      'amount': tx.amount,
      'type': tx.type,
      'category': tx.category,
      'deletedAt': Timestamp.now(),
      'expiresAt': Timestamp.fromDate(
        DateTime.now().add(const Duration(days: 30)),
      ),
    };

    final batch = _firestore.batch();
    batch.set(userTrashRef, trashPayload);
    batch.delete(txRef);
    await batch.commit();

    // 3. Resilient mirror to global trash (non-blocking, won't fail transaction deletion if permissions differ)
    try {
      final globalTrashRef = _firestore.collection('trash').doc('${userId}_$transactionId');
      await globalTrashRef.set(trashPayload);
    } catch (_) {}
  }
}
