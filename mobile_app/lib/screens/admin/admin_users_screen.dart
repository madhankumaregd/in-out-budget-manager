import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../models/user_profile_model.dart';
import '../../providers/admin_provider.dart';
import '../../providers/theme_provider.dart';

class AdminUsersScreen extends StatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  State<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends State<AdminUsersScreen> {
  final _searchController = TextEditingController();
  String _statusFilter = 'all'; // 'all' | 'active' | 'disabled'

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _copyUserId(String userId) {
    Clipboard.setData(ClipboardData(text: userId));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Copied User ID: $userId'),
        backgroundColor: AppColors.adminPrimary,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _showUserDetails(BuildContext context, UserProfileModel user) {
    final themeProv = context.read<ThemeProvider>();
    final isDark = themeProv.isDark(context);
    final cardBg = AppColors.getAdminSurface(isDark);
    final textTitle = AppColors.getAdminText(isDark);
    final textSubtitle = AppColors.getAdminTextMuted(isDark);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'User Details',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: textTitle,
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: textSubtitle),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _detailRow('User ID', user.uid, canCopy: true, defaultColor: textTitle, labelColor: textSubtitle),
              Divider(color: isDark ? Colors.white12 : Colors.black12, height: 16),
              _detailRow('Display Name', user.displayName.isEmpty ? 'Not set' : user.displayName, defaultColor: textTitle, labelColor: textSubtitle),
              Divider(color: isDark ? Colors.white12 : Colors.black12, height: 16),
              _detailRow('Email', user.email, defaultColor: textTitle, labelColor: textSubtitle),
              Divider(color: isDark ? Colors.white12 : Colors.black12, height: 16),
              _detailRow('Phone', (user.phone == null || user.phone!.isEmpty) ? 'Not set' : user.phone!, defaultColor: textTitle, labelColor: textSubtitle),
              Divider(color: isDark ? Colors.white12 : Colors.black12, height: 16),
              _detailRow('Currency', user.currency, defaultColor: textTitle, labelColor: textSubtitle),
              Divider(color: isDark ? Colors.white12 : Colors.black12, height: 16),
              _detailRow('Status', user.isDisabled ? 'DISABLED' : 'ACTIVE',
                  valueColor: user.isDisabled ? AppColors.expenseRed : AppColors.incomeGreen, defaultColor: textTitle, labelColor: textSubtitle),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  Widget _detailRow(String label, String value, {bool canCopy = false, Color? valueColor, Color? defaultColor, Color? labelColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 13, color: labelColor ?? Colors.grey)),
        Flexible(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Text(
                  value,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: valueColor ?? defaultColor ?? Colors.white,
                  ),
                ),
              ),
              if (canCopy) ...[
                const SizedBox(width: 6),
                InkWell(
                  onTap: () => _copyUserId(value),
                  child: const Icon(Icons.copy_rounded, size: 14, color: AppColors.adminPrimary),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AdminProvider>();
    final users = admin.users;

    final themeProv = context.watch<ThemeProvider>();
    final isDark = themeProv.isDark(context);
    final adminBg = AppColors.getAdminBg(isDark);
    final cardBg = AppColors.getAdminSurface(isDark);
    final cardBorder = AppColors.getAdminBorder(isDark);
    final textTitle = AppColors.getAdminText(isDark);
    final textSubtitle = AppColors.getAdminTextMuted(isDark);

    final totalCount = users.length;
    final activeCount = users.where((u) => !u.isDisabled).length;
    final disabledCount = users.where((u) => u.isDisabled).length;

    // Filter users
    final query = _searchController.text.trim().toLowerCase();
    final filtered = users.where((u) {
      if (_statusFilter == 'active' && u.isDisabled) return false;
      if (_statusFilter == 'disabled' && !u.isDisabled) return false;
      if (query.isNotEmpty) {
        final matchesName = u.displayName.toLowerCase().contains(query);
        final matchesEmail = u.email.toLowerCase().contains(query);
        final matchesUid = u.uid.toLowerCase().contains(query);
        return matchesName || matchesEmail || matchesUid;
      }
      return true;
    }).toList();

    return Column(
      children: [
        // Top stats banner
        Container(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          color: adminBg,
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: _statBox('Total Users', totalCount.toString(), textTitle, Icons.people_outline, cardBg, cardBorder, textSubtitle),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _statBox('Active', activeCount.toString(), AppColors.incomeGreen, Icons.check_circle_outline, cardBg, cardBorder, textSubtitle),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _statBox('Disabled', disabledCount.toString(), AppColors.expenseRed, Icons.block_outlined, cardBg, cardBorder, textSubtitle),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Search Bar
              Container(
                height: 42,
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: cardBorder),
                ),
                child: TextField(
                  controller: _searchController,
                  autocorrect: false,
                  enableSuggestions: false,
                  keyboardType: TextInputType.text,
                  spellCheckConfiguration: const SpellCheckConfiguration.disabled(),
                  cursorColor: AppColors.adminPrimary,
                  cursorWidth: 2.0,
                  cursorHeight: 18.0,
                  cursorRadius: const Radius.circular(2),
                  style: TextStyle(
                    color: textTitle,
                    fontSize: 13,
                    decoration: TextDecoration.none,
                  ),
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    prefixIcon: Icon(Icons.search, size: 18, color: textSubtitle),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: Icon(Icons.clear, size: 16, color: textSubtitle),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {});
                            },
                          )
                        : null,
                    hintText: 'Search by User ID, email, or name...',
                    hintStyle: TextStyle(fontSize: 12, color: textSubtitle),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    disabledBorder: InputBorder.none,
                    errorBorder: InputBorder.none,
                    focusedErrorBorder: InputBorder.none,
                    filled: true,
                    fillColor: Colors.transparent,
                    contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                  ),
                ),
              ),
              const SizedBox(height: 10),

              // Status Filter Tabs
              Row(
                children: [
                  _filterTab('all', 'All ($totalCount)', cardBorder, textSubtitle, isDark),
                  const SizedBox(width: 8),
                  _filterTab('active', 'Active ($activeCount)', cardBorder, textSubtitle, isDark),
                  const SizedBox(width: 8),
                  _filterTab('disabled', 'Disabled ($disabledCount)', cardBorder, textSubtitle, isDark),
                ],
              ),
            ],
          ),
        ),

        // User list with Pull-to-Refresh
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => context.read<AdminProvider>().refreshUsers(),
            color: AppColors.adminPrimary,
            child: filtered.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(
                        height: MediaQuery.of(context).size.height * 0.4,
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.person_search_rounded, size: 48, color: textSubtitle),
                              const SizedBox(height: 12),
                              Text(
                                'No users found',
                                style: TextStyle(color: textSubtitle, fontSize: 14),
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
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (ctx, index) {
                    final u = filtered[index];
                    final isInactive = u.isDisabled;

                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isInactive
                              ? AppColors.expenseRed.withOpacity(0.3)
                              : cardBorder,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: isInactive
                                      ? AppColors.expenseRed.withOpacity(0.15)
                                      : AppColors.adminPrimary.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  isInactive ? Icons.person_off_rounded : Icons.person_rounded,
                                  color: isInactive ? AppColors.expenseRed : AppColors.adminPrimary,
                                  size: 18,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      u.displayName.isNotEmpty ? u.displayName : 'Unnamed User',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: isInactive ? textSubtitle : textTitle,
                                      ),
                                    ),
                                    Text(
                                      u.email,
                                      style: TextStyle(fontSize: 11, color: textSubtitle),
                                    ),
                                  ],
                                ),
                              ),

                              // Active/Disabled Toggle Switch or Root Admin Protected Badge
                              if (u.email.toLowerCase().trim() == 'egdmadhankumar@gmail.com')
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryViolet.withValues(alpha: 0.15),
                                    border: Border.all(color: AppColors.primaryViolet.withValues(alpha: 0.4)),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.shield_rounded, size: 14, color: AppColors.primaryViolet),
                                      SizedBox(width: 4),
                                      Text(
                                        'ROOT ADMIN',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.primaryViolet,
                                        ),
                                      ),
                                    ],
                                  ),
                                )
                              else
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          isInactive ? 'DISABLED' : 'ACTIVE',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: isInactive ? AppColors.expenseRed : AppColors.incomeGreen,
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        Switch.adaptive(
                                          value: !isInactive,
                                          activeColor: AppColors.incomeGreen,
                                          activeTrackColor: AppColors.incomeGreen.withOpacity(0.3),
                                          inactiveThumbColor: AppColors.expenseRed,
                                          inactiveTrackColor: AppColors.expenseRed.withOpacity(0.3),
                                          onChanged: (val) async {
                                            await admin.toggleUserAccess(u.uid, !val);
                                          },
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Divider(color: isDark ? Colors.white10 : Colors.black12, height: 1),
                          const SizedBox(height: 8),

                          // UID Row with 1-click Copy
                          Row(
                            children: [
                              Text(
                                'UID: ',
                                style: TextStyle(fontSize: 11, color: textSubtitle),
                              ),
                              Expanded(
                                child: Text(
                                  u.uid,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontFamily: 'monospace',
                                    color: textTitle,
                                  ),
                                ),
                              ),
                              InkWell(
                                onTap: () => _copyUserId(u.uid),
                                borderRadius: BorderRadius.circular(6),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.06),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.copy_rounded, size: 12, color: AppColors.adminPrimary),
                                      SizedBox(width: 4),
                                      Text(
                                        'Copy UID',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.adminPrimary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              InkWell(
                                onTap: () => _showUserDetails(context, u),
                                child: Icon(Icons.info_outline, size: 16, color: textSubtitle),
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

  Widget _statBox(String label, String value, Color color, IconData icon, Color cardBg, Color cardBorder, Color textSubtitle) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cardBorder),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(fontSize: 10, color: textSubtitle)),
              Text(
                value,
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _filterTab(String id, String label, Color cardBorder, Color textSubtitle, bool isDark) {
    final isSelected = _statusFilter == id;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _statusFilter = id),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.adminPrimary.withOpacity(0.2) : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? AppColors.adminPrimary : cardBorder,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              color: isSelected ? (isDark ? Colors.white : AppColors.adminPrimary) : textSubtitle,
            ),
          ),
        ),
      ),
    );
  }
}

