import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../providers/admin_provider.dart';

class DangerZoneDialog extends StatefulWidget {
  final String title;
  final String warningMessage;
  final String actionLabel;
  final String ackText;
  final bool isPermanentDestruction;
  final Future<void> Function() onConfirm;

  const DangerZoneDialog({
    super.key,
    required this.title,
    required this.warningMessage,
    required this.actionLabel,
    required this.ackText,
    required this.onConfirm,
    this.isPermanentDestruction = false,
  });

  static Future<bool?> show({
    required BuildContext context,
    required String title,
    required String warningMessage,
    required String actionLabel,
    required String ackText,
    required Future<void> Function() onConfirm,
    bool isPermanentDestruction = false,
  }) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => DangerZoneDialog(
        title: title,
        warningMessage: warningMessage,
        actionLabel: actionLabel,
        ackText: ackText,
        onConfirm: onConfirm,
        isPermanentDestruction: isPermanentDestruction,
      ),
    );
  }

  @override
  State<DangerZoneDialog> createState() => _DangerZoneDialogState();
}

class _DangerZoneDialogState extends State<DangerZoneDialog> {
  int _secondsRemaining = 0;
  Timer? _timer;
  bool _acknowledged = true;
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isProcessing = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    if (widget.isPermanentDestruction) {
      _secondsRemaining = 10;
      _acknowledged = false;
      _startCountdown();
    } else {
      _secondsRemaining = 0;
      _acknowledged = true;
    }
  }

  void _startCountdown() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (_secondsRemaining > 1) {
        setState(() => _secondsRemaining--);
      } else {
        setState(() => _secondsRemaining = 0);
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleExecute() async {
    final password = _passwordController.text.trim();
    if (password.isEmpty) {
      setState(() => _errorMessage = 'Please enter your administrator password.');
      return;
    }

    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    try {
      final admin = context.read<AdminProvider>();
      final isPasswordValid = await admin.verifyAdminPassword(password);
      if (!isPasswordValid) {
        if (!mounted) return;
        setState(() {
          _isProcessing = false;
          _errorMessage = 'Incorrect administrator password. Action denied.';
        });
        return;
      }

      await widget.onConfirm();

      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isProcessing = false;
        _errorMessage = 'Execution failed: ${e.toString()}';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dialogBg = isDark ? const Color(0xFF0F172A) : Colors.white;
    final textColor = isDark ? Colors.white : AppColors.textPrimary;
    final isEnabled = (widget.isPermanentDestruction ? (_secondsRemaining == 0 && _acknowledged) : true) &&
        _passwordController.text.trim().isNotEmpty &&
        !_isProcessing;

    return AlertDialog(
      backgroundColor: dialogBg,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: AppColors.expenseRed, width: 2),
      ),
      contentPadding: const EdgeInsets.all(22),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: Warning Icon + Title
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.expenseRed.withOpacity(0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.warning_amber_rounded,
                    color: AppColors.expenseRed,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.title,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: textColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Warning Banner Box
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.expenseRed.withOpacity(0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.expenseRed.withOpacity(0.3)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.error_outline_rounded, size: 18, color: AppColors.expenseRed),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      widget.warningMessage,
                      style: TextStyle(
                        fontSize: 12.5,
                        color: isDark ? Colors.grey.shade300 : AppColors.textPrimary,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 10-Second Safety Countdown Timer & ACK (Only for permanent destruction)
            if (widget.isPermanentDestruction) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: _secondsRemaining > 0
                      ? const Color(0xFFF59E0B).withOpacity(0.12)
                      : AppColors.incomeGreen.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _secondsRemaining > 0
                        ? const Color(0xFFF59E0B).withOpacity(0.4)
                        : AppColors.incomeGreen.withOpacity(0.4),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _secondsRemaining > 0 ? Icons.timer_outlined : Icons.check_circle_outline_rounded,
                      size: 20,
                      color: _secondsRemaining > 0 ? const Color(0xFFF59E0B) : AppColors.incomeGreen,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _secondsRemaining > 0
                            ? 'Safety lock active: wait ${_secondsRemaining}s to unlock'
                            : '10s Safety countdown passed. You may proceed.',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: _secondsRemaining > 0 ? const Color(0xFFF59E0B) : AppColors.incomeGreen,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Acknowledgment Checkbox
              InkWell(
                onTap: () {
                  setState(() => _acknowledged = !_acknowledged);
                },
                borderRadius: BorderRadius.circular(8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Checkbox(
                      value: _acknowledged,
                      activeColor: AppColors.expenseRed,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                      onChanged: (val) {
                        setState(() => _acknowledged = val ?? false);
                      },
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 10),
                        child: Text(
                          widget.ackText,
                          style: TextStyle(
                            fontSize: 12,
                            color: textColor,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],

            // Admin Password Verification Field
            Text(
              'Verify Administrator Password',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.grey.shade300 : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _passwordController,
              obscureText: _obscurePassword,
              onChanged: (_) => setState(() {}),
              style: TextStyle(color: textColor, fontSize: 13),
              decoration: InputDecoration(
                filled: true,
                fillColor: isDark ? const Color(0xFF1E293B) : Colors.grey.shade100,
                hintText: 'Enter admin password',
                hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : Colors.grey.shade300),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : Colors.grey.shade300),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.expenseRed),
                ),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                    size: 18,
                    color: Colors.grey,
                  ),
                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                ),
              ),
            ),

            if (_errorMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                _errorMessage!,
                style: const TextStyle(color: AppColors.expenseRed, fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ],

            const SizedBox(height: 20),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: _isProcessing ? null : () => Navigator.of(context).pop(false),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      'Cancel',
                      style: TextStyle(color: Colors.grey.shade500, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: isEnabled ? _handleExecute : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.expenseRed,
                      disabledBackgroundColor: isDark ? const Color(0xFF334155) : Colors.grey.shade300,
                      foregroundColor: Colors.white,
                      disabledForegroundColor: Colors.grey.shade500,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: _isProcessing
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                widget.isPermanentDestruction ? Icons.delete_forever_rounded : Icons.move_to_inbox_rounded,
                                size: 16,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                (widget.isPermanentDestruction && _secondsRemaining > 0)
                                    ? 'Wait (${_secondsRemaining}s)'
                                    : widget.actionLabel,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

