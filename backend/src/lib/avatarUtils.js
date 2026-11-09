export const getAvatar = (name) => {
  const fullTrimmedName = String(name || "").trim();
  if (!fullTrimmedName) {
    return "https://randomuser.me/api/portraits/men/1.jpg";
  }

  // Split name to get only the first name for gender detection
  // This avoids surnames like "Sharma", "Verma", "Mishra" (ending in 'a') 
  // from incorrectly triggering female avatar detection.
  const firstName = fullTrimmedName.split(/\s+/)[0].toLowerCase();

  const isFemale =
    firstName.endsWith("a") ||
    firstName.endsWith("i") ||
    firstName.endsWith("ee") ||
    firstName.endsWith("ya") ||
    firstName.endsWith("shree") ||
    firstName.endsWith("ti") ||
    firstName.endsWith("ri") ||
    firstName.endsWith("na") ||
    firstName.endsWith("ma") ||
    firstName.endsWith("ra") ||
    firstName.endsWith("ta");

  const maleExceptions = [
    "raja",
    "rama",
    "krishna",
    "musa",
    "ravi",
    "rishi",
    "shakti",
    "baba",
    "data",
    "pasha",
    "surya",
    "arya",
    "aman",
    "arman",
  ];

  let gender = "men";
  if (isFemale) {
    gender = "women";
    // Check if the first name is a known male exception
    if (maleExceptions.some((ex) => firstName === ex)) {
      gender = "men";
    }
  }

  // Generate a consistent ID based on the full name hash
  let hash = 0;
  const normalizedFullName = fullTrimmedName.toLowerCase();
  for (let i = 0; i < normalizedFullName.length; i++) {
    hash = (hash << 5) - hash + normalizedFullName.charCodeAt(i);
    hash |= 0;
  }
  const id = Math.abs(hash) % 99;

  return `https://randomuser.me/api/portraits/${gender}/${id}.jpg`;
};
