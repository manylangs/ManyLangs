#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
upload_content_to_firebase.py

ManyLangs 로컬 content 폴더 -> Firebase Storage 부분 동기화 스크립트.
(v2: list_blobs() 사전 조회 + 병렬 업로드 버전)

설치 위치 (권장):
    /Users/junghasuk/Desktop/ManyLangs/web/firebase/upload_content_to_firebase.py

운영 원칙 (v2 설계도 / 생성메뉴얼과 동일):
    - 원본(Source of Truth)  : /Users/junghasuk/Desktop/content
    - 배포 대상              : Firebase Storage (manylangs-55fd3.firebasestorage.app)
    - Storage 를 직접 수정하지 않는다.
    - 기본 동작은 "없는 파일만 업로드" (있으면 SKIP)
    - --overwrite 를 줄 때만 기존 파일도 강제로 다시 업로드
    - 실패한 파일이 있어도 전체를 멈추지 않고 FAIL 카운트에 넣은 뒤 계속 진행

v1 -> v2 변경점 (성능 개선):
    - [이전] 파일마다 blob.exists() 호출 -> 파일 수만큼 Storage API 호출 발생,
             storage.objects.get 권한이 없으면 403 으로 전부 실패.
    - [변경] 시작 시 bucket.list_blobs(prefix=...) 를 한 번만 호출해서
             해당 범위의 기존 파일 이름을 전부 파이썬 set() 에 담아두고,
             이후에는 이 메모리 set 에서만 존재 여부를 확인한다.
             -> Storage 호출 횟수가 "파일 수" 에서 "list_blobs 페이지 수" 로 줄어든다.
    - [추가] --workers 옵션으로 업로드를 병렬 처리한다 (기본 4).
             list_blobs 조회는 순차 1회, 실제 업로드(PUT)만 병렬로 수행한다.

주의 (권한):
    list_blobs() 도 exists() 와 마찬가지로 객체 조회 권한이 필요하다.
    서비스 계정에 최소 아래 역할이 있어야 한다.
        - Storage Object Viewer (조회, list/get)
        - Storage Object Creator 또는 Storage Object Admin (업로드/덮어쓰기)
    권한이 없으면 list_blobs() 단계에서 403 PermissionDenied 가 발생하며,
    이 경우 스크립트가 아니라 Firebase/GCP 콘솔에서 서비스 계정 역할을 먼저 확인해야 한다.

사용 예:
    cd /Users/junghasuk/Desktop/ManyLangs/web

    # 전체 (없는 파일만)
    python3 firebase/upload_content_to_firebase.py

    # 시리즈만
    python3 firebase/upload_content_to_firebase.py --series conversation

    # 언어만
    python3 firebase/upload_content_to_firebase.py --lang en

    # 시리즈 + 언어
    python3 firebase/upload_content_to_firebase.py --series conversation --lang en

    # 특정 레벨
    python3 firebase/upload_content_to_firebase.py --series conversation --lang en --level a1

    # 특정 챕터
    python3 firebase/upload_content_to_firebase.py --series conversation --lang en --level a1 --chapter 001

    # 강제 덮어쓰기
    python3 firebase/upload_content_to_firebase.py --series conversation --lang en --overwrite

    # 실제 업로드 없이 예정만 확인
    python3 firebase/upload_content_to_firebase.py --series conversation --lang en --level a1 --chapter 001 --dry-run --verbose

    # 병렬 업로드 (동시 8개)
    python3 firebase/upload_content_to_firebase.py --series conversation --lang en --workers 8

    # 업로드 후 manifest 재생성까지 한 번에
    python3 firebase/upload_content_to_firebase.py --series conversation --lang en --manifest
