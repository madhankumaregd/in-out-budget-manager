import 'package:flutter/material.dart';
import '../models/account_model.dart';
import '../models/transaction_model.dart';
import '../core/constants/app_colors.dart';
import '../core/utils/currency_formatter.dart';
import '../core/utils/date_formatter.dart';
import 'swipe_dismiss_bottom_sheet.dart';

class DashboardDetailSheet extends StatelessWidget {
  final String mode; // 'income' | 'expense' | 'accounts'
  final List<AccountModel> accounts;
  final List<TransactionModel> transactions;
  final String currencySymbol;

  const DashboardDetailSheet({
    super.key,
    required this.mode,
    required this.accounts,
    required this.transactions,
    this.currencySymbol = '₹',
  });

  static void show({
    required BuildContext context,
    required String mode,
    required List<AccountModel> accounts,
    required List<TransactionModel> transactions,
    String currencySymbol = '₹',
  }) {
    String title = 'Details';
    String subtitle = '';
    Color themeColor = AppColors.primaryIndigo;

    if (mode == 'income') {
      title = 'Income History';
      subtitle = 'Earnings and incoming deposits';
      themeColor = AppColors.incomeGreen;
    } else if (mode == 'expense') {
      title = 'Expense History';
      subtitle = 'Purchases and outgoing expenses';
      themeColor = AppColors.expenseRed;
    } else {
      title = 'All Accounts';
      subtitle = '${accounts.length} active balances';
      themeColor = AppColors.primaryIndigo;
    }

    SwipeDismissBottomSheet.show(
      context: context,
      title: title,
      subtitle: subtitle,
      leading: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: themeColor.withOpacity(0.12),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Icon(
          mode == 'income'
              ? Icons.arrow_outward_rounded
              : mode == 'expense'
                  ? Icons.arrow_downward_rounded
                  : Icons.account_balance_wallet_rounded,
          color: themeColor,
          size: 24,
        ),
      ),
      child: DashboardDetailSheet(
        mode: mode,
        accounts: accounts,
        transactions: transactions,
        currencySymbol: currencySymbol,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final itemBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC);
    final itemBorder = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final textTitle = isDark ? Colors.white : AppColors.textPrimary;
    final textSubtitle = isDark ? const Color(0xFF94A3B8) : AppColors.textMuted;
    final accountIconBg = isDark
        ? const Color(0xFF312E81).withValues(alpha: 0.6)
        : const Color(0xFFEEF2FF);

    if (mode == 'accounts') {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: accounts.map((acc) {
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: itemBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: itemBorder),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: accountIconBg,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.account_balance_rounded,
                          color: AppColors.primaryIndigo, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          acc.name,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: textTitle,
                          ),
                        ),
                        Text(
                          acc.type.toUpperCase(),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: textSubtitle,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                Text(
                  CurrencyFormatter.format(acc.balance, symbol: currencySymbol),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryIndigo,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      );
    }

    final filtered = transactions.where((t) => t.type == mode).toList();

    if (filtered.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 36),
        alignment: Alignment.center,
        child: Text(
          'No ${mode == 'income' ? 'income' : 'expense'} transactions found.',
          style: TextStyle(fontSize: 14, color: textSubtitle),
        ),
      );
    }

    final isIncome = mode == 'income';
    final total = filtered.fold(0.0, (sum, t) => sum + t.amount);
    final bannerBg = isDark
        ? (isIncome
            ? AppColors.incomeGreen.withValues(alpha: 0.15)
            : AppColors.expenseRed.withValues(alpha: 0.15))
        : (isIncome ? AppColors.incomeBg : AppColors.expenseBg);
    final bannerBorder = isDark
        ? (isIncome
            ? AppColors.incomeGreen.withValues(alpha: 0.3)
            : AppColors.expenseRed.withValues(alpha: 0.3))
        : Colors.transparent;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Total summary banner
        Container(
          padding: const EdgeInsets.all(16),
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: bannerBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: bannerBorder),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total ${isIncome ? 'Income' : 'Spent'} (${filtered.length} txns)',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: isIncome ? AppColors.incomeGreen : AppColors.expenseRed,
                ),
              ),
              Text(
                '${isIncome ? '+' : '−'}${CurrencyFormatter.format(total, symbol: currencySymbol)}',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: isIncome ? AppColors.incomeGreen : AppColors.expenseRed,
                ),
              ),
            ],
          ),
        ),

        ...filtered.map((t) {
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: itemBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: itemBorder),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        t.description.isNotEmpty ? t.description : t.category,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: textTitle,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${t.category} · ${DateFormatter.formatDate(t.date)}',
                        style: TextStyle(
                          fontSize: 11,
                          color: textSubtitle,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  '${isIncome ? '+' : '−'}${CurrencyFormatter.format(t.amount, symbol: currencySymbol)}',
                  style: TextStyle(
                    fontSize: 14,
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
