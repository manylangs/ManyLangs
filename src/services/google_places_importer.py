from src.services.crm import insert_school


def import_places(places):

    imported = 0

    for place in places:

        try:

            insert_school(
                school_name=place.get("name"),
                website=place.get("website"),
                email="",
                phone=place.get("phone"),
                address=place.get("address"),
                source="GOOGLE",
                country=place.get("country", ""),
                city=place.get("city", ""),
                lead_type="LANGUAGE_SCHOOL"
            )

            imported += 1

        except Exception as e:
            print("IMPORT ERROR:", e)

    return imported
