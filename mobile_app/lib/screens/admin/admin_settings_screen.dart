import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/admin_provider.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/circular_theme_explosion.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/danger_zone_dialog.dart';

class AdminSettingsScreen extends StatefulWidget {
  const AdminSettingsScreen({super.key});

  @override
  State<AdminSettingsScreen> createState() => _AdminSettingsScreenState();
}

class _AdminSettingsScreenState extends State<AdminSettingsScreen> {
  final _newAdminController = TextEditingController();
  bool _isAdding = false;

  @override
  void dispose() {
    _newAdminController.dispose();
    super.dispose();
  }

  Future<void> _addNewAdmin() async {
    final email = _newAdminController.text.trim().toLowerCase();
    if (email.isEmpty || !email.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid administrator email address'),
          backgroundColor: AppColors.expenseRed,
        ),
      );
      return;
    }

    setState(() => _isAdding = true);
    final admin = context.read<AdminProvider>();
    final ok = await admin.addNewAdmin(email);
    setState(() => _isAdding = false);

    if (!mounted) return;
    if (ok) {
      _newAdminController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Admin access granted to "$email"'),
          backgroundColor: AppColors.incomeGreen,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(admin.authError ?? 'Failed to add administrator'),
          backgroundColor: AppColors.expenseRed,
        ),
      );
    }
  }

  void _confirmRevokeAdmin(String email) async {
    final confirmed = await ConfirmDialog.show(
      context: context,
      title: 'Revoke Admin Access?',
      message: 'Are you sure you want to revoke administrative permissions for "$email"?',
      confirmLabel: 'Revoke Access',
      isDestructive: true,
    );
    if (confirmed && mounted) {
      final admin = context.read<AdminProvider>();
      final ok = await admin.removeAdmin(email);
      if (mounted && ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Revoked admin privileges for "$email"'),
            backgroundColor: AppColors.incomeGreen,
          ),
        );
      }
    }
  }

  void _switchThemeWithExplosion(ThemeProvider theme, ThemeMode targetMode) {
    if (theme.themeMode == targetMode) return;
    final wasDark = theme.isDark(context);
    final targetIsDark = targetMode == ThemeMode.dark ||
        (targetMode == ThemeMode.system &&
            MediaQuery.platformBrightnessOf(context) == Brightness.dark);
    if (wasDark == targetIsDark) {
      theme.setThemeMode(targetMode);
      return;
    }
    final explosion = ThemeExplosionEffect.of(context);
    if (explosion != null) {
      if (explosion.isLocked) return;
      final size = MediaQuery.of(context).size;
      explosion.explode(
        origin: Offset(size.width / 2, size.height * 0.28),
        toDarkMode: targetIsDark,
        onTrigger: () => theme.setThemeMode(targetMode),
      );
    } else {
      theme.setThemeMode(targetMode);
    }
  }

  void _openMoveAllDataToTrashDangerZone() {
    DangerZoneDialog.show(
      context: context,
      title: 'Danger Zone: Clear Database to Trash',
      warningMessage:
          'ATTENTION: This will soft-delete and move ALL active accounts and transactions across all users into the Trash bin. Data is preserved and can be restored from the Admin Trash bin.',
      actionLabel: 'Move All Data to Trash',
      ackText: 'I acknowledge and confirm moving all active database transactions and accounts into Trash.',
      isPermanentDestruction: false,
      onConfirm: () async {
        final admin = context.read<AdminProvider>();
        await admin.moveAllDataToTrash();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('All active database records moved to Trash.'),
              backgroundColor: AppColors.incomeGreen,
            ),
          );
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AdminProvider>();
    final primaryAdmin = admin.primaryAdmin;
    final adminsList = admin.adminEmails;
    final isPrimary = admin.isPrimaryAdmin;

    final themeProv = context.watch<ThemeProvider>();
    final isDark = themeProv.isDark(context);
    final cardBg = AppColors.getAdminSurface(isDark);
    final cardBorder = AppColors.getAdminBorder(isDark);
    final textTitleColor = AppColors.getAdminText(isDark);
    final textSubtitleColor = AppColors.getAdminTextMuted(isDark);
    final inputBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);
    final inputBorder = isDark ? Colors.grey.shade800 : const Color(0xFFCBD5E1);

    return RefreshIndicator(
      onRefresh: () => context.read<AdminProvider>().refreshSettings(),
      color: AppColors.adminPrimary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Primary Administrator Card (Clean Linear Design)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: cardBorder),
            ),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.25)),
                  ),
                  child: const Icon(Icons.shield_rounded, color: Color(0xFFF59E0B), size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'ROOT ADMINISTRATOR',
                            style: TextStyle(
                              fontSize: 10,
                              letterSpacing: 0.8,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFFF59E0B),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: isPrimary ? AppColors.incomeGreen.withValues(alpha: 0.15) : (isDark ? Colors.white10 : Colors.black12),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              isPrimary ? 'ACTIVE SESSION' : 'DELEGATED',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: isPrimary ? AppColors.incomeGreen : (isDark ? Colors.grey : const Color(0xFF64748B)),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        primaryAdmin,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: textTitleColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── Section 0: Appearance & Theme ───────────────────────────
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.palette_outlined, size: 18, color: AppColors.adminPrimary),
                    const SizedBox(width: 8),
                    Text(
                      'Appearance & Theme',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: textTitleColor),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Choose color theme for the interface across user and admin portals.',
                  style: TextStyle(fontSize: 12, color: textSubtitleColor),
                ),
                const SizedBox(height: 12),
                Consumer<ThemeProvider>(
                  builder: (context, theme, _) {
                    return Row(
                      children: [
                        _themeOptionChip(
                          icon: Icons.light_mode_rounded,
                          label: 'Light',
                          isSelected: theme.themeMode == ThemeMode.light,
                          onTap: () => _switchThemeWithExplosion(theme, ThemeMode.light),
                          isDark: isDark,
                        ),
                        const SizedBox(width: 8),
                        _themeOptionChip(
                          icon: Icons.dark_mode_rounded,
                          label: 'Dark',
                          isSelected: theme.themeMode == ThemeMode.dark,
                          onTap: () => _switchThemeWithExplosion(theme, ThemeMode.dark),
                          isDark: isDark,
                        ),
                        const SizedBox(width: 8),
                        _themeOptionChip(
                          icon: Icons.brightness_auto_rounded,
                          label: 'System',
                          isSelected: theme.themeMode == ThemeMode.system,
                          onTap: () => _switchThemeWithExplosion(theme, ThemeMode.system),
                          isDark: isDark,
                        ),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── Section 1: Add New Administrator ───────────────────────
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.person_add_alt_1_rounded, size: 20, color: AppColors.adminPrimary),
                    const SizedBox(width: 8),
                    Text(
                      'Grant Administrator Access',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: textTitleColor),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Authorize a new email ID to access the Admin Observability & User control portal.',
                  style: TextStyle(fontSize: 12, color: textSubtitleColor),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _newAdminController,
                        style: TextStyle(color: textTitleColor, fontSize: 13),
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: inputBg,
                          hintText: 'admin@example.com',
                          hintStyle: TextStyle(color: textSubtitleColor),
                          prefixIcon: Icon(Icons.mail_outline_rounded, size: 18, color: textSubtitleColor),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: inputBorder),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: inputBorder),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppColors.adminPrimary),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    ElevatedButton(
                      onPressed: _isAdding ? null : _addNewAdmin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.adminPrimary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: _isAdding
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Text('Add Admin', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── Section 2: Authorized Administrators List ───────────────
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Authorized Administrators',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: textTitleColor),
                    ),
                    Text(
                      '${adminsList.length} Active',
                      style: const TextStyle(fontSize: 12, color: AppColors.adminPrimary, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: adminsList.length,
                  separatorBuilder: (_, __) => Divider(color: cardBorder, height: 16),
                  itemBuilder: (ctx, index) {
                    final email = adminsList[index];
                    final isRoot = email.toLowerCase() == primaryAdmin.toLowerCase();

                    return Row(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: isRoot ? const Color(0xFFF59E0B).withValues(alpha: 0.15) : (isDark ? Colors.white10 : Colors.black.withValues(alpha: 0.05)),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            isRoot ? Icons.star_rounded : Icons.person_rounded,
                            size: 16,
                            color: isRoot ? const Color(0xFFF59E0B) : (isDark ? Colors.grey : const Color(0xFF64748B)),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                email,
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: textTitleColor),
                              ),
                              Text(
                                isRoot ? 'Root Owner' : 'Delegated Admin',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: isRoot ? const Color(0xFFF59E0B) : textSubtitleColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (!isRoot && isPrimary)
                          IconButton(
                            icon: const Icon(Icons.remove_circle_outline, size: 18, color: AppColors.expenseRed),
                            tooltip: 'Revoke access',
                            onPressed: () => _confirmRevokeAdmin(email),
                          ),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── Section 3: Danger Zone (Move All Data to Trash) ────────────
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.expenseRed.withValues(alpha: 0.5), width: 1.5),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppColors.expenseRed.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.delete_sweep_rounded, size: 20, color: AppColors.expenseRed),
                    ),
                    const SizedBox(width: 10),
                    const Text(
                      'Danger Zone: Clear Data to Trash',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.expenseRed),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Performs a system-wide soft delete: moves all active user transactions and accounts directly into the Trash Bin. Data is preserved and can be retrieved or restored anytime from Admin Trash.',
                  style: TextStyle(fontSize: 12, color: textSubtitleColor, height: 1.4),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton.icon(
                    onPressed: _openMoveAllDataToTrashDangerZone,
                    icon: const Icon(Icons.warning_amber_rounded, size: 18),
                    label: const Text(
                      'Move All Data to Trash',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.expenseRed,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    ),
  );
}

  Widget _themeOptionChip({
    required IconData icon,
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.adminPrimary.withValues(alpha: isDark ? 0.2 : 0.12)
                : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected
                  ? AppColors.adminPrimary
                  : (isDark ? AppColors.adminBorder : const Color(0xFFE2E8F0)),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 15,
                color: isSelected
                    ? AppColors.adminPrimary
                    : (isDark ? Colors.grey.shade400 : const Color(0xFF64748B)),
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected
                      ? (isDark ? Colors.white : AppColors.adminPrimary)
                      : (isDark ? Colors.grey.shade400 : const Color(0xFF64748B)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

