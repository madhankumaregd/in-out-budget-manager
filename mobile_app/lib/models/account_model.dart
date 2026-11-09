import 'package:cloud_firestore/cloud_firestore.dart';

class AccountModel {
  final String id;
  final String name;
  final String type;
  final double balance;
  final String currency;
  final DateTime createdAt;

  AccountModel({
    required this.id,
    required this.name,
    required this.type,
    required this.balance,
    required this.currency,
    required this.createdAt,
  });

  factory AccountModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return AccountModel(
      id: doc.id,
      name: data['name'] as String? ?? 'Untitled Account',
      type: data['type'] as String? ?? 'bank',
      balance: (data['balance'] is num) ? (data['balance'] as num).toDouble() : 0.0,
      currency: data['currency'] as String? ?? 'INR',
      createdAt: (data['createdAt'] is Timestamp)
          ? (data['createdAt'] as Timestamp).toDate()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'type': type,
      'balance': balance,
      'currency': currency,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  AccountModel copyWith({
    String? id,
    String? name,
    String? type,
    double? balance,
    String? currency,
    DateTime? createdAt,
  }) {
    return AccountModel(
      id: id ?? this.id,
      name: name ?? this.name,
      type: type ?? this.type,
      balance: balance ?? this.balance,
      currency: currency ?? this.currency,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
