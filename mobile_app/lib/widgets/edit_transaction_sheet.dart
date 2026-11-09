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
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.all(4),
          child: Row(
            children: [
              _buildTypeTab('income', 'Income', AppColors.incomeGreen),
              _buildTypeTab('expense', 'Expense', AppColors.expenseRed),
              _buildTypeTab('transfer', 'Transfer', AppColors.transferBlue),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // ── Amount ──
        TextField(
          controller: _amountController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          decoration: InputDecoration(
            labelText: 'Amount (${widget.currencySymbol})',
            prefixText: '${widget.currencySymbol} ',
            prefixStyle: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
        ),

        const SizedBox(height: 14),

        if (_type == 'transfer') ...[
          // From Account
          DropdownButtonFormField<String>(
            value: _fromAccountId,
            decoration: const InputDecoration(labelText: 'Transfer From'),
            items: widget.accounts.map((acc) {
              return DropdownMenuItem(
                value: acc.id,
                child: Text('${acc.name} (${widget.currencySymbol}${acc.balance.toStringAsFixed(2)})'),
              );
            }).toList(),
            onChanged: (val) {
              if (val != null) setState(() => _fromAccountId = val);
            },
          ),
          const SizedBox(height: 14),

          // To Account
          DropdownButtonFormField<String>(
            value: _toAccountId,
            decoration: const InputDecoration(labelText: 'Transfer To'),
            items: widget.accounts.map((acc) {
              return DropdownMenuItem(
                value: acc.id,
                child: Text('${acc.name} (${widget.currencySymbol}${acc.balance.toStringAsFixed(2)})'),
              );
            }).toList(),
            onChanged: (val) => setState(() => _toAccountId = val),
          ),
        ] else ...[
          // Category
          DropdownButtonFormField<String>(
            value: categories.contains(_category) ? _category : categories.first,
            decoration: const InputDecoration(labelText: 'Category'),
            items: categories.map((cat) {
              return DropdownMenuItem(value: cat, child: Text(cat));
            }).toList(),
            onChanged: (val) {
              if (val != null) setState(() => _category = val);
            },
          ),
          const SizedBox(height: 14),

          // Account
          DropdownButtonFormField<String>(
            value: _fromAccountId,
            decoration: const InputDecoration(labelText: 'Account'),
            items: widget.accounts.map((acc) {
              return DropdownMenuItem(
                value: acc.id,
                child: Text('${acc.name} (${widget.currencySymbol}${acc.balance.toStringAsFixed(2)})'),
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
            );
            if (picked != null) setState(() => _date = picked);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.dividerColor),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  DateFormatter.formatDate(_date),
                  style: const TextStyle(fontSize: 14, color: AppColors.textPrimary),
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
          decoration: const InputDecoration(
            labelText: 'Description (Optional)',
          ),
        ),

        const SizedBox(height: 24),

        // ── Save Button ──
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
                  'Save Changes',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
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
              side: const BorderSide(color: Color(0xFFFECACA)),
              backgroundColor: const Color(0xFFFEF2F2),
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildTypeTab(String type, String label, Color activeColor) {
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
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
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
              color: isSelected ? activeColor : AppColors.textMuted,
            ),
          ),
        ),
      ),
    );
  }
}
