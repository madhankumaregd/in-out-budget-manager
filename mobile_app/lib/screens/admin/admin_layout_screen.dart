import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/admin_provider.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/circular_theme_explosion.dart';
import 'admin_dashboard_screen.dart';
import 'admin_users_screen.dart';
import 'admin_settings_screen.dart';
import 'admin_trash_screen.dart';
import 'admin_api_keys_screen.dart';

class AdminLayoutScreen extends StatefulWidget {
  final int initialTab;
  const AdminLayoutScreen({super.key, this.initialTab = 0});

  @override
  State<AdminLayoutScreen> createState() => _AdminLayoutScreenState();
}

class _AdminLayoutScreenState extends State<AdminLayoutScreen> {
  late int _currentTab;
  final GlobalKey<ThemeExplosionEffectState> _explosionKey = GlobalKey();
  final GlobalKey _topThemeBtnKey = GlobalKey();

  final List<Widget> _pages = const [
    AdminDashboardScreen(),
    AdminUsersScreen(),
    AdminSettingsScreen(),
    AdminTrashScreen(),
    AdminApiKeysScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _currentTab = widget.initialTab;
  }

  void _handleLogout() {
    context.read<AdminProvider>().signOutAdmin();
    Navigator.pushReplacementNamed(context, '/dashboard');
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AdminProvider>();
    final themeProv = context.watch<ThemeProvider>();
    final isDark = themeProv.isDark(context);
    final adminBg = AppColors.getAdminBg(isDark);
    final adminSurface = AppColors.getAdminSurface(isDark);
    final adminBorder = AppColors.getAdminBorder(isDark);
    final adminText = AppColors.getAdminText(isDark);
    final adminTextMuted = AppColors.getAdminTextMuted(isDark);

    return ThemeExplosionEffect(
      key: _explosionKey,
      child: Scaffold(
        backgroundColor: adminBg,
        appBar: PreferredSize(
          preferredSize: const Size.fromHeight(64),
          child: Container(
            color: adminSurface,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    // Admin Shield Logo
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF8B5CF6), Color(0xFF6366F1)],
                        ),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.shield_rounded, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Admin Panel',
                          style: TextStyle(
                            color: adminText,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          admin.adminEmail ?? 'IN & OUT Manager',
                          style: TextStyle(color: adminTextMuted, fontSize: 10),
                        ),
                      ],
                    ),
                    const Spacer(),

                    // Theme Toggle with Explosion Shockwave Animation
                    Container(
                      key: _topThemeBtnKey,
                      child: IconButton(
                        icon: Icon(
                          isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                          color: isDark ? const Color(0xFFF59E0B) : const Color(0xFF6366F1),
                          size: 20,
                        ),
                        tooltip: 'Toggle Theme',
                        onPressed: () {
                          if (_explosionKey.currentState?.isLocked == true) return;
                          final renderBox = _topThemeBtnKey.currentContext?.findRenderObject() as RenderBox?;
                          final origin = renderBox != null
                              ? renderBox.localToGlobal(renderBox.size.center(Offset.zero))
                              : Offset(MediaQuery.of(context).size.width - 60, kToolbarHeight);
                          _explosionKey.currentState?.explode(
                            origin: origin,
                            toDarkMode: !isDark,
                            onTrigger: () => themeProv.toggleTheme(),
                          );
                        },
                      ),
                    ),

                    // Refresh Current Admin View Button
                    IconButton(
                      icon: admin.isLoading
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.adminPrimary),
                            )
                          : Icon(
                              Icons.refresh_rounded,
                              color: isDark ? Colors.grey.shade300 : const Color(0xFF6366F1),
                              size: 20,
                            ),
                      tooltip: 'Refresh Current Page',
                      onPressed: admin.isLoading
                          ? null
                          : () async {
                              await admin.refreshCurrentTab(_currentTab);
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Admin data refreshed'),
                                    duration: Duration(milliseconds: 1200),
                                  ),
                                );
                              }
                            },
                    ),

                  // Admin Sign Out (end admin session)
                  IconButton(
                    icon: const Icon(Icons.power_settings_new_rounded, color: AppColors.expenseRed, size: 20),
                    tooltip: 'Sign Out Admin Session',
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          backgroundColor: adminSurface,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: BorderSide(color: adminBorder),
                          ),
                          title: Text('Sign Out Admin?', style: TextStyle(color: adminText, fontWeight: FontWeight.bold)),
                          content: Text('This will end your admin session. You will need to re-authenticate to access the admin panel.', style: TextStyle(color: adminTextMuted, fontSize: 13)),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(ctx),
                              child: Text('Cancel', style: TextStyle(color: adminTextMuted)),
                            ),
                            ElevatedButton(
                              onPressed: () {
                                Navigator.pop(ctx);
                                _handleLogout();
                              },
                              style: ElevatedButton.styleFrom(backgroundColor: AppColors.expenseRed),
                              child: const Text('Sign Out', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      body: IndexedStack(
        index: _currentTab,
        children: _pages,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: adminSurface,
          border: Border(top: BorderSide(color: adminBorder)),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildTabItem(0, Icons.speed_rounded, 'Telemetry', isDark),
                _buildTabItem(1, Icons.people_alt_rounded, 'Users', isDark),
                _buildTabItem(2, Icons.tune_rounded, 'Settings', isDark),
                _buildTabItem(3, Icons.delete_sweep_rounded, 'Trash', isDark),
                _buildTabItem(4, Icons.key_rounded, 'API Keys', isDark),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

  Widget _buildTabItem(int index, IconData icon, String label, bool isDark) {
    final isSelected = _currentTab == index;
    return InkWell(
      onTap: () => setState(() => _currentTab = index),
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.adminPrimary.withValues(alpha: isDark ? 0.18 : 0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.adminPrimary.withValues(alpha: isDark ? 0.3 : 0.25) : Colors.transparent,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 20,
              color: isSelected ? AppColors.adminPrimary : (isDark ? Colors.grey.shade400 : const Color(0xFF64748B)),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected
                    ? (isDark ? Colors.white : AppColors.adminPrimary)
                    : (isDark ? Colors.grey.shade400 : const Color(0xFF64748B)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

