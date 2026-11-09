import 'package:flutter/material.dart';

class AppColors {
  // ─── THE 3 MAJOR ACCENT COLORS ───
  // 1. Violet (Brand, Balance, Transfer, Primary Actions)
  static const Color primaryViolet = Color(0xFF8B5CF6); // violet-500
  static const Color primaryPurple = Color(0xFF7C3AED); // violet-600
  static const Color primaryIndigo = Color(0xFF8B5CF6); // Unified to rich violet
  static const Color primaryDark = Color(0xFF6D28D9);   // violet-700
  static const Color primaryPink = Color(0xFF7C3AED);   // Unified to rich violet

  // 2. Green (Income, Positive, Growth)
  static const Color incomeGreen = Color(0xFF10B981);
  static const Color incomeDark = Color(0xFF059669);
  static const Color incomeBg = Color(0xFFECFDF5);

  // 3. Red (Expense, Negative, Destructive, Danger)
  static const Color expenseRed = Color(0xFFEF4444);
  static const Color expenseDark = Color(0xFFDC2626);
  static const Color expenseBg = Color(0xFFFEF2F2);

  // Transfer (Unified to brand Violet)
  static const Color transferBlue = Color(0xFF8B5CF6); // Unified to Violet
  static const Color transferViolet = Color(0xFF8B5CF6);
  static const Color transferBg = Color(0x1F8B5CF6);

  // ─── BRAND GRADIENTS (Rich Violet, Green, Red) ───
  static const LinearGradient brandGradient = LinearGradient(
    colors: [Color(0xFF8B5CF6), Color(0xFF7C3AED)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient primaryGradient = brandGradient;

  static const LinearGradient backgroundGradient = LinearGradient(
    colors: [Color(0xFF8B5CF6), Color(0xFF7C3AED), Color(0xFF6D28D9)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient cardBalanceGradient = LinearGradient(
    colors: [Color(0xFF8B5CF6), Color(0xFF6D28D9)], // Rich royal violet
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  static const LinearGradient balanceCardGradient = cardBalanceGradient;

  static const LinearGradient cardIncomeGradient = LinearGradient(
    colors: [Color(0xFF10B981), Color(0xFF059669)], // Crisp emerald green
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  static const LinearGradient incomeCardGradient = cardIncomeGradient;

  static const LinearGradient cardExpenseGradient = LinearGradient(
    colors: [Color(0xFFEF4444), Color(0xFFDC2626)], // Crisp clean red
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  static const LinearGradient expenseCardGradient = cardExpenseGradient;

  // ─── BASE COLORS (Black & White with Minimalist Neutral Slate) ───
  static const Color scaffoldBg = Color(0xFFF8FAFC);
  static const Color scaffoldBgEnd = Color(0xFFF1F5F9);
  static const Color surfaceWhite = Colors.white;
  static const Color cardBorder = Color(0xFFF1F5F9);
  static const Color dividerColor = Color(0xFFE2E8F0);

  // Typography
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF475569);
  static const Color textMuted = Color(0xFF94A3B8);

  // Admin Console Theme
  static const Color adminBg = Color(0xFF020617);
  static const Color adminBgDark = adminBg;
  static const Color adminSurface = Color(0xFF0F172A);
  static const Color adminCardDark = adminSurface;
  static const Color adminSurfaceDark = Color(0xFF1E293B);
  static const Color adminBorder = Color(0xFF1E293B);
  static const Color adminBorderDark = Color(0xFF334155);
  static const Color adminPrimary = Color(0xFF8B5CF6);
  static const Color adminPurpleGlow = adminPrimary;
  static const Color adminGold = Color(0xFF8B5CF6); // Unified to Violet
  static const Color adminAccent = adminPrimary;

  // Admin Dynamic Theme (Light & Dark Support)
  static Color getAdminBg(bool isDark) => isDark ? const Color(0xFF020617) : const Color(0xFFF8FAFC);
  static Color getAdminSurface(bool isDark) => isDark ? const Color(0xFF0F172A) : Colors.white;
  static Color getAdminCard(bool isDark) => isDark ? const Color(0xFF1E293B) : const Color(0xFFFFFFFF);
  static Color getAdminBorder(bool isDark) => isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0);
  static Color getAdminText(bool isDark) => isDark ? Colors.white : const Color(0xFF0F172A);
  static Color getAdminTextMuted(bool isDark) => isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);
}
