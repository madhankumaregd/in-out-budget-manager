import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/currency_formatter.dart';
import '../../models/account_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/budget_provider.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/add_account_sheet.dart';
import '../../widgets/add_transaction_sheet.dart';
import '../../widgets/transfer_sheet.dart';
import '../../widgets/dashboard_detail_sheet.dart';
import '../../widgets/account_detail_sheet.dart';
import '../../widgets/edit_account_sheet.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  void _showAddTransaction(BuildContext context, String type) {
    final budget = context.read<BudgetProvider>();
    AddTransactionSheet.show(
      context: context,
      type: type,
      accounts: budget.accounts,
      currencySymbol: context.read<AuthProvider>().currencySymbol,
      onSave: ({
        required type,
        required amount,
        required category,
        required fromAccountId,
        required date,
        required description,
      }) async {
        await budget.addTransaction(
          type: type,
          amount: amount,
          category: category,
          fromAccountId: fromAccountId,
          date: date,
          description: description,
        );
      },
    );
  }

  void _showTransfer(BuildContext context) {
    final budget = context.read<BudgetProvider>();
    TransferSheet.show(
      context: context,
      accounts: budget.accounts,
      currencySymbol: context.read<AuthProvider>().currencySymbol,
      onSave: ({
        required type,
        required amount,
        required category,
        required fromAccountId,
        required toAccountId,
        required date,
        required description,
      }) async {
        await budget.addTransaction(
          type: type,
          amount: amount,
          category: category,
          fromAccountId: fromAccountId,
          toAccountId: toAccountId,
          date: date,
          description: description,
        );
      },
    );
  }

  void _showAddAccount(BuildContext context) {
    final budget = context.read<BudgetProvider>();
    AddAccountSheet.show(
      context: context,
      currencySymbol: context.read<AuthProvider>().currencySymbol,
      onSave: (name, type, balance) async {
        await budget.addAccount(
          name: name,
          type: type,
          initialBalance: balance,
        );
      },
    );
  }

  void _showDetailSheet(BuildContext context, String mode) {
    final budget = context.read<BudgetProvider>();
    DashboardDetailSheet.show(
      context: context,
      mode: mode,
      accounts: budget.accounts,
      transactions: budget.transactions,
      currencySymbol: context.read<AuthProvider>().currencySymbol,
    );
  }

  void _showAccountDetail(BuildContext context, AccountModel account) {
    final budget = context.read<BudgetProvider>();
    final currency = context.read<AuthProvider>().currencySymbol;
    AccountDetailSheet.show(
      context: context,
      account: account,
      transactions: budget.transactions,
      currencySymbol: currency,
      onEdit: () {
        Navigator.of(context).pop();
        EditAccountSheet.show(
          context: context,
          account: account,
          currencySymbol: currency,
          onSave: (name, type, balance) async {
            await budget.updateAccount(
              accountId: account.id,
              name: name,
              type: type,
              balance: balance,
            );
          },
        );
      },
      onDelete: () async {
        await budget.deleteAccount(account.id);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final budget = context.watch<BudgetProvider>();

    if (budget.isLoading && budget.accounts.isEmpty && budget.transactions.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primaryIndigo),
      );
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF0F172A) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);
    final textPrimaryColor = isDark ? Colors.white : AppColors.textPrimary;
    final textSecondaryColor = isDark ? const Color(0xFF94A3B8) : AppColors.textSecondary;

    final currency = auth.currencySymbol;
    final userName = auth.userProfile?.displayName.isNotEmpty == true
        ? auth.userProfile!.displayName
        : 'User';

    final totalBalance = budget.totalBalance;
    final totalIncome = budget.recent30DaysIncome;
    final totalExpense = budget.recent30DaysExpense;
    final accounts = budget.accounts;
    final transactions = budget.transactions;

    final incomeCount = transactions.where((t) => t.isIncome && budget.isRecent30Days(t.date)).length;
    final expenseCount = transactions.where((t) => t.isExpense && budget.isRecent30Days(t.date)).length;

    final monthlyData = budget.monthlySummaries;
    final categoryData = budget.categoryExpenseData;

    return RefreshIndicator(
      color: AppColors.primaryIndigo,
      onRefresh: () async {
        final user = auth.currentUser;
        if (user != null) {
          budget.updateUser(user.uid);
          await auth.reloadUser();
        }
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome Section
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'Welcome back, ',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: textPrimaryColor,
                            ),
                          ),
                          Flexible(
                            child: ShaderMask(
                              shaderCallback: (bounds) =>
                                  AppColors.primaryGradient.createShader(bounds),
                              child: Text(
                                userName,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Here\'s your financial overview',
                        style: TextStyle(
                          fontSize: 13,
                          color: textSecondaryColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Stat Cards (Total Balance, Income 30d, Expense 30d)
            StatCard(
              title: 'Total Balance',
              amountText: CurrencyFormatter.format(totalBalance, symbol: currency),
              subtitle: 'Across ${accounts.length} accounts',
              icon: Icons.account_balance_wallet_rounded,
              gradient: AppColors.balanceCardGradient,
              onTap: () => _showDetailSheet(context, 'accounts'),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: StatCard(
                    title: 'Income (30d)',
                    amountText: '+${CurrencyFormatter.format(totalIncome, symbol: currency)}',
                    subtitle: 'From $incomeCount txns',
                    icon: Icons.trending_up_rounded,
                    gradient: AppColors.incomeCardGradient,
                    onTap: () => _showDetailSheet(context, 'income'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: StatCard(
                    title: 'Expense (30d)',
                    amountText: '-${CurrencyFormatter.format(totalExpense, symbol: currency)}',
                    subtitle: 'From $expenseCount txns',
                    icon: Icons.trending_down_rounded,
                    gradient: AppColors.expenseCardGradient,
                    onTap: () => _showDetailSheet(context, 'expense'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Quick Actions: Income, Expense, Transfer
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: cardBorder),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                    blurRadius: 15,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _buildActionButton(
                      icon: Icons.arrow_upward_rounded,
                      color: AppColors.incomeGreen,
                      bgColor: AppColors.incomeBg,
                      label: 'Income',
                      onTap: () => _showAddTransaction(context, 'income'),
                      isDark: isDark,
                      textPrimaryColor: textPrimaryColor,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildActionButton(
                      icon: Icons.arrow_downward_rounded,
                      color: AppColors.expenseRed,
                      bgColor: AppColors.expenseBg,
                      label: 'Expense',
                      onTap: () => _showAddTransaction(context, 'expense'),
                      isDark: isDark,
                      textPrimaryColor: textPrimaryColor,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildActionButton(
                      icon: Icons.swap_horiz_rounded,
                      color: AppColors.transferBlue,
                      bgColor: AppColors.transferBg,
                      label: 'Transfer',
                      onTap: () => _showTransfer(context),
                      isDark: isDark,
                      textPrimaryColor: textPrimaryColor,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Spending by Category Donut Chart
            if (categoryData.isNotEmpty) ...[
              _buildCategoryChart(context, categoryData, currency, cardBg, cardBorder, textPrimaryColor, textSecondaryColor, isDark),
              const SizedBox(height: 24),
            ],

            // Monthly Summary Chart
            if (monthlyData.isNotEmpty) ...[
              _buildMonthlyChart(context, monthlyData, currency, cardBg, cardBorder, textPrimaryColor, textSecondaryColor, isDark),
              const SizedBox(height: 24),
            ],

            // Your Accounts Section
            _buildAccountsSection(context, accounts, currency, cardBg, cardBorder, textPrimaryColor, textSecondaryColor, isDark),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required Color color,
    required Color bgColor,
    required String label,
    required VoidCallback onTap,
    required bool isDark,
    required Color textPrimaryColor,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.grey.shade50,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: isDark ? const Color(0xFF334155) : Colors.grey.shade100),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: isDark ? color.withValues(alpha: 0.18) : bgColor,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: textPrimaryColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMonthlyChart(
    BuildContext context,
    List<Map<String, dynamic>> monthlyData,
    String currency,
    Color cardBg,
    Color cardBorder,
    Color textPrimaryColor,
    Color textSecondaryColor,
    bool isDark,
  ) {
    final recentData = monthlyData.length > 6
        ? monthlyData.sublist(monthlyData.length - 6)
        : monthlyData;

    double maxY = 0;
    for (var m in recentData) {
      if ((m['income'] as double) > maxY) maxY = m['income'] as double;
      if ((m['expense'] as double) > maxY) maxY = m['expense'] as double;
    }
    if (maxY == 0) maxY = 1000;
    maxY = maxY * 1.35; // Generous headroom for adaptive bar values

    final barWidth = recentData.length <= 3 ? 34.0 : (recentData.length <= 4 ? 28.0 : 22.0);
    final barsSpace = recentData.length <= 3 ? 10.0 : 6.0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${DateFormat('MMMM yyyy').format(DateTime.now())} Summary',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: textPrimaryColor,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Monthly cash flow comparison',
                    style: TextStyle(fontSize: 11, color: textSecondaryColor),
                  ),
                ],
              ),
              Row(
                children: [
                  _chartLegend('Income', AppColors.incomeGreen),
                  const SizedBox(width: 10),
                  _chartLegend('Expense', AppColors.expenseRed),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 250,
            child: BarChart(
              BarChartData(
                maxY: maxY,
                barTouchData: BarTouchData(
                  touchTooltipData: BarTouchTooltipData(
                    getTooltipColor: (_) => const Color(0xFF1E293B),
                    fitInsideHorizontally: true,
                    getTooltipItem: (group, groupIndex, rod, rodIndex) {
                      final monthName = recentData[group.x.toInt()]['month'];
                      final isIncome = rodIndex == 0;
                      final type = isIncome ? 'Income' : 'Expense';
                      return BarTooltipItem(
                        '$monthName\n$type: $currency${rod.toY.toStringAsFixed(0)}',
                        const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      );
                    },
                  ),
                ),
                titlesData: FlTitlesData(
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 42,
                      getTitlesWidget: (val, meta) {
                        if (val == 0) return const SizedBox();
                        return Text(
                          CurrencyFormatter.compact(val, symbol: ''),
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.grey.shade400,
                            fontWeight: FontWeight.w500,
                          ),
                        );
                      },
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (val, meta) {
                        final idx = val.toInt();
                        if (idx >= 0 && idx < recentData.length) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              recentData[idx]['month'],
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                              ),
                            ),
                          );
                        }
                        return const SizedBox();
                      },
                    ),
                  ),
                ),
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (value) => FlLine(
                    color: isDark ? const Color(0xFF1E293B) : Colors.grey.shade100,
                    strokeWidth: 1,
                  ),
                ),
                borderData: FlBorderData(show: false),
                barGroups: recentData.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final item = entry.value;
                  final inc = item['income'] as double;
                  final exp = item['expense'] as double;
                  return BarChartGroupData(
                    x: idx,
                    barsSpace: barsSpace,
                    barRods: [
                      BarChartRodData(
                        toY: inc,
                        color: AppColors.incomeGreen,
                        width: barWidth,
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                        label: BarChartRodLabel(
                          show: inc > 0,
                          text: CurrencyFormatter.compact(inc, symbol: ''),
                          style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.bold,
                            color: isDark ? const Color(0xFF34D399) : const Color(0xFF059669),
                          ),
                          offset: const Offset(0, -18),
                        ),
                      ),
                      BarChartRodData(
                        toY: exp,
                        color: AppColors.expenseRed,
                        width: barWidth,
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                        label: BarChartRodLabel(
                          show: exp > 0,
                          text: CurrencyFormatter.compact(exp, symbol: ''),
                          style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.bold,
                            color: isDark ? const Color(0xFFF87171) : const Color(0xFFDC2626),
                          ),
                          offset: const Offset(0, -18),
                        ),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _chartLegend(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }

  Widget _buildCategoryChart(
    BuildContext context,
    Map<String, double> categoryData,
    String currency,
    Color cardBg,
    Color cardBorder,
    Color textPrimaryColor,
    Color textSecondaryColor,
    bool isDark,
  ) {
    final colors = [
      const Color(0xFFEF4444), // Crimson Red
      const Color(0xFF8B5CF6), // Royal Violet
      const Color(0xFFDC2626), // Deep Red
      const Color(0xFF7C3AED), // Deep Violet
      const Color(0xFFF87171), // Soft Coral Red
      const Color(0xFFA78BFA), // Lavender Violet
      const Color(0xFFB91C1C), // Rich Dark Red
      const Color(0xFF6D28D9), // Royal Deep Violet
    ];

    final entries = categoryData.entries.toList();
    final total = categoryData.values.fold<double>(0, (sum, val) => sum + val);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Spending by Category',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.bold,
              color: textPrimaryColor,
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              SizedBox(
                width: 140,
                height: 140,
                child: PieChart(
                  PieChartData(
                    sectionsSpace: 2,
                    centerSpaceRadius: 36,
                    sections: entries.asMap().entries.map((item) {
                      final idx = item.key;
                      final e = item.value;
                      final percent = total > 0 ? (e.value / total) * 100 : 0.0;
                      return PieChartSectionData(
                        value: e.value,
                        color: colors[idx % colors.length],
                        radius: 30,
                        title: '${percent.toStringAsFixed(0)}%',
                        titleStyle: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  children: entries.take(5).toList().asMap().entries.map((item) {
                    final idx = item.key;
                    final e = item.value;
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3),
                      child: Row(
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: colors[idx % colors.length],
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              e.key,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 12,
                                color: textPrimaryColor,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          Text(
                            CurrencyFormatter.format(e.value, symbol: currency),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: textPrimaryColor,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAccountsSection(
    BuildContext context,
    List<AccountModel> accounts,
    String currency,
    Color cardBg,
    Color cardBorder,
    Color textPrimaryColor,
    Color textSecondaryColor,
    bool isDark,
  ) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Your Accounts',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: textPrimaryColor,
                ),
              ),
              InkWell(
                onTap: () => _showAddAccount(context),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.add, size: 14, color: Colors.white),
                      SizedBox(width: 4),
                      Text(
                        'Add Account',
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
          const SizedBox(height: 16),
          if (accounts.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.account_balance_wallet_outlined, size: 40, color: isDark ? Colors.grey.shade700 : Colors.grey.shade300),
                    const SizedBox(height: 8),
                    Text(
                      'No accounts yet. Create your first account!',
                      style: TextStyle(fontSize: 13, color: textSecondaryColor),
                    ),
                  ],
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: accounts.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (ctx, index) {
                final acc = accounts[index];
                return Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => _showAccountDetail(context, acc),
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: isDark ? const Color(0xFF334155) : Colors.grey.shade200),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppColors.primaryIndigo.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.account_balance_rounded,
                              size: 20,
                              color: AppColors.primaryIndigo,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  acc.name,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: textPrimaryColor,
                                  ),
                                ),
                                Text(
                                  acc.type.replaceAll('_', ' ').toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: textSecondaryColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            CurrencyFormatter.format(acc.balance, symbol: currency),
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primaryIndigo,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(Icons.chevron_right_rounded, size: 18, color: Colors.grey.shade400),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
