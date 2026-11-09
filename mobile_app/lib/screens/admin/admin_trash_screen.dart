import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/currency_formatter.dart';
import '../../models/trash_item_model.dart';
import '../../providers/admin_provider.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/danger_zone_dialog.dart';

class AdminTrashScreen extends StatelessWidget {
  const AdminTrashScreen({super.key});

  void _confirmRestore(BuildContext context, TrashItemModel item) async {
    final confirmed = await ConfirmDialog.show(
      context: context,
      title: 'Restore Item to User?',
      message: 'Restore "${item.title}" for user "${item.userName}" (ID: ${item.userId}) back to active records? Account balance will be automatically adjusted.',
      confirmLabel: 'Restore to User',
      isDestructive: false,
    );
    if (confirmed && context.mounted) {
      try {
        await context.read<AdminProvider>().restoreTrashItem(item);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Restored "${item.title}" to user ${item.userName}'),
              backgroundColor: AppColors.incomeGreen,
            ),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Restore failed: $e'),
              backgroundColor: AppColors.expenseRed,
            ),
          );
        }
      }
    }
  }

  void _confirmDeletePermanent(BuildContext context, TrashItemModel item) async {
    final confirmed = await ConfirmDialog.show(
      context: context,
      title: 'Permanently Delete From Database?',
      message: 'This action CANNOT be undone. "${item.title}" (User ID: ${item.userId}) will be permanently erased from Firestore.',
      confirmLabel: 'Delete Forever',
      isDestructive: true,
    );
    if (confirmed && context.mounted) {
      await context.read<AdminProvider>().permanentDeleteTrashItem(item);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Permanently deleted "${item.title}"'),
            backgroundColor: AppColors.expenseRed,
          ),
        );
      }
    }
  }

  void _confirmEmptyTrash(BuildContext context) {
    DangerZoneDialog.show(
      context: context,
      title: 'Danger Zone: Empty Entire Trash Bin',
      warningMessage:
          'CRITICAL: You are about to PERMANENTLY ERASE all deleted items across all users from the Firestore database. This action is irreversible and cannot be recovered.',
      actionLabel: 'Permanently Erase All',
      ackText: 'I acknowledge and understand that all trash items will be permanently erased and cannot be restored.',
      isPermanentDestruction: true,
      onConfirm: () async {
        await context.read<AdminProvider>().emptyAllTrash();
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Trash bin permanently emptied.'),
              backgroundColor: AppColors.expenseRed,
            ),
          );
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AdminProvider>();
    final trashItems = admin.trashItems;

    final themeProv = context.watch<ThemeProvider>();
    final isDark = themeProv.isDark(context);
    final adminBg = AppColors.getAdminBg(isDark);
    final cardBg = AppColors.getAdminSurface(isDark);
    final cardBorder = AppColors.getAdminBorder(isDark);
    final textTitle = AppColors.getAdminText(isDark);
    final textSubtitle = AppColors.getAdminTextMuted(isDark);

    return Column(
      children: [
        // Top banner
        Container(
          padding: const EdgeInsets.all(16),
          color: adminBg,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Trash Bin (Admin Control)',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textTitle),
                  ),
                  Text(
                    '${trashItems.length} deleted records across all users',
                    style: TextStyle(fontSize: 11, color: textSubtitle),
                  ),
                ],
              ),
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded, size: 20, color: AppColors.adminPrimary),
                    tooltip: 'Refresh Trash',
                    onPressed: () => context.read<AdminProvider>().refreshTrash(),
                  ),
                  if (trashItems.isNotEmpty)
                    TextButton.icon(
                      onPressed: () => _confirmEmptyTrash(context),
                      icon: const Icon(Icons.delete_forever_rounded, size: 16, color: AppColors.expenseRed),
                      label: const Text(
                        'Empty Trash',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.expenseRed),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),

        // Trash Items List with Pull-to-Refresh
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => context.read<AdminProvider>().refreshTrash(),
            color: AppColors.adminPrimary,
            child: trashItems.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(
                        height: MediaQuery.of(context).size.height * 0.5,
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.delete_outline_rounded, size: 56, color: textSubtitle),
                              const SizedBox(height: 12),
                              Text(
                                'Trash bin is empty',
                                style: TextStyle(color: textSubtitle, fontSize: 14),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Deleted accounts and transactions from users appear here',
                                style: TextStyle(color: textSubtitle, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  )
                : ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                  itemCount: trashItems.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (ctx, index) {
                    final item = trashItems[index];
                    final amountNum = (item.data['amount'] as num?)?.toDouble() ??
                        (item.data['balance'] as num?)?.toDouble();

                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: cardBorder),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Header: Icon + Title + Actions
                          Row(
                            children: [
                              Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  color: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.06),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  item.type == 'account' ? Icons.account_balance_rounded : Icons.receipt_long_rounded,
                                  size: 20,
                                  color: textSubtitle,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.title,
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: textTitle,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: item.type == 'account'
                                                ? AppColors.primaryIndigo.withOpacity(0.2)
                                                : (item.data['type'] == 'income'
                                                    ? AppColors.incomeGreen.withOpacity(0.2)
                                                    : AppColors.expenseRed.withOpacity(0.2)),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            item.type.toUpperCase(),
                                            style: TextStyle(
                                              fontSize: 9.5,
                                              fontWeight: FontWeight.bold,
                                              color: item.type == 'account'
                                                  ? AppColors.primaryIndigo
                                                  : (item.data['type'] == 'income'
                                                      ? AppColors.incomeGreen
                                                      : AppColors.expenseRed),
                                            ),
                                          ),
                                        ),
                                        if (amountNum != null) ...[
                                          const SizedBox(width: 8),
                                          Text(
                                            '₹${CurrencyFormatter.format(amountNum, currency: '')}',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                              color: textTitle,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              ),

                              // Restore button
                              IconButton(
                                icon: const Icon(Icons.restore_rounded, size: 22, color: AppColors.incomeGreen),
                                tooltip: 'Restore item to user',
                                onPressed: () => _confirmRestore(context, item),
                              ),

                              // Permanent delete button
                              IconButton(
                                icon: const Icon(Icons.delete_forever_rounded, size: 22, color: AppColors.expenseRed),
                                tooltip: 'Delete permanently from DB',
                                onPressed: () => _confirmDeletePermanent(context, item),
                              ),
                            ],
                          ),

                          const SizedBox(height: 10),
                          Divider(height: 1, color: isDark ? Colors.white10 : Colors.black12),
                          const SizedBox(height: 8),

                          // User ID & User Details & Deletion Date
                          Row(
                            children: [
                              const Icon(Icons.fingerprint_rounded, size: 14, color: AppColors.adminPrimary),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  'User ID: ${item.userId.isNotEmpty ? item.userId : "Unknown"}',
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontFamily: 'monospace',
                                    color: AppColors.adminPrimary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'User: ${item.userName}',
                                style: TextStyle(fontSize: 11, color: textSubtitle),
                              ),
                              Text(
                                'Deleted: ${DateFormat('MMM dd, yyyy').format(item.deletedAt)}',
                                style: TextStyle(fontSize: 10, color: textSubtitle),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
          ),
        ),
      ],
    );
  }
}
