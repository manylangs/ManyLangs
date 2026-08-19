#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
ManyLangs Chirp3 HD monthly usage tracker.

목적
----
Chirp3 HD TTS 생성 시 월간 문자 사용량을 로컬에서 추적한다.

지원 방식
---------
1. 단독 실행
   - Voca / Idiom / Conversation / Real 중 하나만 실행
   - 시작할 때 현재 월 누적 문자 수를 직접 입력

2. 연속 실행
   - 처음 한 번만 시작 문자 수 입력
   - Voca -> Idiom -> Conversation -> Real 순서로
     동일한 tracker 객체를 공유
   - 앞 시리즈의 최종값을 다음 시리즈가 자동으로 이어받음

표시 내용
---------
- 현재까지 총 사용 문자 수
- 무료 한도
- 무료 잔여 문자 수
- 무료 잔여 퍼센트
- 무료 한도 초과 문자 수
- 예상 과금액
- 마지막 NEXT RUN START VALUE

주의
----
- Google Billing 실시간 조회값이 아니다.
- ManyLangs TTS 생성기가 실제 API에 전송한 문자 수를
  로컬에서 누적하는 방식이다.
- 다음 별도 작업을 시작할 때 직전 작업의
  NEXT RUN START VALUE를 입력한다.
"""


CHIRP3_FREE_CHARS = 1_000_000

# Chirp3 HD:
# $30 / 1,000,000 chars
CHIRP3_PRICE_PER_CHAR = 30.0 / 1_000_000


class Chirp3UsageTracker:

    def __init__(
        self,
        start_chars=None,
        show_start=True,
    ):
        """
        start_chars:
            None
                -> 사용자에게 시작값을 직접 입력받음

            정수
                -> 외부에서 전달된 누적값으로 시작
                   통합 실행 시 사용

        show_start:
            True
                -> 시작 상태 출력

            False
                -> 시작 상태 출력 생략
        """

        if start_chars is None:
            start_chars = self._ask_start_chars()

        start_chars = self._validate_chars(
            start_chars,
            "start_chars",
        )

        self.start_chars = start_chars
        self.current_chars = start_chars

        if show_start:
            self.print_start()


    # ------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------

    def _validate_chars(self, value, name="chars"):
        try:
            value = int(value)
        except (TypeError, ValueError):
            raise ValueError(
                f"{name} must be an integer"
            )

        if value < 0:
            raise ValueError(
                f"{name} must be >= 0"
            )

        return value


    # ------------------------------------------------------------
    # Start value
    # ------------------------------------------------------------

    def _ask_start_chars(self):
        while True:
            try:
                raw = input(
                    "Current Chirp3 monthly usage chars "
                    "(first run = 0): "
                )

                raw = (
                    raw
                    .strip()
                    .replace(",", "")
                )

                if raw == "":
                    raw = "0"

                value = int(raw)

                if value < 0:
                    raise ValueError

                return value

            except ValueError:
                print(
                    "Please enter 0 or a positive integer."
                )


    # ------------------------------------------------------------
    # Add usage
    # ------------------------------------------------------------

    def add_text(self, text):
        """
        문자열 하나의 문자 수를 누적한다.

        예:
            tracker.add_text("Hello")
            -> 5 chars 추가
        """

        if text is None:
            return 0

        text = str(text)

        chars = len(text)

        self.current_chars += chars

        return chars


    def add_chars(self, chars):
        """
        이미 계산된 문자 수를 누적한다.

        각 builder에서 파일 생성 성공 후
        file_chars를 추가할 때 사용.
        """

        chars = self._validate_chars(
            chars,
            "chars",
        )

        self.current_chars += chars

        return chars


    # ------------------------------------------------------------
    # Current values
    # ------------------------------------------------------------

    def _values(self):

        used = self.current_chars

        free_left = max(
            0,
            CHIRP3_FREE_CHARS - used,
        )

        free_left_pct = (
            free_left
            / CHIRP3_FREE_CHARS
            * 100
        )

        used_pct = (
            used
            / CHIRP3_FREE_CHARS
            * 100
        )

        paid_chars = max(
            0,
            used - CHIRP3_FREE_CHARS,
        )

        estimated_cost = (
            paid_chars
            * CHIRP3_PRICE_PER_CHAR
        )

        return {
            "used": used,
            "used_pct": used_pct,
            "free_left": free_left,
            "free_left_pct": free_left_pct,
            "paid_chars": paid_chars,
            "estimated_cost": estimated_cost,
        }


    # ------------------------------------------------------------
    # Public getters
    # ------------------------------------------------------------

    def get_current_chars(self):
        """
        현재 누적 문자 수 반환.

        다음 시리즈에 값을 넘길 때 사용할 수 있다.
        """
        return self.current_chars


    def get_start_chars(self):
        return self.start_chars


    def get_run_chars(self):
        """
        이번 실행에서 새로 사용한 문자 수.
        """
        return (
            self.current_chars
            - self.start_chars
        )


    def get_status(self):
        """
        현재 상태를 dict로 반환.
        """
        return self._values()


    # ------------------------------------------------------------
    # Status printing
    # ------------------------------------------------------------

    def _print_status(self):

        values = self._values()

        used = values["used"]
        used_pct = values["used_pct"]

        free_left = values["free_left"]
        free_left_pct = values["free_left_pct"]

        paid_chars = values["paid_chars"]
        estimated_cost = values["estimated_cost"]

        print(
            f"Total used  : "
            f"{used:,} / "
            f"{CHIRP3_FREE_CHARS:,} chars "
            f"({used_pct:.2f}%)"
        )

        print(
            f"Free left   : "
            f"{free_left:,} chars "
            f"({free_left_pct:.2f}%)"
        )

        print(
            f"Paid chars  : "
            f"{paid_chars:,}"
        )

        print(
            f"Est. cost   : "
            f"${estimated_cost:.4f}"
        )


    def print_start(self):

        print()

        print("=" * 70)
        print(
            "CHIRP3 HD MONTHLY USAGE - START"
        )
        print("=" * 70)

        self._print_status()

        print("=" * 70)
        print()


    # ------------------------------------------------------------
    # File result
    # ------------------------------------------------------------

    def print_file(
        self,
        label,
        file_chars,
    ):

        file_chars = self._validate_chars(
            file_chars,
            "file_chars",
        )

        print()

        print("-" * 70)
        print(
            f"TTS USAGE : {label}"
        )
        print("-" * 70)

        print(
            f"This file   : "
            f"{file_chars:,} chars"
        )

        self._print_status()

        print("-" * 70)


    # ------------------------------------------------------------
    # Series result
    # ------------------------------------------------------------

    def print_series(
        self,
        series_name,
        series_start_chars,
    ):
        """
        Voca / Idiom / Conversation / Real
        하나가 끝났을 때 해당 시리즈에서
        사용한 문자 수를 표시한다.
        """

        series_start_chars = (
            self._validate_chars(
                series_start_chars,
                "series_start_chars",
            )
        )

        series_chars = max(
            0,
            self.current_chars
            - series_start_chars,
        )

        print()

        print("=" * 70)

        print(
            f"CHIRP3 SERIES COMPLETE : "
            f"{series_name}"
        )

        print("=" * 70)

        print(
            f"Series chars : "
            f"{series_chars:,}"
        )

        print(
            f"Month total  : "
            f"{self.current_chars:,}"
        )

        print("=" * 70)


    # ------------------------------------------------------------
    # Final result
    # ------------------------------------------------------------

    def print_final(self):

        print()

        print("=" * 70)
        print(
            "CHIRP3 FINAL MONTHLY USAGE"
        )
        print("=" * 70)

        print(
            f"Start value : "
            f"{self.start_chars:,} chars"
        )

        print(
            f"This run    : "
            f"{self.get_run_chars():,} chars"
        )

        print()

        self._print_status()

        print()

        print(
            f"NEXT RUN START VALUE: "
            f"{self.current_chars}"
        )

        print("=" * 70)


    # ------------------------------------------------------------
    # Series handoff
    # ------------------------------------------------------------

    def mark_series_start(self):
        """
        시리즈 시작 직전에 호출.

        반환값을 보관했다가
        print_series()에 전달한다.

        예:

            start = tracker.mark_series_start()

            # Voca 생성

            tracker.print_series(
                "VOCA",
                start,
            )
        """

        return self.current_chars


    # ------------------------------------------------------------
    # Convenience
    # ------------------------------------------------------------

    def print_current(self):

        print()

        print("=" * 70)
        print(
            "CHIRP3 CURRENT MONTHLY USAGE"
        )
        print("=" * 70)

        self._print_status()

        print("=" * 70)