const MAX_NRC_DIGITS = 9;

export function formatNrcInput(value = "") {
  const digits = String(value).replace(/\D/g, "").slice(0, MAX_NRC_DIGITS);
  const first = digits.slice(0, 6);
  const second = digits.slice(6, 8);
  const third = digits.slice(8, 9);

  if (!digits.length) return "";
  if (digits.length <= 6) return first;
  if (digits.length <= 8) return `${first}/${second}`;
  return `${first}/${second}/${third}`;
}

export function isValidNrc(value = "") {
  return /^\d{6}\/\d{2}\/\d$/.test(String(value));
}

export function getDigitCountBeforeCaret(value = "", caret = 0) {
  return String(value)
    .slice(0, Math.max(0, caret))
    .replace(/\D/g, "")
    .length;
}

export function getCaretFromDigitCount(formattedValue = "", digitCount = 0) {
  if (digitCount <= 0) return 0;
  let seenDigits = 0;
  for (let i = 0; i < formattedValue.length; i += 1) {
    if (/\d/.test(formattedValue[i])) {
      seenDigits += 1;
      if (seenDigits === digitCount) {
        return i + 1;
      }
    }
  }
  return formattedValue.length;
}
