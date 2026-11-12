import 'package:flutter/material.dart';
import '../models/account_model.dart';
import '../models/transaction_model.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_constants.dart';
import '../core/utils/date_formatter.dart';
import 'swipe_dismiss_bottom_sheet.dart';
import 'confirm_dialog.dart';

class EditTransactionSheet extends StatefulWidget {
  final TransactionModel transaction;
  final List<AccountModel> accounts;
  final String currencySymbol;
  final Function({
    required String newType,
    required double newAmount,
    required String newCategory,
    required String newFromAccountId,
    String? newToAccountId,
    required DateTime newDate,
    required String newDescription,
  }) onSave;
  final Future<void> Function()? onDelete;

  const EditTransactionSheet({
    super.key,
    required this.transaction,
    required this.accounts,
    this.currencySymbol = '₹',
    required this.onSave,
    this.onDelete,
  });

  static void show({
    required BuildContext context,
    required TransactionModel transaction,
    required List<AccountModel> accounts,
    String currencySymbol = '₹',
    required Function({
      required String newType,
      required double newAmount,
      required String newCategory,
      required String newFromAccountId,
      String? newToAccountId,
      required DateTime newDate,
      required String newDescription,
    }) onSave,
    Future<void> Function()? onDelete,
  }) {
    SwipeDismissBottomSheet.show(
      context: context,
      title: 'Edit Transaction',
      subtitle: 'Modify transaction details and balances',
      child: EditTransactionSheet(
        transaction: transaction,
        accounts: accounts,
        currencySymbol: currencySymbol,
        onSave: onSave,
        onDelete: onDelete,
      ),
    );
  }

  @override
  State<EditTransactionSheet> createState() => _EditTransactionSheetState();
}

class _EditTransactionSheetState extends State<EditTransactionSheet> {
  late String _type;
  late String _category;
  late String _fromAccountId;
  String? _toAccountId;
  late DateTime _date;

  late TextEditingController _amountController;
  late TextEditingController _descriptionController;
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _type = widget.transaction.type;
    _category = widget.transaction.category;
    _fromAccountId = widget.transaction.fromAccountId;
    _toAccountId = widget.transaction.toAccountId;
    _date = widget.transaction.date;

    _amountController =
        TextEditingController(text: widget.transaction.amount.toStringAsFixed(2));
    _descriptionController =
        TextEditingController(text: widget.transaction.description);
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

    if (_type == 'transfer') {
      if (_toAccountId == null || _toAccountId!.isEmpty) {
        setState(() => _error = 'Please select a destination account');
        return;
      }
      if (_fromAccountId == _toAccountId) {
        setState(() => _error = 'Source and destination accounts must be different');
        return;
      }
    }

    setState(() => _isLoading = true);
    try {
      await widget.onSave(
        newType: _type,
        newAmount: amount,
        newCategory: _type == 'transfer' ? 'Transfer' : _category,
        newFromAccountId: _fromAccountId,
        newToAccountId: _type == 'transfer' ? _toAccountId : null,
        newDate: _date,
        newDescription: _descriptionController.text.trim(),
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
    final categories = _type == 'income'
        ? AppConstants.incomeCategories
        : AppConstants.expenseCategories;

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final toggleBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);
    final activeTabBg = isDark ? const Color(0xFF334155) : Colors.white;
    final textPrimary = isDark ? Colors.white : AppColors.textPrimary;
    final textMuted = isDark ? const Color(0xFF94A3B8) : AppColors.textMuted;
    final inputBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC);
    final inputBorder = isDark ? const Color(0xFF334155) : AppColors.dividerColor;
    final dropdownBg = isDark ? const Color(0xFF1E293B) : Colors.white;
    final errorBg = isDark
        ? AppColors.expenseRed.withValues(alpha: 0.14)
        : const Color(0xFFFEF2F2);
    final errorBorder = isDark
        ? AppColors.expenseRed.withValues(alpha: 0.38)
        : const Color(0xFFFECACA);
    final deleteBg = isDark
        ? AppColors.expenseRed.withValues(alpha: 0.14)
        : const Color(0xFFFEF2F2);
    final deleteBorder = isDark
        ? AppColors.expenseRed.withValues(alpha: 0.4)
        : const Color(0xFFFECACA);

    final validFromAccountId =
        widget.accounts.any((a) => a.id == _fromAccountId) ? _fromAccountId : null;
    final validToAccountId = _toAccountId != null &&
            widget.accounts.any((a) => a.id == _toAccountId)
        ? _toAccountId
        : null;

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

