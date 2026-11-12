import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../models/account_model.dart';
import '../models/transaction_model.dart';
import '../core/constants/app_colors.dart';
import '../core/utils/currency_formatter.dart';
import '../core/utils/date_formatter.dart';
import 'swipe_dismiss_bottom_sheet.dart';

class AccountDetailSheet extends StatelessWidget {
  final AccountModel account;
  final List<TransactionModel> transactions;
  final String currencySymbol;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const AccountDetailSheet({
    super.key,
    required this.account,
    required this.transactions,
    this.currencySymbol = '₹',
    required this.onEdit,
    required this.onDelete,
  });

  static void show({
    required BuildContext context,
    required AccountModel account,
    required List<TransactionModel> transactions,
    String currencySymbol = '₹',
    required VoidCallback onEdit,
    required VoidCallback onDelete,
  }) {
    SwipeDismissBottomSheet.show(
      context: context,
      title: account.name,
      subtitle: '${account.type.replaceAll('_', ' ').toUpperCase()} ACCOUNT',
      leading: Builder(
        builder: (ctx) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          return Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.primaryIndigo.withValues(alpha: 0.2)
                  : const Color(0xFFEEF2FF),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.account_balance_wallet_rounded,
                color: AppColors.primaryIndigo, size: 24),
          );
        },
      ),
      child: AccountDetailSheet(
        account: account,
        transactions: transactions,
        currencySymbol: currencySymbol,
        onEdit: onEdit,
        onDelete: onDelete,
      ),
    );
  }

  // ─── Calculate Chronological Inverted History ───
  // Past on the LEFT edge, current balance today on the RIGHT edge!
  List<FlSpot> _buildChartSpots(List<Map<String, dynamic>> points) {
    if (points.isEmpty) return [const FlSpot(0, 0)];

    return points.asMap().entries.map((entry) {
      final double x = entry.key.toDouble();
      final double y = (entry.value['balance'] as num).toDouble();
      return FlSpot(x, y);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final accountTxs = transactions.where(
      (t) => t.fromAccountId == account.id || t.toAccountId == account.id,
    ).toList();

    // Compute chronological history points:
    final List<Map<String, dynamic>> rawPoints = [
      {'date': DateTime.now(), 'balance': account.balance}
    ];

    final sortedDesc = List<TransactionModel>.from(accountTxs)
      ..sort((a, b) => b.date.compareTo(a.date));

    double running = account.balance;
    for (var t in sortedDesc) {
      if (t.type == 'income' || t.toAccountId == account.id) {
        running -= t.amount;
      } else if (t.type == 'expense' || t.fromAccountId == account.id) {
        running += t.amount;
      }
      rawPoints.add({'date': t.date, 'balance': running});
    }

    // Chronological reverse: Left = Past, Right = Current
    final chronological = rawPoints.reversed.toList();
    final spots = _buildChartSpots(chronological);

    double minY = spots.map((s) => s.y).reduce((a, b) => a < b ? a : b);
    double maxY = spots.map((s) => s.y).reduce((a, b) => a > b ? a : b);
    if (minY == maxY) {
      minY = minY > 0 ? minY * 0.8 : -100;
      maxY = maxY > 0 ? maxY * 1.2 : 100;
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC);
    final cardBorder = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final textMuted = isDark ? Colors.grey.shade400 : AppColors.textMuted;
    final textColor = isDark ? Colors.white : AppColors.textPrimary;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Account Value & Quick Actions ──
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: cardBorder),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: InkWell(
                  onTap: onEdit,
                  borderRadius: BorderRadius.circular(8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'CURRENT BALANCE',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                              color: textMuted,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.edit_outlined, size: 12, color: AppColors.primaryIndigo),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        CurrencyFormatter.format(account.balance, symbol: currencySymbol),
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primaryIndigo,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: onEdit,
                    icon: const Icon(Icons.edit_outlined, size: 15),
                    label: const Text('Edit Value'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primaryIndigo,
                      side: BorderSide(color: isDark ? const Color(0xFF475569) : const Color(0xFFCBD5E1)),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    onPressed: () {
                      Navigator.of(context).pop(); // Dismiss account detail bottom sheet immediately
                      onDelete();
                    },
                    icon: const Icon(Icons.delete_outline_rounded, size: 15),
                    label: const Text('Delete'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.expenseRed,
                      side: BorderSide(
                        color: isDark
                            ? AppColors.expenseRed.withValues(alpha: 0.38)
                            : const Color(0xFFFECACA),
                      ),
                      backgroundColor: isDark
                          ? AppColors.expenseRed.withValues(alpha: 0.14)
                          : const Color(0xFFFEF2F2),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // ── Inverted Balance Trend Graph Header ──
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.trending_up_rounded, color: AppColors.primaryPurple, size: 18),
                const SizedBox(width: 6),
                Text(
                  'Balance Trend (Past → Current)',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                ),
              ],
            ),
            Text(
              'Current at right edge',
              style: TextStyle(fontSize: 11, color: Colors.grey[500]),
            ),
          ],
        ),

        const SizedBox(height: 12),

        // ── Line Chart ──
        Container(
          height: 180,
          padding: const EdgeInsets.only(right: 16, top: 16, bottom: 8),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: cardBorder),
          ),
          child: LineChart(
            LineChartData(
              gridData: const FlGridData(show: false),
              titlesData: FlTitlesData(
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 22,
                    interval: spots.length > 5 ? (spots.length / 4).ceilToDouble() : 1,
                    getTitlesWidget: (val, meta) {
                      final idx = val.toInt();
                      if (idx < 0 || idx >= chronological.length) {
                        return const SizedBox.shrink();
                      }
                      final dt = chronological[idx]['date'] as DateTime;
                      return Padding(
                        padding: const EdgeInsets.only(top: 4.0),
                        child: Text(
                          DateFormatter.formatMonthShort(dt),
                          style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                        ),
                      );
                    },
                  ),
                ),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 48,
                    getTitlesWidget: (val, meta) {
                      return Text(
                        CurrencyFormatter.formatCompact(val, symbol: currencySymbol),
                        style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                      );
                    },
                  ),
                ),
              ),
              borderData: FlBorderData(show: false),
              minY: minY,
              maxY: maxY,
              lineBarsData: [
                LineChartBarData(
                  spots: spots,
                  isCurved: true,
                  color: AppColors.primaryPurple,
                  barWidth: 3,
                  isStrokeCapRound: true,
                  dotData: const FlDotData(show: true),
                  belowBarData: BarAreaData(
                    show: true,
                    gradient: LinearGradient(
                      colors: [
                        AppColors.primaryPurple.withValues(alpha: 0.25),
                        AppColors.primaryPurple.withValues(alpha: 0.0),
                      ],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 20),

        // ── Recent Transactions ──
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.history_rounded, color: AppColors.primaryIndigo, size: 18),
                const SizedBox(width: 6),
                Text(
                  'Recent Activity',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                ),
              ],
            ),
            Text(
              '${accountTxs.length} records',
              style: TextStyle(fontSize: 12, color: textMuted),
            ),
          ],
        ),

        const SizedBox(height: 10),

        if (accountTxs.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 24),
            alignment: Alignment.center,
            child: Text(
              'No transactions recorded for this account yet.',
              style: TextStyle(fontSize: 13, color: textMuted),
            ),
          )
        else
          ...accountTxs.take(10).map((t) {
            final isIncome = t.type == 'income' || (t.type == 'transfer' && t.toAccountId == account.id);
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: cardBorder),
              ),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: isDark
                          ? (isIncome ? AppColors.incomeGreen : AppColors.expenseRed)
                              .withValues(alpha: 0.18)
                          : (isIncome ? AppColors.incomeBg : AppColors.expenseBg),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      isIncome ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
                      color: isIncome ? AppColors.incomeGreen : AppColors.expenseRed,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          t.description.isNotEmpty ? t.description : t.category,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: textColor,
                          ),
                        ),
                        Text(
                          DateFormatter.formatDate(t.date),
                          style: TextStyle(fontSize: 11, color: textMuted),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '${isIncome ? "+" : "−"}${CurrencyFormatter.format(t.amount, symbol: currencySymbol)}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isIncome ? AppColors.incomeGreen : AppColors.expenseRed,
                    ),
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }
}
