import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/account_model.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_constants.dart';
import '../core/utils/date_formatter.dart';
import '../providers/auth_provider.dart';
import 'swipe_dismiss_bottom_sheet.dart';

class AddTransactionSheet extends StatefulWidget {
  final String initialType; // 'income' | 'expense'
  final List<AccountModel> accounts;
  final String currencySymbol;
  final Function({
    required String type,
    required double amount,
    required String category,
    required String fromAccountId,
    required DateTime date,
    required String description,
  }) onSave;

  const AddTransactionSheet({
    super.key,
    required this.initialType,
    required this.accounts,
    this.currencySymbol = '₹',
    required this.onSave,
  });

  static void show({
    required BuildContext context,
    required String type,
    required List<AccountModel> accounts,
    String currencySymbol = '₹',
    required Function({
      required String type,
      required double amount,
      required String category,
      required String fromAccountId,
      required DateTime date,
      required String description,
    }) onSave,
  }) {
    SwipeDismissBottomSheet.show(
      context: context,
      showHeader: false,
      child: AddTransactionSheet(
        initialType: type,
        accounts: accounts,
        currencySymbol: currencySymbol,
        onSave: onSave,
      ),
    );
  }

  @override
  State<AddTransactionSheet> createState() => _AddTransactionSheetState();
}

