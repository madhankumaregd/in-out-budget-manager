import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../models/transaction_model.dart';
import '../core/constants/app_colors.dart';
import '../core/utils/currency_formatter.dart';
import 'swipe_dismiss_bottom_sheet.dart';

class MonthAnalysisSheet extends StatefulWidget {
  final DateTime month;
  final List<TransactionModel> transactions;
  final String currency;

  const MonthAnalysisSheet({
    super.key,
    required this.month,
    required this.transactions,
    this.currency = '₹',
  });

  static void show({
    required BuildContext context,
    required DateTime month,
    required List<TransactionModel> transactions,
    String currency = '₹',
  }) {
    final monthName = DateFormat('MMMM yyyy').format(month);
    SwipeDismissBottomSheet.show(
      context: context,
      title: '$monthName Analysis',
      subtitle: 'Income & Expense Category Statistics',
      leading: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          gradient: AppColors.primaryGradient,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Icon(Icons.pie_chart_rounded, color: Colors.white, size: 22),
      ),
      child: MonthAnalysisSheet(
        month: month,
        transactions: transactions,
        currency: currency,
      ),
    );
  }

  @override
  State<MonthAnalysisSheet> createState() => _MonthAnalysisSheetState();
}

class _MonthAnalysisSheetState extends State<MonthAnalysisSheet> {
  String _selectedTab = 'expense'; // 'expense' | 'income'
  int _touchedIndex = -1;

  static const List<Color> _expensePalette = [
    Color(0xFFEF4444), // Crisp Red
    Color(0xFF8B5CF6), // Rich Violet
    Color(0xFFDC2626), // Deep Crimson Red
    Color(0xFF7C3AED), // Deep Violet
    Color(0xFFF87171), // Soft Coral Red
    Color(0xFFA78BFA), // Light Lavender Violet
    Color(0xFFB91C1C), // Dark Red
    Color(0xFF6D28D9), // Royal Violet
  ];

  static const List<Color> _incomePalette = [
    Color(0xFF10B981), // Emerald Green
    Color(0xFF8B5CF6), // Rich Violet
    Color(0xFF059669), // Deep Green
    Color(0xFF7C3AED), // Deep Violet
    Color(0xFF34D399), // Soft Mint Green
    Color(0xFFA78BFA), // Light Lavender Violet
    Color(0xFF047857), // Forest Green
    Color(0xFF6D28D9), // Royal Violet
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC);
    final cardBorder = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final textPrimary = isDark ? Colors.white : AppColors.textPrimary;
    final textMuted = isDark ? const Color(0xFF94A3B8) : AppColors.textMuted;

    // Filter transactions belonging to this month
    final monthTxs = widget.transactions.where((t) {
      return t.date.year == widget.month.year && t.date.month == widget.month.month;
    }).toList();

    final incomeTxs = monthTxs.where((t) => t.isIncome).toList();
    final expenseTxs = monthTxs.where((t) => t.isExpense).toList();

    final totalIncome = incomeTxs.fold(0.0, (sum, t) => sum + t.amount);
    final totalExpense = expenseTxs.fold(0.0, (sum, t) => sum + t.amount);
    final netCashflow = totalIncome - totalExpense;

    final isExpenseView = _selectedTab == 'expense';
    final activeTxs = isExpenseView ? expenseTxs : incomeTxs;
    final activeTotal = isExpenseView ? totalExpense : totalIncome;
    final palette = isExpenseView ? _expensePalette : _incomePalette;

    // Compute category breakdown
    final Map<String, double> catTotals = {};
    final Map<String, int> catCounts = {};
    for (var tx in activeTxs) {
      final cat = tx.category.isNotEmpty ? tx.category : 'General';
      catTotals[cat] = (catTotals[cat] ?? 0.0) + tx.amount;
      catCounts[cat] = (catCounts[cat] ?? 0) + 1;
    }

