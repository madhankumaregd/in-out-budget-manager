import 'package:flutter/material.dart';
import '../models/account_model.dart';
import '../core/constants/app_colors.dart';
import '../core/utils/date_formatter.dart';
import 'swipe_dismiss_bottom_sheet.dart';

class TransferSheet extends StatefulWidget {
  final List<AccountModel> accounts;
  final String currencySymbol;
  final Function({
    required String type,
    required double amount,
    required String category,
    required String fromAccountId,
    required String toAccountId,
    required DateTime date,
    required String description,
  }) onSave;

  const TransferSheet({
    super.key,
    required this.accounts,
    this.currencySymbol = '₹',
    required this.onSave,
  });

  static void show({
    required BuildContext context,
    required List<AccountModel> accounts,
    String currencySymbol = '₹',
    required Function({
      required String type,
      required double amount,
      required String category,
      required String fromAccountId,
      required String toAccountId,
      required DateTime date,
      required String description,
    }) onSave,
  }) {
    SwipeDismissBottomSheet.show(
      context: context,
      title: 'Transfer Funds',
      subtitle: 'Move money between your accounts',
      child: TransferSheet(
        accounts: accounts,
        currencySymbol: currencySymbol,
        onSave: onSave,
      ),
    );
  }

  @override
  State<TransferSheet> createState() => _TransferSheetState();
}

class _TransferSheetState extends State<TransferSheet> {
  String? _fromAccountId;
  String? _toAccountId;
  DateTime _date = DateTime.now();

  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.accounts.length >= 2) {
      _fromAccountId = widget.accounts[0].id;
      _toAccountId = widget.accounts[1].id;
    } else if (widget.accounts.isNotEmpty) {
      _fromAccountId = widget.accounts[0].id;
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  void _handleSubmit() async {
    setState(() => _error = null);

    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Please enter a valid amount greater than 0');
      return;
    }

    if (_fromAccountId == null || _toAccountId == null) {
      setState(() => _error = 'Please select both source and destination accounts');
      return;
    }

    if (_fromAccountId == _toAccountId) {
      setState(() => _error = 'Source and destination accounts must be different');
      return;
    }

    setState(() => _isLoading = true);
    try {
      await widget.onSave(
        type: 'transfer',
        amount: amount,
        category: 'Transfer',
        fromAccountId: _fromAccountId!,
        toAccountId: _toAccountId!,
        date: _date,
        description: _descriptionController.text.trim(),
      );
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    if (widget.accounts.length < 2) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Text(
          'You need at least 2 accounts to make a transfer. Create another account first!',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 14,
            color: isDark ? const Color(0xFF94A3B8) : AppColors.textSecondary,
          ),
        ),
      );
    }
    final textPrimary = isDark ? Colors.white : AppColors.textPrimary;
    final inputBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC);
    final inputBorder = isDark ? const Color(0xFF334155) : AppColors.dividerColor;
    final dropdownBg = isDark ? const Color(0xFF1E293B) : Colors.white;
    final errorBg = isDark
        ? AppColors.expenseRed.withValues(alpha: 0.14)
        : const Color(0xFFFEF2F2);
    final errorBorder = isDark
        ? AppColors.expenseRed.withValues(alpha: 0.38)
        : const Color(0xFFFECACA);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_error != null)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: errorBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: errorBorder),
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

        // ── Transfer From ──
        DropdownButtonFormField<String>(
          value: _fromAccountId,
          dropdownColor: dropdownBg,
          style: TextStyle(color: textPrimary, fontSize: 14),
          decoration: InputDecoration(
            labelText: 'From Account',
            filled: true,
            fillColor: inputBg,
          ),
          items: widget.accounts.map((acc) {
            return DropdownMenuItem(
              value: acc.id,
              child: Text(
                '${acc.name} (${widget.currencySymbol}${acc.balance.toStringAsFixed(2)})',
                style: TextStyle(color: textPrimary),
              ),
            );
          }).toList(),
          onChanged: (val) => setState(() => _fromAccountId = val),
        ),

        const SizedBox(height: 14),

        // ── Transfer To ──
        DropdownButtonFormField<String>(
          value: _toAccountId,
          dropdownColor: dropdownBg,
          style: TextStyle(color: textPrimary, fontSize: 14),
          decoration: InputDecoration(
            labelText: 'To Account',
            filled: true,
            fillColor: inputBg,
          ),
          items: widget.accounts.map((acc) {
            return DropdownMenuItem(
              value: acc.id,
              enabled: acc.id != _fromAccountId,
              child: Text(
                '${acc.name} (${widget.currencySymbol}${acc.balance.toStringAsFixed(2)})',
                style: TextStyle(
                  color: acc.id != _fromAccountId ? textPrimary : Colors.grey,
                ),
              ),
            );
          }).toList(),
          onChanged: (val) => setState(() => _toAccountId = val),
        ),

        const SizedBox(height: 14),

        // ── Amount ──
        TextField(
          controller: _amountController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: textPrimary),
          decoration: InputDecoration(
            labelText: 'Transfer Amount (${widget.currencySymbol})',
            prefixText: '${widget.currencySymbol} ',
            filled: true,
            fillColor: inputBg,
            prefixStyle: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: textPrimary,
            ),
          ),
        ),

        const SizedBox(height: 14),

        // ── Date Picker ──
        GestureDetector(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: _date,
              firstDate: DateTime(2020),
              lastDate: DateTime(2030),
              builder: (context, child) {
                return Theme(
                  data: Theme.of(context).copyWith(
                    colorScheme: isDark
                        ? const ColorScheme.dark(
                            primary: AppColors.primaryIndigo,
                            onPrimary: Colors.white,
                            surface: Color(0xFF0F172A),
                            onSurface: Colors.white,
                          )
                        : const ColorScheme.light(
                            primary: AppColors.primaryIndigo,
                            onPrimary: Colors.white,
                            surface: Colors.white,
                            onSurface: AppColors.textPrimary,
                          ),
                  ),
                  child: child!,
                );
              },
            );
            if (picked != null) {
              setState(() {
                _date = DateTime(
                  picked.year,
                  picked.month,
                  picked.day,
                  _date.hour,
                  _date.minute,
                  _date.second,
                );
              });
            }
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: inputBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: inputBorder),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  DateFormatter.formatDate(_date),
                  style: TextStyle(fontSize: 14, color: textPrimary),
                ),
                const Icon(Icons.calendar_today_rounded, size: 18, color: AppColors.primaryIndigo),
              ],
            ),
          ),
        ),

        const SizedBox(height: 14),

        // ── Description ──
        TextField(
          controller: _descriptionController,
          style: TextStyle(color: textPrimary, fontSize: 14),
          decoration: InputDecoration(
            labelText: 'Note (Optional)',
            hintText: 'e.g. Monthly savings transfer...',
            filled: true,
            fillColor: inputBg,
          ),
        ),

        const SizedBox(height: 24),

        // ── Transfer Button ──
        Container(
          height: 50,
          decoration: BoxDecoration(
            color: AppColors.transferBlue,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: AppColors.transferBlue.withOpacity(0.3),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ElevatedButton(
            onPressed: _isLoading ? null : _handleSubmit,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              shadowColor: Colors.transparent,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: _isLoading
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                  )
                : const Text(
                    'Execute Transfer',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
          ),
        ),
      ],
    );
  }
}
