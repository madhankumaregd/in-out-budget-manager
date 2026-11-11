import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../providers/budget_provider.dart';
import '../providers/notification_provider.dart';
import '../widgets/circular_theme_explosion.dart';
import '../widgets/notification_sheet.dart';
import 'dashboard/dashboard_screen.dart';
import 'transactions/transactions_screen.dart';
import 'accounts/accounts_screen.dart';
import '../widgets/confirm_dialog.dart';

class MainNavigationScreen extends StatefulWidget {
  final int initialIndex;
  const MainNavigationScreen({super.key, this.initialIndex = 0});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  late int _currentIndex;
  final GlobalKey<ThemeExplosionEffectState> _explosionKey = GlobalKey();
  final GlobalKey _topThemeBtnKey = GlobalKey();

  final List<Widget> _screens = const [
    DashboardScreen(),
    TransactionsScreen(),
    AccountsScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<NotificationProvider>().requestPermission();
      }
    });
  }

  void _onTabTapped(int index) {
    setState(() => _currentIndex = index);
  }

  void _confirmLogout() async {
    final confirmed = await ConfirmDialog.show(
      context: context,
      title: 'Sign Out?',
      message: 'Are you sure you want to end your current session?',
      confirmLabel: 'Sign Out',
      isDestructive: true,
    );
    if (confirmed && mounted) {
      await context.read<AuthProvider>().signOut();
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final themeProv = context.watch<ThemeProvider>();
    final notifProv = context.watch<NotificationProvider>();
    final budget = context.watch<BudgetProvider>();
    final unreadNotifs = notifProv.unreadCount;
    final isDark = themeProv.isDark(context);
    final isAdmin = auth.isUserAdmin;
    final userName = auth.userProfile?.displayName.isNotEmpty == true
        ? auth.userProfile!.displayName
        : 'User';

    // Trigger intelligent notifications evaluation once data is ready
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        if (!budget.isLoading &&
            (budget.accounts.isNotEmpty || budget.transactions.isNotEmpty)) {
          context.read<NotificationProvider>().evaluate(
                accounts: budget.accounts,
                transactions: budget.transactions,
                currencySymbol: '₹',
              );
        }
      }
    });

    // Pure white in light mode, deep black in dark mode for seamless status bar integration
    final barBgColor = isDark ? Colors.black : Colors.white;
    final statusBarColor = isDark ? Colors.black : Colors.white;

    return ThemeExplosionEffect(
      key: _explosionKey,
      child: PopScope(
        canPop: _currentIndex == 0,
        onPopInvokedWithResult: (didPop, result) {
          if (didPop) return;
          if (_currentIndex != 0) {
            setState(() => _currentIndex = 0);
          }
        },
        child: Scaffold(
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          appBar: AppBar(
        toolbarHeight: 74,
        elevation: 0,
        backgroundColor: barBgColor,
        surfaceTintColor: Colors.transparent,
        automaticallyImplyLeading: false,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: statusBarColor,
          statusBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
          statusBarBrightness: isDark ? Brightness.dark : Brightness.light,
          systemNavigationBarColor: barBgColor,
          systemNavigationBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
        ),
        titleSpacing: 16,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
            height: 1,
          ),
        ),
        title: SizedBox(
          height: 48,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryIndigo.withValues(alpha: 0.35),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Center(
                  child: Text(
                    '₹',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              ShaderMask(
                shaderCallback: (bounds) =>
                    AppColors.primaryGradient.createShader(bounds),
                child: const Text(
                  'IN & OUT',
                  style: TextStyle(
                    fontSize: 21,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ),
        actions: [
          // Notification Bell button
          Center(
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  IconButton(
                    onPressed: () => NotificationSheet.show(context),
                    icon: Icon(
                      unreadNotifs > 0
                          ? Icons.notifications_active_rounded
                          : Icons.notifications_none_rounded,
                      color: unreadNotifs > 0
                          ? (isDark ? const Color(0xFFA78BFA) : AppColors.primaryViolet)
                          : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                      size: 20,
                    ),
                    tooltip: 'Notifications',
                    constraints: const BoxConstraints(minWidth: 38, minHeight: 38),
                    padding: EdgeInsets.zero,
                  ),
                  if (unreadNotifs > 0)
                    Positioned(
                      top: 4,
                      right: 4,
                      child: Container(
                        padding: const EdgeInsets.all(3.5),
                        decoration: const BoxDecoration(
                          color: Color(0xFFEF4444),
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(minWidth: 10, minHeight: 10),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Theme quick toggle button
          Center(
            child: Container(
              key: _topThemeBtnKey,
              margin: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: IconButton(
                onPressed: () {
                  if (_explosionKey.currentState?.isLocked == true) return;
                  final renderBox = _topThemeBtnKey.currentContext?.findRenderObject() as RenderBox?;
                  final origin = renderBox != null
                      ? renderBox.localToGlobal(renderBox.size.center(Offset.zero))
                      : Offset(MediaQuery.of(context).size.width - 40, 50);
                  _explosionKey.currentState?.explode(
                    origin: origin,
                    toDarkMode: !isDark,
                    onTrigger: () => themeProv.toggleTheme(),
                  );
                },
                icon: Icon(
                  isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                  color: isDark ? const Color(0xFFFBBF24) : AppColors.primaryIndigo,
                  size: 20,
                ),
                tooltip: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
                constraints: const BoxConstraints(minWidth: 38, minHeight: 38),
                padding: EdgeInsets.zero,
              ),
            ),
          ),

          // Admin Portal Pill (if authorized admin)
          if (isAdmin)
            Center(
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                child: InkWell(
                  onTap: () => Navigator.pushNamed(context, '/admin'),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                    decoration: BoxDecoration(
                      color: AppColors.primaryPurple.withValues(alpha: 0.12),
                      border: Border.all(
                        color: AppColors.primaryPurple.withValues(alpha: 0.35),
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Icon(Icons.shield_outlined, size: 15, color: AppColors.primaryPurple),
                        SizedBox(width: 4),
                        Text(
                          'Admin',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primaryPurple,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

          // User Avatar Popover Menu
          Center(
            child: Container(
              margin: const EdgeInsets.only(right: 16),
              child: PopupMenuButton<String>(
                onSelected: (val) {
                  if (val == 'profile') {
                    setState(() => _currentIndex = 2); // Go to Accounts / Profile tab
                  } else if (val == 'theme') {
                    final origin = Offset(MediaQuery.of(context).size.width - 35, 50);
                    _explosionKey.currentState?.explode(
                      origin: origin,
                      toDarkMode: !isDark,
                      onTrigger: () => themeProv.toggleTheme(),
                    );
                  } else if (val == 'admin') {
                    Navigator.pushNamed(context, '/admin');
                  } else if (val == 'logout') {
                    _confirmLogout();
                  }
                },
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                itemBuilder: (context) => [
                  PopupMenuItem(
                    enabled: false,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          userName,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          auth.currentUser?.email ?? '',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade500,
                          ),
                        ),
                        const Divider(height: 16),
                      ],
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'profile',
                    child: Row(
                      children: [
                        Icon(Icons.settings_outlined, size: 18, color: AppColors.primaryIndigo),
                        SizedBox(width: 10),
                        Text('Profile & Settings', style: TextStyle(fontSize: 13)),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'theme',
                    child: Row(
                      children: [
                        Icon(
                          isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                          size: 18,
                          color: isDark ? const Color(0xFFA78BFA) : AppColors.primaryViolet,
                        ),
                        const SizedBox(width: 10),
                        Text(isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
                            style: const TextStyle(fontSize: 13)),
                      ],
                    ),
                  ),
                  if (isAdmin)
                    const PopupMenuItem(
                      value: 'admin',
                      child: Row(
                        children: [
                          Icon(Icons.shield_outlined, size: 18, color: AppColors.primaryPurple),
                          SizedBox(width: 10),
                          Text('Admin Control Center', style: TextStyle(fontSize: 13)),
                        ],
                      ),
                    ),
                  const PopupMenuDivider(),
                  const PopupMenuItem(
                    value: 'logout',
                    child: Row(
                      children: [
                        Icon(Icons.logout_rounded, size: 18, color: AppColors.expenseRed),
                        SizedBox(width: 10),
                        Text('Logout', style: TextStyle(fontSize: 13, color: AppColors.expenseRed)),
                      ],
                    ),
                  ),
                ],
                child: Container(
                  width: 38,
                  height: 38,
                  decoration: const BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.person_rounded,
                      color: Colors.white,
                      size: 22,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: barBgColor,
          border: Border(
            top: BorderSide(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
              width: 1,
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.05),
              blurRadius: 16,
              offset: const Offset(0, -3),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 64,
            child: Row(
              children: [
                _buildNavItem(0, Icons.dashboard_rounded, 'Dashboard', isDark),
                _buildNavItem(1, Icons.history_rounded, 'Transactions', isDark),
                _buildNavItem(2, Icons.account_balance_wallet_rounded, 'Accounts', isDark),
              ],
            ),
          ),
        ),
      ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label, bool isDark) {
    final isSelected = _currentIndex == index;
    final unselectedColor = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _onTabTapped(index),
          splashColor: AppColors.primaryIndigo.withValues(alpha: 0.1),
          highlightColor: Colors.transparent,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeOutCubic,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
                decoration: BoxDecoration(
                  gradient: isSelected ? AppColors.primaryGradient : null,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  icon,
                  size: 22,
                  color: isSelected ? Colors.white : unselectedColor,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected
                      ? (isDark ? const Color(0xFFA78BFA) : AppColors.primaryViolet)
                      : unselectedColor,
                  letterSpacing: -0.2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
