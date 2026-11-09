import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../models/api_key_model.dart';
import '../../providers/admin_provider.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/confirm_dialog.dart';

class AdminApiKeysScreen extends StatefulWidget {
  const AdminApiKeysScreen({super.key});

  @override
  State<AdminApiKeysScreen> createState() => _AdminApiKeysScreenState();
}

class _AdminApiKeysScreenState extends State<AdminApiKeysScreen> {
  final _keyNameController = TextEditingController();

  @override
  void dispose() {
    _keyNameController.dispose();
    super.dispose();
  }

  void _copyKey(String key) {
    Clipboard.setData(ClipboardData(text: key));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('API Key copied to clipboard!'),
        backgroundColor: AppColors.adminPrimary,
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _showCreateKeyDialog(BuildContext context) {
    final themeProv = context.read<ThemeProvider>();
    final isDark = themeProv.isDark(context);
    final cardBg = AppColors.getAdminSurface(isDark);
    final textTitle = AppColors.getAdminText(isDark);
    final textSubtitle = AppColors.getAdminTextMuted(isDark);
    final inputBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: cardBg,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Generate API Key', style: TextStyle(color: textTitle, fontSize: 16, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _keyNameController,
                style: TextStyle(color: textTitle, fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'Key Name (e.g., Mobile App Service)',
                  hintStyle: TextStyle(color: textSubtitle),
                  filled: true,
                  fillColor: inputBg,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('Cancel', style: TextStyle(color: textSubtitle)),
            ),
            ElevatedButton(
              onPressed: () async {
                final name = _keyNameController.text.trim();
                if (name.isNotEmpty) {
                  await context.read<AdminProvider>().createApiKey(name);
                  _keyNameController.clear();
                  if (ctx.mounted) Navigator.pop(ctx);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.adminPrimary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Generate'),
            ),
          ],
        );
      },
    );
  }

  void _confirmDeleteKey(BuildContext context, ApiKeyModel key) async {
    final confirmed = await ConfirmDialog.show(
      context: context,
      title: 'Revoke API Key?',
      message: 'Are you sure you want to permanently revoke key "${key.name}"?',
      confirmLabel: 'Revoke Key',
      isDestructive: true,
    );
    if (confirmed && context.mounted) {
      await context.read<AdminProvider>().deleteApiKey(key.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AdminProvider>();
    final keys = admin.apiKeys;

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
                    'API Access Keys',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textTitle),
                  ),
                  Text(
                    '${keys.length} system API integrations',
                    style: TextStyle(fontSize: 11, color: textSubtitle),
                  ),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () => _showCreateKeyDialog(context),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('New Key', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.adminPrimary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),

        // Keys list with Pull-to-Refresh
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => context.read<AdminProvider>().refreshApiKeys(),
            color: AppColors.adminPrimary,
            child: keys.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(
                        height: MediaQuery.of(context).size.height * 0.45,
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.key_off_rounded, size: 56, color: textSubtitle),
                              const SizedBox(height: 12),
                              Text(
                                'No API keys found',
                                style: TextStyle(color: textSubtitle, fontSize: 14),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Create an API key for backend service integrations',
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
                    itemCount: keys.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (ctx, index) {
                    final k = keys[index];

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
                          Row(
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: AppColors.adminPrimary.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.key_rounded, size: 18, color: AppColors.adminPrimary),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      k.name,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: textTitle,
                                      ),
                                    ),
                                    Text(
                                      'Created: ${k.createdAt.toString().split(' ').first}',
                                      style: TextStyle(fontSize: 10, color: textSubtitle),
                                    ),
                                  ],
                                ),
                              ),
                              Switch.adaptive(
                                value: k.isActive,
                                activeColor: AppColors.incomeGreen,
                                onChanged: (val) => admin.toggleApiKeyStatus(k.id, val),
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.expenseRed),
                                onPressed: () => _confirmDeleteKey(context, k),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: cardBorder),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    k.key,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontFamily: 'monospace',
                                      fontSize: 11,
                                      color: textTitle,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                InkWell(
                                  onTap: () => _copyKey(k.key),
                                  child: const Icon(Icons.copy_rounded, size: 14, color: AppColors.adminPrimary),
                                ),
                              ],
                            ),
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

