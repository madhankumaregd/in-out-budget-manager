import 'package:flutter/material.dart';
import '../models/account_model.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_constants.dart';
import 'swipe_dismiss_bottom_sheet.dart';

class EditAccountSheet extends StatefulWidget {
  final AccountModel account;
  final String currencySymbol;
  final Future<void> Function(String name, String type, double balance) onSave;

  const EditAccountSheet({
    super.key,
    required this.account,
    this.currencySymbol = '₹',
    required this.onSave,
  });

  static void show({
    required BuildContext context,
    required AccountModel account,
    String currencySymbol = '₹',
    required Future<void> Function(String name, String type, double balance) onSave,
  }) {
    SwipeDismissBottomSheet.show(
      context: context,
      title: 'Edit Account',
      subtitle: 'Update account name, type, or balance',
      child: EditAccountSheet(
        account: account,
        currencySymbol: currencySymbol,
        onSave: onSave,
      ),
    );
  }

  @override
  State<EditAccountSheet> createState() => _EditAccountSheetState();
}

class _EditAccountSheetState extends State<EditAccountSheet> {
  late TextEditingController _nameController;
  late TextEditingController _balanceController;
  late String _selectedType;
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.account.name);
    _balanceController = TextEditingController(text: widget.account.balance.toStringAsFixed(2));
    _selectedType = widget.account.type;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _balanceController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    setState(() => _error = null);

    final name = _nameController.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Please enter an account name');
      return;
    }

    final balance = double.tryParse(_balanceController.text.trim());
    if (balance == null) {
      setState(() => _error = 'Please enter a valid numeric balance');
      return;
    }

    setState(() => _isLoading = true);
    try {
      await widget.onSave(name, _selectedType, balance);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : AppColors.textPrimary;
    final inputBg = isDark ? const Color(0xFF1E293B) : Colors.grey.shade100;
    final borderColor = isDark ? const Color(0xFF334155) : Colors.grey.shade300;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_error != null)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: AppColors.expenseRed.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.expenseRed.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: AppColors.expenseRed, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _error!,
                    style: const TextStyle(color: AppColors.expenseRed, fontSize: 13),
                  ),
                ),
              ],
            ),
          ),

        // ── Account Name ──
        Text(
          'Account Name',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: textColor),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _nameController,
          style: TextStyle(color: textColor, fontSize: 14),
          decoration: InputDecoration(
            filled: true,
            fillColor: inputBg,
            hintText: 'e.g. Canara Bank, HDFC, Cash Wallet',
            hintStyle: TextStyle(color: Colors.grey.shade500),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: borderColor),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: borderColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primaryIndigo),
            ),
          ),
        ),

        const SizedBox(height: 14),

        // ── Account Type ──
        Text(
          'Account Type',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: textColor),
        ),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          value: _selectedType,
          dropdownColor: isDark ? const Color(0xFF0F172A) : Colors.white,
          style: TextStyle(color: textColor, fontSize: 14),
          decoration: InputDecoration(
            filled: true,
            fillColor: inputBg,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: borderColor),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: borderColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primaryIndigo),
            ),
          ),
          items: AppConstants.accountTypes.map((t) {
            return DropdownMenuItem(
              value: t['id']!,
              child: Text(t['label']!, style: TextStyle(color: textColor)),
            );
          }).toList(),
          onChanged: (val) {
            if (val != null) setState(() => _selectedType = val);
          },
        ),

        const SizedBox(height: 14),

        // ── Current Balance / Value ──
        Text(
          'Account Balance / Value (${widget.currencySymbol})',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: textColor),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _balanceController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.bold),
          decoration: InputDecoration(
            filled: true,
            fillColor: inputBg,
            prefixText: '${widget.currencySymbol} ',
            prefixStyle: const TextStyle(
              color: AppColors.primaryIndigo,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: borderColor),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: borderColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primaryIndigo),
            ),
          ),
        ),

        const SizedBox(height: 24),

        // ── Submit Button ──
        ElevatedButton(
          onPressed: _isLoading ? null : _handleSubmit,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryIndigo,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            elevation: 0,
          ),
          child: _isLoading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Text(
                  'Save Changes',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
        ),
      ],
    );
  }
}

