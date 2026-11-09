import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

class SwipeDismissBottomSheet extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? leading;
  final Widget child;
  final bool isDark;
  final bool showHeader;

  const SwipeDismissBottomSheet({
    super.key,
    required this.title,
    this.subtitle,
    this.leading,
    required this.child,
    this.isDark = false,
    this.showHeader = true,
  });

  static Future<T?> show<T>({
    required BuildContext context,
    String title = '',
    String? subtitle,
    Widget? leading,
    required Widget child,
    bool isDark = false,
    bool showHeader = true,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => SwipeDismissBottomSheet(
        title: title,
        subtitle: subtitle,
        leading: leading,
        isDark: isDark,
        showHeader: showHeader,
        child: child,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final effectiveDark = isDark || Theme.of(context).brightness == Brightness.dark;
    final bgColor = effectiveDark ? const Color(0xFF0F172A) : Colors.white;
    final titleColor = effectiveDark ? Colors.white : AppColors.textPrimary;
    final subColor = effectiveDark ? const Color(0xFF94A3B8) : AppColors.textMuted;
    final handleColor = effectiveDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1);
    final dividerColor = effectiveDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);

    return Container(
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(top: BorderSide(color: dividerColor, width: 1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: effectiveDark ? 0.35 : 0.15),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Swipe Down Handle (Pull Pill) ──
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 48,
              height: 5,
              decoration: BoxDecoration(
                color: handleColor,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),

          // ── Header (Title, Subtitle, X Button) ──
          if (showHeader && title.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                children: [
                  if (leading != null) ...[
                    leading!,
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: titleColor,
                          ),
                        ),
                        if (subtitle != null)
                          Text(
                            subtitle!,
                            style: TextStyle(
                              fontSize: 12,
                              color: subColor,
                            ),
                          ),
                      ],
                    ),
                  ),
                  // ── Preserved 'X' Button ──
                  IconButton(
                    icon: Icon(
                      Icons.close_rounded,
                      color: effectiveDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                    onPressed: () => Navigator.of(context).pop(),
                    tooltip: 'Close',
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: dividerColor),
          ],

          // ── Sheet Content ──
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: child,
            ),
          ),
        ],
      ),
    );
  }
}
