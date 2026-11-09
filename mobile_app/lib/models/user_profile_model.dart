import 'package:cloud_firestore/cloud_firestore.dart';

class UserProfileModel {
  final String id;
  final String email;
  final String displayName;
  final String? phone;
  final String currency;
  final String currencySymbol;
  final String status;
  final bool disabled;
  final String role;
  final DateTime? createdAt;
  final List<String> customIncomeCategories;
  final List<String> customExpenseCategories;

  String get uid => id;
  bool get isDisabled => disabled || status == 'disabled';

  UserProfileModel({
    required this.id,
    required this.email,
    required this.displayName,
    this.phone,
    this.currency = 'INR',
    this.currencySymbol = '₹',
    this.status = 'active',
    this.disabled = false,
    this.role = 'user',
    this.createdAt,
    this.customIncomeCategories = const [],
    this.customExpenseCategories = const [],
  });

  factory UserProfileModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    final status = data['status'] as String? ??
        (data['disabled'] == true ? 'disabled' : 'active');
    final disabled = data['disabled'] == true || status == 'disabled';
    final role = data['role'] as String? ?? 'user';

    DateTime? createdAt;
    if (data['createdAt'] is Timestamp) {
      createdAt = (data['createdAt'] as Timestamp).toDate();
    }

    final incomeCats = (data['customIncomeCategories'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        [];
    final expenseCats = (data['customExpenseCategories'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        [];

    return UserProfileModel(
      id: doc.id,
      email: data['email'] as String? ?? '',
      displayName: data['displayName'] as String? ??
          (data['email'] as String? ?? '').split('@').first,
      phone: data['phone'] as String?,
      currency: data['currency'] as String? ?? 'INR',
      currencySymbol: data['currencySymbol'] as String? ?? '₹',
      status: status,
      disabled: disabled,
      role: role,
      createdAt: createdAt,
      customIncomeCategories: incomeCats,
      customExpenseCategories: expenseCats,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'email': email,
      'displayName': displayName,
      'phone': phone,
      'currency': currency,
      'currencySymbol': currencySymbol,
      'status': status,
      'disabled': disabled,
      'role': role,
      if (createdAt != null) 'createdAt': Timestamp.fromDate(createdAt!),
      'updatedAt': Timestamp.now(),
    };
  }

  UserProfileModel copyWith({
    String? id,
    String? email,
    String? displayName,
    String? phone,
    String? currency,
    String? currencySymbol,
    String? status,
    bool? disabled,
    String? role,
    DateTime? createdAt,
  }) {
    return UserProfileModel(
      id: id ?? this.id,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      phone: phone ?? this.phone,
      currency: currency ?? this.currency,
      currencySymbol: currencySymbol ?? this.currencySymbol,
      status: status ?? this.status,
      disabled: disabled ?? this.disabled,
      role: role ?? this.role,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
