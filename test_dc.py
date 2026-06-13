from src.services.lead_collector import DirectoryCollector, save_school
from src.services.crm import count_schools

dc = DirectoryCollector()
results = dc.collect(limit=20)
print('수집 raw:', len(results))
for r in results[:3]:
    print(r)
saved = sum(1 for r in results if save_school(r))
print('DB 저장:', saved)
print('DB 총계:', count_schools())
