import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:url_launcher/url_launcher.dart';

class PaymentModal extends StatefulWidget {
  const PaymentModal({super.key});

  @override
  State<PaymentModal> createState() => _PaymentModalState();
}

class _PaymentModalState extends State<PaymentModal> {
  final user = FirebaseAuth.instance.currentUser;
  bool _loading = false;

  Future<void> _openStripeCheckout() async {
    setState(() => _loading = true);
    try {
      // 🔔 Functions 호출: createCheckoutSession
      final callable =
          FirebaseFunctions.instance.httpsCallable('createCheckoutSession');

      final result = await callable.call({
        'email': user?.email ?? 'guest@manylangs.app',
        // ⚠️ Stripe 대시보드의 실제 Price ID 로 교체
        'priceId': 'price_12345'
      });

      final checkoutUrl = (result.data as Map)['url'] as String;
      // 🌐 외부 브라우저로 열기
      final ok = await launchUrl(
        Uri.parse(checkoutUrl),
        mode: LaunchMode.externalApplication,
      );
      if (!ok) {
        throw Exception('결제 페이지를 열 수 없습니다.');
      }

      // Firestore 상태는 Webhook이 자동 반영 (premium)
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('결제 세션 생성 실패: $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _simulatePremiumForTest() async {
    // 🔬 로컬 테스트용(필요시): Webhook 없이 프리미엄 표시 확인
    if (user == null) return;
    await FirebaseFirestore.instance.collection('users').doc(user!.uid).set(
      {'subscription_status': 'premium'},
      SetOptions(merge: true),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('테스트용 프리미엄 상태 적용')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("프리미엄 구독")),
      body: Center(
        child: _loading
            ? const CircularProgressIndicator()
            : Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      "💎 프리미엄 서비스 안내",
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      "- AI 피드백 무제한 이용\n- 학습 리포트 자동 저장\n- 1시간 끊김 없는 Live 수업",
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 28),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.workspace_premium),
                      label: const Text("Stripe로 구독하기"),
                      onPressed: _openStripeCheckout,
                    ),
                    const SizedBox(height: 10),
                    TextButton(
                      onPressed: _simulatePremiumForTest,
                      child: const Text("로컬 테스트: 프리미엄 표시만 확인"),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
