import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class PronunciationTrialPage extends StatefulWidget {
  const PronunciationTrialPage({super.key});

  @override
  State<PronunciationTrialPage> createState() => _PronunciationTrialPageState();
}

class _PronunciationTrialPageState extends State<PronunciationTrialPage> {
  final user = FirebaseAuth.instance.currentUser;
  bool _loading = false;
  bool _trialUsed = false;

  @override
  void initState() {
    super.initState();
    _checkTrialStatus();
  }

  Future<void> _checkTrialStatus() async {
    final doc = await FirebaseFirestore.instance
        .collection('users')
        .doc(user!.uid)
        .get();
    setState(() {
      _trialUsed = doc.data()?['trial_used'] ?? false;
    });
  }

  Future<void> _runTrial() async {
    setState(() => _loading = true);
    // 1회 무료 체험 실행
    await FirebaseFirestore.instance
        .collection('users')
        .doc(user!.uid)
        .set({'trial_used': true}, SetOptions(merge: true));

    await Future.delayed(const Duration(seconds: 2)); // AI 피드백 처리 시뮬레이션
    setState(() => _loading = false);

    _showUpgradeModal();
  }

  void _showUpgradeModal() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text("AI 발음 교정 체험 종료"),
        content: const Text(
          "AI 발음 교정을 계속 이용하시겠어요?\n\n① 프리미엄 구독하기\n② 친구 초대로 무료 연장",
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pushNamed(context, '/payment'); // ⬅ 프리미엄 구독 페이지 연결
            },
            child: const Text("프리미엄 구독"),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _showReferralGuide();
            },
            child: const Text("친구 초대하기"),
          ),
        ],
      ),
    );
  }

  void _showReferralGuide() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text("🎁 친구 초대 안내"),
        content: const Text(
          "친구에게 ManyLangs를 초대하세요!\n\n- 친구가 앱을 설치하고 회원가입하면,\n  무료 체험 1회가 자동으로 연장됩니다.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("닫기"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("AI 발음 교정 체험")),
      body: Center(
        child: _loading
            ? const CircularProgressIndicator()
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    "🎧 AI 발음 교정 1회 무료체험",
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: _trialUsed ? _showUpgradeModal : _runTrial,
                    child: Text(_trialUsed
                        ? "체험 종료 - 구독 또는 초대"
                        : "무료 체험 시작"),
                  ),
                ],
              ),
      ),
    );
  }
}
