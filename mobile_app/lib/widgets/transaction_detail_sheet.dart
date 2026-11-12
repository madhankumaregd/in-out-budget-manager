import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/transaction_model.dart';
import '../providers/budget_provider.dart';
import '../core/constants/app_colors.dart';
import '../core/utils/currency_formatter.dart';
import 'swipe_dismiss_bottom_sheet.dart';

class TransactionDetailSheet extends StatelessWidget {
  final TransactionModel transaction;
  final String currencySymbol;
  final String? fromAccountName;
  final String? toAccountName;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const TransactionDetailSheet({
    super.key,
    required this.transaction,
    this.currencySymbol = '₹',
    this.fromAccountName,
    this.toAccountName,
    required this.onEdit,
    required this.onDelete,
  });

  static void show({
    required BuildContext context,
    required TransactionModel transaction,
    String currencySymbol = '₹',
    String? fromAccountName,
    String? toAccountName,
    required VoidCallback onEdit,
    required VoidCallback onDelete,
  }) {
    final timeStr = DateFormat('hh:mm a').format(transaction.effectiveTime);
    final dateStr = DateFormat('MMM dd, yyyy').format(transaction.date);

    SwipeDismissBottomSheet.show(
      context: context,
      title: transaction.category.isNotEmpty ? transaction.category : 'Transaction Details',
      subtitle: '${transaction.type.toUpperCase()} • $timeStr · $dateStr',
      leading: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: transaction.type == 'income'
              ? AppColors.incomeGreen.withValues(alpha: 0.15)
              : transaction.type == 'expense'
                  ? AppColors.expenseRed.withValues(alpha: 0.15)
                  : AppColors.transferBlue.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Icon(
          transaction.type == 'income'
              ? Icons.arrow_outward_rounded
              : transaction.type == 'expense'
                  ? Icons.arrow_downward_rounded
                  : Icons.swap_horiz_rounded,
          color: transaction.type == 'income'
              ? AppColors.incomeGreen
              : transaction.type == 'expense'
                  ? AppColors.expenseRed
                  : AppColors.transferBlue,
          size: 24,
        ),
      ),
      child: TransactionDetailSheet(
        transaction: transaction,
        currencySymbol: currencySymbol,
        fromAccountName: fromAccountName,
        toAccountName: toAccountName,
        onEdit: onEdit,
        onDelete: onDelete,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC);
    final cardBorder = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final textColor = isDark ? Colors.white : AppColors.textPrimary;
    final textSecondary = isDark ? const Color(0xFF94A3B8) : Colors.grey.shade600;

    final isIncome = transaction.type == 'income';
    final isExpense = transaction.type == 'expense';
    final isTransfer = transaction.type == 'transfer';

    final amountColor = isIncome
        ? AppColors.incomeGreen
        : isExpense
            ? AppColors.expenseRed
            : AppColors.transferBlue;

    String sign = '';
    if (isIncome) {
      sign = '+';
    } else if (isExpense) {
      sign = '−';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Large Amount Highlight Card ──
        Container(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: cardBorder),
          ),
          child: Column(
            children: [
              Text(
                'AMOUNT',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                  color: textSecondary,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '$sign${CurrencyFormatter.format(transaction.amount, symbol: currencySymbol)}',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  color: amountColor,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: amountColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  transaction.type.toUpperCase(),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: amountColor,
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // ── Transaction Information Details ──
        Builder(
          builder: (ctx) {
            final budget = Provider.of<BudgetProvider>(ctx, listen: false);
            final resolvedFrom = (fromAccountName != null && fromAccountName!.isNotEmpty)
                ? fromAccountName!
                : (transaction.fromAccountName.isNotEmpty
                    ? transaction.fromAccountName
                    : budget.getAccountName(transaction.fromAccountId));
            final resolvedTo = (toAccountName != null && toAccountName!.isNotEmpty)
                ? toAccountName!
                : (transaction.toAccountName != null && transaction.toAccountName!.isNotEmpty
                    ? transaction.toAccountName!
                    : (transaction.toAccountId != null && transaction.toAccountId!.isNotEmpty
                        ? budget.getAccountName(transaction.toAccountId)
                        : null));
            final timeStr = DateFormat('hh:mm a').format(transaction.effectiveTime);
            final dateStr = DateFormat('MMM dd, yyyy').format(transaction.date);

            return Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: cardBorder),
              ),
              child: Column(
                children: [
                  _buildDetailRow(
                    icon: Icons.category_rounded,
                    label: 'Category',
                    value: transaction.category.isNotEmpty ? transaction.category : 'General',
                    textColor: textColor,
                    textSecondary: textSecondary,
                  ),
                  Divider(height: 20, color: cardBorder),
                  _buildDetailRow(
                    icon: Icons.account_balance_wallet_rounded,
                    label: isTransfer ? 'From Account' : 'Account',
                    value: resolvedFrom,
                    textColor: textColor,
                    textSecondary: textSecondary,
                  ),
                  if (isTransfer && resolvedTo != null && resolvedTo.isNotEmpty) ...[
                    Divider(height: 20, color: cardBorder),
                    _buildDetailRow(
                      icon: Icons.arrow_forward_rounded,
                      label: 'To Account',
                      value: resolvedTo,
                      textColor: textColor,
                      textSecondary: textSecondary,
                    ),
                  ],
                  Divider(height: 20, color: cardBorder),
                  _buildDetailRow(
                    icon: Icons.schedule_rounded,
                    label: 'Time & Date',
                    value: '$timeStr · $dateStr',
                    textColor: textColor,
                    textSecondary: textSecondary,
                  ),
                  if (transaction.description.isNotEmpty) ...[
                    Divider(height: 20, color: cardBorder),
                    _buildDetailRow(
                      icon: Icons.notes_rounded,
                      label: 'Description',
                      value: transaction.description,
                      textColor: textColor,
                      textSecondary: textSecondary,
                    ),
                  ],
                ],
              ),
            );
          },
        ),

        const SizedBox(height: 24),

        // ── Large Thumb-Friendly Action Buttons (Edit & Delete) ──
        Row(
          children: [
            // Delete Button (Immediate Delete - No Confirmation Popup)
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.of(context).pop(); // Dismiss bottom sheet immediately
                  onDelete();
                },
                icon: const Icon(Icons.delete_outline_rounded, size: 20),
                label: const Text('Delete', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.expenseRed,
                  side: const BorderSide(color: AppColors.expenseRed, width: 1.5),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
            const SizedBox(width: 12),

            // Edit Button
            Expanded(
              flex: 2,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).pop(); // dismiss detail sheet
                  onEdit();
                },
                icon: const Icon(Icons.edit_rounded, size: 20),
                label: const Text('Edit Transaction', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryIndigo,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
    required Color textColor,
    required Color textSecondary,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 1),
          child: Icon(icon, size: 18, color: textSecondary),
        ),
        const SizedBox(width: 10),
        Text(
          label,
          style: TextStyle(fontSize: 13, color: textSecondary, fontWeight: FontWeight.w500),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.bold,
              color: textColor,
            ),
          ),
        ),
      ],
    );
  }
}

