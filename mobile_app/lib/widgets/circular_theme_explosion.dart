import 'dart:math';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import '../core/constants/app_colors.dart';

class ThemeExplosionEffect extends StatefulWidget {
  final Widget child;
  const ThemeExplosionEffect({super.key, required this.child});

  static ThemeExplosionEffectState? of(BuildContext context) {
    return context.findAncestorStateOfType<ThemeExplosionEffectState>();
  }

  @override
  State<ThemeExplosionEffect> createState() => ThemeExplosionEffectState();
}

class ThemeExplosionEffectState extends State<ThemeExplosionEffect>
    with SingleTickerProviderStateMixin {
  final GlobalKey _boundaryKey = GlobalKey();
  late AnimationController _controller;
  late Animation<double> _animation;

  Offset _origin = Offset.zero;
  bool _isExploding = false;
  ui.Image? _oldScreenSnapshot;
  DateTime? _lastExplodeTime;

  bool get isLocked {
    if (_isExploding || _controller.isAnimating) return true;
    if (_lastExplodeTime != null) {
      final elapsed = DateTime.now().difference(_lastExplodeTime!).inMilliseconds;
      if (elapsed < 1000) return true;
    }
    return false;
  }

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    );

    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOutCubic,
    );

    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        setState(() {
          _isExploding = false;
          _oldScreenSnapshot?.dispose();
          _oldScreenSnapshot = null;
        });
      }
    });
  }

  @override
  void dispose() {
    _oldScreenSnapshot?.dispose();
    _controller.dispose();
    super.dispose();
  }

  /// Trigger the circular shockwave reveal from [origin]
  Future<void> explode({
    required Offset origin,
    required bool toDarkMode,
    required VoidCallback onTrigger,
  }) async {
    final now = DateTime.now();
    // Deny multiple clicks for 1 second to solidly complete the transformation without glitching rings
    if (_lastExplodeTime != null && now.difference(_lastExplodeTime!).inMilliseconds < 1000) {
      return;
    }
    if (_isExploding || _controller.isAnimating) {
      return;
    }
    _lastExplodeTime = now;
    try {
      final boundary =
          _boundaryKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary != null) {
        final image = await boundary.toImage(pixelRatio: 1.5);
        _oldScreenSnapshot = image;
      }
    } catch (_) {}

    setState(() {
      _origin = origin;
      _isExploding = true;
    });

    // Switch theme immediately so the new theme is rendered inside the expanding circular clip!
    onTrigger();

    _controller.forward(from: 0.0);
  }

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      key: _boundaryKey,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Bottom layer: The old screen snapshot (visible outside the expanding circle)
          if (_isExploding && _oldScreenSnapshot != null)
            Positioned.fill(
              child: RawImage(
                image: _oldScreenSnapshot,
                fit: BoxFit.fill,
              ),
            ),

          // 2. Top layer: The new theme widget.child revealed smoothly through the expanding circular clip
          if (_isExploding)
            AnimatedBuilder(
              animation: _animation,
              builder: (context, child) {
                return ClipPath(
                  clipper: _CircularRevealClipper(
                    progress: _animation.value,
                    origin: _origin,
                  ),
                  child: child,
                );
              },
              child: widget.child,
            )
          else
            widget.child,

          // 3. Shockwave glow ring at the perimeter of the expanding circle
          if (_isExploding)
            Positioned.fill(
              child: IgnorePointer(
                child: AnimatedBuilder(
                  animation: _animation,
                  builder: (context, _) {
                    return CustomPaint(
                      painter: _ShockwaveRingPainter(
                        progress: _animation.value,
                        origin: _origin,
                      ),
                    );
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _CircularRevealClipper extends CustomClipper<Path> {
  final double progress;
  final Offset origin;

  _CircularRevealClipper({
    required this.progress,
    required this.origin,
  });

  @override
  Path getClip(Size size) {
    if (progress <= 0.0) return Path();
    if (progress >= 1.0) {
      return Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height));
    }

    // Maximum distance to the farthest screen corner
    final double maxDx = max(origin.dx, size.width - origin.dx);
    final double maxDy = max(origin.dy, size.height - origin.dy);
    final double maxRadius = sqrt(maxDx * maxDx + maxDy * maxDy) + 30;

    final double currentRadius = progress * maxRadius;

    return Path()..addOval(Rect.fromCircle(center: origin, radius: currentRadius));
  }

  @override
  bool shouldReclip(covariant _CircularRevealClipper oldClipper) {
    return oldClipper.progress != progress || oldClipper.origin != origin;
  }
}

class _ShockwaveRingPainter extends CustomPainter {
  final double progress;
  final Offset origin;

  _ShockwaveRingPainter({
    required this.progress,
    required this.origin,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (progress <= 0.01 || progress >= 0.98) return;

    final double maxDx = max(origin.dx, size.width - origin.dx);
    final double maxDy = max(origin.dy, size.height - origin.dy);
    final double maxRadius = sqrt(maxDx * maxDx + maxDy * maxDy) + 30;
    final double currentRadius = progress * maxRadius;

    final double ringOpacity = (1.0 - progress).clamp(0.0, 1.0);

    // Inner bright laser line
    final Paint linePaint = Paint()
      ..color = AppColors.primaryIndigo.withValues(alpha: ringOpacity * 0.85)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5;

    canvas.drawCircle(origin, currentRadius, linePaint);

    // Outer neon glow halo
    final Paint glowPaint = Paint()
      ..color = AppColors.primaryPurple.withValues(alpha: ringOpacity * 0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12.0;

    canvas.drawCircle(origin, currentRadius, glowPaint);
  }

  @override
  bool shouldRepaint(covariant _ShockwaveRingPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.origin != origin;
  }
}
