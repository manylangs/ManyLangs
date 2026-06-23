const API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

export async function searchPlaceIds(query: string) {
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,

        // TEST
        // websiteUri가 SearchText 응답으로 오는지 검증
        "X-Goog-FieldMask": "places.id,places.websiteUri",
      },
      body: JSON.stringify({
        textQuery: query,
      }),
    }
  );

  const data = await res.json();

  console.log(
    "[SEARCH_TEXT_RESPONSE]",
    JSON.stringify(data, null, 2)
  );

  return data.places || [];
}

export async function getPlaceDetails(placeId: string) {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask":
          "id,displayName,websiteUri,formattedAddress,addressComponents",
      },
    }
  );

  return await res.json();
}

/**
 * 기존 /admin/places 호환 유지
 */
export async function collectPlaces(query: string) {
  const ids = await searchPlaceIds(query);

  const results = [];

  for (const place of ids.slice(0, 20)) {
    try {
      const details = await getPlaceDetails(place.id);
      results.push(details);
    } catch (e) {
      console.error(e);
    }
  }

  return results;
}