    // Sort categories descending
    final sortedCategories = catTotals.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    // Dominant category
    final dominant = sortedCategories.isNotEmpty ? sortedCategories.first : null;
    final dominantPct = (dominant != null && activeTotal > 0)
        ? (dominant.value / activeTotal * 100)
        : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── 3 Key Stat Cards (Income, Expense, Net) ──
        Row(
          children: [
            Expanded(
              child: _statPill(
                label: 'Total Income',
                value: '+${CurrencyFormatter.format(totalIncome, currency: widget.currency)}',
                color: AppColors.incomeGreen,
                bgColor: isDark ? AppColors.incomeGreen.withValues(alpha: 0.15) : AppColors.incomeBg,
                icon: Icons.arrow_upward_rounded,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _statPill(
                label: 'Total Expense',
                value: '-${CurrencyFormatter.format(totalExpense, currency: widget.currency)}',
                color: AppColors.expenseRed,
                bgColor: isDark ? AppColors.expenseRed.withValues(alpha: 0.15) : AppColors.expenseBg,
                icon: Icons.arrow_downward_rounded,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _statPill(
                label: 'Net Cashflow',
                value: CurrencyFormatter.format(netCashflow, currency: widget.currency),
                color: netCashflow >= 0 ? AppColors.incomeGreen : AppColors.expenseRed,
                bgColor: isDark
                    ? (netCashflow >= 0 ? AppColors.incomeGreen : AppColors.expenseRed).withValues(alpha: 0.15)
                    : (netCashflow >= 0 ? AppColors.incomeBg : AppColors.expenseBg),
                icon: netCashflow >= 0 ? Icons.savings_rounded : Icons.trending_down_rounded,
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),

        // ── Income / Expense Segmented Filter Toggle ──
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF0F172A) : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: cardBorder),
          ),
          child: Row(
            children: [
              Expanded(
                child: _buildTabButton(
                  id: 'expense',
                  label: 'Expense Statistics',
                  icon: Icons.arrow_downward_rounded,
                  activeColor: AppColors.expenseRed,
                  isSelected: isExpenseView,
                  isDark: isDark,
                ),
              ),
              Expanded(
                child: _buildTabButton(
                  id: 'income',
                  label: 'Income Statistics',
                  icon: Icons.arrow_upward_rounded,
                  activeColor: AppColors.incomeGreen,
                  isSelected: !isExpenseView,
                  isDark: isDark,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // ── Dominant Category Highlight Banner ──
        if (dominant != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isExpenseView
                    ? (isDark
                        ? [const Color(0xFF3B1D28), const Color(0xFF1E1B4B)]
                        : [const Color(0xFFFEF2F2), const Color(0xFFFEE2E2)])
                    : (isDark
                        ? [const Color(0xFF064E3B), const Color(0xFF0F172A)]
                        : [const Color(0xFFECFDF5), const Color(0xFFD1FAE5)]),
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: (isExpenseView ? AppColors.expenseRed : AppColors.incomeGreen)
                    .withValues(alpha: isDark ? 0.4 : 0.25),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: (isExpenseView ? AppColors.expenseRed : AppColors.incomeGreen).withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Icon(
                      isExpenseView ? Icons.local_fire_department_rounded : Icons.star_rounded,
                      color: isExpenseView ? const Color(0xFFEF4444) : AppColors.incomeGreen,
                      size: 24,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isExpenseView ? 'DOMINANT SPENDING CATEGORY' : 'PRIMARY INCOME SOURCE',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                          color: isExpenseView ? AppColors.expenseRed : AppColors.incomeGreen,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${dominant.key} • ${dominantPct.toStringAsFixed(1)}%',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: textPrimary,
                        ),
                      ),
                      Text(
                        'Total: ${CurrencyFormatter.format(dominant.value, currency: widget.currency)} across ${catCounts[dominant.key] ?? 1} txn(s)',
                        style: TextStyle(
                          fontSize: 11,
                          color: textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

        const SizedBox(height: 18),

        // ── Donut Chart Breakdown ──
        if (sortedCategories.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 36),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: cardBorder),
            ),
            child: Column(
              children: [
                Icon(
                  isExpenseView ? Icons.receipt_long_rounded : Icons.account_balance_wallet_rounded,
                  size: 48,
                  color: textMuted,
                ),
                const SizedBox(height: 8),
                Text(
                  isExpenseView ? 'No expenses recorded in this month' : 'No income recorded in this month',
                  style: TextStyle(fontSize: 13, color: textMuted, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          )
        else
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isExpenseView ? 'Spending Breakdown by Category' : 'Income Breakdown by Category',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: textPrimary,
                  ),
                ),
                const SizedBox(height: 16),

                // Donut Chart
                SizedBox(
                  height: 180,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      PieChart(
                        PieChartData(
                          pieTouchData: PieTouchData(
                            touchCallback: (event, pieTouchResponse) {
                              setState(() {
                                if (!event.isInterestedForInteractions ||
                                    pieTouchResponse == null ||
                                    pieTouchResponse.touchedSection == null) {
                                  _touchedIndex = -1;
                                  return;
                                }
                                _touchedIndex = pieTouchResponse.touchedSection!.touchedSectionIndex;
                              });
                            },
                          ),
                          borderData: FlBorderData(show: false),
                          sectionsSpace: 2,
                          centerSpaceRadius: 52,
                          sections: sortedCategories.asMap().entries.map((entry) {
                            final idx = entry.key;
                            final cat = entry.value;
                            final isTouched = idx == _touchedIndex;
                            final color = palette[idx % palette.length];
                            final pct = activeTotal > 0 ? (cat.value / activeTotal * 100) : 0.0;

                            return PieChartSectionData(
                              color: color,
                              value: cat.value,
                              title: '${pct.toStringAsFixed(0)}%',
                              radius: isTouched ? 32 : 24,
                              titleStyle: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            isExpenseView ? 'Expenses' : 'Income',
                            style: TextStyle(fontSize: 10, color: textMuted, fontWeight: FontWeight.w600),
                          ),
                          Text(
                            CurrencyFormatter.format(activeTotal, currency: widget.currency),
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: isExpenseView ? AppColors.expenseRed : AppColors.incomeGreen,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),
                Divider(height: 1, color: cardBorder),
                const SizedBox(height: 12),

                // Category List with percentage bars
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: sortedCategories.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (ctx, idx) {
                    final cat = sortedCategories[idx];
                    final color = palette[idx % palette.length];
                    final pct = activeTotal > 0 ? (cat.value / activeTotal * 100) : 0.0;
                    final count = catCounts[cat.key] ?? 1;

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                cat.key,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: textPrimary,
                                ),
                              ),
                            ),
                            Text(
                              '$count tx • ${pct.toStringAsFixed(1)}%',
                              style: TextStyle(fontSize: 11, color: textMuted),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              CurrencyFormatter.format(cat.value, currency: widget.currency),
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: textPrimary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: (pct / 100).clamp(0.0, 1.0),
                            backgroundColor: color.withValues(alpha: 0.15),
                            valueColor: AlwaysStoppedAnimation<Color>(color),
                            minHeight: 5,
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildTabButton({
    required String id,
    required String label,
    required IconData icon,
    required Color activeColor,
    required bool isSelected,
    required bool isDark,
  }) {
    return InkWell(
      onTap: () => setState(() => _selectedTab = id),
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? const Color(0xFF1E293B) : Colors.white)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 14,
              color: isSelected ? activeColor : (isDark ? Colors.grey.shade400 : Colors.grey.shade600),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected
                    ? activeColor
                    : (isDark ? Colors.grey.shade400 : Colors.grey.shade600),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statPill({
    required String label,
    required String value,
    required Color color,
    required Color bgColor,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 12, color: color),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
