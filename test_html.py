import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

url = "https://www.goabroad.com/language-schools"
resp = requests.get(url, headers=HEADERS, timeout=15)
soup = BeautifulSoup(resp.text, "lxml")

print("=== goabroad status:", resp.status_code)
print("=== 제목:", soup.title.string if soup.title else "없음")
print()

all_divs = soup.find_all("div", limit=5)
for d in all_divs:
    classes = d.get("class", [])
    if classes:
        print("div class:", classes)

print()
print("=== a 태그 샘플 (href 포함 상위 5개):")
for a in soup.select("a[href]")[:5]:
    print(a.get("href"), "|", a.get_text(strip=True)[:50])
