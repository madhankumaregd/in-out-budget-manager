import 'package:cloud_firestore/cloud_firestore.dart';

class TransactionModel {
  final String id;
  final String type; // 'income' | 'expense' | 'transfer'
  final double amount;
  final String category;
  final String fromAccountId;
  final String? toAccountId;
  final DateTime date;
  final String description;
  final DateTime createdAt;
  final String fromAccountName;
  final String? toAccountName;

  bool get isIncome => type == 'income';
  bool get isExpense => type == 'expense';
  bool get isTransfer => type == 'transfer';

  /// Returns `date` if it carries a specific time of day; otherwise falls back to `createdAt`.
  DateTime get effectiveTime =>
      (date.hour == 0 && date.minute == 0 && date.second == 0)
          ? createdAt
          : date;

  TransactionModel({
    required this.id,
    required this.type,
    required this.amount,
    required this.category,
    required this.fromAccountId,
    this.toAccountId,
    required this.date,
    required this.description,
    required this.createdAt,
    this.fromAccountName = '',
    this.toAccountName,
  });

  factory TransactionModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};

    DateTime parsedDate = DateTime.now();
    if (data['date'] is Timestamp) {
      parsedDate = (data['date'] as Timestamp).toDate();
    } else if (data['date'] is String) {
      parsedDate = DateTime.tryParse(data['date'] as String) ?? DateTime.now();
    }

    DateTime parsedCreatedAt = parsedDate;
    if (data['createdAt'] is Timestamp) {
      parsedCreatedAt = (data['createdAt'] as Timestamp).toDate();
    }

    return TransactionModel(
      id: doc.id,
      type: data['type'] as String? ?? 'expense',
      amount: (data['amount'] is num) ? (data['amount'] as num).toDouble() : 0.0,
      category: data['category'] as String? ?? '',
      fromAccountId: data['fromAccountId'] as String? ?? '',
      toAccountId: data['toAccountId'] as String?,
      date: parsedDate,
      description: data['description'] as String? ?? '',
      createdAt: parsedCreatedAt,
      fromAccountName: data['fromAccountName'] as String? ?? '',
      toAccountName: data['toAccountName'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'type': type,
      'amount': amount,
      'category': category,
      'fromAccountId': fromAccountId,
      'toAccountId': toAccountId,
      'date': Timestamp.fromDate(date),
      'description': description,
      'createdAt': Timestamp.fromDate(createdAt),
      if (fromAccountName.isNotEmpty) 'fromAccountName': fromAccountName,
      if (toAccountName != null) 'toAccountName': toAccountName,
    };
  }
}
