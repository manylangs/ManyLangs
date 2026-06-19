export async function extractEmails(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ManyLangsBot/1.0",
      },
    });

    const html = await res.text();

    const matches =
      html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];

    return [...new Set(matches)];
  } catch (err) {
    console.error(err);
    return [];
  }
}