"""

import argparse
import mimetypes
import sys
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# ----------------------------------------------------------------------------
# 1. 고정 설정값 (프로젝트 구조가 바뀌지 않는 한 수정할 필요 없음)
# ----------------------------------------------------------------------------

# 로컬 content 루트 (Source of Truth)
LOCAL_ROOT = Path("/Users/junghasuk/Desktop/content")

# Firebase Storage 버킷 이름
BUCKET_NAME = "manylangs-55fd3.firebasestorage.app"

# Storage 안에서 content 가 올라갈 루트 prefix
REMOTE_ROOT = "content"

# Firebase 서비스 계정 키 경로
# 주의: 이 파일은 절대 git 에 커밋하지 않는다 (.gitignore 필수)
SERVICE_ACCOUNT_PATH = Path(
    "/Users/junghasuk/Desktop/ManyLangs/web/tts/tts-generator.json"
)

# 지원하는 시리즈 목록 (검증용. 새 시리즈가 생기면 여기에 추가)
# 지원하는 시리즈 목록
VALID_SERIES = [
    "conversation",
    "voca",
    "idiom",
    "real",
    "grammar",
    "demo/conversation",
    "demo/voca",
    "demo/idiom",
    "demo/real",
    "demo/grammar",
]

# manifest 재생성 스크립트 (--manifest 옵션 사용 시 실행)
MANIFEST_SCRIPT = Path("scripts/generate-manifests-from-storage.js")

# 병렬 업로드 기본 동시 개수
DEFAULT_WORKERS = 4


# ----------------------------------------------------------------------------
# 2. 사전 점검 함수들
# ----------------------------------------------------------------------------

def check_local_root() -> None:
    """로컬 content 폴더가 실제로 존재하는지 확인한다."""
    if not LOCAL_ROOT.exists() or not LOCAL_ROOT.is_dir():
        print(f"[ERROR] 로컬 content 폴더를 찾을 수 없습니다: {LOCAL_ROOT}")
        sys.exit(1)


def check_service_account() -> None:
    """Firebase 서비스 계정 키 파일이 존재하는지 확인한다."""
    if not SERVICE_ACCOUNT_PATH.exists():
        print(f"[ERROR] 서비스 계정 키 파일을 찾을 수 없습니다: {SERVICE_ACCOUNT_PATH}")
        print("        tts_backup/tts-generator.json 에서 복원한 뒤 다시 실행하세요.")
        print("        예: cp /Users/junghasuk/Desktop/ManyLangs/web/tts_backup/tts-generator.json \\")
        print("               /Users/junghasuk/Desktop/ManyLangs/web/tts/")
        sys.exit(1)


def import_firebase_admin():
    """
    firebase-admin 패키지를 import 한다.
    설치되어 있지 않으면 설치 안내 메시지를 출력하고 종료한다.
    """
    try:
        import firebase_admin  # noqa: F401
        from firebase_admin import credentials, storage  # noqa: F401
        return firebase_admin, credentials, storage
    except ImportError:
        print("[ERROR] firebase-admin 패키지가 설치되어 있지 않습니다.")
        print("        아래 명령으로 설치한 뒤 다시 실행하세요:")
        print("        pip3 install firebase-admin")
        sys.exit(1)


def init_firebase(credentials, storage_module):
    """Firebase Admin SDK 를 초기화하고 bucket 객체를 반환한다."""
    import firebase_admin

    # 이미 초기화된 앱이 있으면 재사용 (스크립트를 여러 번 import 하는 상황 대비)
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(SERVICE_ACCOUNT_PATH))
        firebase_admin.initialize_app(cred, {"storageBucket": BUCKET_NAME})

    return storage_module.bucket()


# ----------------------------------------------------------------------------
# 3. 로컬 파일 탐색 (필터 적용)
# ----------------------------------------------------------------------------

def build_scan_root(args) -> Path:
    """
    --series / --lang / --level / --chapter 옵션에 맞는
    로컬 탐색 시작 폴더를 계산한다.

    demo/conversation 같은 하위 경로도 지원한다.
    """
    root = LOCAL_ROOT

    if args.series:
        root = root.joinpath(*args.series.split("/"))

    if args.lang:
        root = root / args.lang

    if args.level:
        root = root / args.level

    if args.chapter:
        root = root / args.chapter

    return root


def collect_local_files(scan_root: Path):
    """
    scan_root 아래 모든 파일을 재귀적으로 찾는다.
    숨김 파일(.DS_Store 등)은 제외한다.
    """
    if not scan_root.exists():
        return []

    files = []
    for path in scan_root.rglob("*"):
        if path.is_file() and not path.name.startswith("."):
            files.append(path)
    return files


def local_to_remote_path(local_path: Path) -> str:
    """
    로컬 절대경로를 Firebase Storage 경로로 변환한다.
    예:
        /Users/junghasuk/Desktop/content/conversation/en/a1/001/audio/x.wav
        -> content/conversation/en/a1/001/audio/x.wav
    """
    relative = local_path.relative_to(LOCAL_ROOT)
    # Windows 등 다른 OS에서 실행될 가능성은 낮지만, 안전하게 posix 구분자로 통일
    return f"{REMOTE_ROOT}/{relative.as_posix()}"


def guess_content_type(path: Path) -> str:
    """파일 확장자로 content-type 을 추정한다. 모르면 기본값 사용."""
    content_type, _ = mimetypes.guess_type(str(path))
    if content_type:
        return content_type
    # wav, json 등 mimetypes 가 못 잡는 경우를 위한 보정
    ext = path.suffix.lower()
    if ext == ".wav":
        return "audio/wav"
    if ext == ".json":
        return "application/json"
    return "application/octet-stream"


# ----------------------------------------------------------------------------
# 4. Firebase Storage 기존 파일 목록 사전 조회 (핵심 개선 부분)
# ----------------------------------------------------------------------------

def compute_remote_prefix(args) -> str:
    """
    Storage prefix 계산.
    demo/conversation 같은 하위 경로도 지원한다.
    """

    if not args.series:
        return REMOTE_ROOT

    prefix = REMOTE_ROOT + "/" + "/".join(args.series.split("/"))

    if args.lang:
        prefix += f"/{args.lang}"

    if args.level:
        prefix += f"/{args.level}"

    if args.chapter:
        prefix += f"/{args.chapter}"

    return 


def fetch_existing_blob_names(bucket, prefix: str) -> set:
    """
    주어진 prefix 아래 Firebase Storage 에 이미 존재하는 모든 blob 이름을
    한 번의 list_blobs() 호출(페이지네이션 포함)로 조회해서 set 으로 반환한다.

    파일마다 exists() 를 호출하는 대신, 이 함수를 스크립트 시작 시 딱 한 번만
    호출해서 결과를 메모리에 올려두고 이후에는 in 연산자로만 확인한다.
    """
    print(f"[INFO] Firebase Storage 기존 파일 목록 조회 중... (prefix='{prefix}')")
    existing = set()
    try:
        # list_blobs 는 내부적으로 필요한 만큼 자동 페이지네이션 하면서
        # iterator 를 반환한다. 결과가 아주 많아도 API 호출 자체는
        # "파일 개수" 가 아니라 "페이지 개수" 만큼만 발생한다.
        for blob in bucket.list_blobs(prefix=prefix):
            existing.add(blob.name)
    except Exception as e:
        print(f"[ERROR] Firebase Storage 목록 조회 실패: {e}")
        print("        서비스 계정에 Storage 조회 권한"
              "(Storage Object Viewer 등)이 있는지 확인하세요.")
        sys.exit(1)

    print(f"[INFO] 기존 파일 {len(existing)}개 확인 완료.\n")
    return existing


# ----------------------------------------------------------------------------
# 5. 업로드 로직 (병렬)
# ----------------------------------------------------------------------------

# 여러 스레드가 동시에 print / 카운터를 건드리므로 락으로 보호한다.
_print_lock = threading.Lock()


def upload_one(bucket, local_path: Path, existing: set, overwrite: bool,
                dry_run: bool, verbose: bool):
    """
    파일 1개를 업로드(또는 SKIP 판단)한다.
    스레드풀에서 병렬로 호출되는 함수이므로, 여기서는 네트워크 I/O 외에
    공유 상태를 직접 건드리지 않고 결과만 문자열로 반환한다.

    반환값: ("UPLOAD" | "SKIP" | "FAIL", remote_path, message)
    """
    remote_path = local_to_remote_path(local_path)
    exists = remote_path in existing

    if exists and not overwrite:
        return ("SKIP", remote_path, None)

    if dry_run:
        tag = "OVERWRITE*" if exists else "UPLOAD*"
        return (tag, remote_path, "dry-run, 실제 업로드 안 함")

    try:
        blob = bucket.blob(remote_path)
        # 폴더는 Firebase Storage 개념상 실체가 없으므로 별도 mkdir 없이
        # upload_from_filename() 만 호출하면 중간 경로가 자동으로 생성된다.
        blob.upload_from_filename(
            str(local_path), content_type=guess_content_type(local_path)
        )
        tag = "OVERWRITE" if exists else "UPLOAD"
        return (tag, remote_path, None)
    except Exception as e:
        return ("FAIL", remote_path, str(e))


def upload_files(bucket, local_files, existing: set, overwrite: bool,
                  dry_run: bool, verbose: bool, workers: int):
    """
    로컬 파일 목록을 병렬로 업로드한다.
    existing 은 fetch_existing_blob_names() 로 미리 조회해둔 set 이다.

    반환값: (uploaded, skipped, failed) 카운트 튜플
    """
    uploaded = 0
    skipped = 0
    failed = 0

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(
                upload_one, bucket, local_path, existing, overwrite, dry_run, verbose
            ): local_path
            for local_path in local_files
        }

        for future in as_completed(futures):
            status, remote_path, message = future.result()

            with _print_lock:
                if status == "SKIP":
                    skipped += 1
                    if verbose:
                        print(f"[SKIP]   {remote_path}")
                elif status == "FAIL":
                    failed += 1
                    print(f"[FAIL]   {remote_path}  ({message})")
                else:
                    # UPLOAD / OVERWRITE / UPLOAD* / OVERWRITE* (dry-run)
                    uploaded += 1
                    suffix = f"  ({message})" if message else ""
                    print(f"[{status}] {remote_path}{suffix}")

    return uploaded, skipped, failed


# ----------------------------------------------------------------------------
# 6. manifest 재생성 (--manifest 옵션)
# ----------------------------------------------------------------------------

def run_manifest_script():
    """업로드 완료 후 node scripts/generate-manifests-from-storage.js 를 실행한다."""
    if not MANIFEST_SCRIPT.exists():
        print(f"[WARN] manifest 스크립트를 찾을 수 없습니다: {MANIFEST_SCRIPT}")
        print("       node 스크립트를 수동으로 실행해 주세요.")
        return

    print("\n" + "=" * 60)
    print(f"[MANIFEST] node {MANIFEST_SCRIPT} 실행 중...")
    print("=" * 60)
    result = subprocess.run(["node", str(MANIFEST_SCRIPT)])
    if result.returncode != 0:
        print(f"[WARN] manifest 스크립트가 오류 코드 {result.returncode} 로 종료되었습니다.")
    else:
        print("[MANIFEST] 완료.")


# ----------------------------------------------------------------------------
# 7. 인자 파싱
# ----------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="ManyLangs 로컬 content -> Firebase Storage 부분 동기화 업로드"
    )
    parser.add_argument(
        "--series",
        choices=VALID_SERIES,
        help="시리즈 필터 (conversation / voca / idiom / real / grammar)",
    )
    parser.add_argument("--lang", help="언어 필터 (en / kr / es / fr / pt ...)")
    parser.add_argument("--level", help="레벨 필터 (a1 / a2 / b1 / b2 / c1 / c2)")
    parser.add_argument("--chapter", help="챕터 필터 (예: 001)")
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="이미 존재하는 파일도 강제로 덮어쓴다 (기본값: 존재하면 SKIP)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="실제로 업로드하지 않고 UPLOAD/SKIP 예정 목록만 출력한다",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="SKIP 되는 파일까지 전부 출력한다 (기본은 UPLOAD/FAIL만 출력)",
    )
    parser.add_argument(
        "--manifest",
        action="store_true",
        help="업로드 완료 후 node scripts/generate-manifests-from-storage.js 자동 실행",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=DEFAULT_WORKERS,
        help=f"동시 업로드 스레드 개수 (기본 {DEFAULT_WORKERS})",
    )

    args = parser.parse_args()

    # --lang / --level / --chapter 만 단독으로 줄 수도 있게 허용하되,
    # 더 좁은 옵션을 쓰려면 그 상위 옵션도 함께 지정하도록 안내한다.
    if args.level and not (args.series and args.lang):
        parser.error("--level 을 사용하려면 --series 와 --lang 을 함께 지정해야 합니다.")
    if args.chapter and not (args.series and args.lang and args.level):
        parser.error("--chapter 를 사용하려면 --series --lang --level 을 함께 지정해야 합니다.")
    if args.workers < 1:
        parser.error("--workers 는 1 이상이어야 합니다.")

    return args


# ----------------------------------------------------------------------------
# 8. main
# ----------------------------------------------------------------------------

def main():
    args = parse_args()

    check_local_root()
    check_service_account()

    firebase_admin_module, credentials, storage_module = import_firebase_admin()
    bucket = init_firebase(credentials, storage_module)

    print("=" * 60)
    print("ManyLangs Content -> Firebase Storage Upload")
    print(f"Local root : {LOCAL_ROOT}")
    print(f"Bucket     : {BUCKET_NAME}")
    print(f"Remote root: {REMOTE_ROOT}")
    print(f"Series     : {args.series or '(전체)'}")
    print(f"Language   : {args.lang or '(전체)'}")
    print(f"Level      : {args.level or '(전체)'}")
    print(f"Chapter    : {args.chapter or '(전체)'}")
    print(f"Overwrite  : {args.overwrite}")
    print(f"Dry run    : {args.dry_run}")
    print(f"Workers    : {args.workers}")
    print("=" * 60)
    print()

    # 탐색 시작 지점 계산 (series/lang/level/chapter 조합)
    scan_root = build_scan_root(args)

    # series 없이 --lang 만 준 경우: 전체 시리즈를 순회하며 해당 lang 폴더만 모은다.
    if not args.series and args.lang:
        local_files = []
        for series_dir in LOCAL_ROOT.iterdir():
            if series_dir.is_dir():
                lang_dir = series_dir / args.lang
                local_files.extend(collect_local_files(lang_dir))
    else:
        local_files = collect_local_files(scan_root)

    if not local_files:
        print("[INFO] 조건에 맞는 로컬 파일이 없습니다. 경로/옵션을 확인하세요.")
        sys.exit(0)

    # 핵심 개선: 파일마다 exists() 를 부르지 않고,
    # 해당 범위의 기존 파일 목록을 한 번만 조회해서 메모리 set 으로 들고 있는다.
    remote_prefix = compute_remote_prefix(args)
    existing = fetch_existing_blob_names(bucket, remote_prefix)

    uploaded, skipped, failed = upload_files(
        bucket,
        local_files,
        existing=existing,
        overwrite=args.overwrite,
        dry_run=args.dry_run,
        verbose=args.verbose,
        workers=args.workers,
    )

    print()
    print("=" * 60)
    print("DONE")
    print(f"UPLOAD : {uploaded}")
    print(f"SKIP   : {skipped}")
    print(f"FAIL   : {failed}")
    print(f"TOTAL  : {len(local_files)}")
    print("=" * 60)

    if args.manifest and not args.dry_run:
        run_manifest_script()


if __name__ == "__main__":
    main()