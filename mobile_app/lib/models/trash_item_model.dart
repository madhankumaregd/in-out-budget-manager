import 'package:cloud_firestore/cloud_firestore.dart';

class TrashItemModel {
  final String id;
  final String userId;
  final String userName;
  final String originalId;
  final String itemType; // 'account' | 'transaction'
  final Map<String, dynamic> data;
  final DateTime deletedAt;
  final DateTime expiresAt;

  String get type => itemType;
  String get title =>
      data['name'] as String? ??
      data['category'] as String? ??
      data['description'] as String? ??
      'Deleted ${itemType.toUpperCase()}';

  int get remainingDays =>
      expiresAt.difference(DateTime.now()).inDays.clamp(0, 30);

  TrashItemModel({
    required this.id,
    required this.userId,
    required this.userName,
    required this.originalId,
    required this.itemType,
    required this.data,
    required this.deletedAt,
    required this.expiresAt,
  });

  factory TrashItemModel.fromFirestore(
    DocumentSnapshot doc, {
    String userId = '',
    String userName = 'Unknown',
  }) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    final originalId = (d['originalId'] as String?)?.isNotEmpty == true
        ? (d['originalId'] as String)
        : doc.id;
    final rawItemType = (d['itemType'] as String?) ??
        ((d['type'] == 'account' || d['type'] == 'transaction')
            ? d['type'] as String
            : null);
    final nestedData = d['data'] as Map<String, dynamic>?;
    final effectiveData = (nestedData != null && nestedData.isNotEmpty)
        ? Map<String, dynamic>.from(nestedData)
        : Map<String, dynamic>.from(d);

    final itemType = rawItemType ??
        (effectiveData.containsKey('balance') ? 'account' : 'transaction');

    final resolvedUserId = userId.isNotEmpty
        ? userId
        : (d['userId'] as String? ?? (effectiveData['userId'] as String? ?? ''));

    return TrashItemModel(
      id: doc.id,
      userId: resolvedUserId,
      userName: userName.isNotEmpty
          ? userName
          : (d['userName'] as String? ?? 'User'),
      originalId: originalId,
      itemType: itemType,
      data: effectiveData,
      deletedAt: (d['deletedAt'] is Timestamp)
          ? (d['deletedAt'] as Timestamp).toDate()
          : DateTime.now(),
      expiresAt: (d['expiresAt'] is Timestamp)
          ? (d['expiresAt'] as Timestamp).toDate()
          : DateTime.now().add(const Duration(days: 30)),
    );
  }
}
