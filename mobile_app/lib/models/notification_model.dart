import 'package:cloud_firestore/cloud_firestore.dart';

class NotificationModel {
  final String id;
  final String title;
  final String message;
  final String type; // 'security_low_balance', 'daily_summary', 'high_expense', 'overdraft', 'income', 'info'
  final String severity; // 'warning', 'info', 'success', 'danger'
  final bool read;
  final DateTime createdAt;
  final Map<String, dynamic>? metadata;

  NotificationModel({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    this.severity = 'info',
    this.read = false,
    required this.createdAt,
    this.metadata,
  });

  factory NotificationModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    DateTime parsedDate = DateTime.now();
    if (data['createdAt'] is Timestamp) {
      parsedDate = (data['createdAt'] as Timestamp).toDate();
    } else if (data['createdAt'] is String) {
      parsedDate = DateTime.tryParse(data['createdAt']) ?? DateTime.now();
    }

    return NotificationModel(
      id: doc.id,
      title: data['title']?.toString() ?? 'Notification',
      message: data['message']?.toString() ?? '',
      type: data['type']?.toString() ?? 'info',
      severity: data['severity']?.toString() ?? 'info',
      read: data['read'] == true,
      createdAt: parsedDate,
      metadata: data['metadata'] is Map ? Map<String, dynamic>.from(data['metadata']) : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'message': message,
      'type': type,
      'severity': severity,
      'read': read,
      'createdAt': Timestamp.fromDate(createdAt),
      'metadata': metadata ?? {},
    };
  }

  NotificationModel copyWith({
    String? title,
    String? message,
    String? type,
    String? severity,
    bool? read,
    DateTime? createdAt,
    Map<String, dynamic>? metadata,
  }) {
    return NotificationModel(
      id: id,
      title: title ?? this.title,
      message: message ?? this.message,
      type: type ?? this.type,
      severity: severity ?? this.severity,
      read: read ?? this.read,
      createdAt: createdAt ?? this.createdAt,
      metadata: metadata ?? this.metadata,
    );
  }
}

