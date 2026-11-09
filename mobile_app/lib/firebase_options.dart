import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Default [FirebaseOptions] for IN & OUT Budget Manager
/// Same project as web: in-out-budget-manager
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.windows:
        return windows;
      default:
        return web;
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyBvoQmmzWwjGqfhIVKBiE8ridGEOdjAnoo',
    appId: '1:261710938232:web:256cfd1a4588756e21ad8d',
    messagingSenderId: '261710938232',
    projectId: 'in-out-budget-manager',
    authDomain: 'in-out-budget-manager.firebaseapp.com',
    storageBucket: 'in-out-budget-manager.firebasestorage.app',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBvoQmmzWwjGqfhIVKBiE8ridGEOdjAnoo',
    appId: '1:261710938232:android:256cfd1a4588756e21ad8d',
    messagingSenderId: '261710938232',
    projectId: 'in-out-budget-manager',
    storageBucket: 'in-out-budget-manager.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBvoQmmzWwjGqfhIVKBiE8ridGEOdjAnoo',
    appId: '1:261710938232:ios:256cfd1a4588756e21ad8d',
    messagingSenderId: '261710938232',
    projectId: 'in-out-budget-manager',
    storageBucket: 'in-out-budget-manager.firebasestorage.app',
  );

  static const FirebaseOptions windows = FirebaseOptions(
    apiKey: 'AIzaSyBvoQmmzWwjGqfhIVKBiE8ridGEOdjAnoo',
    appId: '1:261710938232:web:256cfd1a4588756e21ad8d',
    messagingSenderId: '261710938232',
    projectId: 'in-out-budget-manager',
    storageBucket: 'in-out-budget-manager.firebasestorage.app',
  );
}
