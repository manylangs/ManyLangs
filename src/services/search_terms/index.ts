import { EN_TERMS } from "./en";
import { ES_TERMS } from "./es";

export function getTermsByCountry(country: string) {
  const spanishCountries = [
    "Argentina",
    "Mexico",
    "Spain",
    "Chile",
    "Peru",
    "Colombia",
    "Ecuador",
    "Uruguay",
    "Paraguay",
    "Bolivia",
    "Venezuela",
    "Costa Rica",
    "Panama",
    "Guatemala",
    "Honduras",
    "Nicaragua",
    "El Salvador",
    "Dominican Republic",
  ];

  if (spanishCountries.includes(country)) {
    return [
      ...EN_TERMS,
      ...ES_TERMS,
    ];
  }

  return EN_TERMS;
}