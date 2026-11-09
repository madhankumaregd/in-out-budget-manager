import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_constants.dart';
import 'swipe_dismiss_bottom_sheet.dart';

class AddAccountSheet extends StatefulWidget {
  final String currencySymbol;
  final Function(String name, String type, double balance) onSave;

  const AddAccountSheet({
    super.key,
    this.currencySymbol = '₹',
    required this.onSave,
  });

  static void show({
    required BuildContext context,
    String currencySymbol = '₹',
    required Function(String name, String type, double balance) onSave,
  }) {
    SwipeDismissBottomSheet.show(
      context: context,
      title: 'Add New Account',
      subtitle: 'Create a bank, savings, or card account',
      child: AddAccountSheet(
        currencySymbol: currencySymbol,
        onSave: onSave,
      ),
    );
  }

  @override
  State<AddAccountSheet> createState() => _AddAccountSheetState();
}

class _AddAccountSheetState extends State<AddAccountSheet> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _balanceController = TextEditingController(text: '0.00');
  String _selectedType = 'bank';
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _balanceController.dispose();
    super.dispose();
  }

  void _handleSubmit() async {
    setState(() => _error = null);

    final name = _nameController.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Please enter an account name');
      return;
    }

    final balance = double.tryParse(_balanceController.text.trim()) ?? 0.0;

    setState(() => _isLoading = true);
    try {
      await widget.onSave(name, _selectedType, balance);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_error != null)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFFECACA)),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: AppColors.expenseRed, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(_error!, style: const TextStyle(color: AppColors.expenseRed, fontSize: 13)),
                ),
              ],
            ),
          ),

        // ── Name ──
        TextField(
          controller: _nameController,
          decoration: const InputDecoration(
            labelText: 'Account Name',
            hintText: 'e.g. HDFC Bank, ICICI, Wallet...',
          ),
          autofocus: true,
        ),

        const SizedBox(height: 14),

        // ── Type ──
        DropdownButtonFormField<String>(
          value: _selectedType,
          decoration: const InputDecoration(labelText: 'Account Type'),
          items: AppConstants.accountTypes.map((t) {
            return DropdownMenuItem(
              value: t['id']!,
              child: Text(t['label']!),
            );
          }).toList(),
          onChanged: (val) {
            if (val != null) setState(() => _selectedType = val);
          },
        ),

        const SizedBox(height: 14),

        // ── Initial Balance ──
        TextField(
          controller: _balanceController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            labelText: 'Initial Balance (${widget.currencySymbol})',
            prefixText: '${widget.currencySymbol} ',
          ),
        ),

        const SizedBox(height: 24),

        // ── Submit ──
        ElevatedButton(
          onPressed: _isLoading ? null : _handleSubmit,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryIndigo,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          child: _isLoading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                )
              : const Text(
                  'Create Account',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
        ),
      ],
    );
  }
}
