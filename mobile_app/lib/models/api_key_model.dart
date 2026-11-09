import 'package:cloud_firestore/cloud_firestore.dart';

class ApiKeyModel {
  final String id;
  final String key;
  final String name;
  final String description;
  final List<String> permissions;
  final bool isActive;
  final int rateLimit;
  final DateTime createdAt;
  final DateTime? lastUsed;

  ApiKeyModel({
    required this.id,
    required this.key,
    required this.name,
    required this.description,
    required this.permissions,
    required this.isActive,
    required this.rateLimit,
    required this.createdAt,
    this.lastUsed,
  });

  factory ApiKeyModel.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    final permsRaw = d['permissions'];
    List<String> perms = ['read'];
    if (permsRaw is List) {
      perms = permsRaw.map((e) => e.toString()).toList();
    }

    return ApiKeyModel(
      id: doc.id,
      key: d['key'] as String? ?? '',
      name: d['name'] as String? ?? 'API Key',
      description: d['description'] as String? ?? '',
      permissions: perms,
      isActive: d['isActive'] as bool? ?? true,
      rateLimit: (d['rateLimit'] as num?)?.toInt() ?? 100,
      createdAt: (d['createdAt'] is Timestamp)
          ? (d['createdAt'] as Timestamp).toDate()
          : DateTime.now(),
      lastUsed: (d['lastUsed'] is Timestamp)
          ? (d['lastUsed'] as Timestamp).toDate()
          : null,
    );
  }
}
