"use client";

import { useEffect, useState } from "react";

export default function PlacesExplorerPage() {
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    loadCountries();
  }, []);

  useEffect(() => {
    if (country) {
      loadCities(country);
    }
  }, [country]);

  const loadCountries = async () => {
    try {
      const res = await fetch("/api/admin/crm/locations");
      const json = await res.json();

      setCountries(json.countries || []);

      if (json.countries?.length) {
        setCountry(json.countries[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadCities = async (selectedCountry: string) => {
    try {
      const res = await fetch(
        `/api/admin/crm/locations?country=${encodeURIComponent(
          selectedCountry
        )}`
      );

      const json = await res.json();

      setCities(json.cities || []);

      if (json.cities?.length) {
        setCity(json.cities[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const runExplorer = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/crm/places-explorer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country,
          city,
          district,
        }),
      });

      const json = await res.json();

      setResult(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1
        style={{
          fontSize: 24,
          marginBottom: 20,
        }}
      >
        Places Explorer
      </h1>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          style={{
            padding: 8,
            width: 220,
            border: "1px solid #ddd",
            borderRadius: 6,
          }}
        >
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={{
            padding: 8,
            width: 220,
            border: "1px solid #ddd",
            borderRadius: 6,
          }}
        >
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="District (optional)"
          style={{
            padding: 8,
            width: 220,
            border: "1px solid #ddd",
            borderRadius: 6,
          }}
        />

        <button onClick={runExplorer} disabled={loading}>
          {loading ? "Running..." : "Run Explorer"}
        </button>
      </div>

      {result && (
        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 16,
          }}
        >
          <div>
            <strong>Country</strong>
            <br />
            {result.country}
          </div>

          <div>
            <strong>City</strong>
            <br />
            {result.city}
          </div>

          <div>
            <strong>District</strong>
            <br />
            {result.district}
          </div>

          <div>
            <strong>Found</strong>
            <br />
            {result.found ?? 0}
          </div>

          <div>
            <strong>Added</strong>
            <br />
            {result.added ?? 0}
          </div>

          <div>
            <strong>Total In Term</strong>
            <br />
            {result.totalInTerm ?? 0}
          </div>
        </div>
      )}
    </div>
  );
}