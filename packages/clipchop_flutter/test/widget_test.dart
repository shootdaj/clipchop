// Basic widget test for Clipchop Flutter app

import 'package:flutter_test/flutter_test.dart';

import 'package:clipchop_flutter/main.dart';

void main() {
  testWidgets('App loads and shows title', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const ClipchopApp());

    // Wait for animations to complete
    await tester.pumpAndSettle();

    // Verify that the app title is displayed
    expect(find.text('Clipchop'), findsOneWidget);

    // Verify that the subtitle is displayed
    expect(find.text('Split videos for social media'), findsOneWidget);
  });
}
