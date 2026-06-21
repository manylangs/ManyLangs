const API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

export async function collectPlaces(query: string) {
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.websiteUri,places.formattedAddress,places.internationalPhoneNumber",
      },
      body: JSON.stringify({
        textQuery: query,
      }),
    }
  );

  const data = await res.json();

  return data.places || [];

}
