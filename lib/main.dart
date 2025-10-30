import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const ManyLangsApp());
}

class ManyLangsApp extends StatelessWidget {
  const ManyLangsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ManyLangs',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      debugShowCheckedModeBanner: false,
      home: const LoginPage(),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  bool loading = false;
  String? error;

  Future<void> _login() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final credential = await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: emailController.text.trim(),
        password: passwordController.text.trim(),
      );

      final uid = credential.user!.uid;
      final userDoc = await FirebaseFirestore.instance.collection('users').doc(uid).get();

      if (userDoc.exists) {
        final role = userDoc.data()?['role'] ?? 'student';
        if (role == 'teacher') {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const TeacherHomePage()),
          );
        } else {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const StudentHomePage()),
          );
        }
      } else {
        setState(() => error = '사용자 데이터가 없습니다.');
      }
    } on FirebaseAuthException catch (e) {
      setState(() => error = e.message);
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SizedBox(
          width: 360,
          child: Card(
            elevation: 8,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('ManyLangs Login',
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 24),
                  TextField(
                    controller: emailController,
                    decoration: const InputDecoration(labelText: 'Email'),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: passwordController,
                    decoration: const InputDecoration(labelText: 'Password'),
                    obscureText: true,
                  ),
                  const SizedBox(height: 24),
                  if (error != null)
                    Text(error!, style: const TextStyle(color: Colors.red, fontSize: 14)),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: loading ? null : _login,
                    style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.deepPurple,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 48)),
                    child: loading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('로그인'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class StudentHomePage extends StatelessWidget {
  const StudentHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('학생 홈')),
      body: const Center(child: Text('ManyLangs 학생 모드입니다.')),
    );
  }
}

class TeacherHomePage extends StatelessWidget {
  const TeacherHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('강사 홈')),
      body: const Center(child: Text('ManyLangs 강사 모드입니다.')),
    );
  }
}
