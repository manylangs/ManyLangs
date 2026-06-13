from src.services.lead_collector import SearchCollector, save_school
from src.services.crm import count_schools

sc = SearchCollector()
results = sc._search("language school", "KR", "Seoul")
print('수집 raw:', len(results))
for r in results[:5]:
    print(r.get('school_name'), '|', r.get('website'))