        // ── 3-Way Segmented Control: Income, Expense, Transfer ──
        Container(
          decoration: BoxDecoration(
            color: toggleBg,
            borderRadius: BorderRadius.circular(12),
            border: isDark ? Border.all(color: inputBorder) : null,
          ),
          padding: const EdgeInsets.all(4),
          child: Row(
            children: [
              _buildTypeTab('income', 'Income', AppColors.incomeGreen, activeTabBg, textMuted, isDark),
              _buildTypeTab('expense', 'Expense', AppColors.expenseRed, activeTabBg, textMuted, isDark),
              _buildTypeTab('transfer', 'Transfer', AppColors.transferBlue, activeTabBg, textMuted, isDark),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // ── Amount ──
        TextField(
          controller: _amountController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: textPrimary),
          decoration: InputDecoration(
            labelText: 'Amount (${widget.currencySymbol})',
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

        if (_type == 'transfer') ...[
          // From Account
          DropdownButtonFormField<String>(
            value: validFromAccountId,
            dropdownColor: dropdownBg,
            style: TextStyle(color: textPrimary, fontSize: 14),
            decoration: InputDecoration(
              labelText: 'Transfer From',
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
            onChanged: (val) {
              if (val != null) setState(() => _fromAccountId = val);
            },
          ),
          const SizedBox(height: 14),

          // To Account
          DropdownButtonFormField<String>(
            value: validToAccountId,
            dropdownColor: dropdownBg,
            style: TextStyle(color: textPrimary, fontSize: 14),
            decoration: InputDecoration(
              labelText: 'Transfer To',
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
            onChanged: (val) => setState(() => _toAccountId = val),
          ),
        ] else ...[
          // Category
          DropdownButtonFormField<String>(
            value: categories.contains(_category) ? _category : categories.first,
            dropdownColor: dropdownBg,
            style: TextStyle(color: textPrimary, fontSize: 14),
            decoration: InputDecoration(
              labelText: 'Category',
              filled: true,
              fillColor: inputBg,
            ),
            items: categories.map((cat) {
              return DropdownMenuItem(
                value: cat,
                child: Text(cat, style: TextStyle(color: textPrimary)),
              );
            }).toList(),
            onChanged: (val) {
              if (val != null) setState(() => _category = val);
            },
          ),
          const SizedBox(height: 14),

          // Account
          DropdownButtonFormField<String>(
            value: validFromAccountId,
            dropdownColor: dropdownBg,
            style: TextStyle(color: textPrimary, fontSize: 14),
            decoration: InputDecoration(
              labelText: 'Account',
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
            onChanged: (val) {
              if (val != null) setState(() => _fromAccountId = val);
            },
          ),
        ],

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
            labelText: 'Description (Optional)',
            filled: true,
            fillColor: inputBg,
          ),
        ),

        const SizedBox(height: 24),

        // ── Save Button ──
        ElevatedButton(
          onPressed: _isLoading ? null : _handleSubmit,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryIndigo,
            foregroundColor: Colors.white,
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
                  'Save Changes',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
        ),

        if (widget.onDelete != null) ...[
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () async {
              final confirmed = await ConfirmDialog.show(
                context: context,
                title: 'Delete Transaction?',
                message:
                    'Are you sure you want to delete this transaction for ${widget.transaction.category}? Account balance will be restored automatically.',
                confirmLabel: 'Delete',
                isDestructive: true,
              );
              if (confirmed && context.mounted) {
                Navigator.of(context).pop(); // Dismiss bottom sheet!
                if (widget.onDelete != null) {
                  await widget.onDelete!();
                }
              }
            },
            icon: const Icon(Icons.delete_outline_rounded, size: 18, color: AppColors.expenseRed),
            label: const Text(
              'Delete Transaction',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.expenseRed),
            ),
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: deleteBorder),
              backgroundColor: deleteBg,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildTypeTab(
    String type,
    String label,
    Color activeColor,
    Color activeTabBg,
    Color textMuted,
    bool isDark,
  ) {
    final isSelected = _type == type;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _type = type;
            if (type == 'income') {
              _category = AppConstants.incomeCategories.first;
            } else if (type == 'expense') {
              _category = AppConstants.expenseCategories.first;
            } else {
              _category = 'Transfer';
            }
          });
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 9),
          decoration: BoxDecoration(
            color: isSelected ? activeTabBg : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    )
                  ]
                : null,
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: isSelected ? activeColor : textMuted,
            ),
          ),
        ),
      ),
    );
  }
}
