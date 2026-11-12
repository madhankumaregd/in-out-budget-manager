import 'package:flutter/material.dart';
import '../models/transaction_model.dart';
import '../core/constants/app_colors.dart';
import '../core/utils/currency_formatter.dart';
import '../core/utils/date_formatter.dart';

class TransactionTile extends StatelessWidget {
  final TransactionModel transaction;
  final String fromAccountName;
  final String? toAccountName;
  final String currencySymbol;
  final String? currency;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final VoidCallback? onTap;

  const TransactionTile({
    super.key,
    required this.transaction,
    this.fromAccountName = '',
    this.toAccountName,
    this.currencySymbol = '₹',
    this.currency,
    this.onEdit,
    this.onDelete,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveSymbol = currency ?? currencySymbol;
    final isIncome = transaction.type == 'income';
    final isExpense = transaction.type == 'expense';
    final isTransfer = transaction.type == 'transfer';

    final Color badgeColor = isDark
        ? (isIncome
            ? AppColors.incomeGreen.withOpacity(0.18)
            : isExpense
                ? AppColors.expenseRed.withOpacity(0.18)
                : AppColors.transferBlue.withOpacity(0.18))
        : (isIncome
            ? AppColors.incomeBg
            : isExpense
                ? AppColors.expenseBg
                : AppColors.transferBg);

    final Color iconColor = isIncome
        ? AppColors.incomeGreen
        : isExpense
            ? AppColors.expenseRed
            : AppColors.transferBlue;

    final IconData iconData = isIncome
        ? Icons.arrow_outward_rounded
        : isExpense
            ? Icons.arrow_downward_rounded
            : Icons.swap_horiz_rounded;

    final effectiveFrom = fromAccountName.isNotEmpty
        ? fromAccountName
        : (transaction.fromAccountName.isNotEmpty
            ? transaction.fromAccountName
            : 'Account');

    final cardBg = isDark ? const Color(0xFF0F172A) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF1E293B) : AppColors.cardBorder;
    final titleColor = isDark ? Colors.white : AppColors.textPrimary;
    final subtitleColor = isDark ? const Color(0xFF94A3B8) : AppColors.textSecondary;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap ?? onEdit,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                // Category Icon Badge
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: badgeColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(iconData, color: iconColor, size: 20),
                ),
                const SizedBox(width: 12),

                // Details (Category, Date, Transfer path / Account)
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              transaction.category.isNotEmpty
                                  ? transaction.category
                                  : (isTransfer ? 'Transfer' : 'General'),
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: titleColor,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: badgeColor,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              transaction.type.toUpperCase(),
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: iconColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Text(
                            DateFormatter.formatTime(transaction.effectiveTime),
                            style: TextStyle(
                              fontSize: 11,
                              color: subtitleColor,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text('•',
                              style: TextStyle(
                                  fontSize: 10, color: subtitleColor)),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              isTransfer && toAccountName != null && toAccountName!.isNotEmpty
                                    ? '$effectiveFrom → $toAccountName'
                                    : effectiveFrom,
                              style: TextStyle(
                                fontSize: 11,
                                color: subtitleColor,
                                fontWeight: FontWeight.w500,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      if (transaction.description.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          transaction.description,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                            fontStyle: FontStyle.italic,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),

                // Amount & View Chevron
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${isIncome ? '+' : isExpense ? '−' : ''}${CurrencyFormatter.format(transaction.amount, symbol: effectiveSymbol)}',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: isIncome
                                ? AppColors.incomeGreen
                                : isExpense
                                    ? AppColors.expenseRed
                                    : AppColors.transferBlue,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Tap to view / edit',
                          style: TextStyle(
                            fontSize: 9.5,
                            color: isDark ? Colors.grey.shade500 : Colors.grey.shade400,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.chevron_right_rounded,
                      size: 20,
                      color: isDark ? Colors.grey.shade600 : Colors.grey.shade400,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
