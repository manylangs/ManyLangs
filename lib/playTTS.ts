export function playTTS(url: string) {
  const audio = new Audio(url);
  audio.play();
}
