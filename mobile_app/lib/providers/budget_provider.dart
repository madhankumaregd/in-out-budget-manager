import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/firestore_service.dart';
import '../models/account_model.dart';
import '../models/transaction_model.dart';

class BudgetProvider extends ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();

  String? _currentUserId;
  StreamSubscription<List<AccountModel>>? _accountsSub;
  StreamSubscription<List<TransactionModel>>? _transactionsSub;

  List<AccountModel> _accounts = [];
  List<TransactionModel> _transactions = [];

  bool _isLoading = true;

  // Filters & Month Navigation
  DateTime _selectedMonth = DateTime.now();
  String _searchQuery = '';
  String _typeFilter = 'all'; // 'all' | 'income' | 'expense' | 'transfer'
  String? _accountFilterId;
  DateTime? _customStartDate;
  DateTime? _customEndDate;

  List<AccountModel> get accounts => _accounts;
  List<TransactionModel> get transactions => _transactions;
  bool get isLoading => _isLoading;

  DateTime get selectedMonth => _selectedMonth;
  String get searchQuery => _searchQuery;
  String get typeFilter => _typeFilter;
  String get filterType => _typeFilter;
  String? get accountFilterId => _accountFilterId;
  String get filterAccountId => _accountFilterId ?? '';
  DateTime? get customStartDate => _customStartDate;
  DateTime? get customEndDate => _customEndDate;
  DateTime? get dateRangeStart => _customStartDate;
  DateTime? get dateRangeEnd => _customEndDate;

  bool get isCustomDateFilterActive =>
      _customStartDate != null || _customEndDate != null;
  bool get isCustomRangeActive => isCustomDateFilterActive;

  bool get hasActiveFilters =>
      _searchQuery.isNotEmpty ||
      _typeFilter != 'all' ||
      (_accountFilterId != null && _accountFilterId!.isNotEmpty) ||
      isCustomDateFilterActive;

  bool get isCurrentMonth {
    final now = DateTime.now();
    return _selectedMonth.year == now.year && _selectedMonth.month == now.month;
  }

  String get monthDisplayName => DateFormat('MMMM yyyy').format(_selectedMonth);

  // ─── Bind User Streams ───
  void updateUser(String? userId) {
    if (_currentUserId == userId) return;
    _currentUserId = userId;

    _accountsSub?.cancel();
    _transactionsSub?.cancel();

    if (userId != null && userId.isNotEmpty) {
      _isLoading = true;
      notifyListeners();

      _accountsSub = _firestoreService.getUserAccountsStream(userId).listen((accs) {
        _accounts = accs;
        _isLoading = false;
        notifyListeners();
      });

      _transactionsSub =
          _firestoreService.getUserTransactionsStream(userId).listen((txs) {
        _transactions = txs;
        _isLoading = false;
        notifyListeners();
      });
    } else {
      _accounts = [];
      _transactions = [];
      _isLoading = false;
      notifyListeners();
    }
  }

  void setUser(String? userId) => updateUser(userId);

  // ─── Total Financial Aggregations ───
  double get totalBalance {
    return _accounts.fold(0.0, (sum, acc) => sum + acc.balance);
  }

  bool isRecent30Days(DateTime d) {
    final thirtyDaysAgo = DateTime.now().subtract(const Duration(days: 30));
    return d.isAfter(thirtyDaysAgo);
  }

  double get totalIncomeLast30Days {
    final thirtyDaysAgo = DateTime.now().subtract(const Duration(days: 30));
    return _transactions
        .where((t) => t.type == 'income' && t.date.isAfter(thirtyDaysAgo))
        .fold(0.0, (sum, t) => sum + t.amount);
  }
  double get recent30DaysIncome => totalIncomeLast30Days;

  double get totalExpenseLast30Days {
    final thirtyDaysAgo = DateTime.now().subtract(const Duration(days: 30));
    return _transactions
        .where((t) => t.type == 'expense' && t.date.isAfter(thirtyDaysAgo))
        .fold(0.0, (sum, t) => sum + t.amount);
  }
  double get recent30DaysExpense => totalExpenseLast30Days;

  double get currentMonthIncome {
    return currentMonthTransactions
        .where((t) => t.type == 'income')
        .fold(0.0, (sum, t) => sum + t.amount);
  }

  double get currentMonthExpense {
    return currentMonthTransactions
        .where((t) => t.type == 'expense')
        .fold(0.0, (sum, t) => sum + t.amount);
  }

  // ─── Monthly Summary for Charts ───
  List<Map<String, dynamic>> get monthlySummaryData {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    final currentYear = DateTime.now().year;
    final List<Map<String, dynamic>> result = [];

    for (int i = 0; i < months.length; i++) {
      final monthTxs = _transactions.where(
        (t) => t.date.year == currentYear && t.date.month == (i + 1),
      );
      final income = monthTxs
          .where((t) => t.type == 'income')
          .fold(0.0, (sum, t) => sum + t.amount);
      final expense = monthTxs
          .where((t) => t.type == 'expense')
          .fold(0.0, (sum, t) => sum + t.amount);

      if (income > 0 || expense > 0) {
        result.add({
          'month': months[i],
          'income': income,
          'expense': expense,
        });
      }
    }
    return result;
  }
  List<Map<String, dynamic>> get monthlySummaries => monthlySummaryData;

  // ─── Category Breakdown for Donut Chart ───
  Map<String, double> get categorySpendingData {
    final Map<String, double> result = {};
    for (var tx in _transactions) {
      if (tx.type == 'expense' && tx.category.isNotEmpty) {
        result[tx.category] = (result[tx.category] ?? 0.0) + tx.amount;
      }
    }
    return result;
  }
  Map<String, double> get categoryExpenseData => categorySpendingData;

  // ─── Filter & Navigation Controls ───
  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void setTypeFilter(String type) {
    _typeFilter = type;
    notifyListeners();
  }

  void setAccountFilter(String? accountId) {
    _accountFilterId = (accountId == null || accountId.isEmpty || accountId == 'all')
        ? null
        : accountId;
    notifyListeners();
  }

  void setCustomDateRange(DateTime? start, DateTime? end) {
    _customStartDate = start;
    _customEndDate = end;
    notifyListeners();
  }
  void setDateRange(DateTime? start, DateTime? end) => setCustomDateRange(start, end);

  void clearCustomDateRange() {
    _customStartDate = null;
    _customEndDate = null;
    notifyListeners();
  }
  void clearDateRangeOnly() => clearCustomDateRange();

  void clearAllFilters() {
    _searchQuery = '';
    _typeFilter = 'all';
    _accountFilterId = null;
    _customStartDate = null;
    _customEndDate = null;
    notifyListeners();
  }
  void clearFilters() => clearAllFilters();

  void prevMonth() {
    _selectedMonth = DateTime(_selectedMonth.year, _selectedMonth.month - 1, 1);
    notifyListeners();
  }
  void goToPrevMonth() => prevMonth();

  void nextMonth() {
    _selectedMonth = DateTime(_selectedMonth.year, _selectedMonth.month + 1, 1);
    notifyListeners();
  }
  void goToNextMonth() => nextMonth();

  void setToday() {
    _selectedMonth = DateTime.now();
    notifyListeners();
  }
  void goToCurrentMonth() => setToday();

  void setSelectedMonth(DateTime month) {
    _selectedMonth = DateTime(month.year, month.month, 1);
    notifyListeners();
  }

  List<TransactionModel> getTransactionsForMonth(DateTime month) {
    if (isCustomDateFilterActive) return [];
    return baseFilteredTransactions.where((t) {
      return t.date.year == month.year && t.date.month == month.month;
    }).toList();
  }

  double getMonthIncome(DateTime month) {
    return getTransactionsForMonth(month)
        .where((t) => t.type == 'income')
        .fold(0.0, (sum, t) => sum + t.amount);
  }

  double getMonthExpense(DateTime month) {
    return getTransactionsForMonth(month)
        .where((t) => t.type == 'expense')
        .fold(0.0, (sum, t) => sum + t.amount);
  }

  // ─── Filtered Transactions ───
  List<TransactionModel> get baseFilteredTransactions {
    return _transactions.where((t) {
      if (_typeFilter != 'all' && t.type != _typeFilter) return false;
      if (_accountFilterId != null &&
          _accountFilterId!.isNotEmpty &&
          t.fromAccountId != _accountFilterId &&
          t.toAccountId != _accountFilterId) {
        return false;
      }
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final descMatch = t.description.toLowerCase().contains(q);
        final catMatch = t.category.toLowerCase().contains(q);
        if (!descMatch && !catMatch) return false;
      }
      if (_customStartDate != null && t.date.isBefore(_customStartDate!)) {
        return false;
      }
      if (_customEndDate != null) {
        final endOfDay = DateTime(
          _customEndDate!.year,
          _customEndDate!.month,
          _customEndDate!.day,
          23,
          59,
          59,
        );
        if (t.date.isAfter(endOfDay)) return false;
      }
      return true;
    }).toList();
  }

  List<TransactionModel> get currentMonthTransactions {
    if (isCustomDateFilterActive) return [];
    return baseFilteredTransactions.where((t) {
      return t.date.year == _selectedMonth.year &&
          t.date.month == _selectedMonth.month;
    }).toList();
  }
  List<TransactionModel> get filteredTransactions => currentMonthTransactions;

  // ─── Grouped by Month (for Custom Date Range View) ───
  Map<String, List<TransactionModel>> get customRangeGroupedTransactions {
    final Map<String, List<TransactionModel>> groups = {};
    for (var tx in baseFilteredTransactions) {
      final key = DateFormat('MMMM yyyy').format(tx.date);
      groups.putIfAbsent(key, () => []).add(tx);
    }
    return groups;
  }
  Map<String, List<TransactionModel>> get monthGroups => customRangeGroupedTransactions;

  // ─── Inverted Balance Trend History for an Account ───
  // Past on the LEFT edge, current balance today on the RIGHT edge!
  List<Map<String, dynamic>> getAccountBalanceHistory(
    String accountId,
    double currentBalance,
  ) {
    final accountTxs = _transactions.where(
      (t) => t.fromAccountId == accountId || t.toAccountId == accountId,
    ).toList();

    if (accountTxs.isEmpty) {
      final past = DateTime.now().subtract(const Duration(days: 30));
      return [
        {'date': past, 'balance': currentBalance},
        {'date': DateTime.now(), 'balance': currentBalance},
      ];
    }

    // Sort descending (newest first)
    accountTxs.sort((a, b) => b.date.compareTo(a.date));

    final List<Map<String, dynamic>> points = [
      {'date': DateTime.now(), 'balance': currentBalance}
    ];

    double running = currentBalance;
    for (var t in accountTxs) {
      if (t.type == 'income' || t.toAccountId == accountId) {
        running -= t.amount;
      } else if (t.type == 'expense' || t.fromAccountId == accountId) {
        running += t.amount;
      }
      points.add({'date': t.date, 'balance': running});
    }

    // Reverse: points[0] = oldest past (LEFT), points[last] = today (RIGHT)
    final chronological = points.reversed.toList();
    if (chronological.length == 1) {
      final past = chronological.first['date'] as DateTime;
      return [
        {'date': past.subtract(const Duration(days: 7)), 'balance': currentBalance},
        chronological.first,
      ];
    }
    return chronological.length > 30
        ? chronological.sublist(chronological.length - 30)
        : chronological;
  }

  List<Map<String, dynamic>> calculateInvertedBalanceTrend(
    String accountId,
    double currentBalance,
  ) =>
      getAccountBalanceHistory(accountId, currentBalance);

  // ─── CRUD Operations ───
  Future<void> addAccount({
    required String name,
    required String type,
    required double initialBalance,
  }) async {
    if (_currentUserId == null) return;
    await _firestoreService.createAccount(
      _currentUserId!,
      name: name,
      type: type,
      initialBalance: initialBalance,
    );
  }

  Future<void> createAccount(Map<String, dynamic> data) async {
    await addAccount(
      name: data['name'] ?? '',
      type: data['type'] ?? 'bank',
      initialBalance: (data['initialBalance'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Future<void> updateAccount({
    required String accountId,
    required String name,
    required String type,
    required double balance,
  }) async {
    if (_currentUserId == null) return;
    await _firestoreService.updateAccount(
      _currentUserId!,
      accountId,
      name: name,
      type: type,
      balance: balance,
    );
  }

  Future<void> deleteAccount(String accountId) async {
    if (_currentUserId == null) return;
    await _firestoreService.deleteAccount(_currentUserId!, accountId);
  }

  Future<void> addTransaction({
    required String type,
    required double amount,
    required String category,
    required String fromAccountId,
    String? toAccountId,
    required DateTime date,
    String description = '',
  }) async {
    if (_currentUserId == null) return;
    await _firestoreService.createTransaction(
      _currentUserId!,
      type: type,
      amount: amount,
      category: category,
      fromAccountId: fromAccountId,
      toAccountId: toAccountId,
      date: date,
      description: description,
    );
  }

  Future<void> createTransaction(Map<String, dynamic> data) async {
    await addTransaction(
      type: data['type'] ?? 'expense',
      amount: (data['amount'] as num?)?.toDouble() ?? 0.0,
      category: data['category'] ?? 'General',
      fromAccountId: data['fromAccountId'] ?? '',
      toAccountId: data['toAccountId'],
      date: (data['date'] is DateTime) ? data['date'] : DateTime.now(),
      description: data['description'] ?? '',
    );
  }

  Future<void> updateTransaction(
    String transactionId,
    Map<String, dynamic> data,
  ) async {
    if (_currentUserId == null) return;
    await _firestoreService.updateTransaction(
      _currentUserId!,
      transactionId,
      newType: data['type'] ?? 'expense',
      newAmount: (data['amount'] as num?)?.toDouble() ?? 0.0,
      newCategory: data['category'] ?? 'General',
      newFromAccountId: data['fromAccountId'] ?? '',
      newToAccountId: data['toAccountId'],
      newDate: (data['date'] is DateTime) ? data['date'] : DateTime.now(),
      newDescription: data['description'] ?? '',
    );
  }

  Future<void> deleteTransaction(String transactionId) async {
    if (_currentUserId == null) return;
    await _firestoreService.deleteTransaction(_currentUserId!, transactionId);
  }

  String getAccountName(String? accountId) {
    if (accountId == null) return '—';
    final acc = _accounts.firstWhere(
      (a) => a.id == accountId,
      orElse: () => AccountModel(
        id: accountId,
        name: 'Account',
        type: 'other',
        balance: 0,
        currency: 'INR',
        createdAt: DateTime.now(),
      ),
    );
    return acc.name;
  }

  @override
  void dispose() {
    _accountsSub?.cancel();
    _transactionsSub?.cancel();
    super.dispose();
  }
}
