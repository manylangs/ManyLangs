import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import 'firebase_options.dart';
import 'screens/pronunciation_trial.dart';
import 'screens/payment_modal.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(const ManyLangsApp());
}

class ManyLangsApp extends StatelessWidget {
  const ManyLangsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ManyLangs',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const HomePage(),
        '/trial': (context) => const PronunciationTrialPage(),
        '/payment': (context) => const PaymentModal(),
      },
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  User? _user;
  bool _booting = true;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    try {
      _user = _auth.currentUser;
      if (_user == null) {
        _user = (await _auth.signInAnonymously()).user;
      }

      if (_user != null) {
        await FirebaseFirestore.instance.collection('users').doc(_user!.uid).set(
          {
            'trial_used': false,
            'referral_bonus': 0,
            'updated_at': FieldValue.serverTimestamp(),
          },
          SetOptions(merge: true),
        );
      }
    } catch (e) {
      debugPrint('⚠️ Firebase 초기화 오류: $e');
    } finally {
      if (mounted) setState(() => _booting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ManyLangs 홈')),
      body: Center(
        child: _booting
            ? const CircularProgressIndicator()
            : Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      '🎧 AI 발음 교정 무료체험',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 14),
                    ElevatedButton(
                      onPressed: () => Navigator.pushNamed(context, '/trial'),
                      child: const Text('AI 발음 체험 페이지로 이동'),
                    ),
                    const SizedBox(height: 24),
                    const Divider(),
                    const SizedBox(height: 12),
                    const Text('프리미엄 구독'),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: () => Navigator.pushNamed(context, '/payment'),
                      child: const Text('Stripe 결제 페이지 열기'),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