class _AddTransactionSheetState extends State<AddTransactionSheet> {
  late String _type;
  late String _category;
  String? _selectedAccountId;
  DateTime _date = DateTime.now();

  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _type = widget.initialType;
    _category = _type == 'income'
        ? AppConstants.incomeCategories.first
        : AppConstants.expenseCategories.first;
    if (widget.accounts.isNotEmpty) {
      _selectedAccountId = widget.accounts.first.id;
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

    if (_selectedAccountId == null) {
      setState(() => _error = 'Please select an account');
      return;
    }

    setState(() => _isLoading = true);
    try {
      await widget.onSave(
        type: _type,
        amount: amount,
        category: _category,
        fromAccountId: _selectedAccountId!,
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

  void _showAddCustomCategoryDialog(BuildContext context) {
    final catController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return AlertDialog(
          backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(
            'New ${_type == 'income' ? 'Income' : 'Expense'} Category',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : AppColors.textPrimary,
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'This category will be saved to your account in the database and available for all future activities.',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: catController,
                autofocus: true,
                style: TextStyle(color: isDark ? Colors.white : AppColors.textPrimary, fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'e.g. Freelance, Rent, Gym...',
                  hintStyle: TextStyle(color: isDark ? Colors.grey.shade500 : Colors.grey.shade400, fontSize: 13),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('Cancel', style: TextStyle(color: isDark ? Colors.grey.shade400 : Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () async {
                final text = catController.text.trim();
                if (text.isNotEmpty) {
                  Navigator.pop(ctx);
                  await context.read<AuthProvider>().addCustomCategory(text, _type);
                  setState(() => _category = text);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryIndigo,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Add Category'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final customCats = _type == 'income'
        ? (auth.userProfile?.customIncomeCategories ?? [])
        : (auth.userProfile?.customExpenseCategories ?? []);
    final baseCats = _type == 'income'
        ? AppConstants.incomeCategories
        : AppConstants.expenseCategories;
    final categories = [...baseCats, ...customCats];
    if (!categories.contains(_category)) {
      _category = categories.first;
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final toggleBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);
    final activeTabBg = isDark ? const Color(0xFF334155) : Colors.white;
    final textPrimary = isDark ? Colors.white : AppColors.textPrimary;
    final textMuted = isDark ? const Color(0xFF94A3B8) : AppColors.textMuted;
    final inputBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC);
    final inputBorder = isDark ? const Color(0xFF334155) : AppColors.dividerColor;
    final dropdownBg = isDark ? const Color(0xFF1E293B) : Colors.white;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Dynamic Reactive Header ──
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _type == 'income' ? 'Add Income' : 'Add Expense',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _type == 'income'
                        ? 'Record earnings or deposit'
                        : 'Record spending or purchase',
                    style: TextStyle(
                      fontSize: 12,
                      color: textMuted,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: Icon(Icons.close_rounded, color: textMuted),
              onPressed: () => Navigator.of(context).pop(),
              tooltip: 'Close',
            ),
          ],
        ),
        const SizedBox(height: 12),

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

        // ── Type Toggle ──
        Container(
          decoration: BoxDecoration(
            color: toggleBg,
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.all(4),
          child: Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _type = 'income';
                      final updated = [...AppConstants.incomeCategories, ...(auth.userProfile?.customIncomeCategories ?? [])];
                      _category = updated.first;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: _type == 'income' ? activeTabBg : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: _type == 'income'
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
                      'Income',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: _type == 'income'
                            ? AppColors.incomeGreen
                            : textMuted,
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _type = 'expense';
                      final updated = [...AppConstants.expenseCategories, ...(auth.userProfile?.customExpenseCategories ?? [])];
                      _category = updated.first;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: _type == 'expense' ? activeTabBg : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: _type == 'expense'
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
                      'Expense',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: _type == 'expense'
                            ? AppColors.expenseRed
                            : textMuted,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // ── Amount Input ──
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

        // ── Category Dropdown with Add Custom Category (+) ──
        Row(
          children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                value: _category,
                dropdownColor: dropdownBg,
                style: TextStyle(color: textPrimary, fontSize: 14),
                decoration: InputDecoration(
                  labelText: 'Category',
                  filled: true,
                  fillColor: inputBg,
                ),
                items: [
                  ...categories.map((cat) {
                    return DropdownMenuItem(
                      value: cat,
                      child: Text(cat, style: TextStyle(color: textPrimary)),
                    );
                  }),
                  const DropdownMenuItem(
                    value: '__add_new__',
                    child: Row(
                      children: [
                        Icon(Icons.add_circle_outline_rounded, size: 16, color: AppColors.primaryIndigo),
                        SizedBox(width: 8),
                        Text('+ Add New Category...', style: TextStyle(color: AppColors.primaryIndigo, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ],
                onChanged: (val) {
                  if (val == '__add_new__') {
                    _showAddCustomCategoryDialog(context);
                  } else if (val != null) {
                    setState(() => _category = val);
                  }
                },
              ),
            ),
            const SizedBox(width: 8),
            Container(
              height: 52,
              width: 52,
              decoration: BoxDecoration(
                color: inputBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: inputBorder),
              ),
              child: IconButton(
                onPressed: () => _showAddCustomCategoryDialog(context),
                icon: const Icon(Icons.add_rounded, color: AppColors.primaryIndigo, size: 24),
                tooltip: 'Add Custom Category',
              ),
            ),
          ],
        ),

        const SizedBox(height: 14),

        // ── Account Selector ──
        DropdownButtonFormField<String>(
          value: _selectedAccountId,
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
          onChanged: (val) => setState(() => _selectedAccountId = val),
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

        // ── Description Input ──
        TextField(
          controller: _descriptionController,
          style: TextStyle(color: textPrimary, fontSize: 14),
          decoration: InputDecoration(
            labelText: 'Description (Optional)',
            hintText: 'e.g. Grocery shopping, Movie tickets...',
            filled: true,
            fillColor: inputBg,
          ),
        ),

        const SizedBox(height: 24),

        // ── Submit Button ──
        Container(
          height: 50,
          decoration: BoxDecoration(
            gradient: _type == 'income'
                ? AppColors.cardIncomeGradient
                : AppColors.cardExpenseGradient,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: (_type == 'income' ? AppColors.incomeGreen : AppColors.expenseRed)
                    .withValues(alpha: 0.3),
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
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: _isLoading
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                  )
                : Text(
                    _type == 'income' ? 'Save Income' : 'Save Expense',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
          ),
        ),
      ],
    );
  }
}
