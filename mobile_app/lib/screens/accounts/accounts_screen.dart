import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/currency_formatter.dart';
import '../../models/account_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/budget_provider.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/account_detail_sheet.dart';
import '../../widgets/add_account_sheet.dart';
import '../../widgets/edit_account_sheet.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/circular_theme_explosion.dart';

class AccountsScreen extends StatefulWidget {
  const AccountsScreen({super.key});

  @override
  State<AccountsScreen> createState() => _AccountsScreenState();
}

class _AccountsScreenState extends State<AccountsScreen> {
  bool _isEditingProfile = false;
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  String _selectedCurrency = 'INR';

  @override
  void initState() {
    super.initState();
    final profile = context.read<AuthProvider>().userProfile;
    _nameController = TextEditingController(text: profile?.displayName ?? '');
    _phoneController = TextEditingController(text: profile?.phone ?? '');
    _selectedCurrency = profile?.currency ?? 'INR';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
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
        _showEditAccount(context, account);
      },
      onDelete: () async {
        try {
          await budget.deleteAccount(account.id);
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Account deleted'),
                backgroundColor: AppColors.incomeGreen,
                duration: Duration(seconds: 2),
              ),
            );
          }
        } catch (e) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Failed to delete account: $e'),
                backgroundColor: AppColors.expenseRed,
              ),
            );
          }
        }
      },
    );
  }

  void _showEditAccount(BuildContext context, AccountModel account) {
    final budget = context.read<BudgetProvider>();
    final currency = context.read<AuthProvider>().currencySymbol;
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
  }

  void _showAddAccount(BuildContext context) {
    final budget = context.read<BudgetProvider>();
    final currency = context.read<AuthProvider>().currencySymbol;
    AddAccountSheet.show(
      context: context,
      currencySymbol: currency,
      onSave: (name, type, balance) async {
        await budget.addAccount(
          name: name,
          type: type,
          initialBalance: balance,
        );
      },
    );
  }

  Future<void> _saveProfile() async {
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Display name is required'),
          backgroundColor: AppColors.expenseRed,
        ),
      );
      return;
    }

    if (phone.isNotEmpty && !phone.startsWith('+')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Phone must include country code (e.g. +91...)'),
          backgroundColor: AppColors.expenseRed,
        ),
      );
      return;
    }

    final auth = context.read<AuthProvider>();
    final ok = await auth.updateProfile(
      displayName: name,
      currency: _selectedCurrency,
      phone: phone,
    );

    if (!mounted) return;
    if (ok) {
      setState(() => _isEditingProfile = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profile updated successfully!'),
          backgroundColor: AppColors.incomeGreen,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.errorMessage ?? 'Failed to update profile'),
          backgroundColor: AppColors.expenseRed,
        ),
      );
    }
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => ConfirmDialog(
        title: 'Sign Out?',
        message: 'Are you sure you want to end your current session?',
        confirmLabel: 'Sign Out',
        isDestructive: true,
        onConfirm: () async {
          await context.read<AuthProvider>().signOut();
          if (!context.mounted) return;
          Navigator.pushReplacementNamed(context, '/login');
        },
      ),
    );
  }

  IconData _getAccountIcon(String type) {
    switch (type.toLowerCase()) {
      case 'bank':
        return Icons.account_balance_rounded;
      case 'credit_card':
        return Icons.credit_card_rounded;
      case 'investment':
        return Icons.show_chart_rounded;
      case 'savings':
        return Icons.savings_rounded;
      default:
        return Icons.account_balance_wallet_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final budget = context.watch<BudgetProvider>();
    final themeProv = context.watch<ThemeProvider>();
    final isDark = themeProv.isDark(context);

    final cardBg = isDark ? const Color(0xFF0F172A) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);
    final textPrimaryColor = isDark ? Colors.white : AppColors.textPrimary;
    final textSecondaryColor = isDark ? const Color(0xFF94A3B8) : Colors.grey.shade500;

    final profile = auth.userProfile;
    final currency = auth.currencySymbol;
    final accounts = budget.accounts;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: RefreshIndicator(
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
            // ── Profile Settings Section ─────────────────────────────
            _buildProfileSection(context, auth, profile, cardBg, cardBorder, textPrimaryColor, textSecondaryColor),
            const SizedBox(height: 20),

            // ── Theme / Appearance Section ───────────────────────────
            _buildThemeSettingsSection(context, themeProv, isDark, cardBg, cardBorder, textPrimaryColor, textSecondaryColor),
            const SizedBox(height: 24),

            // ── Your Accounts Header ─────────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Your Accounts',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: textPrimaryColor,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Tap any account to view balance trend graph & activity',
                      style: TextStyle(
                        fontSize: 12,
                        color: textSecondaryColor,
                      ),
                    ),
                  ],
                ),
                InkWell(
                  onTap: () => _showAddAccount(context),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primaryIndigo.withOpacity(0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.add, size: 16, color: Colors.white),
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

            // ── Accounts List (Mobile View: Just Account Value & Name Visible) ──
            // Specification: "in mobile view: just account value only has to visible in the account page
            // if the account is clicked then in the popup section has to display edit, delete option, graph and recent transactions"
            if (accounts.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: cardBorder),
                ),
                child: Column(
                  children: [
                    Icon(Icons.account_balance_wallet_outlined, size: 52, color: isDark ? Colors.grey.shade700 : Colors.grey.shade300),
                    const SizedBox(height: 12),
                    Text(
                      'No accounts found',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: textPrimaryColor,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Add your bank, cash, or credit accounts to get started.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: textSecondaryColor),
                    ),
                  ],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: accounts.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (ctx, index) {
                  final acc = accounts[index];
                  final icon = _getAccountIcon(acc.type);

                  return Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => _showAccountDetail(context, acc),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        decoration: BoxDecoration(
                          color: cardBg,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(isDark ? 0.2 : 0.03),
                              blurRadius: 10,
                              offset: const Offset(0, 3),
                            ),
                          ],
                          border: Border.all(color: cardBorder),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 46,
                              height: 46,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    AppColors.primaryIndigo.withOpacity(0.12),
                                    AppColors.primaryPurple.withOpacity(0.08),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Icon(icon, color: AppColors.primaryIndigo, size: 24),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    acc.name,
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: textPrimaryColor,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    acc.type.replaceAll('_', ' ').toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: textSecondaryColor,
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Mobile View: Just Account Value Visible
                            ShaderMask(
                              shaderCallback: (bounds) =>
                                  AppColors.primaryGradient.createShader(bounds),
                              child: Text(
                                CurrencyFormatter.format(acc.balance, currency: currency),
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Icon(Icons.chevron_right_rounded, size: 20, color: Colors.grey.shade400),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            const SizedBox(height: 32),

            // Logout Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                onPressed: () => _confirmLogout(context),
                icon: const Icon(Icons.logout_rounded, size: 18, color: AppColors.expenseRed),
                label: const Text(
                  'Sign Out',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.expenseRed,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: AppColors.expenseRed.withOpacity(0.3)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    ),
  );
}

  Widget _buildProfileSection(
    BuildContext context,
    AuthProvider auth,
    dynamic profile,
    Color cardBg,
    Color cardBorder,
    Color textPrimaryColor,
    Color textSecondaryColor,
  ) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(cardBg == Colors.white ? 0.04 : 0.2),
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
                'Profile Settings',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: textPrimaryColor,
                ),
              ),
              if (!_isEditingProfile)
                TextButton.icon(
                  onPressed: () {
                    setState(() {
                      _isEditingProfile = true;
                      _nameController.text = profile?.displayName ?? '';
                      _phoneController.text = profile?.phone ?? '';
                      _selectedCurrency = profile?.currency ?? 'INR';
                    });
                  },
                  icon: const Icon(Icons.edit_outlined, size: 16, color: AppColors.primaryIndigo),
                  label: const Text(
                    'Edit Profile',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primaryIndigo,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),

          if (_isEditingProfile) ...[
            // Edit form
            TextField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: 'Full Name',
                prefixIcon: const Icon(Icons.person_outline, size: 20),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: 'Phone Number',
                hintText: '+919876543210',
                prefixIcon: const Icon(Icons.phone_outlined, size: 20),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                border: Border.all(color: cardBorder),
                borderRadius: BorderRadius.circular(12),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _selectedCurrency,
                  items: AppConstants.currencyOptions.map((c) {
                    return DropdownMenuItem(
                      value: c['code'],
                      child: Text('${c['label']} (${c['symbol']})'),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedCurrency = val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _saveProfile,
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('Save Changes'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.incomeGreen,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                TextButton(
                  onPressed: () => setState(() => _isEditingProfile = false),
                  child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
                ),
              ],
            ),
          ] else ...[
            // View Profile details
            _profileDetailRow(Icons.person_outline, 'Display Name', profile?.displayName ?? 'Not set', textPrimaryColor, textSecondaryColor),
            const Divider(height: 20),
            _profileDetailRow(Icons.email_outlined, 'Email', profile?.email ?? auth.currentUser?.email ?? '', textPrimaryColor, textSecondaryColor),
            const Divider(height: 20),
            _profileDetailRow(Icons.phone_outlined, 'Phone', profile?.phone ?? 'Not set', textPrimaryColor, textSecondaryColor),
            const Divider(height: 20),
            _profileDetailRow(Icons.monetization_on_outlined, 'Preferred Currency', '${profile?.currency ?? "INR"} (${auth.currencySymbol})', textPrimaryColor, textSecondaryColor),
          ],
        ],
      ),
    );
  }

  Widget _profileDetailRow(IconData icon, String label, String value, Color textPrimaryColor, Color textSecondaryColor) {
    return Row(
      children: [
        Icon(icon, size: 18, color: textSecondaryColor),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontSize: 11, color: textSecondaryColor, fontWeight: FontWeight.w500)),
            Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: textPrimaryColor)),
          ],
        ),
      ],
    );
  }

  Widget _buildThemeSettingsSection(
    BuildContext context,
    ThemeProvider themeProv,
    bool isDark,
    Color cardBg,
    Color cardBorder,
    Color textPrimaryColor,
    Color textSecondaryColor,
  ) {
    final currentMode = themeProv.themeMode;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(cardBg == Colors.white ? 0.04 : 0.2),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primaryIndigo.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.palette_outlined, size: 20, color: AppColors.primaryIndigo),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Appearance & Theme',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: textPrimaryColor,
                    ),
                  ),
                  Text(
                    'Choose Light, Dark, or System mode',
                    style: TextStyle(
                      fontSize: 12,
                      color: textSecondaryColor,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          // 3-Option Selectors
          Row(
            children: [
              Expanded(
                child: _themeOptionCard(
                  title: 'Light',
                  icon: Icons.light_mode_rounded,
                  isSelected: currentMode == ThemeMode.light,
                  activeColor: AppColors.primaryViolet,
                  onSelect: (origin) => _selectThemeMode(context, themeProv, ThemeMode.light, origin),
                  isDark: isDark,
                  textPrimaryColor: textPrimaryColor,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _themeOptionCard(
                  title: 'Dark',
                  icon: Icons.dark_mode_rounded,
                  isSelected: currentMode == ThemeMode.dark,
                  activeColor: AppColors.primaryIndigo,
                  onSelect: (origin) => _selectThemeMode(context, themeProv, ThemeMode.dark, origin),
                  isDark: isDark,
                  textPrimaryColor: textPrimaryColor,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _themeOptionCard(
                  title: 'System',
                  icon: Icons.brightness_auto_rounded,
                  isSelected: currentMode == ThemeMode.system,
                  activeColor: AppColors.primaryPurple,
                  onSelect: (origin) => _selectThemeMode(context, themeProv, ThemeMode.system, origin),
                  isDark: isDark,
                  textPrimaryColor: textPrimaryColor,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _selectThemeMode(
    BuildContext context,
    ThemeProvider themeProv,
    ThemeMode targetMode,
    Offset origin,
  ) {
    if (themeProv.themeMode == targetMode) return;
    final wasDark = themeProv.isDark(context);
    final sysDark = MediaQuery.platformBrightnessOf(context) == Brightness.dark;
    final targetIsDark = targetMode == ThemeMode.dark ||
        (targetMode == ThemeMode.system && sysDark);

    if (wasDark == targetIsDark) {
      themeProv.setThemeMode(targetMode);
      return;
    }

    final effect = ThemeExplosionEffect.of(context);
    if (effect != null) {
      if (effect.isLocked) return;
      effect.explode(
        origin: origin,
        toDarkMode: targetIsDark,
        onTrigger: () => themeProv.setThemeMode(targetMode),
      );
    } else {
      themeProv.setThemeMode(targetMode);
    }
  }

  Widget _themeOptionCard({
    required String title,
    required IconData icon,
    required bool isSelected,
    required Color activeColor,
    required void Function(Offset origin) onSelect,
    required bool isDark,
    required Color textPrimaryColor,
  }) {
    return GestureDetector(
      onTapDown: (details) => onSelect(details.globalPosition),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: isSelected
              ? activeColor.withOpacity(0.12)
              : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC)),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? activeColor : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              size: 24,
              color: isSelected ? activeColor : (isDark ? Colors.grey.shade400 : Colors.grey.shade600),
            ),
            const SizedBox(height: 6),
            Text(
              title,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? activeColor : textPrimaryColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
