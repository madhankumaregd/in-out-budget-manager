import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/currency_formatter.dart';
import '../../models/transaction_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/budget_provider.dart';
import '../../widgets/transaction_tile.dart';
import '../../widgets/transaction_detail_sheet.dart';
import '../../widgets/edit_transaction_sheet.dart';
import '../../widgets/month_analysis_sheet.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  final _searchController = TextEditingController();
  bool _showFilters = false;

  static const int _baseYear = 2020;
  static const int _totalMonths = 240; // 2020 - 2040

  late PageController _pageController;
  int _lastSyncedPage = -1;

  int _monthToIndex(DateTime d) => (d.year - _baseYear) * 12 + (d.month - 1);
  DateTime _indexToMonth(int idx) => DateTime(_baseYear + (idx ~/ 12), (idx % 12) + 1, 1);

  @override
  void initState() {
    super.initState();
    final budget = context.read<BudgetProvider>();
    final initialPage = _monthToIndex(budget.selectedMonth).clamp(0, _totalMonths - 1);
    _lastSyncedPage = initialPage;
    _pageController = PageController(initialPage: initialPage);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  void _animateToPrevMonth() {
    if (_pageController.hasClients && _pageController.page != null) {
      final prev = (_pageController.page!.round() - 1).clamp(0, _totalMonths - 1);
      _pageController.animateToPage(
        prev,
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeOutCubic,
      );
    }
  }

  void _animateToNextMonth() {
    if (_pageController.hasClients && _pageController.page != null) {
      final next = (_pageController.page!.round() + 1).clamp(0, _totalMonths - 1);
      _pageController.animateToPage(
        next,
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeOutCubic,
      );
    }
  }

  void _animateToCurrentMonth() {
    if (_pageController.hasClients) {
      final targetPage = _monthToIndex(DateTime.now()).clamp(0, _totalMonths - 1);
      _pageController.animateToPage(
        targetPage,
        duration: const Duration(milliseconds: 380),
        curve: Curves.easeOutCubic,
      );
    }
  }

  void _showEditSheet(BuildContext context, TransactionModel transaction) {
    final budget = context.read<BudgetProvider>();
    final currency = context.read<AuthProvider>().currencySymbol;
    EditTransactionSheet.show(
      context: context,
      transaction: transaction,
      accounts: budget.accounts,
      currencySymbol: currency,
      onSave: ({
        required newType,
        required newAmount,
        required newCategory,
        required newFromAccountId,
        newToAccountId,
        required newDate,
        required newDescription,
      }) async {
        await budget.updateTransaction(
          transaction.id,
          {
            'type': newType,
            'amount': newAmount,
            'category': newCategory,
            'fromAccountId': newFromAccountId,
            'toAccountId': newToAccountId,
            'date': newDate,
            'description': newDescription,
          },
        );
      },
      onDelete: () async {
        await budget.deleteTransaction(transaction.id);
      },
    );
  }

  void _showTransactionDetails(BuildContext context, TransactionModel tx, String currency) {
    final budget = context.read<BudgetProvider>();
    TransactionDetailSheet.show(
      context: context,
      transaction: tx,
      currencySymbol: currency,
      onEdit: () => _showEditSheet(context, tx),
      onDelete: () async {
        try {
          await budget.deleteTransaction(tx.id);
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Transaction deleted'),
                backgroundColor: AppColors.incomeGreen,
                duration: Duration(seconds: 2),
              ),
            );
          }
        } catch (e) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Failed to delete transaction: $e'),
                backgroundColor: AppColors.expenseRed,
              ),
            );
          }
        }
      },
    );
  }

  Future<void> _confirmDelete(BuildContext context, TransactionModel transaction) async {
    // Delete immediately without confirmation popup; users should see it as directly deleted
    try {
      await context.read<BudgetProvider>().deleteTransaction(transaction.id);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Transaction deleted'),
            backgroundColor: AppColors.incomeGreen,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to delete transaction: $e'),
            backgroundColor: AppColors.expenseRed,
          ),
        );
      }
    }
  }

  Future<void> _pickDateRange(BuildContext context) async {
    final budget = context.read<BudgetProvider>();
    final initialRange = (budget.dateRangeStart != null && budget.dateRangeEnd != null)
        ? DateTimeRange(start: budget.dateRangeStart!, end: budget.dateRangeEnd!)
        : DateTimeRange(
            start: DateTime.now().subtract(const Duration(days: 30)),
            end: DateTime.now(),
          );

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      initialDateRange: initialRange,
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
      budget.setDateRange(picked.start, picked.end);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final budget = context.watch<BudgetProvider>();
    final currency = auth.currencySymbol;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF0F172A) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);
    final textPrimaryColor = isDark ? Colors.white : AppColors.textPrimary;
    final textSecondaryColor = isDark ? const Color(0xFF94A3B8) : Colors.grey.shade600;
    final inputBg = isDark ? const Color(0xFF1E293B) : Colors.grey.shade100;

    final desiredPage = _monthToIndex(budget.selectedMonth).clamp(0, _totalMonths - 1);
    if (_pageController.hasClients && _lastSyncedPage != desiredPage) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_pageController.hasClients && _pageController.page?.round() != desiredPage) {
          _pageController.jumpToPage(desiredPage);
        }
      });
      _lastSyncedPage = desiredPage;
    }

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Column(
        children: [
          // Top Controls Bar (Search + Filter Toggle)
          _buildTopSearchBar(context, budget, cardBg, cardBorder, inputBg, textPrimaryColor, isDark),

          // Expandable Filter Drawer
          if (_showFilters)
            _buildFilterPanel(context, budget, cardBg, cardBorder, textPrimaryColor, textSecondaryColor, inputBg, isDark),

          // Month Navigator Header (if custom date range is NOT active)
          if (!budget.isCustomRangeActive)
            _buildMonthNavigatorHeader(context, budget, currency, cardBg, cardBorder, textPrimaryColor, isDark)
          else
            _buildCustomRangeActiveHeader(context, budget),

          // Transaction List Content
          Expanded(
            child: budget.isCustomRangeActive
                ? _buildCustomRangeGroupedList(context, budget, currency, cardBg, cardBorder, textPrimaryColor, textSecondaryColor)
                : _buildMonthPageView(context, budget, currency, textSecondaryColor, isDark),
          ),
        ],
      ),
    );
  }

  Widget _buildTopSearchBar(
    BuildContext context,
    BudgetProvider budget,
    Color cardBg,
    Color cardBorder,
    Color inputBg,
    Color textPrimaryColor,
    bool isDark,
  ) {
    return Container(
      color: cardBg,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        children: [
          Expanded(
            child: Container(
              height: 44,
              decoration: BoxDecoration(
                color: inputBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: cardBorder),
              ),
              child: TextField(
                controller: _searchController,
                style: TextStyle(color: textPrimaryColor, fontSize: 14),
                onChanged: (val) => budget.setSearchQuery(val),
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search, size: 20, color: Colors.grey),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18, color: Colors.grey),
                          onPressed: () {
                            _searchController.clear();
                            budget.setSearchQuery('');
                          },
                        )
                      : null,
                  hintText: 'Search by description or category...',
                  hintStyle: const TextStyle(fontSize: 13, color: Colors.grey),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  fillColor: Colors.transparent,
                  contentPadding: const EdgeInsets.symmetric(vertical: 10),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => setState(() => _showFilters = !_showFilters),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                height: 44,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: _showFilters || budget.hasActiveFilters
                      ? AppColors.primaryIndigo.withOpacity(0.12)
                      : inputBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _showFilters || budget.hasActiveFilters
                        ? AppColors.primaryIndigo
                        : cardBorder,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.filter_list_rounded,
                      size: 20,
                      color: _showFilters || budget.hasActiveFilters
                          ? AppColors.primaryIndigo
                          : (isDark ? Colors.grey.shade400 : Colors.grey.shade700),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Filters',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: _showFilters || budget.hasActiveFilters
                            ? AppColors.primaryIndigo
                            : (isDark ? Colors.grey.shade300 : Colors.grey.shade700),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterPanel(
    BuildContext context,
    BudgetProvider budget,
    Color cardBg,
    Color cardBorder,
    Color textPrimaryColor,
    Color textSecondaryColor,
    Color inputBg,
    bool isDark,
  ) {
    return Container(
      width: double.infinity,
      color: cardBg,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Divider(height: 1, color: cardBorder),
          const SizedBox(height: 12),

          // Type Filter Chips
          Text('Transaction Type', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: textSecondaryColor)),
          const SizedBox(height: 6),
          Row(
            children: [
              _buildTypeChip(budget, 'all', 'All', inputBg, cardBorder, textPrimaryColor),
              const SizedBox(width: 6),
              _buildTypeChip(budget, 'income', 'Income', inputBg, cardBorder, textPrimaryColor),
              const SizedBox(width: 6),
              _buildTypeChip(budget, 'expense', 'Expense', inputBg, cardBorder, textPrimaryColor),
              const SizedBox(width: 6),
              _buildTypeChip(budget, 'transfer', 'Transfer', inputBg, cardBorder, textPrimaryColor),
            ],
          ),
          const SizedBox(height: 12),

          // Account selector & Date Range Picker
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Account', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: textSecondaryColor)),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: inputBg,
                        border: Border.all(color: cardBorder),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          isExpanded: true,
                          dropdownColor: cardBg,
                          iconEnabledColor: textPrimaryColor,
                          style: TextStyle(fontSize: 13, color: textPrimaryColor),
                          value: budget.filterAccountId.isEmpty ? 'all' : budget.filterAccountId,
                          items: [
                            DropdownMenuItem(
                              value: 'all',
                              child: Text('All Accounts', style: TextStyle(fontSize: 13, color: textPrimaryColor)),
                            ),
                            ...budget.accounts.map(
                              (a) => DropdownMenuItem(
                                value: a.id,
                                child: Text(a.name, style: TextStyle(fontSize: 13, color: textPrimaryColor)),
                              ),
                            ),
                          ],
                          onChanged: (val) {
                            budget.setAccountFilter(val == 'all' ? '' : val ?? '');
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Custom Date Range', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: textSecondaryColor)),
                    const SizedBox(height: 6),
                    InkWell(
                      onTap: () => _pickDateRange(context),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                        decoration: BoxDecoration(
                          color: budget.isCustomRangeActive
                              ? AppColors.primaryViolet.withValues(alpha: 0.12)
                              : inputBg,
                          border: Border.all(
                            color: budget.isCustomRangeActive ? AppColors.primaryViolet : cardBorder,
                          ),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.date_range_rounded,
                              size: 16,
                              color: budget.isCustomRangeActive ? AppColors.primaryIndigo : textSecondaryColor,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                budget.isCustomRangeActive
                                    ? '${DateFormat('MM/dd').format(budget.dateRangeStart!)} - ${DateFormat('MM/dd').format(budget.dateRangeEnd!)}'
                                    : 'Select Range',
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: budget.isCustomRangeActive ? FontWeight.bold : FontWeight.normal,
                                  color: budget.isCustomRangeActive ? AppColors.primaryIndigo : textPrimaryColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Clear filters button
          if (budget.hasActiveFilters)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () {
                  _searchController.clear();
                  budget.clearFilters();
                },
                icon: const Icon(Icons.clear_all_rounded, size: 16, color: AppColors.expenseRed),
                label: const Text('Reset All Filters', style: TextStyle(color: AppColors.expenseRed, fontSize: 12)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTypeChip(
    BudgetProvider budget,
    String type,
    String label,
    Color inputBg,
    Color cardBorder,
    Color textPrimaryColor,
  ) {
    final isSelected = budget.filterType == type;
    return Expanded(
      child: InkWell(
        onTap: () => budget.setTypeFilter(type),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primaryIndigo : inputBg,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: isSelected ? AppColors.primaryIndigo : cardBorder),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              color: isSelected ? Colors.white : textPrimaryColor,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMonthNavigatorHeader(
    BuildContext context,
    BudgetProvider budget,
    String currency,
    Color cardBg,
    Color cardBorder,
    Color textPrimaryColor,
    bool isDark,
  ) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: cardBg,
        border: Border(bottom: BorderSide(color: cardBorder)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Left arrow: Go to previous month
              IconButton(
                icon: Icon(Icons.chevron_left_rounded, size: 28, color: textPrimaryColor),
                tooltip: 'Previous month (or swipe left)',
                onPressed: _animateToPrevMonth,
              ),

              // Center: Month Name & Today Reset
              InkWell(
                onTap: _animateToCurrentMonth,
                borderRadius: BorderRadius.circular(10),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  child: Column(
                    children: [
                      Text(
                        budget.monthDisplayName,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: textPrimaryColor,
                        ),
                      ),
                      if (!budget.isCurrentMonth)
                        Container(
                          margin: const EdgeInsets.only(top: 2),
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primaryViolet.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'Jump to Current Month',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primaryViolet,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),

              // Right arrow: Go to next month
              IconButton(
                icon: Icon(Icons.chevron_right_rounded, size: 28, color: textPrimaryColor),
                tooltip: 'Next month (or swipe right)',
                onPressed: _animateToNextMonth,
              ),
            ],
          ),
          const SizedBox(height: 6),

          // Monthly Total Badges (+Income, -Expense) & Monthly Analysis Button
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.incomeGreen.withValues(alpha: 0.18) : AppColors.incomeBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '+${CurrencyFormatter.format(budget.currentMonthIncome, currency: currency)}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.incomeGreen,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.expenseRed.withValues(alpha: 0.18) : AppColors.expenseBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '-${CurrencyFormatter.format(budget.currentMonthExpense, currency: currency)}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.expenseRed,
                  ),
                ),
              ),
              const SizedBox(width: 10),

              // Monthly Analysis Button
              InkWell(
                onTap: () {
                  MonthAnalysisSheet.show(
                    context: context,
                    month: budget.selectedMonth,
                    transactions: budget.transactions,
                    currency: currency,
                  );
                },
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryIndigo.withValues(alpha: 0.3),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.pie_chart_rounded, size: 14, color: Colors.white),
                      SizedBox(width: 4),
                      Text(
                        'Analysis',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCustomRangeActiveHeader(BuildContext context, BudgetProvider budget) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: AppColors.primaryIndigo.withOpacity(0.08),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Icon(Icons.calendar_today_rounded, size: 16, color: AppColors.primaryIndigo),
              const SizedBox(width: 8),
              Text(
                'Custom Range: ${DateFormat('MMM dd, yyyy').format(budget.dateRangeStart!)} - ${DateFormat('MMM dd, yyyy').format(budget.dateRangeEnd!)}',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryIndigo,
                ),
              ),
            ],
          ),
          InkWell(
            onTap: () => budget.clearDateRangeOnly(),
            borderRadius: BorderRadius.circular(6),
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 6, vertical: 4),
              child: Row(
                children: [
                  Icon(Icons.close, size: 14, color: AppColors.expenseRed),
                  SizedBox(width: 2),
                  Text(
                    'Clear Range',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.expenseRed,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMonthPageView(
    BuildContext context,
    BudgetProvider budget,
    String currency,
    Color textSecondaryColor,
    bool isDark,
  ) {
    return PageView.builder(
      controller: _pageController,
      itemCount: _totalMonths,
      physics: const AlwaysScrollableScrollPhysics(),
      onPageChanged: (page) {
        _lastSyncedPage = page;
        final newMonth = _indexToMonth(page);
        budget.setSelectedMonth(newMonth);
      },
      itemBuilder: (context, pageIndex) {
        final month = _indexToMonth(pageIndex);
        final txList = budget.getTransactionsForMonth(month);

        if (txList.isEmpty) {
          return RefreshIndicator(
            color: AppColors.primaryIndigo,
            onRefresh: () async {
              final user = context.read<AuthProvider>().currentUser;
              if (user != null) budget.updateUser(user.uid);
            },
            child: LayoutBuilder(
              builder: (ctx, constraints) {
                return SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  child: Container(
                    width: constraints.maxWidth,
                    height: constraints.maxHeight,
                    color: Colors.transparent, // Ensures entire empty viewport receives horizontal drag events
                    alignment: Alignment.center,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.receipt_long_rounded,
                            size: 56,
                            color: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'No transactions in ${DateFormat('MMMM yyyy').format(month)}',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: textSecondaryColor,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Swipe left / right to navigate months',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? Colors.grey.shade600 : Colors.grey.shade400,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        }

        return RefreshIndicator(
          color: AppColors.primaryIndigo,
          onRefresh: () async {
            final user = context.read<AuthProvider>().currentUser;
            if (user != null) budget.updateUser(user.uid);
          },
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            itemCount: txList.length,
            itemBuilder: (ctx, index) {
              final tx = txList[index];
              return TransactionTile(
                transaction: tx,
                currency: currency,
                onTap: () => _showTransactionDetails(context, tx, currency),
                onEdit: () => _showTransactionDetails(context, tx, currency),
                onDelete: () => _confirmDelete(context, tx),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildCustomRangeGroupedList(
    BuildContext context,
    BudgetProvider budget,
    String currency,
    Color cardBg,
    Color cardBorder,
    Color textPrimaryColor,
    Color textSecondaryColor,
  ) {
    final grouped = budget.customRangeGroupedTransactions;

    if (grouped.isEmpty) {
      return RefreshIndicator(
        color: AppColors.primaryIndigo,
        onRefresh: () async {
          final user = context.read<AuthProvider>().currentUser;
          if (user != null) budget.updateUser(user.uid);
        },
        child: LayoutBuilder(
          builder: (ctx, constraints) {
            return SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.filter_alt_off_rounded, size: 56, color: Colors.grey.shade400),
                      const SizedBox(height: 12),
                      Text(
                        'No transactions match this date range',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: textSecondaryColor),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primaryIndigo,
      onRefresh: () async {
        final user = context.read<AuthProvider>().currentUser;
        if (user != null) budget.updateUser(user.uid);
      },
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        itemCount: grouped.length,
        itemBuilder: (ctx, index) {
          final monthKey = grouped.keys.elementAt(index);
          final txList = grouped[monthKey]!;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Month Header Section
              Container(
                margin: const EdgeInsets.symmetric(vertical: 8),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: cardBorder),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.calendar_month_rounded, size: 16, color: AppColors.primaryIndigo),
                        const SizedBox(width: 6),
                        Text(
                          monthKey,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: textPrimaryColor,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '${txList.length} transaction${txList.length == 1 ? '' : 's'}',
                      style: TextStyle(fontSize: 12, color: textSecondaryColor),
                    ),
                  ],
                ),
              ),

              // Transactions under this month
              ...txList.map((tx) {
                return TransactionTile(
                  transaction: tx,
                  currency: currency,
                  onTap: () => _showTransactionDetails(context, tx, currency),
                  onEdit: () => _showTransactionDetails(context, tx, currency),
                  onDelete: () => _confirmDelete(context, tx),
                );
              }),
            ],
          );
        },
      ),
    );
  }
}
