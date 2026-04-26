export const formatDateTime = (isoString) => {
  if (!isoString) return "—";
  
  // PyMongo returns naive datetimes for UTC, so append 'Z' if missing timezone offset
  let cleanString = isoString;
  if (!cleanString.endsWith('Z') && !cleanString.includes('+', 10) && !cleanString.includes('-', 10)) {
      cleanString += 'Z';
  }
  
  const date = new Date(cleanString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

export const formatDateOnly = (isoString) => {
  if (!isoString) return "—";
  
  let cleanString = isoString;
  if (!cleanString.endsWith('Z') && !cleanString.includes('+', 10) && !cleanString.includes('-', 10)) {
      cleanString += 'Z';
  }
  
  const date = new Date(cleanString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

export const formatTimeOnly = (isoString) => {
  if (!isoString) return "—";
  
  let cleanString = isoString;
  if (!cleanString.endsWith('Z') && !cleanString.includes('+', 10) && !cleanString.includes('-', 10)) {
      cleanString += 'Z';
  }
  
  const date = new Date(cleanString);

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
};
